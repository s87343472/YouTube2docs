import { FastifyRequest, FastifyReply } from 'fastify'
import { logger, createRequestLogger, generateRequestId, LogCategory, LogContext } from '../utils/logger'
import { config } from '../config'

/**
 * 请求日志中间件配置
 */
interface LoggingConfig {
  enableRequestLogging: boolean
  enableResponseLogging: boolean
  enablePerformanceLogging: boolean
  logRequestBody: boolean
  logResponseBody: boolean
  maxBodySize: number
  sensitiveHeaders: string[]
}

const loggingConfig: LoggingConfig = {
  enableRequestLogging: config.logging.enableRequestLogging || true,
  enableResponseLogging: config.logging.enableResponseLogging || true,
  enablePerformanceLogging: config.logging.enablePerformanceLogging || true,
  logRequestBody: config.logging.logRequestBody || false,
  logResponseBody: config.logging.logResponseBody || false,
  maxBodySize: config.logging.maxBodySize || 1024,
  sensitiveHeaders: ['authorization', 'cookie', 'x-api-key', 'x-auth-token']
}

/**
 * 请求日志中间件
 * 记录所有HTTP请求和响应
 */
export async function requestLogging(request: FastifyRequest, reply: FastifyReply) {
  const startTime = Date.now()
  const requestId = request.requestId || generateRequestId()
  const requestLogger = createRequestLogger(requestId)
  
  // Store timing and logger for later use
  ;(request as any).startTime = startTime
  ;(request as any).logger = requestLogger
  ;(request as any).requestId = requestId
  
  // Log incoming request
  if (loggingConfig.enableRequestLogging) {
    const requestData: LogContext = {
      requestId,
      method: request.method,
      url: request.url,
      ip: request.ip,
      userAgent: request.headers['user-agent'] as string,
      userId: (request as any).user?.id,
      headers: sanitizeHeaders(request.headers)
    }
    
    // Optionally log request body
    if (loggingConfig.logRequestBody && request.body) {
      const bodySize = JSON.stringify(request.body).length
      if (bodySize <= loggingConfig.maxBodySize) {
        requestData.body = request.body
      } else {
        requestData.bodySize = bodySize
        requestData.bodyTruncated = true
      }
    }
    
    requestLogger.info('HTTP Request', undefined, requestData)
  }
}

/**
 * 清理敏感头信息
 */
function sanitizeHeaders(headers: Record<string, any>): Record<string, any> {
  const sanitized = { ...headers }
  
  for (const sensitiveHeader of loggingConfig.sensitiveHeaders) {
    if (sanitized[sensitiveHeader]) {
      sanitized[sensitiveHeader] = '[REDACTED]'
    }
    if (sanitized[sensitiveHeader.toLowerCase()]) {
      sanitized[sensitiveHeader.toLowerCase()] = '[REDACTED]'
    }
  }
  
  return sanitized
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
    /javascript:/i,   // JavaScript injection
    /data:.*base64/i  // Data URI attempts
  ]
  
  const url = request.url
  const userAgent = request.headers['user-agent'] as string || ''
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(url) || pattern.test(userAgent)) {
      requestLogger.security('Suspicious request detected', {
        requestId: request.requestId,
        pattern: pattern.toString(),
        url,
        userAgent,
        ip: request.ip,
        userId: (request as any).user?.id
      })
      break
    }
  }
  
  // Log failed authentication attempts
  if (request.url.includes('/auth/') && request.method === 'POST') {
    requestLogger.security('Authentication attempt', {
      requestId: request.requestId,
      url: request.url,
      ip: request.ip,
      userAgent
    })
  }
}

/**
 * 用户行为日志中间件
 * 记录用户的重要操作
 */
export async function userActivityLogging(request: FastifyRequest, reply: FastifyReply) {
  if (!(request as any).user) return
  
  const requestLogger = (request as any).logger || logger
  
  // Define important user actions to log
  const importantActions = [
    'POST',   // Creating resources
    'PUT',    // Updating resources
    'DELETE'  // Deleting resources
  ]
  
  if (importantActions.includes(request.method)) {
    // Store user action for later logging
    ;(request as any).logUserAction = true
  }
}

