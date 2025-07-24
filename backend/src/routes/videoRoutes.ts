import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { VideoProcessor } from '../services/videoProcessor'
import { AbusePreventionService } from '../services/abusePreventionService'
import { PDFExportService } from '../services/pdfExportService'
import { ProcessVideoRequest, LearningMaterial } from '../types'
import fs from 'fs/promises'
import path from 'path'
// import { 
//   videoProcessingRateLimit, 
//   videoProcessingCooldownMiddleware,
//   anomalyDetectionMiddleware
// } from '../middleware/rateLimitMiddleware' // Temporarily disabled

/**
 * 视频处理相关的API路由
 */
export async function videoRoutes(fastify: FastifyInstance) {
  
  /**
   * 提交视频处理请求
   */
  fastify.post('/videos/process', {
    // preHandler: [
    //   anomalyDetectionMiddleware,
    //   videoProcessingRateLimit,
    //   videoProcessingCooldownMiddleware
    // ], // Temporarily disabled for compilation
    schema: {
      body: {
        type: 'object',
        required: ['youtubeUrl'],
        properties: {
          youtubeUrl: { 
            type: 'string',
            pattern: '^https?://(www\\.)?(youtube\\.com|youtu\\.be)/.+'
          },
          options: {
            type: 'object',
            properties: {
              language: { type: 'string' },
              outputFormat: { 
                type: 'string', 
                enum: ['concise', 'standard', 'detailed'] 
              },
              includeTimestamps: { type: 'boolean' }
            }
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            processId: { type: 'string' },
            status: { type: 'string' },
            estimatedTime: { type: 'number' },
            message: { type: 'string' }
          }
        },
        400: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                statusCode: { type: 'number' },
                message: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: ProcessVideoRequest }>, reply: FastifyReply) => {
    try {
      console.log('📥 Received video processing request:', request.body.youtubeUrl)
      
      // 提取用户ID（如果用户已登录）
      const userId = request.user?.id || '22db8677-988f-4149-8364-6dbb7584befc' // 使用数据库中实际存在的用户ID
      
      // 添加请求元数据
      const requestWithMetadata: ProcessVideoRequest = {
        ...request.body,
        metadata: {
          ipAddress: request.ip,
          userAgent: request.headers['user-agent']
        }
      }
      
      const result = await VideoProcessor.processVideo(requestWithMetadata, userId)
      
      // 记录成功的操作 (暂时禁用)
      // await AbusePreventionService.recordUserOperation(userId, 'video_process')
      // await AbusePreventionService.recordVideoProcessing(userId, request.body.youtubeUrl)
      
      reply.code(200).send(result)
    } catch (error) {
      console.error('❌ Video processing request failed:', error)
      
      reply.code(400).send({
        error: {
          statusCode: 400,
          message: error instanceof Error ? error.message : 'Processing request failed'
        }
      })
    }
  })

  /**
   * 获取处理状态
   */
  fastify.get('/videos/:id/status', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            processId: { type: 'string' },
            status: { type: 'string' },
            progress: { type: 'number' },
            currentStep: { type: 'string' },
            estimatedTimeRemaining: { type: 'number' },
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params
      console.log(`📊 Getting status for process: ${id}`)
      
      const status = await VideoProcessor.getProcessStatus(id)
      
      reply.code(200).send(status)
    } catch (error) {
      console.error('❌ Failed to get process status:', error)
      
      reply.code(404).send({
        error: {
          statusCode: 404,
          message: error instanceof Error ? error.message : 'Process not found'
        }
      })
    }
  })

  /**
   * 获取处理结果
   */
  fastify.get('/videos/:id/result', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params
      console.log(`📋 Getting result for process: ${id}`)
      
      const result = await VideoProcessor.getProcessResult(id)
      
      reply.code(200).send(result)
    } catch (error) {
      console.error('❌ Failed to get process result:', error)
      
      reply.code(404).send({
        error: {
          statusCode: 404,
          message: error instanceof Error ? error.message : 'Result not found'
        }
      })
    }
  })

  /**
   * 获取处理统计信息
   */
  fastify.get('/videos/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      console.log('📈 Getting processing statistics')
      
      const stats = await VideoProcessor.getProcessingStats()
      
      reply.code(200).send({
        status: 'success',
        data: stats,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('❌ Failed to get processing stats:', error)
      
      reply.code(500).send({
        error: {
          statusCode: 500,
          message: 'Failed to retrieve statistics'
        }
      })
    }
  })

  /**
   * 测试视频信息提取
   */
  fastify.post('/videos/test-extract', {
    schema: {
      body: {
        type: 'object',
        required: ['youtubeUrl'],
        properties: {
          youtubeUrl: { type: 'string' }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: { youtubeUrl: string } }>, reply: FastifyReply) => {
    try {
      const { youtubeUrl } = request.body
      console.log(`🧪 Testing video extraction for: ${youtubeUrl}`)
      
      // 动态导入以避免循环依赖
      const { YouTubeService } = await import('../services/youtubeService')
      
      const videoInfo = await YouTubeService.getDetailedVideoInfo(youtubeUrl)
      const analysis = YouTubeService.analyzeVideoContent(videoInfo)
      const validation = YouTubeService.validateVideoForProcessing(videoInfo)
      
      reply.code(200).send({
        status: 'success',
        data: {
          videoInfo,
          analysis,
          validation
        }
      })
    } catch (error) {
      console.error('❌ Video extraction test failed:', error)
      
      reply.code(400).send({
        error: {
          statusCode: 400,
          message: error instanceof Error ? error.message : 'Extraction test failed'
        }
      })
    }
  })

  /**
   * 健康检查 - 检查所有服务状态
   */
  fastify.get('/videos/health', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      console.log('🏥 Performing health check')
      
      // 检查各个服务的状态
      const healthStatus = {
        timestamp: new Date().toISOString(),
        services: {
          database: false,
          audio_processor: false,
          transcription: false,
          content_analyzer: false
        },
        dependencies: {
          ytdlp: false,
          ffmpeg: false
        },
        overall: 'unknown'
      }

      try {
        // 检查数据库连接
        const { testDatabaseConnection } = await import('../config/database')
        healthStatus.services.database = await testDatabaseConnection()
      } catch (error) {
        console.warn('Database health check failed:', error)
      }

      try {
        // 检查音频处理依赖
        const { AudioProcessor } = await import('../services/audioProcessor')
        const deps = await AudioProcessor.checkDependencies()
        healthStatus.dependencies.ytdlp = deps.ytdlp
        healthStatus.dependencies.ffmpeg = deps.ffmpeg
        healthStatus.services.audio_processor = deps.ytdlp || deps.ffmpeg
      } catch (error) {
        console.warn('Audio processor health check failed:', error)
      }

      try {
        // 检查API连接状态
        const { testAPIConnections } = await import('../config/apis')
        const apiStatus = await testAPIConnections()
        healthStatus.services.transcription = apiStatus.groq
        healthStatus.services.content_analyzer = apiStatus.gemini
      } catch (error) {
        console.warn('API health check failed:', error)
      }

      // 计算整体健康状态
      const serviceValues = Object.values(healthStatus.services)
      const healthyServices = serviceValues.filter(status => status).length
      const totalServices = serviceValues.length

      if (healthyServices === totalServices) {
        healthStatus.overall = 'healthy'
      } else if (healthyServices >= totalServices / 2) {
        healthStatus.overall = 'partial'
      } else {
        healthStatus.overall = 'unhealthy'
      }

      const httpStatus = healthStatus.overall === 'unhealthy' ? 503 : 200

      reply.code(httpStatus).send({
        status: healthStatus.overall,
        data: healthStatus
      })

    } catch (error) {
      console.error('❌ Health check failed:', error)
      
      reply.code(503).send({
        status: 'error',
        error: {
          statusCode: 503,
          message: 'Health check failed'
        }
      })
    }
  })

  /**
   * 下载处理结果文件
   */
  fastify.get('/download/:id/:format', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          format: { type: 'string', enum: ['pdf', 'markdown'] }
        },
        required: ['id', 'format']
      }
    }
  }, async (request: FastifyRequest<{ Params: { id: string, format: string } }>, reply: FastifyReply) => {
    try {
      const { id, format } = request.params
      console.log(`📥 Download request: ${id} - ${format}`)
      
      // 获取处理结果
      const result = await VideoProcessor.getProcessResult(id)
      
      if (!result || result.status !== 'completed') {
        throw new Error('Process not completed or result not found')
      }

      const learningMaterial = result.result
      const timestamp = new Date().toISOString().split('T')[0]
      const safeTitle = `learning_material_${id.substring(0, 8)}`

      switch (format) {

        case 'markdown':
          const markdownContent = generateMarkdownContent(learningMaterial)
          reply
            .header('Content-Type', 'text/markdown')
            .header('Content-Disposition', `attachment; filename=${safeTitle}_${timestamp}.md`)
            .send(markdownContent)
          break

        case 'pdf':
          // Use the proper PDF export service instead of returning HTML
          const videoInfo = {
            title: learningMaterial.videoInfo?.title || '未知视频',
            url: learningMaterial.videoInfo?.url || '',
            channel: learningMaterial.videoInfo?.channel || '',
            duration: learningMaterial.videoInfo?.duration || '0:00',
            views: learningMaterial.videoInfo?.views || '0',
            thumbnail: learningMaterial.videoInfo?.thumbnail || ''
          }

          const exportResult = await PDFExportService.exportLearningMaterial(
            videoInfo,
            learningMaterial,
            {
              theme: 'light',
              includeGraphs: true,
              includeCards: true
            }
          )

          // Read the generated PDF file
          const pdfBuffer = await fs.readFile(exportResult.filePath)
          
          // Send the PDF with proper headers
          reply
            .header('Content-Type', 'application/pdf')
            .header('Content-Disposition', `attachment; filename=${safeTitle}_${timestamp}.pdf`)
            .header('Content-Length', exportResult.fileSize.toString())
            .send(pdfBuffer)

          // Clean up the temporary file
          try {
            await fs.unlink(exportResult.filePath)
          } catch (cleanupError) {
            console.warn('Failed to cleanup PDF file:', cleanupError)
          }
          break

        default:
          throw new Error('Unsupported format')
      }

    } catch (error) {
      console.error('❌ Download failed:', error)
      
      reply.code(404).send({
        error: {
          statusCode: 404,
          message: error instanceof Error ? error.message : 'Download failed'
        }
      })
    }
  })
}

