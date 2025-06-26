/**
 * AI概念解释服务
 * 提供概念的详细解释和相关资源推荐
 */

interface ConceptExplanation {
  concept: string
  explanation: string
  examples: string[]
  relatedConcepts: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedReadTime: number
  sources: string[]
}

interface ExplanationCache {
  [key: string]: {
    data: ConceptExplanation
    timestamp: number
    expires: number
  }
}

class ConceptExplanationService {
  private cache: ExplanationCache = {}
  private readonly CACHE_DURATION = 1000 * 60 * 60 * 24 // 24小时缓存
  
  /**
   * 获取概念的详细解释
   */
  async getConceptExplanation(
    concept: string, 
    context?: string,
    language: string = 'zh-CN'
  ): Promise<string> {
    // 检查缓存
    const cached = this.getCachedExplanation(concept)
    if (cached) {
      return cached.explanation
    }
    
    try {
      const response = await fetch('/api/concepts/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          concept,
          context,
          language,
          includeExamples: true,
          includeRelated: true
        })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        // 缓存结果
        this.cacheExplanation(concept, data.data)
        return data.data.explanation
      } else {
        throw new Error(data.error?.message || '获取解释失败')
      }
    } catch (error) {
      console.error('Failed to get concept explanation:', error)
      
      // 返回降级解释
      return this.getFallbackExplanation(concept)
    }
  }
  
  /**
   * 获取完整的概念信息
   */
  async getDetailedConceptInfo(
    concept: string,
    context?: string
  ): Promise<ConceptExplanation | null> {
    const cached = this.getCachedExplanation(concept)
    if (cached) {
      return cached
    }
    
    try {
      const response = await fetch('/api/concepts/detailed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          concept,
          context,
          includeExamples: true,
          includeRelated: true,
          includeSources: true
        })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        this.cacheExplanation(concept, data.data)
        return data.data
      } else {
        throw new Error(data.error?.message || '获取详细信息失败')
      }
    } catch (error) {
      console.error('Failed to get detailed concept info:', error)
      return null
    }
  }
  
  /**
   * 批量获取概念解释
   */
  async getBatchExplanations(
    concepts: string[],
    context?: string
  ): Promise<{ [concept: string]: string }> {
    const results: { [concept: string]: string } = {}
    
    // 分离已缓存和需要请求的概念
    const cachedConcepts: string[] = []
    const uncachedConcepts: string[] = []
    
    concepts.forEach(concept => {
      const cached = this.getCachedExplanation(concept)
      if (cached) {
        results[concept] = cached.explanation
        cachedConcepts.push(concept)
      } else {
        uncachedConcepts.push(concept)
      }
    })
    
    // 批量请求未缓存的概念
    if (uncachedConcepts.length > 0) {
      try {
        const response = await fetch('/api/concepts/batch-explain', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            concepts: uncachedConcepts,
            context,
            language: 'zh-CN'
          })
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            // 处理批量响应
            Object.entries(data.data).forEach(([concept, explanation]) => {
              results[concept] = explanation as string
              // 缓存结果
              this.cacheExplanation(concept, {
                concept,
                explanation: explanation as string,
                examples: [],
                relatedConcepts: [],
                difficulty: 'intermediate',
                estimatedReadTime: 2,
                sources: []
              })
            })
          }
        }
      } catch (error) {
        console.error('Batch explanation request failed:', error)
        
        // 为失败的概念提供降级解释
        uncachedConcepts.forEach(concept => {
          if (!results[concept]) {
            results[concept] = this.getFallbackExplanation(concept)
          }
        })
      }
    }
    
    return results
  }
  
  /**
   * 搜索相关概念
   */
  async searchRelatedConcepts(
    concept: string,
    limit: number = 5
  ): Promise<string[]> {
    try {
      const response = await fetch('/api/concepts/search-related', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          concept,
          limit
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          return data.data.relatedConcepts || []
        }
      }
    } catch (error) {
      console.error('Failed to search related concepts:', error)
    }
    
    return []
  }
  
  /**
   * 获取概念的学习资源推荐
   */
  async getConceptResources(
    concept: string,
    resourceType: 'video' | 'article' | 'book' | 'course' = 'video'
  ): Promise<Array<{ title: string; url: string; type: string; duration?: string }>> {
    try {
      const response = await fetch('/api/concepts/resources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          concept,
          resourceType,
          limit: 5
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          return data.data.resources || []
        }
      }
    } catch (error) {
      console.error('Failed to get concept resources:', error)
    }
    
    return []
  }
  
  /**
   * 缓存解释结果
   */
  private cacheExplanation(concept: string, explanation: ConceptExplanation): void {
    const now = Date.now()
    this.cache[concept.toLowerCase()] = {
      data: explanation,
      timestamp: now,
      expires: now + this.CACHE_DURATION
    }
  }
  
  /**
   * 获取缓存的解释
   */
  private getCachedExplanation(concept: string): ConceptExplanation | null {
    const cached = this.cache[concept.toLowerCase()]
    if (cached && Date.now() < cached.expires) {
      return cached.data
    }
    
    // 清理过期缓存
    if (cached && Date.now() >= cached.expires) {
      delete this.cache[concept.toLowerCase()]
    }
    
    return null
  }
  
  /**
   * 提供降级解释
   */
  private getFallbackExplanation(concept: string): string {
    const fallbacks = {
      '机器学习': '机器学习是一种人工智能技术，通过算法让计算机从数据中学习模式，无需明确编程就能做出预测或决策。',
      '深度学习': '深度学习是机器学习的一个分支，使用多层神经网络来模拟人脑的学习过程，特别擅长处理图像、语音和文本等复杂数据。',
      '神经网络': '神经网络是一种模拟人脑神经元连接的计算模型，由多个相互连接的节点组成，能够学习和识别复杂的模式。',
      '算法': '算法是解决特定问题的一系列明确步骤或规则，就像做菜的食谱一样，告诉计算机如何处理数据和完成任务。',
      '数据科学': '数据科学是一个跨学科领域，结合统计学、计算机科学和领域知识，从大量数据中提取有价值的洞察和知识。'
    }
    
    return fallbacks[concept as keyof typeof fallbacks] || `${concept}是一个重要的概念，建议查阅相关资料或咨询专业人士以获得更详细的解释。`
  }
  
  /**
   * 清理过期缓存
   */
  public clearExpiredCache(): void {
    const now = Date.now()
    Object.keys(this.cache).forEach(key => {
      if (this.cache[key].expires <= now) {
        delete this.cache[key]
      }
    })
  }
  
  /**
   * 获取缓存统计信息
   */
  public getCacheStats(): { totalEntries: number; validEntries: number } {
    const now = Date.now()
    const totalEntries = Object.keys(this.cache).length
    const validEntries = Object.values(this.cache).filter(entry => entry.expires > now).length
    
    return { totalEntries, validEntries }
  }
}

// 创建单例实例
export const conceptExplanationService = new ConceptExplanationService()

// 定期清理过期缓存
setInterval(() => {
  conceptExplanationService.clearExpiredCache()
}, 1000 * 60 * 60) // 每小时清理一次

export default conceptExplanationService