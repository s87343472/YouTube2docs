import { initOpenAI, hasOpenAIKey, API_CONFIG } from '../config/apis'
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

    if (!hasOpenAIKey()) {
      console.log('⚠️ OpenAI API key not configured, using mock analysis')
      return this.generateMockLearningMaterial(videoInfo, transcription)
    }

    try {
      // 基于视频时长选择分析策略
      const strategy = this.selectAnalysisStrategy(videoInfo)
      console.log(`📊 Using analysis strategy: ${strategy}`)

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
        summary,
        structuredContent,
        knowledgeGraph,
        studyCards
      }

      console.log(`✅ Content analysis completed successfully`)
      return result

    } catch (error) {
      console.error('❌ Content analysis failed:', error)
      return this.generateMockLearningMaterial(videoInfo, transcription)
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
      const response = await this.callGPT4(systemPrompt, userPrompt)
      return this.parseSummaryResponse(response)
    } catch (error) {
      console.error('Failed to generate summary:', error)
      return this.generateMockSummary(videoInfo, transcription)
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
      const response = await this.callGPT4(systemPrompt, userPrompt)
      return this.parseStructuredContentResponse(response)
    } catch (error) {
      console.error('Failed to generate structured content:', error)
      return this.generateMockStructuredContent(videoInfo, transcription)
    }
  }

  /**
   * 调用GPT-4 API
   */
  private static async callGPT4(systemPrompt: string, userPrompt: string): Promise<string> {
    const openai = initOpenAI()
    
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        console.log(`🤖 GPT-4 API call attempt ${attempt}/${this.MAX_RETRIES}`)
        
        const response = await openai.chat.completions.create({
          model: API_CONFIG.OPENAI.MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: API_CONFIG.OPENAI.MAX_TOKENS,
          temperature: API_CONFIG.OPENAI.TEMPERATURE,
          response_format: { type: 'json_object' }
        })

        const content = response.choices[0]?.message?.content
        if (!content) {
          throw new Error('Empty response from GPT-4')
        }

        console.log(`✅ GPT-4 response received (${content.length} characters)`)
        return content

      } catch (error) {
        lastError = error as Error
        console.error(`❌ GPT-4 attempt ${attempt} failed:`, error)
        
        if (attempt < this.MAX_RETRIES) {
          await this.delay(this.RETRY_DELAY * attempt)
        }
      }
    }

    throw lastError || new Error('GPT-4 API failed after all retries')
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
    return `你是一个专业的教学内容结构化专家。将视频内容组织成逻辑清晰的学习章节。

输出要求：
1. 必须返回有效的JSON格式
2. 按时间顺序或逻辑顺序组织章节
3. 每个章节包含标题、时间范围、关键要点

JSON格式示例：
{
  "overview": "内容概述",
  "learningObjectives": ["学习目标1", "学习目标2"],
  "prerequisites": ["前置知识1", "前置知识2"],
  "chapters": [
    {
      "title": "章节标题",
      "timeRange": "开始时间-结束时间",
      "keyPoints": ["要点1", "要点2"],
      "concepts": ["相关概念1", "相关概念2"],
      "practicalApplications": ["应用场景1", "应用场景2"]
    }
  ]
}

策略：${strategy}模式 - 根据视频长度和复杂度调整章节划分的细致程度。`
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
      segmentInfo = '\n\n时间分段信息：\n' + 
        transcription.segments!.slice(0, 10).map(segment => 
          `${this.formatTime(segment.start)}-${this.formatTime(segment.end)}: ${segment.text.substring(0, 100)}...`
        ).join('\n')
    }

    return `请将以下视频内容组织成结构化的学习章节：

视频信息：
- 标题：${videoInfo.title}
- 频道：${videoInfo.channel}
- 时长：${videoInfo.duration}

转录内容：
${transcription.text}${segmentInfo}

请基于以上信息生成JSON格式的结构化内容。`
  }

  /**
   * 解析摘要响应
   */
  private static parseSummaryResponse(response: string): Summary {
    try {
      const parsed = JSON.parse(response)
      return {
        keyPoints: parsed.keyPoints || [],
        learningTime: parsed.learningTime || '未知',
        difficulty: parsed.difficulty || 'intermediate',
        concepts: parsed.concepts || []
      }
    } catch (error) {
      console.error('Failed to parse summary response:', error)
      throw new Error('Invalid JSON response for summary')
    }
  }

  /**
   * 解析结构化内容响应
   */
  private static parseStructuredContentResponse(response: string): StructuredContent {
    try {
      const parsed = JSON.parse(response)
      return {
        overview: parsed.overview,
        learningObjectives: parsed.learningObjectives,
        prerequisites: parsed.prerequisites,
        chapters: parsed.chapters || []
      }
    } catch (error) {
      console.error('Failed to parse structured content response:', error)
      throw new Error('Invalid JSON response for structured content')
    }
  }

  /**
   * 生成模拟学习材料
   */
  private static generateMockLearningMaterial(
    videoInfo: VideoInfo, 
    transcription: TranscriptionResult
  ): LearningMaterial {
    return {
      videoInfo,
      summary: this.generateMockSummary(videoInfo, transcription),
      structuredContent: this.generateMockStructuredContent(videoInfo, transcription),
      knowledgeGraph: { nodes: [], edges: [] },
      studyCards: []
    }
  }

  /**
   * 生成模拟摘要
   */
  private static generateMockSummary(videoInfo: VideoInfo, transcription: TranscriptionResult): Summary {
    const title = videoInfo.title.toLowerCase()
    
    if (title.includes('react')) {
      return {
        keyPoints: [
          'React Hooks是函数组件中使用状态和生命周期的方式',
          'useState用于管理组件内部状态',
          'useEffect用于处理副作用，如API调用和订阅',
          'useContext用于在组件树中共享状态',
          '自定义Hook可以复用状态逻辑'
        ],
        learningTime: '45-60分钟',
        difficulty: 'intermediate',
        concepts: [
          { name: 'useState', explanation: '状态Hook，用于在函数组件中添加状态管理功能' },
          { name: 'useEffect', explanation: '副作用Hook，用于处理副作用操作，如数据获取、订阅等' },
          { name: 'useContext', explanation: '上下文Hook，用于消费React Context，实现组件间状态共享' },
          { name: '自定义Hook', explanation: '可复用的状态逻辑封装，遵循Hook规则的JavaScript函数' }
        ]
      }
    } else if (title.includes('python')) {
      return {
        keyPoints: [
          'Pandas是Python中最重要的数据分析库',
          'DataFrame是Pandas的核心数据结构',
          '数据清洗和预处理是数据分析的关键步骤',
          '聚合和分组操作可以快速获得数据洞察',
          '可视化帮助理解数据模式和趋势'
        ],
        learningTime: '60-75分钟',
        difficulty: 'intermediate',
        concepts: [
          { name: 'DataFrame', explanation: 'Pandas中的二维表格数据结构，类似于Excel表格' },
          { name: '数据清洗', explanation: '处理缺失值、异常值、重复数据的过程' },
          { name: '聚合操作', explanation: '对数据进行分组和统计计算，如求和、平均值等' },
          { name: '数据可视化', explanation: '用图表展示数据的方法，帮助发现模式和趋势' }
        ]
      }
    } else {
      return {
        keyPoints: [
          '掌握核心概念和基本原理',
          '理解实际应用场景和最佳实践',
          '学会解决常见问题的方法',
          '建立系统性的知识结构',
          '培养独立思考和实践能力'
        ],
        learningTime: '30-45分钟',
        difficulty: 'intermediate',
        concepts: [
          { name: '基础概念', explanation: '领域内的核心概念和基本原理' },
          { name: '实践应用', explanation: '理论知识在实际场景中的应用方法' },
          { name: '问题解决', explanation: '分析问题、制定方案、实施解决的能力' }
        ]
      }
    }
  }

  /**
   * 生成模拟结构化内容
   */
  private static generateMockStructuredContent(
    videoInfo: VideoInfo, 
    transcription: TranscriptionResult
  ): StructuredContent {
    const title = videoInfo.title.toLowerCase()
    
    if (title.includes('react')) {
      return {
        overview: '本课程全面介绍React Hooks，包括useState、useEffect、useContext等核心Hooks的使用方法和最佳实践。',
        learningObjectives: [
          '理解React Hooks的设计理念和优势',
          '掌握useState、useEffect、useContext的使用',
          '学会创建自定义Hook来复用逻辑',
          '了解Hook的使用规则和注意事项'
        ],
        prerequisites: [
          'JavaScript ES6+基础',
          'React基础概念',
          '函数组件vs类组件的区别'
        ],
        chapters: [
          {
            title: 'React Hooks 介绍',
            timeRange: '00:00-15:30',
            keyPoints: [
              'Hooks的设计理念和解决的问题',
              '函数组件vs类组件的对比',
              'Hooks的基本使用规则'
            ],
            concepts: ['React Hooks', '函数组件', '状态管理'],
            practicalApplications: ['重构类组件为函数组件']
          },
          {
            title: 'useState Hook详解',
            timeRange: '15:30-35:00',
            keyPoints: [
              'useState的基本语法和用法',
              '状态更新的异步特性',
              '函数式更新和对象状态管理'
            ],
            concepts: ['useState', '状态更新', '重新渲染'],
            practicalApplications: ['计数器组件', '表单状态管理']
          },
          {
            title: 'useEffect Hook详解',
            timeRange: '35:00-65:00',
            keyPoints: [
              'useEffect的执行时机',
              '依赖数组的使用',
              '清理函数和性能优化'
            ],
            concepts: ['useEffect', '副作用', '生命周期'],
            practicalApplications: ['数据获取', '事件监听', '定时器']
          }
        ]
      }
    } else {
      return {
        overview: '本教程涵盖了重要的概念和实用技巧，帮助学习者系统性地掌握相关知识。',
        learningObjectives: [
          '理解核心概念和原理',
          '掌握实际应用技巧',
          '学会解决常见问题',
          '建立完整的知识体系'
        ],
        prerequisites: ['基础理论知识', '相关工具使用经验'],
        chapters: [
          {
            title: '基础概念介绍',
            timeRange: '00:00-20:00',
            keyPoints: ['核心概念定义', '基本原理说明', '应用场景概述'],
            concepts: ['基础概念', '核心原理'],
            practicalApplications: ['基础示例演示']
          },
          {
            title: '实践应用',
            timeRange: '20:00-40:00',
            keyPoints: ['实际操作步骤', '最佳实践方法', '常见问题解决'],
            concepts: ['实践技巧', '问题解决'],
            practicalApplications: ['项目实例', '案例分析']
          }
        ]
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