import React, { useState } from 'react'
import { 
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
} from '../components/ErrorStates'
import { 
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
} from '../components/LoadingStates'

/**
 * 错误和加载状态测试页面
 * 用于展示所有状态组件的效果
 */

export const ErrorTestPage: React.FC = () => {
  const [showFullScreenLoader, setShowFullScreenLoader] = useState(false)
  
  // 自动关闭全屏加载
  React.useEffect(() => {
    if (showFullScreenLoader) {
      const timer = setTimeout(() => setShowFullScreenLoader(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [showFullScreenLoader])

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">状态组件测试页面</h1>
          <p className="text-gray-600 mb-8">测试各种错误和加载状态组件的显示效果</p>

          {/* 错误状态 */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">错误状态</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-4">基础错误</h3>
                <BasicError 
                  title="操作失败"
                  message="请检查输入后重试"
                  onRetry={() => alert('重试中...')}
                />
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-4">网络错误</h3>
                <NetworkError onRetry={() => alert('重新连接中...')} />
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-4">服务器错误</h3>
                <ServerError 
                  status={500}
                  message="服务器内部错误"
                  onRetry={() => alert('重新加载中...')}
                />
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-4">权限错误</h3>
                <PermissionError 
                  message="需要登录才能访问此功能"
                  onLogin={() => alert('跳转登录页面...')}
                />
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-4">超时错误</h3>
                <TimeoutError onRetry={() => alert('重新请求中...')} />
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-4">空数据状态</h3>
                <EmptyState 
                  title="暂无数据"
                  message="还没有任何内容"
                  action={{
                    label: '添加内容',
                    onClick: () => alert('添加新内容...')
                  }}
                />
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-gray-900 mb-4">维护状态</h3>
              <MaintenanceError estimatedTime="预计2小时" />
            </div>

            <div className="border border-gray-200 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-gray-900 mb-4">内联错误和警告</h3>
              <div className="space-y-4">
                <InlineError message="输入的URL格式不正确" />
                <Warning message="此操作无法撤销，请谨慎操作" />
              </div>
            </div>
          </section>

          {/* 加载状态 */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">加载状态</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-4">基础加载器</h3>
                <div className="flex items-center space-x-4">
                  <BasicLoader size="sm" className="text-blue-600" />
                  <BasicLoader size="md" className="text-green-600" />
                  <BasicLoader size="lg" className="text-purple-600" />
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-4">带文字的加载</h3>
                <LoadingWithText 
                  text="数据加载中..."
                  subText="请稍候片刻"
                />
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-4">视频处理加载</h3>
                <VideoProcessingLoader 
                  step="正在分析视频内容..."
                  progress={65}
                />
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-4">AI分析加载</h3>
                <AIAnalysisLoader stage="正在生成知识图谱..." />
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-4">导出加载</h3>
                <div className="space-y-4">
                  <ExportLoader type="pdf" status="正在生成PDF..." />
                  <ExportLoader type="markdown" status="正在生成Markdown..." />
                  <ExportLoader type="image" status="正在生成图片..." />
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-4">内联加载</h3>
                <div className="flex items-center space-x-2">
                  <span>处理中</span>
                  <InlineLoader className="text-blue-600" />
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-gray-900 mb-4">骨架屏</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">卡片骨架</h4>
                  <CardSkeleton count={2} />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">列表骨架</h4>
                  <ListSkeleton count={5} />
                </div>
              </div>
            </div>
          </section>

          {/* 测试按钮 */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">交互测试</h2>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => setShowFullScreenLoader(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                显示全屏加载
              </button>
              
              <button
                onClick={() => {
                  const error = new Error('这是一个测试错误')
                  console.error('Test error:', error)
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                触发控制台错误
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* 全屏加载遮罩 */}
      <FullScreenLoader
        show={showFullScreenLoader}
        message="全屏加载测试中..."
      >
        {/* 当不显示全屏加载时，这里的内容会被渲染 */}
        {showFullScreenLoader && (
          <div>
            <button
              onClick={() => setShowFullScreenLoader(false)}
              className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg"
            >
              关闭全屏加载
            </button>
          </div>
        )}
      </FullScreenLoader>

    </div>
  )
}

export default ErrorTestPage