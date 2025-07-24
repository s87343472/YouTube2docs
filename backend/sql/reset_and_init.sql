-- YouTube 智能学习资料生成器 - 完整数据库重置和初始化脚本
-- 警告：此脚本将删除所有现有数据！

-- 1. 删除所有现有表（按依赖顺序）
DROP VIEW IF EXISTS user_quota_summary CASCADE;
DROP TABLE IF EXISTS shared_content_views CASCADE;
DROP TABLE IF EXISTS shared_content_likes CASCADE;
DROP TABLE IF EXISTS shared_content CASCADE;
DROP TABLE IF EXISTS translation_results CASCADE;
DROP TABLE IF EXISTS translation_cache CASCADE;
DROP TABLE IF EXISTS billing_records CASCADE;
DROP TABLE IF EXISTS user_duration_usage CASCADE;
DROP TABLE IF EXISTS quota_alerts CASCADE;
DROP TABLE IF EXISTS quota_usage_logs CASCADE;
DROP TABLE IF EXISTS user_quota_usage CASCADE;
DROP TABLE IF EXISTS user_subscriptions CASCADE;
DROP TABLE IF EXISTS video_processes CASCADE;
DROP TABLE IF EXISTS video_cache CASCADE;
DROP TABLE IF EXISTS user_feedback CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS notification_queue CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS quota_plans CASCADE;

-- 2. 删除所有函数
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- 3. 创建更新时间戳的触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. 创建用户表（认证系统兼容）
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

