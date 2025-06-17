import { useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  Play, 
  Zap, 
  Brain, 
  Globe, 
  FileText, 
  Network, 
  Sparkles,
  ArrowRight,
  Youtube,
  CheckCircle
} from 'lucide-react'

export const HomePage = () => {
  const [youtubeUrl, setYoutubeUrl] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (youtubeUrl.trim()) {
      // TODO: 处理视频URL提交
      console.log('Processing URL:', youtubeUrl)
    }
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-50 via-white to-purple-50 py-20 overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-8">
              <Sparkles className="h-4 w-4 mr-2" />
              基于Groq技术，216x实时速度处理
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              <span className="block">2分钟，将任何</span>
              <span className="block text-gradient">YouTube视频</span>
              <span className="block">变成完整学习资料</span>
            </h1>
            
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-12 leading-relaxed">
              不只是转录文字，而是生成专业级、网状化的学习知识体系。
              包含结构化笔记、概念解释、知识图谱和学习卡片。
            </p>

            {/* URL Input Form */}
            <form onSubmit={handleSubmit} className="max-w-2xl mx-auto mb-12">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center">
                  <Youtube className="h-5 w-5 text-red-500" />
                </div>
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="粘贴YouTube视频链接..."
                  className="w-full pl-12 pr-32 py-4 text-lg border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200"
                />
                <button
                  type="submit"
                  className="absolute inset-y-0 right-0 mr-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105"
                >
                  立即生成
                  <ArrowRight className="h-4 w-4 ml-2 inline" />
                </button>
              </div>
            </form>

            {/* Demo Video Examples */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {[
                { title: 'React Hooks教程', duration: '25:30', views: '1.2M' },
                { title: 'Python数据分析', duration: '45:15', views: '856K' },
                { title: 'UI设计原则', duration: '18:45', views: '634K' }
              ].map((example, index) => (
                <div key={index} className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
                  <div className="bg-gray-200 rounded-lg h-24 mb-3 flex items-center justify-center">
                    <Play className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="font-medium text-gray-900 mb-1">{example.title}</h3>
                  <p className="text-sm text-gray-500">{example.duration} • {example.views} 观看</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              为什么选择YouTube智学？
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              不仅仅是转录工具，而是你的智能学习助手
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Zap,
                title: '极速生成',
                description: '2分钟完成处理，比其他工具快10倍。基于Groq技术，216x实时速度',
                color: 'text-yellow-600 bg-yellow-100'
              },
              {
                icon: Brain,
                title: '知识网络化',
                description: '自动生成概念关联图谱，每个概念都可点击获得AI解释和相关资源',
                color: 'text-purple-600 bg-purple-100'
              },
              {
                icon: FileText,
                title: '专业品质',
                description: '教科书级别的结构化学习资料，不是简单的文字转录',
                color: 'text-blue-600 bg-blue-100'
              },
              {
                icon: Globe,
                title: '多语言支持',
                description: '支持英文、中文、日语、韩语，智能识别和处理',
                color: 'text-green-600 bg-green-100'
              },
              {
                icon: Network,
                title: '图文并茂',
                description: '可视化知识图谱、学习卡片，支持打印和多格式导出',
                color: 'text-indigo-600 bg-indigo-100'
              },
              {
                icon: Sparkles,
                title: 'AI增强',
                description: '每个概念都有AI深度解释，智能推荐相关学习资源',
                color: 'text-pink-600 bg-pink-100'
              }
            ].map((feature, index) => (
              <div key={index} className="card hover:shadow-xl">
                <div className={`inline-flex p-3 rounded-lg ${feature.color} mb-4`}>
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              如何工作？
            </h2>
            <p className="text-xl text-gray-600">
              简单三步，获得专业学习资料
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: '粘贴链接',
                description: '复制YouTube视频链接，粘贴到输入框中',
                icon: Youtube
              },
              {
                step: '02', 
                title: '智能处理',
                description: '2分钟内完成音频转录、内容分析、知识图谱生成',
                icon: Brain
              },
              {
                step: '03',
                title: '获得资料',
                description: '下载完整学习资料包，包含笔记、图谱、卡片',
                icon: FileText
              }
            ].map((step, index) => (
              <div key={index} className="text-center">
                <div className="relative mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full text-xl font-bold mb-4">
                    {step.step}
                  </div>
                  <div className="absolute top-8 left-1/2 transform -translate-x-1/2 translate-y-full">
                    <step.icon className="h-8 w-8 text-gray-400" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  {step.title}
                </h3>
                <p className="text-gray-600">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              与其他工具对比
            </h2>
            <p className="text-xl text-gray-600">
              为什么我们更胜一筹
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
              <div className="p-6 bg-gray-50">
                <h3 className="font-semibold text-gray-900 text-center">功能对比</h3>
              </div>
              <div className="p-6 text-center">
                <h4 className="font-semibold text-gray-600 mb-2">传统工具</h4>
                <p className="text-sm text-gray-500">StudyFetch, Notetube等</p>
              </div>
              <div className="p-6 text-center">
                <h4 className="font-semibold text-gray-600 mb-2">本地方案</h4>
                <p className="text-sm text-gray-500">Whisper本地部署</p>
              </div>
              <div className="p-6 text-center bg-blue-50">
                <h4 className="font-semibold text-blue-900 mb-2">YouTube智学</h4>
                <p className="text-sm text-blue-600">我们的解决方案</p>
              </div>
            </div>

            {[
              {
                feature: '处理速度',
                others: '10-30分钟',
                local: '5-15分钟',
                ours: '2分钟'
              },
              {
                feature: '输出质量',
                others: '简单文字转录',
                local: '基础转录',
                ours: '结构化学习资料'
              },
              {
                feature: '知识关联',
                others: '无',
                local: '无',
                ours: '智能知识图谱'
              },
              {
                feature: '多语言支持',
                others: '有限',
                local: '中文识别差',
                ours: '优化多语言'
              },
              {
                feature: 'AI解释',
                others: '无',
                local: '无',
                ours: '每个概念都有'
              }
            ].map((comparison, index) => (
              <div key={index} className="grid grid-cols-1 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
                <div className="p-4 bg-gray-50 font-medium text-gray-900">
                  {comparison.feature}
                </div>
                <div className="p-4 text-center text-gray-600">
                  {comparison.others}
                </div>
                <div className="p-4 text-center text-gray-600">
                  {comparison.local}
                </div>
                <div className="p-4 text-center bg-blue-50">
                  <span className="inline-flex items-center text-blue-900 font-semibold">
                    <CheckCircle className="h-4 w-4 mr-2 text-blue-600" />
                    {comparison.ours}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-4">
            准备好转变你的学习方式了吗？
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            免费体验，每月3个视频额度，无需注册
          </p>
          <Link
            to="/"
            className="inline-flex items-center bg-white text-blue-600 font-semibold py-4 px-8 rounded-lg hover:bg-blue-50 transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            立即开始免费体验
            <ArrowRight className="h-5 w-5 ml-2" />
          </Link>
        </div>
      </section>
    </div>
  )
}