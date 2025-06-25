import * as dotenv from 'dotenv'
import { z } from 'zod'

// Load environment variables
dotenv.config()

/**
 * 集中化配置管理系统
 * 提供类型安全的配置访问和验证
 */

// Configuration schemas with validation
const ServerConfigSchema = z.object({
  port: z.number().int().min(1).max(65535).default(3000),
  host: z.string().default('localhost'),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  corsOrigin: z.string().default('http://localhost:5173'),
  maxFileSize: z.number().int().positive().default(104857600), // 100MB
  uploadPath: z.string().default('./uploads'),
  tempPath: z.string().default('./temp')
})

const DatabaseConfigSchema = z.object({
  // PostgreSQL
  postgresql: z.object({
    host: z.string().default('localhost'),
    port: z.number().int().min(1).max(65535).default(5432),
    database: z.string().min(1),
    username: z.string().min(1),
    password: z.string().default(''),
    maxConnections: z.number().int().positive().default(20),
    connectionTimeout: z.number().int().positive().default(30000),
    ssl: z.boolean().default(false)
  }),
  
  // Redis
  redis: z.object({
    host: z.string().default('localhost'),
    port: z.number().int().min(1).max(65535).default(6379),
    password: z.string().optional(),
    db: z.number().int().min(0).default(0),
    maxRetriesPerRequest: z.number().int().positive().default(3),
    retryDelayOnFailover: z.number().int().positive().default(100)
  })
})

const APIConfigSchema = z.object({
  groq: z.object({
    apiKey: z.string().min(1),
    model: z.string().default('whisper-large-v3-turbo'),
    maxRetries: z.number().int().positive().default(3),
    timeout: z.number().int().positive().default(60000)
  }),
  
  gemini: z.object({
    apiKey: z.string().min(1),
    model: z.string().default('gemini-2.0-flash-exp'),
    maxRetries: z.number().int().positive().default(3),
    timeout: z.number().int().positive().default(30000),
    maxTokens: z.number().int().positive().default(8192)
  }),
  
  youtube: z.object({
    ytDlpPath: z.string().default('yt-dlp'),
    maxDuration: z.number().int().positive().default(3600), // 1 hour
    outputFormat: z.string().default('%(title)s.%(ext)s'),
    audioFormat: z.string().default('wav'),
    audioQuality: z.string().default('best')
  })
})

const LoggingConfigSchema = z.object({
  level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  format: z.enum(['json', 'pretty']).default('json'),
  enableConsole: z.boolean().default(true),
  enableFile: z.boolean().default(true),
  logDirectory: z.string().default('./logs'),
  maxFileSize: z.string().default('10M'),
  maxFiles: z.number().int().positive().default(10),
  enableRequestLogging: z.boolean().default(true),
  enableErrorDetails: z.boolean().default(true)
})

const MonitoringConfigSchema = z.object({
  enableMetrics: z.boolean().default(true),
  enableHealthChecks: z.boolean().default(true),
  healthCheckInterval: z.number().int().positive().default(30000), // 30 seconds
  metricsPrefix: z.string().default('youtube_learning_'),
  enablePerformanceMonitoring: z.boolean().default(true)
})

const SecurityConfigSchema = z.object({
  enableRateLimit: z.boolean().default(true),
  rateLimitWindow: z.number().int().positive().default(900000), // 15 minutes
  rateLimitMax: z.number().int().positive().default(100), // requests per window
  enableCors: z.boolean().default(true),
  enableHelmet: z.boolean().default(true),
  jwtSecret: z.string().min(32).optional(),
  jwtExpiresIn: z.string().default('7d')
})

// Combined configuration schema
const ConfigSchema = z.object({
  server: ServerConfigSchema,
  database: DatabaseConfigSchema,
  apis: APIConfigSchema,
  logging: LoggingConfigSchema,
  monitoring: MonitoringConfigSchema,
  security: SecurityConfigSchema
})