/**
 * 将 Markdown 格式转换为 HTML
 */
function convertMarkdownToHtml(text: string): string {
  if (!text || typeof text !== 'string') {
    return text || '';
  }
  
  let html = text
    // 处理粗体：**text** -> <strong>text</strong>
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // 处理斜体：*text* -> <em>text</em> (但不处理已经被粗体处理过的内容)
    .replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>')
    // 处理无序列表项：- item -> <li>item</li>
    .replace(/^[\s]*[-*+]\s+(.+)$/gm, '<li>$1</li>')
    // 处理数字列表项：1. item -> <li>item</li>
    .replace(/^[\s]*\d+\.\s+(.+)$/gm, '<li>$1</li>')
    // 处理换行符
    .replace(/\n/g, '<br/>')
    // 包装连续的列表项
    .replace(/(<li>.*?<\/li>)(\s*<br\/>\s*<li>.*?<\/li>)*/g, (match) => {
      // 移除列表项之间的 <br/>
      const cleanMatch = match.replace(/<br\/>/g, '');
      return `<ul>${cleanMatch}</ul>`;
    })
    // 清理多余的 <br/> 标签
    .replace(/(<br\/>){3,}/g, '<br/><br/>');
    
  return html;
}


/**
 * 生成问答卡片的建议答案
 */
