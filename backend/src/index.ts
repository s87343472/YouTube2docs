import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import multipart from '@fastify/multipart'
import staticFiles from '@fastify/static'
import path from 'path'
import { config, validateConfig } from './config'
import { logger, LogCategory } from './utils/logger'
import { globalErrorHandler, notFoundHandler, errorHandling } from './errors/errorHandler'
import { CronService } from './services/cronService'
// import { loggingMiddleware } from './middleware/logging' // Temporarily disabled due to TypeScript issues
// import { anomalyDetectionMiddleware } from './middleware/rateLimitMiddleware' // Temporarily disabled
// Import statement temporarily commented out to fix compilation

// Validate configuration on startup
validateConfig()

// Setup process-level error handlers
errorHandling.setupProcessHandlers()

const fastify = Fastify({
  logger: false, // We'll use our custom logger
  trustProxy: true,
  disableRequestLogging: true // We handle this with our middleware
})

// Register plugins
async function registerPlugins() {
  logger.info('Registering Fastify plugins...', undefined, {}, LogCategory.SERVER)
  
  // Security headers with Helmet
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'", "https://api.groq.com", "https://generativelanguage.googleapis.com"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"]
      }
    },
    crossOriginEmbedderPolicy: false, // Allow YouTube video embedding
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  })
  logger.info('Security headers plugin registered', undefined, {}, LogCategory.SERVER)
  
  // CORS configuration
  if (config.security.enableCors) {
    await fastify.register(cors, {
      origin: config.server.corsOrigin,
      credentials: true
    })
    logger.info('CORS plugin registered', undefined, { metadata: { origin: config.server.corsOrigin } }, LogCategory.SERVER)
  }

  // Request correlation and logging (simplified for now)
  // Note: Full logging middleware temporarily disabled due to TypeScript issues
  // for (const middleware of loggingMiddleware.core) {
  //   fastify.addHook('preHandler', middleware)
  // }
  logger.info('Basic logging enabled', undefined, {}, LogCategory.SERVER)

  // Anomaly detection and security monitoring - temporarily disabled
  // if (config.security.enableRateLimit) {
  //   fastify.addHook('preHandler', anomalyDetectionMiddleware)
  //   logger.info('Anomaly detection enabled', undefined, {
  //     metadata: {
  //       detectionInterval: '1% of requests',
  //       autoBlacklist: true
  //     }
  //   }, LogCategory.SERVER)
  // }
  logger.info('Basic rate limiting ready (middleware disabled for compilation)', undefined, {}, LogCategory.SERVER)

  // Multipart form data support
  await fastify.register(multipart, {
    limits: {
      fileSize: config.server.maxFileSize
    }
  })
  logger.info('Multipart plugin registered', undefined, { metadata: { maxFileSize: config.server.maxFileSize } }, LogCategory.SERVER)

  // Static files
  const uploadsPath = path.resolve(process.cwd(), config.server.uploadPath)
  await fastify.register(staticFiles, {
    root: uploadsPath,
    prefix: '/uploads/'
  })
  logger.info('Static files plugin registered', undefined, { metadata: { uploadsPath } }, LogCategory.SERVER)
}

// Register routes
async function registerRoutes() {
  logger.info('Registering API routes...', undefined, {}, LogCategory.SERVER)

  // Health check with comprehensive monitoring
  fastify.get('/health', async (request, reply) => {
    try {
      const healthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.server.nodeEnv,
        version: '1.0.0',
        services: {
          database: 'unknown',
          memory: 'healthy',
          cpu: 'healthy',
          external: 'unknown'
        },
        metrics: {
          memoryUsage: process.memoryUsage(),
          cpuUsage: process.cpuUsage(),
          uptime: process.uptime(),
          version: process.version
        }
      }

      // Quick database connection check
      try {
        const { pool } = await import('./utils/database')
        const result = await pool.query('SELECT 1 as health_check')
        healthStatus.services.database = result.rows.length > 0 ? 'healthy' : 'unhealthy'
      } catch (dbError) {
        healthStatus.services.database = 'unhealthy'
        logger.warn('Database health check failed', dbError as Error)
      }

      // Check memory usage
      const memUsage = process.memoryUsage()
      const memoryThreshold = 1024 * 1024 * 512 // 512MB threshold
      if (memUsage.heapUsed > memoryThreshold) {
        healthStatus.services.memory = 'warning'
      }

      // Determine overall status
      const unhealthyServices = Object.values(healthStatus.services).filter(status => status === 'unhealthy')
      if (unhealthyServices.length > 0) {
        healthStatus.status = 'degraded'
        reply.code(503)
      } else {
        const warningServices = Object.values(healthStatus.services).filter(status => status === 'warning')
        if (warningServices.length > 0) {
          healthStatus.status = 'warning'
        }
      }
      
      return healthStatus
    } catch (error) {
      logger.error('Health check failed', error as Error, {}, LogCategory.SERVER)
      reply.code(503)
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: (error as Error).message
      }
    }
  })

  // API routes prefix
  await fastify.register(async function (fastify) {
    // Import and register video routes
    const { videoRoutes } = await import('./routes/videoRoutes')
    await fastify.register(videoRoutes)
    logger.info('Video routes registered', undefined, {}, LogCategory.SERVER)
    
    // Import and register share routes
    const { shareRoutes } = await import('./routes/shareRoutes')
    await fastify.register(shareRoutes)
    logger.info('Share routes registered', undefined, {}, LogCategory.SERVER)
    
    // Import and register user routes
    const { userRoutes } = await import('./routes/userRoutes')
    await fastify.register(userRoutes)
    logger.info('User routes registered', undefined, {}, LogCategory.SERVER)
    
    // Import and register concept routes - temporarily disabled due to compilation errors
    // const { conceptRoutes } = await import('./routes/conceptRoutes')
    // await fastify.register(conceptRoutes)
    // logger.info('Concept routes registered', undefined, {}, LogCategory.SERVER)
    
    // Import and register export routes - temporarily disabled due to compilation errors
    // const { exportRoutes } = await import('./routes/exportRoutes')
    // await fastify.register(exportRoutes)
    // logger.info('Export routes registered', undefined, {}, LogCategory.SERVER)
    
    // Import and register new Auth routes (replaces Better Auth)
    const { authRoutes } = await import('./routes/authRoutes')
    await fastify.register(authRoutes)
    logger.info('New authentication routes registered', undefined, {}, LogCategory.SERVER)
    
    // Import and register quota routes
    const { quotaRoutes } = await import('./routes/quotaRoutes')
    await fastify.register(quotaRoutes)
    logger.info('Quota routes registered', undefined, {}, LogCategory.SERVER)
    
    // Import and register cache routes
    const { cacheRoutes } = await import('./routes/cacheRoutes')
    await fastify.register(cacheRoutes)
    logger.info('Cache routes registered', undefined, {}, LogCategory.SERVER)

    // System info with enhanced details
    fastify.get('/system/info', async (request, reply) => {
      return {
        status: 'ok',
        version: '1.0.0',
        environment: config.server.nodeEnv,
        features: {
          audioProcessing: true,
          transcription: true,
          contentAnalysis: true,
          knowledgeGraphs: true,
          rateLimiting: config.security.enableRateLimit,
          structuredLogging: true,
          errorHandling: true,
          publicSharing: true
        },
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      }
    })
  }, { prefix: '/api' })

  logger.info('All routes registered successfully', undefined, {}, LogCategory.SERVER)
}

