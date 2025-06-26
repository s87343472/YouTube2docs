import { FastifyRequest, FastifyReply } from 'fastify'
import { config } from '../config'
import { logger, LogCategory } from '../utils/logger'
import { DatabaseManager } from '../utils/database'

/**
 * 速率限制中间件
 * 防止API滥用和DDoS攻击
 */

// Rate limit configuration interface
interface RateLimitConfig {
  windowMs: number    // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
  keyGenerator?: (request: FastifyRequest) => string
  onLimitReached?: (request: FastifyRequest, reply: FastifyReply) => void
}

// Rate limit store interface
interface RateLimitStore {
  increment(key: string, windowMs: number): Promise<{ count: number; resetTime: number }>
  reset(key: string): Promise<void>
}

// Redis-based rate limit store
class RedisRateLimitStore implements RateLimitStore {
  async increment(key: string, windowMs: number): Promise<{ count: number; resetTime: number }> {
    const redis = await DatabaseManager.getRedisConnection()
    const now = Date.now()
    const window = Math.floor(now / windowMs)
    const redisKey = `rate_limit:${key}:${window}`
    
    const pipeline = redis.pipeline()
    pipeline.incr(redisKey)
    pipeline.expire(redisKey, Math.ceil(windowMs / 1000))
    
    const results = await pipeline.exec()
    const count = results?.[0]?.[1] as number || 0
    const resetTime = (window + 1) * windowMs
    
    return { count, resetTime }
  }
  
  async reset(key: string): Promise<void> {
    const redis = await DatabaseManager.getRedisConnection()
    const pattern = `rate_limit:${key}:*`
    
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  }
}

// Memory-based rate limit store (for development/testing)
class MemoryRateLimitStore implements RateLimitStore {
  private store: Map<string, { count: number; resetTime: number }> = new Map()
  
  async increment(key: string, windowMs: number): Promise<{ count: number; resetTime: number }> {
    const now = Date.now()
    const window = Math.floor(now / windowMs)
    const storeKey = `${key}:${window}`
    
    const existing = this.store.get(storeKey)
    if (existing) {
      existing.count++
      return existing
    } else {
      const resetTime = (window + 1) * windowMs
      const entry = { count: 1, resetTime }
      this.store.set(storeKey, entry)
      
      // Clean up expired entries
      setTimeout(() => this.store.delete(storeKey), windowMs)
      
      return entry
    }
  }
  
  async reset(key: string): Promise<void> {
    for (const storeKey of this.store.keys()) {
      if (storeKey.startsWith(key)) {
        this.store.delete(storeKey)
      }
    }
  }
}

// Create store instance based on configuration
const store: RateLimitStore = DatabaseManager.isRedisAvailable() 
  ? new RedisRateLimitStore() 
  : new MemoryRateLimitStore()

/**
 * 默认key生成器 - 基于IP地址
 */
function defaultKeyGenerator(request: FastifyRequest): string {
  return request.ip
}

/**
 * 用户ID key生成器 - 基于认证用户
 */
function userKeyGenerator(request: FastifyRequest): string {
  if (request.user) {
    return `user:${request.user.id}`
  }
  return `ip:${request.ip}`
}

/**
 * API endpoint key生成器 - 基于IP和路径
 */
function endpointKeyGenerator(request: FastifyRequest): string {
  return `${request.ip}:${request.routerPath || request.url}`
}

/**
 * 速率限制中间件工厂
 */
