import { pool } from '../utils/database'
import { logger } from '../utils/logger'
import crypto from 'crypto'

/**
 * 视频缓存服务
 * 负责管理视频处理结果的缓存和复用
 */

export interface VideoCacheEntry {
  id: number
  youtubeUrl: string
  urlHash: string
  videoTitle?: string
  videoDuration?: number
  videoChannel?: string
  resultData: any // LearningMaterial JSON
  processingCost: number
  accessCount: number
  lastAccessedAt: Date
  createdBy: number
  createdAt: Date
  updatedAt: Date
  expiresAt?: Date
  isActive: boolean
}

export interface CacheAccessLog {
  id: number
  cacheId: number
  userId: string
  accessType: 'create' | 'reuse'
  processId?: string
  ipAddress?: string
  userAgent?: string
  accessedAt: Date
}

export class VideoCacheService {
  
  /**
   * 生成YouTube URL的哈希值
   */
  static generateUrlHash(youtubeUrl: string): string {
    // 标准化URL（移除不影响视频内容的参数）
    const normalizedUrl = this.normalizeYouTubeUrl(youtubeUrl)
    return crypto.createHash('sha256').update(normalizedUrl).digest('hex')
  }

  /**
   * 标准化YouTube URL
   */
  static normalizeYouTubeUrl(url: string): string {
    try {
      const urlObj = new URL(url)
      
      // 提取视频ID
      let videoId = ''
      if (urlObj.hostname === 'youtu.be') {
        videoId = urlObj.pathname.slice(1)
      } else if (urlObj.hostname.includes('youtube.com')) {
        videoId = urlObj.searchParams.get('v') || ''
      }
      
      if (!videoId) {
        throw new Error('Invalid YouTube URL')
      }
      
      // 返回标准化的URL格式
      return `https://www.youtube.com/watch?v=${videoId}`
    } catch (error) {
      logger.error('Failed to normalize YouTube URL', { url, error })
      throw new Error('Invalid YouTube URL format')
    }
  }

  /**
   * 检查缓存是否存在且有效
   */
  static async checkCache(youtubeUrl: string): Promise<VideoCacheEntry | null> {
    try {
      const urlHash = this.generateUrlHash(youtubeUrl)
      const now = new Date()
      
      const result = await pool.query(`
        SELECT 
          id, youtube_url, url_hash, video_title, video_duration, video_channel,
          result_data, processing_cost, access_count, last_accessed_at,
          created_by, created_at, updated_at, expires_at, is_active
        FROM video_cache
        WHERE url_hash = $1 
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > $2)
        ORDER BY created_at DESC
        LIMIT 1
      `, [urlHash, now])

      if (result.rows.length === 0) {
        return null
      }

      const row = result.rows[0]
      return {
        id: row.id,
        youtubeUrl: row.youtube_url,
        urlHash: row.url_hash,
        videoTitle: row.video_title,
        videoDuration: row.video_duration,
        videoChannel: row.video_channel,
        resultData: row.result_data,
        processingCost: parseFloat(row.processing_cost),
        accessCount: row.access_count,
        lastAccessedAt: row.last_accessed_at,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        expiresAt: row.expires_at,
        isActive: row.is_active
      }
    } catch (error) {
      logger.error('Failed to check video cache', { youtubeUrl, error })
      return null
    }
  }

