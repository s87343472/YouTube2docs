import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { PDFExportService } from '../services/pdfExportService'
import { logger, LogCategory } from '../utils/logger'
import { validators } from '../middleware/validation'
import { authMiddleware } from '../middleware/auth'
import { rateLimitMiddleware } from '../middleware/rateLimit'
import fs from 'fs/promises'
import path from 'path'

/**
 * 导出功能相关的API路由
 * 提供PDF、Markdown等格式的导出服务
 */

interface ExportRequest {
  videoProcessId: string
  format: 'pdf' | 'markdown' | 'html'
  options?: {
    theme?: 'light' | 'dark' | 'minimal'
    includeGraphs?: boolean
    includeCards?: boolean
    watermark?: string
  }
}

export async function exportRoutes(fastify: FastifyInstance) {
  
  /**
   * 导出完整学习资料
   * POST /api/export/learning-material
   */
  fastify.post('/export/learning-material', {
    preHandler: [
      optionalAuth,
      rateLimitMiddleware.moderate
    ],
    schema: {
      body: {
        type: 'object',
        required: ['videoProcessId', 'format'],
        properties: {
          videoProcessId: { type: 'string', minLength: 1 },
          format: { type: 'string', enum: ['pdf', 'markdown', 'html'] },
          options: {
            type: 'object',
            properties: {
              theme: { type: 'string', enum: ['light', 'dark', 'minimal'], default: 'light' },
              includeGraphs: { type: 'boolean', default: true },
              includeCards: { type: 'boolean', default: true },
              watermark: { type: 'string', maxLength: 100 }
            }
          }
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
                downloadUrl: { type: 'string' },
                fileName: { type: 'string' },
                fileSize: { type: 'number' },
                format: { type: 'string' },
                exportTime: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{
    Body: ExportRequest
  }>, reply: FastifyReply) => {
    try {
      const { videoProcessId, format, options = {} } = request.body
      
      logger.info('Starting learning material export', {
        requestId: request.requestId,
        videoProcessId,
        format,
        options,
        userId: request.user?.id
      }, LogCategory.SERVICE)
      
      // TODO: 从数据库获取视频处理结果
      // 这里使用模拟数据进行演示
      const mockVideoInfo = {
        title: 'React Hooks Complete Tutorial - useState, useEffect, useContext',
        url: 'https://youtube.com/watch?v=demo',
        channel: 'Programming with Mosh',
        duration: '1:25:30',
        thumbnail: null
      }
      
      const mockLearningMaterial = {
        summary: {
          keyPoints: [
            'React Hooks是函数组件中使用状态和生命周期的方式',
            'useState用于管理组件内部状态',
            'useEffect用于处理副作用，如API调用和订阅',
            'useContext用于在组件树中共享状态',
            '自定义Hook可以复用状态逻辑'
          ],
          estimatedStudyTime: '45-60分钟',
          difficulty: '中级',
          concepts: [
            { name: 'useState', explanation: '状态Hook，用于在函数组件中添加状态' },
            { name: 'useEffect', explanation: '副作用Hook，用于处理副作用操作' },
            { name: 'useContext', explanation: '上下文Hook，用于消费React Context' },
            { name: '自定义Hook', explanation: '可复用的状态逻辑封装' }
          ]
        },
        structuredContent: {
          chapters: [
            {
              title: 'React Hooks 介绍',
              timeRange: '00:00-15:30',
              keyPoints: [
                'Hooks的设计理念和优势',
                '函数组件vs类组件',
                'Hooks的基本规则'
              ]
            },
            {
              title: 'useState Hook详解',
              timeRange: '15:30-35:00',
              keyPoints: [
                'useState的基本用法',
                '状态更新的异步特性',
                '函数式更新和对象状态'
              ]
            }
          ]
        },
        studyCards: [
          {
            title: 'useState基础概念',
            type: 'concept',
            content: 'useState是React提供的Hook，用于在函数组件中添加状态管理功能。',
            difficulty: 'easy',
            estimatedTime: 3
          },
          {
            title: 'useEffect使用场景',
            type: 'application',
            content: 'useEffect主要用于处理副作用，如API调用、事件监听、手动DOM操作等。',
            difficulty: 'medium',
            estimatedTime: 5
          }
        ]
      }
      
      let exportResult
      
      if (format === 'pdf') {
        exportResult = await PDFExportService.exportLearningMaterial(
          mockVideoInfo,
          mockLearningMaterial,
          {
            theme: options.theme || 'light',
            includeGraphs: options.includeGraphs !== false,
            includeCards: options.includeCards !== false,
            watermark: options.watermark
          }
        )
      } else {
        // TODO: 实现Markdown和HTML导出
        throw new Error(`Format ${format} not yet implemented`)
      }
      
      // 生成下载URL
      const downloadUrl = `/uploads/exports/${path.basename(exportResult.filePath)}`
      
      logger.info('Learning material export completed', {
        requestId: request.requestId,
        videoProcessId,
        format,
        fileName: exportResult.fileName,
        fileSize: exportResult.fileSize,
        exportTime: exportResult.exportTime
      }, LogCategory.SERVICE)
      
      reply.send({
        success: true,
        data: {
          downloadUrl,
          fileName: exportResult.fileName,
          fileSize: exportResult.fileSize,
          format: exportResult.format,
          exportTime: exportResult.exportTime
        }
      })
      
    } catch (error) {
      logger.error('Learning material export failed', error as Error, {
        requestId: request.requestId,
        videoProcessId: request.body.videoProcessId,
        format: request.body.format
      }, LogCategory.SERVICE)
      
      reply.code(500).send({
        success: false,
        error: {
          message: '导出学习资料失败',
          code: 'EXPORT_FAILED'
        }
      })
    }
  })
  
  /**
   * 导出学习卡片
   * POST /api/export/study-cards
   */
  fastify.post('/export/study-cards', {
    preHandler: [
      optionalAuth,
      rateLimitMiddleware.moderate
    ],
    schema: {
      body: {
        type: 'object',
        required: ['videoProcessId'],
        properties: {
          videoProcessId: { type: 'string', minLength: 1 },
          format: { type: 'string', enum: ['pdf', 'json'], default: 'pdf' },
          options: {
            type: 'object',
            properties: {
              theme: { type: 'string', enum: ['light', 'dark', 'minimal'], default: 'light' },
              cardsPerPage: { type: 'number', minimum: 1, maximum: 6, default: 2 }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{
    Body: {
      videoProcessId: string
      format?: 'pdf' | 'json'
      options?: {
        theme?: 'light' | 'dark' | 'minimal'
        cardsPerPage?: number
      }
    }
  }>, reply: FastifyReply) => {
    try {
      const { videoProcessId, format = 'pdf', options = {} } = request.body
      
      logger.info('Starting study cards export', {
        requestId: request.requestId,
        videoProcessId,
        format,
        options
      }, LogCategory.SERVICE)
      
      // TODO: 从数据库获取学习卡片数据
      const mockVideoInfo = {
        title: 'React Hooks Complete Tutorial',
        url: 'https://youtube.com/watch?v=demo',
        channel: 'Programming with Mosh',
        duration: '1:25:30'
      }
      
      const mockStudyCards = [
        {
          title: 'useState基础概念',
          type: 'concept',
          content: 'useState是React提供的Hook，用于在函数组件中添加状态管理功能。它返回一个数组，包含当前状态值和更新状态的函数。',
          difficulty: 'easy',
          estimatedTime: 3
        },
        {
          title: 'useEffect使用场景',
          type: 'application',
          content: 'useEffect主要用于处理副作用，如API调用、事件监听、手动DOM操作等。可以通过依赖数组控制执行时机。',
          difficulty: 'medium',
          estimatedTime: 5
        },
        {
          title: 'useContext应用',
          type: 'practical',
          content: 'useContext用于消费React Context，避免props drilling。需要配合createContext使用，可以在组件树中共享数据。',
          difficulty: 'medium',
          estimatedTime: 4
        },
        {
          title: '自定义Hook创建',
          type: 'advanced',
          content: '自定义Hook是以use开头的函数，可以调用其他Hook。用于封装和复用状态逻辑，提高代码复用性。',
          difficulty: 'hard',
          estimatedTime: 7
        }
      ]
      
      if (format === 'pdf') {
        const exportResult = await PDFExportService.exportStudyCards(
          mockVideoInfo,
          mockStudyCards,
          {
            theme: options.theme || 'light'
          }
        )
        
        const downloadUrl = `/uploads/exports/${path.basename(exportResult.filePath)}`
        
        reply.send({
          success: true,
          data: {
            downloadUrl,
            fileName: exportResult.fileName,
            fileSize: exportResult.fileSize,
            format: exportResult.format,
            exportTime: exportResult.exportTime
          }
        })
      } else if (format === 'json') {
        // 导出JSON格式的学习卡片
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const fileName = `学习卡片_${timestamp}.json`
        const filePath = path.join(process.cwd(), 'uploads', 'exports', fileName)
        
        await fs.mkdir(path.dirname(filePath), { recursive: true })
        await fs.writeFile(filePath, JSON.stringify({
          videoInfo: mockVideoInfo,
          studyCards: mockStudyCards,
          exportTime: new Date().toISOString()
        }, null, 2))
        
        const stats = await fs.stat(filePath)
        const downloadUrl = `/uploads/exports/${fileName}`
        
        reply.send({
          success: true,
          data: {
            downloadUrl,
            fileName,
            fileSize: stats.size,
            format: 'JSON',
            exportTime: 0
          }
        })
      }
      
    } catch (error) {
      logger.error('Study cards export failed', error as Error, {
        requestId: request.requestId,
        videoProcessId: request.body.videoProcessId
      }, LogCategory.SERVICE)
      
      reply.code(500).send({
        success: false,
        error: {
          message: '导出学习卡片失败',
          code: 'CARDS_EXPORT_FAILED'
        }
      })
    }
  })
  
  /**
   * 获取导出历史
   * GET /api/export/history
   */
  fastify.get('/export/history', {
    preHandler: [
      optionalAuth,
      validators.pagination
    ],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', minimum: 1, default: 1 },
          limit: { type: 'number', minimum: 1, maximum: 50, default: 20 },
          format: { type: 'string', enum: ['pdf', 'markdown', 'html', 'json'] }
        }
      }
    }
  }, async (request: FastifyRequest<{
    Querystring: { page?: number; limit?: number; format?: string }
  }>, reply: FastifyReply) => {
    try {
      // TODO: 从数据库获取用户的导出历史
      const { page = 1, limit = 20, format } = request.query
      
      logger.info('Fetching export history', {
        requestId: request.requestId,
        page,
        limit,
        format,
        userId: request.user?.id
      }, LogCategory.SERVICE)
      
      // 模拟导出历史数据
      const mockHistory = [
        {
          id: '1',
          fileName: '学习资料_React_Hooks_Tutorial_2024-12-20.pdf',
          format: 'PDF',
          fileSize: 2048576,
          createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          downloadUrl: '/uploads/exports/学习资料_React_Hooks_Tutorial_2024-12-20.pdf'
        },
        {
          id: '2',
          fileName: '学习卡片_Python_Basics_2024-12-19.pdf',
          format: 'PDF',
          fileSize: 1024000,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
          downloadUrl: '/uploads/exports/学习卡片_Python_Basics_2024-12-19.pdf'
        }
      ]
      
      const filteredHistory = format 
        ? mockHistory.filter(item => item.format.toLowerCase() === format.toLowerCase())
        : mockHistory
      
      const startIndex = (page - 1) * limit
      const endIndex = startIndex + limit
      const paginatedHistory = filteredHistory.slice(startIndex, endIndex)
      
      reply.send({
        success: true,
        data: {
          exports: paginatedHistory,
          pagination: {
            page,
            limit,
            total: filteredHistory.length,
            totalPages: Math.ceil(filteredHistory.length / limit)
          }
        }
      })
      
    } catch (error) {
      logger.error('Failed to fetch export history', error as Error, {
        requestId: request.requestId,
        userId: request.user?.id
      }, LogCategory.SERVICE)
      
      reply.code(500).send({
        success: false,
        error: {
          message: '获取导出历史失败',
          code: 'EXPORT_HISTORY_FAILED'
        }
      })
    }
  })
  
  /**
   * 清理过期的导出文件
   * DELETE /api/export/cleanup
   */
  fastify.delete('/export/cleanup', {
    preHandler: [requireAuth]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      logger.info('Starting export files cleanup', {
        requestId: request.requestId,
        userId: request.user?.id
      }, LogCategory.SERVICE)
      
      // TODO: 实现清理逻辑
      // 1. 删除超过7天的导出文件
      // 2. 更新数据库记录
      // 3. 返回清理统计
      
      reply.send({
        success: true,
        data: {
          message: '导出文件清理完成',
          deletedFiles: 0,
          freedSpace: 0
        }
      })
      
    } catch (error) {
      logger.error('Export cleanup failed', error as Error, {
        requestId: request.requestId
      }, LogCategory.SERVICE)
      
      reply.code(500).send({
        success: false,
        error: {
          message: '清理导出文件失败',
          code: 'CLEANUP_FAILED'
        }
      })
    }
  })
}