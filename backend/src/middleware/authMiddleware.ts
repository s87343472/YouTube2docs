import { FastifyRequest, FastifyReply } from 'fastify'
import { jwtService } from '../services/jwtService'
import { userService } from '../services/userService'
import { userPlanIntegrationService } from '../services/userPlanIntegrationService'
import { logger, LogCategory } from '../utils/logger'

/**
 * 认证中间件
 * 负责验证JWT令牌、提取用户信息、检查权限等
 */

// 扩展 FastifyRequest 类型以包含用户信息
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string
      email: string
      name: string
      plan: string
      emailVerified: boolean
      image?: string
    }
  }
}

export interface AuthOptions {
  required?: boolean
  requiredPlan?: string[]
  requiredEmailVerified?: boolean
}

/**
 * JWT 认证中间件
 * 验证请求中的JWT令牌并注入用户信息
 */
export function createAuthMiddleware(options: AuthOptions = {}) {
  return async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
    try {
      const authHeader = request.headers.authorization
      
      // 提取令牌
      const token = jwtService.extractTokenFromHeader(authHeader || '')
      
      if (!token) {
        if (options.required) {
          return reply.code(401).send({
            success: false,
            message: '未提供认证令牌',
            code: 'MISSING_TOKEN'
          })
        }
        return // 可选认证，继续处理请求
      }

      // 验证令牌
      let payload
      try {
        payload = jwtService.verifyAccessToken(token)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Token verification failed'
        
        if (options.required) {
          return reply.code(401).send({
            success: false,
            message: '认证令牌无效',
            code: errorMessage.includes('expired') ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
            details: errorMessage
          })
        }
        
        logger.warn('Invalid token in optional auth', new Error(errorMessage), {}, LogCategory.USER)
        return // 可选认证，继续处理请求
      }

      // 获取用户完整信息
      const userWithPlan = await userPlanIntegrationService.getUserWithPlan(payload.userId)
      if (!userWithPlan) {
        if (options.required) {
          return reply.code(401).send({
            success: false,
            message: '用户不存在',
            code: 'USER_NOT_FOUND'
          })
        }
        return
      }

      // 检查邮箱验证要求
      if (options.requiredEmailVerified && !userWithPlan.email_verified) {
        return reply.code(403).send({
          success: false,
          message: '需要验证邮箱后才能访问此功能',
          code: 'EMAIL_NOT_VERIFIED'
        })
      }

      // 检查计划要求
      if (options.requiredPlan && options.requiredPlan.length > 0) {
        if (!options.requiredPlan.includes(userWithPlan.plan)) {
          return reply.code(403).send({
            success: false,
            message: '当前套餐无权限访问此功能',
            code: 'INSUFFICIENT_PLAN',
            details: {
              currentPlan: userWithPlan.plan,
              requiredPlans: options.requiredPlan
            }
          })
        }
      }

      // 注入用户信息到请求对象
      request.user = {
        id: userWithPlan.id,
        email: userWithPlan.email,
        name: userWithPlan.name,
        plan: userWithPlan.plan,
        emailVerified: userWithPlan.email_verified,
        image: userWithPlan.image
      }

      logger.info('User authenticated', undefined, { 
        userId: userWithPlan.id, 
        email: userWithPlan.email,
        plan: userWithPlan.plan 
      }, LogCategory.USER)

    } catch (error) {
      logger.error('Auth middleware error', error as Error, {}, LogCategory.USER)
      
      if (options.required) {
        return reply.code(500).send({
          success: false,
          message: '认证过程中发生错误',
          code: 'AUTH_ERROR'
        })
      }
    }
  }
}

/**
 * 必需认证中间件
 * 等同于 createAuthMiddleware({ required: true })
 */
export const requireAuth = createAuthMiddleware({ required: true })

/**
 * 可选认证中间件
 * 等同于 createAuthMiddleware({ required: false })
 */
export const optionalAuth = createAuthMiddleware({ required: false })

/**
 * 需要邮箱验证的认证中间件
 */
export const requireVerifiedAuth = createAuthMiddleware({ 
  required: true, 
  requiredEmailVerified: true 
})

/**
 * 高级计划认证中间件
 * 需要 pro、max 或 enterprise 计划
 */
export const requirePremiumAuth = createAuthMiddleware({
  required: true,
  requiredPlan: ['pro', 'max', 'enterprise']
})

/**
 * 刷新令牌中间件
 * 用于刷新访问令牌的端点
 */
