-- 修复认证系统相关的数据库表结构

-- 1. 先删除旧的users表（如果需要保留数据，请先备份）
DROP TABLE IF EXISTS users CASCADE;

-- 2. 创建新的users表，符合认证系统的要求
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    name VARCHAR(255),
    image VARCHAR(500),
    email_verified BOOLEAN DEFAULT false,
    plan VARCHAR(50) DEFAULT 'free' NOT NULL,
    monthly_quota INTEGER DEFAULT 3 NOT NULL,
    used_quota INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. 创建账户表（用于OAuth登录）
CREATE TABLE IF NOT EXISTS accounts (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    provider_account_id VARCHAR(255) NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    expires_at INTEGER,
    token_type VARCHAR(50),
    scope TEXT,
    id_token TEXT,
    session_state VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, provider_account_id)
);

-- 4. 创建通知队列表（用于异步任务）
CREATE TABLE IF NOT EXISTS notification_queue (
    id SERIAL PRIMARY KEY,
    type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    scheduled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    error TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. 重建索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_plan ON users(plan);
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_provider ON accounts(provider, provider_account_id);
CREATE INDEX idx_notification_queue_status ON notification_queue(status, scheduled_at);

-- 6. 重建触发器函数（如果不存在）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. 为新表创建触发器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_queue_updated_at BEFORE UPDATE ON notification_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. 修复video_processes表的外键关系
ALTER TABLE video_processes DROP CONSTRAINT IF EXISTS video_processes_user_id_fkey;
ALTER TABLE video_processes ALTER COLUMN user_id TYPE VARCHAR(50);
ALTER TABLE video_processes ADD CONSTRAINT video_processes_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 9. 修复user_subscriptions表的外键关系
ALTER TABLE user_subscriptions DROP CONSTRAINT IF EXISTS user_subscriptions_user_id_fkey;
ALTER TABLE user_subscriptions ALTER COLUMN user_id TYPE VARCHAR(50);
ALTER TABLE user_subscriptions ADD CONSTRAINT user_subscriptions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 10. 修复quota_usage_logs表的外键关系
ALTER TABLE quota_usage_logs DROP CONSTRAINT IF EXISTS quota_usage_logs_user_id_fkey;
ALTER TABLE quota_usage_logs ALTER COLUMN user_id TYPE VARCHAR(50);
ALTER TABLE quota_usage_logs ADD CONSTRAINT quota_usage_logs_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 11. 重建用户配额使用情况视图
DROP VIEW IF EXISTS user_quota_summary;
CREATE VIEW user_quota_summary AS
SELECT 
    u.id AS user_id,
    u.email,
    u.plan,
    qp.monthly_video_quota,
    qp.monthly_duration_quota,
    COUNT(DISTINCT ql.id) AS videos_processed_this_month,
    COALESCE(SUM(CASE WHEN ql.quota_type = 'video_processing' THEN ql.amount ELSE 0 END), 0) AS total_videos_processed,
    COALESCE(SUM(CASE WHEN ql.quota_type = 'video_duration' THEN ql.amount ELSE 0 END), 0) AS total_duration_processed
FROM users u
LEFT JOIN quota_plans qp ON u.plan = qp.plan_type
LEFT JOIN quota_usage_logs ql ON u.id = ql.user_id 
    AND ql.created_at >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY u.id, u.email, u.plan, qp.monthly_video_quota, qp.monthly_duration_quota;

-- 12. 添加注释
COMMENT ON TABLE users IS '用户基本信息表（认证系统）';
COMMENT ON TABLE accounts IS 'OAuth账户信息表';
COMMENT ON TABLE notification_queue IS '通知队列表';
COMMENT ON COLUMN users.id IS '用户唯一标识符（随机字符串）';
COMMENT ON COLUMN users.email_verified IS '邮箱是否已验证';
COMMENT ON COLUMN accounts.provider IS 'OAuth提供商（如google）';
COMMENT ON COLUMN accounts.provider_account_id IS '在OAuth提供商的账户ID';