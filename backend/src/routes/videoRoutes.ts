import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { VideoProcessor } from '../services/videoProcessor'
import { ProcessVideoRequest } from '../types'

/**
 * 视频处理相关的API路由
 */
export async function videoRoutes(fastify: FastifyInstance) {
  
  /**
   * 提交视频处理请求
   */
  fastify.post('/videos/process', {
    schema: {
      body: {
        type: 'object',
        required: ['youtubeUrl'],
        properties: {
          youtubeUrl: { 
            type: 'string',
            pattern: '^https?://(www\\.)?(youtube\\.com|youtu\\.be)/.+'
          },
          options: {
            type: 'object',
            properties: {
              language: { type: 'string' },
              outputFormat: { 
                type: 'string', 
                enum: ['concise', 'standard', 'detailed'] 
              },
              includeTimestamps: { type: 'boolean' }
            }
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            processId: { type: 'string' },
            status: { type: 'string' },
            estimatedTime: { type: 'number' },
            message: { type: 'string' }
          }
        },
        400: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                statusCode: { type: 'number' },
                message: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: ProcessVideoRequest }>, reply: FastifyReply) => {
    try {
      console.log('📥 Received video processing request:', request.body.youtubeUrl)
      
      // 这里可以添加用户认证逻辑
      // const userId = request.user?.id
      
      const result = await VideoProcessor.processVideo(request.body)
      
      reply.code(200).send(result)
    } catch (error) {
      console.error('❌ Video processing request failed:', error)
      
      reply.code(400).send({
        error: {
          statusCode: 400,
          message: error instanceof Error ? error.message : 'Processing request failed'
        }
      })
    }
  })

  /**
   * 获取处理状态
   */
  fastify.get('/videos/:id/status', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            processId: { type: 'string' },
            status: { type: 'string' },
            progress: { type: 'number' },
            currentStep: { type: 'string' },
            estimatedTimeRemaining: { type: 'number' },
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params
      console.log(`📊 Getting status for process: ${id}`)
      
      const status = await VideoProcessor.getProcessStatus(id)
      
      reply.code(200).send(status)
    } catch (error) {
      console.error('❌ Failed to get process status:', error)
      
      reply.code(404).send({
        error: {
          statusCode: 404,
          message: error instanceof Error ? error.message : 'Process not found'
        }
      })
    }
  })

  /**
   * 获取处理结果
   */
  fastify.get('/videos/:id/result', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params
      console.log(`📋 Getting result for process: ${id}`)
      
      const result = await VideoProcessor.getProcessResult(id)
      
      reply.code(200).send(result)
    } catch (error) {
      console.error('❌ Failed to get process result:', error)
      
      reply.code(404).send({
        error: {
          statusCode: 404,
          message: error instanceof Error ? error.message : 'Result not found'
        }
      })
    }
  })

  /**
   * 获取处理统计信息
   */
  fastify.get('/videos/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      console.log('📈 Getting processing statistics')
      
      const stats = await VideoProcessor.getProcessingStats()
      
      reply.code(200).send({
        status: 'success',
        data: stats,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('❌ Failed to get processing stats:', error)
      
      reply.code(500).send({
        error: {
          statusCode: 500,
          message: 'Failed to retrieve statistics'
        }
      })
    }
  })

  /**
   * 测试视频信息提取
   */
  fastify.post('/videos/test-extract', {
    schema: {
      body: {
        type: 'object',
        required: ['youtubeUrl'],
        properties: {
          youtubeUrl: { type: 'string' }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: { youtubeUrl: string } }>, reply: FastifyReply) => {
    try {
      const { youtubeUrl } = request.body
      console.log(`🧪 Testing video extraction for: ${youtubeUrl}`)
      
      // 动态导入以避免循环依赖
      const { YouTubeService } = await import('../services/youtubeService')
      
      const videoInfo = await YouTubeService.getDetailedVideoInfo(youtubeUrl)
      const analysis = YouTubeService.analyzeVideoContent(videoInfo)
      const validation = YouTubeService.validateVideoForProcessing(videoInfo)
      
      reply.code(200).send({
        status: 'success',
        data: {
          videoInfo,
          analysis,
          validation
        }
      })
    } catch (error) {
      console.error('❌ Video extraction test failed:', error)
      
      reply.code(400).send({
        error: {
          statusCode: 400,
          message: error instanceof Error ? error.message : 'Extraction test failed'
        }
      })
    }
  })

  /**
   * 健康检查 - 检查所有服务状态
   */
  fastify.get('/videos/health', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      console.log('🏥 Performing health check')
      
      // 检查各个服务的状态
      const healthStatus = {
        timestamp: new Date().toISOString(),
        services: {
          database: false,
          audio_processor: false,
          transcription: false,
          content_analyzer: false
        },
        dependencies: {
          ytdlp: false,
          ffmpeg: false
        },
        overall: 'unknown'
      }

      try {
        // 检查数据库连接
        const { testDatabaseConnection } = await import('../config/database')
        healthStatus.services.database = await testDatabaseConnection()
      } catch (error) {
        console.warn('Database health check failed:', error)
      }

      try {
        // 检查音频处理依赖
        const { AudioProcessor } = await import('../services/audioProcessor')
        const deps = await AudioProcessor.checkDependencies()
        healthStatus.dependencies.ytdlp = deps.ytdlp
        healthStatus.dependencies.ffmpeg = deps.ffmpeg
        healthStatus.services.audio_processor = deps.ytdlp || deps.ffmpeg
      } catch (error) {
        console.warn('Audio processor health check failed:', error)
      }

      try {
        // 检查API连接状态
        const { testAPIConnections } = await import('../config/apis')
        const apiStatus = await testAPIConnections()
        healthStatus.services.transcription = apiStatus.groq
        healthStatus.services.content_analyzer = apiStatus.openai
      } catch (error) {
        console.warn('API health check failed:', error)
      }

      // 计算整体健康状态
      const serviceValues = Object.values(healthStatus.services)
      const healthyServices = serviceValues.filter(status => status).length
      const totalServices = serviceValues.length

      if (healthyServices === totalServices) {
        healthStatus.overall = 'healthy'
      } else if (healthyServices >= totalServices / 2) {
        healthStatus.overall = 'partial'
      } else {
        healthStatus.overall = 'unhealthy'
      }

      const httpStatus = healthStatus.overall === 'unhealthy' ? 503 : 200

      reply.code(httpStatus).send({
        status: healthStatus.overall,
        data: healthStatus
      })

    } catch (error) {
      console.error('❌ Health check failed:', error)
      
      reply.code(503).send({
        status: 'error',
        error: {
          statusCode: 503,
          message: 'Health check failed'
        }
      })
    }
  })
}