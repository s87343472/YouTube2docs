import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { ShareService } from '../services/shareService'
import { logger, LogCategory } from '../utils/logger'
import { validators } from '../middleware/validation'
import { requireAuth, optionalAuth } from '../middleware/authMiddleware'
import { pool } from '../config/database'

/**
 * 用户相关的API路由
 * 处理用户个人中心、分析数据等功能
 */

interface UserAnalytics {
  totalViews: number
  totalShares: number
  totalLikes: number
  recentViews: number
  topPerformingShare?: any
  viewsLastWeek: Array<{ date: string; views: number }>
  sharesLastMonth: Array<{ date: string; shares: number }>
}

export async function userRoutes(fastify: FastifyInstance) {
  
  /**
   * 获取用户分析数据
   * GET /api/user/analytics
   */
  fastify.get('/user/analytics', {
    preHandler: [optionalAuth], // 暂时设为可选，实际部署时改为required
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                totalViews: { type: 'number' },
                totalShares: { type: 'number' },
                totalLikes: { type: 'number' },
                recentViews: { type: 'number' },
                topPerformingShare: { type: 'object' },
                viewsLastWeek: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      date: { type: 'string' },
                      views: { type: 'number' }
                    }
                  }
                },
                sharesLastMonth: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      date: { type: 'string' },
                      shares: { type: 'number' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // TODO: 从认证中间件获取用户ID
      const userId = request.user?.id || '1' // 临时硬编码
      
      logger.info('Fetching user analytics', undefined, {
        userId
      }, LogCategory.USER)
      
      // 获取用户的所有分享
      const userShares = await ShareService.getUserShares(userId)
      
      // 获取真实的浏览统计数据
      const viewStatsQuery = `
        SELECT 
          DATE(viewed_at) as view_date,
          COUNT(*) as daily_views
        FROM shared_content_views scv
        JOIN shared_content sc ON scv.share_id = sc.share_id
        WHERE sc.user_id = $1 
          AND scv.viewed_at >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY DATE(viewed_at)
        ORDER BY view_date
      `
      
      const viewStatsResult = await pool.query(viewStatsQuery, [userId])
      
      // 获取分享创建统计数据
      const shareStatsQuery = `
        SELECT 
          DATE("createdAt") as share_date,
          COUNT(*) as daily_shares
        FROM shared_content
        WHERE user_id = $1 
          AND "createdAt" >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE("createdAt")
        ORDER BY share_date
      `
      
      const shareStatsResult = await pool.query(shareStatsQuery, [userId])
      
      // 计算统计数据
      const analytics: UserAnalytics = {
        totalShares: userShares.length,
        totalViews: userShares.reduce((sum, share) => sum + share.viewCount, 0),
        totalLikes: userShares.reduce((sum, share) => sum + share.likeCount, 0),
        recentViews: 0, // 将在下面计算
        viewsLastWeek: [],
        sharesLastMonth: []
      }
      
      // 找出表现最好的分享
      if (userShares.length > 0) {
        analytics.topPerformingShare = userShares.reduce((best, current) => 
          current.viewCount > best.viewCount ? current : best
        )
      }
      
      // 处理过去7天的浏览量数据 (使用真实数据，如果没有则用0)
      const now = new Date()
      const viewStatsMap = new Map(
        viewStatsResult.rows.map(row => [
          row.view_date.toISOString().split('T')[0], 
          parseInt(row.daily_views)
        ])
      )
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now)
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        
        const dailyViews = viewStatsMap.get(dateStr) || 0
        analytics.viewsLastWeek.push({
          date: dateStr,
          views: dailyViews
        })
        
        analytics.recentViews += dailyViews
      }
      
      // 处理过去30天的分享创建数据 (使用真实数据，如果没有则用0)
      const shareStatsMap = new Map(
        shareStatsResult.rows.map(row => [
          row.share_date.toISOString().split('T')[0], 
          parseInt(row.daily_shares)
        ])
      )
      
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now)
        date.setDate(date.getDate() - i)
        const dateStr = date.toISOString().split('T')[0]
        
        const dailyShares = shareStatsMap.get(dateStr) || 0
        analytics.sharesLastMonth.push({
          date: dateStr,
          shares: dailyShares
        })
      }
      
      logger.info('User analytics calculated', undefined, {
        userId,
        metadata: {
          totalShares: analytics.totalShares,
          totalViews: analytics.totalViews
        }
      }, LogCategory.USER)
      
      reply.send({
        success: true,
        data: analytics
      })
      
    } catch (error) {
      logger.error('Failed to get user analytics', error as Error, {
        userId: request.user?.id
      }, LogCategory.USER)
      
      reply.code(500).send({
        success: false,
        error: {
          message: '获取用户统计数据失败',
          code: 'USER_ANALYTICS_FAILED'
        }
      })
    }
  })
  
  /**
   * 获取用户个人资料
   * GET /api/user/profile
   */
  fastify.get('/user/profile', {
    preHandler: [optionalAuth], // 暂时设为可选，实际部署时改为required
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                email: { type: 'string' },
                joinDate: { type: 'string' },
                avatar: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // TODO: 从认证中间件获取用户ID并从数据库查询用户信息
      const userId = request.user?.id || '1' // 临时硬编码
      
      logger.info('Fetching user profile', undefined, {
        userId
      }, LogCategory.USER)
      
      // 查询真实用户数据
      const userQuery = `
        SELECT 
          id,
          name,
          email,
          plan,
          monthly_quota,
          used_quota,
          "createdAt",
          is_active
        FROM users 
        WHERE id = $1 AND is_active = true
      `
      
      const userResult = await pool.query(userQuery, [userId])
      
      if (userResult.rows.length === 0) {
        return reply.code(404).send({
          success: false,
          error: {
            message: '用户不存在',
            code: 'USER_NOT_FOUND'
          }
        })
      }
      
      const user = userResult.rows[0]
      
      // 获取用户处理统计
      const statsQuery = `
        SELECT 
          COUNT(*) as total_processes,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_processes,
          COUNT(*) FILTER (WHERE "createdAt" >= CURRENT_DATE) as today_processes,
          COUNT(*) FILTER (WHERE "createdAt" >= CURRENT_DATE - INTERVAL '7 days') as week_processes
        FROM video_processes
        WHERE user_id = $1
      `
      
      const statsResult = await pool.query(statsQuery, [userId])
      const stats = statsResult.rows[0]
      
      // 获取分享统计
      const shareStatsQuery = `
        SELECT 
          COUNT(*) as total_shares,
          COALESCE(SUM(view_count), 0) as total_views,
          COALESCE(SUM(like_count), 0) as total_likes
        FROM shared_content
        WHERE user_id = $1
      `
      
      const shareStatsResult = await pool.query(shareStatsQuery, [userId])
      const shareStats = shareStatsResult.rows[0]
      
      const userProfile = {
        id: user.id,
        name: user.name,
        email: user.email,
        plan: user.plan || 'free',
        monthlyQuota: user.monthly_quota || 10,
        usedQuota: user.used_quota || 0,
        quotaUsagePercent: Math.round(((user.used_quota || 0) / (user.monthly_quota || 10)) * 100),
        joinDate: user.createdAt,
        avatar: '/api/placeholder/64/64',
        stats: {
          totalProcesses: parseInt(stats.total_processes) || 0,
          completedProcesses: parseInt(stats.completed_processes) || 0,
          todayProcesses: parseInt(stats.today_processes) || 0,
          weekProcesses: parseInt(stats.week_processes) || 0,
          totalShares: parseInt(shareStats.total_shares) || 0,
          totalViews: parseInt(shareStats.total_views) || 0,
          totalLikes: parseInt(shareStats.total_likes) || 0
        }
      }
      
      reply.send({
        success: true,
        data: userProfile
      })
      
    } catch (error) {
      logger.error('Failed to get user profile', error as Error, {
        userId: request.user?.id
      }, LogCategory.USER)
      
      reply.code(500).send({
        success: false,
        error: {
          message: '获取用户资料失败',
          code: 'USER_PROFILE_FAILED'
        }
      })
    }
  })
  
  /**
   * 更新用户个人资料
   * PUT /api/user/profile
   */
  fastify.put('/user/profile', {
    preHandler: [optionalAuth], // 暂时设为可选，实际部署时改为required
    schema: {
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          email: { type: 'string', format: 'email' }
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
                id: { type: 'string' },
                name: { type: 'string' },
                email: { type: 'string' },
                updatedAt: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // TODO: 从认证中间件获取用户ID
      const userId = request.user?.id || '1' // 临时硬编码
      const { name, email } = request.body as { name?: string; email?: string }
      
      logger.info('Updating user profile', undefined, {
        userId,
        metadata: {
          updates: { name: !!name, email: !!email }
        }
      }, LogCategory.USER)
      
      // 构建更新查询
      const updateFields: string[] = []
      const values: any[] = []
      let paramIndex = 1
      
      if (name) {
        updateFields.push(`name = $${paramIndex++}`)
        values.push(name)
      }
      
      if (email) {
        updateFields.push(`email = $${paramIndex++}`)
        values.push(email)
      }
      
      if (updateFields.length === 0) {
        return reply.code(400).send({
          success: false,
          error: {
            message: '没有提供要更新的字段',
            code: 'NO_UPDATE_FIELDS'
          }
        })
      }
      
      values.push(userId)
      
      const updateQuery = `
        UPDATE users 
        SET ${updateFields.join(', ')}, "updatedAt" = CURRENT_TIMESTAMP
        WHERE id = $${paramIndex} AND is_active = true
        RETURNING id, name, email, "updatedAt"
      `
      
      const result = await pool.query(updateQuery, values)
      
      if (result.rows.length === 0) {
        return reply.code(404).send({
          success: false,
          error: {
            message: '用户不存在',
            code: 'USER_NOT_FOUND'
          }
        })
      }
      
      const updatedProfile = result.rows[0]
      
      reply.send({
        success: true,
        data: updatedProfile
      })
      
    } catch (error) {
      logger.error('Failed to update user profile', error as Error, {
        userId: request.user?.id
      }, LogCategory.USER)
      
      reply.code(500).send({
        success: false,
        error: {
          message: '更新用户资料失败',
          code: 'USER_PROFILE_UPDATE_FAILED'
        }
      })
    }
  })
  
  /**
   * 获取用户活动日志
   * GET /api/user/activity
   */
  fastify.get('/user/activity', {
    preHandler: [optionalAuth, validators.pagination], // 暂时设为可选，实际部署时改为required
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', minimum: 1, default: 1 },
          limit: { type: 'number', minimum: 1, maximum: 50, default: 20 },
          type: { 
            type: 'string', 
            enum: ['share_created', 'share_updated', 'share_deleted', 'share_viewed'],
            description: 'Activity type filter' 
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
                activities: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      type: { type: 'string' },
                      description: { type: 'string' },
                      metadata: { type: 'object' },
                      createdAt: { type: 'string' }
                    }
                  }
                },
                pagination: {
                  type: 'object',
                  properties: {
                    page: { type: 'number' },
                    limit: { type: 'number' },
                    total: { type: 'number' },
                    totalPages: { type: 'number' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // TODO: 从认证中间件获取用户ID
      const userId = request.user?.id || '1' // 临时硬编码
      const { page = 1, limit = 20, type } = request.query as { page?: number; limit?: number; type?: string }
      
      logger.info('Fetching user activity', undefined, {
        userId,
        metadata: {
          page,
          limit,
          type
        }
      }, LogCategory.USER)
      
      // TODO: 实际的数据库查询操作
      // 这里返回模拟的活动数据
      const mockActivities = [
        {
          id: '1',
          type: 'share_created',
          description: '创建了新的分享',
          metadata: { shareTitle: '深度学习基础教程' },
          createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString() // 30分钟前
        },
        {
          id: '2',
          type: 'share_viewed',
          description: '分享被浏览',
          metadata: { shareTitle: 'Python数据分析入门', viewCount: 15 },
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() // 2小时前
        },
        {
          id: '3',
          type: 'share_updated',
          description: '更新了分享设置',
          metadata: { shareTitle: 'React开发实战', changes: ['visibility'] },
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() // 1天前
        }
      ]
      
      // 根据类型过滤
      const filteredActivities = type 
        ? mockActivities.filter(activity => activity.type === type)
        : mockActivities
      
      // 分页
      const startIndex = (page - 1) * limit
      const endIndex = startIndex + limit
      const paginatedActivities = filteredActivities.slice(startIndex, endIndex)
      
      reply.send({
        success: true,
        data: {
          activities: paginatedActivities,
          pagination: {
            page,
            limit,
            total: filteredActivities.length,
            totalPages: Math.ceil(filteredActivities.length / limit)
          }
        }
      })
      
    } catch (error) {
      logger.error('Failed to get user activity', error as Error, {
        userId: request.user?.id
      }, LogCategory.USER)
      
      reply.code(500).send({
        success: false,
        error: {
          message: '获取用户活动记录失败',
          code: 'USER_ACTIVITY_FAILED'
        }
      })
    }
  })
  
  /**
   * 获取用户使用统计摘要
   * GET /api/user/stats/summary
   */
  fastify.get('/user/stats/summary', {
    preHandler: [optionalAuth], // 暂时设为可选，实际部署时改为required
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                videosProcessed: { type: 'number' },
                totalProcessingTime: { type: 'number' },
                averageProcessingTime: { type: 'number' },
                mostPopularTags: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      tag: { type: 'string' },
                      count: { type: 'number' }
                    }
                  }
                },
                languageDistribution: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      language: { type: 'string' },
                      count: { type: 'number' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // TODO: 从认证中间件获取用户ID
      const userId = request.user?.id || '1' // 临时硬编码
      
      logger.info('Fetching user stats summary', undefined, {
        userId
      }, LogCategory.USER)
      
      // 获取视频处理统计
      const videoStatsQuery = `
        SELECT 
          COUNT(*) as videos_processed,
          SUM(processing_time) as total_processing_time,
          AVG(processing_time) as average_processing_time
        FROM video_processes 
        WHERE user_id = $1 AND status = 'completed'
      `
      
      const videoStats = await pool.query(videoStatsQuery, [userId])
      const vStats = videoStats.rows[0]
      
      // 获取热门标签
      const tagsQuery = `
        SELECT 
          unnest(tags) as tag, 
          COUNT(*) as count
        FROM shared_content 
        WHERE user_id = $1 AND tags IS NOT NULL
        GROUP BY unnest(tags)
        ORDER BY count DESC
        LIMIT 5
      `
      
      const tagsResult = await pool.query(tagsQuery, [userId])
      
      // 获取语言分布
      const languageQuery = `
        SELECT 
          video_language as language,
          COUNT(*) as count
        FROM video_processes 
        WHERE user_id = $1 AND video_language IS NOT NULL
        GROUP BY video_language
        ORDER BY count DESC
      `
      
      const languageResult = await pool.query(languageQuery, [userId])
      
      const statsSummary = {
        videosProcessed: parseInt(vStats.videos_processed) || 0,
        totalProcessingTime: parseInt(vStats.total_processing_time) || 0,
        averageProcessingTime: Math.round(parseFloat(vStats.average_processing_time)) || 0,
        mostPopularTags: tagsResult.rows.map((row: any) => ({
          tag: row.tag,
          count: parseInt(row.count)
        })),
        languageDistribution: languageResult.rows.map((row: any) => ({
          language: row.language || '未知',
          count: parseInt(row.count)
        }))
      }
      
      reply.send({
        success: true,
        data: statsSummary
      })
      
    } catch (error) {
      logger.error('Failed to get user stats summary', error as Error, {
        userId: request.user?.id
      }, LogCategory.USER)
      
      reply.code(500).send({
        success: false,
        error: {
          message: '获取用户统计摘要失败',
          code: 'USER_STATS_SUMMARY_FAILED'
        }
      })
    }
  })

  /**
   * 获取用户的视频处理任务列表
   * GET /api/user/tasks
   */
  fastify.get('/user/tasks', {
    preHandler: [optionalAuth], // 暂时设为可选，实际部署时改为required
    schema: {
      querystring: {
        type: 'object',
        properties: {
          status: { 
            type: 'string', 
            enum: ['all', 'pending', 'processing', 'completed', 'failed'],
            default: 'all'
          },
          limit: { type: 'number', minimum: 1, maximum: 50, default: 20 },
          offset: { type: 'number', minimum: 0, default: 0 }
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
                tasks: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      youtubeUrl: { type: 'string' },
                      videoTitle: { type: 'string' },
                      status: { type: 'string' },
                      progress: { type: 'number' },
                      currentStep: { type: 'string' },
                      createdAt: { type: 'string' },
                      updatedAt: { type: 'string' }
                    }
                  }
                },
                pagination: {
                  type: 'object',
                  properties: {
                    limit: { type: 'number' },
                    offset: { type: 'number' },
                    total: { type: 'number' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = request.user?.id || '1' // 临时硬编码
      const { status = 'all', limit = 20, offset = 0 } = request.query as any
      
      logger.info('Fetching user processing tasks', undefined, {
        userId,
        metadata: { status, limit, offset }
      }, LogCategory.USER)
      
      // 构建查询条件
      let statusFilter = ''
      const params: any[] = [userId, limit, offset]
      
      if (status !== 'all') {
        statusFilter = 'AND status = $4'
        params.push(status)
      }
      
      // 查询用户的处理任务
      const tasksQuery = `
        SELECT 
          id, 
          youtube_url as "youtubeUrl",
          video_title as "videoTitle",
          channel_name as "channelName",
          status, 
          progress, 
          current_step as "currentStep",
          error_message as "errorMessage",
          processing_time as "processingTime",
          "createdAt", 
          "updatedAt"
        FROM video_processes 
        WHERE user_id = $1 ${statusFilter}
        ORDER BY "createdAt" DESC 
        LIMIT $2 OFFSET $3
      `
      
      const tasksResult = await pool.query(tasksQuery, params)
      
      // 获取总数
      const countQuery = `
        SELECT COUNT(*) as total
        FROM video_processes 
        WHERE user_id = $1 ${statusFilter}
      `
      const countParams = statusFilter ? [userId, status] : [userId]
      const countResult = await pool.query(countQuery, countParams)
      const total = parseInt(countResult.rows[0].total)
      
      reply.send({
        success: true,
        data: {
          tasks: tasksResult.rows,
          pagination: {
            limit,
            offset,
            total
          }
        }
      })
      
    } catch (error) {
      logger.error('Failed to get user tasks', error as Error, {
        userId: request.user?.id
      }, LogCategory.USER)
      
      reply.code(500).send({
        success: false,
        error: {
          message: '获取用户任务列表失败',
          code: 'USER_TASKS_FAILED'
        }
      })
    }
  })
}