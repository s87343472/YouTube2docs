import { v4 as uuidv4 } from 'uuid'
import { pool, redis } from '../config/database'
import { YouTubeService } from './youtubeService'
import { AudioProcessor } from './audioProcessor'
import { TranscriptionService } from './transcriptionService'
import { ContentAnalyzer } from './contentAnalyzer'
import { VideoCacheService } from './videoCacheService'
import { NotificationService } from './notificationService'
import { 
  VideoProcess, 
  ProcessingStep, 
  VideoInfo, 
  LearningMaterial,
  ProcessVideoRequest,
  ProcessVideoResponse,
  VideoStatusResponse,
  VideoResultResponse
} from '../types'

/**
 * 视频处理器 - 统筹整个视频处理流程
 */
export class VideoProcessor {
  private static readonly PROCESSING_STEPS: ProcessingStep[] = [
    {
      id: 'extract_info',
      name: '视频信息提取',
      description: '获取YouTube视频基本信息',
      estimatedDuration: 10,
      status: 'pending'
    },
    {
      id: 'extract_audio',
      name: '音频提取',
      description: '从视频中提取高质量音频',
      estimatedDuration: 30,
      status: 'pending'
    },
    {
      id: 'transcribe',
      name: '音频转录',
      description: '使用Groq Whisper进行语音识别',
      estimatedDuration: 40,
      status: 'pending'
    },
    {
      id: 'analyze_content',
      name: '内容分析',
      description: '使用GPT-4分析内容生成学习资料',
      estimatedDuration: 60,
      status: 'pending'
    },
    {
      id: 'generate_knowledge_graph',
      name: '知识图谱生成',
      description: '构建概念关联和知识网络',
      estimatedDuration: 30,
      status: 'pending'
    },
    {
      id: 'finalize',
      name: '完成处理',
      description: '整合所有结果并保存',
      estimatedDuration: 10,
      status: 'pending'
    }
  ]

