import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { 
  Play, 
  Headphones, 
  Brain, 
  Network, 
  CheckCircle, 
  Loader2,
  Youtube
} from 'lucide-react'

interface ProcessingStep {
  id: string
  title: string
  description: string
  icon: React.ComponentType<any>
  duration: number
  status: 'pending' | 'processing' | 'completed'
}

export const ProcessPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const videoUrl = searchParams.get('url')
  
  const [currentStep, setCurrentStep] = useState(0)
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([
    {
      id: 'extract',
      title: '视频解析中...',
      description: '提取视频信息和音频流',
      icon: Youtube,
      duration: 10,
      status: 'pending'
    },
    {
      id: 'transcribe',
      title: '音频转录中...',
      description: '使用Groq Whisper超速转录',
      icon: Headphones,
      duration: 30,
      status: 'pending'
    },
    {
      id: 'analyze',
      title: 'AI内容分析中...',
      description: '生成结构化学习内容',
      icon: Brain,
      duration: 60,
      status: 'pending'
    },
    {
      id: 'knowledge',
      title: '知识图谱生成中...',
      description: '构建概念关联网络',
      icon: Network,
      duration: 30,
      status: 'pending'
    }
  ])

  // 模拟处理进度
  useEffect(() => {
    if (!videoUrl) {
      navigate('/')
      return
    }

    const processSteps = async () => {
      for (let i = 0; i < processingSteps.length; i++) {
        // 开始处理当前步骤
        setProcessingSteps(prev => 
          prev.map((step, index) => 
            index === i ? { ...step, status: 'processing' } : step
          )
        )
        
        // 模拟处理时间
        await new Promise(resolve => 
          setTimeout(resolve, processingSteps[i].duration * 100)
        )
        
        // 完成当前步骤
        setProcessingSteps(prev => 
          prev.map((step, index) => 
            index === i ? { ...step, status: 'completed' } : step
          )
        )
        
        setCurrentStep(i + 1)
      }
      
      // 所有步骤完成，跳转到结果页面
      setTimeout(() => {
        navigate('/result/demo-123')
      }, 1000)
    }

    processSteps()
  }, [videoUrl, navigate])

  if (!videoUrl) {
    return null
  }

  const totalDuration = processingSteps.reduce((sum, step) => sum + step.duration, 0)
  const completedDuration = processingSteps
    .slice(0, currentStep)
    .reduce((sum, step) => sum + step.duration, 0)
  const progress = (completedDuration / totalDuration) * 100

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            正在处理您的视频
          </h1>
          <p className="text-lg text-gray-600">
            预计完成时间：{Math.ceil(totalDuration / 60)} 分钟
          </p>
          
          {/* Progress Bar */}
          <div className="max-w-md mx-auto mt-8">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>处理进度</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-blue-600 to-purple-600 h-3 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Video Info Card */}
        <div className="card mb-8">
          <div className="flex items-center space-x-4">
            <div className="bg-gray-200 rounded-lg w-20 h-15 flex items-center justify-center">
              <Play className="h-8 w-8 text-gray-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">
                YouTube视频处理中
              </h3>
              <p className="text-gray-600 text-sm">
                {videoUrl}
              </p>
            </div>
          </div>
        </div>

        {/* Processing Steps */}
        <div className="space-y-4">
          {processingSteps.map((step, index) => (
            <div 
              key={step.id}
              className={`card transition-all duration-300 ${
                step.status === 'processing' ? 'ring-2 ring-blue-500 bg-blue-50' :
                step.status === 'completed' ? 'bg-green-50' : ''
              }`}
            >
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-lg ${
                  step.status === 'completed' ? 'bg-green-100 text-green-600' :
                  step.status === 'processing' ? 'bg-blue-100 text-blue-600' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  {step.status === 'completed' ? (
                    <CheckCircle className="h-6 w-6" />
                  ) : step.status === 'processing' ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <step.icon className="h-6 w-6" />
                  )}
                </div>
                
                <div className="flex-1">
                  <h3 className={`font-semibold mb-1 ${
                    step.status === 'completed' ? 'text-green-900' :
                    step.status === 'processing' ? 'text-blue-900' :
                    'text-gray-900'
                  }`}>
                    {step.status === 'completed' ? '✅ ' + step.title.replace('中...', '完成') : step.title}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {step.description}
                  </p>
                </div>
                
                <div className="text-right">
                  <div className={`text-sm font-medium ${
                    step.status === 'completed' ? 'text-green-600' :
                    step.status === 'processing' ? 'text-blue-600' :
                    'text-gray-400'
                  }`}>
                    {step.status === 'completed' ? '完成' :
                     step.status === 'processing' ? '处理中' :
                     '等待中'}
                  </div>
                  <div className="text-xs text-gray-500">
                    ~{step.duration}秒
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tips */}
        <div className="mt-12 card bg-blue-50 border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">
            💡 处理期间小贴士
          </h3>
          <ul className="text-blue-800 text-sm space-y-1">
            <li>• 处理时间取决于视频长度，通常2-5分钟完成</li>
            <li>• 我们使用最先进的AI技术确保高质量输出</li>
            <li>• 请保持页面打开，处理完成后自动跳转</li>
            <li>• 生成的学习资料支持多种格式下载</li>
          </ul>
        </div>
      </div>
    </div>
  )
}