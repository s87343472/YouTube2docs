import { initGemini, hasGeminiKey, API_CONFIG } from '../config/apis'
import { 
  VideoInfo, 
  TranscriptionResult, 
  LearningMaterial, 
  Summary, 
  StructuredContent, 
  Concept,
  Chapter 
} from '../types'
import { KnowledgeGraphService } from './knowledgeGraphService'

/**
 * 智能内容分析引擎
 * 使用GPT-4分析转录内容，生成结构化学习资料
 */
export class ContentAnalyzer {
  private static readonly MAX_RETRIES = 3
  private static readonly RETRY_DELAY = 2000

  /**
   * 分析视频内容并生成完整学习资料
   */
  static async analyzeLearningContent(
    videoInfo: VideoInfo,
    transcription: TranscriptionResult
  ): Promise<LearningMaterial> {
    console.log(`🧠 Starting content analysis for: ${videoInfo.title}`)

    // 检查Gemini API
    if (!hasGeminiKey()) {
      throw new Error('Gemini API key required for content analysis. Please configure GEMINI_API_KEY.')
    }

    try {
      // 基于视频时长选择分析策略
      const strategy = this.selectAnalysisStrategy(videoInfo)
      console.log(`📊 Using analysis strategy: ${strategy}, API: Gemini`)

      // 并行生成基础内容
      const [summary, structuredContent] = await Promise.all([
        this.generateSummary(videoInfo, transcription, strategy),
        this.generateStructuredContent(videoInfo, transcription, strategy)
      ])

      // 创建基础学习材料
      const baseLearningMaterial: LearningMaterial = {
        videoInfo,
        summary,
        structuredContent,
        knowledgeGraph: { nodes: [], edges: [] },
        studyCards: []
      }

      // 生成知识图谱
      const knowledgeGraph = await KnowledgeGraphService.generateKnowledgeGraph(videoInfo, transcription, baseLearningMaterial)
      
      // 基于知识图谱生成学习卡片
      const studyCards = await KnowledgeGraphService.generateStudyCards(knowledgeGraph, baseLearningMaterial)

      const result: LearningMaterial = {
        videoInfo,
        transcription,
        summary,
        structuredContent,
        knowledgeGraph,
        studyCards
      }

      console.log(`✅ Content analysis completed successfully`)
      return result

    } catch (error) {
      console.error('❌ Content analysis failed:', error)
      throw error
    }
  }

  /**
   * 选择分析策略
   */
  private static selectAnalysisStrategy(videoInfo: VideoInfo): string {
    const duration = this.parseDurationToSeconds(videoInfo.duration)
    
    if (duration <= 600) return 'concise' // 10分钟以内
    if (duration <= 1800) return 'structured' // 30分钟以内  
    if (duration <= 3600) return 'comprehensive' // 60分钟以内
    return 'course' // 60分钟以上
  }

  /**
   * 生成内容摘要
   */
  private static async generateSummary(
    videoInfo: VideoInfo,
    transcription: TranscriptionResult,
    strategy: string
  ): Promise<Summary> {
    const systemPrompt = this.getSummarySystemPrompt(strategy)
    const userPrompt = this.buildSummaryUserPrompt(videoInfo, transcription)

    try {
      const response = await this.callGemini(systemPrompt, userPrompt)
      return this.parseSummaryResponse(response)
    } catch (error) {
      console.error('Failed to generate summary:', error)
      throw error
    }
  }

  /**
   * 生成结构化内容
   */
  private static async generateStructuredContent(
    videoInfo: VideoInfo,
    transcription: TranscriptionResult,
    strategy: string
  ): Promise<StructuredContent> {
    const systemPrompt = this.getStructuredContentSystemPrompt(strategy)
    const userPrompt = this.buildStructuredContentUserPrompt(videoInfo, transcription)

    try {
      const response = await this.callGemini(systemPrompt, userPrompt)
      return this.parseStructuredContentResponse(response)
    } catch (error) {
      console.error('Failed to generate structured content:', error)
      throw error
    }
  }