export function rateLimit(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = defaultKeyGenerator,
    onLimitReached
  } = config

  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const key = keyGenerator(request)
      const { count, resetTime } = await store.increment(key, windowMs)
      
      // Add rate limit headers
      reply.header('X-RateLimit-Limit', maxRequests)
      reply.header('X-RateLimit-Remaining', Math.max(0, maxRequests - count))
      reply.header('X-RateLimit-Reset', new Date(resetTime).toISOString())
      
      if (count > maxRequests) {
        logger.warn('Rate limit exceeded', undefined, {
          requestId: request.requestId,
          key,
          count,
          limit: maxRequests,
          windowMs,
          ip: request.ip,
          userAgent: request.headers['user-agent'],
          url: request.url
        }, LogCategory.SECURITY)
        
        if (onLimitReached) {
          onLimitReached(request, reply)
        }
        
        return reply.code(429).send({
          error: {
            statusCode: 429,
            message: 'Too many requests, please try again later',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: Math.ceil((resetTime - Date.now()) / 1000)
          }
        })
      }
      
      // Log if approaching limit
      if (count > maxRequests * 0.8) {
        logger.warn('Rate limit warning - approaching limit', undefined, {
          requestId: request.requestId,
          key,
          count,
          limit: maxRequests,
          percentage: Math.round((count / maxRequests) * 100)
        }, LogCategory.SECURITY)
      }
      
      // Add hook to potentially skip counting based on response
      reply.addHook('onSend', async (request, reply, payload) => {
        const statusCode = reply.statusCode
        const shouldSkip = 
          (skipSuccessfulRequests && statusCode < 400) ||
          (skipFailedRequests && statusCode >= 400)
        
        if (shouldSkip) {
          // We would need to decrement here, but it's complex with time windows
          // For simplicity, we just log this case
          logger.debug('Rate limit count should be skipped', undefined, {
            requestId: request.requestId,
            statusCode,
            skipSuccessfulRequests,
            skipFailedRequests
          }, LogCategory.SECURITY)
        }
        
        return payload
      })
      
    } catch (error) {
      logger.error('Rate limiting error', error as Error, {
        requestId: request.requestId,
        ip: request.ip
      }, LogCategory.SECURITY)
      
      // In case of rate limiting errors, allow the request to proceed
      // but log the issue for investigation
    }
  }
}

// 预定义的速率限制配置
export const rateLimitConfigs = {
  // 严格限制 - 用于认证相关的端点
  strict: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    keyGenerator: defaultKeyGenerator
  },
  
  // 中等限制 - 用于API端点
  moderate: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    keyGenerator: userKeyGenerator
  },
  
  // 宽松限制 - 用于公开端点
  lenient: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000,
    keyGenerator: defaultKeyGenerator
  },
  
  // 用户特定限制
  perUser: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 1000,
    keyGenerator: userKeyGenerator
  },
  
  // 端点特定限制
  perEndpoint: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60,
    keyGenerator: endpointKeyGenerator
  }
}

// 常用的速率限制中间件
export const rateLimitMiddleware = {
  // 全局API限制
  global: rateLimit({
    windowMs: config.security.rateLimitWindow,
    maxRequests: config.security.rateLimitMax,
    keyGenerator: userKeyGenerator
  }),
  
  // 认证端点限制
  auth: rateLimit(rateLimitConfigs.strict),
  
  // 文件上传限制
  upload: rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 10,
    keyGenerator: userKeyGenerator
  }),
  
  // 视频处理限制
  videoProcessing: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20,
    keyGenerator: userKeyGenerator
  }),
  
  // 分享创建限制
  createShare: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 50,
    keyGenerator: userKeyGenerator
  }),
  
  // 公开内容访问限制
  publicAccess: rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 200,
    keyGenerator: defaultKeyGenerator
  })
}

/**
 * 重置用户的速率限制
 */
export async function resetUserRateLimit(userId: string): Promise<void> {
  try {
    await store.reset(`user:${userId}`)
    logger.info('Rate limit reset for user', undefined, {
      userId
    }, LogCategory.SECURITY)
  } catch (error) {
    logger.error('Failed to reset user rate limit', error as Error, {
      userId
    }, LogCategory.SECURITY)
    throw error
  }
}

/**
 * 重置IP的速率限制
 */
export async function resetIpRateLimit(ip: string): Promise<void> {
  try {
    await store.reset(`ip:${ip}`)
    logger.info('Rate limit reset for IP', undefined, {
      ip
    }, LogCategory.SECURITY)
  } catch (error) {
    logger.error('Failed to reset IP rate limit', error as Error, {
      ip
    }, LogCategory.SECURITY)
    throw error
  }
}

// 导出配置和工具
export { RateLimitConfig, RateLimitStore }
export { userKeyGenerator, endpointKeyGenerator, defaultKeyGenerator }