  /**
   * 保存视频处理结果到缓存
   */
  static async saveToCache(
    youtubeUrl: string,
    resultData: any,
    userId: string,
    options: {
      videoTitle?: string
      videoDuration?: number
      videoChannel?: string
      processingCost?: number
      expiresAt?: Date
      processId?: string
      ipAddress?: string
      userAgent?: string
    } = {}
  ): Promise<VideoCacheEntry> {
    try {
      const urlHash = this.generateUrlHash(youtubeUrl)
      const normalizedUrl = this.normalizeYouTubeUrl(youtubeUrl)
      
      // 直接使用userId（现在数据库字段类型为VARCHAR(50)）
      
      // 设置默认过期时间（30天）
      const defaultExpiresAt = new Date()
      defaultExpiresAt.setDate(defaultExpiresAt.getDate() + 30)
      
      const result = await pool.query(`
        INSERT INTO video_cache (
          youtube_url, url_hash, video_title, video_duration, video_channel,
          result_data, processing_cost, created_by, expires_at, access_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1)
        RETURNING 
          id, youtube_url, url_hash, video_title, video_duration, video_channel,
          result_data, processing_cost, access_count, last_accessed_at,
          created_by, created_at, updated_at, expires_at, is_active
      `, [
        normalizedUrl,
        urlHash,
        options.videoTitle,
        options.videoDuration,
        options.videoChannel,
        JSON.stringify(resultData),
        options.processingCost || 0,
        userId, // Now database accepts VARCHAR(50)
        options.expiresAt || defaultExpiresAt
      ])

      const cacheEntry: VideoCacheEntry = {
        id: result.rows[0].id,
        youtubeUrl: result.rows[0].youtube_url,
        urlHash: result.rows[0].url_hash,
        videoTitle: result.rows[0].video_title,
        videoDuration: result.rows[0].video_duration,
        videoChannel: result.rows[0].video_channel,
        resultData: result.rows[0].result_data,
        processingCost: parseFloat(result.rows[0].processing_cost),
        accessCount: result.rows[0].access_count,
        lastAccessedAt: result.rows[0].last_accessed_at,
        createdBy: result.rows[0].created_by,
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at,
        expiresAt: result.rows[0].expires_at,
        isActive: result.rows[0].is_active
      }

      // 记录缓存创建访问日志
      await this.logCacheAccess(cacheEntry.id, userId, 'create', {
        processId: options.processId,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent
      })

      logger.info('Video result saved to cache', {
        cacheId: cacheEntry.id,
        youtubeUrl: normalizedUrl,
        userId,
        processingCost: options.processingCost
      })

      return cacheEntry
    } catch (error) {
      logger.error('Failed to save video to cache', { youtubeUrl, userId, error })
      throw new Error('缓存保存失败')
    }
  }

  /**
   * 使用缓存（增加访问计数并记录日志）
   */
  static async useCache(
    cacheId: number,
    userId: string,
    options: {
      processId?: string
      ipAddress?: string
      userAgent?: string
    } = {}
  ): Promise<void> {
    try {
      // 更新访问统计
      await pool.query(`
        UPDATE video_cache 
        SET 
          access_count = access_count + 1,
          last_accessed_at = NOW(),
          updated_at = NOW()
        WHERE id = $1
      `, [cacheId])

      // 记录访问日志（logCacheAccess内部已经处理userId转换）
      await this.logCacheAccess(cacheId, userId, 'reuse', options)

      logger.info('Video cache accessed', {
        cacheId,
        userId,
        processId: options.processId
      })
    } catch (error) {
      logger.error('Failed to update cache access', { cacheId, userId, error })
      // 不抛出错误，缓存使用失败不应该影响主流程
    }
  }

