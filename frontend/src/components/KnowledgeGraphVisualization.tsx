import React, { useCallback, useRef, useEffect, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Info, 
  Lightbulb, 
  BookOpen,
  X,
  ExternalLink
} from 'lucide-react'

/**
 * 交互式知识图谱可视化组件
 * 支持拖拽、缩放、点击节点查看详细信息
 */

interface KnowledgeNode {
  id: string
  name: string
  type: 'concept' | 'subtopic' | 'resource'
  importance: number
  explanation?: string
  relatedResources?: string[]
  x?: number
  y?: number
  fx?: number
  fy?: number
}

interface KnowledgeLink {
  source: string
  target: string
  type: 'depends_on' | 'related_to' | 'part_of'
  strength: number
}

interface KnowledgeGraphData {
  nodes: KnowledgeNode[]
  links: KnowledgeLink[]
}

interface Props {
  graphData: KnowledgeGraphData
  onNodeClick?: (node: KnowledgeNode) => void
  onRequestExplanation?: (concept: string) => Promise<string>
  className?: string
  height?: number
  width?: number
}

export const KnowledgeGraphVisualization: React.FC<Props> = ({
  graphData,
  onNodeClick,
  onRequestExplanation,
  className = '',
  height = 600,
  width = 800
}) => {
  const graphRef = useRef<any>(null)
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [explanation, setExplanation] = useState<string>('')
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipContent, setTooltipContent] = useState<string>('')
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [isFullscreen, setIsFullscreen] = useState(false)

  // 节点颜色配置
  const getNodeColor = (node: KnowledgeNode) => {
    const colors = {
      concept: '#3B82F6',      // 蓝色 - 核心概念
      subtopic: '#10B981',     // 绿色 - 子主题  
      resource: '#F59E0B'      // 黄色 - 资源
    }
    return colors[node.type] || '#6B7280'
  }

  // 节点大小根据重要性计算
  const getNodeSize = (node: KnowledgeNode) => {
    return Math.max(8, Math.min(20, node.importance * 3))
  }

  // 链接颜色配置
  const getLinkColor = (link: KnowledgeLink) => {
    const colors = {
      depends_on: '#EF4444',   // 红色 - 依赖关系
      related_to: '#8B5CF6',   // 紫色 - 相关关系
      part_of: '#06B6D4'       // 青色 - 包含关系
    }
    return colors[link.type] || '#D1D5DB'
  }

  // 处理节点点击
  const handleNodeClick = useCallback(async (node: KnowledgeNode, _event?: MouseEvent) => {
    console.log('Node clicked:', node)
    setSelectedNode(node)
    
    if (onNodeClick) {
      onNodeClick(node)
    }
    
    // 如果有解释请求函数，自动获取解释
    if (onRequestExplanation && !node.explanation) {
      setIsLoading(true)
      try {
        const explanationText = await onRequestExplanation(node.name)
        setExplanation(explanationText)
        // 更新节点数据（可选）
        node.explanation = explanationText
      } catch (error) {
        console.error('Failed to get explanation:', error)
        setExplanation('抱歉，获取概念解释失败。请稍后重试。')
      } finally {
        setIsLoading(false)
      }
    } else if (node.explanation) {
      setExplanation(node.explanation)
    }
  }, [onNodeClick, onRequestExplanation])

  // 处理节点悬停
  const handleNodeHover = useCallback((node: KnowledgeNode | null, _prevNode?: KnowledgeNode) => {
    if (node) {
      setTooltipContent(`${node.name} (${node.type})`)
      setShowTooltip(true)
    } else {
      setShowTooltip(false)
    }
  }, [])

  // 缩放控制
  const handleZoomIn = () => {
    if (graphRef.current) {
      graphRef.current.zoom(graphRef.current.zoom() * 1.5)
    }
  }

  const handleZoomOut = () => {
    if (graphRef.current) {
      graphRef.current.zoom(graphRef.current.zoom() / 1.5)
    }
  }

  // 重置视图
  const handleResetView = () => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(400)
    }
  }

  // 全屏切换
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  // 关闭详情面板
  const closeDetailsPanel = () => {
    setSelectedNode(null)
    setExplanation('')
  }

  // 鼠标移动处理tooltip位置
  const handleMouseMove = (event: React.MouseEvent) => {
    setTooltipPosition({
      x: event.clientX + 10,
      y: event.clientY - 10
    })
  }

  // 移除自定义节点渲染，使用默认渲染以确保可视化正常显示

  // 组件挂载时自适应视图
  useEffect(() => {
    if (graphRef.current && graphData.nodes.length > 0) {
      setTimeout(() => {
        handleResetView()
      }, 100)
    }
  }, [graphData])

  const containerClass = isFullscreen 
    ? 'fixed inset-0 z-50 bg-white' 
    : `relative ${className}`

  const graphHeight = isFullscreen ? window.innerHeight - 60 : height
  const graphWidth = isFullscreen ? window.innerWidth : width

  return (
    <div className={containerClass}>
      {/* 控制栏 */}
      <div className="absolute top-4 left-4 z-10 flex items-center space-x-2">
        <div className="bg-white rounded-lg shadow-md p-2 flex items-center space-x-2">
          <button
            onClick={handleZoomIn}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="放大"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          
          <button
            onClick={handleZoomOut}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="缩小"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          
          <div className="w-px h-6 bg-gray-300" />
          
          <button
            onClick={handleResetView}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="重置视图"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          
          <button
            onClick={toggleFullscreen}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title={isFullscreen ? "退出全屏" : "全屏显示"}
          >
            {isFullscreen ? <X className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* 图例 */}
      <div className="absolute top-4 right-4 z-10">
        <div className="bg-white rounded-lg shadow-md p-4 max-w-xs">
          <h4 className="text-sm font-semibold text-gray-800 mb-3">图例</h4>
          <div className="space-y-2 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>核心概念</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>子主题</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span>相关资源</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-600">
              💡 点击节点查看详细解释
            </p>
          </div>
        </div>
      </div>

      {/* 主图谱区域 */}
      <div 
        className="relative"
        onMouseMove={handleMouseMove}
        style={{ height: graphHeight, width: graphWidth }}
      >
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          nodeColor={(node) => getNodeColor(node as KnowledgeNode)}
          nodeVal={(node) => getNodeSize(node as KnowledgeNode)}
          nodeLabel={(node) => (node as KnowledgeNode).name}
          onNodeClick={handleNodeClick}
          onNodeHover={(node, prevNode) => handleNodeHover(node as KnowledgeNode | null, prevNode as KnowledgeNode | undefined)}
          linkColor={link => getLinkColor(link as KnowledgeLink)}
          linkWidth={link => (link as KnowledgeLink).strength * 2}
          linkDirectionalArrowLength={6}
          linkDirectionalArrowRelPos={1}
          linkCurvature={0.2}
          cooldownTime={3000}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.3}
          height={graphHeight}
          width={graphWidth}
          backgroundColor="#fafafa"
          nodeRelSize={6}
          enableNodeDrag={true}
          enableZoomInteraction={true}
          enablePanInteraction={true}
        />
        
        {/* 悬停提示 */}
        {showTooltip && (
          <div
            className="absolute z-20 bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none"
            style={{
              left: tooltipPosition.x,
              top: tooltipPosition.y,
              transform: 'translate(-50%, -100%)'
            }}
          >
            {tooltipContent}
          </div>
        )}
      </div>

      {/* 节点详情面板 */}
      {selectedNode && (
        <div className="absolute bottom-4 left-4 right-4 z-20">
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 max-w-2xl mx-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-6 h-6 rounded-full"
                  style={{ backgroundColor: getNodeColor(selectedNode) }}
                ></div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedNode.name}</h3>
                  <p className="text-sm text-gray-500">
                    {selectedNode.type === 'concept' && '核心概念'}
                    {selectedNode.type === 'subtopic' && '子主题'}
                    {selectedNode.type === 'resource' && '相关资源'}
                    {' • '}重要度: {selectedNode.importance}/10
                  </p>
                </div>
              </div>
              <button
                onClick={closeDetailsPanel}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4">
              {isLoading ? (
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <span className="text-gray-600">AI正在生成详细解释...</span>
                </div>
              ) : explanation ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-blue-600">
                    <Lightbulb className="h-5 w-5" />
                    <span className="font-medium">AI概念解释</span>
                  </div>
                  <p className="text-gray-700 leading-relaxed">{explanation}</p>
                </div>
              ) : selectedNode.explanation ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-blue-600">
                    <BookOpen className="h-5 w-5" />
                    <span className="font-medium">概念说明</span>
                  </div>
                  <p className="text-gray-700 leading-relaxed">{selectedNode.explanation}</p>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Info className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">暂无详细解释</p>
                  {onRequestExplanation && (
                    <button
                      onClick={() => handleNodeClick(selectedNode)}
                      className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                    >
                      请求AI生成解释
                    </button>
                  )}
                </div>
              )}
              
              {/* 相关资源链接 */}
              {selectedNode.relatedResources && selectedNode.relatedResources.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <div className="flex items-center space-x-2 text-green-600 mb-2">
                    <ExternalLink className="h-4 w-4" />
                    <span className="font-medium text-sm">相关资源</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedNode.relatedResources.map((resource, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
                      >
                        {resource}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default KnowledgeGraphVisualization