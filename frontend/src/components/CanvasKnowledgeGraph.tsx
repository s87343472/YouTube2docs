import React, { useCallback, useMemo, useImperativeHandle, forwardRef } from 'react'
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Connection,
  NodeTypes,
  EdgeTypes,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { 
  Brain, 
  BookOpen, 
  FileText, 
  ExternalLink,
  Info,
  Lightbulb,
  ArrowRight,
  GitBranch,
  Play,
  Square
} from 'lucide-react'
import ConceptDetailModal from './ConceptDetailModal'
import useCanvasCapture, { CaptureOptions } from '../hooks/useCanvasCapture'

/**
 * Canvas式知识图谱组件
 * 类似Obsidian Canvas的卡片式节点布局
 */

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
}

export interface CanvasKnowledgeGraphRef {
  captureAsImage: (options?: CaptureOptions) => Promise<string>
  downloadImage: (filename?: string, options?: CaptureOptions) => Promise<void>
}

// 自定义概念节点组件
const ConceptNode: React.FC<{ data: KnowledgeNode }> = ({ data }) => {
  const getNodeColor = () => {
    switch (data.type) {
      case 'concept': return {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-900',
        accent: 'text-blue-600'
      }
      case 'subtopic': return {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-900',
        accent: 'text-green-600'
      }
      case 'resource': return {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        text: 'text-yellow-900',
        accent: 'text-yellow-600'
      }
      case 'process': return {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        text: 'text-purple-900',
        accent: 'text-purple-600'
      }
      case 'flowchart': return {
        bg: 'bg-indigo-50',
        border: 'border-indigo-200',
        text: 'text-indigo-900',
        accent: 'text-indigo-600'
      }
      case 'decision': return {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        text: 'text-orange-900',
        accent: 'text-orange-600'
      }
      default: return {
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        text: 'text-gray-900',
        accent: 'text-gray-600'
      }
    }
  }

  const getNodeIcon = () => {
    switch (data.type) {
      case 'concept': return <Brain className="h-4 w-4" />
      case 'subtopic': return <BookOpen className="h-4 w-4" />
      case 'resource': return <FileText className="h-4 w-4" />
      case 'process': return <ArrowRight className="h-4 w-4" />
      case 'flowchart': return <GitBranch className="h-4 w-4" />
      case 'decision': return <GitBranch className="h-4 w-4" />
      default: return <Info className="h-4 w-4" />
    }
  }

  const colors = getNodeColor()
  const importanceWidth = Math.max(160, Math.min(280, data.importance * 20))

  return (
    <div 
      className={`
        ${colors.bg} ${colors.border} ${colors.text}
        border-2 rounded-lg p-4 shadow-md hover:shadow-lg
        transition-all duration-200 cursor-pointer
        min-h-[120px] max-w-[300px]
      `}
      style={{ width: `${importanceWidth}px` }}
    >
      {/* 节点头部 */}
      <div className="flex items-center justify-between mb-2">
        <div className={`flex items-center space-x-2 ${colors.accent}`}>
          {getNodeIcon()}
          <span className="text-xs font-medium uppercase tracking-wide">
            {data.type === 'concept' && '核心概念'}
            {data.type === 'subtopic' && '子主题'}
            {data.type === 'resource' && '相关资源'}
            {data.type === 'process' && '流程步骤'}
            {data.type === 'flowchart' && '流程图'}
            {data.type === 'decision' && '决策点'}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          {Array.from({ length: Math.min(5, Math.ceil(data.importance / 2)) }).map((_, i) => (
            <div 
              key={i}
              className={`w-2 h-2 rounded-full ${
                i < data.importance / 2 ? 'bg-current' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>

      {/* 节点标题 */}
      <h3 className="font-semibold text-sm mb-2 leading-tight">
        {data.name}
      </h3>

      {/* 节点描述 */}
      {data.explanation && (
        <p className="text-xs text-gray-600 leading-relaxed mb-3 overflow-hidden" style={{
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          maxHeight: '3.6rem'
        }}>
          {data.explanation}
        </p>
      )}

      {/* 流程步骤 */}
      {data.steps && data.steps.length > 0 && (
        <div className="mb-2">
          <div className="text-xs font-medium text-gray-600 mb-1">步骤:</div>
          <div className="space-y-1">
            {data.steps.slice(0, 2).map((step, index) => (
              <div key={index} className="flex items-start space-x-2">
                <div className="flex-shrink-0 w-4 h-4 bg-white bg-opacity-80 rounded-full flex items-center justify-center text-xs font-medium">
                  {index + 1}
                </div>
                <span className="text-xs text-gray-600 line-clamp-1">{step}</span>
              </div>
            ))}
            {data.steps.length > 2 && (
              <span className="text-xs text-gray-500">
                +{data.steps.length - 2} more steps
              </span>
            )}
          </div>
        </div>
      )}

      {/* 相关资源 */}
      {data.relatedResources && data.relatedResources.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {data.relatedResources.slice(0, 3).map((resource, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-1 bg-white bg-opacity-80 text-xs rounded-full"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              {resource}
            </span>
          ))}
          {data.relatedResources.length > 3 && (
            <span className="text-xs text-gray-500">
              +{data.relatedResources.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* 获取详细解释按钮 */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-200">
        <button className={`flex items-center space-x-1 text-xs ${colors.accent} hover:underline`}>
          <Lightbulb className="h-3 w-3" />
          <span>获取AI解释</span>
        </button>
        <div className="text-xs text-gray-500">
          重要度: {data.importance}/10
        </div>
      </div>
    </div>
  )
}

// 自定义边样式
const CustomEdge: React.FC<any> = ({ id, sourceX, sourceY, targetX, targetY, data }) => {
  const getEdgeColor = () => {
    switch (data?.type) {
      case 'depends_on': return '#EF4444' // 红色 - 依赖关系
      case 'related_to': return '#8B5CF6' // 紫色 - 相关关系
      case 'part_of': return '#06B6D4' // 青色 - 包含关系
      default: return '#D1D5DB' // 灰色
    }
  }

  const getStrokeWidth = () => {
    return Math.max(2, (data?.strength || 1) * 2)
  }

  return (
    <g>
      <path
        id={id}
        d={`M ${sourceX} ${sourceY} L ${targetX} ${targetY}`}
        stroke={getEdgeColor()}
        strokeWidth={getStrokeWidth()}
        fill="none"
        markerEnd="url(#arrowhead)"
      />
      {/* 箭头标记 */}
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill={getEdgeColor()}
          />
        </marker>
      </defs>
    </g>
  )
}

// 数据转换函数
const transformToReactFlowFormat = (graphData: KnowledgeGraphData) => {
  // 转换节点数据
  const nodes: Node[] = graphData.nodes.map((node, index) => ({
    id: node.id,
    type: 'concept',
    position: { 
      x: (index % 3) * 350 + 50, // 3列布局
      y: Math.floor(index / 3) * 200 + 50 // 行间距200px
    },
    data: node,
    draggable: true,
  }))

  // 转换边数据
  const edges: Edge[] = graphData.links.map((link, index) => ({
    id: `edge-${index}`,
    source: link.source,
    target: link.target,
    type: 'custom',
    data: {
      type: link.type,
      strength: link.strength,
    },
    animated: link.type === 'depends_on', // 依赖关系动画
  }))

  return { nodes, edges }
}

export const CanvasKnowledgeGraph = forwardRef<CanvasKnowledgeGraphRef, Props>(({
  graphData,
  onNodeClick,
  onRequestExplanation,
  className = ''
}, ref) => {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => transformToReactFlowFormat(graphData),
    [graphData]
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [selectedNode, setSelectedNode] = React.useState<KnowledgeNode | null>(null)
  const [showModal, setShowModal] = React.useState(false)
  
  const { captureCanvas, downloadCanvasImage } = useCanvasCapture()
  
  // 生成唯一的Canvas ID
  const canvasId = React.useMemo(() => `canvas-knowledge-graph-${Date.now()}`, [])
  
  // 暴露图像捕获方法给父组件
  useImperativeHandle(ref, () => ({
    captureAsImage: async (options?: CaptureOptions) => {
      return await captureCanvas(canvasId, {
        format: 'png',
        quality: 0.95,
        scale: 2,
        backgroundColor: '#ffffff',
        ...options
      })
    },
    downloadImage: async (filename = 'knowledge-graph', options?: CaptureOptions) => {
      return await downloadCanvasImage(canvasId, filename, {
        format: 'png',
        quality: 0.95,
        scale: 2,
        backgroundColor: '#ffffff',
        ...options
      })
    }
  }), [captureCanvas, downloadCanvasImage, canvasId])

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    const nodeData = node.data as KnowledgeNode
    setSelectedNode(nodeData)
    setShowModal(true)
    
    if (onNodeClick) {
      onNodeClick(nodeData)
    }
  }, [onNodeClick])

  const nodeTypes: NodeTypes = useMemo(() => ({
    concept: ConceptNode,
  }), [])

  const edgeTypes: EdgeTypes = useMemo(() => ({
    custom: CustomEdge,
  }), [])

  return (
    <div id={canvasId} className={`w-full h-full ${className}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{
          padding: 0.2,
        }}
        attributionPosition="bottom-left"
      >
        <Background color="#f0f0f0" gap={20} />
        <Controls />
        <MiniMap 
          nodeColor={(node) => {
            switch (node.data.type) {
              case 'concept': return '#3B82F6'
              case 'subtopic': return '#10B981'
              case 'resource': return '#F59E0B'
              default: return '#6B7280'
            }
          }}
          nodeStrokeWidth={3}
          nodeBorderRadius={8}
        />
      </ReactFlow>

      {/* 概念详情模态框 */}
      <ConceptDetailModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        node={selectedNode}
        onRequestExplanation={onRequestExplanation}
      />
    </div>
  )
})

export default CanvasKnowledgeGraph