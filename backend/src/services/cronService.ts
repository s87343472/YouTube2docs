import { logger } from '../utils/logger'
import { NotificationService } from './notificationService'
import { VideoCacheService } from './videoCacheService'
import { VideoProcessor } from './videoProcessor'
import { AudioProcessor } from './audioProcessor'

/**
 * 定时任务服务
 * 负责执行各种定时清理和维护任务
 */
export class CronService {
  private static isInitialized = false
  private static intervals: NodeJS.Timeout[] = []

  /**
   * 初始化定时任务
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('CronService already initialized')
      return
    }

    try {
      await this.startAllTasks()
      this.isInitialized = true
      logger.info('CronService initialized successfully')
    } catch (error) {
      logger.error('Failed to initialize CronService', { error })
      throw error
    }
  }

  /**
   * 启动所有定时任务
   */
  private static async startAllTasks(): Promise<void> {
    // 每1分钟处理通知队列
    this.intervals.push(setInterval(async () => {
      try {
        await this.processNotificationQueue()
      } catch (error) {
        logger.error('Notification queue processing failed', { error })
      }
    }, 60 * 1000)) // 1分钟

    // 每1小时清理24小时前的音频文件
    this.intervals.push(setInterval(async () => {
      try {
        await this.cleanupAudioFiles()
      } catch (error) {
        logger.error('Audio files cleanup failed', { error })
      }
    }, 60 * 60 * 1000)) // 1小时

    // 每6小时清理过期数据
    this.intervals.push(setInterval(async () => {
      try {
        await this.cleanupExpiredData()
      } catch (error) {
        logger.error('Expired data cleanup failed', { error })
      }
    }, 6 * 60 * 60 * 1000)) // 6小时

    // 每天凌晨3点清理日志和缓存统计
    const now = new Date()
    const next3AM = new Date(now)
    next3AM.setHours(3, 0, 0, 0)
    if (next3AM <= now) {
      next3AM.setDate(next3AM.getDate() + 1)
    }

    const msUntil3AM = next3AM.getTime() - now.getTime()
    setTimeout(() => {
      this.intervals.push(setInterval(async () => {
        try {
          await this.dailyMaintenanceTasks()
        } catch (error) {
          logger.error('Daily maintenance tasks failed', { error })
        }
      }, 24 * 60 * 60 * 1000)) // 24小时

      // 执行首次日常维护任务
      this.dailyMaintenanceTasks().catch(error => {
        logger.error('Initial daily maintenance failed', { error })
      })
    }, msUntil3AM)

    logger.info('All cron tasks started', {
      notificationProcessing: '每1分钟',
      audioCleanup: '每1小时',
      dataCleanup: '每6小时',
      dailyMaintenance: '每天凌晨3点'
    })
  }

  /**
   * 处理通知队列
   */
  private static async processNotificationQueue(): Promise<void> {
    try {
      const result = await NotificationService.processNotificationQueue(20) // 每次处理20条

      if (result.processed > 0) {
        logger.info('Notification queue processed', {
          processed: result.processed,
          succeeded: result.succeeded,
          failed: result.failed
        })
      }
    } catch (error) {
      logger.error('Failed to process notification queue', { error })
    }
  }

  /**
   * 清理24小时前的音频文件
   */
  private static async cleanupAudioFiles(): Promise<void> {
    try {
      const deletedCount = await AudioProcessor.cleanupOldAudioFiles(24) // 24小时
      
      if (deletedCount > 0) {
        logger.info('Audio files cleaned up', { deletedCount })
      }
    } catch (error) {
      logger.error('Failed to cleanup audio files', { error })
    }
  }

  /**
   * 清理过期数据
   */
  private static async cleanupExpiredData(): Promise<void> {
    try {
      // 清理过期的视频处理记录（30天）
      const deletedProcesses = await VideoProcessor.cleanupExpiredProcesses(30)
      
      // 清理过期的缓存访问日志（30天）
      const deletedCacheLogs = await VideoCacheService.cleanupOldAccessLogs(30)

      if (deletedProcesses > 0 || deletedCacheLogs > 0) {
        logger.info('Expired data cleaned up', {
          deletedProcesses,
          deletedCacheLogs
        })
      }
    } catch (error) {
      logger.error('Failed to cleanup expired data', { error })
    }
  }

  /**
   * 每日维护任务
   */
  private static async dailyMaintenanceTasks(): Promise<void> {
    try {
      logger.info('Starting daily maintenance tasks')

      // 清理通知相关数据（30天）
      const notificationCleanup = await NotificationService.cleanupOldNotifications(30)

      // 获取系统统计信息
      const cacheStats = await VideoCacheService.getCacheStats()
      const notificationStats = await NotificationService.getNotificationStats()
      const processingStats = await VideoProcessor.getProcessingStats()

      logger.info('Daily maintenance completed', {
        notificationCleanup,
        systemStats: {
          cache: cacheStats,
          notifications: notificationStats,
          processing: processingStats
        }
      })
    } catch (error) {
      logger.error('Failed to complete daily maintenance tasks', { error })
    }
  }

  /**
   * 停止所有定时任务
   */
  static async shutdown(): Promise<void> {
    try {
      this.intervals.forEach(interval => {
        clearInterval(interval)
      })
      this.intervals = []
      this.isInitialized = false
      
      logger.info('CronService shutdown successfully')
    } catch (error) {
      logger.error('Failed to shutdown CronService', { error })
    }
  }

  /**
   * 手动执行通知队列处理（用于测试）
   */
  static async manualProcessNotifications(): Promise<{
    processed: number
    succeeded: number
    failed: number
  }> {
    return await NotificationService.processNotificationQueue(50)
  }

  /**
   * 手动执行清理任务（用于测试）
   */
  static async manualCleanup(): Promise<{
    audioFiles: number
    expiredProcesses: number
    cacheLogs: number
    notifications: {
      deletedQueue: number
      deletedLogs: number
    }
  }> {
    const audioFiles = await AudioProcessor.cleanupOldAudioFiles(24)
    const expiredProcesses = await VideoProcessor.cleanupExpiredProcesses(30)
    const cacheLogs = await VideoCacheService.cleanupOldAccessLogs(30)
    const notifications = await NotificationService.cleanupOldNotifications(30)

    return {
      audioFiles,
      expiredProcesses,
      cacheLogs,
      notifications
    }
  }

  /**
   * 获取定时任务状态
   */
  static getStatus(): {
    isInitialized: boolean
    activeIntervals: number
    nextDailyMaintenance: string
  } {
    const now = new Date()
    const next3AM = new Date(now)
    next3AM.setHours(3, 0, 0, 0)
    if (next3AM <= now) {
      next3AM.setDate(next3AM.getDate() + 1)
    }

    return {
      isInitialized: this.isInitialized,
      activeIntervals: this.intervals.length,
      nextDailyMaintenance: next3AM.toISOString()
    }
  }
}