import React from 'react'
import { Link } from 'react-router-dom'
import { Home, ArrowLeft, Search, FileX } from 'lucide-react'

/**
 * 404 页面组件
 * 当用户访问不存在的路由时显示
 */

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        {/* 404 图标和标题 */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-blue-100 rounded-full mb-6">
            <FileX className="h-12 w-12 text-blue-600" />
          </div>
          <h1 className="text-6xl font-bold text-gray-900 mb-2">404</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">页面未找到</h2>
          <p className="text-gray-600 text-lg">
            抱歉，您访问的页面不存在或已被移动。
          </p>
        </div>

        {/* 可能的原因 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="font-semibold text-gray-900 mb-4">可能的原因：</h3>
          <ul className="text-left space-y-2 text-gray-600">
            <li className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
              URL地址输入错误
            </li>
            <li className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
              页面已被移动或删除
            </li>
            <li className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
              链接已过期或无效
            </li>
            <li className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
              您没有访问权限
            </li>
          </ul>
        </div>

        {/* 操作按钮 */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Home className="h-5 w-5 mr-2" />
              返回首页
            </Link>
            
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              返回上页
            </button>
          </div>

          {/* 搜索建议 */}
          <div className="pt-4 border-t border-gray-200">
            <p className="text-gray-600 mb-4">或者尝试以下功能：</p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Link
                to="/process-demo"
                className="inline-flex items-center px-4 py-2 bg-green-50 text-green-700 rounded-full hover:bg-green-100 transition-colors text-sm"
              >
                <Search className="h-4 w-4 mr-1" />
                视频分析
              </Link>
              <Link
                to="/about"
                className="inline-flex items-center px-4 py-2 bg-purple-50 text-purple-700 rounded-full hover:bg-purple-100 transition-colors text-sm"
              >
                关于我们
              </Link>
              <Link
                to="/pricing"
                className="inline-flex items-center px-4 py-2 bg-orange-50 text-orange-700 rounded-full hover:bg-orange-100 transition-colors text-sm"
              >
                套餐价格
              </Link>
              <Link
                to="/canvas-test"
                className="inline-flex items-center px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full hover:bg-indigo-100 transition-colors text-sm"
              >
                知识图谱
              </Link>
            </div>
          </div>
        </div>

        {/* 帮助信息 */}
        <div className="mt-8 text-sm text-gray-500">
          如果问题持续存在，请
          <a href="mailto:support@youtube2docs.com" className="text-blue-600 hover:underline mx-1">
            联系技术支持
          </a>
          或
          <Link to="/about" className="text-blue-600 hover:underline mx-1">
            查看帮助文档
          </Link>
        </div>
      </div>
    </div>
  )
}

export default NotFoundPage