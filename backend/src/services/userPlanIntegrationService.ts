import { logger, LogCategory } from '../utils/logger'
import { userService, User } from './userService'
import { QuotaService, UserSubscription, QuotaPlan } from './quotaService'
import { pool } from '../utils/database'

/**
 * 用户-付费集成服务
 * 负责将新的认证系统与现有的配额/订阅系统进行集成
 * 确保用户认证和付费功能的无缝衔接
 */

export interface UserWithPlan extends User {
  subscription?: UserSubscription
  quotaPlan?: QuotaPlan
}

export interface PlanMigrationResult {
  success: boolean
  migratedCount: number
  errors: string[]
}

export class UserPlanIntegrationService {
  
  /**
   * 获取用户完整信息（包含订阅和计划信息）
   */
  async getUserWithPlan(userId: string): Promise<UserWithPlan | null> {
    try {
      // 获取基础用户信息
      const user = await userService.findUserById(userId)
      if (!user) {
        return null
      }

      // 从字符串ID转换为数字ID（用于旧系统兼容）
      const numericUserId = await this.getOrCreateNumericUserId(userId)
      
      // 获取订阅信息
      const subscription = await QuotaService.getUserSubscription(numericUserId)
      
      // 获取配额计划信息
      let quotaPlan: QuotaPlan | null = null
      if (subscription) {
        quotaPlan = await QuotaService.getQuotaPlan(subscription.planType)
      }

      const result: UserWithPlan = {
        ...user,
        subscription: subscription || undefined,
        quotaPlan: quotaPlan || undefined
      }

      logger.info('User with plan retrieved', undefined, { 
        userId, 
        plan: subscription?.planType || 'none',
        hasQuotaInfo: !!quotaPlan 
      }, LogCategory.USER)

      return result
    } catch (error) {
      logger.error('Failed to get user with plan', error as Error, { userId }, LogCategory.USER)
      throw new Error('获取用户计划信息失败')
    }
  }

  /**
   * 为新用户初始化付费系统数据
   */
  async initializeUserPlan(userId: string, initialPlan: string = 'free'): Promise<void> {
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')

      // 获取或创建数字用户ID
      const numericUserId = await this.getOrCreateNumericUserId(userId)
      
      // 检查是否已有订阅
      const existingSubscription = await QuotaService.getUserSubscription(numericUserId)
      if (existingSubscription) {
        logger.info('User already has subscription', undefined, { userId, planType: existingSubscription.planType }, LogCategory.USER)
        await client.query('COMMIT')
        return
      }

      // 验证计划是否存在
      const quotaPlan = await QuotaService.getQuotaPlan(initialPlan)
      if (!quotaPlan) {
        throw new Error(`Invalid plan type: ${initialPlan}`)
      }

      // 创建免费订阅或指定计划的订阅
      if (initialPlan === 'free') {
        await QuotaService.createFreeSubscription(numericUserId)
      } else {
        // 创建付费订阅（测试或特殊情况）
        const expiresAt = new Date()
        expiresAt.setMonth(expiresAt.getMonth() + 1) // 默认1个月

        await client.query(`
          INSERT INTO user_subscriptions (user_id, plan_type, status, expires_at, payment_method)
          VALUES ($1, $2, 'active', $3, 'system_init')
        `, [numericUserId, initialPlan, expiresAt])
      }

      // 同步用户表中的计划信息
      await userService.updateUser(userId, {
        plan: initialPlan as any,
        monthlyQuota: quotaPlan.monthlyVideoQuota
      })

      await client.query('COMMIT')
      logger.info('User plan initialized', undefined, { userId, initialPlan }, LogCategory.USER)
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error('Failed to initialize user plan', error as Error, { userId, initialPlan }, LogCategory.USER)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * 同步用户计划状态
   * 确保 user 表中的计划信息与 user_subscriptions 表一致
   */
  async syncUserPlanStatus(userId: string): Promise<void> {
    try {
      const numericUserId = await this.getOrCreateNumericUserId(userId)
      
      // 获取最新的订阅信息
      const subscription = await QuotaService.getUserSubscription(numericUserId)
      if (!subscription) {
        logger.warn('No subscription found for user during sync', undefined, { userId }, LogCategory.USER)
        return
      }

      // 获取配额计划信息
      const quotaPlan = await QuotaService.getQuotaPlan(subscription.planType)
      if (!quotaPlan) {
        logger.error('Quota plan not found during sync', undefined, { userId, planType: subscription.planType }, LogCategory.USER)
        return
      }

      // 更新 user 表中的相关字段
      await userService.updateUser(userId, {
        plan: subscription.planType as any,
        monthlyQuota: quotaPlan.monthlyVideoQuota
      })

      logger.info('User plan status synced', undefined, { 
        userId, 
        planType: subscription.planType,
        monthlyQuota: quotaPlan.monthlyVideoQuota 
      }, LogCategory.USER)
    } catch (error) {
      logger.error('Failed to sync user plan status', error as Error, { userId }, LogCategory.USER)
      throw new Error('同步用户计划状态失败')
    }
  }

  /**
   * 检查用户配额并记录使用
   */
  async checkAndRecordQuotaUsage(
    userId: string,
    quotaType: string,
    amount: number = 1,
    metadata?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const numericUserId = await this.getOrCreateNumericUserId(userId)
      
      // 检查配额
      const quotaCheck = await QuotaService.checkQuota(numericUserId, quotaType, amount, metadata)
      
      if (!quotaCheck.allowed) {
        logger.warn('Quota check failed', undefined, { 
          userId, 
          quotaType, 
          amount, 
          reason: quotaCheck.reason 
        }, LogCategory.USER)
        
        return {
          allowed: false,
          reason: quotaCheck.reason
        }
      }

      // 记录配额使用
      await QuotaService.recordQuotaUsage(
        numericUserId,
        quotaType,
        'usage',
        amount,
        metadata?.resourceId,
        metadata?.resourceType,
        metadata,
        ipAddress,
        userAgent
      )

      logger.info('Quota usage recorded', undefined, { 
        userId, 
        quotaType, 
        amount 
      }, LogCategory.USER)

      return { allowed: true }
    } catch (error) {
      logger.error('Failed to check and record quota usage', error as Error, { 
        userId, 
        quotaType, 
        amount 
      }, LogCategory.USER)
      
      return {
        allowed: false,
        reason: '配额检查失败'
      }
    }
  }

