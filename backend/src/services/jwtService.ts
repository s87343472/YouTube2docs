import jwt from 'jsonwebtoken'
import { logger, LogCategory } from '../utils/logger'

/**
 * JWT 令牌服务
 * 负责生成、验证和管理 JWT 令牌
 */

export interface JWTPayload {
  userId: string
  email: string
  plan: string
  iat?: number
  exp?: number
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

export class JWTService {
  private readonly accessTokenSecret: string
  private readonly refreshTokenSecret: string
  private readonly accessTokenExpiry: string = '15m'
  private readonly refreshTokenExpiry: string = '7d'

  constructor() {
    this.accessTokenSecret = process.env.JWT_SECRET || process.env.BETTER_AUTH_SECRET || 'fallback_secret_key_should_be_replaced'
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || this.accessTokenSecret + '_refresh'
  }

  /**
   * 生成访问令牌
   */
  generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    try {
      return jwt.sign(payload, this.accessTokenSecret, {
        expiresIn: this.accessTokenExpiry,
        issuer: 'youtube-learning-app',
        audience: 'youtube-learning-users'
      } as jwt.SignOptions)
    } catch (error) {
      logger.error('Failed to generate access token', error as Error, { userId: payload.userId }, LogCategory.USER)
      throw new Error('Token generation failed')
    }
  }

  /**
   * 生成刷新令牌
   */
  generateRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    try {
      return jwt.sign(
        { userId: payload.userId, email: payload.email },
        this.refreshTokenSecret,
        {
          expiresIn: this.refreshTokenExpiry,
          issuer: 'youtube-learning-app',
          audience: 'youtube-learning-users'
        } as jwt.SignOptions
      )
    } catch (error) {
      logger.error('Failed to generate refresh token', error as Error, { userId: payload.userId }, LogCategory.USER)
      throw new Error('Refresh token generation failed')
    }
  }

  /**
   * 生成令牌对
   */
  generateTokenPair(payload: Omit<JWTPayload, 'iat' | 'exp'>): TokenPair {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload)
    }
  }

  /**
   * 验证访问令牌
   */
  verifyAccessToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret, {
        issuer: 'youtube-learning-app',
        audience: 'youtube-learning-users'
      }) as JWTPayload

      return decoded
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired')
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token')
      } else {
        logger.error('Token verification failed', error as Error, {}, LogCategory.USER)
        throw new Error('Token verification failed')
      }
    }
  }

  /**
   * 验证刷新令牌
   */
  verifyRefreshToken(token: string): Pick<JWTPayload, 'userId' | 'email'> {
    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret, {
        issuer: 'youtube-learning-app',
        audience: 'youtube-learning-users'
      }) as Pick<JWTPayload, 'userId' | 'email'>

      return decoded
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token expired')
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token')
      } else {
        logger.error('Refresh token verification failed', error as Error, {}, LogCategory.USER)
        throw new Error('Refresh token verification failed')
      }
    }
  }

  /**
   * 从请求头中提取令牌
   */
  extractTokenFromHeader(authHeader: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }
    
    return authHeader.substring(7) // 移除 "Bearer " 前缀
  }

  /**
   * 检查令牌是否即将过期（15分钟内）
   */
  isTokenNearExpiry(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as JWTPayload
      if (!decoded || !decoded.exp) {
        return true
      }

      const currentTime = Math.floor(Date.now() / 1000)
      const timeUntilExpiry = decoded.exp - currentTime
      
      // 如果15分钟内过期，返回 true
      return timeUntilExpiry < 15 * 60
    } catch (error) {
      return true
    }
  }
}

export const jwtService = new JWTService()