import { FastifyRequest, FastifyReply, FastifyError } from 'fastify'
import { ZodError } from 'zod'
import { 
  AppError, 
  isAppError, 
  isOperationalError, 
  categorizeError, 
  ErrorSeverity,
  ValidationError
} from './index'
import { logger, LogCategory } from '../utils/logger'
import { config } from '../config'

/**
 * 全局错误处理器
 * 提供统一的错误响应格式和错误记录
 */

// Error response interface
interface ErrorResponse {
  error: {
    statusCode: number
    message: string
    code: string
    timestamp: string
    requestId?: string
    details?: any
    stack?: string
  }
}

/**
 * 主要错误处理函数
 */
export function globalErrorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const requestLogger = (request as any).logger || logger
  const requestId = 'unknown'
  
  // Handle different error types
  let processedError: AppError
  
  if (isAppError(error)) {
    processedError = error
  } else if (error instanceof ZodError) {
    processedError = handleZodError(error)
  } else if (isFastifyError(error)) {
    processedError = handleFastifyError(error)
  } else if (error.name === 'ValidationError') {
    processedError = new ValidationError(error.message)
  } else if (error.name === 'UnauthorizedError') {
    processedError = new AppError('Unauthorized', 401, 'UNAUTHORIZED')
  } else if (error.name === 'ForbiddenError') {
    processedError = new AppError('Forbidden', 403, 'FORBIDDEN')
  } else {
    // Unknown error - treat as internal server error
    processedError = new AppError(
      config.server.nodeEnv === 'production' 
        ? 'Internal server error' 
        : error.message || 'Unknown error',
      500,
      'INTERNAL_ERROR',
      false,
      { originalError: error.name }
    )
  }
  
  // Log the error
  logError(error, processedError, request, requestLogger)
  
  // Send error response
  const errorResponse = createErrorResponse(processedError, requestId)
  
  // Add error tracking headers for debugging
  reply.header('X-Error-Code', processedError.code)
  if (requestId) {
    reply.header('X-Request-ID', requestId)
  }
  
  // Send response
  reply.status(processedError.statusCode).send(errorResponse)
}

/**
 * 处理Zod验证错误
 */
function handleZodError(error: ZodError): ValidationError {
  const details = error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code
  }))
  
  const message = `Validation failed: ${details.map(d => d.field).join(', ')}`
  
  return new ValidationError(message, { details })
}

/**
 * 处理Fastify特定错误
 */
function handleFastifyError(error: FastifyError): AppError {
  const statusCode = error.statusCode || 500
  const code = mapFastifyErrorCode(error)
  
  return new AppError(
    error.message,
    statusCode,
    code,
    true,
    { 
      fastifyCode: error.code,
      validation: error.validation 
    }
  )
}

/**
 * 映射Fastify错误代码
 */
function mapFastifyErrorCode(error: FastifyError): string {
  const codeMap: Record<string, string> = {
    'FST_ERR_VALIDATION': 'VALIDATION_ERROR',
    'FST_ERR_NOT_FOUND': 'NOT_FOUND',
    'FST_ERR_BAD_REQUEST': 'BAD_REQUEST',
    'FST_ERR_UNAUTHORIZED': 'UNAUTHORIZED',
    'FST_ERR_FORBIDDEN': 'FORBIDDEN',
    'FST_ERR_METHOD_NOT_ALLOWED': 'METHOD_NOT_ALLOWED',
    'FST_ERR_REQUEST_TIMEOUT': 'REQUEST_TIMEOUT',
    'FST_ERR_PAYLOAD_TOO_LARGE': 'PAYLOAD_TOO_LARGE',
    'FST_ERR_UNSUPPORTED_MEDIA_TYPE': 'UNSUPPORTED_MEDIA_TYPE',
    'FST_ERR_TOO_MANY_REQUESTS': 'TOO_MANY_REQUESTS'
  }
  
  return codeMap[error.code || ''] || 'FASTIFY_ERROR'
}

/**
 * 检查是否为Fastify错误
 */
function isFastifyError(error: any): error is FastifyError {
  return error && typeof error.statusCode === 'number'
}

/**
 * 记录错误日志
 */
function logError(
  originalError: Error,
  processedError: AppError,
  request: FastifyRequest,
  requestLogger: any
) {
  const errorCategory = categorizeError(processedError)
  const logContext = {
    requestId: 'unknown',
    method: request.method,
    url: request.url,
    statusCode: processedError.statusCode,
    errorCode: processedError.code,
    userId: (request as any).user?.id,
    ip: request.ip,
    userAgent: request.headers['user-agent'],
    severity: errorCategory.severity,
    category: errorCategory.category,
    isOperational: processedError.isOperational,
    context: processedError.context
  }
  
  // Log based on severity
  if (errorCategory.severity === ErrorSeverity.CRITICAL || 
      errorCategory.severity === ErrorSeverity.HIGH) {
    requestLogger.error(
      `${errorCategory.category.toUpperCase()}: ${processedError.message}`,
      originalError,
      logContext,
      LogCategory.API
    )
  } else if (errorCategory.severity === ErrorSeverity.MEDIUM) {
    requestLogger.warn(
      `${errorCategory.category.toUpperCase()}: ${processedError.message}`,
      logContext,
      LogCategory.API
    )
  } else {
    requestLogger.info(
      `${errorCategory.category.toUpperCase()}: ${processedError.message}`,
      logContext,
      LogCategory.API
    )
  }
  
  // Additional alerting for critical errors
  if (errorCategory.shouldAlert) {
    alertCriticalError(processedError, request, logContext)
  }
}

