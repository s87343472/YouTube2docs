-- 任务通知系统数据库迁移
-- 创建时间: 2025-06-25
-- 描述: 实现任务完成/失败的邮件通知系统

-- 1. 通知模板表
CREATE TABLE notification_templates (
    id SERIAL PRIMARY KEY,
    template_key VARCHAR(50) NOT NULL UNIQUE, -- 'task_completed', 'task_failed', 'quota_warning'
    template_name VARCHAR(100) NOT NULL,
    subject_template TEXT NOT NULL, -- 邮件主题模板
    body_template TEXT NOT NULL, -- 邮件正文模板（支持HTML）
    variables TEXT, -- 支持的变量列表，JSON格式
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 用户通知设置表
CREATE TABLE user_notification_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    email_notifications BOOLEAN DEFAULT true, -- 是否接收邮件通知
    task_completed BOOLEAN DEFAULT true, -- 任务完成通知
    task_failed BOOLEAN DEFAULT true, -- 任务失败通知
    quota_warnings BOOLEAN DEFAULT true, -- 配额预警通知
    marketing_emails BOOLEAN DEFAULT false, -- 营销邮件
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_user_notification_settings_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id) -- 每个用户只有一条设置记录
);

-- 3. 通知队列表
CREATE TABLE notification_queue (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    email VARCHAR(255) NOT NULL,
    template_key VARCHAR(50) NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL, -- 渲染后的邮件内容
    variables JSONB, -- 模板变量值
    priority INTEGER DEFAULT 5, -- 优先级，1-10，数字越小优先级越高
    
    -- 发送状态
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sending', 'sent', 'failed', 'cancelled'
    attempts INTEGER DEFAULT 0, -- 发送尝试次数
    max_attempts INTEGER DEFAULT 3, -- 最大重试次数
    
    -- 时间字段
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- 计划发送时间
    sent_at TIMESTAMP WITH TIME ZONE, -- 实际发送时间
    failed_at TIMESTAMP WITH TIME ZONE, -- 失败时间
    
    -- 错误信息
    error_message TEXT, -- 发送失败的错误信息
    error_code VARCHAR(50), -- 错误代码
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_notification_queue_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_status CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'cancelled')),
    CONSTRAINT chk_priority CHECK (priority >= 1 AND priority <= 10),
    CONSTRAINT chk_max_attempts CHECK (max_attempts >= 1 AND max_attempts <= 10)
);

-- 4. 通知发送日志表
CREATE TABLE notification_logs (
    id SERIAL PRIMARY KEY,
    notification_id INTEGER NOT NULL, -- 关联通知队列ID
    user_id INTEGER NOT NULL,
    email VARCHAR(255) NOT NULL,
    template_key VARCHAR(50) NOT NULL,
    
    -- 发送信息
    send_attempt INTEGER NOT NULL, -- 第几次尝试
    status VARCHAR(20) NOT NULL, -- 'success', 'failed'
    
    -- 邮件服务商信息
    provider VARCHAR(50), -- 'smtp', 'sendgrid', 'ses', 'mailgun'
    message_id VARCHAR(255), -- 邮件服务商返回的消息ID
    
    -- 响应信息
    response_code INTEGER, -- HTTP状态码或SMTP响应码
    response_message TEXT, -- 详细响应信息
    
    -- 性能指标
    send_duration_ms INTEGER, -- 发送耗时（毫秒）
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_notification_logs_notification_id FOREIGN KEY (notification_id) REFERENCES notification_queue(id) ON DELETE CASCADE,
    CONSTRAINT fk_notification_logs_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_log_status CHECK (status IN ('success', 'failed'))
);

-- 创建索引优化查询性能
CREATE INDEX idx_notification_templates_key ON notification_templates(template_key);
CREATE INDEX idx_notification_templates_active ON notification_templates(is_active);

CREATE INDEX idx_user_notification_settings_user_id ON user_notification_settings(user_id);

