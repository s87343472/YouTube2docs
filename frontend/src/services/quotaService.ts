/**
 * 前端配额管理服务
 * 负责与后端配额API的交互
 */

import api from './api'

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
  monthlyDurationQuota: number // 每月总时长限制(分钟)
}

export interface UserSubscription {
  id: number
  userId: string  // 修改为 string 类型
  planType: string
  status: string
  startedAt: string
  expiresAt?: string
  autoRenew: boolean
  paymentMethod?: string
}

export interface QuotaUsage {
  quotaType: string
  usedAmount: number
  maxAmount: number
  percentage: number
  periodStart: string
  periodEnd: string
}

export interface QuotaCheckResult {
  allowed: boolean
  reason?: string
  currentUsage?: QuotaUsage
  upgradeRequired?: boolean
  suggestedPlan?: string
}

export interface QuotaAlert {
  id: number
  quotaType: string
  alertType: string
  thresholdPercentage: number
  message: string
  createdAt: string
}

export class QuotaService {
  
  /**
   * 获取所有配额计划
   */
  static async getAllQuotaPlans(): Promise<QuotaPlan[]> {
    console.log('Fetching quota plans from API...')
    try {
      const response = await api.get('/quota/plans')
      console.log('Quota plans response:', response.data)
      return response.data.data
    } catch (error) {
      console.error('Error fetching quota plans:', error)
      throw error
    }
  }

  /**
   * 获取所有配额计划（别名方法，用于新页面）
   */
  static async getAllPlans(): Promise<QuotaPlan[]> {
    return this.getAllQuotaPlans()
  }

  /**
   * 获取用户当前订阅信息
   */
  static async getUserSubscription(): Promise<{
    subscription: UserSubscription
    plan: QuotaPlan
  }> {
    const response = await api.get('/quota/subscription')
    return response.data.data
  }

  /**
   * 获取用户配额使用情况
   */
  static async getUserQuotaUsage(): Promise<QuotaUsage[]> {
    const response = await api.get('/quota/usage')
    return response.data.data
  }

  /**
   * 检查用户配额
   */
  static async checkQuota(
    quotaType: string,
    amount: number = 1,
    metadata?: any
  ): Promise<QuotaCheckResult> {
    const response = await api.post('/quota/check', {
      quotaType,
      amount,
      metadata
    })
    return response.data.data
  }

  /**
   * 获取用户配额预警
   */
  static async getUserQuotaAlerts(): Promise<QuotaAlert[]> {
    const response = await api.get('/quota/alerts')
    return response.data.data
  }

  /**
   * 标记预警为已读
   */
  static async markQuotaAlertsAsRead(alertIds: number[]): Promise<void> {
    await api.post('/quota/alerts/read', {
      alertIds
    })
  }

  /**
   * 记录配额使用
   */
  static async recordQuotaUsage(
    quotaType: string,
    action: string,
    amount: number = 1,
    resourceId?: string,
    resourceType?: string,
    metadata?: any
  ): Promise<void> {
    await api.post('/quota/usage/record', {
      quotaType,
      action,
      amount,
      resourceId,
      resourceType,
      metadata
    })
  }

  /**
   * 格式化配额类型显示名称
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
   * 格式化文件大小
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '无限制'
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let size = bytes
    let unitIndex = 0
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    
    return `${Math.round(size * 100) / 100} ${units[unitIndex]}`
  }

  /**
   * 格式化时长
   */
  static formatDuration(minutes: number): string {
    if (minutes === 0) return '无限制'
    
    if (minutes < 60) {
      return `${minutes}分钟`
    }
    
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    
    if (remainingMinutes === 0) {
      return `${hours}小时`
    }
    
    return `${hours}小时${remainingMinutes}分钟`
  }

  /**
   * 获取套餐颜色主题
   */
  static getPlanColorTheme(planType: string) {
    const themes: Record<string, {
      primary: string
      secondary: string
      accent: string
      badge: string
    }> = {
      'free': {
        primary: 'text-gray-600',
        secondary: 'bg-gray-50',
        accent: 'border-gray-200',
        badge: 'bg-gray-100 text-gray-800'
      },
      'pro': {
        primary: 'text-blue-600',
        secondary: 'bg-blue-50',
        accent: 'border-blue-200',
        badge: 'bg-blue-100 text-blue-800'
      },
      'max': {
        primary: 'text-purple-600',
        secondary: 'bg-purple-50',
        accent: 'border-purple-200',
        badge: 'bg-purple-100 text-purple-800'
      },
      'enterprise': {
        primary: 'text-purple-600',
        secondary: 'bg-purple-50',
        accent: 'border-purple-200',
        badge: 'bg-purple-100 text-purple-800'
      }
    }
    return themes[planType] || themes.free
  }

  /**
   * 升级订阅
   */
  static async upgradeSubscription(planType: string, paymentMethod: string): Promise<UserSubscription> {
    const response = await api.post('/quota/upgrade', {
      planType,
      paymentMethod
    })
    return response.data.data.subscription
  }

  /**
   * 降级订阅
   */
  static async downgradeSubscription(userId: string | number, planType: string): Promise<void> {
    await api.post('/quota/downgrade', {
      planType
    })
  }

  /**
   * 取消订阅
   */
  static async cancelSubscription(userId: string | number): Promise<void> {
    await api.post('/quota/cancel')
  }

  /**
   * 退款并取消订阅
   */
  static async refundSubscription(userId: string | number, reason?: string): Promise<{ refundAmount: number }> {
    const response = await api.post('/quota/refund', {
      reason
    })
    return response.data.data
  }
}