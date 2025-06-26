-- 用户配额管理系统数据库迁移
-- 创建时间: 2025-06-25
-- 描述: 实现用户配额管理，支持不同会员等级和使用限制

-- 1. 用户会员等级表
CREATE TABLE user_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    plan_type VARCHAR(20) NOT NULL DEFAULT 'free', -- free, basic, professional, enterprise
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, expired, cancelled, pending
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    auto_renew BOOLEAN DEFAULT false,
    payment_method VARCHAR(50), -- alipay, wechat, credit_card
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_user_subscriptions_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_plan_type CHECK (plan_type IN ('free', 'basic', 'professional', 'enterprise')),
    CONSTRAINT chk_status CHECK (status IN ('active', 'expired', 'cancelled', 'pending'))
);

-- 2. 配额计划配置表
CREATE TABLE quota_plans (
    id SERIAL PRIMARY KEY,
    plan_type VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10,2) DEFAULT 0,
    price_yearly DECIMAL(10,2) DEFAULT 0,
    
    -- 配额限制
    monthly_video_quota INTEGER NOT NULL DEFAULT 0, -- 每月视频数量限制，0表示无限制
    max_video_duration INTEGER NOT NULL DEFAULT 0, -- 单个视频最大时长(分钟)，0表示无限制
    max_file_size BIGINT NOT NULL DEFAULT 0, -- 最大文件大小(字节)，0表示无限制
    
    -- 功能权限
    has_priority_processing BOOLEAN DEFAULT false,
    has_advanced_export BOOLEAN DEFAULT false,
    has_api_access BOOLEAN DEFAULT false,
    has_team_management BOOLEAN DEFAULT false,
    has_custom_branding BOOLEAN DEFAULT false,
    
    -- 存储和分享
    max_storage_gb INTEGER DEFAULT 1, -- 存储空间限制(GB)
    max_shared_items INTEGER DEFAULT 10, -- 最大分享数量
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT chk_quota_plan_type CHECK (plan_type IN ('free', 'basic', 'professional', 'enterprise'))
);

-- 3. 用户配额使用记录表
CREATE TABLE user_quota_usage (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    quota_type VARCHAR(50) NOT NULL, -- video_processing, storage, api_calls, exports
    used_amount INTEGER NOT NULL DEFAULT 0,
    quota_period VARCHAR(20) NOT NULL DEFAULT 'monthly', -- daily, weekly, monthly, yearly
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_user_quota_usage_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_quota_type CHECK (quota_type IN ('video_processing', 'storage', 'api_calls', 'exports', 'shares')),
    CONSTRAINT chk_quota_period CHECK (quota_period IN ('daily', 'weekly', 'monthly', 'yearly')),
    
    -- 确保每个用户在每个周期内每种配额类型只有一条记录
    UNIQUE(user_id, quota_type, quota_period, period_start)
);

-- 4. 配额使用详细记录表
CREATE TABLE quota_usage_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    quota_type VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL, -- video_processed, file_uploaded, export_generated, share_created
    amount INTEGER NOT NULL DEFAULT 1,
    resource_id VARCHAR(100), -- 关联的资源ID（如视频处理ID）
    resource_type VARCHAR(50), -- 资源类型
    metadata JSONB, -- 额外的元数据信息
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_quota_usage_logs_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. 配额预警和通知表
CREATE TABLE quota_alerts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    quota_type VARCHAR(50) NOT NULL,
    alert_type VARCHAR(20) NOT NULL, -- warning, limit_reached, quota_reset
    threshold_percentage INTEGER, -- 触发预警的使用率百分比
    message TEXT NOT NULL,
    is_sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_quota_alerts_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_alert_type CHECK (alert_type IN ('warning', 'limit_reached', 'quota_reset', 'upgrade_reminder'))
);

-- 插入默认配额计划
INSERT INTO quota_plans (plan_type, name, description, price_monthly, price_yearly, monthly_video_quota, max_video_duration, max_file_size, has_priority_processing, has_advanced_export, has_api_access, has_team_management, has_custom_branding, max_storage_gb, max_shared_items) VALUES
('free', '免费版', '适合个人用户轻度使用', 0, 0, 3, 30, 104857600, false, false, false, false, false, 1, 5),
('basic', '基础版', '适合个人用户日常学习', 29, 290, 30, 60, 524288000, false, true, false, false, false, 5, 50),
('professional', '专业版', '适合深度学习用户', 59, 590, 0, 0, 1073741824, true, true, true, false, false, 20, 200),
('enterprise', '企业版', '适合团队和企业使用', 299, 2990, 0, 0, 2147483648, true, true, true, true, true, 100, 1000);

-- 创建索引优化查询性能
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_plan_type ON user_subscriptions(plan_type);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_user_subscriptions_expires_at ON user_subscriptions(expires_at);

CREATE INDEX idx_user_quota_usage_user_id ON user_quota_usage(user_id);
CREATE INDEX idx_user_quota_usage_quota_type ON user_quota_usage(quota_type);
CREATE INDEX idx_user_quota_usage_period ON user_quota_usage(period_start, period_end);

CREATE INDEX idx_quota_usage_logs_user_id ON quota_usage_logs(user_id);
CREATE INDEX idx_quota_usage_logs_created_at ON quota_usage_logs(created_at);
CREATE INDEX idx_quota_usage_logs_quota_type ON quota_usage_logs(quota_type);

CREATE INDEX idx_quota_alerts_user_id ON quota_alerts(user_id);
CREATE INDEX idx_quota_alerts_is_sent ON quota_alerts(is_sent);

-- 添加触发器自动更新 updated_at 字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quota_plans_updated_at BEFORE UPDATE ON quota_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_quota_usage_updated_at BEFORE UPDATE ON user_quota_usage FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 添加注释
COMMENT ON TABLE user_subscriptions IS '用户订阅和会员等级管理';
COMMENT ON TABLE quota_plans IS '配额计划配置，定义不同会员等级的权限和限制';
COMMENT ON TABLE user_quota_usage IS '用户配额使用统计，按周期汇总';
COMMENT ON TABLE quota_usage_logs IS '配额使用详细日志，记录每次使用';
COMMENT ON TABLE quota_alerts IS '配额预警和通知管理';

COMMENT ON COLUMN quota_plans.monthly_video_quota IS '每月视频处理数量限制，0表示无限制';
COMMENT ON COLUMN quota_plans.max_video_duration IS '单个视频最大时长限制(分钟)，0表示无限制';
COMMENT ON COLUMN quota_plans.max_file_size IS '最大文件大小限制(字节)，0表示无限制';
COMMENT ON COLUMN quota_plans.has_priority_processing IS '是否享有优先处理权限';
COMMENT ON COLUMN quota_plans.has_advanced_export IS '是否支持高级导出功能';
COMMENT ON COLUMN quota_plans.has_api_access IS '是否可以使用API接口';
COMMENT ON COLUMN quota_plans.has_team_management IS '是否支持团队管理功能';
COMMENT ON COLUMN quota_plans.has_custom_branding IS '是否支持自定义品牌';