function generateQuestionSuggestions(card: any, index: number): string {
  // 根据问题内容生成建议答案
  const questionContent = card.content || '';
  
  if (questionContent.includes('解释')) {
    return `
    <strong>💡 答题思路：</strong><br/>
    1. <strong>定义概念：</strong> 先明确核心概念的定义<br/>
    2. <strong>说明重要性：</strong> 解释为什么这个概念重要<br/>
    3. <strong>举例说明：</strong> 用具体例子来阐述<br/>
    4. <strong>关联思考：</strong> 思考与其他概念的关系<br/><br/>
    
    <strong>🎯 参考要点：</strong><br/>
    • 从基础概念入手，逐步深入<br/>
    • 结合实际应用场景思考<br/>
    • 注意概念之间的逻辑关系<br/>
    • 可以对比相似或相反的概念
    `;
  } else if (questionContent.includes('应用') || questionContent.includes('实践')) {
    return `
    <strong>💡 答题思路：</strong><br/>
    1. <strong>理解场景：</strong> 明确应用的具体场景<br/>
    2. <strong>分析步骤：</strong> 列出实施的具体步骤<br/>
    3. <strong>考虑挑战：</strong> 思考可能遇到的问题<br/>
    4. <strong>评估效果：</strong> 预期能达到的效果<br/><br/>
    
    <strong>🎯 参考要点：</strong><br/>
    • 结合理论知识和实际情况<br/>
    • 考虑不同场景下的适用性<br/>
    • 思考实施过程中的关键因素<br/>
    • 评估可行性和预期效果
    `;
  } else {
    return `
    <strong>💡 答题思路：</strong><br/>
    1. <strong>理解题意：</strong> 仔细分析问题的核心要求<br/>
    2. <strong>回顾知识：</strong> 回想相关的理论知识<br/>
    3. <strong>组织答案：</strong> 有逻辑地组织回答内容<br/>
    4. <strong>检查完整：</strong> 确保答案完整准确<br/><br/>
    
    <strong>🎯 参考要点：</strong><br/>
    • 答案要有逻辑性和条理性<br/>
    • 结合学习材料中的具体内容<br/>
    • 可以用自己的理解重新表述<br/>
    • 注意答案的完整性和准确性
    `;
  }
}

/**
 * 生成Markdown格式内容
 */
function generateMarkdownContent(material: any): string {
  const { videoInfo, summary, structuredContent, knowledgeGraph, studyCards } = material
  
  let markdown = `# ${videoInfo.title}\n\n`
  
  // 视频信息
  markdown += `## 📺 视频信息\n\n`
  markdown += `- **频道**: ${videoInfo.channel}\n`
  markdown += `- **时长**: ${videoInfo.duration}\n`
  markdown += `- **链接**: ${videoInfo.url}\n\n`
  
  // 学习摘要
  markdown += `## 📋 学习摘要\n\n`
  markdown += `- **预计学习时间**: ${summary.learningTime}\n`
  markdown += `- **难度等级**: ${summary.difficulty}\n\n`
  
  // 核心要点
  markdown += `### 🎯 核心要点\n\n`
  summary.keyPoints.forEach((point: string, index: number) => {
    markdown += `${index + 1}. ${point}\n`
  })
  markdown += `\n`
  
  // 核心概念
  if (summary.concepts && summary.concepts.length > 0) {
    markdown += `### 💡 核心概念\n\n`
    summary.concepts.forEach((concept: any) => {
      markdown += `#### ${concept.name}\n`
      markdown += `${concept.explanation}\n\n`
    })
  }
  
  // 结构化内容
  if (structuredContent.chapters && structuredContent.chapters.length > 0) {
    markdown += `## 📖 详细内容\n\n`
    structuredContent.chapters.forEach((chapter: any, index: number) => {
      markdown += `### ${index + 1}. ${chapter.title}\n`
      markdown += `**时间范围**: ${chapter.timeRange}\n\n`
      
      if (chapter.keyPoints && chapter.keyPoints.length > 0) {
        markdown += `**要点**:\n`
        chapter.keyPoints.forEach((point: string) => {
          markdown += `- ${point}\n`
        })
        markdown += `\n`
      }
      
      if (chapter.concepts && chapter.concepts.length > 0) {
        markdown += `**涉及概念**: ${chapter.concepts.join(', ')}\n\n`
      }
    })
  }
  
  // 知识图谱信息
  if (knowledgeGraph.nodes && knowledgeGraph.nodes.length > 0) {
    markdown += `## 🕸️ 知识图谱\n\n`
    markdown += `- **概念节点数**: ${knowledgeGraph.nodes.length}\n`
    markdown += `- **关联边数**: ${knowledgeGraph.edges ? knowledgeGraph.edges.length : 0}\n\n`
  }
  
  // 学习卡片
  if (studyCards && studyCards.length > 0) {
    markdown += `## 📚 学习卡片\n\n`
    studyCards.forEach((card: any, index: number) => {
      markdown += `### 卡片 ${index + 1}: ${card.title || card.question}\n`
      if (card.content) markdown += `${card.content}\n\n`
      if (card.answer) markdown += `**答案**: ${card.answer}\n\n`
    })
  }
  
  markdown += `---\n`
  markdown += `*由YouTube智能学习资料生成器生成 - ${new Date().toLocaleString()}*\n`
  
  return markdown
}