/**
 * 创建错误响应对象
 */
function createErrorResponse(error: AppError, requestId?: string): ErrorResponse {
  const response: ErrorResponse = {
    error: {
      statusCode: error.statusCode,
      message: error.message,
      code: error.code,
      timestamp: new Date().toISOString(),
      requestId
    }
  }
  
  // Add details in development mode
  if (config.server.nodeEnv === 'development') {
    if (error.context) {
      response.error.details = error.context
    }
    
    if (error.stack) {
      response.error.stack = error.stack
    }
  }
  
  return response
}

/**
 * 发送关键错误警报
 */
function alertCriticalError(
  error: AppError,
  request: FastifyRequest,
  context: any
) {
  // In a production environment, this would integrate with
  // alerting systems like Slack, PagerDuty, email, etc.
  
  logger.error('CRITICAL ERROR ALERT', error, {
    ...context,
    metadata: {
      alert: true,
      alertType: 'critical_error',
      alertTime: new Date().toISOString()
    }
  }, LogCategory.SECURITY)
  
  // TODO: Implement actual alerting mechanism
  // Examples:
  // - Send to Slack webhook
  // - Send email notification
  // - Create PagerDuty incident
  // - Write to monitoring system
}

/**
 * 未处理的异常处理器
 */
export function handleUncaughtException(error: Error) {
  logger.error('Uncaught Exception - Shutting down gracefully', error, {
    metadata: {
      alert: true,
      alertType: 'uncaught_exception',
      pid: process.pid,
      uptime: process.uptime()
    }
  }, LogCategory.SERVER)
  
  // Attempt graceful shutdown
  process.exit(1)
}

/**
 * 未处理的Promise拒绝处理器
 */
export function handleUnhandledRejection(reason: any, promise: Promise<any>) {
  logger.error('Unhandled Promise Rejection', reason instanceof Error ? reason : new Error(String(reason)), {
    metadata: {
      alert: true,
      alertType: 'unhandled_rejection',
      reason: reason?.toString(),
      promise: promise?.toString(),
      pid: process.pid,
      uptime: process.uptime()
    }
  }, LogCategory.SERVER)
  
  // In production, you might want to exit the process
  if (config.server.nodeEnv === 'production') {
    setTimeout(() => {
      process.exit(1)
    }, 1000)
  }
}

/**
 * 404处理器
 */
export function notFoundHandler(request: FastifyRequest, reply: FastifyReply) {
  const requestLogger = (request as any).logger || logger
  
  requestLogger.warn('Route not found', {
    requestId: 'unknown',
    method: request.method,
    url: request.url,
    ip: request.ip,
    userAgent: request.headers['user-agent']
  }, LogCategory.API)
  
  const errorResponse: ErrorResponse = {
    error: {
      statusCode: 404,
      message: `Route ${request.method} ${request.url} not found`,
      code: 'ROUTE_NOT_FOUND',
      timestamp: new Date().toISOString(),
      requestId: 'unknown'
    }
  }
  
  reply.status(404).send(errorResponse)
}

/**
 * 健康检查错误处理
 */
export function handleHealthCheckError(error: Error): {
  status: 'unhealthy'
  error: string
  timestamp: string
} {
  logger.error('Health check failed', error, {
    metadata: {
      alert: true,
      alertType: 'health_check_failure'
    }
  }, LogCategory.SERVER)
  
  return {
    status: 'unhealthy',
    error: error.message,
    timestamp: new Date().toISOString()
  }
}

// 错误处理中间件组合
export const errorHandling = {
  // 全局错误处理器
  global: globalErrorHandler,
  
  // 404处理器
  notFound: notFoundHandler,
  
  // 进程级错误处理器设置
  setupProcessHandlers: () => {
    process.on('uncaughtException', handleUncaughtException)
    process.on('unhandledRejection', handleUnhandledRejection)
    
    // 优雅关闭处理
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received - starting graceful shutdown', undefined, {}, LogCategory.SERVER)
    })
    
    process.on('SIGINT', () => {
      logger.info('SIGINT received - starting graceful shutdown', undefined, {}, LogCategory.SERVER)
    })
  }
}

// 导出错误处理工具
export {
  ErrorResponse,
  handleZodError,
  handleFastifyError,
  createErrorResponse,
  categorizeError
}