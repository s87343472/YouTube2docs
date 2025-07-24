import { pool } from '../utils/database'
import { logger, LogCategory } from '../utils/logger'
import { passwordService } from './passwordService'
import { v4 as uuidv4 } from 'uuid'

/**
 * 用户管理服务
 * 负责用户的创建、查询、更新等核心操作
 */

export interface User {
  id: string
  email: string
  name: string
  email_verified: boolean
  image?: string
  plan: 'free' | 'basic' | 'pro' | 'enterprise'
  monthly_quota: number
  used_quota: number
  created_at: Date
  updated_at: Date
}

export interface CreateUserData {
  email: string
  password?: string
  name: string
  image?: string
  email_verified?: boolean
}

export interface UpdateUserData {
  name?: string
  image?: string
  email_verified?: boolean
  plan?: string
  monthly_quota?: number
}

export class UserService {
  /**
   * 根据邮箱查找用户
   */
  async findUserByEmail(email: string): Promise<User | null> {
    try {
      const query = `
        SELECT id, email, name, email_verified, image, plan, monthly_quota, used_quota, created_at, updated_at
        FROM users 
        WHERE email = $1
      `
      
      const result = await pool.query(query, [email])
      
      if (result.rows.length === 0) {
        return null
      }

      const user = result.rows[0]
      logger.info('User found by email', undefined, { userId: user.id, email }, LogCategory.USER)
      
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        email_verified: user.email_verified,
        image: user.image,
        plan: user.plan,
        monthly_quota: user.monthly_quota,
        used_quota: user.used_quota,
        created_at: user.created_at,
        updated_at: user.updated_at
      }
    } catch (error) {
      logger.error('Failed to find user by email', error as Error, { email }, LogCategory.USER)
      throw new Error('Database query failed')
    }
  }

  /**
   * 根据ID查找用户
   */
  async findUserById(id: string): Promise<User | null> {
    try {
      const query = `
        SELECT id, email, name, email_verified, image, plan, monthly_quota, used_quota, created_at, updated_at
        FROM users 
        WHERE id = $1
      `
      
      const result = await pool.query(query, [id])
      
      if (result.rows.length === 0) {
        return null
      }

      const user = result.rows[0]
      
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        email_verified: user.email_verified,
        image: user.image,
        plan: user.plan,
        monthly_quota: user.monthly_quota,
        used_quota: user.used_quota,
        created_at: user.created_at,
        updated_at: user.updated_at
      }
    } catch (error) {
      logger.error('Failed to find user by ID', error as Error, { userId: id }, LogCategory.USER)
      throw new Error('Database query failed')
    }
  }

  /**
   * 创建新用户（邮箱注册）
   */
  async createUser(userData: CreateUserData, existingClient?: any): Promise<User> {
    const shouldUseOwnTransaction = !existingClient
    const client = existingClient || await pool.connect()
    
    try {
      if (shouldUseOwnTransaction) {
        await client.query('BEGIN')
      }

      // 检查邮箱是否已存在
      const existingUser = await this.findUserByEmail(userData.email)
      if (existingUser) {
        throw new Error('Email already registered')
      }

      // 生成用户ID
      const userId = uuidv4()

      // 哈希密码（如果提供）
      let passwordHash = null
      if (userData.password) {
        passwordHash = await passwordService.hashPassword(userData.password)
      }

      // 插入用户记录
      const insertUserQuery = `
        INSERT INTO users (id, email, name, email_verified, image, plan, monthly_quota, used_quota)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, email, name, email_verified, image, plan, monthly_quota, used_quota, created_at, updated_at
      `
      
      const userValues = [
        userId,
        userData.email,
        userData.name,
        userData.email_verified || false,
        userData.image || null,
        'free', // 新用户默认为免费计划
        3,      // 免费计划月度配额
        0       // 初始使用量为0
      ]

      const userResult = await client.query(insertUserQuery, userValues)
      const newUser = userResult.rows[0]

      // 如果有密码，创建凭据记录
      if (passwordHash) {
        const insertAccountQuery = `
          INSERT INTO accounts (id, provider_account_id, provider, user_id, password)
          VALUES ($1, $2, $3, $4, $5)
        `
        
        const accountValues = [
          uuidv4(),
          userData.email, // accountId 使用邮箱
          'credential',   // 邮箱密码登录
          userId,
          passwordHash
        ]

        await client.query(insertAccountQuery, accountValues)
      }

      if (shouldUseOwnTransaction) {
        await client.query('COMMIT')
      }

      logger.info('User created successfully', undefined, { 
        userId: newUser.id, 
        email: userData.email,
        hasPassword: !!userData.password 
      }, LogCategory.USER)

      return {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        email_verified: newUser.email_verified,
        image: newUser.image,
        plan: newUser.plan,
        monthly_quota: newUser.monthly_quota,
        used_quota: newUser.used_quota,
        created_at: newUser.created_at,
        updated_at: newUser.updated_at
      }
    } catch (error) {
      if (shouldUseOwnTransaction) {
        await client.query('ROLLBACK')
      }
      logger.error('Failed to create user', error as Error, { email: userData.email }, LogCategory.USER)
      throw error
    } finally {
      if (shouldUseOwnTransaction) {
        client.release()
      }
    }
  }

  /**
   * 验证用户密码
   */
  async verifyUserPassword(email: string, password: string): Promise<User | null> {
    try {
      // 获取用户信息和密码哈希
      const query = `
        SELECT u.id, u.email, u.name, u.email_verified, u.image, u.plan, u.monthly_quota, u.used_quota, 
               u.created_at, u.updated_at, a.password
        FROM users u
        JOIN accounts a ON u.id = a.user_id
        WHERE u.email = $1 AND a.provider = 'credential'
      `
      
      const result = await pool.query(query, [email])
      
      if (result.rows.length === 0) {
        logger.warn('User not found or no password account', undefined, { email }, LogCategory.USER)
        return null
      }

      const userData = result.rows[0]
      
      // 验证密码
      const isValidPassword = await passwordService.verifyPassword(password, userData.password)
      
      if (!isValidPassword) {
        logger.warn('Invalid password attempt', undefined, { email, userId: userData.id }, LogCategory.USER)
        return null
      }

      logger.info('User password verified successfully', undefined, { userId: userData.id, email }, LogCategory.USER)

      return {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        email_verified: userData.email_verified,
        image: userData.image,
        plan: userData.plan,
        monthly_quota: userData.monthly_quota,
        used_quota: userData.used_quota,
        created_at: userData.created_at,
        updated_at: userData.updated_at
      }
    } catch (error) {
      logger.error('Failed to verify user password', error as Error, { email }, LogCategory.USER)
      throw new Error('Authentication failed')
    }
  }

  /**
   * 更新用户信息
   */
  async updateUser(userId: string, updateData: UpdateUserData): Promise<User | null> {
    try {
      const setParts: string[] = []
      const values: any[] = []
      let paramCount = 1

      // 构建动态更新语句
      if (updateData.name !== undefined) {
        setParts.push(`name = $${paramCount++}`)
        values.push(updateData.name)
      }

      if (updateData.image !== undefined) {
        setParts.push(`image = $${paramCount++}`)
        values.push(updateData.image)
      }

      if (updateData.email_verified !== undefined) {
        setParts.push(`email_verified = $${paramCount++}`)
        values.push(updateData.email_verified)
      }

      if (updateData.plan !== undefined) {
        setParts.push(`plan = $${paramCount++}`)
        values.push(updateData.plan)
      }

      if (updateData.monthly_quota !== undefined) {
        setParts.push(`monthly_quota = $${paramCount++}`)
        values.push(updateData.monthly_quota)
      }

      if (setParts.length === 0) {
        throw new Error('No update data provided')
      }

      // 添加 updatedAt 和 userId
      setParts.push(`updated_at = CURRENT_TIMESTAMP`)
      values.push(userId)

      const query = `
        UPDATE users 
        SET ${setParts.join(', ')}
        WHERE id = $${paramCount}
        RETURNING id, email, name, email_verified, image, plan, monthly_quota, used_quota, created_at, updated_at
      `

      const result = await pool.query(query, values)

      if (result.rows.length === 0) {
        return null
      }

      const user = result.rows[0]
      logger.info('User updated successfully', undefined, { userId, updateFields: Object.keys(updateData) }, LogCategory.USER)

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        email_verified: user.email_verified,
        image: user.image,
        plan: user.plan,
        monthly_quota: user.monthly_quota,
        used_quota: user.used_quota,
        created_at: user.created_at,
        updated_at: user.updated_at
      }
    } catch (error) {
      logger.error('Failed to update user', error as Error, { userId, updateData }, LogCategory.USER)
      throw new Error('User update failed')
    }
  }

  /**
   * 检查邮箱是否已存在
   */
  async isEmailTaken(email: string): Promise<boolean> {
    try {
      const user = await this.findUserByEmail(email)
      return user !== null
    } catch (error) {
      logger.error('Failed to check email availability', error as Error, { email }, LogCategory.USER)
      throw new Error('Email check failed')
    }
  }

  /**
   * 更新用户配额使用量
   */
  async updateQuotaUsage(userId: string, newUsedQuota: number): Promise<void> {
    try {
      const query = `
        UPDATE users 
        SET used_quota = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `
      
      await pool.query(query, [newUsedQuota, userId])
      logger.info('User quota updated', undefined, { userId, newUsedQuota }, LogCategory.USER)
    } catch (error) {
      logger.error('Failed to update user quota', error as Error, { userId, newUsedQuota }, LogCategory.USER)
      throw new Error('Quota update failed')
    }
  }
}

export const userService = new UserService()