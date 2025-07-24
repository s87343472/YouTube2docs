import React from 'react'
import { Loader2, Play, Download, Brain, FileText } from 'lucide-react'

/**
 * 各种加载状态组件
 * 提供不同场景下的加载提示
 */

// 基础加载器
export const BasicLoader: React.FC<{ 
  size?: 'sm' | 'md' | 'lg'
  className?: string 
}> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  }

  return (
    <Loader2 className={`animate-spin ${sizeClasses[size]} ${className}`} />
  )
}

// 带文字的加载器
export const LoadingWithText: React.FC<{
  text?: string
  subText?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}> = ({ 
  text = '加载中...', 
  subText,
  size = 'md',
  className = ''
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
      <BasicLoader size={size} className="text-blue-600 mb-4" />
      <p className="text-gray-700 font-medium">{text}</p>
      {subText && (
        <p className="text-gray-500 text-sm mt-1">{subText}</p>
      )}
    </div>
  )
}

// 页面级加载
export const PageLoading: React.FC<{
  title?: string
  description?: string
}> = ({ 
  title = '正在加载页面...', 
  description = '请稍候，我们正在为您准备内容' 
}) => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-6">
          <BasicLoader size="lg" className="text-blue-600" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-600">{description}</p>
      </div>
    </div>
  )
}

// 视频处理加载
export const VideoProcessingLoader: React.FC<{
  step?: string
  progress?: number
}> = ({ step = '正在处理视频...', progress }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center mb-4">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mr-4">
          <Play className="h-6 w-6 text-green-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">处理中</h3>
          <p className="text-gray-600 text-sm">{step}</p>
        </div>
        <BasicLoader className="text-green-600" />
      </div>
      
      {progress !== undefined && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-green-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
      )}
    </div>
  )
}

// 导出加载
export const ExportLoader: React.FC<{
  type: 'pdf' | 'markdown' | 'image'
  status?: string
}> = ({ type, status = '正在生成...' }) => {
  const getIcon = () => {
    switch (type) {
      case 'pdf':
        return <FileText className="h-6 w-6 text-red-600" />
      case 'markdown':
        return <FileText className="h-6 w-6 text-blue-600" />
      case 'image':
        return <Download className="h-6 w-6 text-purple-600" />
      default:
        return <Download className="h-6 w-6 text-gray-600" />
    }
  }

  const getTypeText = () => {
    switch (type) {
      case 'pdf':
        return 'PDF文件'
      case 'markdown':
        return 'Markdown文件'
      case 'image':
        return '图片文件'
      default:
        return '文件'
    }
  }

  return (
    <div className="inline-flex items-center px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="mr-3">
        {getIcon()}
      </div>
      <div className="mr-3">
        <p className="text-sm font-medium text-gray-900">导出{getTypeText()}</p>
        <p className="text-xs text-gray-500">{status}</p>
      </div>
      <BasicLoader size="sm" className="text-gray-600" />
    </div>
  )
}

// AI分析加载
export const AIAnalysisLoader: React.FC<{
  stage?: string
}> = ({ stage = '正在分析内容...' }) => {
  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200 p-6">
      <div className="flex items-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mr-4">
          <Brain className="h-6 w-6 text-purple-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-purple-900">AI智能分析</h3>
          <p className="text-purple-700 text-sm">{stage}</p>
        </div>
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  )
}

// 卡片骨架屏
export const CardSkeleton: React.FC<{
  count?: number
  className?: string
}> = ({ count = 1, className = '' }) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-gray-200 rounded-full mr-4"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded w-full"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      ))}
    </div>
  )
}

// 列表骨架屏
export const ListSkeleton: React.FC<{
  count?: number
  className?: string
}> = ({ count = 3, className = '' }) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-center space-x-3 animate-pulse">
          <div className="w-4 h-4 bg-gray-200 rounded"></div>
          <div className="flex-1 space-y-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      ))}
    </div>
  )
}

// 内联加载（用于按钮等）
export const InlineLoader: React.FC<{
  className?: string
}> = ({ className = '' }) => {
  return (
    <BasicLoader size="sm" className={`inline ${className}`} />
  )
}

// 全屏加载遮罩
export const FullScreenLoader: React.FC<{
  show: boolean
  message?: string
  children?: React.ReactNode
}> = ({ show, message = '处理中...', children }) => {
  if (!show) return children || null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-sm mx-4 text-center">
        <BasicLoader size="lg" className="text-blue-600 mx-auto mb-4" />
        <p className="text-gray-700 font-medium">{message}</p>
      </div>
    </div>
  )
}

export default {
  BasicLoader,
  LoadingWithText,
  PageLoading,
  VideoProcessingLoader,
  ExportLoader,
  AIAnalysisLoader,
  CardSkeleton,
  ListSkeleton,
  InlineLoader,
  FullScreenLoader
}