import { FastifyRequest, FastifyReply } from 'fastify'
import { z, ZodError, ZodSchema } from 'zod'
import { logger, LogCategory } from '../utils/logger'

/**
 * 请求验证中间件
 * 提供统一的输入验证和错误处理
 */

// Validation error response interface
interface ValidationErrorResponse {
  error: {
    statusCode: number
    message: string
    code: string
    details: Array<{
      field: string
      message: string
      value?: any
    }>
  }
}

/**
 * 通用验证中间件工厂
 */
export function validateRequest<
  TBody = unknown,
  TQuery = unknown,
  TParams = unknown,
  THeaders = unknown
>(schemas: {
  body?: ZodSchema<TBody>
  query?: ZodSchema<TQuery>
  params?: ZodSchema<TParams>
  headers?: ZodSchema<THeaders>
}) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Validate request body
      if (schemas.body) {
        const result = schemas.body.safeParse(request.body)
        if (!result.success) {
          return handleValidationError(reply, result.error, 'body')
        }
        // Replace request body with validated and potentially transformed data
        request.body = result.data
      }

      // Validate query parameters
      if (schemas.query) {
        const result = schemas.query.safeParse(request.query)
        if (!result.success) {
          return handleValidationError(reply, result.error, 'query')
        }
        request.query = result.data
      }

      // Validate URL parameters
      if (schemas.params) {
        const result = schemas.params.safeParse(request.params)
        if (!result.success) {
          return handleValidationError(reply, result.error, 'params')
        }
        request.params = result.data
      }

      // Validate headers
      if (schemas.headers) {
        const result = schemas.headers.safeParse(request.headers)
        if (!result.success) {
          return handleValidationError(reply, result.error, 'headers')
        }
        // Note: We don't replace headers as they are read-only
      }

      logger.debug('Request validation passed', undefined, {
        metadata: {
          method: request.method,
          url: request.url
        }
      }, LogCategory.API)

    } catch (error) {
      logger.error('Validation middleware error', error as Error, {
        metadata: {
          method: request.method,
          url: request.url
        }
      }, LogCategory.API)

      return reply.code(500).send({
        error: {
          statusCode: 500,
          message: 'Internal validation error',
          code: 'VALIDATION_ERROR'
        }
      })
    }
  }
}

/**
 * 处理验证错误
 */
function handleValidationError(
  reply: FastifyReply,
  error: ZodError,
  source: string
): void {
  const details = error.errors.map(err => ({
    field: `${source}.${err.path.join('.')}`,
    message: err.message,
    value: undefined // Remove input access as it's not available in ZodIssue
  }))

  logger.warn('Request validation failed', undefined, {
    metadata: {
      source,
      errors: details.map(d => ({ field: d.field, message: d.message }))
    }
  }, LogCategory.API)

  const response: ValidationErrorResponse = {
    error: {
      statusCode: 400,
      message: `Validation failed for ${source}`,
      code: 'VALIDATION_FAILED',
      details
    }
  }

  reply.code(400).send(response)
}

/**
 * 获取嵌套对象的值
 */
function getNestedValue(obj: any, path: (string | number)[]): any {
  return path.reduce((current, key) => current?.[key], obj)
}

// 常用的验证模式
export const commonSchemas = {
  // 分页参数
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).optional()
  }),

  // 排序参数
  sorting: z.object({
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
  }),

  // ID参数
  idParam: z.object({
    id: z.string().min(1, 'ID is required')
  }),

  // UUID参数
  uuidParam: z.object({
    id: z.string().uuid('Invalid UUID format')
  }),

  // 分享ID参数
  shareIdParam: z.object({
    shareId: z.string().regex(/^[a-z0-9]{10}$/, 'Invalid share ID format')
  }),

  // YouTube URL验证
  youtubeUrl: z.string().refine(
    (url) => {
      const patterns = [
        /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/,
        /^https?:\/\/youtu\.be\/[\w-]+/,
        /^https?:\/\/(www\.)?youtube\.com\/embed\/[\w-]+/
      ]
      return patterns.some(pattern => pattern.test(url))
    },
    'Invalid YouTube URL format'
  ),

  // 文件上传验证
  fileUpload: z.object({
    mimetype: z.string(),
    filename: z.string(),
    encoding: z.string(),
    file: z.any()
  }),

  // 通用文本字段
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  tags: z.array(z.string().min(1).max(50)).max(10, 'Too many tags').optional(),

  // 用户相关
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),

  // 布尔值
  isPublic: z.boolean().default(true),
  isActive: z.boolean().default(true)
}

