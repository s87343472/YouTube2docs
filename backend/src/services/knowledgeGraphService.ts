import { hasGeminiKey, initGemini, API_CONFIG } from '../config/apis'
import { VideoInfo, TranscriptionResult, LearningMaterial, KnowledgeGraph, KnowledgeNode, KnowledgeEdge, StudyCard } from '../types'

/**
 * 知识图谱生成服务
 */
export class KnowledgeGraphService {
  
  /**
   * 基于学习材料生成完整知识图谱
   */
  static async generateKnowledgeGraph(
    videoInfo: VideoInfo,
    transcription: TranscriptionResult,
    learningMaterial: LearningMaterial
  ): Promise<KnowledgeGraph> {
    console.log('🧠 Generating knowledge graph for:', videoInfo.title)

    try {
      // 如果没有Gemini密钥，返回模拟数据
      if (!hasGeminiKey()) {
        console.warn('⚠️ Gemini API key not available, generating mock knowledge graph')
        return this.generateMockKnowledgeGraph(videoInfo, learningMaterial)
      }

      // 第一步：提取知识概念
      const concepts = await this.extractConcepts(videoInfo, transcription, learningMaterial)
      
      // 第二步：构建知识节点
      const nodes = await this.buildKnowledgeNodes(concepts, transcription)
      
      // 第三步：分析概念关系
      const edges = await this.analyzeConceptRelationships(nodes, learningMaterial)
      
      // 第四步：优化知识图谱结构
      const optimizedGraph = this.optimizeKnowledgeGraph(nodes, edges)
      
      // 第五步：生成元数据和学习路径
      const metadata = this.generateGraphMetadata(optimizedGraph.nodes, optimizedGraph.edges, learningMaterial)

      console.log(`✅ Knowledge graph generated: ${metadata.totalNodes} nodes, ${metadata.totalEdges} edges`)

      return {
        nodes: optimizedGraph.nodes,
        edges: optimizedGraph.edges,
        metadata
      }

    } catch (error) {
      console.error('❌ Failed to generate knowledge graph:', error)
      return this.generateMockKnowledgeGraph(videoInfo, learningMaterial)
    }
  }

  /**
   * 生成学习卡片
   */
  static async generateStudyCards(
    knowledgeGraph: KnowledgeGraph,
    learningMaterial: LearningMaterial
  ): Promise<StudyCard[]> {
    console.log('📚 Generating enhanced study cards using batch API calls')

    try {
      if (!hasGeminiKey()) {
        return this.generateEnhancedMockStudyCards(knowledgeGraph, learningMaterial)
      }

      const cards: StudyCard[] = []

      // 分批次生成，每次传递最少必要信息，减少API调用复杂度
      console.log('🔄 Batch 1: Generating concept cards...')
      const conceptCards = await this.generateConceptCardsBatch(learningMaterial.summary.concepts.slice(0, 3), learningMaterial.videoInfo.title)
      cards.push(...conceptCards)

      console.log('🔄 Batch 2: Generating comprehension cards...')
      const comprehensionCards = await this.generateComprehensionCardsBatch(learningMaterial.summary.keyPoints.slice(0, 2))
      cards.push(...comprehensionCards)

      console.log('🔄 Batch 3: Generating memory cards...')
      const memoryCards = await this.generateMemoryCardsBatch(learningMaterial.summary.concepts.slice(0, 2))
      cards.push(...memoryCards)

      console.log(`✅ Generated ${cards.length} optimized study cards using batch approach`)
      return cards.slice(0, 8) // 控制在8张以内，保证质量

    } catch (error) {
      console.error('❌ Failed to generate study cards:', error)
      return this.generateOptimizedMockStudyCards(knowledgeGraph, learningMaterial)
    }
  }

  /**
   * 第一步：提取关键概念
   */
  private static async extractConcepts(
    videoInfo: VideoInfo,
    transcription: TranscriptionResult,
    learningMaterial: LearningMaterial
  ): Promise<string[]> {
    const systemPrompt = `你是一个知识提取专家。请从视频内容中提取所有重要的概念、技能、事实和过程。

要求：
1. 提取15-30个核心概念
2. 包括理论概念、实践技能、重要事实
3. 避免过于细节的概念
4. 确保概念具有教学价值

请以JSON数组格式返回概念列表：
["概念1", "概念2", ...]`

    const userPrompt = `视频标题：${videoInfo.title}
频道：${videoInfo.channel}
时长：${videoInfo.duration}

转录内容摘要：
${transcription.text.substring(0, 2000)}...

已生成的关键点：
${learningMaterial.summary.keyPoints.join('\n')}

请提取核心概念：`

    try {
      const gemini = initGemini()
      const model = gemini.getGenerativeModel({ 
        model: API_CONFIG.GEMINI.MODEL,
        generationConfig: {
          temperature: API_CONFIG.GEMINI.TEMPERATURE,
          maxOutputTokens: 1000,
          responseMimeType: "application/json"
        }
      })
      
      const prompt = `${systemPrompt}\n\n${userPrompt}`
      const result = await model.generateContent(prompt)
      const response = await result.response
      const content = response.text()

      if (!content) throw new Error('Empty response from Gemini')

      return JSON.parse(content)
    } catch (error) {
      console.error('Failed to extract concepts:', error)
      // 降级到基于关键点的概念提取
      return learningMaterial.summary.keyPoints.map(point => 
        point.substring(0, 50).replace(/[^\w\s]/g, '').trim()
      )
    }
  }

  /**
   * 第二步：构建知识节点
   */
  private static async buildKnowledgeNodes(
    concepts: string[],
    transcription: TranscriptionResult
  ): Promise<KnowledgeNode[]> {
    const nodes: KnowledgeNode[] = []

    for (let i = 0; i < concepts.length; i++) {
      const concept = concepts[i]
      
      const node: KnowledgeNode = {
        id: `concept_${i + 1}`,
        label: concept,
        type: this.classifyConceptType(concept),
        description: await this.generateConceptDescription(concept, transcription),
        importance: this.calculateImportance(concept, transcription),
        complexity: this.calculateComplexity(concept),
        timeRange: this.findConceptTimeRange(concept, transcription),
        examples: this.extractExamples(concept, transcription)
      }

      nodes.push(node)
    }

    return nodes
  }

  /**
   * 第三步：分析概念关系
   */
  private static async analyzeConceptRelationships(
    nodes: KnowledgeNode[],
    learningMaterial: LearningMaterial
  ): Promise<KnowledgeEdge[]> {
    const edges: KnowledgeEdge[] = []

    // 基于内容结构分析概念关系
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const sourceNode = nodes[i]
        const targetNode = nodes[j]

        const relationship = await this.analyzeConceptPair(sourceNode, targetNode, learningMaterial)
        
        if (relationship) {
          edges.push({
            id: `edge_${i}_${j}`,
            source: sourceNode.id,
            target: targetNode.id,
            type: relationship.type,
            strength: relationship.strength,
            description: relationship.description,
            bidirectional: relationship.bidirectional
          })
        }
      }
    }

    return edges
  }

  /**
   * 第四步：优化知识图谱结构
   */
  private static optimizeKnowledgeGraph(
    nodes: KnowledgeNode[],
    edges: KnowledgeEdge[]
  ): { nodes: KnowledgeNode[], edges: KnowledgeEdge[] } {
    // 移除弱关联边（强度 < 3）
    const strongEdges = edges.filter(edge => edge.strength >= 3)
    
    // 移除孤立节点
    const connectedNodeIds = new Set([
      ...strongEdges.map(e => e.source),
      ...strongEdges.map(e => e.target)
    ])
    
    const connectedNodes = nodes.filter(node => connectedNodeIds.has(node.id))

    return {
      nodes: connectedNodes,
      edges: strongEdges
    }
  }

  /**
   * 第五步：生成图谱元数据
   */
  private static generateGraphMetadata(
    nodes: KnowledgeNode[],
    edges: KnowledgeEdge[],
    learningMaterial: LearningMaterial
  ) {
    const coreconcepts = nodes
      .filter(node => node.importance >= 7)
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 5)
      .map(node => node.id)

    const learningPath = this.generateLearningPath(nodes, edges)
    
    const avgComplexity = nodes.reduce((sum, node) => sum + node.complexity, 0) / nodes.length
    const avgImportance = nodes.reduce((sum, node) => sum + node.importance, 0) / nodes.length

    return {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      complexity: Math.round(avgComplexity),
      coverage: Math.round(avgImportance),
      learningPath,
      coreconcepts,
      generatedAt: new Date().toISOString()
    }
  }

  /**
   * 生成学习路径
   */
  private static generateLearningPath(nodes: KnowledgeNode[], edges: KnowledgeEdge[]): string[] {
    // 简单的拓扑排序实现
    const path: string[] = []
    const visited = new Set<string>()
    
    // 按重要性和复杂度排序
    const sortedNodes = [...nodes].sort((a, b) => {
      const scoreA = a.importance - a.complexity
      const scoreB = b.importance - b.complexity
      return scoreB - scoreA
    })

    for (const node of sortedNodes) {
      if (!visited.has(node.id)) {
        path.push(node.id)
        visited.add(node.id)
      }
    }

    return path
  }

  /**
   * 工具函数：分类概念类型
   */
  private static classifyConceptType(concept: string): KnowledgeNode['type'] {
    const conceptLower = concept.toLowerCase()
    
    if (conceptLower.includes('如何') || conceptLower.includes('方法') || conceptLower.includes('步骤')) {
      return 'process'
    }
    if (conceptLower.includes('技能') || conceptLower.includes('能力') || conceptLower.includes('操作')) {
      return 'skill'
    }
    if (conceptLower.includes('应用') || conceptLower.includes('实践') || conceptLower.includes('案例')) {
      return 'application'
    }
    if (conceptLower.includes('数据') || conceptLower.includes('统计') || conceptLower.includes('事实')) {
      return 'fact'
    }
    
    return 'concept'
  }

  /**
   * 生成概念描述
   */
  private static async generateConceptDescription(
    concept: string,
    transcription: TranscriptionResult
  ): Promise<string> {
    // 从转录文本中寻找相关描述
    const text = transcription.text.toLowerCase()
    const conceptLower = concept.toLowerCase()
    
    const sentences = text.split(/[.!?]/)
    const relevantSentences = sentences.filter(sentence => 
      sentence.includes(conceptLower) || 
      conceptLower.split(' ').some(word => sentence.includes(word))
    )

    if (relevantSentences.length > 0) {
      return relevantSentences[0].trim().substring(0, 200) + '...'
    }

    return `${concept}的相关概念，在视频中有详细讲解。`
  }

  /**
   * 计算概念重要性
   */
  private static calculateImportance(concept: string, transcription: TranscriptionResult): number {
    const text = transcription.text.toLowerCase()
    const conceptLower = concept.toLowerCase()
    
    // 计算概念在文本中的出现频率
    const occurrences = (text.match(new RegExp(conceptLower, 'g')) || []).length
    
    // 基于频率和概念长度计算重要性
    const baseScore = Math.min(occurrences * 2, 8)
    const lengthBonus = concept.length > 10 ? 1 : 0
    
    return Math.min(baseScore + lengthBonus + Math.floor(Math.random() * 2), 10)
  }

  /**
   * 计算概念复杂度
   */
  private static calculateComplexity(concept: string): number {
    // 基于概念长度和技术词汇判断复杂度
    const length = concept.length
    const technicalWords = ['算法', '架构', '模式', '原理', '理论', '系统']
    const hasTechnicalWord = technicalWords.some(word => concept.includes(word))
    
    let complexity = Math.min(Math.floor(length / 5), 6)
    if (hasTechnicalWord) complexity += 2
    
    return Math.min(complexity + Math.floor(Math.random() * 2), 10)
  }

  /**
   * 查找概念时间范围
   */
  private static findConceptTimeRange(concept: string, transcription: TranscriptionResult): string {
    // 如果有时间戳，查找概念首次出现的时间
    if (transcription.segments && transcription.segments.length > 0) {
      for (const segment of transcription.segments) {
        if (segment.text.toLowerCase().includes(concept.toLowerCase())) {
          const start = Math.floor(segment.start)
          const end = Math.floor(segment.end)
          return `${Math.floor(start / 60)}:${(start % 60).toString().padStart(2, '0')}-${Math.floor(end / 60)}:${(end % 60).toString().padStart(2, '0')}`
        }
      }
    }
    
    return '全程'
  }

  /**
   * 提取概念示例
   */
  private static extractExamples(concept: string, transcription: TranscriptionResult): string[] {
    const examples: string[] = []
    const text = transcription.text
    const sentences = text.split(/[.!?]/)
    
    // 查找包含"例如"、"比如"等关键词的句子
    const exampleKeywords = ['例如', '比如', '举例', '案例', '实例']
    
    for (const sentence of sentences) {
      if (sentence.includes(concept) && 
          exampleKeywords.some(keyword => sentence.includes(keyword))) {
        examples.push(sentence.trim().substring(0, 100))
        if (examples.length >= 2) break
      }
    }
    
    return examples
  }

  /**
   * 分析概念对关系
   */
  private static async analyzeConceptPair(
    sourceNode: KnowledgeNode,
    targetNode: KnowledgeNode,
    learningMaterial: LearningMaterial
  ): Promise<{
    type: KnowledgeEdge['type'],
    strength: number,
    description: string,
    bidirectional: boolean
  } | null> {
    // 简化的关系分析逻辑
    const source = sourceNode.label.toLowerCase()
    const target = targetNode.label.toLowerCase()
    
    // 检查先决条件关系
    if (sourceNode.complexity < targetNode.complexity && 
        sourceNode.importance >= 6 && targetNode.importance >= 6) {
      return {
        type: 'prerequisite',
        strength: 7,
        description: `${sourceNode.label}是理解${targetNode.label}的基础`,
        bidirectional: false
      }
    }
    
    // 检查应用关系
    if (sourceNode.type === 'concept' && targetNode.type === 'application') {
      return {
        type: 'applies_to',
        strength: 6,
        description: `${sourceNode.label}在${targetNode.label}中得到应用`,
        bidirectional: false
      }
    }
    
    // 检查相似关系
    const similarity = this.calculateSimilarity(source, target)
    if (similarity > 0.3) {
      return {
        type: 'similar',
        strength: Math.floor(similarity * 10),
        description: `${sourceNode.label}与${targetNode.label}有相似之处`,
        bidirectional: true
      }
    }
    
    return null
  }

  /**
   * 计算概念相似度
   */
  private static calculateSimilarity(concept1: string, concept2: string): number {
    const words1 = concept1.split(' ')
    const words2 = concept2.split(' ')
    
    const commonWords = words1.filter(word => words2.includes(word))
    const totalWords = new Set([...words1, ...words2]).size
    
    return commonWords.length / totalWords
  }

  /**
   * 生成概念卡片
   */
  private static async generateConceptCard(node: KnowledgeNode): Promise<StudyCard> {
    // 确保标题不为空
    const title = node.label && node.label.trim() ? node.label : `概念学习 - ${node.id}`
    
    // 确保内容不为空且合理长度
    let content = node.description
    if (!content || content.length > 500) {
      content = `这是关于"${title}"的重要概念。请参考视频${node.timeRange}部分了解详细内容。`
    }
    
    return {
      id: `card_${node.id}`,
      type: 'concept',
      title: title,
      content: content,
      relatedConcepts: [node.id],
      difficulty: node.complexity <= 3 ? 'easy' : node.complexity <= 7 ? 'medium' : 'hard',
      estimatedTime: Math.floor(node.complexity * 1.5) || 2,
      timeReference: node.timeRange || '全程'
    }
  }

  /**
   * 生成总结卡片
   */
  private static async generateSummaryCards(learningMaterial: LearningMaterial): Promise<StudyCard[]> {
    const cards: StudyCard[] = []
    
    // 为每个章节生成总结卡片
    learningMaterial.structuredContent.chapters.forEach((chapter, index) => {
      cards.push({
        id: `summary_card_${index + 1}`,
        type: 'summary',
        title: `${chapter.title} - 总结`,
        content: `关键点：\n${chapter.keyPoints.join('\n')}`,
        relatedConcepts: [],
        difficulty: 'medium',
        estimatedTime: 3,
        timeReference: chapter.timeRange
      })
    })
    
    return cards
  }

  /**
   * 生成问答卡片
   */
  private static async generateQuestionCards(
    knowledgeGraph: KnowledgeGraph,
    learningMaterial: LearningMaterial
  ): Promise<StudyCard[]> {
    const cards: StudyCard[] = []
    
    // 为核心概念生成问题
    knowledgeGraph.metadata?.coreconcepts.forEach((nodeId, index) => {
      const node = knowledgeGraph.nodes.find(n => n.id === nodeId)
      if (node) {
        cards.push({
          id: `question_card_${index + 1}`,
          type: 'question',
          title: `关于${node.label}的思考`,
          content: `请解释${node.label}的核心概念及其重要性。`,
          relatedConcepts: [nodeId],
          difficulty: node.complexity <= 3 ? 'easy' : node.complexity <= 7 ? 'medium' : 'hard',
          estimatedTime: Math.floor(node.complexity * 2),
          timeReference: node.timeRange
        })
      }
    })
    
    return cards.slice(0, 5) // 限制问答卡片数量
  }

  /**
   * 生成模拟知识图谱（用于API不可用时）
   */
  private static generateMockKnowledgeGraph(
    videoInfo: VideoInfo,
    learningMaterial: LearningMaterial
  ): KnowledgeGraph {
    const mockNodes: KnowledgeNode[] = learningMaterial.summary.keyPoints.slice(0, 8).map((point, index) => ({
      id: `concept_${index + 1}`,
      label: point.substring(0, 30),
      type: index % 4 === 0 ? 'concept' : index % 4 === 1 ? 'skill' : index % 4 === 2 ? 'application' : 'process',
      description: `${point}的详细说明和解释。`,
      importance: Math.floor(Math.random() * 5) + 5,
      complexity: Math.floor(Math.random() * 5) + 3,
      timeRange: `${Math.floor(Math.random() * 20)}:00-${Math.floor(Math.random() * 20) + 20}:00`,
      examples: [`${point}的实际应用示例`]
    }))

    const mockEdges: KnowledgeEdge[] = []
    for (let i = 0; i < mockNodes.length - 1; i++) {
      mockEdges.push({
        id: `edge_${i + 1}`,
        source: mockNodes[i].id,
        target: mockNodes[i + 1].id,
        type: 'supports',
        strength: Math.floor(Math.random() * 5) + 5,
        description: `${mockNodes[i].label}支持理解${mockNodes[i + 1].label}`,
        bidirectional: false
      })
    }

    return {
      nodes: mockNodes,
      edges: mockEdges,
      metadata: {
        totalNodes: mockNodes.length,
        totalEdges: mockEdges.length,
        complexity: 6,
        coverage: 7,
        learningPath: mockNodes.map(n => n.id),
        coreconcepts: mockNodes.slice(0, 3).map(n => n.id),
        generatedAt: new Date().toISOString()
      }
    }
  }

  /**
   * 生成知识点精华卡片（详细学习笔记格式）
   */
  /**
   * 批次1：生成核心概念卡片 - 轻量级方法
   */
  private static async generateConceptCardsBatch(concepts: any[], videoTitle: string): Promise<StudyCard[]> {
    const systemPrompt = `你是专业的学习卡片设计师。为视频核心概念生成高质量学习卡片。

要求：
1. 每个概念生成1张简洁实用的卡片
2. 包含核心定义、记忆要点、实例说明
3. 内容具体实用，避免空洞模板
4. 返回JSON数组格式

卡片格式：
{
  "id": "concept_X",
  "type": "concept", 
  "title": "核心概念：[概念名]",
  "content": "📚 定义：[核心定义]\\n\\n💡 关键要点：\\n• [要点1]\\n• [要点2]\\n\\n🔗 记忆提示：[具体提示]",
  "difficulty": "medium",
  "estimatedTime": 5,
  "timeReference": "全程"
}`

    const userPrompt = `视频：${videoTitle}

核心概念：
${concepts.map((c, i) => `${i+1}. ${c.name}：${c.explanation}`).join('\n')}

请为每个概念生成1张学习卡片，返回JSON数组。`

    try {
      const gemini = initGemini()
      const model = gemini.getGenerativeModel({ 
        model: API_CONFIG.GEMINI.MODEL,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1500,
          responseMimeType: "application/json"
        }
      })
      
      const result = await model.generateContent([systemPrompt, userPrompt])
      const response = await result.response
      const content = response.text()

      if (!content) throw new Error('Empty response from Gemini')

      console.log('Raw concept batch response:', content.substring(0, 150) + '...')
      
      const cards = JSON.parse(content)
      if (!Array.isArray(cards)) {
        throw new Error('Response is not an array')
      }
      
      console.log(`✅ Batch generated ${cards.length} concept cards`)
      return cards
    } catch (error) {
      console.error('Failed to generate concept cards batch:', error)
      return this.generateFallbackConceptCards({summary: {concepts}} as any)
    }
  }

  /**
   * 批次2：生成理解检验卡片 - 轻量级方法
   */
  private static async generateComprehensionCardsBatch(keyPoints: string[]): Promise<StudyCard[]> {
    const systemPrompt = `你是理解检验专家。为关键知识点设计思考检验卡片。

要求：
1. 每个要点设计1个深度思考题
2. 包含具体检验任务和自测标准  
3. 避免"为什么重要"等空洞问题
4. 返回JSON数组格式

卡片格式：
{
  "id": "comprehension_X",
  "type": "question",
  "title": "理解检验：[检验主题]", 
  "content": "🎯 思考挑战：[具体挑战]\\n\\n📝 检验任务：\\n• [任务1]\\n• [任务2]\\n\\n✅ 自测标准：[具体标准]",
  "difficulty": "medium",
  "estimatedTime": 8,
  "timeReference": "全程"
}`

    const userPrompt = `关键要点：
${keyPoints.map((point, i) => `${i+1}. ${point}`).join('\n')}

请为每个要点设计1个思考检验卡片，返回JSON数组。`

    try {
      const gemini = initGemini()
      const model = gemini.getGenerativeModel({ 
        model: API_CONFIG.GEMINI.MODEL,
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1200,
          responseMimeType: "application/json"
        }
      })
      
      const result = await model.generateContent([systemPrompt, userPrompt])
      const response = await result.response
      const content = response.text()

      if (!content) throw new Error('Empty response from Gemini')

      console.log('Raw comprehension batch response:', content.substring(0, 150) + '...')
      
      const cards = JSON.parse(content)
      if (!Array.isArray(cards)) {
        throw new Error('Response is not an array')
      }
      
      console.log(`✅ Batch generated ${cards.length} comprehension cards`)
      return cards
    } catch (error) {
      console.error('Failed to generate comprehension cards batch:', error)
      return this.generateFallbackComprehensionCards({summary: {keyPoints}} as any)
    }
  }

  /**
   * 批次3：生成记忆巩固卡片 - 轻量级方法  
   */
  private static async generateMemoryCardsBatch(concepts: any[]): Promise<StudyCard[]> {
    const systemPrompt = `你是记忆技巧专家。为核心概念设计记忆巩固卡片。

要求：
1. 每个概念设计1张快速记忆卡片
2. 包含记忆技巧、关键词提示、自测方法
3. 内容具体实用，便于记忆
4. 返回JSON数组格式

卡片格式：
{
  "id": "memory_X",
  "type": "concept",
  "title": "快速记忆：[概念名]",
  "content": "💡 核心记忆：[一句话定义]\\n\\n🎯 记忆技巧：\\n• 关键词：[2-3个词]\\n• 联想：[具体联想]\\n\\n✅ 快速自测：[检验方法]",
  "difficulty": "easy", 
  "estimatedTime": 3,
  "timeReference": "全程"
}`

    const userPrompt = `概念：
${concepts.map((c, i) => `${i+1}. ${c.name}：${c.explanation}`).join('\n')}

请为每个概念设计1张记忆卡片，返回JSON数组。`

    try {
      const gemini = initGemini()
      const model = gemini.getGenerativeModel({ 
        model: API_CONFIG.GEMINI.MODEL,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1000,
          responseMimeType: "application/json"
        }
      })
      
      const result = await model.generateContent([systemPrompt, userPrompt])
      const response = await result.response
      const content = response.text()

      if (!content) throw new Error('Empty response from Gemini')

      console.log('Raw memory batch response:', content.substring(0, 150) + '...')
      
      const cards = JSON.parse(content)
      if (!Array.isArray(cards)) {
        throw new Error('Response is not an array')
      }
      
      console.log(`✅ Batch generated ${cards.length} memory cards`)
      return cards
    } catch (error) {
      console.error('Failed to generate memory cards batch:', error)
      return this.generateFallbackMemoryCards({summary: {concepts}} as any)
    }
  }

  /**
   * 生成核心概念卡片 - 精准定义核心概念（原版方法保留）
   */
  private static async generateConceptCards(learningMaterial: LearningMaterial): Promise<StudyCard[]> {
    const systemPrompt = `你是一个专业的学习卡片设计师。请为最重要的概念生成真正实用的学习卡片。

核心要求：
1. 严格禁止任何英文内容
2. 每张卡片必须包含具体、实用的记忆提示
3. 提供视频中的真实例子，不要编造
4. 给出具体的记忆技巧和关联方法
5. 避免空洞的模板化内容

请返回JSON数组格式，每个卡片包含以下字段：
- id: "concept_X" 
- type: "concept"
- title: "核心概念：[概念名称]"
- content: 包含定义、特征、例子、记忆提示的完整内容
- difficulty: "easy"或"medium"或"hard"
- estimatedTime: 数字（分钟）
- timeReference: "全程"

重要：content字段必须包含具体实用的内容，避免"请自己总结"等空洞内容。`

    const userPrompt = `视频标题：${learningMaterial.videoInfo.title}

核心概念（从重要性排序）：
${learningMaterial.summary.concepts.slice(0, 4).map((c, i) => `${i+1}. ${c.name}: ${c.explanation}`).join('\n')}

关键要点：
${learningMaterial.summary.keyPoints.slice(0, 3).join('\n')}

请为最重要的3-4个概念生成简洁的学习卡片，返回JSON数组格式。`

    try {
      const gemini = initGemini()
      const model = gemini.getGenerativeModel({ 
        model: API_CONFIG.GEMINI.MODEL,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2000,
          responseMimeType: "application/json"
        }
      })
      
      const result = await model.generateContent([systemPrompt, userPrompt])
      const response = await result.response
      const content = response.text()

      if (!content) throw new Error('Empty response from Gemini')

      console.log('Raw Gemini response:', content.substring(0, 200) + '...')
      
      const cards = JSON.parse(content)
      if (!Array.isArray(cards)) {
        throw new Error('Response is not an array')
      }
      
      console.log(`✅ Generated ${cards.length} concept cards`)
      return cards.slice(0, 4)
    } catch (error) {
      console.error('Failed to generate concept cards:', error)
      console.log('Falling back to fallback method')
      return this.generateFallbackConceptCards(learningMaterial)
    }
  }

  /**
   * 生成详细的图文学习笔记内容
   */
  private static generateDetailedNoteContent(chapter: any, learningMaterial: LearningMaterial): string {
    const content = []
    
    // 章节标题和时间
    content.push(`📖 ${chapter.title}`)
    content.push(`⏰ 视频时间: ${chapter.timeRange}`)
    content.push('')
    
    // 详细解释（如果有的话）
    if (chapter.detailedExplanation) {
      content.push('📚 详细内容:')
      content.push(chapter.detailedExplanation)
      content.push('')
    }
    
    // 核心要点详解
    content.push('🎯 核心要点:')
    chapter.keyPoints.forEach((point: string, idx: number) => {
      content.push(`${idx + 1}. ${point}`)
    })
    content.push('')
    
    // 重要概念详细解释
    if (chapter.concepts && chapter.concepts.length > 0) {
      content.push('🔑 关键概念详解:')
      chapter.concepts.forEach((concept: string) => {
        const conceptDetail = learningMaterial.summary.concepts?.find(c => 
          c.name.toLowerCase().includes(concept.toLowerCase()) || 
          concept.toLowerCase().includes(c.name.toLowerCase())
        )
        if (conceptDetail) {
          content.push(`📌 ${conceptDetail.name}`)
          content.push(`   定义: ${conceptDetail.explanation}`)
          content.push('')
        } else {
          // 生成基于概念名称和章节内容的智能解释
          const explanation = this.generateConceptExplanation(concept, chapter, learningMaterial)
          content.push(`📌 ${concept}`)
          content.push(`   定义: ${explanation}`)
          content.push('')
        }
      })
    }
    
    // 具体例子（如果有的话）
    if (chapter.examples && chapter.examples.length > 0) {
      content.push('💡 具体例子:')
      chapter.examples.forEach((example: string, idx: number) => {
        content.push(`${idx + 1}. ${example}`)
      })
      content.push('')
    }
    
    // 实际应用
    if (chapter.practicalApplications && chapter.practicalApplications.length > 0) {
      content.push('🛠️ 实际应用:')
      chapter.practicalApplications.forEach((app: string, idx: number) => {
        content.push(`${idx + 1}. ${app}`)
      })
      content.push('')
    }
    
    // 学习检查点
    content.push('✅ 学习检查点:')
    content.push('完成本章节学习后，你应该能够:')
    content.push(`• 清楚解释 "${chapter.keyPoints[0]}" 的含义和重要性`)
    content.push('• 理解本章节涉及的所有关键概念')
    content.push('• 说出这些概念的实际应用场景')
    content.push('• 解释不同概念之间的关联关系')
    
    return content.join('\n')
  }

  /**
   * 生成优化的理解检验卡片 - 开放式思考题
   */
  private static async generateOptimizedComprehensionCards(learningMaterial: LearningMaterial): Promise<StudyCard[]> {
    const systemPrompt = `你是理解检验专家。设计能真正检验用户理解深度的问题卡片。

要求：
1. 禁止英文内容
2. 问题要有层次，从基础到深入
3. 提供具体的思考框架和检验标准  
4. 避免空洞的"为什么重要"等问题
5. 要能引导用户主动思考和应用

请返回JSON数组格式，每个卡片包含：
- id: "comprehension_X"
- type: "question" 
- title: "理解检验：[具体方面]"
- content: 包含核心挑战、检验任务、自测标准、思考引导的完整内容
- difficulty: "medium"
- estimatedTime: 数字（分钟）
- timeReference: "全程"

重要：content必须包含具体的检验任务和标准，避免空洞内容。`

    const userPrompt = `基于以下关键要点设计2-3个理解检验卡片：

关键要点：
${learningMaterial.summary.keyPoints.slice(0, 3).join('\n')}

核心概念：
${learningMaterial.summary.concepts.slice(0, 3).map(c => `${c.name}: ${c.explanation}`).join('\n')}

请设计能真正检验理解深度的问题，不要问"为什么重要"这种空洞问题。返回JSON数组格式。`

    try {
      const gemini = initGemini()
      const model = gemini.getGenerativeModel({ 
        model: API_CONFIG.GEMINI.MODEL,
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 2000,
          responseMimeType: "application/json"
        }
      })
      
      const result = await model.generateContent([systemPrompt, userPrompt])
      const response = await result.response
      const content = response.text()

      if (!content) throw new Error('Empty response from Gemini')

      console.log('Raw comprehension response:', content.substring(0, 200) + '...')
      
      const cards = JSON.parse(content)
      if (!Array.isArray(cards)) {
        throw new Error('Response is not an array')
      }
      
      console.log(`✅ Generated ${cards.length} comprehension cards`)
      return cards.slice(0, 3)
    } catch (error) {
      console.error('Failed to generate comprehension cards:', error)
      console.log('Falling back to fallback method')
      return this.generateFallbackComprehensionCards(learningMaterial)
    }
  }

  /**
   * 生成优化的应用实践卡片 - 实际应用场景
   */
  private static async generateOptimizedPracticeCards(learningMaterial: LearningMaterial): Promise<StudyCard[]> {
    const systemPrompt = `你是实践应用设计专家。设计真正可操作的应用实践卡片。

要求：
1. 禁止英文内容
2. 提供具体的应用场景和实施步骤
3. 包含实际的工具、方法和注意事项
4. 避免空洞的"结合实际思考"等建议
5. 要有可衡量的成果和检验标准

请返回JSON数组格式，每个卡片包含：
- id: "practice_X"
- type: "application"
- title: "实践应用：[具体场景]"
- content: 包含实际场景、实施步骤、关键要点、预期成果的完整内容
- difficulty: "hard"
- estimatedTime: 数字（分钟）
- timeReference: "全程"

重要：content必须包含具体可操作的步骤和检验标准，避免空洞建议。`

    const userPrompt = `基于以下内容设计2个具体的实践应用卡片：

视频标题：${learningMaterial.videoInfo.title}

关键要点：
${learningMaterial.summary.keyPoints.slice(0, 3).join('\n')}

请设计真正可操作的实践方案，包含具体步骤、工具和检验标准。返回JSON数组格式。`

    try {
      const gemini = initGemini()
      const model = gemini.getGenerativeModel({ 
        model: API_CONFIG.GEMINI.MODEL,
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 2000,
          responseMimeType: "application/json"
        }
      })
      
      const result = await model.generateContent([systemPrompt, userPrompt])
      const response = await result.response
      const content = response.text()

      if (!content) throw new Error('Empty response from Gemini')

      console.log('Raw practice response:', content.substring(0, 200) + '...')
      
      const cards = JSON.parse(content)
      if (!Array.isArray(cards)) {
        throw new Error('Response is not an array')
      }
      
      console.log(`✅ Generated ${cards.length} practice cards`)
      return cards.slice(0, 2)
    } catch (error) {
      console.error('Failed to generate practice cards:', error)
      console.log('Falling back to fallback method')
      return this.generateFallbackPracticeCards(learningMaterial)
    }
  }

  /**
   * 生成优化的记忆巩固卡片 - 关键术语快速记忆
   */
  private static async generateOptimizedMemoryCards(learningMaterial: LearningMaterial): Promise<StudyCard[]> {
    const systemPrompt = `你是记忆技巧专家。设计真正有效的记忆巩固卡片。

要求：
1. 禁止英文内容
2. 提供具体的记忆技巧和联想方法
3. 包含实用的记忆检验和练习
4. 避免"请自己总结"等空洞指导
5. 要有明确的记忆成功标准

请返回JSON数组格式，每个卡片包含：
- id: "memory_X"
- type: "concept"
- title: "快速记忆：[概念名]"
- content: 包含核心记忆点、记忆技巧、快速练习、记忆检验的完整内容
- difficulty: "easy"
- estimatedTime: 数字（分钟）
- timeReference: "全程"

重要：content必须包含具体的记忆技巧和检验标准，避免空洞指导。`

    const userPrompt = `基于以下概念设计2-3个记忆巩固卡片：

核心概念：
${learningMaterial.summary.concepts.slice(0, 3).map(c => `${c.name}: ${c.explanation}`).join('\n')}

请设计实用的记忆技巧，包含具体的联想方法和快速检验标准。返回JSON数组格式。`

    try {
      const gemini = initGemini()
      const model = gemini.getGenerativeModel({ 
        model: API_CONFIG.GEMINI.MODEL,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1500,
          responseMimeType: "application/json"
        }
      })
      
      const result = await model.generateContent([systemPrompt, userPrompt])
      const response = await result.response
      const content = response.text()

      if (!content) throw new Error('Empty response from Gemini')

      console.log('Raw memory response:', content.substring(0, 200) + '...')
      
      const cards = JSON.parse(content)
      if (!Array.isArray(cards)) {
        throw new Error('Response is not an array')
      }
      
      console.log(`✅ Generated ${cards.length} memory cards`)
      return cards.slice(0, 3)
    } catch (error) {
      console.error('Failed to generate memory cards:', error)
      console.log('Falling back to fallback method')
      return this.generateFallbackMemoryCards(learningMaterial)
    }
  }

  /**
   * 生成概念解释（基于概念名称和章节内容）
   */
  private static generateConceptExplanation(concept: string, chapter: any, learningMaterial: LearningMaterial): string {
    const conceptLower = concept.toLowerCase()
    
    // 基于概念名称的智能解释
    if (conceptLower.includes('模糊性') || conceptLower.includes('ambiguity')) {
      return '指任务的不确定性和复杂程度。高模糊性任务通常没有明确的步骤或固定的解决方案，需要智能体进行探索和适应性决策。'
    }
    
    if (conceptLower.includes('价值') || conceptLower.includes('value')) {
      return '指任务成功完成后能够带来的商业价值或重要性。高价值任务值得投入更多资源，包括使用更复杂的智能体系统。'
    }
    
    if (conceptLower.includes('去风险') || conceptLower.includes('de-risk')) {
      return '指在构建智能体前，先确保核心能力（如API集成、工具使用）已经验证可行，降低项目失败风险。'
    }
    
    if (conceptLower.includes('错误成本') || conceptLower.includes('error') || conceptLower.includes('cost')) {
      return '指智能体出错时造成的损失和影响程度。低错误成本的任务更适合用智能体，因为可以容忍试错和学习过程。'
    }
    
    if (conceptLower.includes('模型') && conceptLower.includes('循环')) {
      return '智能体的核心工作模式：模型接收输入，决定使用哪个工具，执行工具操作，获得反馈，然后重复这个过程直到完成任务。'
    }
    
    if (conceptLower.includes('环境') || conceptLower.includes('environment')) {
      return '智能体操作和交互的系统环境，为智能体提供感知信息并接收智能体的行动输出。环境的复杂性直接影响智能体的设计难度。'
    }
    
    if (conceptLower.includes('工具') || conceptLower.includes('tool')) {
      return '智能体用来在环境中执行具体操作的接口和功能模块。工具的质量和设计直接影响智能体的能力边界。'
    }
    
    if (conceptLower.includes('系统提示') || conceptLower.includes('prompt')) {
      return '给智能体的初始指令和约束条件，定义智能体的目标、行为准则和操作范围。是智能体行为的重要指导。'
    }
    
    if (conceptLower.includes('上下文') || conceptLower.includes('context')) {
      return '大语言模型在任何时刻能够处理和"记住"的信息量。理解智能体的上下文限制对于调试和优化至关重要。'
    }
    
    if (conceptLower.includes('视角') || conceptLower.includes('perspective')) {
      return '站在智能体的角度理解问题，考虑其信息获取方式、决策过程和行为限制，这是调试和改进智能体的关键思维方式。'
    }
    
    if (conceptLower.includes('自省') || conceptLower.includes('introspection')) {
      return '让大语言模型分析和解释智能体的行为轨迹，帮助开发者理解智能体的决策逻辑和潜在改进点。'
    }
    
    if (conceptLower.includes('元工具') || conceptLower.includes('meta')) {
      return '能够创建、修改或优化其他工具的高级工具，代表了智能体系统自我改进和适应的能力方向。'
    }
    
    if (conceptLower.includes('预算') || conceptLower.includes('budget')) {
      return '智能体运行过程中的资源约束，包括计算成本、时间限制等。智能体需要在预算范围内高效完成任务。'
    }
    
    if (conceptLower.includes('多智能体') || conceptLower.includes('multi-agent')) {
      return '多个智能体协同工作的系统架构，通过分工合作提高整体效率和能力，是智能体技术的重要发展方向。'
    }
    
    // 基于章节内容生成通用解释
    const chapterTitle = chapter.title || ''
    const keyPoints = chapter.keyPoints || []
    const contextInfo = keyPoints.length > 0 ? keyPoints[0].substring(0, 100) : chapterTitle
    
    return `在${chapterTitle}中的关键概念，涉及${contextInfo.replace(/\*\*/g, '')}。这个概念对理解本章节内容具有重要意义。`
  }

  /**
   * 生成增强版模拟学习卡片
   */
  private static generateEnhancedMockStudyCards(
    knowledgeGraph: KnowledgeGraph,
    learningMaterial: LearningMaterial
  ): StudyCard[] {
    const cards: StudyCard[] = []
    
    // 1. 知识精华卡片
    learningMaterial.summary.keyPoints.slice(0, 2).forEach((keyPoint, index) => {
      cards.push({
        id: `essential_${index + 1}`,
        type: 'summary',
        title: `💡 核心要点 ${index + 1}`,
        content: `📋 重点内容：${keyPoint}\n\n🎯 学习目标：理解并掌握这个要点的核心含义`,
        relatedConcepts: [],
        difficulty: 'medium',
        estimatedTime: 5,
        timeReference: '全程'
      })
    })
    
    // 2. 理解检验卡片
    learningMaterial.summary.keyPoints.slice(2, 4).forEach((keyPoint, index) => {
      cards.push({
        id: `check_${index + 1}`,
        type: 'question',
        title: `🤔 理解检验 ${index + 1}`,
        content: `❓ 请解释：${keyPoint}\n\n💭 思考：\n• 这个概念的重要性在哪里？\n• 你能举出相关的例子吗？`,
        relatedConcepts: [],
        difficulty: 'medium',
        estimatedTime: 8,
        timeReference: '全程'
      })
    })
    
    // 3. 综合应用卡片
    cards.push({
      id: 'application_1',
      type: 'application',
      title: '🛠️ 知识应用',
      content: `🎯 综合任务：\n基于视频中学到的知识，请思考如何将这些概念应用到实际场景中。\n\n📝 要求：\n• 选择一个具体应用场景\n• 说明应用的步骤和要点\n• 分析可能遇到的挑战`,
      relatedConcepts: [],
      difficulty: 'hard',
      estimatedTime: 15,
      timeReference: '全程'
    })
    
    return cards
  }

  /**
   * 降级处理：生成简单的概念卡片
   */
  private static generateFallbackConceptCards(learningMaterial: LearningMaterial): StudyCard[] {
    const cards: StudyCard[] = []
    
    // 基于已有概念生成简单卡片
    learningMaterial.summary.concepts.slice(0, 4).forEach((concept, index) => {
      const conceptName = concept.name.split('(')[0].trim()
      cards.push({
        id: `concept_${index + 1}`,
        type: 'concept',
        title: `🧠 核心概念：${conceptName}`,
        content: `📚 定义：${concept.explanation}\n\n💡 关键特征：\n• 这是视频中的重要概念\n• 理解这个概念有助于掌握整体内容\n\n🌟 学习建议：\n• 仔细理解定义\n• 思考实际应用场景`,
        difficulty: 'medium',
        estimatedTime: 5,
        timeReference: '全程',
        relatedConcepts: []
      })
    })
    
    return cards
  }

  /**
   * 优化的Mock学习卡片 - 用于API失败时的降级处理
   */
  private static generateOptimizedMockStudyCards(
    knowledgeGraph: KnowledgeGraph, 
    learningMaterial: LearningMaterial
  ): StudyCard[] {
    const cards: StudyCard[] = []
    
    // 1. 核心概念卡片
    learningMaterial.summary.concepts.slice(0, 3).forEach((concept, index) => {
      const conceptName = concept.name.split('(')[0].trim()
      cards.push({
        id: `concept_${index + 1}`,
        type: 'concept',
        title: `🧠 核心概念：${conceptName}`,
        content: `📚 定义：${concept.explanation}\n\n💡 关键价值：\n• 理解这个概念的核心思想\n• 掌握其在实际中的应用\n\n🔗 关联：与其他概念相互关联，构成完整知识体系`,
        difficulty: 'medium',
        estimatedTime: 5,
        timeReference: '全程',
        relatedConcepts: []
      })
    })
    
    // 2. 理解检验卡片
    learningMaterial.summary.keyPoints.slice(0, 2).forEach((point, index) => {
      const shortPoint = point.length > 60 ? point.substring(0, 60) + '...' : point
      cards.push({
        id: `comprehension_${index + 1}`,
        type: 'question',
        title: `🤔 理解检验 ${index + 1}`,
        content: `❓ 思考题：请解释以下要点的含义和重要性\n\n"${shortPoint}"\n\n🎯 思考角度：\n• 核心概念是什么？\n• 为什么重要？\n• 如何应用？`,
        difficulty: 'medium',
        estimatedTime: 7,
        timeReference: '全程',
        relatedConcepts: []
      })
    })
    
    // 3. 应用实践卡片
    cards.push({
      id: 'practice_1',
      type: 'application',
      title: '🛠️ 实践应用',
      content: `🎯 应用挑战：结合视频内容，设计一个实际应用方案\n\n📝 任务：\n• 选择一个具体场景\n• 说明应用步骤\n• 预测挑战和解决方案\n\n💡 提示：可以结合工作或学习环境思考`,
      difficulty: 'hard',
      estimatedTime: 12,
      timeReference: '全程',
      relatedConcepts: []
    })
    
    console.log(`✅ Generated ${cards.length} fallback study cards`)
    return cards.slice(0, 8) // 控制总数
  }

  /**
   * 降级处理：理解检验卡片
   */
  private static generateFallbackComprehensionCards(learningMaterial: LearningMaterial): StudyCard[] {
    const cards: StudyCard[] = []
    
    learningMaterial.summary.keyPoints.slice(0, 2).forEach((point, index) => {
      const shortPoint = point.length > 60 ? point.substring(0, 60) + '...' : point
      cards.push({
        id: `comprehension_${index + 1}`,
        type: 'question',
        title: `🤔 理解检验：核心要点 ${index + 1}`,
        content: `🎯 **核心挑战：**\n请深度分析以下要点的内在逻辑\n\n📝 **要点内容：**\n"${shortPoint}"\n\n✅ **自测标准：**\n• 基础理解：能用自己的话重新表述\n• 深度理解：能解释其重要性和影响\n• 应用理解：能想出具体的应用场景\n\n💡 **思考引导：**\n试着从不同角度分析这个要点，思考它与其他概念的关联`,
        difficulty: 'medium',
        estimatedTime: 8,
        timeReference: '全程',
        relatedConcepts: []
      })
    })
    
    return cards
  }

  /**
   * 降级处理：应用实践卡片
   */
  private static generateFallbackPracticeCards(learningMaterial: LearningMaterial): StudyCard[] {
    const cards: StudyCard[] = []
    
    const topPoints = learningMaterial.summary.keyPoints.slice(0, 2)
    topPoints.forEach((point, index) => {
      cards.push({
        id: `practice_${index + 1}`,
        type: 'application',
        title: `🛠️ 实践应用：方案设计 ${index + 1}`,
        content: `🎯 **实际场景：**\n基于"${point.substring(0, 80)}"设计一个实际应用方案\n\n📋 **实施步骤：**\n1. 分析应用场景和目标用户\n2. 制定具体的实施计划\n3. 确定需要的资源和工具\n4. 设计效果评估标准\n\n⚠️ **关键要点：**\n• 方案要具体可操作\n• 考虑实施中的挑战\n• 设定清晰的成功标准\n\n🎯 **预期成果：**\n完成一个可行的实施方案`,
        difficulty: 'hard',
        estimatedTime: 15,
        timeReference: '全程',
        relatedConcepts: []
      })
    })
    
    return cards
  }

  /**
   * 降级处理：记忆巩固卡片
   */
  private static generateFallbackMemoryCards(learningMaterial: LearningMaterial): StudyCard[] {
    const cards: StudyCard[] = []
    
    learningMaterial.summary.concepts.slice(0, 3).forEach((concept, index) => {
      const conceptName = concept.name.split('(')[0].trim()
      cards.push({
        id: `memory_${index + 1}`,
        type: 'concept',
        title: `🧠 快速记忆：${conceptName}`,
        content: `💡 **核心记忆点：**\n${concept.explanation.substring(0, 80)}...\n\n🎯 **记忆技巧：**\n• **关键词：** ${conceptName}的核心特征\n• **类比记忆：** 联想到相似的概念或经历\n• **应用记忆：** 想象具体的使用场景\n\n✅ **记忆检验：**\n• 能快速说出核心定义\n• 能区分与相似概念的差异\n• 能举出实际应用例子`,
        difficulty: 'easy',
        estimatedTime: 3,
        timeReference: '全程',
        relatedConcepts: []
      })
    })
    
    return cards
  }
}