/**
 * Database operation logging
 * Log database queries and performance
 */
export function logDatabaseOperation(
  operation: string,
  table?: string,
  duration?: number,
  error?: Error,
  requestId?: string
) {
  const requestLogger = requestId ? createRequestLogger(requestId) : logger
  
  const context: LogContext = {
    operation,
    table,
    duration,
    requestId
  }
  
  if (error) {
    requestLogger.error(`Database operation failed: ${operation}`, error, context)
  } else {
    if (duration && duration > 1000) {
      requestLogger.warn(`Slow database operation: ${operation}`, undefined, context)
    } else {
      requestLogger.info(`Database operation: ${operation}`, undefined, context)
    }
  }
}

/**
 * Service call logging
 * Log external service calls and API requests
 */
export function logServiceCall(
  service: string,
  method: string,
  duration?: number,
  success: boolean = true,
  error?: Error,
  requestId?: string
) {
  const requestLogger = requestId ? createRequestLogger(requestId) : logger
  
  const context: LogContext = {
    service,
    method,
    duration,
    success,
    requestId
  }
  
  if (!success && error) {
    requestLogger.error(`Service call failed: ${service}.${method}`, error, context)
  } else {
    if (duration && duration > 5000) { // 5 second threshold for external services
      requestLogger.warn(`Slow service call: ${service}.${method}`, undefined, context)
    } else {
      requestLogger.info(`Service call: ${service}.${method}`, undefined, context)
    }
  }
}

/**
 * Error context capture
 * Capture additional context when errors occur
 */
export function captureRequestErrorContext(request: FastifyRequest, error: Error) {
  const requestLogger = (request as any).logger || logger
  
  const errorContext: LogContext = {
    requestId: (request as any).requestId,
    method: request.method,
    url: request.url,
    userAgent: request.headers['user-agent'] as string,
    ip: request.ip,
    userId: (request as any).user?.id,
    body: request.body,
    query: request.query,
    params: request.params,
    headers: sanitizeHeaders(request.headers)
  }
  
  requestLogger.error('Request processing error', error, errorContext)
  
  return errorContext
}

/**
 * Log response completion
 * Should be called after response is sent
 */
export function logResponseCompletion(request: FastifyRequest, reply: FastifyReply) {
  const startTime = (request as any).startTime
  const requestLogger = (request as any).logger || logger
  
  if (!startTime) return
  
  const endTime = Date.now()
  const duration = endTime - startTime
  const statusCode = reply.statusCode
  
  // Log response
  if (loggingConfig.enableResponseLogging) {
    const responseData: LogContext = {
      requestId: (request as any).requestId,
      method: request.method,
      url: request.url,
      statusCode,
      duration,
      userId: (request as any).user?.id
    }
    
    // Log level based on status code
    if (statusCode >= 500) {
      requestLogger.error('HTTP Response - Server Error', undefined, responseData)
    } else if (statusCode >= 400) {
      requestLogger.warn('HTTP Response - Client Error', undefined, responseData)
    } else {
      requestLogger.info('HTTP Response', undefined, responseData)
    }
  }
  
  // Performance logging
  if (loggingConfig.enablePerformanceLogging) {
    const performanceData: LogContext = {
      requestId: (request as any).requestId,
      method: request.method,
      url: request.url,
      duration,
      statusCode,
      userId: (request as any).user?.id
    }
    
    // Log slow requests
    if (duration > 1000) { // 1 second threshold
      requestLogger.warn('Slow Request', undefined, performanceData)
    } else if (duration > 500) { // 500ms threshold
      requestLogger.info('Performance', undefined, performanceData)
    }
  }
  
  // Log user actions
  if ((request as any).logUserAction && statusCode < 400) {
    requestLogger.user((request as any).user.id, `${request.method} ${request.url}`, {
      requestId: (request as any).requestId,
      statusCode: reply.statusCode,
      url: request.url,
      method: request.method
    })
  }
}