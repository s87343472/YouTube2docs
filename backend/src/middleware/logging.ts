import { FastifyRequest, FastifyReply } from 'fastify'
import { logger, generateRequestId, createRequestLogger, LogCategory } from '../utils/logger'
import { config } from '../config'

/**
 * 请求日志中间件
 * 提供请求跟踪、性能监控和错误记录
 */

// Request logging configuration
interface RequestLoggingConfig {
  enableRequestLogging: boolean
  enableResponseLogging: boolean
  enablePerformanceLogging: boolean
  logRequestBody: boolean
  logResponseBody: boolean
  sensitiveFields: string[]
  maxBodySize: number
}

// Default configuration
const defaultConfig: RequestLoggingConfig = {
  enableRequestLogging: config.logging.enableRequestLogging,
  enableResponseLogging: true,
  enablePerformanceLogging: true,
  logRequestBody: false, // Security consideration
  logResponseBody: false, // Performance consideration
  sensitiveFields: [
    'password',
    'token',
    'authorization',
    'cookie',
    'apiKey',
    'secret',
    'key'
  ],
  maxBodySize: 1024 * 10 // 10KB max for body logging
}

/**
 * 请求关联ID中间件
 * 为每个请求生成唯一ID用于日志跟踪
 */
export async function requestCorrelation(request: FastifyRequest, reply: FastifyReply) {
  // Generate or extract request ID
  const requestId = 
    request.headers['x-request-id'] as string ||
    request.headers['x-correlation-id'] as string ||
    generateRequestId()
  
  // Add request ID to request object
  request.requestId = requestId
  
  // Add request ID to response headers
  reply.header('X-Request-ID', requestId)
  
  // Create request-scoped logger
  const requestLogger = createRequestLogger(requestId)
  
  // Add logger to request context
  ;(request as any).logger = requestLogger
}

/**
 * 请求日志中间件
 */
export function requestLogging(customConfig?: Partial<RequestLoggingConfig>) {
  const loggingConfig = { ...defaultConfig, ...customConfig }
  
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = Date.now()
    const requestLogger = (request as any).logger || logger
    
    // Log incoming request
    if (loggingConfig.enableRequestLogging) {
      const requestData: any = {
        requestId: request.requestId,
        method: request.method,
        url: request.url,
        userAgent: request.headers['user-agent'],
        ip: request.ip,
        userId: request.user?.id,
        headers: sanitizeHeaders(request.headers, loggingConfig.sensitiveFields)
      }
      
      // Optionally log request body
      if (loggingConfig.logRequestBody && request.body) {
        const bodySize = JSON.stringify(request.body).length
        if (bodySize <= loggingConfig.maxBodySize) {
          requestData.body = sanitizeObject(request.body, loggingConfig.sensitiveFields)
        } else {
          requestData.bodySize = bodySize
          requestData.bodyTruncated = true
        }
      }
      
      // Log query parameters
      if (request.query && Object.keys(request.query).length > 0) {
        requestData.query = sanitizeObject(request.query, loggingConfig.sensitiveFields)
      }
      
      requestLogger.info('HTTP Request', requestData, LogCategory.API)
    }
    
    // Add response logging hook
    reply.addHook('onSend', async (request, reply, payload) => {
      const endTime = Date.now()
      const duration = endTime - startTime
      const statusCode = reply.statusCode
      
      // Log response
      if (loggingConfig.enableResponseLogging) {
        const responseData: any = {
          requestId: request.requestId,
          method: request.method,
          url: request.url,
          statusCode,
          duration,
          userId: request.user?.id,
          contentLength: reply.getHeader('content-length') || payload?.length || 0
        }
        
        // Optionally log response body
        if (loggingConfig.logResponseBody && payload) {
          const bodySize = typeof payload === 'string' ? payload.length : JSON.stringify(payload).length
          if (bodySize <= loggingConfig.maxBodySize) {
            try {
              responseData.body = typeof payload === 'string' ? JSON.parse(payload) : payload
            } catch {
              responseData.body = payload.toString().substring(0, 100) + '...'
            }
          } else {
            responseData.bodySize = bodySize
            responseData.bodyTruncated = true
          }
        }
        
        // Log level based on status code
        if (statusCode >= 500) {
          requestLogger.error('HTTP Response - Server Error', undefined, responseData, LogCategory.API)
        } else if (statusCode >= 400) {
          requestLogger.warn('HTTP Response - Client Error', responseData, LogCategory.API)
        } else {
          requestLogger.info('HTTP Response', responseData, LogCategory.API)
        }
      }
      
      // Performance logging
      if (loggingConfig.enablePerformanceLogging) {
        const performanceData = {
          requestId: request.requestId,
          method: request.method,
          url: request.url,
          duration,
          statusCode,
          userId: request.user?.id
        }
        
        // Log slow requests
        if (duration > 1000) { // 1 second threshold
          requestLogger.warn('Slow Request', performanceData, LogCategory.PERFORMANCE)
        } else if (duration > 500) { // 500ms threshold
          requestLogger.info('Performance', performanceData, LogCategory.PERFORMANCE)
        }
      }
      
      return payload
    })
    
    // Add error logging hook
    reply.addHook('onError', async (request, reply, error) => {
      const endTime = Date.now()
      const duration = endTime - startTime
      
      requestLogger.error('HTTP Request Error', error, {
        requestId: request.requestId,
        method: request.method,
        url: request.url,
        duration,
        statusCode: reply.statusCode,
        userId: request.user?.id,
        errorName: error.name,
        errorMessage: error.message
      }, LogCategory.API)
    })
  }
}

