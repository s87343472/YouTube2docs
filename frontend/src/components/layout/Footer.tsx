import { Play, Github, Twitter, Mail } from 'lucide-react'

export const Footer = () => {
  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and Description */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
                <Play className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">
                YouTube<span className="text-gradient">智学</span>
              </span>
            </div>
            <p className="text-gray-600 mb-6">
              将任何YouTube教学视频转化为专业级、网状化学习资料的智能平台。
              2分钟内获得图文并茂、知识关联的完整学习资料包。
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-gray-600 transition-colors">
                <Github className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-gray-600 transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-gray-600 transition-colors">
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
              产品
            </h3>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
                  功能特色
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
                  价格方案
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
                  API文档
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
                  更新日志
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
              支持
            </h3>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
                  帮助中心
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
                  联系我们
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
                  用户反馈
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
                  隐私政策
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-center text-gray-400 text-sm">
            © 2025 YouTube智学. All rights reserved. 让每个YouTube视频都成为你的专属教科书.
          </p>
        </div>
      </div>
    </footer>
  )
}