  /**
   * 升级用户计划
   */
  async upgradeUserPlan(
    userId: string,
    newPlanType: string,
    paymentMethod: string = 'unknown'
  ): Promise<UserSubscription> {
    try {
      const numericUserId = await this.getOrCreateNumericUserId(userId)
      
      // 升级订阅
      const newSubscription = await QuotaService.upgradeUserPlan(numericUserId, newPlanType, paymentMethod)
      
      // 同步用户表
      await this.syncUserPlanStatus(userId)
      
      logger.info('User plan upgraded via integration service', undefined, { 
        userId, 
        newPlanType, 
        paymentMethod 
      }, LogCategory.USER)
      
      return newSubscription
    } catch (error) {
      logger.error('Failed to upgrade user plan via integration service', error as Error, { 
        userId, 
        newPlanType 
      }, LogCategory.USER)
      throw error
    }
  }

  /**
   * 获取用户的所有配额使用情况
   */
  async getUserQuotaOverview(userId: string): Promise<{
    user: User
    subscription: UserSubscription | null
    quotaPlan: QuotaPlan | null
    quotaUsages: any[]
    alerts: any[]
  }> {
    try {
      const numericUserId = await this.getOrCreateNumericUserId(userId)
      
      // 获取基础信息
      const user = await userService.findUserById(userId)
      if (!user) {
        throw new Error('User not found')
      }

      // 获取订阅和计划信息
      const subscription = await QuotaService.getUserSubscription(numericUserId)
      const quotaPlan = subscription ? await QuotaService.getQuotaPlan(subscription.planType) : null
      
      // 获取配额使用情况
      const quotaUsages = await QuotaService.getUserAllQuotaUsage(numericUserId)
      
      // 获取配额预警
      const alerts = await QuotaService.getUserQuotaAlerts(numericUserId)

      return {
        user,
        subscription,
        quotaPlan,
        quotaUsages,
        alerts
      }
    } catch (error) {
      logger.error('Failed to get user quota overview', error as Error, { userId }, LogCategory.USER)
      throw new Error('获取用户配额概览失败')
    }
  }

  /**
   * 获取或创建数字用户ID（兼容旧系统）
   * 新认证系统使用UUID，旧配额系统使用自增ID
   */
  private async getOrCreateNumericUserId(stringUserId: string): Promise<number> {
    try {
      // 检查是否已有映射关系
      let result = await pool.query(`
        SELECT numeric_id FROM user_id_mapping WHERE string_id = $1
      `, [stringUserId])

      if (result.rows.length > 0) {
        return result.rows[0].numeric_id
      }

      // 创建新的映射关系
      result = await pool.query(`
        INSERT INTO user_id_mapping (string_id)
        VALUES ($1)
        RETURNING numeric_id
      `, [stringUserId])

      const numericId = result.rows[0].numeric_id
      
      logger.info('Created numeric user ID mapping', undefined, { 
        stringUserId, 
        numericId 
      }, LogCategory.USER)

      return numericId
    } catch (error) {
      logger.error('Failed to get or create numeric user ID', error as Error, { stringUserId }, LogCategory.USER)
      throw new Error('用户ID映射失败')
    }
  }