/**
 * 生成HTML格式内容（用于PDF打印）
 */
function generateHTMLContent(material: any): string {
  const { videoInfo, summary, structuredContent, knowledgeGraph, studyCards } = material
  
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${videoInfo.title} - 学习资料</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
        }
        h1, h2, h3 { color: #2c3e50; }
        h1 { border-bottom: 3px solid #3498db; padding-bottom: 10px; }
        h2 { border-bottom: 1px solid #bdc3c7; padding-bottom: 5px; margin-top: 30px; }
        .video-info { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .concept { background: #e8f4fd; padding: 10px; margin: 10px 0; border-left: 4px solid #3498db; }
        .chapter { margin: 20px 0; padding: 15px; border: 1px solid #e0e0e0; border-radius: 5px; page-break-inside: avoid; }
        .key-points { list-style-type: none; padding: 0; }
        .key-points li { padding: 5px 0; padding-left: 20px; position: relative; }
        .key-points li:before { content: "▸"; color: #3498db; position: absolute; left: 0; }
        details { margin: 10px 0; }
        details summary { padding: 8px; cursor: pointer; user-select: none; }
        details[open] summary { border-bottom: 1px solid #ddd; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #bdc3c7; text-align: center; color: #7f8c8d; }
        @media print {
            body { font-size: 12px; }
            h1 { font-size: 18px; }
            h2 { font-size: 16px; }
            h3 { font-size: 14px; }
            .footer div { display: none; } /* Hide PDF instructions when printing */
        }
    </style>
</head>
<body>
    <h1>${videoInfo.title}</h1>
    
    <div class="video-info">
        <h2>📺 视频信息</h2>
        <p><strong>频道:</strong> ${videoInfo.channel}</p>
        <p><strong>时长:</strong> ${videoInfo.duration}</p>
        <p><strong>链接:</strong> <a href="${videoInfo.url}">${videoInfo.url}</a></p>
    </div>
    
    <h2>📋 学习摘要</h2>
    <p><strong>预计学习时间:</strong> ${summary.learningTime}</p>
    <p><strong>难度等级:</strong> ${summary.difficulty}</p>
    
    <h3>🎯 核心要点</h3>
    <ul class="key-points">
        ${summary.keyPoints.map((point: string) => `<li>${convertMarkdownToHtml(point)}</li>`).join('')}
    </ul>
    
    ${summary.concepts && summary.concepts.length > 0 ? `
    <h3>💡 核心知识点</h3>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0;">
        ${summary.concepts.map((concept: any) => `
            <div style="background: #e8f4fd; padding: 12px; border-radius: 8px; border-left: 4px solid #3498db;">
                <h5 style="margin: 0 0 8px 0; color: #2c3e50; font-size: 14px;">${convertMarkdownToHtml(concept.name)}</h5>
                <p style="margin: 0; font-size: 13px; color: #666; line-height: 1.4;">${convertMarkdownToHtml(concept.explanation.length > 60 ? concept.explanation.substring(0, 60) + '...' : concept.explanation)}</p>
            </div>
        `).join('')}
    </div>
    ` : ''}
    
    ${structuredContent.chapters && structuredContent.chapters.length > 0 ? `
    <h2>📖 详细内容</h2>
    ${structuredContent.chapters.map((chapter: any, index: number) => `
        <div class="chapter">
            <h3>${index + 1}. ${chapter.title}</h3>
            <p><strong>时间范围:</strong> ${chapter.timeRange}</p>
            
            ${chapter.detailedExplanation ? `
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #28a745;">
                    <h4 style="margin: 0 0 10px 0; color: #2c3e50;">📚 详细解释</h4>
                    <div style="line-height: 1.6;">${convertMarkdownToHtml(chapter.detailedExplanation)}</div>
                </div>
            ` : ''}
            
            ${chapter.keyPoints && chapter.keyPoints.length > 0 ? `
                <p><strong>🎯 核心要点:</strong></p>
                <ul class="key-points">
                    ${chapter.keyPoints.map((point: string) => `<li>${convertMarkdownToHtml(point)}</li>`).join('')}
                </ul>
            ` : ''}
            
            ${chapter.examples && chapter.examples.length > 0 ? `
                <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #ffc107;">
                    <h4 style="margin: 0 0 10px 0; color: #2c3e50;">💡 具体例子</h4>
                    <ul style="margin: 0; padding-left: 20px;">
                        ${chapter.examples.map((example: string) => `<li style="margin: 10px 0; line-height: 1.6;">${convertMarkdownToHtml(example)}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            
            ${chapter.practicalApplications && chapter.practicalApplications.length > 0 ? `
                <div style="background: #d1ecf1; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #17a2b8;">
                    <h4 style="margin: 0 0 10px 0; color: #2c3e50;">🛠️ 实际应用</h4>
                    <ul style="margin: 0; padding-left: 20px;">
                        ${chapter.practicalApplications.map((app: string) => `<li style="margin: 10px 0; line-height: 1.6;">${convertMarkdownToHtml(app)}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            
            ${chapter.concepts && chapter.concepts.length > 0 ? `
                <p><strong>🔑 涉及概念:</strong> ${chapter.concepts.join(', ')}</p>
            ` : ''}
        </div>
    `).join('')}
    ` : ''}
    
    ${knowledgeGraph.nodes && knowledgeGraph.nodes.length > 0 ? `
    <h2>🕸️ 知识图谱</h2>
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>概念节点数:</strong> ${knowledgeGraph.nodes.length} | <strong>关联边数:</strong> ${knowledgeGraph.edges ? knowledgeGraph.edges.length : 0}</p>
        
        <!-- SVG知识图谱可视化 -->
        <div style="text-align: center; margin: 20px 0;">
            ${generateKnowledgeGraphSVG(knowledgeGraph)}
        </div>
        
        <!-- 节点详细信息 -->
        <div style="margin-top: 20px;">
            <h3>📋 节点详情</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px; margin-top: 15px;">
                ${knowledgeGraph.nodes.map((node: any) => `
                    <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid ${getNodeColor(node.type)};">
                        <h4 style="margin: 0 0 8px 0; color: #2c3e50;">${node.label}</h4>
                        <p style="margin: 0; color: #666; font-size: 14px;">${node.description || '暂无描述'}</p>
                        <div style="margin-top: 10px; display: flex; gap: 10px;">
                            <span style="background: ${getNodeColor(node.type)}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 12px;">${node.type}</span>
                            <span style="background: #f0f0f0; color: #666; padding: 2px 6px; border-radius: 3px; font-size: 12px;">重要度: ${node.importance || 3}/5</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        ${knowledgeGraph.edges && knowledgeGraph.edges.length > 0 ? `
        <div style="margin-top: 20px;">
            <h3>🔗 关系连接</h3>
            <div style="background: white; padding: 15px; border-radius: 6px; margin-top: 15px;">
                ${knowledgeGraph.edges.map((edge: any) => {
                    const sourceNode = knowledgeGraph.nodes.find((n: any) => n.id === edge.source);
                    const targetNode = knowledgeGraph.nodes.find((n: any) => n.id === edge.target);
                    return `
                    <div style="margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 4px; border-left: 3px solid ${getRelationColor(edge.type)};">
                        <strong>${sourceNode?.label || edge.source}</strong> 
                        <span style="color: #666; margin: 0 10px;">→</span> 
                        <strong>${targetNode?.label || edge.target}</strong>
                        <span style="margin-left: 10px; background: ${getRelationColor(edge.type)}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 12px;">${getRelationText(edge.type)}</span>
                    </div>
                    `;
                }).join('')}
            </div>
        </div>
        ` : ''}
    </div>
    ` : ''}
    
    ${studyCards && studyCards.length > 0 ? `
    <h2>📚 智能学习卡片</h2>
    <p style="color: #666; margin-bottom: 20px;">以下卡片将帮助你系统性地掌握和巩固视频中的核心知识点，完全脱离视频即可完成学习</p>
    
    ${studyCards.map((card: any, index: number) => {
        const cardTypeIcon = card.type === 'summary' ? '💡' : 
                           card.type === 'question' ? '🤔' : 
                           card.type === 'application' ? '🛠️' : 
                           card.type === 'concept' ? '🧠' : '📝';
        
        const difficultyColor = card.difficulty === 'easy' ? '#28a745' : 
                               card.difficulty === 'medium' ? '#ffc107' : '#dc3545';
        
        const difficultyText = card.difficulty === 'easy' ? '简单' : 
                              card.difficulty === 'medium' ? '中等' : '困难';
        
        // 处理问答卡片，添加折叠的建议答案
        let cardContent = card.content || '请参考视频内容进行学习。';
        let answerSection = '';
        
        if (card.type === 'question') {
            // 为问答卡片生成建议答案
            const suggestions = generateQuestionSuggestions(card, index);
            answerSection = `
            <div style="margin-top: 15px;">
                <details style="background: #f1f3f4; padding: 10px; border-radius: 6px; border-left: 3px solid #4285f4;">
                    <summary style="cursor: pointer; font-weight: bold; color: #1a73e8; padding: 5px 0;">
                        💡 点击查看建议答案
                    </summary>
                    <div style="margin-top: 10px; padding: 10px; background: white; border-radius: 4px; line-height: 1.6;">
                        ${suggestions}
                    </div>
                </details>
            </div>`;
        }
        
        return `
        <div class="chapter" style="border-left: 4px solid ${difficultyColor}; margin: 20px 0; position: relative; page-break-inside: avoid;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                <h3 style="margin: 0; color: #2c3e50;">${card.title || `学习卡片 ${index + 1}`}</h3>
                <div style="display: flex; gap: 10px; align-items: center; font-size: 12px;">
                    <span style="background: ${difficultyColor}; color: white; padding: 2px 8px; border-radius: 12px;">${difficultyText}</span>
                    <span style="color: #666;">⏱️ ${card.estimatedTime || 5}分钟</span>
                </div>
            </div>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; line-height: 1.7;">
                ${convertMarkdownToHtml(cardContent)}
            </div>
            
            ${answerSection}
            
            ${card.timeReference && card.timeReference !== '全程' ? 
                `<p style="margin-top: 10px; color: #666; font-size: 14px;"><strong>📍 视频时间:</strong> ${card.timeReference}</p>` : ''}
        </div>`;
    }).join('')}
    
    <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3498db;">
        <h4 style="margin: 0 0 10px 0; color: #2c3e50;">💡 学习建议</h4>
        <ul style="margin: 0; padding-left: 20px; color: #666;">
            <li>建议按照卡片顺序进行学习，每张卡片完成后再进入下一张</li>
            <li>对于问题类卡片，先尝试自己回答，再对照视频内容</li>
            <li>应用类卡片需要结合实际场景思考，可以记录自己的想法</li>
            <li>定期回顾之前的卡片，巩固学习效果</li>
        </ul>
    </div>
    ` : ''}
    
    ${summary.concepts && summary.concepts.length > 0 ? `
    <h2>📚 名词解释</h2>
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="color: #666; font-size: 14px; margin-bottom: 20px;">以下是视频中涉及的重要概念的详细解释：</p>
        ${summary.concepts.map((concept: any, index: number) => `
            <div style="margin-bottom: 20px; padding: 15px; background: white; border-radius: 6px; border-left: 4px solid #3498db;">
                <h4 style="margin: 0 0 10px 0; color: #2c3e50;">
                    <span style="color: #3498db; font-weight: bold;">[${index + 1}]</span> 
                    ${convertMarkdownToHtml(concept.name)}
                </h4>
                <p style="margin: 0; line-height: 1.6; color: #555;">
                    ${convertMarkdownToHtml(concept.explanation)}
                </p>
            </div>
        `).join('')}
    </div>
    ` : ''}
    
    <div class="footer">
        <p>由YouTube智能学习资料生成器生成 - ${new Date().toLocaleString()}</p>
        <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3498db;">
            <h4 style="margin: 0 0 10px 0; color: #2c3e50;">📄 如何生成PDF</h4>
            <p style="margin: 0; color: #666; line-height: 1.6;">
                1. 按 <strong>Ctrl+P</strong> (Windows) 或 <strong>Cmd+P</strong> (Mac) 打开打印对话框<br/>
                2. 在目标打印机中选择 <strong>"保存为PDF"</strong><br/>
                3. 点击 <strong>"保存"</strong> 即可下载PDF文件
            </p>
        </div>
    </div>
</body>
</html>
  `
}

/**
 * 生成现代化知识图谱可视化
 */
function generateKnowledgeGraphSVG(knowledgeGraph: any): string {
  const nodes = knowledgeGraph.nodes || []
  const edges = knowledgeGraph.edges || []
  
  if (nodes.length === 0) {
    return `
      <div style="text-align: center; padding: 60px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; color: white;">
        <div style="font-size: 48px; margin-bottom: 16px;">🧠</div>
        <h3 style="margin: 0; font-size: 18px; font-weight: 600;">知识图谱生成中</h3>
        <p style="margin: 8px 0 0 0; opacity: 0.8;">正在分析视频内容中的知识点关系...</p>
      </div>
    `
  }
  
  const svgWidth = 1000
  const svgHeight = 700
  
  // 使用力导向布局算法
  const nodePositions = generateForceLayout(nodes, edges, svgWidth, svgHeight)
  
  // 生成现代化SVG
  const svgContent = `
    <svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" 
         style="background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
      
      <!-- 定义渐变和滤镜 -->
      <defs>
        <linearGradient id="conceptGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
        </linearGradient>
        
        <linearGradient id="supportGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#11998e;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#38ef7d;stop-opacity:1" />
        </linearGradient>
        
        <linearGradient id="applicationGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#ff6b6b;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#feca57;stop-opacity:1" />
        </linearGradient>
        
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="2" dy="4" stdDeviation="4" flood-color="rgba(0,0,0,0.3)"/>
        </filter>
      </defs>
      
      <!-- 背景装饰 -->
      <circle cx="100" cy="100" r="50" fill="rgba(255,255,255,0.1)" opacity="0.5"/>
      <circle cx="${svgWidth-100}" cy="100" r="30" fill="rgba(255,255,255,0.1)" opacity="0.3"/>
      <circle cx="150" cy="${svgHeight-100}" r="40" fill="rgba(255,255,255,0.1)" opacity="0.4"/>
      
      <!-- 连接线 -->
      ${edges.map((edge: any) => {
        const sourceNode = nodePositions.find((n: any) => n.id === edge.source)
        const targetNode = nodePositions.find((n: any) => n.id === edge.target)
        
        if (!sourceNode || !targetNode) return ''
        
        const color = getModernRelationColor(edge.type)
        const strokeWidth = edge.strength ? Math.max(2, edge.strength * 2) : 3
        
        return `
          <g>
            <!-- 连接线阴影 -->
            <line x1="${sourceNode.x}" y1="${sourceNode.y}" 
                  x2="${targetNode.x}" y2="${targetNode.y}"
                  stroke="rgba(0,0,0,0.1)" 
                  stroke-width="${strokeWidth + 2}" 
                  opacity="0.3"/>
            
            <!-- 主连接线 -->
            <line x1="${sourceNode.x}" y1="${sourceNode.y}" 
                  x2="${targetNode.x}" y2="${targetNode.y}"
                  stroke="${color}" 
                  stroke-width="${strokeWidth}" 
                  stroke-linecap="round"
                  opacity="0.8"/>
            
            <!-- 现代化箭头 -->
            <circle cx="${targetNode.x}" cy="${targetNode.y}" r="4" 
                    fill="${color}" 
                    opacity="0.9"/>
          </g>
        `
      }).join('')}
      
      <!-- 节点 -->
      ${nodePositions.map((node: any) => {
        const nodeSize = node.radius || Math.max(35, Math.min(55, 35 + (node.importance || 3) * 4))
        const gradient = getNodeGradient(node.type)
        const labelWidth = Math.max(100, node.label.length * 8)
        
        return `
          <g filter="url(#shadow)">
            <!-- 节点外圈 -->
            <circle cx="${node.x}" cy="${node.y}" r="${nodeSize + 6}" 
                    fill="rgba(255,255,255,0.3)" 
                    opacity="0.6"/>
            
            <!-- 主节点 -->
            <circle cx="${node.x}" cy="${node.y}" r="${nodeSize}" 
                    fill="url(#${gradient})" 
                    stroke="rgba(255,255,255,0.8)" 
                    stroke-width="3"
                    filter="url(#glow)"/>
            
            <!-- 节点图标 -->
            <text x="${node.x}" y="${node.y + 8}" 
                  text-anchor="middle" 
                  font-size="${Math.max(18, nodeSize / 2.5)}" 
                  fill="white" 
                  font-weight="bold">
              ${getNodeIcon(node.type)}
            </text>
            
            <!-- 节点标签背景 -->
            <rect x="${node.x - labelWidth/2}" y="${node.y + nodeSize + 15}" 
                  width="${labelWidth}" height="28" 
                  fill="rgba(255,255,255,0.95)" 
                  rx="14" 
                  stroke="rgba(0,0,0,0.1)" 
                  stroke-width="1"/>
            
            <!-- 节点标签 -->
            <text x="${node.x}" y="${node.y + nodeSize + 32}" 
                  text-anchor="middle" 
                  font-size="13" 
                  font-weight="600"
                  fill="#2c3e50">
              ${node.label.length > 15 ? node.label.substring(0, 15) + '...' : node.label}
            </text>
            
            <!-- 重要度指示器 -->
            ${Array.from({length: 5}).map((_, i) => `
              <circle cx="${node.x - 20 + i * 10}" cy="${node.y + nodeSize + 55}" r="3" 
                      fill="${i < (node.importance || 3) ? '#feca57' : 'rgba(0,0,0,0.1)'}"/>
            `).join('')}
          </g>
        `
      }).join('')}
      
      <!-- 现代化图例 -->
      <g transform="translate(30, 30)">
        <rect x="0" y="0" width="280" height="150" 
              fill="rgba(255,255,255,0.95)" 
              stroke="rgba(0,0,0,0.1)" 
              rx="12" 
              filter="url(#shadow)"/>
        
        <text x="20" y="30" font-size="16" font-weight="bold" fill="#2c3e50">知识图谱图例</text>
        
        <!-- 节点类型图例 -->
        <g transform="translate(20, 50)">
          <circle cx="10" cy="10" r="8" fill="url(#conceptGradient)"/>
          <text x="25" y="15" font-size="13" fill="#2c3e50">💡 核心概念</text>
          
          <circle cx="10" cy="35" r="8" fill="url(#supportGradient)"/>
          <text x="25" y="40" font-size="13" fill="#2c3e50">🔧 支持工具</text>
          
          <circle cx="10" cy="60" r="8" fill="url(#applicationGradient)"/>
          <text x="25" y="65" font-size="13" fill="#2c3e50">🎯 实际应用</text>
        </g>
        
        <!-- 关系类型图例 -->
        <g transform="translate(150, 50)">
          <line x1="0" y1="10" x2="25" y2="10" stroke="#667eea" stroke-width="3" stroke-linecap="round"/>
          <text x="30" y="15" font-size="13" fill="#2c3e50">支持关系</text>
          
          <line x1="0" y1="35" x2="25" y2="35" stroke="#11998e" stroke-width="3" stroke-linecap="round"/>
          <text x="30" y="40" font-size="13" fill="#2c3e50">相关关系</text>
          
          <line x1="0" y1="60" x2="25" y2="60" stroke="#ff6b6b" stroke-width="3" stroke-linecap="round"/>
          <text x="30" y="65" font-size="13" fill="#2c3e50">依赖关系</text>
        </g>
        
        <!-- 重要度说明 -->
        <g transform="translate(20, 120)">
          <text x="0" y="0" font-size="12" fill="#666">重要度：</text>
          ${Array.from({length: 5}).map((_, i) => `
            <circle cx="${60 + i * 12}" cy="-4" r="3" fill="${i < 3 ? '#feca57' : 'rgba(0,0,0,0.1)'}"/>
          `).join('')}
          <text x="130" y="0" font-size="12" fill="#666">示例：3/5</text>
        </g>
      </g>
    </svg>
  `
  
  return svgContent
}

/**
 * 获取节点颜色
 */
function getNodeColor(type: string): string {
  switch (type) {
    case 'concept': return '#3498db'
    case 'support': return '#2ecc71'
    case 'application': return '#f39c12'
    case 'process': return '#e67e22'
    case 'tool': return '#9b59b6'
    default: return '#95a5a6'
  }
}

/**
 * 获取关系颜色
 */
function getRelationColor(type: string): string {
  switch (type) {
    case 'supports': return '#e74c3c'
    case 'relates': return '#9b59b6'
    case 'depends': return '#1abc9c'
    case 'part_of': return '#f39c12'
    case 'similar': return '#3498db'
    default: return '#95a5a6'
  }
}

/**
 * 获取关系文本
 */
function getRelationText(type: string): string {
  switch (type) {
    case 'supports': return '支持'
    case 'relates': return '相关'
    case 'depends': return '依赖'
    case 'part_of': return '包含'
    case 'similar': return '相似'
    default: return '关联'
  }
}

/**
 * 使用改进的布局算法生成节点位置
 */
function generateForceLayout(nodes: any[], edges: any[], width: number, height: number): any[] {
  // 如果节点数量少，使用简单的圆形布局
  if (nodes.length <= 6) {
    return generateCircularLayout(nodes, width, height)
  }
  
  // 为每个节点计算节点大小
  const nodePositions = nodes.map((node, index) => ({
    ...node,
    x: Math.random() * (width - 300) + 150,
    y: Math.random() * (height - 300) + 150,
    vx: 0,
    vy: 0,
    radius: Math.max(35, Math.min(55, 35 + (node.importance || 3) * 4))
  }))

  // 改进的力导向算法
  for (let iteration = 0; iteration < 150; iteration++) {
    // 重置力
    nodePositions.forEach(node => {
      node.vx = 0
      node.vy = 0
    })

    // 斥力 - 节点之间相互排斥，考虑节点大小
    for (let i = 0; i < nodePositions.length; i++) {
      for (let j = i + 1; j < nodePositions.length; j++) {
        const nodeA = nodePositions[i]
        const nodeB = nodePositions[j]
        
        const dx = nodeB.x - nodeA.x
        const dy = nodeB.y - nodeA.y
        const distance = Math.sqrt(dx * dx + dy * dy) || 1
        const minDistance = nodeA.radius + nodeB.radius + 40 // 最小距离包含两个节点半径加空隙
        
        if (distance < minDistance * 2) {
          const repulsionStrength = 3000 / (distance * distance + 100)
          const forceX = (dx / distance) * repulsionStrength
          const forceY = (dy / distance) * repulsionStrength
          
          nodeA.vx -= forceX
          nodeA.vy -= forceY
          nodeB.vx += forceX
          nodeB.vy += forceY
        }
      }
    }

    // 引力 - 连接的节点相互吸引
    edges.forEach((edge: any) => {
      const sourceNode = nodePositions.find(n => n.id === edge.source)
      const targetNode = nodePositions.find(n => n.id === edge.target)
      
      if (sourceNode && targetNode) {
        const dx = targetNode.x - sourceNode.x
        const dy = targetNode.y - sourceNode.y
        const distance = Math.sqrt(dx * dx + dy * dy) || 1
        const idealDistance = 120 + (sourceNode.radius + targetNode.radius) / 2
        
        const attractionStrength = 0.05 * (edge.strength || 0.5) * Math.abs(distance - idealDistance) / idealDistance
        const forceX = (dx / distance) * attractionStrength
        const forceY = (dy / distance) * attractionStrength
        
        sourceNode.vx += forceX
        sourceNode.vy += forceY
        targetNode.vx -= forceX
        targetNode.vy -= forceY
      }
    })

    // 中心引力 - 防止节点飞散
    const centerX = width / 2
    const centerY = height / 2
    nodePositions.forEach(node => {
      const dx = centerX - node.x
      const dy = centerY - node.y
      const distance = Math.sqrt(dx * dx + dy * dy) || 1
      const centerForce = 0.01
      
      node.vx += (dx / distance) * centerForce
      node.vy += (dy / distance) * centerForce
    })

    // 更新位置
    nodePositions.forEach(node => {
      node.vx *= 0.85 // 阻尼
      node.vy *= 0.85
      node.x += node.vx
      node.y += node.vy
      
      // 边界约束，考虑节点大小
      node.x = Math.max(node.radius + 20, Math.min(width - node.radius - 20, node.x))
      node.y = Math.max(node.radius + 60, Math.min(height - node.radius - 80, node.y))
    })
  }

  return nodePositions
}

/**
 * 圆形布局算法（用于少量节点）
 */
function generateCircularLayout(nodes: any[], width: number, height: number): any[] {
  const centerX = width / 2
  const centerY = height / 2
  const radius = Math.min(width, height) / 3.5
  
  return nodes.map((node, index) => {
    const angle = (index * 2 * Math.PI) / nodes.length - Math.PI / 2 // 从顶部开始
    return {
      ...node,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
      radius: Math.max(35, Math.min(55, 35 + (node.importance || 3) * 4))
    }
  })
}

/**
 * 获取现代化关系颜色
 */
function getModernRelationColor(type: string): string {
  switch (type) {
    case 'supports': return '#667eea'
    case 'relates': return '#11998e'
    case 'depends': return '#ff6b6b'
    case 'part_of': return '#feca57'
    case 'similar': return '#a55eea'
    default: return '#95a5a6'
  }
}

/**
 * 获取节点渐变ID
 */
function getNodeGradient(type: string): string {
  switch (type) {
    case 'concept': return 'conceptGradient'
    case 'support': 
    case 'tool': return 'supportGradient'
    case 'application':
    case 'process': return 'applicationGradient'
    default: return 'conceptGradient'
  }
}

/**
 * 获取节点图标
 */
function getNodeIcon(type: string): string {
  switch (type) {
    case 'concept': return '💡'
    case 'support': return '🔧'
    case 'application': return '🎯'
    case 'process': return '⚙️'
    case 'tool': return '🛠️'
    default: return '📝'
  }
}