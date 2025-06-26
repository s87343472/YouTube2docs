import { pool } from '../utils/database'
import { logger } from '../utils/logger'

/**
 * 用户配额管理服务
 * 负责检查、记录、管理用户的各种配额使用情况
 */

export interface QuotaPlan {
  id: number
  planType: string
  name: string
  description: string
  priceMonthly: number
  priceYearly: number
  monthlyVideoQuota: number
  maxVideoDuration: number
  maxFileSize: number
  hasPriorityProcessing: boolean
  hasAdvancedExport: boolean
  hasApiAccess: boolean
  hasTeamManagement: boolean
  hasCustomBranding: boolean
  maxStorageGb: number
  maxSharedItems: number
  monthlyDurationQuota: number // 新增：每月总时长限制(分钟)
}

export interface UserSubscription {
  id: number
  userId: number
  planType: string
  status: string
  startedAt: Date
  expiresAt?: Date
  autoRenew: boolean
  paymentMethod?: string
}

export interface QuotaUsage {
  quotaType: string
  usedAmount: number
  maxAmount: number
  percentage: number
  periodStart: Date
  periodEnd: Date
}

export interface QuotaCheckResult {
  allowed: boolean
  reason?: string
  currentUsage?: QuotaUsage
  upgradeRequired?: boolean
  suggestedPlan?: string
}

export class QuotaService {
  
  /**
   * 获取用户当前订阅信息
   */
  static async getUserSubscription(userId: number): Promise<UserSubscription | null> {
    try {
      const result = await pool.query(`
        SELECT 
          id, user_id, plan_type, status, started_at, 
          expires_at, auto_renew, payment_method
        FROM user_subscriptions 
        WHERE user_id = $1 AND status = 'active'
        ORDER BY created_at DESC 
        LIMIT 1
      `, [userId])

      if (result.rows.length === 0) {
        // 用户没有订阅记录，创建免费版订阅
        return await this.createFreeSubscription(userId)
      }

      const row = result.rows[0]
      return {
        id: row.id,
        userId: row.user_id,
        planType: row.plan_type,
        status: row.status,
        startedAt: row.started_at,
        expiresAt: row.expires_at,
        autoRenew: row.auto_renew,
        paymentMethod: row.payment_method
      }
    } catch (error) {
      logger.error('Failed to get user subscription', { userId, error })
      throw new Error('获取用户订阅信息失败')
    }
  }

  /**
   * 创建免费版订阅
   */
  static async createFreeSubscription(userId: number): Promise<UserSubscription> {
    try {
      const result = await pool.query(`
        INSERT INTO user_subscriptions (user_id, plan_type, status)
        VALUES ($1, 'free', 'active')
        RETURNING id, user_id, plan_type, status, started_at, expires_at, auto_renew, payment_method
      `, [userId])

      const row = result.rows[0]
      return {
        id: row.id,
        userId: row.user_id,
        planType: row.plan_type,
        status: row.status,
        startedAt: row.started_at,
        expiresAt: row.expires_at,
        autoRenew: row.auto_renew,
        paymentMethod: row.payment_method
      }
    } catch (error) {
      logger.error('Failed to create free subscription', { userId, error })
      throw new Error('创建免费订阅失败')
    }
  }

  /**
   * 获取配额计划信息
   */
  static async getQuotaPlan(planType: string): Promise<QuotaPlan | null> {
    try {
      const result = await pool.query(`
        SELECT 
          id, plan_type, name, description, price_monthly, price_yearly,
          monthly_video_quota, max_video_duration, max_file_size,
          has_priority_processing, has_advanced_export, has_api_access,
          has_team_management, has_custom_branding, max_storage_gb, max_shared_items,
          monthly_duration_quota
        FROM quota_plans 
        WHERE plan_type = $1 AND is_active = true
      `, [planType])

      if (result.rows.length === 0) {
        return null
      }

      const row = result.rows[0]
      return {
        id: row.id,
        planType: row.plan_type,
        name: row.name,
        description: row.description,
        priceMonthly: parseFloat(row.price_monthly),
        priceYearly: parseFloat(row.price_yearly),
        monthlyVideoQuota: row.monthly_video_quota,
        maxVideoDuration: row.max_video_duration,
        maxFileSize: row.max_file_size,
        hasPriorityProcessing: row.has_priority_processing,
        hasAdvancedExport: row.has_advanced_export,
        hasApiAccess: row.has_api_access,
        hasTeamManagement: row.has_team_management,
        hasCustomBranding: row.has_custom_branding,
        maxStorageGb: row.max_storage_gb,
        maxSharedItems: row.max_shared_items,
        monthlyDurationQuota: row.monthly_duration_quota || 0
      }
    } catch (error) {
      logger.error('Failed to get quota plan', { planType, error })
      throw new Error('获取配额计划失败')
    }
  }