/**
 * 安全日志中间件
 * 记录安全相关事件
 */
export async function securityLogging(request: FastifyRequest, reply: FastifyReply) {
  const requestLogger = (request as any).logger || logger
  
  // Log suspicious activities
  const suspiciousPatterns = [
    /\.\./,           // Path traversal attempts
    /<script/i,       // XSS attempts
    /union.*select/i, // SQL injection attempts
    /exec\(/i,        // Code execution attempts
    /eval\(/i         // Code evaluation attempts
  ]
  
  const url = request.url
  const userAgent = request.headers['user-agent'] || ''
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(url) || pattern.test(userAgent)) {
      requestLogger.security('Suspicious Request Pattern', {
        requestId: request.requestId,
        pattern: pattern.source,
        url,
        userAgent,
        ip: request.ip,
        method: request.method
      })
      break
    }
  }
  
  // Log authentication events
  reply.addHook('onSend', async (request, reply, payload) => {
    const statusCode = reply.statusCode
    
    // Log authentication failures
    if (statusCode === 401) {
      requestLogger.security('Authentication Failed', {
        requestId: request.requestId,
        url: request.url,
        ip: request.ip,
        userAgent: request.headers['user-agent']
      })
    }
    
    // Log authorization failures
    if (statusCode === 403) {
      requestLogger.security('Authorization Failed', {
        requestId: request.requestId,
        url: request.url,
        ip: request.ip,
        userId: request.user?.id,
        userAgent: request.headers['user-agent']
      })
    }
    
    return payload
  })
}

/**
 * 清理敏感信息
 */
function sanitizeHeaders(headers: any, sensitiveFields: string[]): any {
  const sanitized = { ...headers }
  
  for (const field of sensitiveFields) {
    const lowerField = field.toLowerCase()
    for (const key in sanitized) {
      if (key.toLowerCase().includes(lowerField)) {
        sanitized[key] = '[REDACTED]'
      }
    }
  }
  
  return sanitized
}

function sanitizeObject(obj: any, sensitiveFields: string[]): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj
  }
  
  const sanitized = Array.isArray(obj) ? [...obj] : { ...obj }
  
  for (const key in sanitized) {
    const lowerKey = key.toLowerCase()
    
    // Check if key contains sensitive field name
    const isSensitive = sensitiveFields.some(field => 
      lowerKey.includes(field.toLowerCase())
    )
    
    if (isSensitive) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeObject(sanitized[key], sensitiveFields)
    }
  }
  
  return sanitized
}

/**
 * 用户行为日志中间件
 * 记录用户的重要操作
 */
export async function userActivityLogging(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user) return
  
  const requestLogger = (request as any).logger || logger
  
  // Define important user actions to log
  const importantActions = [
    'POST',   // Creating resources
    'PUT',    // Updating resources
    'DELETE'  // Deleting resources
  ]
  
  if (importantActions.includes(request.method)) {
    reply.addHook('onSend', async (request, reply, payload) => {
      // Only log successful operations
      if (reply.statusCode < 400) {
        requestLogger.user(request.user!.id, `${request.method} ${request.url}`, {
          requestId: request.requestId,
          statusCode: reply.statusCode,
          url: request.url,
          method: request.method
        })
      }
      
      return payload
    })
  }
}

// 导出中间件组合
export const loggingMiddleware = {
  // 核心日志中间件 - 按顺序应用
  core: [
    requestCorrelation,
    requestLogging(),
    securityLogging,
    userActivityLogging
  ],
  
  // 详细日志中间件 - 用于开发环境
  detailed: [
    requestCorrelation,
    requestLogging({
      logRequestBody: true,
      logResponseBody: true,
      maxBodySize: 1024 * 50 // 50KB for development
    }),
    securityLogging,
    userActivityLogging
  ],
  
  // 最小日志中间件 - 用于生产环境
  minimal: [
    requestCorrelation,
    requestLogging({
      enableResponseLogging: false,
      enablePerformanceLogging: false,
      logRequestBody: false,
      logResponseBody: false
    })
  ]
}

// Export configuration and utilities
export { RequestLoggingConfig, sanitizeHeaders, sanitizeObject }