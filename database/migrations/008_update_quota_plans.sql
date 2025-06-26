-- 更新配额计划以匹配新的业务需求
-- 创建时间: 2025-06-25
-- 描述: 基于Groq Whisper Large v3 Turbo定价重新设计配额计划

-- 首先添加新字段（如果不存在）
ALTER TABLE quota_plans ADD COLUMN IF NOT EXISTS monthly_duration_quota INTEGER DEFAULT 0;

-- 清空现有计划
DELETE FROM quota_plans;

-- 插入新的配额计划
INSERT INTO quota_plans (
    plan_type, 
    name, 
    description, 
    price_monthly, 
    price_yearly,
    monthly_video_quota, 
    max_video_duration, 
    max_file_size,
    has_priority_processing, 
    has_advanced_export, 
    has_api_access,
    has_team_management, 
    has_custom_branding, 
    max_storage_gb, 
    max_shared_items,
    monthly_duration_quota  -- 新增：每月总时长限制(分钟)
) VALUES
-- 免费版：2个视频/月，每个≤30分钟，总时长≤60分钟
('free', '免费版', '体验版：每月2个30分钟以内的视频', 
 0, 0, 2, 30, 104857600, -- 100MB文件限制
 false, false, false, false, false, 1, 5, 60),

-- Pro版：50个视频/月，每个≤60分钟，总时长≤3000分钟(50小时)
('pro', 'Pro版', 'Pro版：每月50个视频，单个1小时内，总时长50小时', 
 30, 300, 50, 60, 524288000, -- 500MB文件限制
 true, true, true, false, false, 10, 100, 3000),

-- Max版：200个视频/月，每个≤120分钟，总时长≤24000分钟(400小时)
('max', 'Max版', 'Max版：每月200个视频，单个2小时内，总时长400小时', 
 100, 1000, 200, 120, 1073741824, -- 1GB文件限制
 true, true, true, true, true, 50, 500, 24000);

-- 注释：新字段已在上面添加，数据已在INSERT语句中包含

-- 添加总时长使用跟踪表
CREATE TABLE IF NOT EXISTS user_duration_usage (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    video_id VARCHAR(100),
    duration_minutes INTEGER NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    quota_period VARCHAR(20) NOT NULL DEFAULT 'monthly',
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    
    CONSTRAINT fk_user_duration_usage_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_duration_usage_user_id ON user_duration_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_user_duration_usage_period ON user_duration_usage(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_user_duration_usage_processed_at ON user_duration_usage(processed_at);

-- 添加注释
COMMENT ON COLUMN quota_plans.monthly_duration_quota IS '每月总视频时长限制(分钟)，0表示无限制';
COMMENT ON TABLE user_duration_usage IS '用户视频时长使用记录，用于跟踪月度总时长';