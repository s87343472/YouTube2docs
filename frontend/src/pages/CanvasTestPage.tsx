import React, { useRef } from 'react'
import CanvasKnowledgeGraph, { CanvasKnowledgeGraphRef } from '../components/CanvasKnowledgeGraph'
import { Download, Camera } from 'lucide-react'

/**
 * Canvas知识图谱测试页面
 * 专门用于展示和测试新的Canvas式知识图谱可视化
 */

const testGraphData = {
  nodes: [
    { 
      id: 'machine-learning', 
      name: '机器学习', 
      type: 'concept' as const, 
      importance: 10,
      explanation: '机器学习是人工智能的一个子领域，通过算法和统计模型使计算机系统能够从数据中学习和改进性能，而无需明确的编程指令。',
      relatedResources: ['Python', 'TensorFlow', 'PyTorch']
    },
    { 
      id: 'ml-workflow', 
      name: '机器学习工作流程', 
      type: 'process' as const, 
      importance: 9,
      explanation: '机器学习项目的标准工作流程，从问题定义到模型部署的完整过程。',
      steps: [
        '1. 问题定义和数据收集',
        '2. 数据探索和预处理',
        '3. 特征工程和选择',
        '4. 模型选择和训练',
        '5. 模型评估和调优',
        '6. 模型部署和监控'
      ]
    },
    { 
      id: 'data-decision', 
      name: '数据质量评估', 
      type: 'decision' as const, 
      importance: 8,
      explanation: '在机器学习项目中，需要决策数据是否足够好来训练模型。',
      steps: [
        '检查数据完整性',
        '评估数据质量',
        '决定是否需要更多数据'
      ]
    },
    { 
      id: 'supervised-learning', 
      name: '监督学习', 
      type: 'concept' as const, 
      importance: 8,
      explanation: '监督学习是机器学习的一种方法，使用标记的训练数据来学习输入和输出之间的映射关系。',
      relatedResources: ['分类算法', '回归算法']
    },
    { 
      id: 'unsupervised-learning', 
      name: '无监督学习', 
      type: 'concept' as const, 
      importance: 8,
      explanation: '无监督学习是在没有标记数据的情况下，从数据中发现隐藏模式和结构的机器学习方法。',
      relatedResources: ['聚类', '降维']
    },
    { 
      id: 'neural-networks', 
      name: '神经网络', 
      type: 'subtopic' as const, 
      importance: 9,
      explanation: '神经网络是受生物神经网络启发的计算模型，由相互连接的节点（神经元）组成，能够学习复杂的非线性关系。',
      relatedResources: ['深度学习', 'CNN', 'RNN']
    },
    { 
      id: 'deep-learning', 
      name: '深度学习', 
      type: 'subtopic' as const, 
      importance: 9,
      explanation: '深度学习是机器学习的一个子集，使用具有多个隐藏层的神经网络来模拟和理解复杂的数据模式。'
    },
    { 
      id: 'algorithms', 
      name: '算法优化', 
      type: 'subtopic' as const, 
      importance: 7,
      explanation: '在机器学习中，算法优化涉及调整模型参数以最小化损失函数和提高预测准确性。'
    },
    { 
      id: 'data-preprocessing', 
      name: '数据预处理', 
      type: 'resource' as const, 
      importance: 6,
      explanation: '数据预处理是机器学习流程中的关键步骤，包括数据清洗、特征选择和数据转换。',
      relatedResources: ['数据清洗', '特征工程', '标准化']
    },
    { 
      id: 'model-evaluation', 
      name: '模型评估', 
      type: 'resource' as const, 
      importance: 7,
      explanation: '模型评估用于衡量机器学习模型的性能，包括准确率、精确率、召回率等指标。',
      relatedResources: ['交叉验证', '混淆矩阵', 'ROC曲线']
    },
    { 
      id: 'overfitting', 
      name: '过拟合与泛化', 
      type: 'resource' as const, 
      importance: 8,
      explanation: '过拟合是模型在训练数据上表现很好但在新数据上表现较差的现象，泛化能力是模型的重要特性。',
      relatedResources: ['正则化', '验证集', '早停法']
    }
  ],
  links: [
    { source: 'machine-learning', target: 'supervised-learning', type: 'part_of' as const, strength: 3 },
    { source: 'machine-learning', target: 'unsupervised-learning', type: 'part_of' as const, strength: 3 },
    { source: 'machine-learning', target: 'neural-networks', type: 'related_to' as const, strength: 2 },
    { source: 'neural-networks', target: 'deep-learning', type: 'part_of' as const, strength: 3 },
    { source: 'supervised-learning', target: 'algorithms', type: 'depends_on' as const, strength: 2 },
    { source: 'unsupervised-learning', target: 'algorithms', type: 'depends_on' as const, strength: 2 },
    { source: 'machine-learning', target: 'data-preprocessing', type: 'depends_on' as const, strength: 3 },
    { source: 'supervised-learning', target: 'model-evaluation', type: 'related_to' as const, strength: 2 },
    { source: 'neural-networks', target: 'overfitting', type: 'related_to' as const, strength: 2 },
    { source: 'deep-learning', target: 'overfitting', type: 'related_to' as const, strength: 3 },
    { source: 'machine-learning', target: 'ml-workflow', type: 'part_of' as const, strength: 3 },
    { source: 'ml-workflow', target: 'data-decision', type: 'part_of' as const, strength: 2 },
    { source: 'data-decision', target: 'data-preprocessing', type: 'related_to' as const, strength: 2 }
  ]
}

