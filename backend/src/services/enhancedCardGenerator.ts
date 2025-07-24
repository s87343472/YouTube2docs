import { StudyCard, Concept, LearningMaterial } from '../types'
import { initGemini, hasGeminiKey, API_CONFIG } from '../config/apis'

/**
 * 安全解析Gemini API返回的JSON内容
 */
function safeParseGeminiJson(content: string): any {
  try {
    // 先尝试直接解析
    return JSON.parse(content.trim())
  } catch (e) {
    try {
      // 清理内容
      let cleanContent = content.trim()
      
      // 尝试提取markdown中的JSON
      if (cleanContent.includes('```json')) {
        const matches = cleanContent.match(/```json\s*([\s\S]*?)\s*```/)
        if (matches && matches[1]) {
          cleanContent = matches[1].trim()
        }
      } else if (cleanContent.includes('```')) {
        // 尝试提取```块中的内容
        const matches = cleanContent.match(/```\s*([\s\S]*?)\s*```/)
        if (matches && matches[1]) {
          cleanContent = matches[1].trim()
        }
      }
      
      // 移除可能的前缀文本（如"这是JSON格式的回复："等）
      const jsonStartIndex = cleanContent.search(/[{\[]/)
      if (jsonStartIndex > 0) {
        cleanContent = cleanContent.substring(jsonStartIndex)
      }
      
      // 找到最后一个}或]，移除之后的内容
      let jsonEndIndex = -1
      let bracketCount = 0
      let inString = false
      let escapeNext = false
      
      for (let i = 0; i < cleanContent.length; i++) {
        const char = cleanContent[i]
        
        if (escapeNext) {
          escapeNext = false
          continue
        }
        
        if (char === '\\') {
          escapeNext = true
          continue
        }
        
        if (char === '"' && !escapeNext) {
          inString = !inString
          continue
        }
        
        if (!inString) {
          if (char === '{' || char === '[') {
            bracketCount++
          } else if (char === '}' || char === ']') {
            bracketCount--
            if (bracketCount === 0) {
              jsonEndIndex = i
              break
            }
          }
        }
      }
      
      if (jsonEndIndex > -1) {
        cleanContent = cleanContent.substring(0, jsonEndIndex + 1)
      }
      
      return JSON.parse(cleanContent)
      
    } catch (innerError) {
      console.error('Failed to parse Gemini JSON response:', content.substring(0, 300) + '...')
      console.error('Cleaned content attempt:', content.replace(/\n/g, '\\n').substring(0, 200))
      
      // 作为最后的尝试，返回空数组或对象
      const trimmed = content.trim()
      if (trimmed.startsWith('[')) {
        console.warn('Returning empty array as fallback for invalid JSON array')
        return []
      } else if (trimmed.startsWith('{')) {
        console.warn('Returning empty object as fallback for invalid JSON object')
        return {}
      }
      
      throw new Error('Invalid JSON response from Gemini')
    }
  }
}

/**
 * 增强版学习卡片生成器
 * 优化卡片质量，提供更有价值的学习内容
 */
export class EnhancedCardGenerator {
  
  /**
   * 生成高质量学习卡片的主函数
   */
  static async generateEnhancedStudyCards(
    learningMaterial: LearningMaterial,
    maxCards: number = 10
  ): Promise<StudyCard[]> {
    console.log('🎨 Generating enhanced study cards...')
    
    try {
      // 如果没有API key，使用高质量的模拟数据
      if (!hasGeminiKey()) {
        return this.generateHighQualityMockCards(learningMaterial)
      }

      const cards: StudyCard[] = []
      
      // 1. 核心概念深度理解卡片（3-4张）
      const conceptCards = await this.generateDeepConceptCards(
        learningMaterial.summary.concepts.slice(0, 4),
        learningMaterial.videoInfo.title,
        learningMaterial.structuredContent
      )
      cards.push(...conceptCards)
      
      // 2. 实践应用卡片（2-3张）
      const practiceCards = await this.generatePracticeCards(
        learningMaterial.summary.keyPoints,
        learningMaterial.summary.concepts,
        learningMaterial.videoInfo.title
      )
      cards.push(...practiceCards)
      
      // 3. 思维模型卡片（1-2张）
      const mentalModelCards = await this.generateMentalModelCards(
        learningMaterial.knowledgeGraph,
        learningMaterial.summary
      )
      cards.push(...mentalModelCards)
      
      // 4. 记忆技巧卡片（1-2张）
      const memoryCards = await this.generateAdvancedMemoryCards(
        learningMaterial.summary.concepts.slice(0, 2),
        learningMaterial.videoInfo.title
      )
      cards.push(...memoryCards)
      
      // 5. 综合测验卡片（1张）
      const quizCard = await this.generateComprehensiveQuizCard(learningMaterial)
      if (quizCard) cards.push(quizCard)
      
      // 返回最多maxCards张卡片，确保质量
      return this.optimizeCardSelection(cards, maxCards)
      
    } catch (error) {
      console.error('Failed to generate enhanced cards:', error)
      return this.generateHighQualityMockCards(learningMaterial)
    }
  }
  
  /**
   * 生成深度概念理解卡片
   */
  private static async generateDeepConceptCards(
    concepts: Concept[],
    videoTitle: string,
    structuredContent: any
  ): Promise<StudyCard[]> {
    const systemPrompt = `你是顶级教育专家，擅长创建深度学习材料。请为核心概念创建高质量学习卡片。

要求：
1. 深度解析概念本质，不要停留在表面
2. 包含具体例子、类比和应用场景
3. 设计渐进式理解路径
4. 避免教科书式的枯燥定义
5. 让学习者能真正掌握并应用概念

卡片结构：
{
  "id": "deep_concept_X",
  "type": "concept",
  "title": "[概念名称] - 深度理解",
  "content": "🎯 核心洞察\\n[用一句话点出概念的本质]\\n\\n📖 深度解析\\n[2-3句话深入解释，使用类比或故事]\\n\\n💡 关键理解点\\n• [理解点1：为什么这样]\\n• [理解点2：如何运作]\\n• [理解点3：与什么相关]\\n\\n🔧 实际应用\\n[1-2个具体的应用例子]\\n\\n🤔 思考问题\\n[一个能检验理解深度的问题]",
  "difficulty": "medium",
  "estimatedTime": 6,
  "relatedConcepts": ["相关概念1", "相关概念2"]
}`

    const userPrompt = `视频主题：${videoTitle}

核心概念：
${concepts.map((c, i) => `${i+1}. ${c.name}
   解释：${c.explanation}
   ${c.examples ? `例子：${c.examples.join(', ')}` : ''}`).join('\n\n')}

视频结构信息：
${structuredContent.chapters?.slice(0, 3).map((ch: any) => 
  `- ${ch.title}: ${ch.keyPoints.slice(0, 2).join(', ')}`
).join('\n') || '无'}

请为每个概念创建一张深度理解卡片，返回JSON数组。确保内容具体、实用、有洞察力。`

    try {
      const gemini = initGemini()
      const model = gemini.getGenerativeModel({ 
        model: API_CONFIG.GEMINI.MODEL,
        generationConfig: {
          temperature: 0.7, // 稍高的温度以获得更有创意的内容
          maxOutputTokens: 2000,
          responseMimeType: "application/json"
        }
      })
      
      const result = await model.generateContent([systemPrompt, userPrompt])
      const response = await result.response
      const content = response.text()
      
      const cards = safeParseGeminiJson(content)
      console.log(`✅ Generated ${cards.length} deep concept cards`)
      return cards
      
    } catch (error) {
      console.error('Failed to generate deep concept cards:', error)
      return []
    }
  }
  
  /**
   * 生成实践应用卡片
   */
  private static async generatePracticeCards(
    keyPoints: string[],
    concepts: Concept[],
    videoTitle: string
  ): Promise<StudyCard[]> {
    const systemPrompt = `你是实践学习专家。创建帮助学习者实际应用知识的练习卡片。

要求：
1. 设计具体可执行的练习任务
2. 提供清晰的步骤指导
3. 包含预期结果和自我评估标准
4. 难度适中，循序渐进
5. 与视频内容紧密相关

卡片结构：
{
  "id": "practice_X",
  "type": "application",
  "title": "实践练习：[练习主题]",
  "content": "🎯 练习目标\\n[明确说明通过练习要达到什么]\\n\\n📝 练习步骤\\n1. [具体步骤1]\\n2. [具体步骤2]\\n3. [具体步骤3]\\n\\n💡 关键提示\\n• [避免常见错误]\\n• [成功要点]\\n\\n✅ 完成标准\\n[如何判断练习成功完成]\\n\\n🚀 进阶挑战\\n[可选的更高难度任务]",
  "difficulty": "medium",
  "estimatedTime": 10,
  "relatedConcepts": ["概念1", "概念2"]
}`

    const userPrompt = `视频主题：${videoTitle}

关键学习点：
${keyPoints.slice(0, 3).map((p, i) => `${i+1}. ${p}`).join('\n')}

涉及概念：
${concepts.slice(0, 3).map(c => c.name).join(', ')}

请设计2-3个实践练习卡片，帮助学习者真正掌握和应用这些知识。返回JSON数组。`

    try {
      const gemini = initGemini()
      const model = gemini.getGenerativeModel({ 
        model: API_CONFIG.GEMINI.MODEL,
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 1500,
          responseMimeType: "application/json"
        }
      })
      
      const result = await model.generateContent([systemPrompt, userPrompt])
      const response = await result.response
      const content = response.text()
      
      const cards = safeParseGeminiJson(content)
      console.log(`✅ Generated ${cards.length} practice cards`)
      return cards
      
    } catch (error) {
      console.error('Failed to generate practice cards:', error)
      return []
    }
  }
  
  /**
   * 生成思维模型卡片
   */
  private static async generateMentalModelCards(
    knowledgeGraph: any,
    summary: any
  ): Promise<StudyCard[]> {
    const systemPrompt = `你是认知科学专家。创建帮助构建思维模型的学习卡片。

要求：
1. 提炼核心思维框架
2. 展示概念间的关系模式
3. 提供记忆和理解的心智图
4. 强调整体性理解
5. 便于知识迁移

卡片结构：
{
  "id": "model_X", 
  "type": "summary",
  "title": "思维模型：[模型名称]",
  "content": "🧠 核心模型\\n[用简洁的方式描述思维模型]\\n\\n🔗 关系网络\\n• [关系1]\\n• [关系2]\\n• [关系3]\\n\\n💡 理解框架\\n[提供一个帮助记忆和理解的框架或口诀]\\n\\n🎯 应用场景\\n1. [场景1]\\n2. [场景2]\\n\\n📌 记忆锚点\\n[一个帮助回忆整个模型的关键词或图像]",
  "difficulty": "hard",
  "estimatedTime": 8,
  "relatedConcepts": ["所有相关概念"]
}`

    const conceptNames = summary.concepts?.slice(0, 5).map((c: any) => c.name).join(', ') || ''
    const keyRelations = knowledgeGraph.edges?.slice(0, 3).map((e: any) => 
      `${e.source} → ${e.target}`
    ).join(', ') || ''

    const userPrompt = `核心概念：${conceptNames}

关键关系：${keyRelations}

学习重点：
${summary.keyPoints?.slice(0, 3).join('\n') || ''}

请创建1-2个思维模型卡片，帮助学习者构建整体认知框架。返回JSON数组。`

    try {
      const gemini = initGemini()
      const model = gemini.getGenerativeModel({ 
        model: API_CONFIG.GEMINI.MODEL,
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 1200,
          responseMimeType: "application/json"
        }
      })
      
      const result = await model.generateContent([systemPrompt, userPrompt])
      const response = await result.response
      const content = response.text()
      
      const cards = safeParseGeminiJson(content)
      console.log(`✅ Generated ${cards.length} mental model cards`)
      return cards
      
    } catch (error) {
      console.error('Failed to generate mental model cards:', error)
      return []
    }
  }
  
  /**
   * 生成高级记忆技巧卡片
   */
  private static async generateAdvancedMemoryCards(
    concepts: Concept[],
    videoTitle: string
  ): Promise<StudyCard[]> {
    const systemPrompt = `你是记忆专家。创建使用科学记忆方法的学习卡片。

要求：
1. 使用联想、故事、图像等记忆技巧
2. 创建易于回忆的记忆钩子
3. 设计间隔重复的复习策略
4. 包含自测题目
5. 让枯燥内容变得生动有趣

卡片结构：
{
  "id": "memory_X",
  "type": "concept",
  "title": "记忆大师：[概念名]",
  "content": "🎭 记忆故事\\n[用一个生动的故事或场景包含核心信息]\\n\\n🔑 记忆钥匙\\n• 视觉：[视觉联想]\\n• 听觉：[谐音或韵律]\\n• 动作：[动作联想]\\n\\n📍 记忆宫殿\\n[将概念放置在熟悉场景中的描述]\\n\\n⚡ 快速回忆\\n口诀：[简短的记忆口诀]\\n\\n📝 自测\\nQ: [测试问题]\\nA: [答案提示]",
  "difficulty": "easy",
  "estimatedTime": 4,
  "relatedConcepts": []
}`

    const userPrompt = `视频主题：${videoTitle}

需要记忆的概念：
${concepts.map((c, i) => `${i+1}. ${c.name}：${c.explanation}`).join('\n')}

请为每个概念创建一张高级记忆卡片，使用创意记忆技巧。返回JSON数组。`

    try {
      const gemini = initGemini()
      const model = gemini.getGenerativeModel({ 
        model: API_CONFIG.GEMINI.MODEL,
        generationConfig: {
          temperature: 0.9, // 高温度以获得更有创意的记忆方法
          maxOutputTokens: 1200,
          responseMimeType: "application/json"
        }
      })
      
      const result = await model.generateContent([systemPrompt, userPrompt])
      const response = await result.response
      const content = response.text()
      
      const cards = safeParseGeminiJson(content)
      console.log(`✅ Generated ${cards.length} advanced memory cards`)
      return cards
      
    } catch (error) {
      console.error('Failed to generate memory cards:', error)
      return []
    }
  }
  
  /**
   * 生成综合测验卡片
   */
  private static async generateComprehensiveQuizCard(
    learningMaterial: LearningMaterial
  ): Promise<StudyCard | null> {
    const systemPrompt = `你是教育评估专家。创建一张综合测验卡片，全面检验学习效果。

要求：
1. 涵盖视频的核心知识点
2. 包含不同难度的问题
3. 测试理解、应用和分析能力
4. 提供自评标准
5. 激发深度思考

卡片结构：
{
  "id": "quiz_comprehensive",
  "type": "question",
  "title": "综合掌握度测验",
  "content": "🎯 学习检验\\n\\n📝 基础理解（各1分）\\n1. [基础问题1]\\n2. [基础问题2]\\n\\n🔧 应用能力（各2分）\\n3. [应用问题1]\\n4. [应用问题2]\\n\\n🧠 深度思考（3分）\\n5. [分析问题]\\n\\n💡 评分标准\\n• 8-10分：优秀掌握\\n• 6-7分：良好理解\\n• 4-5分：需要复习\\n• <4分：建议重新学习\\n\\n✅ 参考答案要点\\n[简要列出各题答案要点]",
  "difficulty": "hard", 
  "estimatedTime": 15,
  "relatedConcepts": ["所有核心概念"]
}`

    const keyPoints = learningMaterial.summary.keyPoints.slice(0, 5).join('; ')
    const concepts = learningMaterial.summary.concepts.slice(0, 3).map(c => c.name).join(', ')

    const userPrompt = `视频标题：${learningMaterial.videoInfo.title}

核心要点：${keyPoints}

重要概念：${concepts}

请创建一张综合测验卡片。返回单个JSON对象。`

    try {
      const gemini = initGemini()
      const model = gemini.getGenerativeModel({ 
        model: API_CONFIG.GEMINI.MODEL,
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 1000,
          responseMimeType: "application/json"
        }
      })
      
      const result = await model.generateContent([systemPrompt, userPrompt])
      const response = await result.response
      const content = response.text()
      
      const card = safeParseGeminiJson(content)
      console.log(`✅ Generated comprehensive quiz card`)
      return card
      
    } catch (error) {
      console.error('Failed to generate quiz card:', error)
      return null
    }
  }
  
  /**
   * 优化卡片选择，确保多样性和质量
   */
  private static optimizeCardSelection(cards: StudyCard[], maxCards: number): StudyCard[] {
    // 按类型分组
    const grouped = cards.reduce((acc, card) => {
      const type = card.type
      if (!acc[type]) acc[type] = []
      acc[type].push(card)
      return acc
    }, {} as Record<string, StudyCard[]>)
    
    // 确保类型多样性
    const selected: StudyCard[] = []
    const typeOrder = ['concept', 'application', 'question', 'summary', 'example']
    
    // 先从每种类型选择最好的
    for (const type of typeOrder) {
      if (grouped[type]?.length > 0 && selected.length < maxCards) {
        selected.push(grouped[type][0])
      }
    }
    
    // 填充剩余配额
    for (const type of typeOrder) {
      if (grouped[type]?.length > 1) {
        const remaining = grouped[type].slice(1)
        for (const card of remaining) {
          if (selected.length < maxCards) {
            selected.push(card)
          }
        }
      }
    }
    
    // 确保每张卡片都有relatedConcepts
    return selected.map((card, index) => ({
      ...card,
      id: card.id || `card_${index + 1}`,
      relatedConcepts: card.relatedConcepts || []
    }))
  }
  
  /**
   * 生成高质量的模拟卡片
   */
  private static generateHighQualityMockCards(learningMaterial: LearningMaterial): StudyCard[] {
    const concepts = learningMaterial.summary.concepts.slice(0, 3)
    const keyPoints = learningMaterial.summary.keyPoints.slice(0, 3)
    
    const cards: StudyCard[] = [
      // 深度概念卡片
      {
        id: 'mock_deep_1',
        type: 'concept',
        title: `${concepts[0]?.name || '核心概念'} - 深度理解`,
        content: `🎯 核心洞察\n这个概念的本质是建立系统化的理解框架。\n\n📖 深度解析\n就像建造房屋需要稳固的地基，${concepts[0]?.name || '这个概念'}是整个知识体系的基石。它不仅定义了基本规则，更重要的是提供了思考问题的新视角。\n\n💡 关键理解点\n• 为什么重要：它解决了传统方法的局限性\n• 如何运作：通过模块化和抽象化实现灵活性\n• 与什么相关：几乎所有高级特性都建立在此基础上\n\n🔧 实际应用\n1. 在日常开发中，可用于优化代码结构\n2. 在系统设计时，帮助做出更好的架构决策\n\n🤔 思考问题\n如果没有这个概念，我们会面临什么样的困难？`,
        difficulty: 'medium',
        estimatedTime: 6,
        relatedConcepts: concepts.slice(1).map(c => c.name)
      },
      
      // 实践应用卡片
      {
        id: 'mock_practice_1',
        type: 'application',
        title: '实践练习：构建你的第一个应用',
        content: `🎯 练习目标\n通过实际操作，深入理解${concepts[0]?.name || '核心概念'}的应用方式。\n\n📝 练习步骤\n1. 创建基础结构：设置项目环境\n2. 实现核心功能：应用所学概念\n3. 测试和优化：验证理解是否正确\n\n💡 关键提示\n• 先从简单案例开始，逐步增加复杂度\n• 遇到问题时，回顾概念定义寻找答案\n\n✅ 完成标准\n能够独立完成一个包含所有核心特性的小项目\n\n🚀 进阶挑战\n尝试将学到的概念应用到你现有的项目中`,
        difficulty: 'medium',
        estimatedTime: 10,
        relatedConcepts: concepts.map(c => c.name)
      },
      
      // 思维模型卡片
      {
        id: 'mock_model_1',
        type: 'summary',
        title: '思维模型：知识网络构建法',
        content: `🧠 核心模型\n将零散的知识点连接成网络，形成立体的理解结构。\n\n🔗 关系网络\n• 基础层：核心定义和原理\n• 应用层：实践方法和技巧\n• 创新层：延伸思考和可能性\n\n💡 理解框架\n"点-线-面-体"记忆法：\n点=概念，线=关系，面=应用，体=体系\n\n🎯 应用场景\n1. 学习新技术时的知识整理\n2. 解决复杂问题时的思路梳理\n\n📌 记忆锚点\n想象一张蜘蛛网，每个节点都是一个知识点`,
        difficulty: 'hard',
        estimatedTime: 8,
        relatedConcepts: ['所有概念']
      },
      
      // 记忆技巧卡片
      {
        id: 'mock_memory_1',
        type: 'concept',
        title: `记忆大师：${concepts[0]?.name || '核心概念'}`,
        content: `🎭 记忆故事\n想象你是一位建筑师，${concepts[0]?.name || '这个概念'}就是你的王牌工具...\n\n🔑 记忆钥匙\n• 视觉：像乐高积木一样可以自由组合\n• 听觉："咔嗒"一声完美契合\n• 动作：双手合十的组合动作\n\n📍 记忆宫殿\n把它放在你家门口，每次进门都会看到\n\n⚡ 快速回忆\n口诀："基础稳固，应用灵活"\n\n📝 自测\nQ: 这个概念的三个关键特征是什么？\nA: 模块化、可复用、易扩展`,
        difficulty: 'easy',
        estimatedTime: 4,
        relatedConcepts: []
      },
      
      // 综合测验卡片
      {
        id: 'mock_quiz_1',
        type: 'question',
        title: '综合掌握度测验',
        content: `🎯 学习检验\n\n📝 基础理解（各1分）\n1. ${concepts[0]?.name || '核心概念'}的定义是什么？\n2. 它解决了什么问题？\n\n🔧 应用能力（各2分）\n3. 举例说明如何在实际项目中应用\n4. 与传统方法相比有何优势？\n\n🧠 深度思考（3分）\n5. 这个概念如何改变了你对问题的思考方式？\n\n💡 评分标准\n• 8-10分：优秀掌握\n• 6-7分：良好理解\n• 4-5分：需要复习\n• <4分：建议重新学习\n\n✅ 参考答案要点\n1-2: 基础定义和问题背景\n3-4: 具体应用案例和优势分析\n5: 思维转变和深层影响`,
        difficulty: 'hard',
        estimatedTime: 15,
        relatedConcepts: concepts.map(c => c.name)
      }
    ]
    
    return cards
  }
}