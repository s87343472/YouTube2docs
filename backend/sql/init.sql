-- YouTube 智能学习资料生成器数据库初始化脚本
-- 请在 PostgreSQL 中执行此脚本以创建所需的表结构

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    plan VARCHAR(50) DEFAULT 'free' NOT NULL,
    monthly_quota INTEGER DEFAULT 3 NOT NULL,
    used_quota INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建视频处理记录表
CREATE TABLE IF NOT EXISTS video_processes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    youtube_url TEXT NOT NULL,
    video_title TEXT,
    video_description TEXT,
    channel_name TEXT,
    duration INTEGER,
    status VARCHAR(50) DEFAULT 'pending' NOT NULL,
    result_data JSONB,
    error_message TEXT,
    processing_time INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建配额计划表
CREATE TABLE IF NOT EXISTS quota_plans (
    id SERIAL PRIMARY KEY,
    plan_type VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10, 2),
    price_yearly DECIMAL(10, 2),
    monthly_video_quota INTEGER NOT NULL,
    max_video_duration INTEGER NOT NULL,
    max_file_size BIGINT NOT NULL,
    has_priority_processing BOOLEAN DEFAULT FALSE,
    has_advanced_export BOOLEAN DEFAULT FALSE,
    has_api_access BOOLEAN DEFAULT FALSE,
    has_team_management BOOLEAN DEFAULT FALSE,
    has_custom_branding BOOLEAN DEFAULT FALSE,
    max_storage_gb INTEGER DEFAULT 1,
    max_shared_items INTEGER DEFAULT 10,
    monthly_duration_quota INTEGER DEFAULT 60,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建用户订阅表
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    plan_type VARCHAR(50) REFERENCES quota_plans(plan_type),
    status VARCHAR(50) DEFAULT 'active' NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    auto_renew BOOLEAN DEFAULT TRUE,
    payment_method VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, plan_type)
);

-- 创建配额使用日志表
CREATE TABLE IF NOT EXISTS quota_usage_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    quota_type VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    amount INTEGER DEFAULT 1,
    resource_id VARCHAR(255),
    resource_type VARCHAR(50),
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建视频缓存表
CREATE TABLE IF NOT EXISTS video_cache (
    id SERIAL PRIMARY KEY,
    youtube_url TEXT UNIQUE NOT NULL,
    video_info JSONB NOT NULL,
    transcription JSONB,
    analysis_result JSONB,
    knowledge_graph JSONB,
    study_cards JSONB,
    access_count INTEGER DEFAULT 1,
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_video_processes_user_id ON video_processes(user_id);
CREATE INDEX IF NOT EXISTS idx_video_processes_status ON video_processes(status);
CREATE INDEX IF NOT EXISTS idx_video_processes_created_at ON video_processes(created_at);
CREATE INDEX IF NOT EXISTS idx_quota_usage_logs_user_id ON quota_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_quota_usage_logs_created_at ON quota_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_video_cache_youtube_url ON video_cache(youtube_url);
CREATE INDEX IF NOT EXISTS idx_video_cache_last_accessed ON video_cache(last_accessed);

-- 插入默认配额计划
INSERT INTO quota_plans (plan_type, name, description, price_monthly, price_yearly, monthly_video_quota, max_video_duration, max_file_size, has_priority_processing, has_advanced_export, has_api_access, has_team_management, has_custom_branding, max_storage_gb, max_shared_items, monthly_duration_quota)
VALUES 
    ('free', '免费版', '适合个人学习使用', 0, 0, 3, 10, 52428800, FALSE, FALSE, FALSE, FALSE, FALSE, 1, 5, 30),
    ('basic', '基础版', '适合学生和教育工作者', 9.99, 99.99, 20, 30, 104857600, TRUE, TRUE, FALSE, FALSE, FALSE, 5, 20, 180),
    ('pro', '专业版', '适合专业用户和团队', 29.99, 299.99, 100, 60, 524288000, TRUE, TRUE, TRUE, FALSE, FALSE, 20, 100, 600),
    ('enterprise', '企业版', '适合大型组织和机构', 99.99, 999.99, -1, 120, 1073741824, TRUE, TRUE, TRUE, TRUE, TRUE, 100, -1, -1)
ON CONFLICT (plan_type) DO NOTHING;

-- 创建更新时间戳的触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为需要的表创建更新时间戳触发器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_video_processes_updated_at BEFORE UPDATE ON video_processes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quota_plans_updated_at BEFORE UPDATE ON quota_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_video_cache_updated_at BEFORE UPDATE ON video_cache
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 创建视图：用户配额使用情况
CREATE OR REPLACE VIEW user_quota_summary AS
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

-- 授权说明（如果需要特定用户权限）
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_db_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_db_user;

COMMENT ON TABLE users IS '用户基本信息表';
COMMENT ON TABLE video_processes IS '视频处理任务记录表';
COMMENT ON TABLE quota_plans IS '配额计划定义表';
COMMENT ON TABLE user_subscriptions IS '用户订阅信息表';
COMMENT ON TABLE quota_usage_logs IS '配额使用日志表';
COMMENT ON TABLE video_cache IS '视频处理结果缓存表';
COMMENT ON VIEW user_quota_summary IS '用户配额使用情况汇总视图';