export async function refreshTokenMiddleware(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { refreshToken } = request.body as { refreshToken: string }
    
    if (!refreshToken) {
      return reply.code(400).send({
        success: false,
        message: '缺少刷新令牌',
        code: 'MISSING_REFRESH_TOKEN'
      })
    }

    // 验证刷新令牌
    let payload
    try {
      payload = jwtService.verifyRefreshToken(refreshToken)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Refresh token verification failed'
      
      return reply.code(401).send({
        success: false,
        message: '刷新令牌无效或已过期',
        code: errorMessage.includes('expired') ? 'REFRESH_TOKEN_EXPIRED' : 'INVALID_REFRESH_TOKEN'
      })
    }

    // 获取用户信息
    const user = await userService.findUserById(payload.userId)
    if (!user) {
      return reply.code(401).send({
        success: false,
        message: '用户不存在',
        code: 'USER_NOT_FOUND'
      })
    }

    // 生成新的令牌对
    const newTokens = jwtService.generateTokenPair({
      userId: user.id,
      email: user.email,
      plan: user.plan
    })

    logger.info('Tokens refreshed', undefined, { userId: user.id }, LogCategory.USER)

    return reply.send({
      success: true,
      data: {
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          plan: user.plan,
          emailVerified: user.email_verified,
          image: user.image
        }
      }
    })

  } catch (error) {
    logger.error('Refresh token middleware error', error as Error, {}, LogCategory.USER)
    
    return reply.code(500).send({
      success: false,
      message: '令牌刷新过程中发生错误',
      code: 'REFRESH_ERROR'
    })
  }
}

/**
 * 管理员认证中间件
 * 检查用户是否为管理员（基于特定邮箱域名或角色）
 */
export async function adminAuthMiddleware(request: FastifyRequest, reply: FastifyReply) {
  // 先执行基础认证
  await requireAuth(request, reply)
  
  if (reply.sent) {
    return // 基础认证失败
  }

  const user = request.user
  if (!user) {
    return reply.code(401).send({
      success: false,
      message: '认证失败',
      code: 'AUTH_FAILED'
    })
  }

  // 检查管理员权限（这里可以根据实际需求调整）
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').filter(Boolean)
  const isAdmin = adminEmails.includes(user.email) || user.email.endsWith('@yourdomain.com') // 替换为实际域名
  
  if (!isAdmin) {
    return reply.code(403).send({
      success: false,
      message: '需要管理员权限',
      code: 'ADMIN_REQUIRED'
    })
  }

  logger.info('Admin authenticated', undefined, { userId: user.id, email: user.email }, LogCategory.USER)
}

/**
 * 配额检查中间件
 * 在执行资源密集型操作前检查用户配额
 */
export function createQuotaMiddleware(quotaType: string, amount: number = 1) {
  return async function quotaMiddleware(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = request.user
      if (!user) {
        return reply.code(401).send({
          success: false,
          message: '需要登录才能使用此功能',
          code: 'AUTH_REQUIRED'
        })
      }

      // 检查配额
      const quotaCheck = await userPlanIntegrationService.checkAndRecordQuotaUsage(
        user.id,
        quotaType,
        amount,
        {
          userAgent: request.headers['user-agent'],
          endpoint: request.url
        },
        request.ip,
        request.headers['user-agent']
      )

      if (!quotaCheck.allowed) {
        return reply.code(429).send({
          success: false,
          message: quotaCheck.reason || '配额已耗尽',
          code: 'QUOTA_EXCEEDED',
          details: {
            quotaType,
            amount
          }
        })
      }

      logger.info('Quota check passed', undefined, { 
        userId: user.id, 
        quotaType, 
        amount 
      }, LogCategory.USER)

    } catch (error) {
      logger.error('Quota middleware error', error as Error, { quotaType, amount }, LogCategory.USER)
      
      return reply.code(500).send({
        success: false,
        message: '配额检查失败',
        code: 'QUOTA_CHECK_ERROR'
      })
    }
  }
}

/**
 * 视频处理配额中间件
 */
export const videoQuotaMiddleware = createQuotaMiddleware('video_processing', 1)

/**
 * API调用配额中间件
 */
export const apiQuotaMiddleware = createQuotaMiddleware('api_calls', 1)

/**
 * 分享配额中间件
 */
export const shareQuotaMiddleware = createQuotaMiddleware('shares', 1)