import React from 'react'
import { X, Brain, BookOpen, FileText, Lightbulb, ExternalLink, Info } from 'lucide-react'

interface KnowledgeNode {
  id: string
  name: string
  type: 'concept' | 'subtopic' | 'resource' | 'process' | 'flowchart' | 'decision'
  importance: number
  explanation?: string
  relatedResources?: string[]
  steps?: string[]
  flowData?: any
}

interface ConceptDetailModalProps {
  isOpen: boolean
  onClose: () => void
  node: KnowledgeNode | null
  onRequestExplanation?: (concept: string) => Promise<string>
}

export const ConceptDetailModal: React.FC<ConceptDetailModalProps> = ({
  isOpen,
  onClose,
  node,
  onRequestExplanation
}) => {
  const [isLoadingExplanation, setIsLoadingExplanation] = React.useState(false)
  const [aiExplanation, setAiExplanation] = React.useState<string>('')

  const handleRequestExplanation = async () => {
    if (!node || !onRequestExplanation) return
    
    setIsLoadingExplanation(true)
    try {
      const explanation = await onRequestExplanation(node.name)
      setAiExplanation(explanation)
    } catch (error) {
      console.error('Failed to get explanation:', error)
      setAiExplanation('抱歉，获取AI解释失败，请稍后重试。')
    } finally {
      setIsLoadingExplanation(false)
    }
  }

  const getNodeTypeInfo = () => {
    if (!node) return { icon: Info, label: '未知', color: 'gray' }
    
    switch (node.type) {
      case 'concept':
        return { icon: Brain, label: '核心概念', color: 'blue' }
      case 'subtopic':
        return { icon: BookOpen, label: '子主题', color: 'green' }
      case 'resource':
        return { icon: FileText, label: '相关资源', color: 'yellow' }
      case 'process':
        return { icon: FileText, label: '流程步骤', color: 'purple' }
      case 'flowchart':
        return { icon: FileText, label: '流程图', color: 'indigo' }
      case 'decision':
        return { icon: FileText, label: '决策点', color: 'orange' }
      default:
        return { icon: Info, label: '未知', color: 'gray' }
    }
  }

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-50 border-blue-200 text-blue-900',
      green: 'bg-green-50 border-green-200 text-green-900',
      yellow: 'bg-yellow-50 border-yellow-200 text-yellow-900',
      purple: 'bg-purple-50 border-purple-200 text-purple-900',
      indigo: 'bg-indigo-50 border-indigo-200 text-indigo-900',
      orange: 'bg-orange-50 border-orange-200 text-orange-900',
      gray: 'bg-gray-50 border-gray-200 text-gray-900'
    }
    return colors[color as keyof typeof colors] || colors.gray
  }

  if (!isOpen || !node) return null

  const typeInfo = getNodeTypeInfo()
  const colorClasses = getColorClasses(typeInfo.color)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className={`${colorClasses} border-b px-6 py-4 rounded-t-xl`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <typeInfo.icon className="h-6 w-6" />
              <div>
                <h2 className="text-xl font-bold">{node.name}</h2>
                <p className="text-sm opacity-80">{typeInfo.label}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* 重要度 */}
          <div className="flex items-center space-x-2 mb-4">
            <span className="text-sm text-gray-600">重要度:</span>
            <div className="flex items-center space-x-1">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full ${
                    i < node.importance ? 'bg-orange-400' : 'bg-gray-200'
                  }`}
                />
              ))}
              <span className="text-sm font-medium text-gray-700 ml-2">
                {node.importance}/10
              </span>
            </div>
          </div>

          {/* 基本说明 */}
          {node.explanation && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                <Info className="h-4 w-4 mr-2" />
                基本说明
              </h3>
              <p className="text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-lg">
                {node.explanation}
              </p>
            </div>
          )}

          {/* 流程步骤 */}
          {node.steps && node.steps.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                流程步骤
              </h3>
              <div className="space-y-2">
                {node.steps.map((step, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <p className="text-gray-700 flex-1">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 相关资源 */}
          {node.relatedResources && node.relatedResources.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <ExternalLink className="h-4 w-4 mr-2" />
                相关资源
              </h3>
              <div className="flex flex-wrap gap-2">
                {node.relatedResources.map((resource, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    {resource}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* AI详细解释 */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <Lightbulb className="h-4 w-4 mr-2" />
                AI详细解释
              </h3>
              {!aiExplanation && (
                <button
                  onClick={handleRequestExplanation}
                  disabled={isLoadingExplanation}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {isLoadingExplanation ? '生成中...' : '获取AI解释'}
                </button>
              )}
            </div>
            
            {isLoadingExplanation && (
              <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <span className="text-blue-700">AI正在生成详细解释...</span>
              </div>
            )}
            
            {aiExplanation && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
                <p className="text-gray-700 leading-relaxed">{aiExplanation}</p>
              </div>
            )}
            
            {!aiExplanation && !isLoadingExplanation && (
              <p className="text-gray-500 text-sm italic">
                点击"获取AI解释"按钮来获取更详细的概念解释
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 px-6 py-4 rounded-b-xl">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              关闭
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              确定
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConceptDetailModal