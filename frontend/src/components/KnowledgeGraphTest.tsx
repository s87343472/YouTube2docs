import React from 'react'
import KnowledgeGraphVisualization from './KnowledgeGraphVisualization'

/**
 * 知识图谱测试组件
 * 用于验证知识图谱可视化是否正常工作
 */

const testGraphData = {
  nodes: [
    { 
      id: 'react', 
      name: 'React', 
      type: 'concept' as const, 
      importance: 10
    },
    { 
      id: 'jsx', 
      name: 'JSX', 
      type: 'concept' as const, 
      importance: 8
    },
    { 
      id: 'components', 
      name: 'Components', 
      type: 'subtopic' as const, 
      importance: 9
    },
    { 
      id: 'state', 
      name: 'State', 
      type: 'subtopic' as const, 
      importance: 7
    },
    { 
      id: 'props', 
      name: 'Props', 
      type: 'resource' as const, 
      importance: 6
    }
  ],
  links: [
    { source: 'react', target: 'jsx', type: 'part_of' as const, strength: 3 },
    { source: 'react', target: 'components', type: 'part_of' as const, strength: 3 },
    { source: 'components', target: 'state', type: 'related_to' as const, strength: 2 },
    { source: 'components', target: 'props', type: 'depends_on' as const, strength: 2 }
  ]
}

export const KnowledgeGraphTest: React.FC = () => {
  const handleNodeClick = (node: any) => {
    console.log('Node clicked:', node.name)
  }

  const handleRequestExplanation = async (concept: string): Promise<string> => {
    console.log('Requesting explanation for:', concept)
    return `This is a test explanation for ${concept}`
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">知识图谱可视化测试</h1>
      <div className="border border-gray-300 rounded-lg">
        <KnowledgeGraphVisualization
          graphData={testGraphData}
          onNodeClick={handleNodeClick}
          onRequestExplanation={handleRequestExplanation}
          height={400}
          width={600}
        />
      </div>
    </div>
  )
}

export default KnowledgeGraphTest