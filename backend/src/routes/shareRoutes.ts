import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { ShareService } from '../services/shareService'

/**
 * 分享功能相关的API路由
 */
export async function shareRoutes(fastify: FastifyInstance) {
  
  /**
   * 创建公开分享
   * POST /api/shares
   */
  fastify.post('/shares', {
    schema: {
      body: {
        type: 'object',
        required: ['videoProcessId', 'title'],
        properties: {
          videoProcessId: { type: 'string' },
          title: { type: 'string', maxLength: 255 },
          description: { type: 'string', maxLength: 1000 },
          tags: { 
            type: 'array', 
            items: { type: 'string' },
            maxItems: 10
          },
          isPublic: { type: 'boolean' }
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
                shareId: { type: 'string' },
                shareUrl: { type: 'string' },
                title: { type: 'string' },
                isPublic: { type: 'boolean' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{
    Body: {
      videoProcessId: string
      title: string
      description?: string
      tags?: string[]
      isPublic: boolean
    }
  }>, reply: FastifyReply) => {
    try {
      // TODO: 从认证中间件获取用户ID
      const userId = '1' // 临时硬编码，实际应该从JWT token获取
      
      const { videoProcessId, title, description, tags, isPublic } = request.body
      
      console.log(`📤 Creating share for video: ${videoProcessId} by user: ${userId}`)
      
      const sharedContent = await ShareService.createShare(userId, videoProcessId, {
        title,
        description,
        tags,
        isPublic
      })
      
      const shareUrl = `${request.protocol}://${request.hostname}/shared/${sharedContent.shareId}`
      
      reply.send({
        success: true,
        data: {
          shareId: sharedContent.shareId,
          shareUrl,
          title: sharedContent.title,
          isPublic: sharedContent.isPublic
        }
      })
      
    } catch (error) {
      console.error('❌ Create share failed:', error)
      
      reply.code(400).send({
        success: false,
        error: {
          message: error instanceof Error ? error.message : '创建分享失败',
          code: 'SHARE_CREATE_FAILED'
        }
      })
    }
  })
  
  /**
   * 获取公开分享内容（无需认证）
   * GET /api/shares/:shareId
   */
  fastify.get('/shares/:shareId', {
    schema: {
      params: {
        type: 'object',
        properties: {
          shareId: { type: 'string', pattern: '^[a-z0-9]{10}$' }
        },
        required: ['shareId']
      },
      querystring: {
        type: 'object',
        properties: {
          from: { type: 'string' }
        }
      }
    }
  }, async (request: FastifyRequest<{
    Params: { shareId: string }
    Querystring: { from?: string }
  }>, reply: FastifyReply) => {
    try {
      const { shareId } = request.params
      
      console.log(`👀 Viewing shared content: ${shareId}`)
      
      // 记录浏览行为（异步执行，不阻塞响应）
      ShareService.recordView(shareId, request).catch(error => {
        console.error('Failed to record view:', error)
      })
      
      const sharedContent = await ShareService.getSharedContent(shareId)
      
      if (!sharedContent) {
        return reply.code(404).send({
          success: false,
          error: {
            message: '分享内容不存在或已被设为私有',
            code: 'SHARE_NOT_FOUND'
          }
        })
      }
      
      reply.send({
        success: true,
        data: sharedContent
      })
      
    } catch (error) {
      console.error('❌ Get shared content failed:', error)
      
      reply.code(500).send({
        success: false,
        error: {
          message: '获取分享内容失败',
          code: 'SHARE_GET_FAILED'
        }
      })
    }
  })
  
  /**
   * 获取用户的分享列表
   * GET /api/shares
   */
  fastify.get('/shares', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', minimum: 1, default: 1 },
          limit: { type: 'number', minimum: 1, maximum: 50, default: 20 }
        }
      }
    }
  }, async (request: FastifyRequest<{
    Querystring: { page?: number; limit?: number }
  }>, reply: FastifyReply) => {
    try {
      // TODO: 从认证中间件获取用户ID
      const userId = '1' // 临时硬编码，实际应该从JWT token获取
      
      console.log(`📋 Getting shares for user: ${userId}`)
      
      const shares = await ShareService.getUserShares(userId)
      
      reply.send({
        success: true,
        data: {
          shares,
          total: shares.length,
          page: request.query.page || 1
        }
      })
      
    } catch (error) {
      console.error('❌ Get user shares failed:', error)
      
      reply.code(500).send({
        success: false,
        error: {
          message: '获取分享列表失败',
          code: 'USER_SHARES_GET_FAILED'
        }
      })
    }
  })
  
  /**
   * 获取分享统计数据
   * GET /api/shares/:shareId/analytics
   */
  fastify.get('/shares/:shareId/analytics', {
    schema: {
      params: {
        type: 'object',
        properties: {
          shareId: { type: 'string', pattern: '^[a-z0-9]{10}$' }
        },
        required: ['shareId']
      }
    }
  }, async (request: FastifyRequest<{
    Params: { shareId: string }
  }>, reply: FastifyReply) => {
    try {
      // TODO: 从认证中间件获取用户ID
      const userId = '1' // 临时硬编码，实际应该从JWT token获取
      const { shareId } = request.params
      
      console.log(`📊 Getting analytics for share: ${shareId} by user: ${userId}`)
      
      const analytics = await ShareService.getShareAnalytics(shareId, userId)
      
      reply.send({
        success: true,
        data: analytics
      })
      
    } catch (error) {
      console.error('❌ Get share analytics failed:', error)
      
      reply.code(403).send({
        success: false,
        error: {
          message: error instanceof Error ? error.message : '获取分享统计失败',
          code: 'SHARE_ANALYTICS_FAILED'
        }
      })
    }
  })
  
  /**
   * 更新分享设置
   * PUT /api/shares/:shareId
   */
  fastify.put('/shares/:shareId', {
    schema: {
      params: {
        type: 'object',
        properties: {
          shareId: { type: 'string', pattern: '^[a-z0-9]{10}$' }
        },
        required: ['shareId']
      },
      body: {
        type: 'object',
        properties: {
          title: { type: 'string', maxLength: 255 },
          description: { type: 'string', maxLength: 1000 },
          tags: { 
            type: 'array', 
            items: { type: 'string' },
            maxItems: 10
          },
          isPublic: { type: 'boolean' }
        }
      }
    }
  }, async (request: FastifyRequest<{
    Params: { shareId: string }
    Body: {
      title?: string
      description?: string
      tags?: string[]
      isPublic?: boolean
    }
  }>, reply: FastifyReply) => {
    try {
      // TODO: 从认证中间件获取用户ID
      const userId = '1' // 临时硬编码，实际应该从JWT token获取
      const { shareId } = request.params
      
      console.log(`✏️ Updating share: ${shareId} by user: ${userId}`)
      
      const updatedShare = await ShareService.updateShare(shareId, userId, request.body)
      
      reply.send({
        success: true,
        data: {
          shareId: updatedShare.shareId,
          title: updatedShare.title,
          isPublic: updatedShare.isPublic,
          updatedAt: updatedShare.updatedAt
        }
      })
      
    } catch (error) {
      console.error('❌ Update share failed:', error)
      
      reply.code(400).send({
        success: false,
        error: {
          message: error instanceof Error ? error.message : '更新分享失败',
          code: 'SHARE_UPDATE_FAILED'
        }
      })
    }
  })
  
  /**
   * 删除分享
   * DELETE /api/shares/:shareId
   */
  fastify.delete('/shares/:shareId', {
    schema: {
      params: {
        type: 'object',
        properties: {
          shareId: { type: 'string', pattern: '^[a-z0-9]{10}$' }
        },
        required: ['shareId']
      }
    }
  }, async (request: FastifyRequest<{
    Params: { shareId: string }
  }>, reply: FastifyReply) => {
    try {
      // TODO: 从认证中间件获取用户ID
      const userId = '1' // 临时硬编码，实际应该从JWT token获取
      const { shareId } = request.params
      
      console.log(`🗑️ Deleting share: ${shareId} by user: ${userId}`)
      
      await ShareService.deleteShare(shareId, userId)
      
      reply.send({
        success: true,
        message: '分享已删除'
      })
      
    } catch (error) {
      console.error('❌ Delete share failed:', error)
      
      reply.code(400).send({
        success: false,
        error: {
          message: error instanceof Error ? error.message : '删除分享失败',
          code: 'SHARE_DELETE_FAILED'
        }
      })
    }
  })
}