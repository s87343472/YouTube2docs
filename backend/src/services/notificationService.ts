import { pool } from '../utils/database'
import { logger } from '../utils/logger'
import nodemailer from 'nodemailer'
import { config } from '../config'

/**
 * 通知服务
 * 负责处理各种类型的通知发送
 */

export interface NotificationTemplate {
  id: number
  templateKey: string
  templateName: string
  subjectTemplate: string
  bodyTemplate: string
  variables: string[]
  isActive: boolean
}

export interface NotificationSettings {
  userId: number
  emailNotifications: boolean
  taskCompleted: boolean
  taskFailed: boolean
  quotaWarnings: boolean
  marketingEmails: boolean
}

export interface NotificationMessage {
  id?: number
  userId: number
  email: string
  templateKey: string
  subject: string
  body: string
  variables: Record<string, any>
  priority: number
  scheduledAt?: Date
  maxAttempts?: number
}

export interface SendResult {
  success: boolean
  messageId?: string
  error?: string
  duration: number
}

export class NotificationService {
  private static emailTransporter: nodemailer.Transporter | null = null

  /**
   * 初始化邮件传输器
   */
  private static async initEmailTransporter(): Promise<nodemailer.Transporter> {
    if (this.emailTransporter) {
      return this.emailTransporter
    }

    // 根据配置创建不同的传输器
    const emailConfig = config.email || {}
    
    if (emailConfig.provider === 'smtp') {
      this.emailTransporter = nodemailer.createTransport({
        host: emailConfig.host,
        port: emailConfig.port || 587,
        secure: emailConfig.secure || false,
        auth: {
          user: emailConfig.user,
          pass: emailConfig.password
        }
      })
    } else {
      // 开发环境使用测试账户
      const testAccount = await nodemailer.createTestAccount()
      this.emailTransporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      })
      
