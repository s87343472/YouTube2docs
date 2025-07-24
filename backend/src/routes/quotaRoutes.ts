import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { QuotaService } from '../services/quotaService'
import { AbusePreventionService } from '../services/abusePreventionService'
import { logger } from '../utils/logger'
import { requireAuth, optionalAuth } from '../middleware/authMiddleware'
// import { planChangeRateLimit } from '../middleware/rateLimitMiddleware' // Temporarily disabled

/**
 * 配额管理相关的API路由
 */
export async function quotaRoutes(fastify: FastifyInstance) {

  /**
   * 获取所有配额计划
   */
  fastify.get('/quota/plans', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  planType: { type: 'string' },
                  name: { type: 'string' },
                  description: { type: 'string' },
                  priceMonthly: { type: 'number' },
                  priceYearly: { type: 'number' },
                  monthlyVideoQuota: { type: 'number' },
                  maxVideoDuration: { type: 'number' },
                  maxFileSize: { type: 'number' },
                  hasPriorityProcessing: { type: 'boolean' },
                  hasAdvancedExport: { type: 'boolean' },
                  hasApiAccess: { type: 'boolean' },
                  hasTeamManagement: { type: 'boolean' },
                  hasCustomBranding: { type: 'boolean' },
                  maxStorageGb: { type: 'number' },
                  maxSharedItems: { type: 'number' },
                  monthlyDurationQuota: { type: 'number' }
                }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const plans = await QuotaService.getAllQuotaPlans()
      
      reply.send({
        success: true,
        data: plans
      })
    } catch (error) {
      logger.error('Failed to get quota plans', { error })
      reply.code(500).send({
        success: false,
        error: {
          message: error instanceof Error ? error.message : '获取配额计划失败'
        }
      })
    }
  })

  /**
   * 获取用户当前订阅信息
   */
  fastify.get('/quota/subscription', {
    preHandler: [requireAuth],
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                subscription: {
                  type: 'object',
                  properties: {
                    id: { type: 'number' },
                    userId: { type: 'string' },
                    planType: { type: 'string' },
                    status: { type: 'string' },
                    startedAt: { type: 'string' },
                    expiresAt: { type: 'string' },
                    autoRenew: { type: 'boolean' },
                    paymentMethod: { type: 'string' }
                  }
                },
                plan: {
                  type: 'object',
                  properties: {
                    id: { type: 'number' },
                    planType: { type: 'string' },
                    name: { type: 'string' },
                    description: { type: 'string' },
                    priceMonthly: { type: 'number' },
                    priceYearly: { type: 'number' },
                    monthlyVideoQuota: { type: 'number' },
                    maxVideoDuration: { type: 'number' },
                    maxFileSize: { type: 'number' },
                    hasPriorityProcessing: { type: 'boolean' },
                    hasAdvancedExport: { type: 'boolean' },
                    hasApiAccess: { type: 'boolean' },
                    hasTeamManagement: { type: 'boolean' },
                    hasCustomBranding: { type: 'boolean' },
                    maxStorageGb: { type: 'number' },
                    maxSharedItems: { type: 'number' },
                    monthlyDurationQuota: { type: 'number' }
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
      const userId = (request as any).user?.id
      if (!userId) {
        return reply.code(401).send({
          success: false,
          error: { message: '需要登录才能访问此功能' }
        })
      }
      
      const subscription = await QuotaService.getUserSubscription(userId)
      if (!subscription) {
        return reply.code(404).send({
          success: false,
          error: { message: '用户订阅信息不存在' }
        })
      }

      const plan = await QuotaService.getQuotaPlan(subscription.planType)
      if (!plan) {
        return reply.code(404).send({
          success: false,
          error: { message: '配额计划不存在' }
        })
      }

      reply.send({
        success: true,
        data: {
          subscription,
          plan
        }
      })
    } catch (error) {
      logger.error('Failed to get user subscription', { error })
      reply.code(500).send({
        success: false,
        error: {
          message: error instanceof Error ? error.message : '获取用户订阅信息失败'
        }
      })
    }
  })

  /**
   * 获取用户配额使用情况
   */
  fastify.get('/quota/usage', {
    preHandler: [requireAuth],
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  quotaType: { type: 'string' },
                  usedAmount: { type: 'number' },
                  maxAmount: { type: 'number' },
                  percentage: { type: 'number' },
                  periodStart: { type: 'string' },
                  periodEnd: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user?.id
      if (!userId) {
        return reply.code(401).send({
          success: false,
          error: { message: '需要登录才能访问此功能' }
        })
      }
      
      const usageList = await QuotaService.getUserAllQuotaUsage(userId)
      
      reply.send({
        success: true,
        data: usageList
      })
    } catch (error) {
      logger.error('Failed to get user quota usage', { error })
      reply.code(500).send({
        success: false,
        error: {
          message: error instanceof Error ? error.message : '获取配额使用情况失败'
        }
      })
    }
  })

  /**
   * 检查用户配额
   */
  fastify.post('/quota/check', {
    preHandler: [requireAuth],
    schema: {
      body: {
        type: 'object',
        required: ['quotaType'],
        properties: {
          quotaType: { 
            type: 'string',
            enum: ['video_processing', 'shares', 'storage', 'exports', 'api_calls']
          },
          amount: { type: 'number', default: 1 },
          metadata: {
            type: 'object',
            properties: {
              videoDuration: { type: 'number' },
              fileSize: { type: 'number' }
            }
          }
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
                allowed: { type: 'boolean' },
                reason: { type: 'string' },
                currentUsage: {
                  type: 'object',
                  properties: {
                    quotaType: { type: 'string' },
                    usedAmount: { type: 'number' },
                    maxAmount: { type: 'number' },
                    percentage: { type: 'number' },
                    periodStart: { type: 'string' },
                    periodEnd: { type: 'string' }
                  }
                },
                upgradeRequired: { type: 'boolean' },
                suggestedPlan: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{
    Body: {
      quotaType: string
      amount?: number
      metadata?: any
    }
  }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).user?.id
      if (!userId) {
        return reply.code(401).send({
          success: false,
          error: { message: '需要登录才能访问此功能' }
        })
      }
      const { quotaType, amount = 1, metadata } = request.body
      
      const checkResult = await QuotaService.checkQuota(userId, quotaType, amount, metadata)
      
      reply.send({
        success: true,
        data: checkResult
      })
    } catch (error) {
      logger.error('Failed to check quota', { error })
      reply.code(500).send({
        success: false,
        error: {
          message: error instanceof Error ? error.message : '检查配额失败'
        }
      })
    }
  })

  /**
   * 获取用户配额预警
   */
  fastify.get('/quota/alerts', {
    preHandler: [requireAuth],
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  quotaType: { type: 'string' },
                  alertType: { type: 'string' },
                  thresholdPercentage: { type: 'number' },
                  message: { type: 'string' },
                  createdAt: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user?.id
      if (!userId) {
        return reply.code(401).send({
          success: false,
          error: { message: '需要登录才能访问此功能' }
        })
      }
      
      const alerts = await QuotaService.getUserQuotaAlerts(userId)
      
      reply.send({
        success: true,
        data: alerts
      })
    } catch (error) {
      logger.error('Failed to get quota alerts', { error })
      reply.code(500).send({
        success: false,
        error: {
          message: error instanceof Error ? error.message : '获取配额预警失败'
        }
      })
    }
  })

  /**
   * 标记预警为已读
   */
  fastify.post('/quota/alerts/read', {
    preHandler: [requireAuth],
    schema: {
      body: {
        type: 'object',
        required: ['alertIds'],
        properties: {
          alertIds: {
            type: 'array',
            items: { type: 'number' }
          }
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
    Body: {
      alertIds: number[]
    }
  }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).user?.id
      if (!userId) {
        return reply.code(401).send({
          success: false,
          error: { message: '需要登录才能访问此功能' }
        })
      }
      const { alertIds } = request.body
      
      await QuotaService.markQuotaAlertsAsRead(userId, alertIds)
      
      reply.send({
        success: true,
        message: '预警已标记为已读'
      })
    } catch (error) {
      logger.error('Failed to mark alerts as read', { error })
      reply.code(500).send({
        success: false,
        error: {
          message: error instanceof Error ? error.message : '标记预警失败'
        }
      })
    }
  })

  /**
   * 升级套餐
   */
  fastify.post('/quota/upgrade', {
    preHandler: [requireAuth],
    schema: {
      body: {
        type: 'object',
        required: ['planType'],
        properties: {
          planType: { 
            type: 'string',
            enum: ['basic', 'pro', 'enterprise']
          },
          paymentMethod: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                subscription: { type: 'object' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{
    Body: {
      planType: string
      paymentMethod?: string
    }
  }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).user?.id
      if (!userId) {
        return reply.code(401).send({
          success: false,
          error: { message: '需要登录才能访问此功能' }
        })
      }
      const { planType, paymentMethod = 'unknown' } = request.body
      
      // 获取当前套餐信息
      const currentSubscription = await QuotaService.getUserSubscription(userId)
      const fromPlan = (currentSubscription as any)?.subscription?.planType || 'free'
      
      const newSubscription = await QuotaService.upgradeUserPlan(userId, planType, paymentMethod)
      
      // 记录套餐变更
      await AbusePreventionService.recordPlanChange(
        userId,
        fromPlan,
        planType,
        'upgrade',
        'user_request',
        request.ip,
        request.headers['user-agent']
      )
      
      reply.send({
        success: true,
        message: '套餐升级成功',
        data: {
          subscription: newSubscription
        }
      })
    } catch (error) {
      logger.error('Failed to upgrade plan', { error })
      reply.code(400).send({
        success: false,
        error: {
          message: error instanceof Error ? error.message : '套餐升级失败'
        }
      })
    }
  })

  /**
   * 降级套餐
   */
  fastify.post('/quota/downgrade', {
    preHandler: [requireAuth],
    schema: {
      body: {
        type: 'object',
        required: ['planType'],
        properties: {
          planType: { 
            type: 'string',
            enum: ['free', 'basic']
          }
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
    Body: {
      planType: string
    }
  }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).user?.id
      if (!userId) {
        return reply.code(401).send({
          success: false,
          error: { message: '需要登录才能访问此功能' }
        })
      }
      const { planType } = request.body
      
      // 获取当前套餐信息
      const currentSubscription = await QuotaService.getUserSubscription(userId)
      const fromPlan = (currentSubscription as any)?.subscription?.planType || 'free'
      
      await QuotaService.downgradeUserPlan(userId, planType)
      
      // 记录套餐变更
      await AbusePreventionService.recordPlanChange(
        userId,
        fromPlan,
        planType,
        'downgrade',
        'user_request',
        request.ip,
        request.headers['user-agent']
      )
      
      reply.send({
        success: true,
        message: '降级设置成功，将在当前订阅期结束后生效'
      })
    } catch (error) {
      logger.error('Failed to downgrade plan', { error })
      reply.code(400).send({
        success: false,
        error: {
          message: error instanceof Error ? error.message : '套餐降级失败'
        }
      })
    }
  })

  /**
   * 取消订阅
   */
  fastify.post('/quota/cancel', {
    preHandler: [requireAuth],
    schema: {
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
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user?.id
      if (!userId) {
        return reply.code(401).send({
          success: false,
          error: { message: '需要登录才能访问此功能' }
        })
      }
      
      // 获取当前套餐信息
      const currentSubscription = await QuotaService.getUserSubscription(userId)
      const fromPlan = (currentSubscription as any)?.subscription?.planType || 'free'
      
      await QuotaService.cancelSubscription(userId)
      
      // 记录套餐变更
      await AbusePreventionService.recordPlanChange(
        userId,
        fromPlan,
        'free',
        'cancel',
        'user_request',
        request.ip,
        request.headers['user-agent']
      )
      
      reply.send({
        success: true,
        message: '订阅已取消，将在当前周期结束后降为免费版'
      })
    } catch (error) {
      logger.error('Failed to cancel subscription', { error })
      reply.code(400).send({
        success: false,
        error: {
          message: error instanceof Error ? error.message : '取消订阅失败'
        }
      })
    }
  })

  /**
   * 退款并取消会员
   */
  fastify.post('/quota/refund', {
    preHandler: [requireAuth],
    schema: {
      body: {
        type: 'object',
        properties: {
          reason: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                refundAmount: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{
    Body: {
      reason?: string
    }
  }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).user?.id
      if (!userId) {
        return reply.code(401).send({
          success: false,
          error: { message: '需要登录才能访问此功能' }
        })
      }
      const { reason = 'user_request' } = request.body || {}
      
      const result = await QuotaService.refundAndCancel(userId, reason)
      
      reply.send({
        success: true,
        message: `退款处理成功，退款金额：$${result.refundAmount}`,
        data: result
      })
    } catch (error) {
      logger.error('Failed to process refund', { error })
      reply.code(400).send({
        success: false,
        error: {
          message: error instanceof Error ? error.message : '退款处理失败'
        }
      })
    }
  })

  /**
   * 记录配额使用（内部API）
   */
  fastify.post('/quota/usage/record', {
    preHandler: [requireAuth],
    schema: {
      body: {
        type: 'object',
        required: ['quotaType', 'action'],
        properties: {
          quotaType: { 
            type: 'string',
            enum: ['video_processing', 'shares', 'storage', 'exports', 'api_calls']
          },
          action: { type: 'string' },
          amount: { type: 'number', default: 1 },
          resourceId: { type: 'string' },
          resourceType: { type: 'string' },
          metadata: { type: 'object' }
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
    Body: {
      quotaType: string
      action: string
      amount?: number
      resourceId?: string
      resourceType?: string
      metadata?: any
    }
  }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).user?.id
      if (!userId) {
        return reply.code(401).send({
          success: false,
          error: { message: '需要登录才能访问此功能' }
        })
      }
      const { quotaType, action, amount = 1, resourceId, resourceType, metadata } = request.body
      
      await QuotaService.recordQuotaUsage(
        userId,
        quotaType,
        action,
        amount,
        resourceId,
        resourceType,
        metadata,
        request.ip,
        request.headers['user-agent']
      )
      
      reply.send({
        success: true,
        message: '配额使用记录成功'
      })
    } catch (error) {
      logger.error('Failed to record quota usage', { error })
      reply.code(500).send({
        success: false,
        error: {
          message: error instanceof Error ? error.message : '记录配额使用失败'
        }
      })
    }
  })
}