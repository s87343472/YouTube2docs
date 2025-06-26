import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { VideoCacheService } from '../services/videoCacheService'
import { logger } from '../utils/logger'
import { requireAuth, optionalAuth } from '../middleware/authMiddleware'

/**
 * 视频缓存管理相关的API路由
 */
export async function cacheRoutes(fastify: FastifyInstance) {

  /**
   * 获取缓存统计信息
   */
  fastify.get('/cache/stats', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                totalCached: { type: 'number' },
                totalAccesses: { type: 'number' },
                costSaved: { type: 'number' },
                hitRate: { type: 'number' },
                topVideos: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      videoTitle: { type: 'string' },
                      accessCount: { type: 'number' },
                      costSaved: { type: 'number' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const stats = await VideoCacheService.getCacheStats()
      
      reply.send({
        success: true,
        data: stats
      })
    } catch (error) {
      logger.error('Failed to get cache stats', error as Error)
      reply.code(500).send({
        success: false,
        error: {
          message: error instanceof Error ? error.message : '获取缓存统计失败'
        }
      })
    }
  })

  /**
   * 获取用户缓存使用情况
   */
  fastify.get('/cache/user-usage', {
    preHandler: [optionalAuth],
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                createdCount: { type: 'number' },
                reusedCount: { type: 'number' },
                totalCostSaved: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user?.id || 1
      
      const usage = await VideoCacheService.getUserCacheUsage(userId)
      
      reply.send({
        success: true,
        data: usage
      })
    } catch (error) {
      logger.error('Failed to get user cache usage', error as Error)
      reply.code(500).send({
        success: false,
        error: {
          message: error instanceof Error ? error.message : '获取用户缓存使用情况失败'
        }
      })
    }
  })

  /**
   * 检查特定URL的缓存状态
   */
  fastify.post('/cache/check', {
    schema: {
      body: {
        type: 'object',
        required: ['youtubeUrl'],
        properties: {
          youtubeUrl: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                cached: { type: 'boolean' },
                cacheInfo: {
                  type: 'object',
                  nullable: true,
                  properties: {
                    id: { type: 'number' },
                    videoTitle: { type: 'string' },
                    accessCount: { type: 'number' },
                    createdAt: { type: 'string' },
                    lastAccessedAt: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{
    Body: {
      youtubeUrl: string
    }
  }>, reply: FastifyReply) => {
    try {
      const { youtubeUrl } = request.body
      
      const cacheEntry = await VideoCacheService.checkCache(youtubeUrl)
      
      reply.send({
        success: true,
        data: {
          cached: !!cacheEntry,
          cacheInfo: cacheEntry ? {
            id: cacheEntry.id,
            videoTitle: cacheEntry.videoTitle,
            accessCount: cacheEntry.accessCount,
            createdAt: cacheEntry.createdAt.toISOString(),
            lastAccessedAt: cacheEntry.lastAccessedAt.toISOString()
          } : null
        }
      })
    } catch (error) {
      logger.error('Failed to check cache', error as Error)
      reply.code(500).send({
        success: false,
        error: {
          message: error instanceof Error ? error.message : '检查缓存状态失败'
        }
      })
    }
  })

  /**
   * 清理过期缓存（管理员功能）
   */
  fastify.post('/cache/cleanup', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                deletedCount: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await VideoCacheService.cleanupExpiredCache()
      
      reply.send({
        success: true,
        data: result
      })
    } catch (error) {
      logger.error('Failed to cleanup cache', error as Error)
      reply.code(500).send({
        success: false,
        error: {
          message: error instanceof Error ? error.message : '清理缓存失败'
        }
      })
    }
  })

  /**
   * 删除特定缓存（管理员功能）
   */
  fastify.delete('/cache/:cacheId', {
    schema: {
      params: {
        type: 'object',
        properties: {
          cacheId: { type: 'number' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{
    Params: {
      cacheId: number
    }
  }>, reply: FastifyReply) => {
    try {
      const { cacheId } = request.params
      
      await VideoCacheService.deleteCache(cacheId)
      
      reply.send({
        success: true,
        message: '缓存已删除'
      })
    } catch (error) {
      logger.error('Failed to delete cache', error as Error)
      reply.code(500).send({
        success: false,
        error: {
          message: error instanceof Error ? error.message : '删除缓存失败'
        }
      })
    }
  })
}