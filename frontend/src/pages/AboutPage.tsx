import { 
  Zap, 
  Brain, 
  Globe, 
  Shield, 
  Users, 
  Target,
  CheckCircle,
  Star,
  TrendingUp
} from 'lucide-react'

export const AboutPage = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-purple-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              关于<span className="text-gradient">YouTube智学</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              我们致力于将全世界最优质的YouTube教学内容转化为结构化、专业级的学习资料，
              让每一个学习者都能高效掌握知识。
            </p>
            <div className="flex items-center justify-center space-x-8 text-sm">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <span>基于最新AI技术</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <span>216x实时处理速度</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <span>支持多种语言</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                我们的使命
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                在信息爆炸的时代，优质的教学内容散落在YouTube的海洋中。
                我们的使命是用AI技术将这些宝贵的知识重新组织，
                为学习者创造更高效、更系统的学习体验。
              </p>
              <div className="space-y-4">
                <div className="flex items-start">
                  <Target className="h-6 w-6 text-blue-600 mr-3 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">专注学习效果</h3>
                    <p className="text-gray-600">不仅仅是内容转换，更关注学习成果</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Users className="h-6 w-6 text-purple-600 mr-3 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">服务全球学习者</h3>
                    <p className="text-gray-600">跨越语言和文化障碍，让知识无界流动</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <TrendingUp className="h-6 w-6 text-green-600 mr-3 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">持续创新</h3>
                    <p className="text-gray-600">拥抱最新技术，不断提升产品体验</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">我们的愿景</h3>
              <blockquote className="text-lg text-gray-700 italic">
                "让全世界的优质教学内容都能被高效学习和掌握，
                成为连接知识创作者和学习者的最佳桥梁。"
              </blockquote>
              <div className="mt-6 flex items-center">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <span className="ml-2 text-gray-600">用户满意度 4.9/5.0</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technology */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              技术驱动的创新
            </h2>
            <p className="text-xl text-gray-600">
              我们使用最先进的AI技术栈，确保处理速度和质量的完美平衡
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="text-center">
              <div className="bg-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Zap className="h-8 w-8 text-yellow-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Groq超速引擎</h3>
              <p className="text-gray-600">
                基于Groq Whisper v3 Turbo，实现216倍实时处理速度，
                30秒内完成1小时视频的音频转录
              </p>
            </div>
            <div className="text-center">
              <div className="bg-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Brain className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">GPT-4智能分析</h3>
              <p className="text-gray-600">
                利用OpenAI GPT-4强大的理解能力，
                将原始转录内容转化为结构化的学习资料
              </p>
            </div>
            <div className="text-center">
              <div className="bg-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Globe className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">多语言优化</h3>
              <p className="text-gray-600">
                专门针对中文、日语、韩语进行优化，
                支持跨语言学习内容的智能处理
              </p>
            </div>
          </div>

          {/* Tech Stack */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              核心技术栈
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { name: 'Groq Whisper', category: '语音识别' },
                { name: 'OpenAI GPT-4', category: '内容生成' },
                { name: 'React + TypeScript', category: '前端框架' },
                { name: 'Node.js + Fastify', category: '后端服务' },
                { name: 'PostgreSQL', category: '数据存储' },
                { name: 'D3.js', category: '数据可视化' },
                { name: 'Tailwind CSS', category: 'UI设计' },
                { name: 'Docker', category: '容器化部署' }
              ].map((tech, index) => (
                <div key={index} className="text-center p-4 border border-gray-200 rounded-lg">
                  <div className="font-semibold text-gray-900">{tech.name}</div>
                  <div className="text-sm text-gray-600">{tech.category}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Team Values */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              我们的价值观
            </h2>
            <p className="text-xl text-gray-600">
              指导我们产品开发和用户服务的核心理念
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Shield,
                title: '用户至上',
                description: '始终将用户体验和数据安全放在首位',
                color: 'text-blue-600 bg-blue-100'
              },
              {
                icon: Zap,
                title: '效率优先',
                description: '用最快的速度提供最优质的服务',
                color: 'text-yellow-600 bg-yellow-100'
              },
              {
                icon: Brain,
                title: '质量为本',
                description: '不断优化算法，确保输出内容的专业性',
                color: 'text-purple-600 bg-purple-100'
              },
              {
                icon: Globe,
                title: '开放包容',
                description: '拥抱多元文化，服务全球学习者',
                color: 'text-green-600 bg-green-100'
              }
            ].map((value, index) => (
              <div key={index} className="text-center card">
                <div className={`inline-flex p-3 rounded-lg ${value.color} mb-4`}>
                  <value.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {value.title}
                </h3>
                <p className="text-gray-600">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">
              数字见证成长
            </h2>
            <p className="text-xl text-gray-300">
              用数据说话，展示我们的服务能力
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { number: '10,000+', label: '处理视频数', description: '累计处理的YouTube视频' },
              { number: '2分钟', label: '平均处理时间', description: '从视频到学习资料的转换' },
              { number: '98.5%', label: '用户满意度', description: '基于用户反馈的满意度' },
              { number: '15种', label: '支持语言', description: '多语言内容处理能力' }
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl font-bold text-white mb-2">
                  {stat.number}
                </div>
                <div className="text-xl text-gray-300 mb-1">
                  {stat.label}
                </div>
                <div className="text-sm text-gray-400">
                  {stat.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-4">
            有问题或建议？
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            我们很乐意听到您的声音，持续改进我们的产品
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-blue-600 font-semibold py-3 px-8 rounded-lg hover:bg-blue-50 transition-colors">
              联系我们
            </button>
            <button className="border-2 border-white text-white font-semibold py-3 px-8 rounded-lg hover:bg-white hover:text-blue-600 transition-colors">
              用户反馈
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}