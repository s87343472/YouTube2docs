import React, { useState, useEffect } from 'react'
import { 
  Crown, 
  Zap, 
  Clock, 
  HardDrive, 
  Share2, 
  Download, 
  AlertTriangle, 
  TrendingUp,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { QuotaService, type QuotaUsage, type UserSubscription, type QuotaPlan, type QuotaAlert } from '../services/quotaService'

interface QuotaDisplayProps {
  showUpgradePrompt?: boolean
  compact?: boolean
  className?: string
}

/**
 * 配额显示组件
 * 展示用户当前配额使用情况和套餐信息
 */
export const QuotaDisplay: React.FC<QuotaDisplayProps> = ({
  showUpgradePrompt = true,
  compact = false,
  className = ''
}) => {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null)
  const [plan, setPlan] = useState<QuotaPlan | null>(null)
  const [usageList, setUsageList] = useState<QuotaUsage[]>([])
  const [alerts, setAlerts] = useState<QuotaAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadQuotaData()
  }, [])

  const loadQuotaData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [subscriptionData, usageData, alertData] = await Promise.all([
        QuotaService.getUserSubscription(),
        QuotaService.getUserQuotaUsage(),
        QuotaService.getUserQuotaAlerts()
      ])

      setSubscription(subscriptionData.subscription)
      setPlan(subscriptionData.plan)
      setUsageList(usageData)
      setAlerts(alertData)
    } catch (err) {
      console.error('Failed to load quota data:', err)
      setError('加载配额信息失败')
    } finally {
      setLoading(false)
    }
  }

  const dismissAlert = async (alertId: number) => {
    try {
      await QuotaService.markQuotaAlertsAsRead([alertId])
      setAlerts(alerts.filter(alert => alert.id !== alertId))
    } catch (err) {
      console.error('Failed to dismiss alert:', err)
    }
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 bg-red-50'
    if (percentage >= 80) return 'text-orange-600 bg-orange-50'
    if (percentage >= 60) return 'text-yellow-600 bg-yellow-50'
    return 'text-green-600 bg-green-50'
  }

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 80) return 'bg-orange-500'
    if (percentage >= 60) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getQuotaIcon = (quotaType: string) => {
    const icons: Record<string, React.ReactNode> = {
      'video_processing': <Zap className="h-4 w-4" />,
      'storage': <HardDrive className="h-4 w-4" />,
      'shares': <Share2 className="h-4 w-4" />,
      'exports': <Download className="h-4 w-4" />,
      'api_calls': <TrendingUp className="h-4 w-4" />
    }
    return icons[quotaType] || <Clock className="h-4 w-4" />
  }

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="h-4 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 text-red-600">
            <XCircle className="h-5 w-5" />
            <span className="text-sm font-medium">{error}</span>
          </div>
          <button
            onClick={loadQuotaData}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  if (!subscription || !plan) {
    return null
  }

  const theme = QuotaService.getPlanColorTheme(plan.planType)

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 预警提示 */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map(alert => (
            <div
              key={alert.id}
              className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-start justify-between"
            >
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-orange-800">
                    配额预警
                  </p>
                  <p className="text-sm text-orange-700">
                    {alert.message}
                  </p>
                </div>
              </div>
              <button
                onClick={() => dismissAlert(alert.id)}
                className="text-orange-400 hover:text-orange-600"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 套餐信息 */}
      <div className={`bg-white rounded-lg border ${theme.accent} ${theme.secondary} p-4`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Crown className={`h-5 w-5 ${theme.primary}`} />
            <h3 className={`font-medium ${theme.primary}`}>
              当前套餐
            </h3>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${theme.badge}`}>
            {plan.name}
          </span>
        </div>
        
        {!compact && (
          <p className="text-sm text-gray-600 mb-3">
            {plan.description}
          </p>
        )}

        {plan.planType !== 'free' && subscription.expiresAt && (
          <div className="text-sm text-gray-600">
            <span>到期时间: </span>
            <span className="font-medium">
              {new Date(subscription.expiresAt).toLocaleDateString('zh-CN')}
            </span>
          </div>
        )}
      </div>

      {/* 配额使用情况 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="font-medium text-gray-900 mb-3 flex items-center">
          <TrendingUp className="h-5 w-5 mr-2" />
          配额使用情况
        </h3>
        
        <div className="space-y-3">
          {usageList.map(usage => (
            <div key={usage.quotaType} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getQuotaIcon(usage.quotaType)}
                  <span className="text-sm font-medium text-gray-700">
                    {QuotaService.getQuotaTypeName(usage.quotaType)}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${getUsageColor(usage.percentage)}`}>
                    {usage.percentage}%
                  </span>
                  <span className="text-sm text-gray-600">
                    {usage.usedAmount} / {usage.maxAmount === 0 ? '∞' : usage.maxAmount}
                  </span>
                </div>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(usage.percentage)}`}
                  style={{ width: `${Math.min(usage.percentage, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 升级提示 */}
      {showUpgradePrompt && plan.planType === 'free' && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
              <Crown className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 mb-1">
                升级到付费套餐
              </h4>
              <p className="text-sm text-gray-600 mb-3">
                解锁更多功能和更高的配额限制，享受更好的学习体验
              </p>
              <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all">
                查看套餐
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 刷新按钮 */}
      {!compact && (
        <div className="flex justify-center">
          <button
            onClick={loadQuotaData}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center space-x-1"
          >
            <CheckCircle className="h-4 w-4" />
            <span>刷新配额信息</span>
          </button>
        </div>
      )}
    </div>
  )
}