// Parse and validate configuration
function parseConfig() {
  const rawConfig = {
    server: {
      port: parseInt(process.env.PORT || '3000'),
      host: process.env.HOST || 'localhost',
      nodeEnv: process.env.NODE_ENV || 'development',
      corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600'),
      uploadPath: process.env.UPLOAD_PATH || './uploads',
      tempPath: process.env.TEMP_PATH || './temp'
    },
    
    database: {
      postgresql: {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || '5432'),
        database: process.env.POSTGRES_DB || '',
        username: process.env.POSTGRES_USER || '',
        password: process.env.POSTGRES_PASSWORD || '',
        maxConnections: parseInt(process.env.POSTGRES_MAX_CONNECTIONS || '20'),
        connectionTimeout: parseInt(process.env.POSTGRES_CONNECTION_TIMEOUT || '30000'),
        ssl: process.env.POSTGRES_SSL === 'true'
      },
      
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0'),
        maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3'),
        retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY || '100')
      }
    },
    
    apis: {
      groq: {
        apiKey: process.env.GROQ_API_KEY || '',
        model: process.env.GROQ_MODEL || 'whisper-large-v3-turbo',
        maxRetries: parseInt(process.env.GROQ_MAX_RETRIES || '3'),
        timeout: parseInt(process.env.GROQ_TIMEOUT || '60000')
      },
      
      gemini: {
        apiKey: process.env.GEMINI_API_KEY || '',
        model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp',
        maxRetries: parseInt(process.env.GEMINI_MAX_RETRIES || '3'),
        timeout: parseInt(process.env.GEMINI_TIMEOUT || '30000'),
        maxTokens: parseInt(process.env.GEMINI_MAX_TOKENS || '8192')
      },
      
      youtube: {
        ytDlpPath: process.env.YT_DLP_PATH || 'yt-dlp',
        maxDuration: parseInt(process.env.YT_MAX_DURATION || '3600'),
        outputFormat: process.env.YT_OUTPUT_FORMAT || '%(title)s.%(ext)s',
        audioFormat: process.env.YT_AUDIO_FORMAT || 'wav',
        audioQuality: process.env.YT_AUDIO_QUALITY || 'best'
      }
    },
    
    logging: {
      level: process.env.LOG_LEVEL || 'info',
      format: process.env.LOG_FORMAT || 'json',
      enableConsole: process.env.LOG_ENABLE_CONSOLE !== 'false',
      enableFile: process.env.LOG_ENABLE_FILE !== 'false',
      logDirectory: process.env.LOG_DIRECTORY || './logs',
      maxFileSize: process.env.LOG_MAX_FILE_SIZE || '10M',
      maxFiles: parseInt(process.env.LOG_MAX_FILES || '10'),
      enableRequestLogging: process.env.LOG_ENABLE_REQUEST !== 'false',
      enableErrorDetails: process.env.LOG_ENABLE_ERROR_DETAILS !== 'false'
    },
    
    monitoring: {
      enableMetrics: process.env.MONITORING_ENABLE_METRICS !== 'false',
      enableHealthChecks: process.env.MONITORING_ENABLE_HEALTH_CHECKS !== 'false',
      healthCheckInterval: parseInt(process.env.MONITORING_HEALTH_CHECK_INTERVAL || '30000'),
      metricsPrefix: process.env.MONITORING_METRICS_PREFIX || 'youtube_learning_',
      enablePerformanceMonitoring: process.env.MONITORING_ENABLE_PERFORMANCE !== 'false'
    },
    
    security: {
      enableRateLimit: process.env.SECURITY_ENABLE_RATE_LIMIT !== 'false',
      rateLimitWindow: parseInt(process.env.SECURITY_RATE_LIMIT_WINDOW || '900000'),
      rateLimitMax: parseInt(process.env.SECURITY_RATE_LIMIT_MAX || '100'),
      enableCors: process.env.SECURITY_ENABLE_CORS !== 'false',
      enableHelmet: process.env.SECURITY_ENABLE_HELMET !== 'false',
      jwtSecret: process.env.JWT_SECRET,
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d'
    }
  }

  try {
    return ConfigSchema.parse(rawConfig)
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Configuration validation failed:')
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`)
      })
      process.exit(1)
    }
    throw error
  }
}

// Export validated configuration
export const config = parseConfig()

// Export types
export type AppConfig = z.infer<typeof ConfigSchema>
export type ServerConfig = z.infer<typeof ServerConfigSchema>
export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>
export type APIConfig = z.infer<typeof APIConfigSchema>
export type LoggingConfig = z.infer<typeof LoggingConfigSchema>
export type MonitoringConfig = z.infer<typeof MonitoringConfigSchema>
export type SecurityConfig = z.infer<typeof SecurityConfigSchema>

// Configuration utilities
export const isDevelopment = () => config.server.nodeEnv === 'development'
export const isProduction = () => config.server.nodeEnv === 'production'
export const isTest = () => config.server.nodeEnv === 'test'

// Configuration validation helper
export const validateConfig = () => {
  console.log('🔧 Validating configuration...')
  
  // Check required environment variables
  const requiredVars = [
    'POSTGRES_DB',
    'POSTGRES_USER', 
    'POSTGRES_PASSWORD',
    'GROQ_API_KEY',
    'GEMINI_API_KEY'
  ]
  
  const missing = requiredVars.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:')
    missing.forEach(key => console.error(`  - ${key}`))
    process.exit(1)
  }
  
  console.log('✅ Configuration validation passed')
  
  // Log configuration summary (without sensitive data)
  console.log('📋 Configuration Summary:')
  console.log(`  - Environment: ${config.server.nodeEnv}`)
  console.log(`  - Server: ${config.server.host}:${config.server.port}`)
  console.log(`  - Database: ${config.database.postgresql.host}:${config.database.postgresql.port}`)
  console.log(`  - Redis: ${config.database.redis.host}:${config.database.redis.port}`)
  console.log(`  - Logging: ${config.logging.level} (${config.logging.format})`)
  console.log(`  - Rate Limiting: ${config.security.enableRateLimit ? 'enabled' : 'disabled'}`)
}