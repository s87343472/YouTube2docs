import { pool } from '../utils/database'
import { logger } from '../utils/logger'
import crypto from 'crypto'

/**
 * 防滥用服务
 * 负责检测和防止系统滥用行为
 */

export interface OperationLimit {
  operationType: string
  maxOperations: number
  timeWindowHours: number
}

export interface BlacklistEntry {
  id: number
  type: 'ip' | 'user' | 'email'
  value: string
  reason?: string
  expiresAt?: Date
  isActive: boolean
  createdAt: Date
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: Date
  reason?: string
}

export class AbusePreventionService {
  
  // 操作限制配置
  private static readonly OPERATION_LIMITS: Record<string, OperationLimit> = {
    'plan_change': {
      operationType: 'plan_change',
      maxOperations: 3,
      timeWindowHours: 24
    },
    'video_process': {
      operationType: 'video_process',
      maxOperations: 100, // 免费用户另有配额限制
      timeWindowHours: 24
    },
    'share_create': {
      operationType: 'share_create',
      maxOperations: 50,
      timeWindowHours: 24
    },
    'export_content': {
      operationType: 'export_content',
      maxOperations: 20,
      timeWindowHours: 24
    }
  }

  // IP级别的限制（更严格）
  private static readonly IP_LIMITS: Record<string, { maxOps: number, windowMinutes: number }> = {
    'video_process': { maxOps: 10, windowMinutes: 60 },
    'plan_change': { maxOps: 5, windowMinutes: 60 },
    'login_attempt': { maxOps: 10, windowMinutes: 15 }
  }

  /**
   * 检查用户操作限制
   */
  static async checkUserOperationLimit(
    userId: number,
    operationType: string
  ): Promise<RateLimitResult> {
    try {
      const limit = this.OPERATION_LIMITS[operationType]
      if (!limit) {
        return { allowed: true, remaining: 999, resetTime: new Date() }
      }

      const now = new Date()
      const windowStart = new Date(now.getTime() - limit.timeWindowHours * 60 * 60 * 1000)

      // 获取或创建用户操作记录
      let result = await pool.query(`
        SELECT operation_count, last_reset_at
        FROM user_operation_limits
        WHERE user_id = $1 AND operation_type = $2
      `, [userId, operationType])

      let operationCount = 0
      let lastResetAt = now

      if (result.rows.length === 0) {
        // 创建新记录
        await pool.query(`
          INSERT INTO user_operation_limits (user_id, operation_type, operation_count, last_reset_at)
          VALUES ($1, $2, 0, $3)
        `, [userId, operationType, now])
      } else {
        operationCount = result.rows[0].operation_count
        lastResetAt = result.rows[0].last_reset_at

        // 检查是否需要重置计数器
        if (lastResetAt < windowStart) {
          operationCount = 0
          lastResetAt = now
          await pool.query(`
            UPDATE user_operation_limits 
            SET operation_count = 0, last_reset_at = $1, updated_at = $1
            WHERE user_id = $2 AND operation_type = $3
          `, [now, userId, operationType])
        }
      }

      const remaining = Math.max(0, limit.maxOperations - operationCount)
      const resetTime = new Date(lastResetAt.getTime() + limit.timeWindowHours * 60 * 60 * 1000)

      if (operationCount >= limit.maxOperations) {
        return {
          allowed: false,
          remaining: 0,
          resetTime,
          reason: `操作过于频繁，24小时内最多允许${limit.maxOperations}次${this.getOperationTypeName(operationType)}`
        }
      }

      return {
        allowed: true,
        remaining,
        resetTime
      }
    } catch (error) {
      logger.error('Failed to check user operation limit', { userId, operationType, error })
      // 检查失败时默认允许操作，避免影响正常用户
      return { allowed: true, remaining: 0, resetTime: new Date() }
    }
  }

  /**
   * 记录用户操作
   */
  static async recordUserOperation(
    userId: number,
    operationType: string
  ): Promise<void> {
    try {
      await pool.query(`
        INSERT INTO user_operation_limits (user_id, operation_type, operation_count, last_reset_at)
        VALUES ($1, $2, 1, NOW())
        ON CONFLICT (user_id, operation_type)
        DO UPDATE SET 
          operation_count = user_operation_limits.operation_count + 1,
          updated_at = NOW()
      `, [userId, operationType])

      logger.debug('User operation recorded', { userId, operationType })
    } catch (error) {
      logger.error('Failed to record user operation', { userId, operationType, error })
    }
  }

