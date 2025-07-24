import React from 'react'
import { 
  WifiOff, 
  AlertCircle, 
  RefreshCw, 
  Server, 
  Shield, 
  Clock,
  FileX,
  Zap,
  AlertTriangle,
  XCircle
} from 'lucide-react'

/**
 * 各种错误状态组件
 * 提供不同类型错误的友好提示
 */

// 基础错误提示
export const BasicError: React.FC<{
  title?: string
  message?: string
  onRetry?: () => void
  className?: string
}> = ({ 
  title = '出现错误', 
  message = '请稍后重试', 
  onRetry,
  className = ''
}) => {
  return (
    <div className={`text-center p-6 ${className}`}>
      <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-4">
        <AlertCircle className="h-6 w-6 text-red-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          重试
        </button>
      )}
    </div>
  )
}

// 网络错误
export const NetworkError: React.FC<{
  onRetry?: () => void
  className?: string
}> = ({ onRetry, className = '' }) => {
  return (
    <div className={`text-center p-8 ${className}`}>
      <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-6">
        <WifiOff className="h-8 w-8 text-orange-600" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">网络连接失败</h3>
      <p className="text-gray-600 mb-6">
        无法连接到服务器，请检查您的网络连接后重试
      </p>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <h4 className="font-medium text-yellow-900 mb-2">可能的解决方案：</h4>
        <ul className="text-sm text-yellow-800 space-y-1">
          <li>• 检查网络连接是否正常</li>
          <li>• 确认防火墙没有阻止访问</li>
          <li>• 尝试刷新页面</li>
          <li>• 稍后再试</li>
        </ul>
      </div>

      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center px-6 py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors"
        >
          <RefreshCw className="h-5 w-5 mr-2" />
          重新连接
        </button>
      )}
    </div>
  )
}

// 服务器错误
export const ServerError: React.FC<{
  status?: number
  message?: string
  onRetry?: () => void
  className?: string
}> = ({ 
  status = 500, 
  message = '服务器遇到了一个错误',
  onRetry,
  className = ''
}) => {
  return (
    <div className={`text-center p-8 ${className}`}>
      <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-6">
        <Server className="h-8 w-8 text-red-600" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        服务器错误 {status}
      </h3>
      <p className="text-gray-600 mb-6">{message}</p>
      
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-red-800">
          我们的技术团队已经收到错误通知，正在努力解决问题。请稍后重试。
        </p>
      </div>

      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
        >
          <RefreshCw className="h-5 w-5 mr-2" />
          重新加载
        </button>
      )}
    </div>
  )
}

// 权限错误
export const PermissionError: React.FC<{
  message?: string
  onLogin?: () => void
  className?: string
}> = ({ 
  message = '您没有权限访问此内容',
  onLogin,
  className = ''
}) => {
  return (
    <div className={`text-center p-8 ${className}`}>
      <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-6">
        <Shield className="h-8 w-8 text-yellow-600" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">访问受限</h3>
      <p className="text-gray-600 mb-6">{message}</p>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-yellow-800">
          此内容需要登录或更高权限才能访问
        </p>
      </div>

      {onLogin && (
        <button
          onClick={onLogin}
          className="inline-flex items-center px-6 py-3 bg-yellow-600 text-white font-medium rounded-lg hover:bg-yellow-700 transition-colors"
        >
          <Shield className="h-5 w-5 mr-2" />
          登录账户
        </button>
      )}
    </div>
  )
}

// 超时错误
export const TimeoutError: React.FC<{
  onRetry?: () => void
  className?: string
}> = ({ onRetry, className = '' }) => {
  return (
    <div className={`text-center p-8 ${className}`}>
      <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-6">
        <Clock className="h-8 w-8 text-blue-600" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">请求超时</h3>
      <p className="text-gray-600 mb-6">
        服务器响应时间过长，请稍后重试
      </p>

      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="h-5 w-5 mr-2" />
          重新请求
        </button>
      )}
    </div>
  )
}

// 数据为空
export const EmptyState: React.FC<{
  title?: string
  message?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}> = ({ 
  title = '暂无数据', 
  message = '这里还没有任何内容',
  action,
  className = ''
}) => {
  return (
    <div className={`text-center p-8 ${className}`}>
      <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-6">
        <FileX className="h-8 w-8 text-gray-500" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6">{message}</p>

      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center px-6 py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

// 维护中
export const MaintenanceError: React.FC<{
  estimatedTime?: string
  className?: string
}> = ({ estimatedTime, className = '' }) => {
  return (
    <div className={`text-center p-8 ${className}`}>
      <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-6">
        <Zap className="h-8 w-8 text-purple-600" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">系统维护中</h3>
      <p className="text-gray-600 mb-6">
        我们正在进行系统升级，以提供更好的服务体验
      </p>
      
      {estimatedTime && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-purple-800">
            预计维护时间：{estimatedTime}
          </p>
        </div>
      )}

      <p className="text-sm text-gray-500">
        感谢您的耐心等待，我们会尽快恢复服务
      </p>
    </div>
  )
}

// 通用错误处理组件
export const ErrorHandler: React.FC<{
  error: Error | string | null
  onRetry?: () => void
  className?: string
}> = ({ error, onRetry, className = '' }) => {
  if (!error) return null

  const errorMessage = typeof error === 'string' ? error : error.message
  const errorType = typeof error === 'string' ? 'unknown' : error.name

  // 根据错误类型显示不同的错误组件
  if (errorMessage.includes('Network') || errorMessage.includes('fetch')) {
    return <NetworkError onRetry={onRetry} className={className} />
  }
  
  if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
    return <TimeoutError onRetry={onRetry} className={className} />
  }
  
  if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
    return <PermissionError className={className} />
  }
  
  if (errorMessage.includes('500') || errorMessage.includes('502') || errorMessage.includes('503')) {
    return <ServerError onRetry={onRetry} className={className} />
  }

  // 默认错误
  return (
    <BasicError 
      title="发生错误"
      message={errorMessage}
      onRetry={onRetry}
      className={className}
    />
  )
}

// 内联错误提示
export const InlineError: React.FC<{
  message: string
  className?: string
}> = ({ message, className = '' }) => {
  return (
    <div className={`flex items-center text-red-600 text-sm ${className}`}>
      <XCircle className="h-4 w-4 mr-2 flex-shrink-0" />
      <span>{message}</span>
    </div>
  )
}

// 警告提示
export const Warning: React.FC<{
  message: string
  className?: string
}> = ({ message, className = '' }) => {
  return (
    <div className={`flex items-center text-yellow-600 text-sm ${className}`}>
      <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
      <span>{message}</span>
    </div>
  )
}

export default {
  BasicError,
  NetworkError,
  ServerError,
  PermissionError,
  TimeoutError,
  EmptyState,
  MaintenanceError,
  ErrorHandler,
  InlineError,
  Warning
}