// 常用的验证中间件组合
export const validators = {
  // 分页验证
  pagination: validateRequest({
    query: commonSchemas.pagination
  }),

  // 分页和排序验证
  paginationWithSorting: validateRequest({
    query: commonSchemas.pagination.merge(commonSchemas.sorting)
  }),

  // ID参数验证
  idParam: validateRequest({
    params: commonSchemas.idParam
  }),

  // UUID参数验证
  uuidParam: validateRequest({
    params: commonSchemas.uuidParam
  }),

  // 分享ID参数验证
  shareIdParam: validateRequest({
    params: commonSchemas.shareIdParam
  }),

  // YouTube URL验证
  youtubeUrl: validateRequest({
    body: z.object({
      url: commonSchemas.youtubeUrl
    })
  }),

  // 分享创建验证
  createShare: validateRequest({
    body: z.object({
      videoProcessId: z.string().min(1, 'Video process ID is required'),
      title: commonSchemas.title,
      description: commonSchemas.description,
      tags: commonSchemas.tags,
      isPublic: commonSchemas.isPublic
    })
  }),

  // 分享更新验证
  updateShare: validateRequest({
    params: commonSchemas.shareIdParam,
    body: z.object({
      title: commonSchemas.title.optional(),
      description: commonSchemas.description,
      tags: commonSchemas.tags,
      isPublic: commonSchemas.isPublic.optional()
    }).refine(
      data => Object.values(data).some(value => value !== undefined),
      'At least one field must be provided for update'
    )
  })
}

/**
 * 文件上传验证中间件
 */
export function validateFileUpload(options: {
  allowedMimeTypes?: string[]
  maxFileSize?: number
  required?: boolean
}) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const files = await request.saveRequestFiles()
      
      if (options.required && files.length === 0) {
        logger.warn('File upload required but none provided', undefined, {
          metadata: {
            url: request.url
          }
        }, LogCategory.API)

        return reply.code(400).send({
          error: {
            statusCode: 400,
            message: 'File upload is required',
            code: 'FILE_REQUIRED'
          }
        })
      }

      for (const file of files) {
        // Check MIME type
        if (options.allowedMimeTypes && !options.allowedMimeTypes.includes(file.mimetype)) {
          logger.warn('Invalid file type uploaded', undefined, {
            metadata: {
              filename: file.filename,
              mimetype: file.mimetype,
              allowedTypes: options.allowedMimeTypes
            }
          }, LogCategory.API)

          return reply.code(400).send({
            error: {
              statusCode: 400,
              message: `Invalid file type. Allowed types: ${options.allowedMimeTypes.join(', ')}`,
              code: 'INVALID_FILE_TYPE'
            }
          })
        }

        // Check file size
        if (options.maxFileSize && file.file.bytesRead > options.maxFileSize) {
          logger.warn('File size exceeds limit', undefined, {
            metadata: {
              filename: file.filename,
              size: file.file.bytesRead,
              maxSize: options.maxFileSize
            }
          }, LogCategory.API)

          return reply.code(400).send({
            error: {
              statusCode: 400,
              message: `File size exceeds limit of ${options.maxFileSize} bytes`,
              code: 'FILE_TOO_LARGE'
            }
          })
        }
      }

      logger.debug('File upload validation passed', undefined, {
        metadata: {
          fileCount: files.length,
          files: files.map(f => ({ filename: f.filename, mimetype: f.mimetype, size: f.file.bytesRead }))
        }
      }, LogCategory.API)

    } catch (error) {
      logger.error('File upload validation error', error as Error, {
      }, LogCategory.API)

      return reply.code(500).send({
        error: {
          statusCode: 500,
          message: 'File upload validation failed',
          code: 'FILE_VALIDATION_ERROR'
        }
      })
    }
  }
}

// 导出所有验证相关功能
export {
  handleValidationError,
  ValidationErrorResponse
}