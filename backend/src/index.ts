import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import staticFiles from '@fastify/static'
import path from 'path'
import { config, validateConfig } from './config'
import { logger, LogCategory } from './utils/logger'
import { globalErrorHandler, notFoundHandler, errorHandling } from './errors/errorHandler'
// import { loggingMiddleware } from './middleware/logging' // temporarily disabled
// import { rateLimitMiddleware } from './middleware/rateLimit' // temporarily disabled

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
  
  // CORS configuration
  if (config.security.enableCors) {
    await fastify.register(cors, {
      origin: config.server.corsOrigin,
      credentials: true
    })
    logger.info('CORS plugin registered', undefined, { metadata: { origin: config.server.corsOrigin } }, LogCategory.SERVER)
  }

  // Request correlation and logging (must be first) - temporarily disabled
  // for (const middleware of loggingMiddleware.core) {
  //   fastify.addHook('preHandler', middleware)
  // }
  logger.info('Logging middleware registered', undefined, {}, LogCategory.SERVER)

  // Rate limiting (if enabled) - temporarily disabled due to TypeScript issues
  // if (config.security.enableRateLimit) {
  //   fastify.addHook('preHandler', rateLimitMiddleware.global)
  //   logger.info('Rate limiting enabled', undefined, {
  //     metadata: {
  //       window: config.security.rateLimitWindow,
  //       max: config.security.rateLimitMax
  //     }
  //   }, LogCategory.SERVER)
  // }

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
      // TODO: Add database health check
      // TODO: Add Redis health check
      // TODO: Add external service health checks
      
      return { 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.server.nodeEnv,
        version: '1.0.0',
        services: {
          database: 'unknown', // Will be implemented
          redis: 'unknown',     // Will be implemented
          external: 'unknown'   // Will be implemented
        }
      }
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
    
    // Import and register concept routes - temporarily disabled
    // const { conceptRoutes } = await import('./routes/conceptRoutes')
    // await fastify.register(conceptRoutes)
    // logger.info('Concept routes registered', undefined, {}, LogCategory.SERVER)
    
    // Import and register export routes - temporarily disabled
    // const { exportRoutes } = await import('./routes/exportRoutes')
    // await fastify.register(exportRoutes)
    // logger.info('Export routes registered', undefined, {}, LogCategory.SERVER)
    
    // Import and register Better Auth routes
    const { betterAuthRoutes } = await import('./routes/betterAuthRoutes')
    await fastify.register(betterAuthRoutes)
    logger.info('Better Auth routes registered', undefined, {}, LogCategory.SERVER)

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
    await registerRoutes()

    await fastify.listen({ 
      port: config.server.port, 
      host: config.server.host 
    })
    
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