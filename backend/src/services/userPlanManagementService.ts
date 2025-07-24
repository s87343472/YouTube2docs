import { pool } from '../utils/database'
import { logger, LogCategory } from '../utils/logger'
import { userService } from './userService'
import { QuotaService } from './quotaService'
import { z } from 'zod'

/**
 * 用户计划管理服务
 * 提供用户计划升级、降级、批量操作等功能
 */

export interface PlanUpgradeResult {
  success: boolean
  userId: string
  email: string
  oldPlan: string
  newPlan: string
  message: string
  error?: string
}

export interface BatchUpgradeResult {
  totalUsers: number
  successCount: number
  failureCount: number
  results: PlanUpgradeResult[]
  errors: string[]
}

export interface PlanChangeLog {
  id: string
  userId: string
  email: string
  oldPlan: string
  newPlan: string
  reason: string
  operatorId?: string
  operatorEmail?: string
  createdAt: Date
}

// 验证schemas
const upgradeUserSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  newPlan: z.enum(['free', 'basic', 'pro', 'enterprise'], {
    errorMap: () => ({ message: '计划类型无效' })
  }),
  reason: z.string().min(1, '升级原因不能为空').max(500, '升级原因过长')
})

const batchUpgradeSchema = z.object({
  emails: z.array(z.string().email()).min(1, '至少需要一个邮箱').max(100, '批量操作最多100个用户'),
  newPlan: z.enum(['free', 'basic', 'pro', 'enterprise']),
  reason: z.string().min(1, '升级原因不能为空').max(500, '升级原因过长')
})

export class UserPlanManagementService {
  
  /**
   * 升级单个用户计划
   */
  async upgradeUserPlan(
    email: string, 
    newPlan: string, 
    reason: string, 
    operatorId?: string
  ): Promise<PlanUpgradeResult> {
    const client = await pool.connect()
    
    try {
      // 验证输入
      const validatedData = upgradeUserSchema.parse({ email, newPlan, reason })
      
      await client.query('BEGIN')
      
      // 获取用户信息
      const user = await userService.findUserByEmail(validatedData.email)
      if (!user) {
        return {
          success: false,
          userId: '',
          email: validatedData.email,
          oldPlan: '',
          newPlan: validatedData.newPlan,
          message: '用户不存在',
          error: 'USER_NOT_FOUND'
        }
      }
      
      const oldPlan = user.plan
      
      // 检查是否需要升级
      if (oldPlan === validatedData.newPlan) {
        return {
          success: false,
          userId: user.id,
          email: user.email,
          oldPlan,
          newPlan: validatedData.newPlan,
          message: '用户已经是该计划',
          error: 'ALREADY_ON_PLAN'
        }
      }
      
      // 验证新计划是否存在
      const quotaPlan = await QuotaService.getQuotaPlan(validatedData.newPlan)
      if (!quotaPlan) {
        return {
          success: false,
          userId: user.id,
          email: user.email,
          oldPlan,
          newPlan: validatedData.newPlan,
          message: '计划类型不存在',
          error: 'INVALID_PLAN'
        }
      }
      
      // 1. 更新 users 表
      const updateUserQuery = `
        UPDATE users 
        SET plan = $1, monthly_quota = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `
      await client.query(updateUserQuery, [
        validatedData.newPlan, 
        quotaPlan.monthlyVideoQuota, 
        user.id
      ])
      
      // 2. 更新或创建订阅记录
      const updateSubscriptionQuery = `
        UPDATE user_subscriptions 
        SET plan_type = $1, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $2
      `
      const subscriptionResult = await client.query(updateSubscriptionQuery, [
        validatedData.newPlan, 
        user.id
      ])
      
      if (subscriptionResult.rowCount === 0) {
        // 创建新的订阅记录
        const createSubscriptionQuery = `
          INSERT INTO user_subscriptions (user_id, plan_type, status, started_at)
          VALUES ($1, $2, 'active', CURRENT_TIMESTAMP)
        `
        await client.query(createSubscriptionQuery, [user.id, validatedData.newPlan])
      }
      
      // 3. 记录升级日志
      await this.logPlanChange(
        user.id,
        user.email,
        oldPlan,
        validatedData.newPlan,
        validatedData.reason,
        operatorId,
        client
      )
      
      await client.query('COMMIT')
      
      logger.info('User plan upgraded successfully', undefined, {
        userId: user.id,
        email: user.email,
        oldPlan,
        newPlan: validatedData.newPlan,
        reason: validatedData.reason,
        operatorId
      }, LogCategory.USER)
      
      return {
        success: true,
        userId: user.id,
        email: user.email,
        oldPlan,
        newPlan: validatedData.newPlan,
        message: `成功从 ${oldPlan} 升级到 ${validatedData.newPlan}`
      }
      
    } catch (error) {
      await client.query('ROLLBACK')
      
      if (error instanceof z.ZodError) {
        return {
          success: false,
          userId: '',
          email,
          oldPlan: '',
          newPlan,
          message: '输入数据验证失败',
          error: error.errors.map(e => e.message).join(', ')
        }
      }
      
      logger.error('Failed to upgrade user plan', error as Error, {
        email,
        newPlan,
        reason
      }, LogCategory.USER)
      
      return {
        success: false,
        userId: '',
        email,
        oldPlan: '',
        newPlan,
        message: '升级失败',
        error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
      }
    } finally {
      client.release()
    }
  }
  