export const CanvasTestPage: React.FC = () => {
  const canvasRef = useRef<CanvasKnowledgeGraphRef>(null)
  
  const handleNodeClick = (node: any) => {
    console.log('Canvas节点点击:', node.name)
    // 现在使用自定义模态框，不再需要alert
  }
  
  const handleCaptureImage = async () => {
    if (!canvasRef.current) {
      alert('Canvas组件未就绪')
      return
    }
    
    try {
      await canvasRef.current.downloadImage('test-knowledge-graph', {
        format: 'png',
        quality: 0.95,
        scale: 2
      })
    } catch (error) {
      console.error('Image capture failed:', error)
      alert('图片捕获失败：' + error)
    }
  }

  const handleRequestExplanation = async (concept: string): Promise<string> => {
    console.log('请求AI解释:', concept)
    // 模拟AI解释
    return `这是关于"${concept}"的AI生成解释：这是一个重要的概念，在机器学习领域中扮演着关键角色。通过深入理解这个概念，你将能够更好地掌握相关的技术和应用。`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">Canvas知识图谱测试</h1>
          <p className="text-gray-600 mt-1">
            体验类似Obsidian Canvas的卡片式知识图谱可视化
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">机器学习知识图谱</h2>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div>
                <span>核心概念</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
                <span>子主题</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded"></div>
                <span>相关资源</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-purple-100 border border-purple-200 rounded"></div>
                <span>流程步骤</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-orange-100 border border-orange-200 rounded"></div>
                <span>决策点</span>
              </div>
            </div>
          </div>

          {/* Canvas Knowledge Graph */}
          <div className="border border-gray-200 rounded-lg" style={{ height: '700px' }}>
            <CanvasKnowledgeGraph
              ref={canvasRef}
              graphData={testGraphData}
              onNodeClick={handleNodeClick}
              onRequestExplanation={handleRequestExplanation}
              className="w-full h-full"
            />
          </div>
          
          {/* Test Export Button */}
          <div className="mt-4 flex justify-center">
            <button 
              onClick={handleCaptureImage}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Camera className="h-5 w-5" />
              <span>下载知识图谱图片</span>
            </button>
          </div>

          {/* Instructions */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-medium text-blue-900 mb-2">Canvas视图功能特性：</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✨ <strong>卡片式节点</strong>：类似Obsidian Canvas的直观卡片设计</li>
              <li>🎨 <strong>多类型节点</strong>：概念、流程、决策点等不同类型，颜色区分</li>
              <li>🖱️ <strong>自由拖拽</strong>：可以自由拖动节点到任意位置</li>
              <li>🔍 <strong>缩放导航</strong>：支持缩放和平移，右下角有迷你地图</li>
              <li>📱 <strong>响应式设计</strong>：节点大小根据重要度自动调整</li>
              <li>🔗 <strong>智能连线</strong>：不同颜色的连线表示不同类型的关系</li>
              <li>💡 <strong>详细信息</strong>：点击节点打开优雅的详情模态框</li>
              <li>📋 <strong>流程展示</strong>：流程节点显示步骤信息，支持复杂流程图</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CanvasTestPage