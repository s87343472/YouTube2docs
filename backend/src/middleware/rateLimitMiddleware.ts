import { FastifyRequest, FastifyReply } from 'fastify'
import { AbusePreventionService } from '../services/abusePreventionService'
import { logger } from '../utils/logger'

/**
 * 频率限制中间件
 * 基于用户和IP进行防滥用保护
 */

export interface RateLimitOptions {
  operationType: string
  skipForUsers?: number[] // 跳过检查的用户ID列表（如管理员）
  skipIPCheck?: boolean
  skipUserCheck?: boolean
}

/**
 * 创建频率限制中间件
 */
export function createRateLimitMiddleware(options: RateLimitOptions) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const ipAddress = request.ip
      const userId = (request as any).user?.id
      const userAgent = request.headers['user-agent']
      const requestPath = request.url

      // 检查黑名单
      if (ipAddress) {
        const ipBlacklistCheck = await AbusePreventionService.checkBlacklist('ip', ipAddress)
        if (ipBlacklistCheck.blocked) {
          logger.warn('Blocked IP address attempted access', undefined, { 
            ipAddress, 
            reason: ipBlacklistCheck.reason,
            path: requestPath 
          })
          
          return reply.code(403).send({
            success: false,
            error: {
              code: 'IP_BLOCKED',
              message: ipBlacklistCheck.reason || 'IP地址已被封禁'
            }
          })
        }
      }

      if (userId) {
        const userBlacklistCheck = await AbusePreventionService.checkBlacklist('user', userId.toString())
        if (userBlacklistCheck.blocked) {
          logger.warn('Blocked user attempted access', undefined, { 
            userId, 
            reason: userBlacklistCheck.reason,
            path: requestPath 
          })
          
          return reply.code(403).send({
            success: false,
            error: {
              code: 'USER_BLOCKED',
              message: userBlacklistCheck.reason || '用户账户已被封禁'
            }
          })
        }
      }

      // 跳过特定用户的检查（如管理员）
      if (userId && options.skipForUsers?.includes(userId)) {
        return
      }

      // IP级别检查
      if (!options.skipIPCheck && ipAddress) {
        const ipLimit = await AbusePreventionService.checkIPLimit(ipAddress, options.operationType)
        
        if (!ipLimit.allowed) {
          logger.warn('IP rate limit exceeded', undefined, { 
            ipAddress, 
            operationType: options.operationType,
            reason: ipLimit.reason 
          })

          // 记录失败的操作
          await AbusePreventionService.recordIPOperation(ipAddress, options.operationType, {
            userId,
            requestPath,
            userAgent,
            success: false,
            operationData: { limitExceeded: true }
          })

          return reply.code(429).send({
            success: false,
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: ipLimit.reason || '操作过于频繁，请稍后再试',
              resetTime: ipLimit.resetTime.toISOString(),
              remaining: ipLimit.remaining
            }
          })
        }
      }

      // 用户级别检查
      if (!options.skipUserCheck && userId) {
        const userLimit = await AbusePreventionService.checkUserOperationLimit(userId, options.operationType)
        
        if (!userLimit.allowed) {
          logger.warn('User rate limit exceeded', undefined, { 
            userId, 
            operationType: options.operationType,
            reason: userLimit.reason 
          })

          return reply.code(429).send({
            success: false,
            error: {
              code: 'USER_RATE_LIMIT_EXCEEDED',
              message: userLimit.reason || '操作过于频繁，请稍后再试',
              resetTime: userLimit.resetTime.toISOString(),
              remaining: userLimit.remaining
            }
          })
        }
      }

      // 记录成功的操作（仅记录，不增加计数）
      if (ipAddress) {
        await AbusePreventionService.recordIPOperation(ipAddress, options.operationType, {
          userId,
          requestPath,
          userAgent,
          success: true
        })
      }

      // 中间件通过，继续处理请求
    } catch (error) {
      logger.error('Rate limit middleware error', error as Error, { 
        operationType: options.operationType,
        ip: request.ip 
      })
      
      // 发生错误时默认允许请求继续，避免影响正常用户
    }
  }
}

/**
 * 视频处理专用的频率限制中间件
 */
export const videoProcessingRateLimit = createRateLimitMiddleware({
  operationType: 'video_process'
})

/**
 * 套餐变更专用的频率限制中间件
 */
export const planChangeRateLimit = createRateLimitMiddleware({
  operationType: 'plan_change'
})

/**
 * 分享创建专用的频率限制中间件
 */
export const shareCreateRateLimit = createRateLimitMiddleware({
  operationType: 'share_create'
})

/**
 * 内容导出专用的频率限制中间件
 */
export const exportContentRateLimit = createRateLimitMiddleware({
  operationType: 'export_content'
})

/**
 * 登录尝试频率限制中间件
 */
export const loginAttemptRateLimit = createRateLimitMiddleware({
  operationType: 'login_attempt',
  skipUserCheck: true // 登录时可能还没有用户信息
})

/**
 * 异常行为检测中间件
 */
export async function anomalyDetectionMiddleware(
  request: FastifyRequest, 
  reply: FastifyReply
) {
  try {
    const ipAddress = request.ip
    if (!ipAddress) return

    // 每100个请求检测一次异常行为
    if (Math.random() > 0.01) return

    const detection = await AbusePreventionService.detectAnomalousPattern(ipAddress, 60)
    
    if (detection.suspicious) {
      logger.warn('Anomalous behavior detected', undefined, {
        ipAddress,
        patterns: detection.patterns,
        severity: detection.severity,
        path: request.url
      })

      // 高严重程度的异常行为自动添加临时封禁
      if (detection.severity === 'high') {
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1小时临时封禁
        await AbusePreventionService.addToBlacklist(
          'ip',
          ipAddress,
          `自动检测：异常行为模式 - ${detection.patterns.join(', ')}`,
          expiresAt
        )

        return reply.code(403).send({
          success: false,
          error: {
            code: 'SUSPICIOUS_ACTIVITY',
            message: '检测到异常活动，IP已被临时封禁'
          }
        })
      }
    }
  } catch (error) {
    logger.error('Anomaly detection middleware error', error as Error, { ip: request.ip })
  }
}

/**
 * 视频处理冷却期检查中间件
 */
export async function videoProcessingCooldownMiddleware(
  request: FastifyRequest<{
    Body: {
      youtubeUrl: string
    }
  }>, 
  reply: FastifyReply
) {
  try {
    const userId = (request as any).user?.id
    const { youtubeUrl } = request.body

    if (!userId || !youtubeUrl) return

    const cooldownCheck = await AbusePreventionService.checkVideoProcessingCooldown(
      userId, 
      youtubeUrl, 
      60 // 60分钟冷却期
    )

    if (!cooldownCheck.allowed) {
      logger.info('Video processing cooldown active', undefined, {
        userId,
        youtubeUrl,
        reason: cooldownCheck.reason
      })

      return reply.code(429).send({
        success: false,
        error: {
          code: 'VIDEO_PROCESSING_COOLDOWN',
          message: cooldownCheck.reason,
          resetTime: cooldownCheck.resetTime.toISOString()
        }
      })
    }
  } catch (error) {
    logger.error('Video processing cooldown middleware error', error as Error)
  }
}