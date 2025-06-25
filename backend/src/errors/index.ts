/**
 * 自定义错误类和错误处理系统
 * 提供统一的错误分类和处理机制
 */

// Base error interface
export interface AppErrorInterface {
  name: string
  message: string
  statusCode: number
  code: string
  isOperational: boolean
  context?: Record<string, any>
  stack?: string
}

// Base application error class
export class AppError extends Error implements AppErrorInterface {
  public readonly statusCode: number
  public readonly code: string
  public readonly isOperational: boolean
  public readonly context?: Record<string, any>

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true,
    context?: Record<string, any>
  ) {
    super(message)
    
    this.name = this.constructor.name
    this.statusCode = statusCode
    this.code = code
    this.isOperational = isOperational
    this.context = context

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor)
  }

  // Convert error to JSON for API responses
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      code: this.code,
      context: this.context
    }
  }
}

// Specific error types
export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 400, 'VALIDATION_ERROR', true, context)
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = '认证失败', context?: Record<string, any>) {
    super(message, 401, 'AUTHENTICATION_ERROR', true, context)
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = '权限不足', context?: Record<string, any>) {
    super(message, 403, 'AUTHORIZATION_ERROR', true, context)
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = '资源未找到', context?: Record<string, any>) {
    super(message, 404, 'NOT_FOUND_ERROR', true, context)
  }
}

export class ConflictError extends AppError {
  constructor(message: string = '资源冲突', context?: Record<string, any>) {
    super(message, 409, 'CONFLICT_ERROR', true, context)
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = '请求过于频繁', context?: Record<string, any>) {
    super(message, 429, 'RATE_LIMIT_ERROR', true, context)
  }
}

export class ExternalServiceError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 502, 'EXTERNAL_SERVICE_ERROR', true, context)
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 500, 'DATABASE_ERROR', false, context)
  }
}

export class ConfigurationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 500, 'CONFIGURATION_ERROR', false, context)
  }
}

export class BusinessLogicError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 400, 'BUSINESS_LOGIC_ERROR', true, context)
  }
}

export class FileProcessingError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 500, 'FILE_PROCESSING_ERROR', true, context)
  }
}

export class APIError extends AppError {
  constructor(message: string, statusCode: number = 500, context?: Record<string, any>) {
    super(message, statusCode, 'API_ERROR', true, context)
  }
}

// Service-specific errors
export class YouTubeServiceError extends ExternalServiceError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, context)
    this.name = 'YouTubeServiceError'
  }
}

export class TranscriptionServiceError extends ExternalServiceError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, context)
    this.name = 'TranscriptionServiceError'
  }
}

export class ContentAnalysisError extends ExternalServiceError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, context)
    this.name = 'ContentAnalysisError'
  }
}

export class AudioProcessingError extends FileProcessingError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, context)
    this.name = 'AudioProcessingError'
  }
}

export class VideoProcessingError extends FileProcessingError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, context)
    this.name = 'VideoProcessingError'
  }
}

export class ShareServiceError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 500, 'SHARE_SERVICE_ERROR', true, context)
  }
}

// Error classification
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium', 
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ErrorClassification {
  severity: ErrorSeverity
  category: string
  shouldAlert: boolean
}

// Helper functions
export function isAppError(error: any): error is AppError {
  return error instanceof AppError
}

export function isOperationalError(error: any): boolean {
  if (isAppError(error)) {
    return error.isOperational
  }
  return false
}

export function categorizeError(error: Error): ErrorClassification {
  return classifyError(error)
}

export function classifyError(error: Error): ErrorClassification {
  if (isAppError(error)) {
    const statusCode = error.statusCode
    
    if (statusCode >= 500) {
      return {
        severity: ErrorSeverity.HIGH,
        category: 'server_error',
        shouldAlert: true
      }
    } else if (statusCode >= 400) {
      return {
        severity: ErrorSeverity.MEDIUM,
        category: 'client_error',
        shouldAlert: false
      }
    }
  }
  
  // Unknown errors are treated as critical
  return {
    severity: ErrorSeverity.CRITICAL,
    category: 'unknown_error',
    shouldAlert: true
  }
}