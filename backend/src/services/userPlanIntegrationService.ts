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

      // 获取订阅信息
      const subscription = await QuotaService.getUserSubscription(userId)
      
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
      // 直接使用字符串userId
      
      // 检查是否已有订阅
      const existingSubscription = await QuotaService.getUserSubscription(userId)
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
        await QuotaService.createFreeSubscription(userId)
      } else {
        // 创建付费订阅（测试或特殊情况）
        const expiresAt = new Date()
        expiresAt.setMonth(expiresAt.getMonth() + 1) // 默认1个月

        await client.query(`
          INSERT INTO user_subscriptions (user_id, plan_type, status, expires_at, payment_method)
          VALUES ($1, $2, 'active', $3, 'system_init')
        `, [userId, initialPlan, expiresAt])
      }

      // 同步用户表中的计划信息
      await userService.updateUser(userId, {
        plan: initialPlan as any,
        monthly_quota: quotaPlan.monthlyVideoQuota
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
      // 直接使用字符串userId
      
      // 获取最新的订阅信息
      const subscription = await QuotaService.getUserSubscription(userId)
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
        monthly_quota: quotaPlan.monthlyVideoQuota
      })

      logger.info('User plan status synced', undefined, { 
        userId, 
        planType: subscription.planType,
        monthly_quota: quotaPlan.monthlyVideoQuota 
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
      // 直接使用字符串userId
      
      // 检查配额
      const quotaCheck = await QuotaService.checkQuota(userId, quotaType, amount, metadata)
      
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
        userId,
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
      // 直接使用字符串userId
      
      // 升级订阅
      const newSubscription = await QuotaService.upgradeUserPlan(userId, newPlanType, paymentMethod)
      
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
      // 直接使用字符串userId
      
      // 获取基础信息
      const user = await userService.findUserById(userId)
      if (!user) {
        throw new Error('User not found')
      }

      // 获取订阅和计划信息
      const subscription = await QuotaService.getUserSubscription(userId)
      const quotaPlan = subscription ? await QuotaService.getQuotaPlan(subscription.planType) : null
      
      // 获取配额使用情况
      const quotaUsages = await QuotaService.getUserAllQuotaUsage(userId)
      
      // 获取配额预警
      const alerts = await QuotaService.getUserQuotaAlerts(userId)

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
      const userCountResult = await pool.query('SELECT COUNT(*) as count FROM users')
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
        FROM users u
        LEFT JOIN user_subscriptions s ON u.id = s.user_id AND s.status = 'active'
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