  /**
   * 记录缓存访问日志
   */
  static async logCacheAccess(
    cacheId: number,
    userId: string,
    accessType: 'create' | 'reuse',
    options: {
      processId?: string
      ipAddress?: string
      userAgent?: string
    } = {}
  ): Promise<void> {
    try {
      // 直接使用userId（现在数据库字段类型为VARCHAR(50)）
      
      await pool.query(`
        INSERT INTO video_cache_access_logs (
          cache_id, user_id, access_type, process_id, ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        cacheId,
        userId, // Now database accepts VARCHAR(50)
        accessType,
        options.processId,
        options.ipAddress,
        options.userAgent
      ])
    } catch (error) {
      logger.error('Failed to log cache access', { cacheId, userId, accessType, error })
    }
  }

  /**
   * 获取缓存统计信息
   */
  static async getCacheStats(): Promise<{
    totalCached: number
    totalAccesses: number
    costSaved: number
    hitRate: number
    topVideos: Array<{
      videoTitle: string
      accessCount: number
      costSaved: number
    }>
  }> {
    try {
      // 基础统计
      const statsResult = await pool.query(`
        SELECT 
          COUNT(*) as total_cached,
          SUM(access_count) as total_accesses,
          SUM(processing_cost * (access_count - 1)) as cost_saved
        FROM video_cache 
        WHERE is_active = true
      `)

      // 热门视频统计
      const topVideosResult = await pool.query(`
        SELECT 
          video_title,
          access_count,
          processing_cost * (access_count - 1) as cost_saved
        FROM video_cache 
        WHERE is_active = true AND video_title IS NOT NULL
        ORDER BY access_count DESC
        LIMIT 10
      `)

      // 计算命中率（需要对比总处理请求数）
      const totalRequestsResult = await pool.query(`
        SELECT COUNT(*) as total_requests
        FROM video_processing_logs 
        WHERE created_at >= NOW() - INTERVAL '30 days'
      `)

      const stats = statsResult.rows[0]
      const totalRequests = totalRequestsResult.rows[0]?.total_requests || 0
      const hitRate = totalRequests > 0 ? (stats.total_accesses / totalRequests) * 100 : 0

      return {
        totalCached: parseInt(stats.total_cached),
        totalAccesses: parseInt(stats.total_accesses),
        costSaved: parseFloat(stats.cost_saved) || 0,
        hitRate: Math.round(hitRate * 100) / 100,
        topVideos: topVideosResult.rows.map(row => ({
          videoTitle: row.video_title,
          accessCount: row.access_count,
          costSaved: parseFloat(row.cost_saved) || 0
        }))
      }
    } catch (error) {
      logger.error('Failed to get cache stats', { error })
      throw new Error('获取缓存统计失败')
    }
  }

  /**
   * 清理过期缓存
   */
  static async cleanupExpiredCache(): Promise<{ deletedCount: number }> {
    try {
      const result = await pool.query(`
        UPDATE video_cache 
        SET is_active = false, updated_at = NOW()
        WHERE is_active = true 
        AND expires_at IS NOT NULL 
        AND expires_at <= NOW()
      `)

      const deletedCount = result.rowCount || 0

      if (deletedCount > 0) {
        logger.info('Expired video cache cleaned up', { deletedCount })
      }

      return { deletedCount }
    } catch (error) {
      logger.error('Failed to cleanup expired cache', { error })
      throw new Error('清理过期缓存失败')
    }
  }

  /**
   * 获取用户的缓存使用情况
   */
  static async getUserCacheUsage(userId: string): Promise<{
    createdCount: number
    reusedCount: number
    totalCostSaved: number
  }> {
    try {
      // 直接使用userId（现在数据库字段类型为VARCHAR(50)）

      // 用户创建的缓存数量
      const createdResult = await pool.query(`
        SELECT COUNT(*) as created_count
        FROM video_cache
        WHERE created_by = $1 AND is_active = true
      `, [userId])

      // 用户复用缓存的次数和节省成本
      const reusedResult = await pool.query(`
        SELECT 
          COUNT(*) as reused_count,
          SUM(vc.processing_cost) as total_cost_saved
        FROM video_cache_access_logs val
        JOIN video_cache vc ON val.cache_id = vc.id
        WHERE val.user_id = $1 AND val.access_type = 'reuse'
        AND vc.is_active = true
      `, [userId])

      return {
        createdCount: parseInt(createdResult.rows[0].created_count),
        reusedCount: parseInt(reusedResult.rows[0].reused_count) || 0,
        totalCostSaved: parseFloat(reusedResult.rows[0].total_cost_saved) || 0
      }
    } catch (error) {
      logger.error('Failed to get user cache usage', { userId, error })
      throw new Error('获取用户缓存使用情况失败')
    }
  }

  /**
   * 手动删除缓存（管理员功能）
   */
  static async deleteCache(cacheId: number): Promise<void> {
    try {
      await pool.query(`
        UPDATE video_cache 
        SET is_active = false, updated_at = NOW()
        WHERE id = $1
      `, [cacheId])

      logger.info('Video cache deleted', { cacheId })
    } catch (error) {
      logger.error('Failed to delete video cache', { cacheId, error })
      throw new Error('删除缓存失败')
    }
  }

  /**
   * 清理指定天数之前的访问日志
   */
  static async cleanupOldAccessLogs(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000)

      const result = await pool.query(`
        DELETE FROM video_cache_access_logs
        WHERE created_at < $1
      `, [cutoffDate])

      const deletedCount = result.rowCount || 0

      if (deletedCount > 0) {
        logger.info('Old cache access logs cleaned up', { deletedCount, daysOld })
      }

      return deletedCount
    } catch (error) {
      logger.error('Failed to cleanup old access logs', { error, daysOld })
      throw new Error('清理旧访问日志失败')
    }
  }
}