      logger.info('Using test email account', {
        user: testAccount.user,
        pass: testAccount.pass
      })
    }

    return this.emailTransporter
  }

  /**
   * 获取通知模板
   */
  static async getTemplate(templateKey: string): Promise<NotificationTemplate | null> {
    try {
      const result = await pool.query(`
        SELECT id, template_key, template_name, subject_template, body_template, variables, is_active
        FROM notification_templates
        WHERE template_key = $1 AND is_active = true
      `, [templateKey])

      if (result.rows.length === 0) {
        return null
      }

      const row = result.rows[0]
      return {
        id: row.id,
        templateKey: row.template_key,
        templateName: row.template_name,
        subjectTemplate: row.subject_template,
        bodyTemplate: row.body_template,
        variables: JSON.parse(row.variables || '[]'),
        isActive: row.is_active
      }
    } catch (error) {
      logger.error('Failed to get notification template', { templateKey, error })
      return null
    }
  }

  /**
   * 获取用户通知设置
   */
  static async getUserNotificationSettings(userId: number): Promise<NotificationSettings> {
    try {
      const result = await pool.query(`
        SELECT user_id, email_notifications, task_completed, task_failed, quota_warnings, marketing_emails
        FROM user_notification_settings
        WHERE user_id = $1
      `, [userId])

      if (result.rows.length === 0) {
        // 创建默认设置
        await pool.query(`
          INSERT INTO user_notification_settings (user_id, email_notifications, task_completed, task_failed, quota_warnings, marketing_emails)
          VALUES ($1, true, true, true, true, false)
        `, [userId])

        return {
          userId,
          emailNotifications: true,
          taskCompleted: true,
          taskFailed: true,
          quotaWarnings: true,
          marketingEmails: false
        }
      }

      const row = result.rows[0]
      return {
        userId: row.user_id,
        emailNotifications: row.email_notifications,
        taskCompleted: row.task_completed,
        taskFailed: row.task_failed,
        quotaWarnings: row.quota_warnings,
        marketingEmails: row.marketing_emails
      }
    } catch (error) {
      logger.error('Failed to get user notification settings', { userId, error })
      throw new Error('获取用户通知设置失败')
    }
  }

  /**
   * 更新用户通知设置
   */
  static async updateUserNotificationSettings(
    userId: number,
    settings: Partial<Omit<NotificationSettings, 'userId'>>
  ): Promise<void> {
    try {
      const updateFields = []
      const values: any[] = [userId]
      let paramIndex = 2

      for (const [field, value] of Object.entries(settings)) {
        if (value !== undefined) {
          const dbField = field.replace(/([A-Z])/g, '_$1').toLowerCase()
          updateFields.push(`${dbField} = $${paramIndex}`)
          values.push(value)
          paramIndex++
        }
      }

      if (updateFields.length === 0) {
        return
      }

      await pool.query(`
        UPDATE user_notification_settings 
        SET ${updateFields.join(', ')}, updated_at = NOW()
        WHERE user_id = $1
      `, values)

      logger.info('User notification settings updated', { userId, settings })
    } catch (error) {
      logger.error('Failed to update user notification settings', { userId, settings, error })
      throw new Error('更新用户通知设置失败')
    }
  }

  /**
   * 渲染模板
   */
  static renderTemplate(template: string, variables: Record<string, any>): string {
    let rendered = template

    // 简单的模板替换（{{variable}}格式）
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g')
      rendered = rendered.replace(regex, String(value || ''))
    }

    // 处理条件语句 {{#if condition}} ... {{/if}}
    rendered = rendered.replace(/{{#if\s+(\w+)}}(.*?){{\/if}}/gs, (match, condition, content) => {
      return variables[condition] ? content : ''
    })

    return rendered
  }

  /**
   * 发送任务完成通知
   */
  static async sendTaskCompletedNotification(
    userId: number,
    userEmail: string,
    variables: {
      videoTitle: string
      videoChannel: string
      processingTime: number
      completedAt: string
      resultUrl: string
    }
  ): Promise<void> {
    try {
      // 检查用户设置
      const settings = await this.getUserNotificationSettings(userId)
      if (!settings.emailNotifications || !settings.taskCompleted) {
        logger.debug('Task completed notification disabled for user', { userId })
        return
      }

      await this.queueNotification({
        userId,
        email: userEmail,
        templateKey: 'task_completed',
        variables,
        priority: 2 // 较高优先级
      })

      logger.info('Task completed notification queued', { userId, videoTitle: variables.videoTitle })
    } catch (error) {
      logger.error('Failed to send task completed notification', { userId, error })
    }
  }

  /**
   * 发送任务失败通知
   */
  static async sendTaskFailedNotification(
    userId: number,
    userEmail: string,
    variables: {
      videoTitle: string
      youtubeUrl: string
      failedAt: string
      errorMessage: string
      retryUrl: string
      supportUrl: string
    }
  ): Promise<void> {
    try {
      // 检查用户设置
      const settings = await this.getUserNotificationSettings(userId)
      if (!settings.emailNotifications || !settings.taskFailed) {
        logger.debug('Task failed notification disabled for user', { userId })
        return
      }

      await this.queueNotification({
        userId,
        email: userEmail,
        templateKey: 'task_failed',
        variables,
        priority: 1 // 最高优先级
      })

      logger.info('Task failed notification queued', { userId, videoTitle: variables.videoTitle })
    } catch (error) {
      logger.error('Failed to send task failed notification', { userId, error })
    }
  }

  /**
   * 发送配额预警通知
   */
  static async sendQuotaWarningNotification(
    userId: number,
    userEmail: string,
    variables: {
      quotaType: string
      quotaTypeName: string
      percentage: number
      usedAmount: number
      maxAmount: number
      periodStart: string
      periodEnd: string
      upgradeRequired?: boolean
      currentPlan?: string
      suggestedPlan?: string
      upgradeUrl?: string
    }
  ): Promise<void> {
    try {
      // 检查用户设置
      const settings = await this.getUserNotificationSettings(userId)
      if (!settings.emailNotifications || !settings.quotaWarnings) {
        logger.debug('Quota warning notification disabled for user', { userId })
        return
      }

      // 检查是否已经发送过相同的预警（24小时内）
      const recentNotification = await pool.query(`
        SELECT id FROM notification_queue
        WHERE user_id = $1 
        AND template_key = 'quota_warning'
        AND variables->>'quotaType' = $2
        AND variables->>'percentage' = $3
        AND created_at > NOW() - INTERVAL '24 hours'
        AND status IN ('pending', 'sent')
      `, [userId, variables.quotaType, variables.percentage.toString()])

      if (recentNotification.rows.length > 0) {
        logger.debug('Quota warning already sent recently', { 
          userId, 
          quotaType: variables.quotaType, 
          percentage: variables.percentage 
        })
        return
      }

      await this.queueNotification({
        userId,
        email: userEmail,
        templateKey: 'quota_warning',
        variables,
        priority: 3 // 中等优先级
      })

      logger.info('Quota warning notification queued', { 
        userId, 
        quotaType: variables.quotaType,
        percentage: variables.percentage 
      })
    } catch (error) {
      logger.error('Failed to send quota warning notification', { userId, error })
    }
  }

  /**
   * 将通知添加到队列
   */
  static async queueNotification(message: Omit<NotificationMessage, 'subject' | 'body'>): Promise<number> {
    try {
      // 获取模板
      const template = await this.getTemplate(message.templateKey)
      if (!template) {
        throw new Error(`Template not found: ${message.templateKey}`)
      }

      // 渲染主题和内容
      const subject = this.renderTemplate(template.subjectTemplate, message.variables)
      const body = this.renderTemplate(template.bodyTemplate, message.variables)

      // 插入队列
      const result = await pool.query(`
        INSERT INTO notification_queue (
          user_id, email, template_key, subject, body, variables, 
          priority, scheduled_at, max_attempts
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `, [
        message.userId,
        message.email,
        message.templateKey,
        subject,
        body,
        JSON.stringify(message.variables),
        message.priority || 5,
        message.scheduledAt || new Date(),
        message.maxAttempts || 3
      ])

      const notificationId = result.rows[0].id
      logger.debug('Notification queued', { 
        notificationId, 
        userId: message.userId, 
        templateKey: message.templateKey 
      })

      return notificationId
    } catch (error) {
      logger.error('Failed to queue notification', { message, error })
      throw new Error('通知队列添加失败')
    }
  }

  /**
   * 处理通知队列（定时任务调用）
   */
  static async processNotificationQueue(batchSize: number = 10): Promise<{
    processed: number
    succeeded: number
    failed: number
  }> {
    try {
      // 获取待发送的通知
      const result = await pool.query(`
        SELECT id, user_id, email, template_key, subject, body, variables, 
               attempts, max_attempts, priority
        FROM notification_queue
        WHERE status = 'pending' 
        AND scheduled_at <= NOW()
        AND attempts < max_attempts
        ORDER BY priority ASC, created_at ASC
        LIMIT $1
      `, [batchSize])

      if (result.rows.length === 0) {
        return { processed: 0, succeeded: 0, failed: 0 }
      }

      let succeeded = 0
      let failed = 0

      for (const notification of result.rows) {
        try {
          // 更新状态为发送中
          await pool.query(`
            UPDATE notification_queue 
            SET status = 'sending', attempts = attempts + 1, updated_at = NOW()
            WHERE id = $1
          `, [notification.id])

          // 发送邮件
          const sendResult = await this.sendEmail({
            to: notification.email,
            subject: notification.subject,
            html: notification.body
          })

          if (sendResult.success) {
            // 发送成功
            await pool.query(`
              UPDATE notification_queue 
              SET status = 'sent', sent_at = NOW(), updated_at = NOW()
              WHERE id = $1
            `, [notification.id])

            succeeded++
          } else {
            throw new Error(sendResult.error || 'Email sending failed')
          }

          // 记录发送日志
          await this.logNotificationSend(
            notification.id,
            notification.user_id,
            notification.email,
            notification.template_key,
            notification.attempts + 1,
            sendResult.success ? 'success' : 'failed',
            sendResult.messageId,
            sendResult.error,
            sendResult.duration
          )

        } catch (error) {
          failed++
          
          // 检查是否达到最大重试次数
          const isMaxAttempts = notification.attempts + 1 >= notification.max_attempts
          
          await pool.query(`
            UPDATE notification_queue 
            SET status = $1, error_message = $2, failed_at = NOW(), updated_at = NOW()
            WHERE id = $3
          `, [
            isMaxAttempts ? 'failed' : 'pending',
            error instanceof Error ? error.message : String(error),
            notification.id
          ])

          // 记录失败日志
          await this.logNotificationSend(
            notification.id,
            notification.user_id,
            notification.email,
            notification.template_key,
            notification.attempts + 1,
            'failed',
            undefined,
            error instanceof Error ? error.message : String(error),
            0
          )

          logger.error('Failed to send notification', { 
            notificationId: notification.id, 
            error 
          })
        }
      }

      logger.info('Notification queue processed', {
        processed: result.rows.length,
        succeeded,
        failed
      })

      return {
        processed: result.rows.length,
        succeeded,
        failed
      }
    } catch (error) {
      logger.error('Failed to process notification queue', { error })
      throw new Error('处理通知队列失败')
    }
  }

  /**
   * 发送邮件
   */
  private static async sendEmail(options: {
    to: string
    subject: string
    html: string
  }): Promise<SendResult> {
    const startTime = Date.now()
    
    try {
      const transporter = await this.initEmailTransporter()
      
      const info = await transporter.sendMail({
        from: config.email?.from || '"YouTube智学" <noreply@example.com>',
        to: options.to,
        subject: options.subject,
        html: options.html
      })

      const duration = Date.now() - startTime

      logger.info('Email sent successfully', {
        to: options.to,
        messageId: info.messageId,
        duration
      })

      return {
        success: true,
        messageId: info.messageId,
        duration
      }
    } catch (error) {
      const duration = Date.now() - startTime
      
      logger.error('Failed to send email', {
        to: options.to,
        error,
        duration
      })

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration
      }
    }
  }

  /**
   * 记录通知发送日志
   */
  private static async logNotificationSend(
    notificationId: number,
    userId: number,
    email: string,
    templateKey: string,
    sendAttempt: number,
    status: 'success' | 'failed',
    messageId?: string,
    errorMessage?: string,
    duration?: number
  ): Promise<void> {
    try {
      await pool.query(`
        INSERT INTO notification_logs (
          notification_id, user_id, email, template_key, send_attempt,
          status, message_id, response_message, send_duration_ms
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        notificationId,
        userId,
        email,
        templateKey,
        sendAttempt,
        status,
        messageId,
        errorMessage,
        duration
      ])
    } catch (error) {
      logger.error('Failed to log notification send', { 
        notificationId, 
        error 
      })
    }
  }

  /**
   * 获取通知统计信息
   */
  static async getNotificationStats(days: number = 7): Promise<{
    totalSent: number
    totalFailed: number
    successRate: number
    avgDuration: number
    byTemplate: Array<{
      templateKey: string
      sent: number
      failed: number
      successRate: number
    }>
  }> {
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

      // 总体统计
      const totalResult = await pool.query(`
        SELECT 
          COUNT(*) FILTER (WHERE status = 'success') as total_sent,
          COUNT(*) FILTER (WHERE status = 'failed') as total_failed,
          AVG(send_duration_ms) FILTER (WHERE status = 'success') as avg_duration
        FROM notification_logs
        WHERE created_at > $1
      `, [since])

      // 按模板统计
      const templateResult = await pool.query(`
        SELECT 
          template_key,
          COUNT(*) FILTER (WHERE status = 'success') as sent,
          COUNT(*) FILTER (WHERE status = 'failed') as failed
        FROM notification_logs
        WHERE created_at > $1
        GROUP BY template_key
        ORDER BY sent DESC
      `, [since])

      const stats = totalResult.rows[0]
      const totalSent = parseInt(stats.total_sent) || 0
      const totalFailed = parseInt(stats.total_failed) || 0
      const successRate = totalSent + totalFailed > 0 
        ? Math.round((totalSent / (totalSent + totalFailed)) * 100) 
        : 0

      const byTemplate = templateResult.rows.map(row => {
        const sent = parseInt(row.sent) || 0
        const failed = parseInt(row.failed) || 0
        const templateSuccessRate = sent + failed > 0 
          ? Math.round((sent / (sent + failed)) * 100) 
          : 0

        return {
          templateKey: row.template_key,
          sent,
          failed,
          successRate: templateSuccessRate
        }
      })

      return {
        totalSent,
        totalFailed,
        successRate,
        avgDuration: Math.round(parseFloat(stats.avg_duration) || 0),
        byTemplate
      }
    } catch (error) {
      logger.error('Failed to get notification stats', { error })
      throw new Error('获取通知统计失败')
    }
  }

  /**
   * 清理过期通知数据（定时任务调用）
   */
  static async cleanupOldNotifications(daysToKeep: number = 30): Promise<{
    deletedQueue: number
    deletedLogs: number
  }> {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000)

      // 清理已完成的队列记录
      const queueResult = await pool.query(`
        DELETE FROM notification_queue
        WHERE status IN ('sent', 'failed', 'cancelled')
        AND (sent_at < $1 OR failed_at < $1)
      `, [cutoffDate])

      // 清理旧的日志记录
      const logsResult = await pool.query(`
        DELETE FROM notification_logs
        WHERE created_at < $1
      `, [cutoffDate])

      const result = {
        deletedQueue: queueResult.rowCount || 0,
        deletedLogs: logsResult.rowCount || 0
      }

      logger.info('Old notifications cleaned up', result)
      return result
    } catch (error) {
      logger.error('Failed to cleanup old notifications', { error })
      throw new Error('清理旧通知数据失败')
    }
  }
}