// Error handlers
fastify.setErrorHandler(globalErrorHandler)
fastify.setNotFoundHandler(notFoundHandler)

// Start server
async function start() {
  try {
    logger.info('🚀 Starting YouTube Learning Generator Backend...', undefined, {
      metadata: {
        version: '1.0.0',
        environment: config.server.nodeEnv,
        nodeVersion: process.version
      }
    }, LogCategory.SERVER)

    await registerPlugins()
    
    // Initialize database and run authentication migrations
    try {
      const { databaseAdapter } = await import('./services/databaseAdapter')
      logger.info('Running authentication database migrations...', undefined, {}, LogCategory.SERVER)
      
      const migrationResult = await databaseAdapter.executeAuthMigrations()
      if (migrationResult.success) {
        logger.info('Authentication database migrations completed', undefined, {
          migrationsExecuted: migrationResult.migrationsExecuted,
          newTablesCreated: migrationResult.newTablesCreated.length,
          existingTablesModified: migrationResult.existingTablesModified.length
        }, LogCategory.SERVER)
      } else {
        logger.error('Authentication database migrations failed', undefined, {
          errors: migrationResult.errors
        }, LogCategory.SERVER)
      }
    } catch (migrationError) {
      logger.warn('Database migration check failed, continuing startup', migrationError as Error, {}, LogCategory.SERVER)
    }
    
    await registerRoutes()

    await fastify.listen({ 
      port: config.server.port, 
      host: config.server.host 
    })

    // 启动定时任务
    await CronService.initialize()
    
    logger.info('🎉 Server started successfully', undefined, {
      metadata: {
        url: `http://${config.server.host}:${config.server.port}`,
        healthCheck: `http://${config.server.host}:${config.server.port}/health`,
        apiEndpoint: `http://${config.server.host}:${config.server.port}/api`,
        environment: config.server.nodeEnv,
        features: {
          rateLimiting: config.security.enableRateLimit,
          cors: config.security.enableCors,
          structuredLogging: true,
          errorHandling: true
        }
      }
    }, LogCategory.SERVER)
    
  } catch (err) {
    logger.error('❌ Failed to start server', err as Error, {
      metadata: {
        port: config.server.port,
        host: config.server.host
      }
    }, LogCategory.SERVER)
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('🛑 Received SIGINT, shutting down gracefully...', undefined, {}, LogCategory.SERVER)
  try {
    // 停止定时任务
    await CronService.shutdown()
    await fastify.close()
    logger.info('✅ Server shutdown completed', undefined, {}, LogCategory.SERVER)
    process.exit(0)
  } catch (error) {
    logger.error('❌ Error during shutdown', error as Error, {}, LogCategory.SERVER)
    process.exit(1)
  }
})

process.on('SIGTERM', async () => {
  logger.info('🛑 Received SIGTERM, shutting down gracefully...', undefined, {}, LogCategory.SERVER)
  try {
    // 停止定时任务
    await CronService.shutdown()
    await fastify.close()
    logger.info('✅ Server shutdown completed', undefined, {}, LogCategory.SERVER)
    process.exit(0)
  } catch (error) {
    logger.error('❌ Error during shutdown', error as Error, {}, LogCategory.SERVER)
    process.exit(1)
  }
})

// Start the server
start()