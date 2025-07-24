import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'

/**
 * React错误边界组件
 * 捕获并处理组件树中的JavaScript错误
 */

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo
    })

    // 这里可以添加错误日志上报
    // reportError(error, errorInfo)
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleGoHome = () => {
    window.location.href = '/'
  }

  private handleReportError = () => {
    const { error, errorInfo } = this.state
    const errorReport = {
      error: error?.toString(),
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    }
    
    console.log('Error Report:', errorReport)
    
    // 复制错误信息到剪贴板
    navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2))
      .then(() => alert('错误信息已复制到剪贴板'))
      .catch(() => alert('复制失败，请手动复制控制台中的错误信息'))
  }

  public render() {
    if (this.state.hasError) {
      // 如果提供了自定义fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback
      }

      // 默认错误页面
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center px-4">
          <div className="max-w-2xl w-full">
            <div className="bg-white rounded-xl shadow-lg border border-red-200 p-8">
              {/* 错误图标和标题 */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">出现了错误</h1>
                <p className="text-gray-600 text-lg">
                  很抱歉，应用程序遇到了意外错误
                </p>
              </div>

              {/* 错误详情 - 开发环境显示 */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                    <Bug className="h-4 w-4 mr-2" />
                    错误详情
                  </h3>
                  <div className="text-sm font-mono text-red-600 bg-red-50 p-3 rounded border overflow-x-auto">
                    <div className="whitespace-pre-wrap">
                      {this.state.error.toString()}
                    </div>
                    {this.state.error.stack && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                          查看堆栈跟踪
                        </summary>
                        <pre className="mt-2 text-xs text-gray-600 whitespace-pre-wrap">
                          {this.state.error.stack}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              )}

              {/* 建议操作 */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">您可以尝试：</h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    刷新页面重新加载
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    检查网络连接是否正常
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    清除浏览器缓存后重试
                  </li>
                  <li className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    返回首页重新开始
                  </li>
                </ul>
              </div>

              {/* 操作按钮 */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={this.handleReload}
                  className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className="h-5 w-5 mr-2" />
                  刷新页面
                </button>
                
                <button
                  onClick={this.handleGoHome}
                  className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Home className="h-5 w-5 mr-2" />
                  返回首页
                </button>

                {process.env.NODE_ENV === 'development' && (
                  <button
                    onClick={this.handleReportError}
                    className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-orange-100 text-orange-700 font-medium rounded-lg hover:bg-orange-200 transition-colors"
                  >
                    <Bug className="h-5 w-5 mr-2" />
                    复制错误信息
                  </button>
                )}
              </div>

              {/* 帮助信息 */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-500 text-center">
                  如果问题持续存在，请
                  <a href="mailto:support@youtube2docs.com" className="text-blue-600 hover:underline mx-1">
                    联系技术支持
                  </a>
                  并提供错误信息
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// 简化的错误边界Hook版本（用于函数组件）
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) => {
  return (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  )
}

export default ErrorBoundary