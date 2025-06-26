import React from 'react'
import { X, AlertTriangle, Crown, Zap, TrendingUp } from 'lucide-react'
import { QuotaService, type QuotaCheckResult } from '../services/quotaService'

interface QuotaWarningModalProps {
  isOpen: boolean
  onClose: () => void
  quotaResult: QuotaCheckResult
  onUpgrade?: () => void
  onContinue?: () => void
  title?: string
}

/**
 * 配额警告模态框
 * 显示配额限制警告和升级提示
 */
export const QuotaWarningModal: React.FC<QuotaWarningModalProps> = ({
  isOpen,
  onClose,
  quotaResult,
  onUpgrade,
  onContinue,
  title = '配额限制'
}) => {
  if (!isOpen) return null

  const getWarningIcon = () => {
    if (quotaResult.upgradeRequired) {
      return <Crown className="h-12 w-12 text-orange-500" />
    }
    return <AlertTriangle className="h-12 w-12 text-red-500" />
  }

  const getWarningColor = () => {
    if (quotaResult.upgradeRequired) {
      return {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        text: 'text-orange-800',
        button: 'bg-orange-600 hover:bg-orange-700'
      }
    }
    return {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      button: 'bg-red-600 hover:bg-red-700'
    }
  }

  const colors = getWarningColor()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            {getWarningIcon()}
            <h4 className="text-xl font-semibold text-gray-900 mt-4 mb-2">
              {quotaResult.upgradeRequired ? '需要升级套餐' : '配额已用完'}
            </h4>
            <p className={`text-sm ${colors.text} ${colors.bg} ${colors.border} border rounded-lg p-3`}>
              {quotaResult.reason}
            </p>
          </div>

          {/* Current Usage Display */}
          {quotaResult.currentUsage && (
            <div className="mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    当前使用情况
                  </span>
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {QuotaService.getQuotaTypeName(quotaResult.currentUsage.quotaType)}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">
                    已使用: {quotaResult.currentUsage.usedAmount} / {quotaResult.currentUsage.maxAmount === 0 ? '∞' : quotaResult.currentUsage.maxAmount}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    quotaResult.currentUsage.percentage >= 90 
                      ? 'bg-red-100 text-red-800' 
                      : quotaResult.currentUsage.percentage >= 80
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {quotaResult.currentUsage.percentage}%
                  </span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      quotaResult.currentUsage.percentage >= 90
                        ? 'bg-red-500'
                        : quotaResult.currentUsage.percentage >= 80
                        ? 'bg-orange-500'
                        : 'bg-yellow-500'
                    }`}
                    style={{ width: `${Math.min(quotaResult.currentUsage.percentage, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Upgrade Suggestion */}
          {quotaResult.upgradeRequired && quotaResult.suggestedPlan && (
            <div className="mb-6">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Zap className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-900">
                    推荐升级方案
                  </span>
                </div>
                <p className="text-sm text-blue-800">
                  升级到 <span className="font-semibold">{quotaResult.suggestedPlan}</span> 套餐，
                  解锁更高的配额限制和高级功能。
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-gray-50 rounded-b-xl">
          <div className="flex space-x-3">
            {quotaResult.upgradeRequired && onUpgrade && (
              <button
                onClick={onUpgrade}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium py-2 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 flex items-center justify-center space-x-2"
              >
                <Crown className="h-4 w-4" />
                <span>立即升级</span>
              </button>
            )}
            
            {onContinue && !quotaResult.upgradeRequired && (
              <button
                onClick={onContinue}
                className={`flex-1 text-white font-medium py-2 px-4 rounded-lg transition-colors ${colors.button}`}
              >
                强制继续
              </button>
            )}
            
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
            >
              {quotaResult.upgradeRequired ? '稍后升级' : '知道了'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}