  /**
   * 获取所有可用的配额计划
   */
  static async getAllQuotaPlans(): Promise<QuotaPlan[]> {
    try {
      const result = await pool.query(`
        SELECT 
          id, plan_type, name, description, price_monthly, price_yearly,
          monthly_video_quota, max_video_duration, max_file_size,
          has_priority_processing, has_advanced_export, has_api_access,
          has_team_management, has_custom_branding, max_storage_gb, max_shared_items,
          monthly_duration_quota
        FROM quota_plans 
        WHERE is_active = true
        ORDER BY price_monthly ASC
      `)

      return result.rows.map(row => ({
        id: row.id,
        planType: row.plan_type,
        name: row.name,
        description: row.description,
        priceMonthly: parseFloat(row.price_monthly),
        priceYearly: parseFloat(row.price_yearly),
        monthlyVideoQuota: row.monthly_video_quota,
        maxVideoDuration: row.max_video_duration,
        maxFileSize: row.max_file_size,
        hasPriorityProcessing: row.has_priority_processing,
        hasAdvancedExport: row.has_advanced_export,
        hasApiAccess: row.has_api_access,
        hasTeamManagement: row.has_team_management,
        hasCustomBranding: row.has_custom_branding,
        maxStorageGb: row.max_storage_gb,
        maxSharedItems: row.max_shared_items,
        monthlyDurationQuota: row.monthly_duration_quota || 0
      }))
    } catch (error) {
      logger.error('Failed to get all quota plans', { error })
      throw new Error('获取配额计划列表失败')
    }
  }

  /**
   * 获取用户当前配额使用情况
   */
  static async getUserQuotaUsage(userId: number, quotaType: string): Promise<QuotaUsage | null> {
    try {
      // 获取当前月份的起始和结束时间
      const now = new Date()
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

      const result = await pool.query(`
        SELECT used_amount, period_start, period_end
        FROM user_quota_usage
        WHERE user_id = $1 AND quota_type = $2 
        AND period_start <= $3 AND period_end >= $3
      `, [userId, quotaType, now])

      // 获取用户订阅和配额计划
      const subscription = await this.getUserSubscription(userId)
      if (!subscription) {
        throw new Error('用户订阅信息不存在')
      }

      const plan = await this.getQuotaPlan(subscription.planType)
      if (!plan) {
        throw new Error('配额计划不存在')
      }

      let maxAmount = 0
      if (quotaType === 'video_processing') {
        maxAmount = plan.monthlyVideoQuota
      } else if (quotaType === 'shares') {
        maxAmount = plan.maxSharedItems
      }

      const usedAmount = result.rows.length > 0 ? result.rows[0].used_amount : 0
      const percentage = maxAmount > 0 ? Math.round((usedAmount / maxAmount) * 100) : 0

      return {
        quotaType,
        usedAmount,
        maxAmount,
        percentage,
        periodStart,
        periodEnd
      }
    } catch (error) {
      logger.error('Failed to get user quota usage', { userId, quotaType, error })
      throw new Error('获取配额使用情况失败')
    }
  }