  /**
   * 批量升级用户计划
   */
  async batchUpgradeUsers(
    emails: string[],
    newPlan: string,
    reason: string,
    operatorId?: string
  ): Promise<BatchUpgradeResult> {
    try {
      // 验证输入
      const validatedData = batchUpgradeSchema.parse({ emails, newPlan, reason })
      
      const results: PlanUpgradeResult[] = []
      const errors: string[] = []
      let successCount = 0
      let failureCount = 0
      
      logger.info('Starting batch user plan upgrade', undefined, {
        totalUsers: validatedData.emails.length,
        newPlan: validatedData.newPlan,
        reason: validatedData.reason,
        operatorId
      }, LogCategory.USER)
      
      // 逐个处理用户升级
      for (const email of validatedData.emails) {
        try {
          const result = await this.upgradeUserPlan(
            email,
            validatedData.newPlan,
            validatedData.reason,
            operatorId
          )
          
          results.push(result)
          
          if (result.success) {
            successCount++
          } else {
            failureCount++
            if (result.error) {
              errors.push(`${email}: ${result.error}`)
            }
          }
          
          // 添加短暂延迟，避免数据库压力
          await new Promise(resolve => setTimeout(resolve, 100))
          
        } catch (error) {
          failureCount++
          const errorMsg = error instanceof Error ? error.message : 'Unknown error'
          errors.push(`${email}: ${errorMsg}`)
          
          results.push({
            success: false,
            userId: '',
            email,
            oldPlan: '',
            newPlan: validatedData.newPlan,
            message: '处理失败',
            error: errorMsg
          })
        }
      }
      
      logger.info('Batch user plan upgrade completed', undefined, {
        totalUsers: validatedData.emails.length,
        successCount,
        failureCount,
        newPlan: validatedData.newPlan
      }, LogCategory.USER)
      
      return {
        totalUsers: validatedData.emails.length,
        successCount,
        failureCount,
        results,
        errors
      }
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`输入验证失败: ${error.errors.map(e => e.message).join(', ')}`)
      }
      
      logger.error('Batch upgrade failed', error as Error, {
        emails: emails.length,
        newPlan,
        reason
      }, LogCategory.USER)
      
      throw error
    }
  }
  
  /**
   * 获取用户计划变更历史
   */
  async getUserPlanHistory(userId: string, limit: number = 50): Promise<PlanChangeLog[]> {
    try {
      const query = `
        SELECT id, user_id, email, old_plan, new_plan, reason, 
               operator_id, operator_email, created_at
        FROM user_plan_change_logs
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `
      
      const result = await pool.query(query, [userId, limit])
      
      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        email: row.email,
        oldPlan: row.old_plan,
        newPlan: row.new_plan,
        reason: row.reason,
        operatorId: row.operator_id,
        operatorEmail: row.operator_email,
        createdAt: row.created_at
      }))
      
    } catch (error) {
      logger.error('Failed to get user plan history', error as Error, { userId }, LogCategory.USER)
      throw new Error('获取用户计划历史失败')
    }
  }
  
  /**
   * 获取所有计划变更历史（管理员功能）
   */
  async getAllPlanChanges(limit: number = 100, offset: number = 0): Promise<PlanChangeLog[]> {
    try {
      const query = `
        SELECT id, user_id, email, old_plan, new_plan, reason, 
               operator_id, operator_email, created_at
        FROM user_plan_change_logs
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
      `
      
      const result = await pool.query(query, [limit, offset])
      
      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        email: row.email,
        oldPlan: row.old_plan,
        newPlan: row.new_plan,
        reason: row.reason,
        operatorId: row.operator_id,
        operatorEmail: row.operator_email,
        createdAt: row.created_at
      }))
      
    } catch (error) {
      logger.error('Failed to get all plan changes', error as Error, { limit, offset }, LogCategory.USER)
      throw new Error('获取计划变更历史失败')
    }
  }
  
  /**
   * 记录计划变更日志
   */
  private async logPlanChange(
    userId: string,
    email: string,
    oldPlan: string,
    newPlan: string,
    reason: string,
    operatorId?: string,
    client?: any
  ): Promise<void> {
    const dbClient = client || pool
    
    try {
      // 如果有操作员ID，获取操作员邮箱
      let operatorEmail = null
      if (operatorId) {
        const operator = await userService.findUserById(operatorId)
        operatorEmail = operator?.email || null
      }
      
      const query = `
        INSERT INTO user_plan_change_logs 
        (id, user_id, email, old_plan, new_plan, reason, operator_id, operator_email)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)
      `
      
      await dbClient.query(query, [
        userId,
        email,
        oldPlan,
        newPlan,
        reason,
        operatorId,
        operatorEmail
      ])
      
    } catch (error) {
      logger.error('Failed to log plan change', error as Error, {
        userId,
        email,
        oldPlan,
        newPlan,
        reason,
        operatorId
      }, LogCategory.USER)
      // 不抛出错误，因为这不应该阻止主要操作
    }
  }
  
  /**
   * 获取计划统计信息
   */
  async getPlanStatistics(): Promise<any> {
    try {
      const query = `
        SELECT 
          plan,
          COUNT(*) as user_count,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_users_30d
        FROM users
        GROUP BY plan
        ORDER BY 
          CASE plan 
            WHEN 'enterprise' THEN 4
            WHEN 'pro' THEN 3
            WHEN 'basic' THEN 2
            WHEN 'free' THEN 1
            ELSE 0
          END DESC
      `
      
      const result = await pool.query(query)
      
      return {
        planDistribution: result.rows,
        totalUsers: result.rows.reduce((sum, row) => sum + parseInt(row.user_count), 0),
        totalNewUsers30d: result.rows.reduce((sum, row) => sum + parseInt(row.new_users_30d), 0)
      }
      
    } catch (error) {
      logger.error('Failed to get plan statistics', error as Error, {}, LogCategory.USER)
      throw new Error('获取计划统计失败')
    }
  }
}

export const userPlanManagementService = new UserPlanManagementService()