  /**
   * 开始处理视频
   */
  static async processVideo(request: ProcessVideoRequest, userId?: string): Promise<ProcessVideoResponse> {
    console.log(`🎬 Starting video processing: ${request.youtubeUrl}`)

    try {
      // 验证YouTube URL
      if (!YouTubeService.isValidYouTubeURL(request.youtubeUrl)) {
        throw new Error('Invalid YouTube URL format')
      }

      // 🔍 首先检查缓存
      const cachedResult = await VideoCacheService.checkCache(request.youtubeUrl)
      if (cachedResult && userId) {
        console.log(`📦 Cache hit for ${request.youtubeUrl}, using cached result`)
        
        // 生成处理ID用于一致性
        const processId = uuidv4()
        
        // 创建处理记录（标记为缓存复用）
        await this.createProcessRecord(processId, request.youtubeUrl, userId, {
          fromCache: true,
          cacheId: cachedResult.id
        })
        
        // 更新缓存使用统计
        await VideoCacheService.useCache(cachedResult.id, userId, {
          processId,
          ipAddress: request.metadata?.ipAddress,
          userAgent: request.metadata?.userAgent
        })
        
        // 直接设置为完成状态并保存结果
        await this.updateProcessStatus(processId, 'completed', 100, 'finalize')
        await this.saveProcessingResult(processId, cachedResult.resultData)
        
        return {
          processId,
          status: 'accepted',
          estimatedTime: 5, // 缓存复用只需几秒
          message: '发现相同视频的处理结果，正在为您快速生成...'
        }
      }

      // 🚀 缓存未命中，执行正常处理流程
      console.log(`🔄 Cache miss for ${request.youtubeUrl}, starting full processing`)
      
      // 生成处理ID
      const processId = uuidv4()
      
      // 估算总处理时间
      const estimatedTime = this.PROCESSING_STEPS.reduce((sum, step) => sum + step.estimatedDuration, 0)

      // 创建处理记录
      await this.createProcessRecord(processId, request.youtubeUrl, userId)
      
      // 设置初始状态
      await this.updateProcessStatus(processId, 'processing', 0, 'extract_info')
      
      // 异步开始处理
      this.executeProcessingPipeline(processId, request, userId).catch(error => {
        console.error(`❌ Processing pipeline failed for ${processId}:`, error)
        this.updateProcessStatus(processId, 'failed', 0, 'extract_info', error instanceof Error ? error.message : String(error))
      })

      return {
        processId,
        status: 'accepted',
        estimatedTime,
        message: '视频处理已开始，预计需要2-3分钟完成'
      }

    } catch (error) {
      console.error('❌ Failed to start video processing:', error)
      throw new Error(`Processing failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * 执行完整的处理流程
   */
  private static async executeProcessingPipeline(
    processId: string, 
    request: ProcessVideoRequest,
    userId?: string
  ): Promise<void> {
    const startTime = Date.now()
    let videoInfo: VideoInfo | null = null
    
    try {
      console.log(`🚀 Executing processing pipeline for ${processId}`)

      // 步骤1: 提取视频信息
      await this.updateStepStatus(processId, 'extract_info', 'processing')
      videoInfo = await YouTubeService.getDetailedVideoInfo(request.youtubeUrl)
      await this.updateStepStatus(processId, 'extract_info', 'completed')
      await this.updateProcessStatus(processId, 'processing', 15, 'extract_audio')

      // 验证视频是否适合处理
      const validation = YouTubeService.validateVideoForProcessing(videoInfo)
      if (!validation.valid) {
        const errorMessage = [
          `❌ ${validation.reason}`,
          validation.suggestion ? `${validation.suggestion}` : '',
          validation.limits?.exceeded ? `⏱️ 当前: ${validation.limits.currentDuration} | 限制: ${validation.limits.maxDuration}` : ''
        ].filter(Boolean).join('\n')
        
        throw new Error(errorMessage)
      }

      // 步骤2: 提取音频
      await this.updateStepStatus(processId, 'extract_audio', 'processing')
      const videoId = YouTubeService.extractVideoId(request.youtubeUrl) || processId
      const audioResult = await AudioProcessor.extractAudio(request.youtubeUrl, videoId)
      await this.updateStepStatus(processId, 'extract_audio', 'completed')
      await this.updateProcessStatus(processId, 'processing', 35, 'transcribe')

      // 步骤3: 音频转录
      await this.updateStepStatus(processId, 'transcribe', 'processing')
      let transcription: any
      try {
        transcription = await TranscriptionService.smartTranscribe(
          audioResult, 
          videoId, 
          request.options?.language
        )
      } catch (transcriptionError: any) {
        // 如果是限流错误，提供用户友好的错误信息
        if (transcriptionError?.message?.includes('Groq API限流')) {
          await this.updateProcessStatus(processId, 'failed', 35, 'transcribe', 
            '音频转录失败：API使用量已达上限，请稍后重试或升级服务等级。')
          throw new Error('音频转录失败：API使用量已达上限，请稍后重试或升级服务等级。')
        }
        
        // 其他转录错误
        await this.updateProcessStatus(processId, 'failed', 35, 'transcribe', 
          `音频转录失败：${transcriptionError?.message || '未知错误'}`)
        throw transcriptionError
      }
      await this.updateStepStatus(processId, 'transcribe', 'completed')
      await this.updateProcessStatus(processId, 'processing', 60, 'analyze_content')

      // 步骤4: 内容分析
      await this.updateStepStatus(processId, 'analyze_content', 'processing')
      const learningMaterial = await ContentAnalyzer.analyzeLearningContent(videoInfo, transcription)
      await this.updateStepStatus(processId, 'analyze_content', 'completed')
      await this.updateProcessStatus(processId, 'processing', 85, 'generate_knowledge_graph')

      // 步骤5: 知识图谱生成（已集成到内容分析中）
      await this.updateStepStatus(processId, 'generate_knowledge_graph', 'processing')
      // 知识图谱生成已在ContentAnalyzer中完成
      await this.updateStepStatus(processId, 'generate_knowledge_graph', 'completed')
      await this.updateProcessStatus(processId, 'processing', 95, 'finalize')

      // 步骤6: 完成处理
      await this.updateStepStatus(processId, 'finalize', 'processing')
      await this.saveProcessingResult(processId, learningMaterial)
      await this.updateStepStatus(processId, 'finalize', 'completed')

      // 计算实际处理时间
      const processingTime = Math.round((Date.now() - startTime) / 1000)
      await this.updateProcessStatus(processId, 'completed', 100, 'finalize')
      await this.updateProcessingTime(processId, processingTime)

      // 💾 保存到缓存（如果有用户ID）
      if (userId) {
        try {
          // 估算处理成本（基于Groq定价 $0.04/小时）
          // Parse duration string to seconds first
          const durationSeconds = this.parseDurationToSeconds(videoInfo.duration || '0')
          const videoDurationHours = durationSeconds / 3600
          const processingCost = videoDurationHours * 0.04
          
          await VideoCacheService.saveToCache(request.youtubeUrl, learningMaterial, userId, {
            videoTitle: videoInfo.title,
            videoDuration: durationSeconds,
            videoChannel: videoInfo.channel,
            processingCost,
            processId,
            ipAddress: request.metadata?.ipAddress,
            userAgent: request.metadata?.userAgent
          })
          
          console.log(`📦 Processing result cached for ${request.youtubeUrl}`)
        } catch (cacheError) {
          console.error('Failed to cache processing result:', cacheError)
          // 缓存失败不应该影响主流程
        }
      }

      // 清理临时文件
      await AudioProcessor.cleanupTempFiles(videoId)

      console.log(`✅ Processing pipeline completed for ${processId} in ${processingTime}s`)

      // 📧 发送任务完成通知 (暂时禁用)
      // if (userId) {
      //   try {
      //     const userInfo = await this.getUserInfo(userId)
      //     if (userInfo) {
      //       await NotificationService.sendTaskCompletedNotification(
      //         userId,
      //         userInfo.email,
      //         {
      //           videoTitle: videoInfo.title,
      //           videoChannel: videoInfo.channel,
      //           processingTime,
      //           completedAt: new Date().toLocaleString('zh-CN'),
      //           resultUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/result/${processId}`
      //         }
      //       )
      //     }
      //   } catch (notificationError) {
      //     console.error('Failed to send completion notification:', notificationError)
      //     // 通知失败不应该影响主流程
      //   }
      // }

    } catch (error) {
      console.error(`❌ Processing pipeline failed for ${processId}:`, error)
      await this.updateProcessStatus(processId, 'failed', 0, 'extract_info', error instanceof Error ? error.message : String(error))
      
      // 📧 发送任务失败通知 (暂时禁用)
      // if (userId) {
      //   try {
      //     const userInfo = await this.getUserInfo(userId)
      //     if (userInfo) {
      //       await NotificationService.sendTaskFailedNotification(
      //         userId,
      //         userInfo.email,
      //         {
      //           videoTitle: videoInfo?.title || 'Unknown Video',
      //           youtubeUrl: request.youtubeUrl,
      //           failedAt: new Date().toLocaleString('zh-CN'),
      //           errorMessage: error instanceof Error ? error.message : String(error),
      //           retryUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/process?url=${encodeURIComponent(request.youtubeUrl)}`,
      //           supportUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/support`
      //         }
      //       )
      //     }
      //   } catch (notificationError) {
      //     console.error('Failed to send failure notification:', notificationError)
      //     // 通知失败不应该影响主流程
      //   }
      // }
      
      throw error
    }
  }

  /**
   * 获取处理状态
   */
  static async getProcessStatus(processId: string): Promise<VideoStatusResponse> {
    try {
      const result = await pool.query(
        'SELECT status, progress, current_step, error_message FROM video_processes WHERE id = $1',
        [processId]
      )

      if (result.rows.length === 0) {
        throw new Error('Process not found')
      }

      const process = result.rows[0]
      
      // 计算剩余时间
      let estimatedTimeRemaining = 0
      if (process.status === 'processing') {
        const remainingSteps = this.PROCESSING_STEPS.slice(
          this.PROCESSING_STEPS.findIndex(s => s.id === process.current_step)
        )
        estimatedTimeRemaining = remainingSteps.reduce((sum, step) => sum + step.estimatedDuration, 0)
      }

      return {
        processId,
        status: process.status,
        progress: process.progress || 0,
        currentStep: process.current_step,
        estimatedTimeRemaining,
        error: process.error_message
      }

    } catch (error) {
      console.error('Failed to get process status:', error)
      throw new Error(`Status query failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * 获取处理结果
   */
  static async getProcessResult(processId: string): Promise<VideoResultResponse> {
    try {
      const result = await pool.query(`
        SELECT 
          status, 
          result_data, 
          processing_time,
          progress,
          current_step,
          error_message,
          created_at
        FROM video_processes 
        WHERE id = $1
      `, [processId])

      if (result.rows.length === 0) {
        throw new Error('Process not found')
      }

      const process = result.rows[0]

      // 如果处理未完成，返回状态信息而不是结果数据
      if (process.status !== 'completed') {
        return {
          processId,
          status: process.status,
          progress: process.progress || 0,
          currentStep: process.current_step,
          error: process.error_message,
          message: process.status === 'processing' 
            ? '处理中，请稍后查看结果' 
            : process.status === 'failed' 
              ? '处理失败' 
              : '处理未开始'
        }
      }

      // 只有完成的任务才返回完整结果数据
      return {
        processId,
        status: 'completed',
        result: process.result_data as LearningMaterial,
        processingTime: process.processing_time || 0,
        downloadUrls: {
          pdf: `/api/download/${processId}/pdf`,
          markdown: `/api/download/${processId}/markdown`,
          json: `/api/download/${processId}/json`
        }
      }

    } catch (error) {
      console.error('Failed to get process result:', error)
      throw new Error(`Result query failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * 获取用户的处理历史
   */
  static async getUserProcessHistory(userId: number, limit: number = 10): Promise<VideoProcess[]> {
    try {
      const result = await pool.query(`
        SELECT 
          id, youtube_url, video_title, channel_name, 
          status, progress, created_at, processing_time
        FROM video_processes 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2
      `, [userId, limit])

      return result.rows
    } catch (error) {
      console.error('Failed to get user process history:', error)
      throw new Error(`History query failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * 创建处理记录
   */
  private static async createProcessRecord(
    processId: string, 
    youtubeUrl: string, 
    userId?: string,
    metadata?: {
      fromCache?: boolean
      cacheId?: number
    }
  ): Promise<void> {
    const metadataJson = metadata ? JSON.stringify(metadata) : null
    
    await pool.query(`
      INSERT INTO video_processes (
        id, user_id, youtube_url, status, progress, metadata, created_at
      ) VALUES ($1, $2, $3, 'pending', 0, $4, CURRENT_TIMESTAMP)
    `, [processId, userId || null, youtubeUrl, metadataJson])
  }

  /**
   * 更新处理状态
   */
  private static async updateProcessStatus(
    processId: string,
    status: string,
    progress: number,
    currentStep: string,
    errorMessage?: string
  ): Promise<void> {
    const query = errorMessage 
      ? `UPDATE video_processes 
         SET status = $2, progress = $3, current_step = $4, error_message = $5, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1`
      : `UPDATE video_processes 
         SET status = $2, progress = $3, current_step = $4, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1`

    const params = errorMessage 
      ? [processId, status, progress, currentStep, errorMessage]
      : [processId, status, progress, currentStep]

    await pool.query(query, params)

    // 同时更新Redis缓存以供实时查询
    const statusData = {
      processId,
      status,
      progress,
      currentStep,
      timestamp: Date.now(),
      error: errorMessage
    }

    await redis.setex(`process:${processId}`, 3600, JSON.stringify(statusData)) // 1小时过期
  }

  /**
   * 更新步骤状态
   */
  private static async updateStepStatus(
    processId: string,
    stepId: string,
    status: 'pending' | 'processing' | 'completed' | 'failed'
  ): Promise<void> {
    // 这里可以实现更详细的步骤状态跟踪
    console.log(`📝 Step ${stepId} for ${processId}: ${status}`)
  }

  /**
   * 保存处理结果
   */
  private static async saveProcessingResult(
    processId: string,
    learningMaterial: LearningMaterial
  ): Promise<void> {
    await pool.query(`
      UPDATE video_processes 
      SET 
        video_title = $2,
        video_description = $3,
        channel_name = $4,
        duration = $5,
        result_data = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [
      processId,
      learningMaterial.videoInfo.title,
      learningMaterial.videoInfo.description,
      learningMaterial.videoInfo.channel,
      this.parseDurationToSeconds(learningMaterial.videoInfo.duration),
      JSON.stringify(learningMaterial)
    ])
  }

  /**
   * 更新处理时间
   */
  private static async updateProcessingTime(processId: string, processingTime: number): Promise<void> {
    await pool.query(`
      UPDATE video_processes 
      SET processing_time = $2, processing_end_time = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [processId, processingTime])
  }

  /**
   * 获取处理统计信息
   */
  static async getProcessingStats(): Promise<{
    totalProcesses: number
    completedProcesses: number
    failedProcesses: number
    averageProcessingTime: number
    todayProcesses: number
  }> {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total_processes,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_processes,
          COUNT(*) FILTER (WHERE status = 'failed') as failed_processes,
          AVG(processing_time) FILTER (WHERE processing_time IS NOT NULL) as avg_processing_time,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as today_processes
        FROM video_processes
      `)

      const stats = result.rows[0]
      
      return {
        totalProcesses: parseInt(stats.total_processes) || 0,
        completedProcesses: parseInt(stats.completed_processes) || 0,
        failedProcesses: parseInt(stats.failed_processes) || 0,
        averageProcessingTime: Math.round(parseFloat(stats.avg_processing_time)) || 0,
        todayProcesses: parseInt(stats.today_processes) || 0
      }
    } catch (error) {
      console.error('Failed to get processing stats:', error)
      return {
        totalProcesses: 0,
        completedProcesses: 0,
        failedProcesses: 0,
        averageProcessingTime: 0,
        todayProcesses: 0
      }
    }
  }

  /**
   * 清理过期的处理记录
   */
  static async cleanupExpiredProcesses(daysOld: number = 30): Promise<number> {
    try {
      const result = await pool.query(`
        DELETE FROM video_processes 
        WHERE created_at < CURRENT_DATE - INTERVAL '${daysOld} days'
        AND status IN ('completed', 'failed')
      `)

      const deletedCount = result.rowCount || 0
      console.log(`🧹 Cleaned up ${deletedCount} expired process records`)
      
      return deletedCount
    } catch (error) {
      console.error('Failed to cleanup expired processes:', error)
      return 0
    }
  }

  /**
   * 获取用户信息
   */
  private static async getUserInfo(userId: string): Promise<{ email: string } | null> {
    try {
      const result = await pool.query(
        'SELECT email FROM users WHERE id = $1',
        [userId]
      )
      
      if (result.rows.length === 0) {
        return null
      }
      
      return { email: result.rows[0].email }
    } catch (error) {
      console.error('Failed to get user info:', error)
      return null
    }
  }

  /**
   * 工具函数：解析时长为秒数
   */
  private static parseDurationToSeconds(duration: string): number {
    const parts = duration.split(':').map(Number)
    if (parts.length === 2) return parts[0] * 60 + parts[1]
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
    return 0
  }
}