  /**
   * 获取用户当前月度总时长使用情况
   */
  static async getUserMonthlyDurationUsage(userId: number): Promise<number> {
    try {
      const now = new Date()
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

      const result = await pool.query(`
        SELECT COALESCE(SUM(duration_minutes), 0) as total_duration
        FROM user_duration_usage
        WHERE user_id = $1 
        AND processed_at >= $2 AND processed_at <= $3
      `, [userId, periodStart, periodEnd])

      return result.rows[0]?.total_duration || 0
    } catch (error) {
      logger.error('Failed to get user monthly duration usage', { userId, error })
      throw new Error('获取用户月度时长使用失败')
    }
  }

  /**
   * 记录用户视频时长使用
   */
  static async recordDurationUsage(
    userId: number, 
    videoId: string, 
    durationMinutes: number
  ): Promise<void> {
    try {
      const now = new Date()
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

      await pool.query(`
        INSERT INTO user_duration_usage 
        (user_id, video_id, duration_minutes, period_start, period_end)
        VALUES ($1, $2, $3, $4, $5)
      `, [userId, videoId, durationMinutes, periodStart, periodEnd])

      logger.info('Duration usage recorded', {
        userId,
        videoId,
        durationMinutes
      })
    } catch (error) {
      logger.error('Failed to record duration usage', { userId, videoId, durationMinutes, error })
      throw new Error('记录时长使用失败')
    }
  }

  /**
   * 检查用户是否可以执行某个操作
   */
  static async checkQuota(
    userId: number, 
    quotaType: string, 
    amount: number = 1,
    metadata?: any
  ): Promise<QuotaCheckResult> {
    try {
      const subscription = await this.getUserSubscription(userId)
      if (!subscription) {
        return {
          allowed: false,
          reason: '用户订阅信息不存在'
        }
      }

      const plan = await this.getQuotaPlan(subscription.planType)
      if (!plan) {
        return {
          allowed: false,
          reason: '配额计划不存在'
        }
      }

      const usage = await this.getUserQuotaUsage(userId, quotaType)
      if (!usage) {
        return {
          allowed: false,
          reason: '无法获取配额使用情况'
        }
      }

      // 检查视频处理配额
      if (quotaType === 'video_processing') {
        // 1. 检查月度视频数量限制
        if (plan.monthlyVideoQuota > 0 && (usage.usedAmount + amount) > plan.monthlyVideoQuota) {
          return {
            allowed: false,
            reason: `月度视频处理次数已达上限 (${plan.monthlyVideoQuota}次)`,
            currentUsage: usage,
            upgradeRequired: true,
            suggestedPlan: this.suggestUpgradePlan(subscription.planType)
          }
        }

        // 2. 检查单个视频时长限制
        if (metadata?.videoDuration && plan.maxVideoDuration > 0 && metadata.videoDuration > plan.maxVideoDuration) {
          return {
            allowed: false,
            reason: `单个视频时长超过限制 (最大${plan.maxVideoDuration}分钟)`,
            upgradeRequired: true,
            suggestedPlan: this.suggestUpgradePlan(subscription.planType)
          }
        }

        // 3. 检查月度总时长限制
        if (plan.monthlyDurationQuota > 0 && metadata?.videoDuration) {
          const currentDurationUsage = await this.getUserMonthlyDurationUsage(userId)
          if ((currentDurationUsage + metadata.videoDuration) > plan.monthlyDurationQuota) {
            return {
              allowed: false,
              reason: `月度总时长已达上限 (已用${currentDurationUsage}分钟，限制${plan.monthlyDurationQuota}分钟)`,
              upgradeRequired: true,
              suggestedPlan: this.suggestUpgradePlan(subscription.planType)
            }
          }
        }

        // 4. 检查文件大小限制
        if (metadata?.fileSize && plan.maxFileSize > 0 && metadata.fileSize > plan.maxFileSize) {
          return {
            allowed: false,
            reason: `文件大小超过限制 (最大${Math.round(plan.maxFileSize / 1024 / 1024)}MB)`,
            upgradeRequired: true,
            suggestedPlan: this.suggestUpgradePlan(subscription.planType)
          }
        }
      }

      // 检查分享配额
      if (quotaType === 'shares') {
        if (plan.maxSharedItems > 0 && (usage.usedAmount + amount) > plan.maxSharedItems) {
          return {
            allowed: false,
            reason: `分享数量已达上限 (${plan.maxSharedItems}个)`,
            currentUsage: usage,
            upgradeRequired: true,
            suggestedPlan: this.suggestUpgradePlan(subscription.planType)
          }
        }
      }

      return {
        allowed: true,
        currentUsage: usage
      }
    } catch (error) {
      logger.error('Failed to check quota', { userId, quotaType, amount, error })
      return {
        allowed: false,
        reason: '配额检查失败'
      }
    }
  }

