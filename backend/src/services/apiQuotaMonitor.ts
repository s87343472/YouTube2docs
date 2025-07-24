import { pool } from '../utils/database'
import { logger } from '../utils/logger'

/**
 * API配额监控服务
 * 监控Groq API的使用情况并提供预警
 */
export class ApiQuotaMonitor {
  private static readonly GROQ_HOURLY_LIMIT = 7200 // 每小时7200秒音频
  private static readonly WARNING_THRESHOLD = 0.8 // 80%使用量时警告
  private static readonly CRITICAL_THRESHOLD = 0.95 // 95%使用量时紧急警告

  /**
   * 记录API使用情况
   */
  static async recordApiUsage(
    provider: 'groq' | 'gemini' | 'together',
    operation: string,
    audioSeconds?: number,
    tokens?: number,
    cost?: number
  ): Promise<void> {
    try {
      await pool.query(`
        INSERT INTO api_usage_logs (
          provider, operation, audio_seconds, tokens, cost, created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
      `, [provider, operation, audioSeconds || 0, tokens || 0, cost || 0])

      // 检查是否需要发出警告
      if (provider === 'groq' && audioSeconds) {
        await this.checkGroqQuotaWarning(audioSeconds)
      }

    } catch (error) {
      logger.error('Failed to record API usage', { provider, operation, error })
    }
  }

