import { FastifyRequest, FastifyReply } from 'fastify'
import * as jwt from 'jsonwebtoken'
import { config } from '../config'
import { logger, LogCategory } from '../utils/logger'

/**
 * 身份认证中间件
 * 处理JWT token验证和用户身份识别
 */

// User interface (simplified for now)
export interface AuthenticatedUser {
  id: string
  email?: string
  role?: string
  isActive: boolean
}

// JWT payload interface
interface JWTPayload {
  userId: string
  email?: string
  role?: string
  iat: number
  exp: number
}

// Extended request with user information
declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser
    requestId?: string
  }
}

/**
 * 验证JWT token并解析用户信息
 */
export async function verifyToken(token: string): Promise<AuthenticatedUser | null> {
  try {
    if (!config.security.jwtSecret) {
      logger.error('JWT secret not configured', undefined, {}, LogCategory.SECURITY)
      return null
    }

    const decoded = jwt.verify(token, config.security.jwtSecret!) as JWTPayload
    
    // TODO: 在实际应用中，这里应该查询数据库验证用户状态
    const user: AuthenticatedUser = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role || 'user',
      isActive: true
    }

    logger.debug('Token verified successfully', undefined, {
      metadata: {
        userId: user.id,
        role: user.role
      }
    }, LogCategory.SECURITY)

    return user
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid JWT token', undefined, {
        metadata: {
          error: error.message
        }
      }, LogCategory.SECURITY)
    } else if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Expired JWT token', undefined, {
        metadata: {
          expiredAt: error.expiredAt
        }
      }, LogCategory.SECURITY)
    } else {
      logger.error('JWT verification failed', error as Error, {}, LogCategory.SECURITY)
    }
    return null
  }
}

/**
 * 从请求中提取token
 */
export function extractToken(request: FastifyRequest): string | null {
  // Check Authorization header
  const authHeader = request.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  // Check query parameter (for backwards compatibility)
  const queryToken = request.query as { token?: string }
  if (queryToken.token) {
    return queryToken.token
  }

  // Check cookies (if cookies plugin is enabled)
  const cookies = (request as any).cookies
  if (cookies?.token) {
    return cookies.token
  }

  return null
}

/**
 * 可选身份认证中间件
 * 如果提供了token则验证，但不强制要求
 */
export async function optionalAuth(request: FastifyRequest, reply: FastifyReply) {
  const token = extractToken(request)
  
  if (token) {
    const user = await verifyToken(token)
    if (user) {
      request.user = user
      logger.debug('User authenticated via optional auth', undefined, {
        metadata: {
          userId: user.id,
          requestId: request.requestId || 'unknown'
        }
      }, LogCategory.SECURITY)
    } else {
      logger.warn('Invalid token provided in optional auth', undefined, {
        metadata: {
          requestId: request.requestId || 'unknown',
          ip: request.ip
        }
      }, LogCategory.SECURITY)
    }
  }
}

/**
 * 必需身份认证中间件
 * 要求必须提供有效的token
 */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const token = extractToken(request)
  
  if (!token) {
    logger.warn('Authentication required but no token provided', undefined, {
      metadata: {
        requestId: (request as any).requestId,
        url: request.url,
        ip: request.ip
      }
    }, LogCategory.SECURITY)
    
    return reply.code(401).send({
      error: {
        statusCode: 401,
        message: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED'
      }
    })
  }

  const user = await verifyToken(token)
  
  if (!user) {
    logger.warn('Authentication failed with invalid token', undefined, {
      metadata: {
        requestId: (request as any).requestId,
        url: request.url,
        ip: request.ip
      }
    }, LogCategory.SECURITY)
    
    return reply.code(401).send({
      error: {
        statusCode: 401,
        message: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      }
    })
  }

  if (!user.isActive) {
    logger.warn('Authentication failed - user inactive', undefined, {
      metadata: {
        requestId: (request as any).requestId,
        userId: user.id,
        ip: request.ip
      }
    }, LogCategory.SECURITY)
    
    return reply.code(403).send({
      error: {
        statusCode: 403,
        message: 'Account is inactive',
        code: 'ACCOUNT_INACTIVE'
      }
    })
  }

  request.user = user
  
  logger.debug('User authenticated successfully', undefined, {
    metadata: {
      userId: user.id,
      role: user.role,
      requestId: (request as any).requestId
    }
  }, LogCategory.SECURITY)
}