  /**
   * 记录配额使用
   */
  static async recordQuotaUsage(
    userId: number,
    quotaType: string,
    action: string,
    amount: number = 1,
    resourceId?: string,
    resourceType?: string,
    metadata?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      // 1. 记录详细日志
      await pool.query(`
        INSERT INTO quota_usage_logs 
        (user_id, quota_type, action, amount, resource_id, resource_type, metadata, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [userId, quotaType, action, amount, resourceId, resourceType, metadata, ipAddress, userAgent])

      // 2. 更新配额使用统计
      const now = new Date()
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

      await pool.query(`
        INSERT INTO user_quota_usage (user_id, quota_type, used_amount, quota_period, period_start, period_end)
        VALUES ($1, $2, $3, 'monthly', $4, $5)
        ON CONFLICT (user_id, quota_type, quota_period, period_start)
        DO UPDATE SET 
          used_amount = user_quota_usage.used_amount + $3,
          updated_at = NOW()
      `, [userId, quotaType, amount, periodStart, periodEnd])

      // 3. 检查是否需要发送预警
      await this.checkAndCreateQuotaAlerts(userId, quotaType)

      logger.info('Quota usage recorded', {
        userId,
        quotaType,
        action,
        amount,
        resourceId
      })
    } catch (error) {
      logger.error('Failed to record quota usage', {
        userId,
        quotaType,
        action,
        amount,
        error
      })
      throw new Error('记录配额使用失败')
    }
  }

  /**
   * 检查并创建配额预警
   */
  static async checkAndCreateQuotaAlerts(userId: number, quotaType: string): Promise<void> {
    try {
      const usage = await this.getUserQuotaUsage(userId, quotaType)
      if (!usage || usage.maxAmount === 0) {
        return
      }

      const percentage = usage.percentage

      // 80% 预警
      if (percentage >= 80 && percentage < 100) {
        await this.createQuotaAlert(
          userId,
          quotaType,
          'warning',
          80,
          `您的${this.getQuotaTypeName(quotaType)}使用量已达到 ${percentage}%，即将达到上限。`
        )
      }

      // 100% 限制达到
      if (percentage >= 100) {
        await this.createQuotaAlert(
          userId,
          quotaType,
          'limit_reached',
          100,
          `您的${this.getQuotaTypeName(quotaType)}已达到上限，请升级套餐以继续使用。`
        )
      }
    } catch (error) {
      logger.error('Failed to check quota alerts', { userId, quotaType, error })
    }
  }

  /**
   * 创建配额预警
   */
  static async createQuotaAlert(
    userId: number,
    quotaType: string,
    alertType: string,
    thresholdPercentage: number,
    message: string
  ): Promise<void> {
    try {
      // 检查是否已经发送过相同的预警
      const existingAlert = await pool.query(`
        SELECT id FROM quota_alerts
        WHERE user_id = $1 AND quota_type = $2 AND alert_type = $3 
        AND threshold_percentage = $4 AND is_sent = false
        AND created_at > NOW() - INTERVAL '24 hours'
      `, [userId, quotaType, alertType, thresholdPercentage])

      if (existingAlert.rows.length > 0) {
        return // 已经有未发送的相同预警
      }

      await pool.query(`
        INSERT INTO quota_alerts (user_id, quota_type, alert_type, threshold_percentage, message)
        VALUES ($1, $2, $3, $4, $5)
      `, [userId, quotaType, alertType, thresholdPercentage, message])

      logger.info('Quota alert created', {
        userId,
        quotaType,
        alertType,
        thresholdPercentage
      })
    } catch (error) {
      logger.error('Failed to create quota alert', {
        userId,
        quotaType,
        alertType,
        error
      })
    }
  }

  /**
   * 获取配额类型显示名称
   */
  static getQuotaTypeName(quotaType: string): string {
    const names: Record<string, string> = {
      'video_processing': '视频处理',
      'shares': '分享内容',
      'storage': '存储空间',
      'api_calls': 'API调用',
      'exports': '导出功能'
    }
    return names[quotaType] || quotaType
  }

  /**
   * 建议升级套餐
   */
  static suggestUpgradePlan(currentPlan: string): string {
    const upgradePath: Record<string, string> = {
      'free': 'pro',
      'pro': 'max',
      'max': 'max' // 已经是最高套餐
    }
    return upgradePath[currentPlan] || 'pro'
  }

  /**
   * 获取用户的所有配额使用情况
   */
  static async getUserAllQuotaUsage(userId: number): Promise<QuotaUsage[]> {
    try {
      const quotaTypes = ['video_processing', 'shares', 'storage', 'exports']
      const usageList: QuotaUsage[] = []

      for (const quotaType of quotaTypes) {
        const usage = await this.getUserQuotaUsage(userId, quotaType)
        if (usage) {
          usageList.push(usage)
        }
      }

      return usageList
    } catch (error) {
      logger.error('Failed to get user all quota usage', { userId, error })
      throw new Error('获取用户配额使用情况失败')
    }
  }

  /**
   * 获取用户未读的配额预警
   */
  static async getUserQuotaAlerts(userId: number): Promise<any[]> {
    try {
      const result = await pool.query(`
        SELECT id, quota_type, alert_type, threshold_percentage, message, created_at
        FROM quota_alerts
        WHERE user_id = $1 AND is_sent = false
        ORDER BY created_at DESC
      `, [userId])

      return result.rows
    } catch (error) {
      logger.error('Failed to get user quota alerts', { userId, error })
      throw new Error('获取配额预警失败')
    }
  }

  /**
   * 标记预警为已读
   */
  static async markQuotaAlertsAsRead(userId: number, alertIds: number[]): Promise<void> {
    try {
      if (alertIds.length === 0) return

      const placeholders = alertIds.map((_, index) => `$${index + 2}`).join(', ')
      await pool.query(`
        UPDATE quota_alerts
        SET is_sent = true, sent_at = NOW()
        WHERE user_id = $1 AND id IN (${placeholders})
      `, [userId, ...alertIds])

      logger.info('Quota alerts marked as read', { userId, alertIds })
    } catch (error) {
      logger.error('Failed to mark quota alerts as read', { userId, alertIds, error })
      throw new Error('标记预警为已读失败')
    }
  }

  /**
   * 升级用户套餐
   */
  static async upgradeUserPlan(
    userId: number, 
    newPlanType: string, 
    paymentMethod: string = 'unknown'
  ): Promise<UserSubscription> {
    try {
      // 验证新套餐是否存在
      const newPlan = await this.getQuotaPlan(newPlanType)
      if (!newPlan) {
        throw new Error('目标套餐不存在')
      }

      // 获取当前订阅
      const currentSubscription = await this.getUserSubscription(userId)
      if (!currentSubscription) {
        throw new Error('用户订阅信息不存在')
      }

      // 验证升级路径
      const currentPlan = await this.getQuotaPlan(currentSubscription.planType)
      if (!currentPlan) {
        throw new Error('当前套餐信息不存在')
      }

      if (newPlan.priceMonthly <= currentPlan.priceMonthly) {
        throw new Error('只能升级到更高价格的套餐')
      }

      // 设置新的过期时间
      const now = new Date()
      const expiresAt = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())

      // 停用当前订阅
      await pool.query(`
        UPDATE user_subscriptions 
        SET status = 'cancelled', updated_at = NOW()
        WHERE user_id = $1 AND status = 'active'
      `, [userId])

      // 创建新订阅
      const result = await pool.query(`
        INSERT INTO user_subscriptions 
        (user_id, plan_type, status, expires_at, payment_method)
        VALUES ($1, $2, 'active', $3, $4)
        RETURNING id, user_id, plan_type, status, started_at, expires_at, auto_renew, payment_method
      `, [userId, newPlanType, expiresAt, paymentMethod])

      const newSubscription = {
        id: result.rows[0].id,
        userId: result.rows[0].user_id,
        planType: result.rows[0].plan_type,
        status: result.rows[0].status,
        startedAt: result.rows[0].started_at,
        expiresAt: result.rows[0].expires_at,
        autoRenew: result.rows[0].auto_renew,
        paymentMethod: result.rows[0].payment_method
      }

      logger.info('User plan upgraded', {
        userId,
        fromPlan: currentSubscription.planType,
        toPlan: newPlanType,
        paymentMethod
      })

      return newSubscription
    } catch (error) {
      logger.error('Failed to upgrade user plan', { userId, newPlanType, error })
      throw new Error(`套餐升级失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 降级用户套餐 (在当前订阅期结束时生效)
   */
  static async downgradeUserPlan(
    userId: number, 
    newPlanType: string
  ): Promise<void> {
    try {
      // 验证新套餐是否存在
      const newPlan = await this.getQuotaPlan(newPlanType)
      if (!newPlan) {
        throw new Error('目标套餐不存在')
      }

      // 获取当前订阅
      const currentSubscription = await this.getUserSubscription(userId)
      if (!currentSubscription) {
        throw new Error('用户订阅信息不存在')
      }

      // 验证降级路径
      const currentPlan = await this.getQuotaPlan(currentSubscription.planType)
      if (!currentPlan) {
        throw new Error('当前套餐信息不存在')
      }

      if (newPlan.priceMonthly >= currentPlan.priceMonthly) {
        throw new Error('只能降级到更低价格的套餐')
      }

      // 更新当前订阅，设置auto_renew为false，并记录降级意图
      await pool.query(`
        UPDATE user_subscriptions 
        SET auto_renew = false, updated_at = NOW()
        WHERE user_id = $1 AND status = 'active'
      `, [userId])

      // 创建待生效的降级订阅
      const expiresAt = currentSubscription.expiresAt || new Date()
      const nextPeriodStart = new Date(expiresAt.getTime() + 24 * 60 * 60 * 1000) // 下一天开始

      await pool.query(`
        INSERT INTO user_subscriptions 
        (user_id, plan_type, status, started_at, payment_method)
        VALUES ($1, $2, 'pending', $3, 'downgrade')
      `, [userId, newPlanType, nextPeriodStart])

      logger.info('User plan downgrade scheduled', {
        userId,
        fromPlan: currentSubscription.planType,
        toPlan: newPlanType,
        effectiveDate: nextPeriodStart
      })
    } catch (error) {
      logger.error('Failed to schedule user plan downgrade', { userId, newPlanType, error })
      throw new Error(`套餐降级设置失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 取消订阅 (当前周期结束后不再续费)
   */
  static async cancelSubscription(userId: number): Promise<void> {
    try {
      const currentSubscription = await this.getUserSubscription(userId)
      if (!currentSubscription) {
        throw new Error('用户订阅信息不存在')
      }

      if (currentSubscription.planType === 'free') {
        throw new Error('免费用户无需取消订阅')
      }

      // 关闭自动续费，但保持当前周期有效
      await pool.query(`
        UPDATE user_subscriptions 
        SET auto_renew = false, updated_at = NOW()
        WHERE user_id = $1 AND status = 'active'
      `, [userId])

      // 预设免费版订阅在当前周期结束后生效
      const expiresAt = currentSubscription.expiresAt || new Date()
      const nextPeriodStart = new Date(expiresAt.getTime() + 24 * 60 * 60 * 1000)

      await pool.query(`
        INSERT INTO user_subscriptions 
        (user_id, plan_type, status, started_at, payment_method)
        VALUES ($1, 'free', 'pending', $2, 'cancelled')
      `, [userId, nextPeriodStart])

      logger.info('Subscription cancelled', {
        userId,
        currentPlan: currentSubscription.planType,
        expiresAt: currentSubscription.expiresAt,
        freeStartsAt: nextPeriodStart
      })
    } catch (error) {
      logger.error('Failed to cancel subscription', { userId, error })
      throw new Error(`取消订阅失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 退款并立即取消会员 (立即失效)
   */
  static async refundAndCancel(
    userId: number, 
    refundReason: string = 'user_request'
  ): Promise<{ refundAmount: number }> {
    try {
      const currentSubscription = await this.getUserSubscription(userId)
      if (!currentSubscription) {
        throw new Error('用户订阅信息不存在')
      }

      if (currentSubscription.planType === 'free') {
        throw new Error('免费用户无需退款')
      }

      const currentPlan = await this.getQuotaPlan(currentSubscription.planType)
      if (!currentPlan) {
        throw new Error('当前套餐信息不存在')
      }

      // 计算退款金额（按剩余天数比例）
      const now = new Date()
      const expiresAt = currentSubscription.expiresAt || now
      const remainingDays = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
      const totalDays = 30 // 假设月度订阅
      const refundAmount = Math.round((currentPlan.priceMonthly * remainingDays / totalDays) * 100) / 100

      // 立即取消当前订阅
      await pool.query(`
        UPDATE user_subscriptions 
        SET status = 'refunded', auto_renew = false, updated_at = NOW()
        WHERE user_id = $1 AND status = 'active'
      `, [userId])

      // 立即创建免费版订阅
      await pool.query(`
        INSERT INTO user_subscriptions 
        (user_id, plan_type, status, payment_method)
        VALUES ($1, 'free', 'active', 'refund')
      `, [userId])

      // 记录退款日志
      logger.info('Subscription refunded and cancelled', {
        userId,
        refundedPlan: currentSubscription.planType,
        refundAmount,
        refundReason,
        remainingDays
      })

      return { refundAmount }
    } catch (error) {
      logger.error('Failed to process refund', { userId, error })
      throw new Error(`退款处理失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 处理到期订阅 (定时任务调用)
   */
  static async processExpiredSubscriptions(): Promise<void> {
    try {
      const now = new Date()
      
      // 查找所有已到期但仍active的订阅
      const expiredResult = await pool.query(`
        SELECT user_id, plan_type, expires_at, auto_renew
        FROM user_subscriptions 
        WHERE status = 'active' 
        AND expires_at IS NOT NULL 
        AND expires_at <= $1
      `, [now])

      for (const expired of expiredResult.rows) {
        const userId = expired.user_id

        if (expired.auto_renew) {
          // 自动续费：延长当前订阅
          const nextExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 延长30天
          
          await pool.query(`
            UPDATE user_subscriptions 
            SET expires_at = $1, updated_at = NOW()
            WHERE user_id = $2 AND status = 'active'
          `, [nextExpiry, userId])

          logger.info('Subscription auto-renewed', {
            userId,
            planType: expired.plan_type,
            newExpiry: nextExpiry
          })
        } else {
          // 不续费：切换到免费版或pending的降级计划
          await pool.query(`
            UPDATE user_subscriptions 
            SET status = 'expired', updated_at = NOW()
            WHERE user_id = $1 AND status = 'active'
          `, [userId])

          // 检查是否有pending的订阅
          const pendingResult = await pool.query(`
            SELECT plan_type FROM user_subscriptions
            WHERE user_id = $1 AND status = 'pending'
            ORDER BY created_at ASC
            LIMIT 1
          `, [userId])

          const nextPlanType = pendingResult.rows[0]?.plan_type || 'free'

          // 激活新订阅
          await pool.query(`
            INSERT INTO user_subscriptions 
            (user_id, plan_type, status, payment_method)
            VALUES ($1, $2, 'active', 'transition')
          `, [userId, nextPlanType])

          // 清理pending订阅
          await pool.query(`
            DELETE FROM user_subscriptions
            WHERE user_id = $1 AND status = 'pending'
          `, [userId])

          logger.info('Subscription transitioned', {
            userId,
            fromPlan: expired.plan_type,
            toPlan: nextPlanType
          })
        }
      }

      logger.info('Processed expired subscriptions', {
        processedCount: expiredResult.rows.length
      })
    } catch (error) {
      logger.error('Failed to process expired subscriptions', { error })
      throw new Error('处理到期订阅失败')
    }
  }
}