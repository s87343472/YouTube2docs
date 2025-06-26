import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { APIManager } from '../config/apis'
import { logger, LogCategory } from '../utils/logger'
import { validators } from '../middleware/validation'
import { authMiddleware } from '../middleware/auth'
import { rateLimitMiddleware } from '../middleware/rateLimit'

/**
 * 概念解释相关的API路由
 * 提供AI驱动的概念解释和相关资源推荐
 */

interface ConceptExplanationRequest {
  concept: string
  context?: string
  language?: string
  includeExamples?: boolean
  includeRelated?: boolean
  includeSources?: boolean
}

interface ConceptExplanation {
  concept: string
  explanation: string
  examples: string[]
  relatedConcepts: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedReadTime: number
  sources: string[]
}

export async function conceptRoutes(fastify: FastifyInstance) {
  
  /**
   * 获取概念的AI解释
   * POST /api/concepts/explain
   */
  fastify.post('/concepts/explain', {
    preHandler: [
      optionalAuth,
      rateLimitMiddleware.moderate
    ],
    schema: {
      body: {
        type: 'object',
        required: ['concept'],
        properties: {
          concept: { type: 'string', minLength: 1, maxLength: 200 },
          context: { type: 'string', maxLength: 1000 },
          language: { type: 'string', enum: ['zh-CN', 'en-US', 'ja-JP'], default: 'zh-CN' },
          includeExamples: { type: 'boolean', default: true },
          includeRelated: { type: 'boolean', default: true }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                concept: { type: 'string' },
                explanation: { type: 'string' },
                examples: { type: 'array', items: { type: 'string' } },
                relatedConcepts: { type: 'array', items: { type: 'string' } },
                difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
                estimatedReadTime: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{
    Body: ConceptExplanationRequest
  }>, reply: FastifyReply) => {
    try {
      const { concept, context, language = 'zh-CN', includeExamples = true, includeRelated = true } = request.body
      
      logger.info('Generating concept explanation', {
        requestId: request.requestId,
        concept,
        language,
        userId: request.user?.id
      }, LogCategory.SERVICE)
      
      // 构建AI提示词
      const prompt = buildExplanationPrompt(concept, context, language, includeExamples, includeRelated)
      
      // 调用Gemini API生成解释
      const geminiApi = await APIManager.getGeminiAPI()
      const result = await geminiApi.generateContent(prompt)
      const responseText = result.response.text()
      
      // 解析AI响应
      const explanation = parseAIExplanation(responseText, concept)
      
      logger.info('Concept explanation generated successfully', {
        requestId: request.requestId,
        concept,
        explanationLength: explanation.explanation.length,
        examplesCount: explanation.examples.length
      }, LogCategory.SERVICE)
      
      reply.send({
        success: true,
        data: explanation
      })
      
    } catch (error) {
      logger.error('Failed to generate concept explanation', error as Error, {
        requestId: request.requestId,
        concept: request.body.concept,
        userId: request.user?.id
      }, LogCategory.SERVICE)
      
      reply.code(500).send({
        success: false,
        error: {
          message: '生成概念解释失败',
          code: 'CONCEPT_EXPLANATION_FAILED'
        }
      })
    }
  })
  
  /**
   * 获取详细的概念信息
   * POST /api/concepts/detailed
   */
  fastify.post('/concepts/detailed', {
    preHandler: [
      optionalAuth,
      rateLimitMiddleware.moderate
    ],
    schema: {
      body: {
        type: 'object',
        required: ['concept'],
        properties: {
          concept: { type: 'string', minLength: 1, maxLength: 200 },
          context: { type: 'string', maxLength: 1000 },
          includeExamples: { type: 'boolean', default: true },
          includeRelated: { type: 'boolean', default: true },
          includeSources: { type: 'boolean', default: true }
        }
      }
    }
  }, async (request: FastifyRequest<{
    Body: ConceptExplanationRequest
  }>, reply: FastifyReply) => {
    try {
      const { concept, context, includeExamples = true, includeRelated = true, includeSources = true } = request.body
      
      logger.info('Generating detailed concept info', {
        requestId: request.requestId,
        concept,
        userId: request.user?.id
      }, LogCategory.SERVICE)
      
      // 构建详细信息提示词
      const prompt = buildDetailedPrompt(concept, context, includeExamples, includeRelated, includeSources)
      
      // 调用Gemini API
      const geminiApi = await APIManager.getGeminiAPI()
      const result = await geminiApi.generateContent(prompt)
      const responseText = result.response.text()
      
      // 解析详细信息
      const detailedInfo = parseDetailedInfo(responseText, concept)
      
      reply.send({
        success: true,
        data: detailedInfo
      })
      
    } catch (error) {
      logger.error('Failed to generate detailed concept info', error as Error, {
        requestId: request.requestId,
        concept: request.body.concept
      }, LogCategory.SERVICE)
      
      reply.code(500).send({
        success: false,
        error: {
          message: '生成详细信息失败',
          code: 'DETAILED_INFO_FAILED'
        }
      })
    }
  })
  
  /**
   * 批量获取概念解释
   * POST /api/concepts/batch-explain
   */
  fastify.post('/concepts/batch-explain', {
    preHandler: [
      optionalAuth,
      rateLimitMiddleware.moderate
    ],
    schema: {
      body: {
        type: 'object',
        required: ['concepts'],
        properties: {
          concepts: { 
            type: 'array', 
            items: { type: 'string', minLength: 1, maxLength: 200 },
            maxItems: 10
          },
          context: { type: 'string', maxLength: 1000 },
          language: { type: 'string', enum: ['zh-CN', 'en-US', 'ja-JP'], default: 'zh-CN' }
        }
      }
    }
  }, async (request: FastifyRequest<{
    Body: {
      concepts: string[]
      context?: string
      language?: string
    }
  }>, reply: FastifyReply) => {
    try {
      const { concepts, context, language = 'zh-CN' } = request.body
      
      logger.info('Generating batch concept explanations', {
        requestId: request.requestId,
        conceptCount: concepts.length,
        concepts,
        userId: request.user?.id
      }, LogCategory.SERVICE)
      
      // 构建批量解释提示词
      const prompt = buildBatchExplanationPrompt(concepts, context, language)
      
      // 调用Gemini API
      const geminiApi = await APIManager.getGeminiAPI()
      const result = await geminiApi.generateContent(prompt)
      const responseText = result.response.text()
      
      // 解析批量响应
      const explanations = parseBatchExplanations(responseText, concepts)
      
      reply.send({
        success: true,
        data: explanations
      })
      
    } catch (error) {
      logger.error('Failed to generate batch explanations', error as Error, {
        requestId: request.requestId,
        conceptCount: request.body.concepts.length
      }, LogCategory.SERVICE)
      
      reply.code(500).send({
        success: false,
        error: {
          message: '批量生成解释失败',
          code: 'BATCH_EXPLANATION_FAILED'
        }
      })
    }
  })
  
  /**
   * 搜索相关概念
   * POST /api/concepts/search-related
   */
  fastify.post('/concepts/search-related', {
    preHandler: [
      optionalAuth,
      rateLimitMiddleware.moderate
    ],
    schema: {
      body: {
        type: 'object',
        required: ['concept'],
        properties: {
          concept: { type: 'string', minLength: 1, maxLength: 200 },
          limit: { type: 'number', minimum: 1, maximum: 10, default: 5 }
        }
      }
    }
  }, async (request: FastifyRequest<{
    Body: {
      concept: string
      limit?: number
    }
  }>, reply: FastifyReply) => {
    try {
      const { concept, limit = 5 } = request.body
      
      logger.info('Searching related concepts', {
        requestId: request.requestId,
        concept,
        limit
      }, LogCategory.SERVICE)
      
      // 构建相关概念搜索提示词
      const prompt = `请为概念"${concept}"找出${limit}个最相关的概念。

要求：
1. 返回与"${concept}"密切相关的概念
2. 概念应该是同一知识领域或相关领域的
3. 按相关度从高到低排序
4. 每个概念用一行，不要编号
5. 只返回概念名称，不要解释

格式示例：
概念1
概念2
概念3`

      const geminiApi = await APIManager.getGeminiAPI()
      const result = await geminiApi.generateContent(prompt)
      const responseText = result.response.text()
      
      // 解析相关概念
      const relatedConcepts = responseText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .slice(0, limit)
      
      reply.send({
        success: true,
        data: {
          concept,
          relatedConcepts
        }
      })
      
    } catch (error) {
      logger.error('Failed to search related concepts', error as Error, {
        requestId: request.requestId,
        concept: request.body.concept
      }, LogCategory.SERVICE)
      
      reply.code(500).send({
        success: false,
        error: {
          message: '搜索相关概念失败',
          code: 'RELATED_CONCEPTS_SEARCH_FAILED'
        }
      })
    }
  })
}

/**
 * 构建解释提示词
 */
function buildExplanationPrompt(
  concept: string, 
  context?: string, 
  language: string = 'zh-CN',
  includeExamples: boolean = true,
  includeRelated: boolean = true
): string {
  const contextPart = context ? `\n\n背景信息：${context}` : ''
  const examplesPart = includeExamples ? '\n- 2-3个具体的实例或应用场景' : ''
  const relatedPart = includeRelated ? '\n- 3-5个相关概念' : ''
  
  return `请详细解释概念"${concept}"。${contextPart}

请按以下格式提供信息：
- 清晰准确的定义解释（200-300字）
- 难度级别（beginner/intermediate/advanced）${examplesPart}${relatedPart}

要求：
1. 解释要通俗易懂，适合学习者理解
2. 避免过于技术性的术语，如需使用请同时解释
3. 内容要准确可靠
4. 语言：${language === 'zh-CN' ? '中文' : language === 'en-US' ? 'English' : '日本語'}

请以JSON格式返回：
{
  "concept": "${concept}",
  "explanation": "详细解释",
  "difficulty": "difficulty_level",
  "examples": ["例子1", "例子2"],
  "relatedConcepts": ["相关概念1", "相关概念2", "相关概念3"],
  "estimatedReadTime": 预计阅读时间（分钟）
}`
}

/**
 * 构建详细信息提示词
 */
function buildDetailedPrompt(
  concept: string,
  context?: string,
  includeExamples: boolean = true,
  includeRelated: boolean = true,
  includeSources: boolean = true
): string {
  const contextPart = context ? `\n\n背景信息：${context}` : ''
  
  return `请为概念"${concept}"提供详细的学习信息。${contextPart}

请包含以下内容：
1. 详细定义和解释（400-500字）
2. 核心特点和重要性
3. 实际应用案例和例子
4. 学习建议和理解要点
5. 相关概念和扩展阅读方向
6. 难度评估和学习时间预估

请以JSON格式返回详细信息。`
}

/**
 * 构建批量解释提示词
 */
function buildBatchExplanationPrompt(
  concepts: string[],
  context?: string,
  language: string = 'zh-CN'
): string {
  const contextPart = context ? `\n\n背景信息：${context}` : ''
  const conceptsList = concepts.map((c, i) => `${i + 1}. ${c}`).join('\n')
  
  return `请为以下概念提供简洁准确的解释：
${conceptsList}${contextPart}

要求：
1. 每个概念提供100-150字的解释
2. 解释要准确易懂
3. 语言：${language === 'zh-CN' ? '中文' : language === 'en-US' ? 'English' : '日本語'}

请以JSON格式返回，键为概念名称，值为解释：
{
  "${concepts[0]}": "解释内容",
  "${concepts[1]}": "解释内容"
}`
}

/**
 * 解析AI解释响应
 */
function parseAIExplanation(responseText: string, concept: string): ConceptExplanation {
  try {
    // 尝试解析JSON响应
    const cleanedResponse = responseText.replace(/```json\n?|\n?```/g, '').trim()
    const parsed = JSON.parse(cleanedResponse)
    
    return {
      concept: parsed.concept || concept,
      explanation: parsed.explanation || '暂无解释',
      examples: Array.isArray(parsed.examples) ? parsed.examples : [],
      relatedConcepts: Array.isArray(parsed.relatedConcepts) ? parsed.relatedConcepts : [],
      difficulty: parsed.difficulty || 'intermediate',
      estimatedReadTime: parsed.estimatedReadTime || 3,
      sources: parsed.sources || []
    }
  } catch (error) {
    // JSON解析失败，提取文本内容
    logger.warn('Failed to parse JSON response, extracting text', {
      error: (error as Error).message,
      responseText: responseText.substring(0, 200)
    }, LogCategory.SERVICE)
    
    return {
      concept,
      explanation: responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''),
      examples: [],
      relatedConcepts: [],
      difficulty: 'intermediate',
      estimatedReadTime: 3,
      sources: []
    }
  }
}

/**
 * 解析详细信息响应
 */
function parseDetailedInfo(responseText: string, concept: string): ConceptExplanation {
  return parseAIExplanation(responseText, concept)
}

/**
 * 解析批量解释响应
 */
function parseBatchExplanations(responseText: string, concepts: string[]): { [key: string]: string } {
  try {
    const cleanedResponse = responseText.replace(/```json\n?|\n?```/g, '').trim()
    const parsed = JSON.parse(cleanedResponse)
    
    // 确保所有概念都有解释
    const explanations: { [key: string]: string } = {}
    concepts.forEach(concept => {
      explanations[concept] = parsed[concept] || `关于"${concept}"的详细解释暂不可用。`
    })
    
    return explanations
  } catch (error) {
    // 解析失败，为每个概念提供降级解释
    const explanations: { [key: string]: string } = {}
    concepts.forEach(concept => {
      explanations[concept] = `关于"${concept}"的详细解释暂时无法生成，建议查阅相关资料。`
    })
    return explanations
  }
}