CREATE INDEX idx_notification_queue_status_priority ON notification_queue(status, priority, scheduled_at);
CREATE INDEX idx_notification_queue_user_id ON notification_queue(user_id);
CREATE INDEX idx_notification_queue_template_key ON notification_queue(template_key);
CREATE INDEX idx_notification_queue_scheduled_at ON notification_queue(scheduled_at);
CREATE INDEX idx_notification_queue_created_at ON notification_queue(created_at);

CREATE INDEX idx_notification_logs_notification_id ON notification_logs(notification_id);
CREATE INDEX idx_notification_logs_user_id ON notification_logs(user_id);
CREATE INDEX idx_notification_logs_template_key ON notification_logs(template_key);
CREATE INDEX idx_notification_logs_created_at ON notification_logs(created_at);
CREATE INDEX idx_notification_logs_status ON notification_logs(status);

-- 添加触发器自动更新 updated_at 字段
CREATE TRIGGER update_notification_templates_updated_at 
    BEFORE UPDATE ON notification_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_notification_settings_updated_at 
    BEFORE UPDATE ON user_notification_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_queue_updated_at 
    BEFORE UPDATE ON notification_queue 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 插入默认通知模板
INSERT INTO notification_templates (template_key, template_name, subject_template, body_template, variables) VALUES
(
    'task_completed',
    '任务完成通知',
    '🎉 您的视频学习材料已生成完成',
    '<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>任务完成通知</title></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">🎉 任务完成！</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">您的视频学习材料已生成完成</p>
    </div>
    
    <div style="padding: 30px; background: #f9f9f9; border-radius: 10px; margin: 20px 0;">
        <h2 style="color: #333; margin-top: 0;">📽️ 视频信息</h2>
        <p><strong>标题：</strong>{{videoTitle}}</p>
        <p><strong>频道：</strong>{{videoChannel}}</p>
        <p><strong>处理时间：</strong>{{processingTime}}秒</p>
        <p><strong>完成时间：</strong>{{completedAt}}</p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
        <a href="{{resultUrl}}" style="background: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; display: inline-block;">📚 查看学习材料</a>
    </div>
    
    <div style="border-top: 1px solid #eee; padding-top: 20px; color: #666; font-size: 12px; text-align: center;">
        <p>如果您不希望接收此类通知，请在用户设置中关闭邮件通知。</p>
    </div>
</body>
</html>',
    '["videoTitle", "videoChannel", "processingTime", "completedAt", "resultUrl"]'
),
(
    'task_failed',
    '任务失败通知',
    '❌ 视频处理失败 - {{videoTitle}}',
    '<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>任务失败通知</title></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 30px; border-radius: 10px; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">❌ 任务失败</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">很抱歉，视频处理遇到了问题</p>
    </div>
    
    <div style="padding: 30px; background: #f9f9f9; border-radius: 10px; margin: 20px 0;">
        <h2 style="color: #333; margin-top: 0;">📽️ 视频信息</h2>
        <p><strong>标题：</strong>{{videoTitle}}</p>
        <p><strong>YouTube链接：</strong><a href="{{youtubeUrl}}">{{youtubeUrl}}</a></p>
        <p><strong>失败时间：</strong>{{failedAt}}</p>
        
        <h3 style="color: #e74c3c; margin: 20px 0 10px 0;">错误信息</h3>
        <div style="background: #fee; border: 1px solid #fcc; padding: 15px; border-radius: 5px;">
            <p style="margin: 0; color: #c0392b;">{{errorMessage}}</p>
        </div>
    </div>
    
    <div style="padding: 20px; background: #e8f5e8; border-radius: 10px; margin: 20px 0;">
        <h3 style="color: #27ae60; margin-top: 0;">💡 建议解决方案</h3>
        <ul style="color: #2c3e50; line-height: 1.6;">
            <li>检查视频链接是否有效且可公开访问</li>
            <li>确认视频时长在套餐限制范围内</li>
            <li>稍后重试，服务器可能暂时繁忙</li>
            <li>如问题持续，请联系客服支持</li>
        </ul>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
        <a href="{{retryUrl}}" style="background: #3498db; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; display: inline-block; margin-right: 10px;">🔄 重新尝试</a>
        <a href="{{supportUrl}}" style="background: #95a5a6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; display: inline-block;">🎧 联系客服</a>
    </div>
    
    <div style="border-top: 1px solid #eee; padding-top: 20px; color: #666; font-size: 12px; text-align: center;">
        <p>如果您不希望接收此类通知，请在用户设置中关闭邮件通知。</p>
    </div>
</body>
</html>',
    '["videoTitle", "youtubeUrl", "failedAt", "errorMessage", "retryUrl", "supportUrl"]'
),
(
    'quota_warning',
    '配额预警通知',
    '⚠️ 您的{{quotaType}}使用量已达{{percentage}}%',
    '<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>配额预警通知</title></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%); color: white; padding: 30px; border-radius: 10px; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">⚠️ 配额预警</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">您的{{quotaType}}使用量接近上限</p>
    </div>
    
    <div style="padding: 30px; background: #f9f9f9; border-radius: 10px; margin: 20px 0;">
        <h2 style="color: #333; margin-top: 0;">📊 使用情况</h2>
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 15px 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <span style="font-weight: bold;">{{quotaTypeName}}</span>
                <span style="font-weight: bold; color: #e67e22;">{{percentage}}%</span>
            </div>
            <div style="background: #ecf0f1; height: 10px; border-radius: 5px; overflow: hidden;">
                <div style="background: linear-gradient(90deg, #2ecc71, #f39c12, #e74c3c); height: 100%; width: {{percentage}}%; transition: width 0.3s ease;"></div>
            </div>
            <div style="margin-top: 10px; font-size: 14px; color: #7f8c8d;">
                已使用: {{usedAmount}} / {{maxAmount}}
            </div>
        </div>
        
        <p><strong>计费周期：</strong>{{periodStart}} - {{periodEnd}}</p>
    </div>
    
    {{#if upgradeRequired}}
    <div style="padding: 20px; background: #e8f5e8; border-radius: 10px; margin: 20px 0;">
        <h3 style="color: #27ae60; margin-top: 0;">🚀 升级建议</h3>
        <p>当前套餐：<strong>{{currentPlan}}</strong></p>
        <p>建议升级到：<strong>{{suggestedPlan}}</strong></p>
        <div style="text-align: center; margin: 20px 0;">
            <a href="{{upgradeUrl}}" style="background: #27ae60; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; display: inline-block;">⬆️ 立即升级</a>
        </div>
    </div>
    {{/if}}
    
    <div style="border-top: 1px solid #eee; padding-top: 20px; color: #666; font-size: 12px; text-align: center;">
        <p>如果您不希望接收此类通知，请在用户设置中关闭配额预警通知。</p>
    </div>
</body>
</html>',
    '["quotaType", "quotaTypeName", "percentage", "usedAmount", "maxAmount", "periodStart", "periodEnd", "upgradeRequired", "currentPlan", "suggestedPlan", "upgradeUrl"]'
);

-- 添加表注释
COMMENT ON TABLE notification_templates IS '通知模板表，存储各种类型的邮件模板';
COMMENT ON TABLE user_notification_settings IS '用户通知设置表，控制用户接收哪些类型的通知';
COMMENT ON TABLE notification_queue IS '通知队列表，存储待发送的通知';
COMMENT ON TABLE notification_logs IS '通知发送日志表，记录每次发送的详细信息';

-- 添加字段注释
COMMENT ON COLUMN notification_templates.variables IS '模板支持的变量列表，JSON格式，用于文档说明';
COMMENT ON COLUMN notification_queue.priority IS '发送优先级，1-10，数字越小优先级越高';
COMMENT ON COLUMN notification_queue.variables IS '模板变量的实际值，JSON格式';
COMMENT ON COLUMN notification_logs.send_attempt IS '发送尝试次数，从1开始';
COMMENT ON COLUMN notification_logs.send_duration_ms IS '发送耗时，用于性能监控';

-- 创建复合索引优化常用查询
CREATE INDEX idx_queue_pending_by_priority ON notification_queue(status, priority, scheduled_at) WHERE status = 'pending';
CREATE INDEX idx_logs_recent_by_template ON notification_logs(template_key, created_at DESC) WHERE created_at > NOW() - INTERVAL '30 days';