/**
 * 角色授权中间件工厂
 * 检查用户是否具有指定角色
 */
export function requireRole(allowedRoles: string | string[]) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]
  
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // 首先确保用户已经通过身份认证
    if (!request.user) {
      logger.warn('Role check attempted without authentication', undefined, {
        metadata: {
          requestId: request.requestId || 'unknown',
          url: request.url,
          requiredRoles: roles
        }
      }, LogCategory.SECURITY)
      
      return reply.code(401).send({
        error: {
          statusCode: 401,
          message: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        }
      })
    }

    const userRole = request.user.role || 'user'
    
    if (!roles.includes(userRole)) {
      logger.warn('Insufficient permissions', undefined, {
        metadata: {
          requestId: request.requestId || 'unknown',
          userId: request.user.id,
          userRole,
          requiredRoles: roles,
          url: request.url
        }
      }, LogCategory.SECURITY)
      
      return reply.code(403).send({
        error: {
          statusCode: 403,
          message: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS'
        }
      })
    }

    logger.debug('Role authorization successful', undefined, {
      metadata: {
        userId: request.user.id,
        userRole,
        requiredRoles: roles,
        requestId: (request as any).requestId
      }
    }, LogCategory.SECURITY)
  }
}

/**
 * 管理员权限中间件
 */
export const requireAdmin = requireRole('admin')

/**
 * 用户或管理员权限中间件
 */
export const requireUserOrAdmin = requireRole(['user', 'admin'])

/**
 * 生成JWT token
 */
export function generateToken(user: Pick<AuthenticatedUser, 'id' | 'email' | 'role'>): string {
  if (!config.security.jwtSecret) {
    throw new Error('JWT secret not configured')
  }

  const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
    userId: user.id,
    email: user.email,
    role: user.role
  }

  const token = jwt.sign(payload, config.security.jwtSecret!, {
    expiresIn: config.security.jwtExpiresIn
  })

  logger.info('JWT token generated', undefined, {
    metadata: {
      userId: user.id,
      role: user.role,
      expiresIn: config.security.jwtExpiresIn
    }
  }, LogCategory.SECURITY)

  return token
}

/**
 * 刷新token
 */
export async function refreshToken(oldToken: string): Promise<string | null> {
  try {
    if (!config.security.jwtSecret) {
      throw new Error('JWT secret not configured')
    }

    // 验证旧token（即使过期也要能解析）
    const decoded = jwt.verify(oldToken, config.security.jwtSecret!, {
      ignoreExpiration: true
    }) as JWTPayload

    // 检查token是否在合理的刷新窗口内（例如过期后7天内）
    const now = Math.floor(Date.now() / 1000)
    const refreshWindow = 7 * 24 * 60 * 60 // 7 days
    
    if (decoded.exp && (now - decoded.exp) > refreshWindow) {
      logger.warn('Token refresh attempt outside allowed window', undefined, {
        metadata: {
          userId: decoded.userId,
          expiredAt: new Date(decoded.exp * 1000),
          attemptedAt: new Date()
        }
      }, LogCategory.SECURITY)
      return null
    }

    // 生成新token
    const newToken = generateToken({
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role
    })

    logger.info('Token refreshed successfully', undefined, {
      metadata: {
        userId: decoded.userId
      }
    }, LogCategory.SECURITY)

    return newToken
  } catch (error) {
    logger.error('Token refresh failed', error as Error, {}, LogCategory.SECURITY)
    return null
  }
}

// 导出常用的认证组合
export const authMiddleware = {
  optional: optionalAuth,
  required: requireAuth,
  admin: [requireAuth, requireAdmin],
  userOrAdmin: [requireAuth, requireUserOrAdmin]
}