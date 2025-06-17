import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import staticFiles from '@fastify/static'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Load environment variables
dotenv.config()

const fastify = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'development' ? 'info' : 'warn'
  }
})

// Register plugins
async function registerPlugins() {
  // CORS configuration
  await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true
  })

  // Multipart form data support
  await fastify.register(multipart, {
    limits: {
      fileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600') // 100MB
    }
  })

  // Static files
  const uploadsPath = path.resolve(process.cwd(), process.env.UPLOAD_PATH || './uploads')
  await fastify.register(staticFiles, {
    root: uploadsPath,
    prefix: '/uploads/'
  })
}

// Register routes
async function registerRoutes() {
  // Health check
  fastify.get('/health', async (request, reply) => {
    return { 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    }
  })

  // API routes prefix
  await fastify.register(async function (fastify) {
    // Auth routes
    fastify.get('/auth/me', async (request, reply) => {
      return { message: 'Auth endpoint - coming soon' }
    })

    // Video processing routes
    fastify.post('/videos/process', async (request, reply) => {
      return { message: 'Video processing endpoint - coming soon' }
    })

    fastify.get('/videos/:id/status', async (request, reply) => {
      return { message: 'Video status endpoint - coming soon' }
    })

    fastify.get('/videos/:id/result', async (request, reply) => {
      return { message: 'Video result endpoint - coming soon' }
    })
  }, { prefix: '/api' })
}

// Error handler
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error)

  const statusCode = error.statusCode || 500
  const message = error.message || 'Internal Server Error'

  reply.status(statusCode).send({
    error: {
      statusCode,
      message,
      timestamp: new Date().toISOString()
    }
  })
})

// Not found handler
fastify.setNotFoundHandler((request, reply) => {
  reply.status(404).send({
    error: {
      statusCode: 404,
      message: 'Route not found',
      path: request.url
    }
  })
})

// Start server
async function start() {
  try {
    await registerPlugins()
    await registerRoutes()

    const port = parseInt(process.env.PORT || '3000')
    const host = process.env.HOST || 'localhost'

    await fastify.listen({ port, host })
    
    console.log(`🚀 Server running on http://${host}:${port}`)
    console.log(`📋 Health check: http://${host}:${port}/health`)
    console.log(`🔗 API docs: http://${host}:${port}/api`)
    
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...')
  await fastify.close()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...')
  await fastify.close()
  process.exit(0)
})

// Start the server
start()