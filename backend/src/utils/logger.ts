import * as winston from 'winston'
import * as path from 'path'
import { config } from '../config'
import { FastifyRequest } from 'fastify'

/**
 * 结构化日志系统
 * 提供统一的日志接口和格式化
 */

// Log levels
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

// Log categories for better organization
export enum LogCategory {
  SERVER = 'server',
  DATABASE = 'database',
  API = 'api',
  SERVICE = 'service',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  USER = 'user'
}

// Log context interface
export interface LogContext {
  requestId?: string
  userId?: string
  sessionId?: string
  duration?: number
  method?: string
  url?: string
  statusCode?: number
  error?: Error
  metadata?: Record<string, any>
  // 添加更多常用属性
  ip?: string
  email?: string
  ipAddress?: string
  reason?: string
  operationType?: string
  youtubeUrl?: string
  processedCount?: number
  cacheId?: string
  deletedCount?: number
  [key: string]: any // 允许任意属性
}

// Create log formats
const jsonFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info: any) => {
    const logEntry = {
      timestamp: info.timestamp,
      level: info.level,
      category: info.category || 'general',
      message: info.message,
      ...(info.context || {}),
      ...(info.context?.error && {
        error: {
          name: info.context.error.name,
          message: info.context.error.message,
          stack: info.context.error.stack
        }
      })
    }
    return JSON.stringify(logEntry)
  })
)

const prettyFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'HH:mm:ss.SSS'
  }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf((info: any) => {
    const category = info.category ? `[${info.category.toUpperCase()}]` : ''
    const requestId = info.context?.requestId ? `[${info.context.requestId}]` : ''
    let message = `${info.timestamp} ${info.level} ${category}${requestId} ${info.message}`
    
    if (info.context && Object.keys(info.context).length > 0) {
      const contextStr = JSON.stringify(info.context, null, 2)
      message += `\n${contextStr}`
    }
    
    if (info.context?.error?.stack) {
      message += `\n${info.context.error.stack}`
    }
    
    return message
  })
)

// Create transports
const transports: winston.transport[] = []

// Console transport
if (config.logging.enableConsole) {
  transports.push(
    new winston.transports.Console({
      format: config.logging.format === 'json' ? jsonFormat : prettyFormat,
      level: config.logging.level
    })
  )
}

// File transports
if (config.logging.enableFile) {
  // Ensure log directory exists
  const logDir = path.resolve(config.logging.logDirectory)
  
  // General log file
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'app.log'),
      format: jsonFormat,
      level: config.logging.level,
      maxsize: parseSize(config.logging.maxFileSize),
      maxFiles: config.logging.maxFiles,
      tailable: true
    })
  )
  
  // Error log file
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      format: jsonFormat,
      level: 'error',
      maxsize: parseSize(config.logging.maxFileSize),
      maxFiles: config.logging.maxFiles,
      tailable: true
    })
  )
  
  // Performance log file
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'performance.log'),
      format: jsonFormat,
      level: 'info',
      maxsize: parseSize(config.logging.maxFileSize),
      maxFiles: config.logging.maxFiles,
      tailable: true
    })
  )
}

// Create logger instance
const winston_logger = winston.createLogger({
  level: config.logging.level,
  transports,
  exitOnError: false,
  silent: config.server.nodeEnv === 'test'
})

// Utility function to parse size strings like "10M", "1G"
function parseSize(sizeStr: string): number {
  const match = sizeStr.match(/^(\d+)([KMGT]?)B?$/i)
  if (!match) return 10 * 1024 * 1024 // Default 10MB
  
  const size = parseInt(match[1])
  const unit = match[2].toUpperCase()
  
  const multipliers = {
    '': 1,
    'K': 1024,
    'M': 1024 * 1024,
    'G': 1024 * 1024 * 1024,
    'T': 1024 * 1024 * 1024 * 1024
  }
  
  return size * (multipliers[unit as keyof typeof multipliers] || 1)
}

// Logger class with enhanced functionality
class Logger {
  private requestId?: string
  
  constructor(requestId?: string) {
    this.requestId = requestId
  }
  
  private log(level: LogLevel, category: LogCategory, message: string, context?: LogContext) {
    const logContext = {
      ...context,
      requestId: context?.requestId || this.requestId
    }
    
    winston_logger.log({
      level,
      category,
      message,
      context: logContext
    })
  }
  
