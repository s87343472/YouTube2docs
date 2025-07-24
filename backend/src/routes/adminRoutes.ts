import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { userPlanManagementService } from '../services/userPlanManagementService'
import { requireAuth } from '../middleware/authMiddleware'
import { logger, LogCategory } from '../utils/logger'
import { z } from 'zod'

/**
 * 管理员路由
 * 提供用户计划管理、系统管理等功能
 */

// 请求体验证schemas
const upgradeUserSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  newPlan: z.enum(['free', 'basic', 'pro', 'enterprise'], {
    errorMap: () => ({ message: '计划类型无效，支持: free, basic, pro, enterprise' })
  }),
  reason: z.string().min(1, '升级原因不能为空').max(500, '升级原因过长')
})

const batchUpgradeSchema = z.object({
  emails: z.array(z.string().email()).min(1, '至少需要一个邮箱').max(100, '批量操作最多100个用户'),
  newPlan: z.enum(['free', 'basic', 'pro', 'enterprise']),
  reason: z.string().min(1, '升级原因不能为空').max(500, '升级原因过长')
})

// 简单的管理员权限检查中间件
async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  // 这里可以根据实际需求实现更复杂的权限检查
  // 目前简化处理，可以通过用户邮箱或特殊权限字段来判断
  const user = request.user
  
  if (!user) {
    return reply.code(401).send({
      success: false,
      message: '需要登录'
    })
  }
  
  // 简单的管理员检查 - 可以根据需要修改
  const adminEmails = [
    'admin@example.com',
    'sagasu718@gmail.com' // 添加你的邮箱作为管理员
  ]
  
  if (!adminEmails.includes(user.email)) {
    return reply.code(403).send({
      success: false,
      message: '需要管理员权限'
    })
  }
}

export async function adminRoutes(fastify: FastifyInstance) {
  
  /**
   * 升级单个用户计划
   * POST /api/admin/users/upgrade
   */
  fastify.post('/admin/users/upgrade', { 
    preHandler: [requireAuth, requireAdmin] 
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const validatedData = upgradeUserSchema.parse(request.body)
      const operatorId = request.user?.id
      
      const result = await userPlanManagementService.upgradeUserPlan(
        validatedData.email,
        validatedData.newPlan,
        validatedData.reason,
        operatorId
      )
      
      logger.info('Admin user plan upgrade request', undefined, {
        operatorId,
        operatorEmail: request.user?.email,
        targetEmail: validatedData.email,
        newPlan: validatedData.newPlan,
        success: result.success
      }, LogCategory.USER)
      
      const statusCode = result.success ? 200 : 400
      
      return reply.code(statusCode).send({
        success: result.success,
        message: result.message,
        data: result
      })
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          message: '输入数据验证失败',
          errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        })
      }
      
      logger.error('Admin upgrade user failed', error as Error, {
        operatorId: request.user?.id,
        body: request.body
      }, LogCategory.USER)
      
      return reply.code(500).send({
        success: false,
        message: '升级用户计划失败'
      })
    }
  })
  
  /**
   * 批量升级用户计划
   * POST /api/admin/users/batch-upgrade
   */
  fastify.post('/admin/users/batch-upgrade', { 
    preHandler: [requireAuth, requireAdmin] 
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const validatedData = batchUpgradeSchema.parse(request.body)
      const operatorId = request.user?.id
      
      logger.info('Admin batch upgrade request started', undefined, {
        operatorId,
        operatorEmail: request.user?.email,
        userCount: validatedData.emails.length,
        newPlan: validatedData.newPlan
      }, LogCategory.USER)
      
      const result = await userPlanManagementService.batchUpgradeUsers(
        validatedData.emails,
        validatedData.newPlan,
        validatedData.reason,
        operatorId
      )
      
      logger.info('Admin batch upgrade request completed', undefined, {
        operatorId,
        totalUsers: result.totalUsers,
        successCount: result.successCount,
        failureCount: result.failureCount
      }, LogCategory.USER)
      
      return reply.send({
        success: true,
        message: `批量升级完成：成功 ${result.successCount}，失败 ${result.failureCount}`,
        data: result
      })
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          message: '输入数据验证失败',
          errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        })
      }
      
      logger.error('Admin batch upgrade failed', error as Error, {
        operatorId: request.user?.id,
        body: request.body
      }, LogCategory.USER)
      
      return reply.code(500).send({
        success: false,
        message: error instanceof Error ? error.message : '批量升级失败'
      })
    }
  })
  
  /**
   * 获取用户计划变更历史
   * GET /api/admin/users/:userId/plan-history
   */
  fastify.get('/admin/users/:userId/plan-history', { 
    preHandler: [requireAuth, requireAdmin] 
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { userId } = request.params as { userId: string }
      const { limit = 50 } = request.query as { limit?: number }
      
      const history = await userPlanManagementService.getUserPlanHistory(userId, limit)
      
      return reply.send({
        success: true,
        data: {
          userId,
          history
        }
      })
      
    } catch (error) {
      logger.error('Failed to get user plan history', error as Error, {
        userId: (request.params as any)?.userId,
        operatorId: request.user?.id
      }, LogCategory.USER)
      
      return reply.code(500).send({
        success: false,
        message: '获取用户计划历史失败'
      })
    }
  })
  
  /**
   * 获取所有计划变更历史（分页）
   * GET /api/admin/plan-changes
   */
  fastify.get('/admin/plan-changes', { 
    preHandler: [requireAuth, requireAdmin] 
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { limit = 100, offset = 0 } = request.query as { limit?: number, offset?: number }
      
      const changes = await userPlanManagementService.getAllPlanChanges(limit, offset)
      
      return reply.send({
        success: true,
        data: {
          changes,
          pagination: {
            limit,
            offset,
            count: changes.length
          }
        }
      })
      
    } catch (error) {
      logger.error('Failed to get all plan changes', error as Error, {
        operatorId: request.user?.id
      }, LogCategory.USER)
      
      return reply.code(500).send({
        success: false,
        message: '获取计划变更历史失败'
      })
    }
  })
  
  /**
   * 获取计划统计信息
   * GET /api/admin/plan-statistics
   */
  fastify.get('/admin/plan-statistics', { 
    preHandler: [requireAuth, requireAdmin] 
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const statistics = await userPlanManagementService.getPlanStatistics()
      
      return reply.send({
        success: true,
        data: statistics
      })
      
    } catch (error) {
      logger.error('Failed to get plan statistics', error as Error, {
        operatorId: request.user?.id
      }, LogCategory.USER)
      
      return reply.code(500).send({
        success: false,
        message: '获取计划统计失败'
      })
    }
  })
  
  /**
   * 管理员工具：快速升级用户（用于测试和特殊情况）
   * POST /api/admin/quick-upgrade
   */
  fastify.post('/admin/quick-upgrade', { 
    preHandler: [requireAuth, requireAdmin] 
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const quickUpgradeSchema = z.object({
        email: z.string().email(),
        plan: z.enum(['free', 'basic', 'pro', 'enterprise'])
      })
      
      const { email, plan } = quickUpgradeSchema.parse(request.body)
      const operatorId = request.user?.id
      
      const result = await userPlanManagementService.upgradeUserPlan(
        email,
        plan,
        `管理员快速升级 - 操作员: ${request.user?.email}`,
        operatorId
      )
      
      return reply.send({
        success: result.success,
        message: result.message,
        data: result
      })
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          message: '参数错误',
          errors: error.errors
        })
      }
      
      return reply.code(500).send({
        success: false,
        message: '快速升级失败'
      })
    }
  })
}