  /**
   * 根据数字ID获取字符串ID
   */
  async getStringUserId(numericUserId: number): Promise<string | null> {
    try {
      const result = await pool.query(`
        SELECT string_id FROM user_id_mapping WHERE numeric_id = $1
      `, [numericUserId])

      return result.rows[0]?.string_id || null
    } catch (error) {
      logger.error('Failed to get string user ID', error as Error, { numericUserId }, LogCategory.USER)
      return null
    }
  }

  /**
   * 批量迁移现有用户数据到新认证系统
   * 这个方法用于系统升级时的数据迁移
   */
  async migrateExistingUsers(): Promise<PlanMigrationResult> {
    const client = await pool.connect()
    const errors: string[] = []
    let migratedCount = 0

    try {
      await client.query('BEGIN')

      // 获取所有旧系统中的订阅用户
      const existingSubscriptions = await client.query(`
        SELECT DISTINCT user_id FROM user_subscriptions WHERE status = 'active'
      `)

      for (const sub of existingSubscriptions.rows) {
        try {
          const numericUserId = sub.user_id
          
          // 检查是否已有对应的新系统用户
          const stringUserId = await this.getStringUserId(numericUserId)
          if (stringUserId) {
            // 已经迁移过
            continue
          }

          // 创建映射关系（这里假设有其他方式建立对应关系）
          // 实际实现中需要根据具体情况调整
          logger.warn('Found orphaned numeric user ID during migration', undefined, { numericUserId }, LogCategory.USER)
          
        } catch (error) {
          errors.push(`Failed to migrate user ${sub.user_id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      await client.query('COMMIT')
      
      const result: PlanMigrationResult = {
        success: errors.length === 0,
        migratedCount,
        errors
      }

      logger.info('User migration completed', undefined, result, LogCategory.USER)
      return result
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error('User migration failed', error as Error, {}, LogCategory.USER)
      
      return {
        success: false,
        migratedCount: 0,
        errors: [`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      }
    } finally {
      client.release()
    }
  }

  /**
   * 健康检查：验证用户认证和付费系统的一致性
   */
  async healthCheck(): Promise<{
    healthy: boolean
    issues: string[]
    statistics: {
      totalUsers: number
      usersWithSubscriptions: number
      inconsistentUsers: number
    }
  }> {
    const issues: string[] = []
    let totalUsers = 0
    let usersWithSubscriptions = 0
    let inconsistentUsers = 0

    try {
      // 统计总用户数
      const userCountResult = await pool.query('SELECT COUNT(*) as count FROM "user"')
      totalUsers = parseInt(userCountResult.rows[0].count)

      // 统计有订阅的用户数
      const subscriptionCountResult = await pool.query(`
        SELECT COUNT(DISTINCT user_id) as count 
        FROM user_subscriptions 
        WHERE status = 'active'
      `)
      usersWithSubscriptions = parseInt(subscriptionCountResult.rows[0].count)

      // 检查数据一致性
      const inconsistentResult = await pool.query(`
        SELECT u.id, u.plan, s.plan_type
        FROM "user" u
        LEFT JOIN user_id_mapping m ON u.id = m.string_id
        LEFT JOIN user_subscriptions s ON m.numeric_id = s.user_id AND s.status = 'active'
        WHERE (u.plan IS NOT NULL AND s.plan_type IS NULL)
           OR (u.plan IS NULL AND s.plan_type IS NOT NULL)
           OR (u.plan != s.plan_type)
      `)
      
      inconsistentUsers = inconsistentResult.rows.length

      if (inconsistentUsers > 0) {
        issues.push(`Found ${inconsistentUsers} users with inconsistent plan data`)
      }

      const healthy = issues.length === 0

      logger.info('User plan integration health check completed', undefined, {
        healthy,
        totalUsers,
        usersWithSubscriptions,
        inconsistentUsers,
        issueCount: issues.length
      }, LogCategory.USER)

      return {
        healthy,
        issues,
        statistics: {
          totalUsers,
          usersWithSubscriptions,
          inconsistentUsers
        }
      }
    } catch (error) {
      logger.error('Health check failed', error as Error, {}, LogCategory.USER)
      
      return {
        healthy: false,
        issues: [`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        statistics: {
          totalUsers,
          usersWithSubscriptions,
          inconsistentUsers
        }
      }
    }
  }
}

export const userPlanIntegrationService = new UserPlanIntegrationService()