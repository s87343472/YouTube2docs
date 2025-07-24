-- 修复 notification_queue 表结构
-- 添加缺失的列

ALTER TABLE notification_queue 
ADD COLUMN IF NOT EXISTS user_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS template_key VARCHAR(100),
ADD COLUMN IF NOT EXISTS subject TEXT,
ADD COLUMN IF NOT EXISTS body TEXT,
ADD COLUMN IF NOT EXISTS variables JSONB,
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_notification_queue_user_id ON notification_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_priority ON notification_queue(priority);