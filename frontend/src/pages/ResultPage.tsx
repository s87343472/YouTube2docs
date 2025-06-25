import { useParams } from 'react-router-dom'
import { useState, useCallback } from 'react'
import { 
  Download, 
  Share2, 
  Play, 
  Clock, 
  Eye, 
  FileText, 
  Image, 
  Bookmark,
  ExternalLink,
  Brain,
  Network,
  CheckSquare
} from 'lucide-react'
import KnowledgeGraphVisualization from '../components/KnowledgeGraphVisualization'
import { conceptExplanationService } from '../services/conceptExplanationService'
import { ShareModal } from '../components/ShareModal'

export const ResultPage = () => {
  const { id } = useParams()
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)

  // 知识图谱数据
  const knowledgeGraphData = {
    nodes: [
      { 
        id: 'react-hooks', 
        name: 'React Hooks', 
        type: 'concept' as const, 
        importance: 10,
        explanation: 'React Hooks是函数组件中使用状态和生命周期的方式，让函数组件具备类组件的功能。'
      },
      { 
        id: 'usestate', 
        name: 'useState', 
        type: 'concept' as const, 
        importance: 9,
        explanation: '状态Hook，用于在函数组件中添加和管理状态。'
      },
      { 
        id: 'useeffect', 
        name: 'useEffect', 
        type: 'concept' as const, 
        importance: 9,
        explanation: '副作用Hook，用于处理副作用操作如API调用、订阅、DOM操作等。'
      },
      { 
        id: 'usecontext', 
        name: 'useContext', 
        type: 'concept' as const, 
        importance: 7,
        explanation: '上下文Hook，用于消费React Context，避免props drilling。'
      },
      { 
        id: 'custom-hooks', 
        name: '自定义Hook', 
        type: 'concept' as const, 
        importance: 8,
        explanation: '可复用的状态逻辑封装，以use开头的函数，可以调用其他Hook。'
      },
      { 
        id: 'state-management', 
        name: '状态管理', 
        type: 'subtopic' as const, 
        importance: 6
      },
      { 
        id: 'lifecycle', 
        name: '生命周期', 
        type: 'subtopic' as const, 
        importance: 6
      },
      { 
        id: 'react-context', 
        name: 'React Context', 
        type: 'resource' as const, 
        importance: 5
      },
      { 
        id: 'functional-components', 
        name: '函数组件', 
        type: 'subtopic' as const, 
        importance: 7
      }
    ],
    links: [
      { source: 'react-hooks', target: 'usestate', type: 'part_of' as const, strength: 3 },
      { source: 'react-hooks', target: 'useeffect', type: 'part_of' as const, strength: 3 },
      { source: 'react-hooks', target: 'usecontext', type: 'part_of' as const, strength: 2 },
      { source: 'react-hooks', target: 'custom-hooks', type: 'related_to' as const, strength: 2 },
      { source: 'usestate', target: 'state-management', type: 'related_to' as const, strength: 2 },
      { source: 'useeffect', target: 'lifecycle', type: 'related_to' as const, strength: 2 },
      { source: 'usecontext', target: 'react-context', type: 'depends_on' as const, strength: 3 },
      { source: 'react-hooks', target: 'functional-components', type: 'related_to' as const, strength: 2 },
      { source: 'custom-hooks', target: 'usestate', type: 'related_to' as const, strength: 1 },
      { source: 'custom-hooks', target: 'useeffect', type: 'related_to' as const, strength: 1 }
    ]
  }

  // 处理概念点击
  const handleConceptClick = useCallback((node: any) => {
    console.log('Concept clicked:', node.name)
    setSelectedConcept(node.name)
  }, [])

  // 请求AI解释
  const handleRequestExplanation = useCallback(async (concept: string): Promise<string> => {
    try {
      const explanation = await conceptExplanationService.getConceptExplanation(
        concept,
        'React Hooks教程的上下文'
      )
      return explanation
    } catch (error) {
      console.error('Failed to get explanation:', error)
      return '抱歉，无法获取该概念的详细解释。请稍后重试。'
    }
  }, [])

  // 处理分享
  const handleShare = useCallback(async (shareData: any) => {
    try {
      const response = await fetch('/api/shares', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          videoProcessId: id,
          ...shareData
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        return {
          shareId: result.data.shareId,
          shareUrl: result.data.shareUrl
        }
      } else {
        throw new Error(result.error?.message || '分享创建失败')
      }
    } catch (error) {
      console.error('Share creation failed:', error)
      throw error
    }
  }, [id])

  // 处理PDF导出
  const handleExportPDF = useCallback(async (type: 'complete' | 'cards') => {
    try {
      const endpoint = type === 'complete' 
        ? '/api/export/learning-material' 
        : '/api/export/study-cards'
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          videoProcessId: id || 'demo-123',
          format: 'pdf',
          options: {
            theme: 'light',
            includeGraphs: true,
            includeCards: type === 'complete',
            watermark: '由YouTube智学生成'
          }
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        // 创建下载链接
        const link = document.createElement('a')
        link.href = result.data.downloadUrl
        link.download = result.data.fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        console.log('PDF export successful:', result.data)
      } else {
        alert('导出失败：' + (result.error?.message || '未知错误'))
      }
    } catch (error) {
      console.error('Export failed:', error)
      alert('导出失败，请稍后重试')
    }
  }, [id])

  // 模拟数据
  const mockResult = {
    id: 'demo-123',
    videoInfo: {
      title: 'React Hooks Complete Tutorial - useState, useEffect, useContext',
      channel: 'Programming with Mosh',
      duration: '1:25:30',
      views: '1.2M',
      url: 'https://youtube.com/watch?v=demo',
      thumbnail: null
    },
    summary: {
      keyPoints: [
        'React Hooks是函数组件中使用状态和生命周期的方式',
        'useState用于管理组件内部状态',
        'useEffect用于处理副作用，如API调用和订阅',
        'useContext用于在组件树中共享状态',
        '自定义Hook可以复用状态逻辑'
      ],
      learningTime: '45-60分钟',
      difficulty: '中级',
      concepts: [
        { name: 'useState', explanation: '状态Hook，用于在函数组件中添加状态' },
        { name: 'useEffect', explanation: '副作用Hook，用于处理副作用操作' },
        { name: 'useContext', explanation: '上下文Hook，用于消费React Context' },
        { name: '自定义Hook', explanation: '可复用的状态逻辑封装' }
      ]
    },
    structuredContent: {
      chapters: [
        {
          title: 'React Hooks 介绍',
          timeRange: '00:00-15:30',
          keyPoints: [
            'Hooks的设计理念和优势',
            '函数组件vs类组件',
            'Hooks的基本规则'
          ]
        },
        {
          title: 'useState Hook详解',
          timeRange: '15:30-35:00',
          keyPoints: [
            'useState的基本用法',
            '状态更新的异步特性',
            '函数式更新和对象状态'
          ]
        },
        {
          title: 'useEffect Hook详解',
          timeRange: '35:00-65:00',
          keyPoints: [
            'useEffect的执行时机',
            '依赖数组的使用',
            '清理函数和性能优化'
          ]
        },
        {
          title: '高级Hooks使用',
          timeRange: '65:00-85:30',
          keyPoints: [
            'useContext的应用场景',
            '自定义Hook的创建',
            'Hook的组合使用'
          ]
        }
      ]
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-start space-x-4">
            <div className="bg-gray-200 rounded-lg w-32 h-20 flex items-center justify-center flex-shrink-0">
              <Play className="h-8 w-8 text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {mockResult.videoInfo.title}
              </h1>
              <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
                <span className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {mockResult.videoInfo.duration}
                </span>
                <span className="flex items-center">
                  <Eye className="h-4 w-4 mr-1" />
                  {mockResult.videoInfo.views}
                </span>
                <span>{mockResult.videoInfo.channel}</span>
              </div>
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => handleExportPDF('complete')}
                  className="btn-primary flex items-center"
                >
                  <Download className="h-4 w-4 mr-2" />
                  下载学习资料
                </button>
                <button 
                  onClick={() => setShowShareModal(true)}
                  className="btn-secondary flex items-center"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  分享
                </button>
                <button className="btn-secondary flex items-center">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  观看原视频
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 主要内容 */}
          <div className="lg:col-span-2 space-y-8">
            {/* 核心概念速览 */}
            <div className="card">
              <div className="flex items-center mb-4">
                <Brain className="h-5 w-5 text-blue-600 mr-2" />
                <h2 className="text-xl font-semibold text-gray-900">核心概念速览</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mockResult.summary.concepts.map((concept, index) => (
                  <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">{concept.name}</h3>
                    <p className="text-blue-800 text-sm">{concept.explanation}</p>
                    <button className="text-blue-600 text-sm mt-2 hover:text-blue-800">
                      详细解释 →
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 结构化内容 */}
            <div className="card">
              <div className="flex items-center mb-6">
                <FileText className="h-5 w-5 text-green-600 mr-2" />
                <h2 className="text-xl font-semibold text-gray-900">结构化学习内容</h2>
              </div>
              <div className="space-y-6">
                {mockResult.structuredContent.chapters.map((chapter, index) => (
                  <div key={index} className="border-l-4 border-green-500 pl-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {chapter.title}
                      </h3>
                      <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {chapter.timeRange}
                      </span>
                    </div>
                    <ul className="space-y-2">
                      {chapter.keyPoints.map((point, pointIndex) => (
                        <li key={pointIndex} className="flex items-start">
                          <CheckSquare className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* 知识图谱 */}
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <Network className="h-5 w-5 text-purple-600 mr-2" />
                  <h2 className="text-xl font-semibold text-gray-900">交互式知识图谱</h2>
                </div>
                <div className="text-sm text-gray-500">
                  点击节点查看AI解释
                </div>
              </div>
              
              {/* 知识图谱可视化 */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <KnowledgeGraphVisualization
                  graphData={knowledgeGraphData}
                  onNodeClick={handleConceptClick}
                  onRequestExplanation={handleRequestExplanation}
                  height={500}
                  width={undefined} // 自适应宽度
                  className="w-full"
                />
              </div>
              
              {/* 图谱说明 */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">如何使用知识图谱：</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <strong>拖拽节点</strong>：重新排列图谱布局</li>
                  <li>• <strong>滚轮缩放</strong>：放大或缩小视图</li>
                  <li>• <strong>点击节点</strong>：查看概念的详细AI解释</li>
                  <li>• <strong>悬停节点</strong>：查看概念类型和重要度</li>
                  <li>• <strong>连线颜色</strong>：红色=依赖关系，紫色=相关关系，青色=包含关系</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 侧边栏 */}
          <div className="space-y-6">
            {/* 学习信息卡片 */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">学习信息</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">预计学习时间</span>
                  <span className="font-medium">{mockResult.summary.learningTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">难度等级</span>
                  <span className="font-medium">{mockResult.summary.difficulty}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">核心概念数</span>
                  <span className="font-medium">{mockResult.summary.concepts.length}</span>
                </div>
              </div>
            </div>

            {/* 学习要点 */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">学习要点</h3>
              <ul className="space-y-2">
                {mockResult.summary.keyPoints.map((point, index) => (
                  <li key={index} className="flex items-start">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <span className="text-gray-700 text-sm">{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 下载选项 */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">下载选项</h3>
              <div className="space-y-3">
                <button 
                  onClick={() => handleExportPDF('complete')}
                  className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-red-600 mr-3" />
                    <span className="font-medium">PDF格式</span>
                  </div>
                  <Download className="h-4 w-4 text-gray-400" />
                </button>
                <button className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-blue-600 mr-3" />
                    <span className="font-medium">Markdown</span>
                  </div>
                  <Download className="h-4 w-4 text-gray-400" />
                </button>
                <button 
                  onClick={() => handleExportPDF('cards')}
                  className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center">
                    <Image className="h-5 w-5 text-green-600 mr-3" />
                    <span className="font-medium">学习卡片</span>
                  </div>
                  <Download className="h-4 w-4 text-gray-400" />
                </button>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">操作</h3>
              <div className="space-y-3">
                <button className="w-full btn-secondary flex items-center justify-center">
                  <Bookmark className="h-4 w-4 mr-2" />
                  收藏资料
                </button>
                <button 
                  onClick={() => setShowShareModal(true)}
                  className="w-full btn-secondary flex items-center justify-center"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  分享给朋友
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* 分享模态框 */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        videoTitle={mockResult.videoInfo.title}
        videoProcessId={id || 'demo-123'}
        onShare={handleShare}
      />
    </div>
  )
}