  /**
   * 检查Groq配额警告
   */
  private static async checkGroqQuotaWarning(audioSeconds: number): Promise<void> {
    try {
      const now = new Date()
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000)

      // 查询过去一小时的总使用量
      const result = await pool.query(`
        SELECT COALESCE(SUM(audio_seconds), 0) as total_seconds
        FROM api_usage_logs
        WHERE provider = 'groq' 
        AND created_at > $1
      `, [hourAgo])

      const totalSeconds = parseInt(result.rows[0].total_seconds, 10)
      const usagePercentage = totalSeconds / this.GROQ_HOURLY_LIMIT

      console.log(`📊 Groq API Usage: ${totalSeconds}/${this.GROQ_HOURLY_LIMIT}s (${Math.round(usagePercentage * 100)}%)`)

      // 发出相应级别的警告
      if (usagePercentage >= this.CRITICAL_THRESHOLD) {
        logger.warn('🚨 Groq API Critical Usage Warning', {
          totalSeconds,
          limit: this.GROQ_HOURLY_LIMIT,
          percentage: Math.round(usagePercentage * 100),
          remainingSeconds: this.GROQ_HOURLY_LIMIT - totalSeconds
        })
        
        // 这里可以添加通知机制，比如发送邮件或Slack消息
        await this.sendCriticalUsageAlert(totalSeconds, this.GROQ_HOURLY_LIMIT)
        
      } else if (usagePercentage >= this.WARNING_THRESHOLD) {
        logger.warn('⚠️ Groq API High Usage Warning', {
          totalSeconds,
          limit: this.GROQ_HOURLY_LIMIT,
          percentage: Math.round(usagePercentage * 100),
          remainingSeconds: this.GROQ_HOURLY_LIMIT - totalSeconds
        })
      }

    } catch (error) {
      logger.error('Failed to check Groq quota warning', { error })
    }
  }

  /**
   * 发送紧急使用量警报
   */
  private static async sendCriticalUsageAlert(used: number, limit: number): Promise<void> {
    // 这里可以集成邮件、Slack、微信等通知方式
    console.log(`🚨 CRITICAL: Groq API usage at ${Math.round(used/limit*100)}%! Remaining: ${limit - used}s`)
    
    // TODO: 集成实际的通知系统
    // await EmailService.sendAlert(...)
    // await SlackService.sendAlert(...)
  }

  /**
   * 获取当前小时的API使用情况
   */
  static async getCurrentHourUsage(): Promise<{
    groq: { audioSeconds: number; percentage: number; remaining: number }
    gemini: { tokens: number; requests: number }
  }> {
    try {
      const now = new Date()
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000)

      // 查询Groq使用情况
      const groqResult = await pool.query(`
        SELECT COALESCE(SUM(audio_seconds), 0) as total_seconds
        FROM api_usage_logs
        WHERE provider = 'groq' 
        AND created_at > $1
      `, [hourAgo])

      // 查询Gemini使用情况
      const geminiResult = await pool.query(`
        SELECT 
          COALESCE(SUM(tokens), 0) as total_tokens,
          COUNT(*) as total_requests
        FROM api_usage_logs
        WHERE provider = 'gemini' 
        AND created_at > $1
      `, [hourAgo])

      const groqSeconds = parseInt(groqResult.rows[0].total_seconds, 10)
      const groqPercentage = groqSeconds / this.GROQ_HOURLY_LIMIT
      const groqRemaining = Math.max(0, this.GROQ_HOURLY_LIMIT - groqSeconds)

      return {
        groq: {
          audioSeconds: groqSeconds,
          percentage: groqPercentage,
          remaining: groqRemaining
        },
        gemini: {
          tokens: parseInt(geminiResult.rows[0].total_tokens, 10),
          requests: parseInt(geminiResult.rows[0].total_requests, 10)
        }
      }

    } catch (error) {
      logger.error('Failed to get current hour usage', { error })
      return {
        groq: { audioSeconds: 0, percentage: 0, remaining: this.GROQ_HOURLY_LIMIT },
        gemini: { tokens: 0, requests: 0 }
      }
    }
  }

  /**
   * 预估音频处理是否会超出配额
   */
  static async canProcessAudio(estimatedDurationSeconds: number): Promise<{
    canProcess: boolean
    reason?: string
    currentUsage: number
    limit: number
    estimatedTotalAfter: number
  }> {
    try {
      const usage = await this.getCurrentHourUsage()
      const estimatedTotalAfter = usage.groq.audioSeconds + estimatedDurationSeconds

      const canProcess = estimatedTotalAfter <= this.GROQ_HOURLY_LIMIT

      return {
        canProcess,
        reason: canProcess ? undefined : `预计处理后将超出API限额。当前已用${usage.groq.audioSeconds}秒，限额${this.GROQ_HOURLY_LIMIT}秒`,
        currentUsage: usage.groq.audioSeconds,
        limit: this.GROQ_HOURLY_LIMIT,
        estimatedTotalAfter
      }

    } catch (error) {
      logger.error('Failed to check if can process audio', { error })
      // 检查失败时保守处理，允许继续
      return {
        canProcess: true,
        currentUsage: 0,
        limit: this.GROQ_HOURLY_LIMIT,
        estimatedTotalAfter: estimatedDurationSeconds
      }
    }
  }

  /**
   * 获取API使用统计（用于监控面板）
   */
  static async getUsageStatistics(days: number = 7): Promise<any> {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const result = await pool.query(`
        SELECT 
          DATE(created_at) as date,
          provider,
          SUM(audio_seconds) as total_audio_seconds,
          SUM(tokens) as total_tokens,
          COUNT(*) as total_requests,
          SUM(cost) as total_cost
        FROM api_usage_logs
        WHERE created_at >= $1
        GROUP BY DATE(created_at), provider
        ORDER BY date DESC, provider
      `, [startDate])

      return result.rows

    } catch (error) {
      logger.error('Failed to get usage statistics', { error })
      return []
    }
  }

  /**
   * 清理旧的使用记录（定期任务）
   */
  static async cleanupOldUsageRecords(daysToKeep: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

      const result = await pool.query(`
        DELETE FROM api_usage_logs
        WHERE created_at < $1
      `, [cutoffDate])

      const deletedCount = result.rowCount || 0
      logger.info('Cleaned up old API usage records', { deletedCount, daysToKeep })

      return deletedCount

    } catch (error) {
      logger.error('Failed to cleanup old usage records', { error })
      throw error
    }
  }
}