-- 5. 创建OAuth账户表
CREATE TABLE accounts (
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

-- 6. 创建通知队列表
CREATE TABLE notification_queue (
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

-- 7. 创建配额计划表
CREATE TABLE quota_plans (
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

-- 8. 创建视频处理记录表
CREATE TABLE video_processes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
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

-- 9. 创建用户订阅表
CREATE TABLE user_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
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

-- 10. 创建配额使用日志表
CREATE TABLE quota_usage_logs (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
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

-- 11. 创建视频缓存表
CREATE TABLE video_cache (
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

-- 12. 创建用户反馈表
CREATE TABLE user_feedback (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    video_process_id UUID REFERENCES video_processes(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    rating INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. 创建分享内容表
CREATE TABLE shared_content (
    share_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    video_process_id UUID REFERENCES video_processes(id) ON DELETE CASCADE,
    access_type VARCHAR(50) DEFAULT 'public',
    password_hash VARCHAR(255),
    expires_at TIMESTAMP,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. 创建分享内容查看记录表
CREATE TABLE shared_content_views (
    id SERIAL PRIMARY KEY,
    share_id VARCHAR(50) REFERENCES shared_content(share_id) ON DELETE CASCADE,
    viewer_ip INET,
    viewer_user_agent TEXT,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 15. 创建分享内容点赞表
CREATE TABLE shared_content_likes (
    id SERIAL PRIMARY KEY,
    share_id VARCHAR(50) REFERENCES shared_content(share_id) ON DELETE CASCADE,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(share_id, user_id)
);

-- 16. 创建用户配额使用表
CREATE TABLE user_quota_usage (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    quota_type VARCHAR(50) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    used_amount INTEGER DEFAULT 0,
    limit_amount INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, quota_type, period_start)
);

-- 17. 创建配额预警表
CREATE TABLE quota_alerts (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL,
    threshold_percentage INTEGER NOT NULL,
    is_sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 18. 创建用户时长使用表
CREATE TABLE user_duration_usage (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    month DATE NOT NULL,
    used_minutes INTEGER DEFAULT 0,
    quota_minutes INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, month)
);

-- 19. 创建计费记录表
CREATE TABLE billing_records (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    plan_type VARCHAR(50) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    payment_method VARCHAR(50),
    payment_status VARCHAR(50) DEFAULT 'pending',
    payment_id VARCHAR(255),
    invoice_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 20. 创建翻译缓存表
CREATE TABLE translation_cache (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    source_text_hash VARCHAR(64) NOT NULL,
    source_language VARCHAR(10) NOT NULL,
    target_language VARCHAR(10) NOT NULL,
    translated_text TEXT NOT NULL,
    provider VARCHAR(50) DEFAULT 'gemini',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source_text_hash, source_language, target_language)
);

-- 21. 创建翻译结果表
CREATE TABLE translation_results (
    id SERIAL PRIMARY KEY,
    video_process_id UUID REFERENCES video_processes(id) ON DELETE CASCADE,
    target_language VARCHAR(10) NOT NULL,
    translated_content JSONB NOT NULL,
    created_by_user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(video_process_id, target_language)
);

-- 22. 创建所有索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_plan ON users(plan);
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_provider ON accounts(provider, provider_account_id);
CREATE INDEX idx_notification_queue_status ON notification_queue(status, scheduled_at);
CREATE INDEX idx_video_processes_user_id ON video_processes(user_id);
CREATE INDEX idx_video_processes_status ON video_processes(status);
CREATE INDEX idx_video_processes_created_at ON video_processes(created_at);
CREATE INDEX idx_quota_usage_logs_user_id ON quota_usage_logs(user_id);
CREATE INDEX idx_quota_usage_logs_created_at ON quota_usage_logs(created_at);
CREATE INDEX idx_video_cache_youtube_url ON video_cache(youtube_url);
CREATE INDEX idx_video_cache_last_accessed ON video_cache(last_accessed);
CREATE INDEX idx_shared_content_user_id ON shared_content(user_id);
CREATE INDEX idx_shared_content_video_process_id ON shared_content(video_process_id);
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);

-- 23. 创建所有触发器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_queue_updated_at BEFORE UPDATE ON notification_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_video_processes_updated_at BEFORE UPDATE ON video_processes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quota_plans_updated_at BEFORE UPDATE ON quota_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_video_cache_updated_at BEFORE UPDATE ON video_cache
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shared_content_updated_at BEFORE UPDATE ON shared_content
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_quota_usage_updated_at BEFORE UPDATE ON user_quota_usage
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_duration_usage_updated_at BEFORE UPDATE ON user_duration_usage
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_billing_records_updated_at BEFORE UPDATE ON billing_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_translation_results_updated_at BEFORE UPDATE ON translation_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 24. 插入默认配额计划
INSERT INTO quota_plans (plan_type, name, description, price_monthly, price_yearly, monthly_video_quota, max_video_duration, max_file_size, has_priority_processing, has_advanced_export, has_api_access, has_team_management, has_custom_branding, max_storage_gb, max_shared_items, monthly_duration_quota)
VALUES 
    ('free', '免费版', '适合个人学习使用', 0, 0, 3, 10, 52428800, FALSE, FALSE, FALSE, FALSE, FALSE, 1, 5, 30),
    ('basic', '基础版', '适合学生和教育工作者', 9.99, 99.99, 20, 30, 104857600, TRUE, TRUE, FALSE, FALSE, FALSE, 5, 20, 180),
    ('pro', '专业版', '适合专业用户和团队', 29.99, 299.99, 100, 60, 524288000, TRUE, TRUE, TRUE, FALSE, FALSE, 20, 100, 600),
    ('enterprise', '企业版', '适合大型组织和机构', 99.99, 999.99, -1, 120, 1073741824, TRUE, TRUE, TRUE, TRUE, TRUE, 100, -1, -1);

-- 25. 创建用户配额使用情况视图
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

-- 26. 添加表注释
COMMENT ON TABLE users IS '用户基本信息表（认证系统）';
COMMENT ON TABLE accounts IS 'OAuth账户信息表';
COMMENT ON TABLE notification_queue IS '通知队列表';
COMMENT ON TABLE video_processes IS '视频处理任务记录表';
COMMENT ON TABLE quota_plans IS '配额计划定义表';
COMMENT ON TABLE user_subscriptions IS '用户订阅信息表';
COMMENT ON TABLE quota_usage_logs IS '配额使用日志表';
COMMENT ON TABLE video_cache IS '视频处理结果缓存表';
COMMENT ON TABLE user_feedback IS '用户反馈表';
COMMENT ON TABLE shared_content IS '分享内容表';
COMMENT ON TABLE shared_content_views IS '分享内容查看记录表';
COMMENT ON TABLE shared_content_likes IS '分享内容点赞表';
COMMENT ON TABLE user_quota_usage IS '用户配额使用统计表';
COMMENT ON TABLE quota_alerts IS '配额预警表';
COMMENT ON TABLE user_duration_usage IS '用户时长使用统计表';
COMMENT ON TABLE billing_records IS '计费记录表';
COMMENT ON TABLE translation_cache IS '翻译缓存表';
COMMENT ON TABLE translation_results IS '翻译结果表';
COMMENT ON VIEW user_quota_summary IS '用户配额使用情况汇总视图';

-- 27. 显示初始化结果
SELECT 'Database initialization completed successfully!' as message;
SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
SELECT plan_type, name, monthly_video_quota FROM quota_plans ORDER BY id;