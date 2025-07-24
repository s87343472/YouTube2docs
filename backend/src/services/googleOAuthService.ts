import { google } from 'googleapis'
import { logger, LogCategory } from '../utils/logger'
import { userService, User, CreateUserData } from './userService'
import { pool } from '../utils/database'
import { v4 as uuidv4 } from 'uuid'

/**
 * Google OAuth 服务
 * 负责处理 Google 登录、用户验证和账户关联
 */

export interface GoogleUserInfo {
  id: string
  email: string
  verified_email: boolean
  name: string
  given_name: string
  family_name: string
  picture: string
}

export interface GoogleAuthResult {
  user: User
  isNewUser: boolean
}

export class GoogleOAuthService {
  private oauth2Client: any
  private readonly redirectURI: string
  private isConfigured: boolean = false

  constructor() {
    // 使用与 Better Auth 相同的配置
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    this.redirectURI = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/callback/google"

    if (!clientId || !clientSecret) {
      console.warn('⚠️ Google OAuth credentials not configured. Google login will be disabled.')
      this.isConfigured = false
      return
    }
    
    this.isConfigured = true

    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      this.redirectURI
    )
  }

  /**
   * 生成 Google OAuth 授权 URL
   */
  generateAuthUrl(state?: string): string {
    try {
      const scopes = [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ]

      const authUrl = this.oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        state: state || uuidv4(),
        prompt: 'consent'
      })

      logger.info('Generated Google OAuth URL', undefined, { hasState: !!state }, LogCategory.USER)
      return authUrl
    } catch (error) {
      logger.error('Failed to generate Google OAuth URL', error as Error, {}, LogCategory.USER)
      throw new Error('OAuth URL generation failed')
    }
  }

  /**
   * 使用授权码获取用户信息
   */
  async getUserInfoFromCode(code: string): Promise<GoogleUserInfo> {
    try {
      // 使用授权码获取访问令牌
      const { tokens } = await this.oauth2Client.getToken(code)
      this.oauth2Client.setCredentials(tokens)

      // 获取用户信息
      const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client })
      const { data } = await oauth2.userinfo.get()

      if (!data.email || !data.id) {
        throw new Error('Google user info incomplete')
      }

      logger.info('Google user info retrieved', undefined, { 
        googleId: data.id, 
        email: data.email, 
        verified: data.verified_email 
      }, LogCategory.USER)

      return {
        id: data.id,
        email: data.email,
        verified_email: data.verified_email || false,
        name: data.name || '',
        given_name: data.given_name || '',
        family_name: data.family_name || '',
        picture: data.picture || ''
      }
    } catch (error) {
      logger.error('Failed to get user info from Google', error as Error, {}, LogCategory.USER)
      if (error instanceof Error && error.message.includes('invalid_grant')) {
        throw new Error('Authorization code expired or invalid')
      }
      throw new Error('Google authentication failed')
    }
  }

  /**
   * 处理 Google 登录/注册流程
   */
  async handleGoogleAuth(code: string): Promise<GoogleAuthResult> {
    // 先获取Google用户信息（在事务外）
    const googleUser = await this.getUserInfoFromCode(code)
    
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')

      // 检查是否已存在 Google 账户关联
      let existingAccount = await this.findGoogleAccount(googleUser.id)
      
      if (existingAccount) {
        // 已存在的 Google 账户，直接返回用户信息
        const user = await userService.findUserById(existingAccount.user_id)
        if (!user) {
          throw new Error('Associated user not found')
        }

        await client.query('COMMIT')
        logger.info('Google user signed in', undefined, { userId: user.id, email: user.email }, LogCategory.USER)
        
        return {
          user,
          isNewUser: false
        }
      }

      // 检查邮箱是否已被其他方式注册
      let existingUser = await userService.findUserByEmail(googleUser.email)
      
      if (existingUser) {
        // 邮箱已存在，关联 Google 账户到现有用户
        await this.createGoogleAccount(googleUser, existingUser.id, client)
        
        // 更新用户头像（如果没有设置）
        if (!existingUser.image && googleUser.picture) {
          existingUser = await userService.updateUser(existingUser.id, {
            image: googleUser.picture,
            email_verified: googleUser.verified_email
          }) || existingUser
        }

        await client.query('COMMIT')
        logger.info('Google account linked to existing user', undefined, { 
          userId: existingUser.id, 
          email: existingUser.email 
        }, LogCategory.USER)

        return {
          user: existingUser,
          isNewUser: false
        }
      }

      // 新用户，创建用户和 Google 账户
      const newUserData: CreateUserData = {
        email: googleUser.email,
        name: googleUser.name || googleUser.email.split('@')[0],
        image: googleUser.picture,
        email_verified: googleUser.verified_email
      }

      const newUser = await userService.createUser(newUserData, client)
      logger.info('User created in database', undefined, { 
        userId: newUser.id, 
        email: newUser.email,
        plan: newUser.plan 
      }, LogCategory.USER)
      
      await this.createGoogleAccount(googleUser, newUser.id, client)
      logger.info('Google account linked', undefined, { 
        userId: newUser.id, 
        googleId: googleUser.id 
      }, LogCategory.USER)

      await client.query('COMMIT')
      logger.info('Transaction committed for new user', undefined, { userId: newUser.id }, LogCategory.USER)
      logger.info('New user created with Google account', undefined, { 
        userId: newUser.id, 
        email: newUser.email 
      }, LogCategory.USER)

      return {
        user: newUser,
        isNewUser: true
      }
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error('Google authentication flow failed', error as Error, {}, LogCategory.USER)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * 查找 Google 账户关联
   */
  private async findGoogleAccount(googleId: string): Promise<{ user_id: string } | null> {
    try {
      const query = `
        SELECT user_id
        FROM accounts
        WHERE provider = 'google' AND provider_account_id = $1
      `
      
      const result = await pool.query(query, [googleId])
      
      if (result.rows.length === 0) {
        return null
      }

      return { user_id: result.rows[0].user_id }
    } catch (error) {
      logger.error('Failed to find Google account', error as Error, { googleId }, LogCategory.USER)
      throw new Error('Database query failed')
    }
  }

  /**
   * 创建 Google 账户关联
   */
  private async createGoogleAccount(googleUser: GoogleUserInfo, userId: string, client?: any): Promise<void> {
    try {
      const query = `
        INSERT INTO accounts (id, provider_account_id, provider, user_id, access_token, refresh_token, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `
      
      const values = [
        uuidv4(),
        googleUser.id,
        'google',
        userId,
        null, // accessToken - 我们不存储长期令牌
        null, // refreshToken
        null  // expiresAt
      ]

      const dbClient = client || pool
      await dbClient.query(query, values)
      logger.info('Google account created', undefined, { userId, googleId: googleUser.id }, LogCategory.USER)
    } catch (error) {
      logger.error('Failed to create Google account', error as Error, { 
        userId, 
        googleId: googleUser.id 
      }, LogCategory.USER)
      throw new Error('Google account creation failed')
    }
  }

  /**
   * 检查用户是否有关联的 Google 账户
   */
  async hasGoogleAccount(userId: string): Promise<boolean> {
    try {
      const query = `
        SELECT 1
        FROM accounts
        WHERE user_id = $1 AND provider = 'google'
        LIMIT 1
      `
      
      const result = await pool.query(query, [userId])
      return result.rows.length > 0
    } catch (error) {
      logger.error('Failed to check Google account', error as Error, { userId }, LogCategory.USER)
      return false
    }
  }

  /**
   * 解除 Google 账户关联
   */
  async unlinkGoogleAccount(userId: string): Promise<boolean> {
    try {
      const query = `
        DELETE FROM accounts
        WHERE user_id = $1 AND provider = 'google'
      `
      
      const result = await pool.query(query, [userId])
      const wasUnlinked = result.rowCount > 0
      
      if (wasUnlinked) {
        logger.info('Google account unlinked', undefined, { userId }, LogCategory.USER)
      }
      
      return wasUnlinked
    } catch (error) {
      logger.error('Failed to unlink Google account', error as Error, { userId }, LogCategory.USER)
      throw new Error('Google account unlink failed')
    }
  }

  /**
   * 验证回调状态参数（防止CSRF）
   */
  validateState(receivedState: string, expectedState: string): boolean {
    return receivedState === expectedState
  }
}

// 创建一个延迟初始化的实例
class GoogleOAuthServiceWrapper {
  private instance: GoogleOAuthService | null = null
  
  public getInstance(): GoogleOAuthService | null {
    if (!this.instance) {
      try {
        this.instance = new GoogleOAuthService()
      } catch (error) {
        console.warn('Google OAuth service not available:', error)
      }
    }
    return this.instance
  }
  
  // 代理所有方法调用
  [key: string]: any
}

// 创建代理对象
export const googleOAuthService = new Proxy(new GoogleOAuthServiceWrapper(), {
  get(target, prop) {
    const instance = target.getInstance()
    if (!instance) {
      console.warn(`Google OAuth service not available. Method '${String(prop)}' cannot be called.`)
      return () => { throw new Error('Google OAuth not configured') }
    }
    return instance[prop as keyof GoogleOAuthService]
  }
})