  /**
   * 检查IP级别的限制
   */
  static async checkIPLimit(
    ipAddress: string,
    operationType: string
  ): Promise<RateLimitResult> {
    try {
      const limit = this.IP_LIMITS[operationType]
      if (!limit) {
        return { allowed: true, remaining: 999, resetTime: new Date() }
      }

      const now = new Date()
      const windowStart = new Date(now.getTime() - limit.windowMinutes * 60 * 1000)

      // 查询IP在时间窗口内的操作次数
      const result = await pool.query(`
        SELECT COUNT(*) as operation_count
        FROM ip_operation_logs
        WHERE ip_address = $1 
        AND operation_type = $2 
        AND created_at > $3
      `, [ipAddress, operationType, windowStart])

      const operationCount = parseInt(result.rows[0].operation_count)
      const remaining = Math.max(0, limit.maxOps - operationCount)
      const resetTime = new Date(now.getTime() + limit.windowMinutes * 60 * 1000)

      if (operationCount >= limit.maxOps) {
        return {
          allowed: false,
          remaining: 0,
          resetTime,
          reason: `IP操作过于频繁，${limit.windowMinutes}分钟内最多允许${limit.maxOps}次操作`
        }
      }

      return {
        allowed: true,
        remaining,
        resetTime
      }
    } catch (error) {
      logger.error('Failed to check IP limit', { ipAddress, operationType, error })
      return { allowed: true, remaining: 0, resetTime: new Date() }
    }
  }

