-- 创建用户配额使用统计表
CREATE TABLE IF NOT EXISTS user_quota_usage (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    quota_type VARCHAR(50) NOT NULL,
    used_amount INTEGER DEFAULT 0,
    quota_period VARCHAR(20) DEFAULT 'monthly',
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 确保每个用户在每个周期内每种配额类型只有一条记录
    UNIQUE(user_id, quota_type, quota_period, period_start)
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_user_quota_usage_user_id ON user_quota_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_user_quota_usage_period ON user_quota_usage(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_user_quota_usage_type ON user_quota_usage(quota_type);
CREATE INDEX IF NOT EXISTS idx_user_quota_usage_composite ON user_quota_usage(user_id, quota_type, period_start);

-- 创建更新时间戳的触发器
CREATE TRIGGER update_user_quota_usage_updated_at 
    BEFORE UPDATE ON user_quota_usage
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 添加表注释
COMMENT ON TABLE user_quota_usage IS '用户配额使用统计表，按周期汇总各种配额的使用情况';
COMMENT ON COLUMN user_quota_usage.user_id IS '用户ID';
COMMENT ON COLUMN user_quota_usage.quota_type IS '配额类型 (video_processing, shares, storage等)';
COMMENT ON COLUMN user_quota_usage.used_amount IS '已使用数量';
COMMENT ON COLUMN user_quota_usage.quota_period IS '配额周期 (monthly, daily等)';
COMMENT ON COLUMN user_quota_usage.period_start IS '周期开始时间';
COMMENT ON COLUMN user_quota_usage.period_end IS '周期结束时间';