  /**
   * 调用Gemini API
   */
  private static async callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
    const gemini = initGemini()
    const model = gemini.getGenerativeModel({ 
      model: API_CONFIG.GEMINI.MODEL,
      generationConfig: {
        temperature: API_CONFIG.GEMINI.TEMPERATURE,
        maxOutputTokens: API_CONFIG.GEMINI.MAX_TOKENS,
        responseMimeType: "application/json"
      }
    })
    
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        console.log(`🤖 Gemini API call attempt ${attempt}/${this.MAX_RETRIES}`)
        
        const prompt = `${systemPrompt}\n\n${userPrompt}`
        const result = await model.generateContent(prompt)
        const response = await result.response
        const content = response.text()

        if (!content) {
          throw new Error('Empty response from Gemini')
        }

        console.log(`✅ Gemini response received (${content.length} characters)`)
        return content

      } catch (error) {
        lastError = error as Error
        console.error(`❌ Gemini attempt ${attempt} failed:`, error)
        
        if (attempt < this.MAX_RETRIES) {
          await this.delay(this.RETRY_DELAY * attempt)
        }
      }
    }

    throw lastError || new Error('Gemini API failed after all retries')
  }


  /**
   * 获取摘要生成的系统提示
   */
  private static getSummarySystemPrompt(strategy: string): string {
    const basePrompt = `你是一个专业的学习资料生成专家。根据视频转录内容，生成高质量的学习摘要。

输出要求：
1. 必须返回有效的JSON格式
2. 包含关键要点、学习时间、难度评估和核心概念
3. 内容要准确、简洁、有教育价值

JSON格式示例：
{
  "keyPoints": ["要点1", "要点2", "要点3"],
  "learningTime": "预计学习时间",
  "difficulty": "beginner|intermediate|advanced",
  "concepts": [
    {
      "name": "概念名称",
      "explanation": "概念解释"
    }
  ]
}`

    const strategyPrompts = {
      concise: '策略：精炼模式 - 提取3-5个核心要点，适合快速学习',
      structured: '策略：结构化模式 - 提取5-8个要点，包含详细概念解释',
      comprehensive: '策略：深度模式 - 提取8-12个要点，包含高级概念和应用',
      course: '策略：课程模式 - 提取完整知识体系，包含多层次概念'
    }

    return basePrompt + '\n\n' + strategyPrompts[strategy as keyof typeof strategyPrompts]
  }

  /**
   * 获取结构化内容的系统提示
   */
  private static getStructuredContentSystemPrompt(strategy: string): string {
    return `你是一个专业的图文学习资料创作专家。将视频内容转化为完整的、可独立学习的图文教材。

核心要求：
1. 学习者必须能够完全脱离视频，仅通过这些文字资料掌握所有知识点
2. 每个概念都要有详细的定义、解释、例子和应用
3. 保留视频中的具体数据、案例、例子和推理过程
4. 确保内容的完整性和独立性

输出要求：
1. 必须返回有效的JSON格式
2. 每个章节都是完整的学习单元，包含足够的细节
3. 重点突出概念的定义、原理、例子和应用

JSON格式示例：
{
  "overview": "这是什么内容的完整介绍，包含主要概念和学习价值",
  "learningObjectives": ["具体的学习目标1", "具体的学习目标2"],
  "prerequisites": ["需要的前置知识1", "需要的前置知识2"],
  "chapters": [
    {
      "title": "具体的章节标题",
      "timeRange": "XX:XX-XX:XX",
      "keyPoints": [
        "详细要点1：包含完整的解释和例子",
        "详细要点2：包含具体的原理说明",
        "详细要点3：包含实际应用场景"
      ],
      "concepts": ["概念1", "概念2"],
      "detailedExplanation": "本章节的详细内容解释，包含原理、例子、推理过程",
      "examples": ["具体例子1的详细描述", "具体例子2的详细描述"],
      "practicalApplications": ["应用场景1的详细说明", "应用场景2的详细说明"]
    }
  ]
}

策略：${strategy}模式 - 创建完整详细的学习资料，确保学习者无需视频就能完全理解内容。`
  }

  /**
   * 构建摘要用户提示
   */
  private static buildSummaryUserPrompt(videoInfo: VideoInfo, transcription: TranscriptionResult): string {
    return `请分析以下视频内容并生成学习摘要：

视频信息：
- 标题：${videoInfo.title}
- 频道：${videoInfo.channel}
- 时长：${videoInfo.duration}
- 描述：${videoInfo.description || '无描述'}

转录内容：
${transcription.text}

请基于以上信息生成JSON格式的学习摘要。`
  }

  /**
   * 构建结构化内容用户提示
   */
  private static buildStructuredContentUserPrompt(videoInfo: VideoInfo, transcription: TranscriptionResult): string {
    const hasSegments = transcription.segments && transcription.segments.length > 0
    
    let segmentInfo = ''
    if (hasSegments) {
      segmentInfo = '\n\n详细时间分段内容：\n' + 
        transcription.segments!.slice(0, 20).map(segment => 
          `${this.formatTime(segment.start)}-${this.formatTime(segment.end)}: ${segment.text}`
        ).join('\n')
    }

    return `请将以下视频内容转化为完整的图文学习资料。学习者需要能够完全脱离视频，仅通过这些资料掌握所有知识点。

视频信息：
- 标题：${videoInfo.title}
- 频道：${videoInfo.channel}
- 时长：${videoInfo.duration}

完整转录内容：
${transcription.text}${segmentInfo}

要求：
1. 提取并详细解释每个重要概念，包含定义、原理、例子
2. 保留视频中的具体例子、数据、案例分析
3. 确保每个章节都包含足够的细节，可以独立学习
4. 重点关注概念之间的逻辑关系和因果关系
5. 包含实际应用场景和具体例子

请基于以上信息生成JSON格式的详细学习资料。`
  }

  /**
   * 解析摘要响应
   */
  private static parseSummaryResponse(response: string): Summary {
    try {
      console.log('🔍 Parsing summary response, length:', response.length)
      
      // 尝试清理和修复JSON字符串
      let cleanResponse = response.trim()
      
      // 移除可能的Markdown代码块标记
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\n?/, '').replace(/\n?```$/, '')
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\n?/, '').replace(/\n?```$/, '')
      }
      
      // 查找JSON对象的开始和结束
      const startIndex = cleanResponse.indexOf('{')
      const lastIndex = cleanResponse.lastIndexOf('}')
      
      if (startIndex !== -1 && lastIndex !== -1 && lastIndex > startIndex) {
        cleanResponse = cleanResponse.substring(startIndex, lastIndex + 1)
      }
      
      // 如果字符串被截断，尝试修复
      if (!cleanResponse.endsWith('}')) {
        console.warn('⚠️ Summary JSON response appears to be truncated, attempting to fix...')
        const openBraces = (cleanResponse.match(/{/g) || []).length
        const closeBraces = (cleanResponse.match(/}/g) || []).length
        const openBrackets = (cleanResponse.match(/\[/g) || []).length
        const closeBrackets = (cleanResponse.match(/\]/g) || []).length
        
        // 添加缺失的闭合括号
        for (let i = 0; i < openBrackets - closeBrackets; i++) {
          cleanResponse += ']'
        }
        for (let i = 0; i < openBraces - closeBraces; i++) {
          cleanResponse += '}'
        }
      }
      
      console.log('✅ Summary cleaned response ready for parsing')
      const parsed = JSON.parse(cleanResponse)
      
      return {
        keyPoints: parsed.keyPoints || [],
        learningTime: parsed.learningTime || '未知',
        difficulty: parsed.difficulty || 'intermediate',
        concepts: parsed.concepts || []
      }
    } catch (error) {
      console.error('❌ Failed to parse summary response:', error)
      console.error('Response length:', response.length)
      console.error('Response preview:', response.substring(0, 500) + '...')
      console.error('Response suffix:', '...' + response.substring(Math.max(0, response.length - 200)))
      
      // 返回默认摘要
      return {
        keyPoints: ['视频内容正在处理中'],
        learningTime: '约60-90分钟',
        difficulty: 'intermediate',
        concepts: [{
          name: '内容解析',
          explanation: '正在处理视频内容，请稍后查看完整结果'
        }]
      }
    }
  }

  /**
   * 解析结构化内容响应
   */
  private static parseStructuredContentResponse(response: string): StructuredContent {
    try {
      console.log('🔍 Parsing structured content response, length:', response.length)
      
      // 尝试清理和修复JSON字符串
      let cleanResponse = response.trim()
      
      // 移除可能的Markdown代码块标记
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\n?/, '').replace(/\n?```$/, '')
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\n?/, '').replace(/\n?```$/, '')
      }
      
      // 查找JSON对象的开始和结束
      const startIndex = cleanResponse.indexOf('{')
      const lastIndex = cleanResponse.lastIndexOf('}')
      
      if (startIndex !== -1 && lastIndex !== -1 && lastIndex > startIndex) {
        cleanResponse = cleanResponse.substring(startIndex, lastIndex + 1)
      }
      
      // 如果字符串被截断，尝试修复
      if (!cleanResponse.endsWith('}')) {
        console.warn('⚠️ JSON response appears to be truncated, attempting to fix...')
        const openBraces = (cleanResponse.match(/{/g) || []).length
        const closeBraces = (cleanResponse.match(/}/g) || []).length
        const openBrackets = (cleanResponse.match(/\[/g) || []).length
        const closeBrackets = (cleanResponse.match(/\]/g) || []).length
        
        // 添加缺失的闭合括号
        for (let i = 0; i < openBrackets - closeBrackets; i++) {
          cleanResponse += ']'
        }
        for (let i = 0; i < openBraces - closeBraces; i++) {
          cleanResponse += '}'
        }
      }
      
      console.log('✅ Cleaned response ready for parsing')
      const parsed = JSON.parse(cleanResponse)
      
      return {
        overview: parsed.overview || '暂无概述',
        learningObjectives: parsed.learningObjectives || [],
        prerequisites: parsed.prerequisites || [],
        chapters: parsed.chapters || []
      }
    } catch (error) {
      console.error('❌ Failed to parse structured content response:', error)
      console.error('Response length:', response.length)
      console.error('Response preview:', response.substring(0, 500) + '...')
      console.error('Response suffix:', '...' + response.substring(Math.max(0, response.length - 200)))
      
      // 返回一个默认的结构化内容
      return {
        overview: '由于JSON解析错误，无法生成完整的结构化内容',
        learningObjectives: ['理解视频主要内容'],
        prerequisites: ['基础相关知识'],
        chapters: [{
          title: '内容概述',
          timeRange: '00:00-end',
          keyPoints: ['视频内容处理中遇到格式问题'],
          concepts: []
        }]
      }
    }
  }







  /**
   * 工具函数
   */
  private static parseDurationToSeconds(duration: string): number {
    const parts = duration.split(':').map(Number)
    if (parts.length === 2) return parts[0] * 60 + parts[1]
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
    return 0
  }

  private static formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 获取内容分析统计信息
   */
  static getAnalysisStats(material: LearningMaterial): {
    keyPointsCount: number
    conceptsCount: number
    chaptersCount: number
    totalWords: number
    estimatedReadingTime: number
  } {
    const keyPointsCount = material.summary.keyPoints.length
    const conceptsCount = material.summary.concepts.length
    const chaptersCount = material.structuredContent.chapters.length
    
    // 计算总词数
    let totalWords = 0
    totalWords += material.summary.keyPoints.join(' ').split(' ').length
    totalWords += material.summary.concepts.map(c => c.explanation).join(' ').split(' ').length
    totalWords += material.structuredContent.chapters.map(c => 
      c.keyPoints.join(' ') + ' ' + (c.practicalApplications?.join(' ') || '')
    ).join(' ').split(' ').length
    
    // 估算阅读时间（每分钟200词）
    const estimatedReadingTime = Math.ceil(totalWords / 200)
    
    return {
      keyPointsCount,
      conceptsCount, 
      chaptersCount,
      totalWords,
      estimatedReadingTime
    }
  }
}