  /**
   * 记录IP操作
   */
  static async recordIPOperation(
    ipAddress: string,
    operationType: string,
    options: {
      userId?: number
      requestPath?: string
      userAgent?: string
      success?: boolean
      operationData?: any
    } = {}
  ): Promise<void> {
    try {
      await pool.query(`
        INSERT INTO ip_operation_logs (
          ip_address, operation_type, user_id, request_path, 
          user_agent, success, operation_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        ipAddress,
        operationType,
        options.userId || null,
        options.requestPath,
        options.userAgent,
        options.success !== false, // 默认为true
        options.operationData ? JSON.stringify(options.operationData) : null
      ])

      logger.debug('IP operation recorded', { ipAddress, operationType, ...options })
    } catch (error) {
      logger.error('Failed to record IP operation', { ipAddress, operationType, error })
    }
  }

  /**
   * 检查视频处理冷却期
   */
  static async checkVideoProcessingCooldown(
    userId: number,
    youtubeUrl: string,
    cooldownMinutes: number = 60
  ): Promise<RateLimitResult> {
    try {
      // 生成URL哈希
      const urlHash = crypto.createHash('sha256').update(youtubeUrl).digest('hex')
      const now = new Date()
      const cooldownEnd = new Date(now.getTime() - cooldownMinutes * 60 * 1000)

      const result = await pool.query(`
        SELECT last_processed_at, process_count
        FROM video_processing_cooldown
        WHERE user_id = $1 AND url_hash = $2
      `, [userId, urlHash])

      if (result.rows.length === 0) {
        return { allowed: true, remaining: 999, resetTime: new Date() }
      }

      const lastProcessedAt = result.rows[0].last_processed_at
      const processCount = result.rows[0].process_count

      if (lastProcessedAt > cooldownEnd) {
        const resetTime = new Date(lastProcessedAt.getTime() + cooldownMinutes * 60 * 1000)
        return {
          allowed: false,
          remaining: 0,
          resetTime,
          reason: `请等待${cooldownMinutes}分钟后再次处理相同视频（已处理${processCount}次）`
        }
      }

      return { allowed: true, remaining: 999, resetTime: new Date() }
    } catch (error) {
      logger.error('Failed to check video processing cooldown', { userId, youtubeUrl, error })
      return { allowed: true, remaining: 0, resetTime: new Date() }
    }
  }

  /**
   * 记录视频处理
   */
  static async recordVideoProcessing(
    userId: number,
    youtubeUrl: string
  ): Promise<void> {
    try {
      const urlHash = crypto.createHash('sha256').update(youtubeUrl).digest('hex')

      await pool.query(`
        INSERT INTO video_processing_cooldown (user_id, youtube_url, url_hash, last_processed_at, process_count)
        VALUES ($1, $2, $3, NOW(), 1)
        ON CONFLICT (user_id, url_hash)
        DO UPDATE SET 
          last_processed_at = NOW(),
          process_count = video_processing_cooldown.process_count + 1
      `, [userId, youtubeUrl, urlHash])

      logger.debug('Video processing recorded', { userId, youtubeUrl })
    } catch (error) {
      logger.error('Failed to record video processing', { userId, youtubeUrl, error })
    }
  }

  /**
   * 检查黑名单
   */
  static async checkBlacklist(
    type: 'ip' | 'user' | 'email',
    value: string
  ): Promise<{ blocked: boolean, reason?: string }> {
    try {
      const now = new Date()
      
      const result = await pool.query(`
        SELECT reason, expires_at
        FROM blacklist
        WHERE type = $1 AND value = $2 AND is_active = true
        AND (expires_at IS NULL OR expires_at > $3)
      `, [type, value, now])

      if (result.rows.length > 0) {
        const entry = result.rows[0]
        return {
          blocked: true,
          reason: entry.reason || '账户已被封禁'
        }
      }

      return { blocked: false }
    } catch (error) {
      logger.error('Failed to check blacklist', { type, value, error })
      return { blocked: false }
    }
  }

  /**
   * 添加到黑名单
   */
  static async addToBlacklist(
    type: 'ip' | 'user' | 'email',
    value: string,
    reason: string,
    expiresAt?: Date,
    createdBy?: number
  ): Promise<void> {
    try {
      await pool.query(`
        INSERT INTO blacklist (type, value, reason, expires_at, created_by)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (type, value, is_active) WHERE is_active = true
        DO UPDATE SET 
          reason = $3,
          expires_at = $4,
          updated_at = NOW()
      `, [type, value, reason, expiresAt, createdBy])

      logger.warn('Added to blacklist', { type, value, reason, expiresAt })
    } catch (error) {
      logger.error('Failed to add to blacklist', { type, value, reason, error })
      throw new Error('添加黑名单失败')
    }
  }

  /**
   * 从黑名单移除
   */
  static async removeFromBlacklist(
    type: 'ip' | 'user' | 'email',
    value: string
  ): Promise<void> {
    try {
      await pool.query(`
        UPDATE blacklist 
        SET is_active = false, updated_at = NOW()
        WHERE type = $1 AND value = $2 AND is_active = true
      `, [type, value])

      logger.info('Removed from blacklist', { type, value })
    } catch (error) {
      logger.error('Failed to remove from blacklist', { type, value, error })
      throw new Error('移除黑名单失败')
    }
  }

  /**
   * 检查套餐变更频率
   */
  static async checkPlanChangeFrequency(
    userId: number,
    changeType: 'upgrade' | 'downgrade' | 'cancel'
  ): Promise<RateLimitResult> {
    try {
      const now = new Date()
      
      // 检查降级后的7天冷却期
      if (changeType === 'downgrade') {
        const result = await pool.query(`
          SELECT created_at
          FROM plan_change_history
          WHERE user_id = $1 AND change_type = 'downgrade'
          AND created_at > $2
          ORDER BY created_at DESC
          LIMIT 1
        `, [userId, new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)])

        if (result.rows.length > 0) {
          const lastDowngrade = result.rows[0].created_at
          const resetTime = new Date(lastDowngrade.getTime() + 7 * 24 * 60 * 60 * 1000)
          return {
            allowed: false,
            remaining: 0,
            resetTime,
            reason: '降级后7天内不允许再次降级'
          }
        }
      }

      // 检查24小时内的总变更次数
      const userLimit = await this.checkUserOperationLimit(userId, 'plan_change')
      
      return userLimit
    } catch (error) {
      logger.error('Failed to check plan change frequency', { userId, changeType, error })
      return { allowed: true, remaining: 0, resetTime: new Date() }
    }
  }

  /**
   * 记录套餐变更
   */
  static async recordPlanChange(
    userId: number,
    fromPlan: string,
    toPlan: string,
    changeType: 'upgrade' | 'downgrade' | 'cancel',
    reason: string = 'user_request',
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await pool.query(`
        INSERT INTO plan_change_history (
          user_id, from_plan, to_plan, change_type, reason, ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [userId, fromPlan, toPlan, changeType, reason, ipAddress, userAgent])

      // 同时记录用户操作限制
      await this.recordUserOperation(userId, 'plan_change')

      logger.info('Plan change recorded', {
        userId, fromPlan, toPlan, changeType, reason
      })
    } catch (error) {
      logger.error('Failed to record plan change', {
        userId, fromPlan, toPlan, changeType, error
      })
    }
  }

  /**
   * 检测异常行为模式
   */
  static async detectAnomalousPattern(
    ipAddress: string,
    timeWindowMinutes: number = 60
  ): Promise<{
    suspicious: boolean
    patterns: string[]
    severity: 'low' | 'medium' | 'high'
  }> {
    try {
      const now = new Date()
      const windowStart = new Date(now.getTime() - timeWindowMinutes * 60 * 1000)
      
      // 查询IP在时间窗口内的所有操作
      const result = await pool.query(`
        SELECT operation_type, success, COUNT(*) as count
        FROM ip_operation_logs
        WHERE ip_address = $1 AND created_at > $2
        GROUP BY operation_type, success
        ORDER BY count DESC
      `, [ipAddress, windowStart])

      const patterns: string[] = []
      let totalOps = 0
      let failedOps = 0

      for (const row of result.rows) {
        const count = parseInt(row.count)
        totalOps += count
        
        if (!row.success) {
          failedOps += count
        }

        // 检测高频操作
        if (count > 50) {
          patterns.push(`高频${row.operation_type}操作(${count}次)`)
        }
      }

      // 检测失败率
      const failureRate = totalOps > 0 ? failedOps / totalOps : 0
      if (failureRate > 0.5 && totalOps > 10) {
        patterns.push(`高失败率(${Math.round(failureRate * 100)}%)`)
      }

      // 检测总操作数
      if (totalOps > 100) {
        patterns.push(`异常高频操作(${totalOps}次/${timeWindowMinutes}分钟)`)
      }

      // 判断严重程度
      let severity: 'low' | 'medium' | 'high' = 'low'
      if (patterns.length > 2 || totalOps > 200) {
        severity = 'high'
      } else if (patterns.length > 0 || totalOps > 50) {
        severity = 'medium'
      }

      return {
        suspicious: patterns.length > 0,
        patterns,
        severity
      }
    } catch (error) {
      logger.error('Failed to detect anomalous pattern', { ipAddress, error })
      return {
        suspicious: false,
        patterns: [],
        severity: 'low'
      }
    }
  }

  /**
   * 获取操作类型的中文名称
   */
  private static getOperationTypeName(operationType: string): string {
    const names: Record<string, string> = {
      'plan_change': '套餐变更',
      'video_process': '视频处理',
      'share_create': '创建分享',
      'export_content': '导出内容'
    }
    return names[operationType] || operationType
  }

  /**
   * 清理过期数据（定时任务调用）
   */
  static async cleanupExpiredData(): Promise<{
    cleanedLimits: number
    cleanedLogs: number
    cleanedBlacklist: number
  }> {
    try {
      const now = new Date()
      
      // 清理7天前的操作限制记录
      const limitsResult = await pool.query(`
        DELETE FROM user_operation_limits
        WHERE last_reset_at < $1
      `, [new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)])

      // 清理30天前的IP操作日志
      const logsResult = await pool.query(`
        DELETE FROM ip_operation_logs
        WHERE created_at < $1
      `, [new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)])

      // 清理过期的黑名单记录
      const blacklistResult = await pool.query(`
        UPDATE blacklist 
        SET is_active = false, updated_at = NOW()
        WHERE is_active = true 
        AND expires_at IS NOT NULL 
        AND expires_at <= $1
      `, [now])

      const result = {
        cleanedLimits: limitsResult.rowCount || 0,
        cleanedLogs: logsResult.rowCount || 0,
        cleanedBlacklist: blacklistResult.rowCount || 0
      }

      logger.info('Abuse prevention data cleaned up', result)
      return result
    } catch (error) {
      logger.error('Failed to cleanup abuse prevention data', { error })
      throw new Error('清理防滥用数据失败')
    }
  }
}