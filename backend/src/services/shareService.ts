import { FastifyInstance, FastifyRequest } from 'fastify'
import { pool } from '../config/database'
import { SharedContent, SharedContentView, SharedContentAnalytics } from '../types'

/**
 * 分享服务类
 * 处理学习资料的公开分享功能
 */
export class ShareService {
  
  /**
   * 创建公开分享
   */
  static async createShare(
    userId: string,
    videoProcessId: string,
    shareData: {
      title: string
      description?: string
      tags?: string[]
      isPublic: boolean
    }
  ): Promise<SharedContent> {
    const db = pool
    
    try {
      // 生成唯一的分享ID
      const shareId = await this.generateUniqueShareId()
      
      const query = `
        INSERT INTO shared_content 
        (share_id, user_id, video_process_id, title, description, tags, is_public)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `
      
      const result = await db.query(query, [
        shareId,
        userId,
        videoProcessId,
        shareData.title,
        shareData.description || null,
        shareData.tags || [],
        shareData.isPublic
      ])
      
      const sharedContent = result.rows[0]
      
      console.log(`✅ Created share: ${shareId} for user: ${userId}`)
      return this.formatSharedContent(sharedContent)
      
    } catch (error) {
      console.error('❌ Failed to create share:', error)
      throw new Error(`创建分享失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  
  /**
   * 获取分享内容（包含完整的学习资料）
   */
  static async getSharedContent(shareId: string): Promise<SharedContent | null> {
    const db = pool
    
    try {
      const query = `
        SELECT 
          sc.*,
          vp.result_data as learning_material,
          vp.youtube_url,
          vp.video_title,
          vp.duration
        FROM shared_content sc
        JOIN video_processes vp ON sc.video_process_id = vp.id
        WHERE sc.share_id = $1 AND sc.is_public = true
      `
      
      const result = await db.query(query, [shareId])
      
      if (result.rows.length === 0) {
        return null
      }
      
      const row = result.rows[0]
      return this.formatSharedContentWithMaterial(row)
      
    } catch (error) {
      console.error('❌ Failed to get shared content:', error)
      throw new Error(`获取分享内容失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  
  /**
   * 记录浏览行为
   */
  static async recordView(
    shareId: string, 
    request: FastifyRequest
  ): Promise<void> {
    const db = pool
    
    try {
      // 提取访问信息
      const viewerIP = this.getClientIP(request)
      const userAgent = request.headers['user-agent'] || ''
      const referrer = request.headers.referer || request.headers.referrer
      const source = this.getSourceFromReferrer(referrer as string)
      
      // 检查是否是同一IP在短时间内的重复访问（防刷）
      const recentViewQuery = `
        SELECT id FROM shared_content_views 
        WHERE share_id = $1 AND viewer_ip = $2 
        AND viewed_at > NOW() - INTERVAL '5 minutes'
        LIMIT 1
      `
      
      const recentView = await db.query(recentViewQuery, [shareId, viewerIP])
      
      if (recentView.rows.length === 0) {
        // 记录新的浏览
        const insertQuery = `
          INSERT INTO shared_content_views 
          (share_id, viewer_ip, viewer_user_agent, referrer, source)
          VALUES ($1, $2, $3, $4, $5)
        `
        
        await db.query(insertQuery, [shareId, viewerIP, userAgent, referrer, source])
        
        // 更新分享内容的浏览计数
        const updateQuery = `
          UPDATE shared_content 
          SET view_count = view_count + 1 
          WHERE share_id = $1
        `
        
        await db.query(updateQuery, [shareId])
        
        console.log(`📊 Recorded view for share: ${shareId} from IP: ${viewerIP}`)
      }
      
    } catch (error) {
      console.error('❌ Failed to record view:', error)
      // 浏览统计失败不应该影响用户访问，所以只记录错误但不抛出
    }
  }
  
  /**
   * 获取用户的分享列表
   */
  static async getUserShares(userId: string): Promise<SharedContent[]> {
    const db = pool
    
    try {
      const query = `
        SELECT 
          sc.*,
          vp.video_title,
          vp.youtube_url,
          vp.duration
        FROM shared_content sc
        JOIN video_processes vp ON sc.video_process_id = vp.id
        WHERE sc.user_id = $1
        ORDER BY sc.created_at DESC
      `
      
      const result = await db.query(query, [userId])
      return result.rows.map((row: any) => this.formatSharedContent(row))
      
    } catch (error) {
      console.error('❌ Failed to get user shares:', error)
      throw new Error(`获取用户分享列表失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  
  /**
   * 获取分享内容的分析数据
   */
  static async getShareAnalytics(shareId: string, userId: string): Promise<SharedContentAnalytics> {
    const db = pool
    
    try {
      // 验证用户权限
      const permissionQuery = `
        SELECT id FROM shared_content 
        WHERE share_id = $1 AND user_id = $2
      `
      
      const permissionResult = await db.query(permissionQuery, [shareId, userId])
      
      if (permissionResult.rows.length === 0) {
        throw new Error('无权限查看此分享的统计数据')
      }
      
      // 获取基础统计
      const basicStatsQuery = `
        SELECT 
          COUNT(*) as total_views,
          COUNT(DISTINCT viewer_ip) as unique_views,
          MAX(viewed_at) as last_viewed_at
        FROM shared_content_views 
        WHERE share_id = $1
      `
      
      const basicStats = await db.query(basicStatsQuery, [shareId])
      
      // 获取每日浏览数据（最近30天）
      const dailyViewsQuery = `
        SELECT 
          DATE(viewed_at) as date,
          COUNT(*) as views
        FROM shared_content_views 
        WHERE share_id = $1 
        AND viewed_at > NOW() - INTERVAL '30 days'
        GROUP BY DATE(viewed_at)
        ORDER BY date
      `
      
      const dailyViews = await db.query(dailyViewsQuery, [shareId])
      
      // 获取来源统计
      const referrerStatsQuery = `
        SELECT 
          source,
          COUNT(*) as count
        FROM shared_content_views 
        WHERE share_id = $1
        GROUP BY source
        ORDER BY count DESC
      `
      
      const referrerStats = await db.query(referrerStatsQuery, [shareId])
      
      const stats = basicStats.rows[0]
      
      return {
        shareId,
        totalViews: parseInt(stats.total_views) || 0,
        uniqueViews: parseInt(stats.unique_views) || 0,
        dailyViews: dailyViews.rows.map((row: any) => ({
          date: row.date,
          views: parseInt(row.views)
        })),
        topReferrers: referrerStats.rows.map((row: any) => ({
          source: row.source,
          count: parseInt(row.count)
        })),
        averageViewTime: 0, // TODO: 实现页面停留时间统计
        lastViewedAt: stats.last_viewed_at || ''
      }
      
    } catch (error) {
      console.error('❌ Failed to get share analytics:', error)
      throw new Error(`获取分享统计失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  
  /**
   * 更新分享设置
   */
  static async updateShare(
    shareId: string,
    userId: string,
    updates: {
      title?: string
      description?: string
      tags?: string[]
      isPublic?: boolean
    }
  ): Promise<SharedContent> {
    const db = pool
    
    try {
      const updateFields: string[] = []
      const values: any[] = []
      let paramIndex = 1
      
      if (updates.title !== undefined) {
        updateFields.push(`title = $${paramIndex++}`)
        values.push(updates.title)
      }
      
      if (updates.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`)
        values.push(updates.description)
      }
      
      if (updates.tags !== undefined) {
        updateFields.push(`tags = $${paramIndex++}`)
        values.push(updates.tags)
      }
      
      if (updates.isPublic !== undefined) {
        updateFields.push(`is_public = $${paramIndex++}`)
        values.push(updates.isPublic)
      }
      
      if (updateFields.length === 0) {
        throw new Error('没有提供要更新的字段')
      }
      
      values.push(shareId, userId)
      
      const query = `
        UPDATE shared_content 
        SET ${updateFields.join(', ')}, "updatedAt" = CURRENT_TIMESTAMP
        WHERE share_id = $${paramIndex++} AND user_id = $${paramIndex}
        RETURNING *
      `
      
      const result = await db.query(query, values)
      
      if (result.rows.length === 0) {
        throw new Error('分享不存在或无权限修改')
      }
      
      console.log(`✅ Updated share: ${shareId}`)
      return this.formatSharedContent(result.rows[0])
      
    } catch (error) {
      console.error('❌ Failed to update share:', error)
      throw new Error(`更新分享失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  
  /**
   * 获取公开分享列表（用于首页展示）
   */
  static async getPublicShares(limit: number = 12): Promise<SharedContent[]> {
    const db = pool
    
    try {
      const query = `
        SELECT 
          sc.*,
          vp.video_title,
          vp.youtube_url,
          vp.duration
        FROM shared_content sc
        JOIN video_processes vp ON sc.video_process_id = vp.id
        WHERE sc.is_public = true
        ORDER BY sc.created_at DESC
        LIMIT $1
      `
      
      const result = await db.query(query, [limit])
      return result.rows.map((row: any) => this.formatSharedContent(row))
      
    } catch (error) {
      console.error('❌ Failed to get public shares:', error)
      throw new Error(`获取公开分享列表失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * 删除分享
   */
  static async deleteShare(shareId: string, userId: string): Promise<void> {
    const db = pool
    
    try {
      const query = `
        DELETE FROM shared_content 
        WHERE share_id = $1 AND user_id = $2
      `
      
      const result = await db.query(query, [shareId, userId])
      
      if (result.rowCount === 0) {
        throw new Error('分享不存在或无权限删除')
      }
      
      console.log(`✅ Deleted share: ${shareId}`)
      
    } catch (error) {
      console.error('❌ Failed to delete share:', error)
      throw new Error(`删除分享失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  
  // ============ 私有辅助方法 ============
  
  /**
   * 生成唯一的分享ID
   */
  private static async generateUniqueShareId(): Promise<string> {
    const db = pool
    const result = await db.query('SELECT get_unique_share_id() as share_id')
    return result.rows[0].share_id
  }
  
  /**
   * 格式化分享内容
   */
  private static formatSharedContent(row: any): SharedContent {
    return {
      id: row.id.toString(),
      shareId: row.share_id,
      userId: row.user_id.toString(),
      videoInfo: {
        title: row.video_title || '',
        url: row.youtube_url || '',
        channel: '',
        duration: row.duration || '0:00',
        views: '',
        thumbnail: ''
      },
      learningMaterial: row.learning_material || {},
      isPublic: row.is_public,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      viewCount: row.view_count || 0,
      likeCount: row.like_count || 0,
      title: row.title,
      description: row.description,
      tags: row.tags || []
    }
  }
  
  /**
   * 格式化包含完整学习资料的分享内容
   */
  private static formatSharedContentWithMaterial(row: any): SharedContent {
    return {
      id: row.id.toString(),
      shareId: row.share_id,
      userId: row.user_id.toString(),
      videoInfo: {
        title: row.video_title || '',
        url: row.youtube_url || '',
        channel: '',
        duration: this.formatDuration(row.duration || 0),
        views: '',
        thumbnail: ''
      },
      learningMaterial: row.learning_material || {},
      isPublic: row.is_public,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      viewCount: row.view_count || 0,
      likeCount: row.like_count || 0,
      title: row.title,
      description: row.description,
      tags: row.tags || []
    }
  }
  
  /**
   * 获取客户端IP
   */
  private static getClientIP(request: FastifyRequest): string {
    const forwarded = request.headers['x-forwarded-for'] as string
    const realIP = request.headers['x-real-ip'] as string
    
    if (forwarded) {
      return forwarded.split(',')[0].trim()
    }
    
    if (realIP) {
      return realIP
    }
    
    return request.socket.remoteAddress || '127.0.0.1'
  }
  
  /**
   * 根据referrer判断来源
   */
  private static getSourceFromReferrer(referrer?: string): string {
    if (!referrer) return 'direct'
    
    try {
      const url = new URL(referrer)
      const hostname = url.hostname.toLowerCase()
      
      // 社交媒体来源
      if (hostname.includes('twitter.com') || hostname.includes('t.co')) return 'social'
      if (hostname.includes('facebook.com') || hostname.includes('fb.com')) return 'social'
      if (hostname.includes('linkedin.com')) return 'social'
      if (hostname.includes('weibo.com') || hostname.includes('qq.com')) return 'social'
      
      // 搜索引擎来源
      if (hostname.includes('google.com') || hostname.includes('baidu.com')) return 'search'
      if (hostname.includes('bing.com') || hostname.includes('sogou.com')) return 'search'
      
      // 本站来源
      if (url.pathname === '/' || url.pathname.includes('/home')) return 'home'
      if (url.pathname.includes('/profile') || url.pathname.includes('/dashboard')) return 'profile'
      
      return 'direct'
    } catch {
      return 'direct'
    }
  }
  
  /**
   * 格式化时长
   */
  private static formatDuration(seconds: number): string {
    if (seconds <= 0) return '0:00'
    
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
    } else {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
    }
  }
}