  // Convenience methods for different log levels - Updated signatures to match usage
  debug(message: string, error?: Error | any, context?: LogContext, category: LogCategory = LogCategory.SERVER) {
    this.log(LogLevel.DEBUG, category, message, {
      ...context,
      error
    })
  }
  
  info(message: string, error?: Error | any, context?: LogContext, category: LogCategory = LogCategory.SERVER) {
    this.log(LogLevel.INFO, category, message, {
      ...context,
      error
    })
  }
  
  warn(message: string, error?: Error | any, context?: LogContext, category: LogCategory = LogCategory.SERVER) {
    this.log(LogLevel.WARN, category, message, {
      ...context,
      error
    })
  }
  
  error(message: string, error?: Error | any, context?: LogContext, category: LogCategory = LogCategory.SERVER) {
    this.log(LogLevel.ERROR, category, message, {
      ...context,
      error
    })
  }
  
  // Specialized logging methods
  request(request: FastifyRequest, duration?: number, statusCode?: number) {
    if (!config.logging.enableRequestLogging) return
    
    this.info('HTTP Request', undefined, {
      metadata: {
        method: request.method,
        url: request.url,
        userAgent: request.headers['user-agent'],
        ip: request.ip,
        duration,
        statusCode
      }
    }, LogCategory.API)
  }
  
  database(operation: string, table?: string, duration?: number, error?: Error) {
    const context: LogContext = {
      metadata: {
        operation,
        table,
        duration
      }
    }
    
    if (error) {
      this.error(`Database operation failed: ${operation}`, error, context, LogCategory.DATABASE)
    } else {
      this.info(`Database operation: ${operation}`, undefined, context, LogCategory.DATABASE)
    }
  }
  
  service(service: string, method: string, duration?: number, metadata?: Record<string, any>) {
    this.info(`Service call: ${service}.${method}`, undefined, {
      metadata: {
        service,
        method,
        duration,
        ...metadata
      }
    }, LogCategory.SERVICE)
  }
  
  performance(operation: string, duration: number, metadata?: Record<string, any>) {
    this.info(`Performance: ${operation}`, undefined, {
      metadata: {
        duration,
        ...metadata
      }
    }, LogCategory.PERFORMANCE)
  }
  
  security(event: string, details: Record<string, any>) {
    this.warn(`Security event: ${event}`, undefined, {
      metadata: details
    }, LogCategory.SECURITY)
  }
  
  user(userId: string, action: string, metadata?: Record<string, any>) {
    this.info(`User action: ${action}`, undefined, {
      userId,
      metadata
    }, LogCategory.USER)
  }
  
  // Create child logger with context
  child(context: LogContext): Logger {
    const childLogger = new Logger(context.requestId || this.requestId)
    return childLogger
  }
}

// Create default logger instance
export const logger = new Logger()

// Request correlation middleware helper
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Logger factory for creating request-scoped loggers
export function createRequestLogger(requestId: string): Logger {
  return new Logger(requestId)
}

// Performance monitoring helper
export function withPerformanceLogging<T>(
  operation: string,
  fn: () => Promise<T> | T,
  logger?: Logger
): Promise<T> {
  const start = Date.now()
  const log = logger || new Logger()
  
  try {
    const result = fn()
    
    if (result instanceof Promise) {
      return result.then(res => {
        const duration = Date.now() - start
        log.performance(operation, duration)
        return res
      }).catch(error => {
        const duration = Date.now() - start
        log.error(`Performance tracked operation failed: ${operation}`, error, { duration })
        throw error
      })
    } else {
      const duration = Date.now() - start
      log.performance(operation, duration)
      return Promise.resolve(result)
    }
  } catch (error) {
    const duration = Date.now() - start
    log.error(`Performance tracked operation failed: ${operation}`, error as Error, { duration })
    throw error
  }
}

// Error context helper
export function captureErrorContext(error: Error, additionalContext?: Record<string, any>) {
  return {
    error: {
      name: error.name,
      message: error.message,
      stack: config.logging.enableErrorDetails ? error.stack : undefined
    },
    ...additionalContext
  }
}

// Export the Logger class for custom instances
export { Logger }

// Default export
export default logger