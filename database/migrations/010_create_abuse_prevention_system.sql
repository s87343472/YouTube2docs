-- 防滥用机制数据库迁移
-- 创建时间: 2025-06-25
-- 描述: 实现系统防滥用机制，包括操作频率限制、IP防护等

-- 1. 用户操作限制表
CREATE TABLE user_operation_limits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    operation_type VARCHAR(50) NOT NULL, -- 'plan_change', 'video_process', 'share_create'
    operation_count INTEGER DEFAULT 0,
    last_reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_user_operation_limits_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_operation_type CHECK (operation_type IN ('plan_change', 'video_process', 'share_create', 'export_content')),
    
    -- 每个用户的每种操作类型只有一条记录
    UNIQUE(user_id, operation_type)
);

-- 2. IP操作记录表
CREATE TABLE ip_operation_logs (
    id SERIAL PRIMARY KEY,
    ip_address INET NOT NULL,
    operation_type VARCHAR(50) NOT NULL,
    user_id INTEGER, -- 可能为空（未登录用户）
    request_path VARCHAR(200),
    user_agent TEXT,
    success BOOLEAN DEFAULT true,
    operation_data JSONB, -- 操作相关数据
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_ip_operation_logs_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 3. 黑名单表
CREATE TABLE blacklist (
    id SERIAL PRIMARY KEY,
    type VARCHAR(20) NOT NULL, -- 'ip', 'user', 'email'
    value VARCHAR(200) NOT NULL,
    reason VARCHAR(500),
    expires_at TIMESTAMP WITH TIME ZONE, -- 空表示永久封禁
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER, -- 创建封禁的管理员ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT chk_blacklist_type CHECK (type IN ('ip', 'user', 'email')),
    CONSTRAINT fk_blacklist_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    
    -- 同种类型的同一个值只有一条活跃记录
    UNIQUE(type, value, is_active) WHERE is_active = true
);

-- 4. 视频处理冷却期表
CREATE TABLE video_processing_cooldown (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    youtube_url TEXT NOT NULL,
    url_hash VARCHAR(64) NOT NULL, -- URL哈希，便于索引
    last_processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    process_count INTEGER DEFAULT 1, -- 同一视频的处理次数
    
    CONSTRAINT fk_video_cooldown_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- 每个用户的每个视频只有一条记录
    UNIQUE(user_id, url_hash)
);

-- 5. 套餐变更历史表
CREATE TABLE plan_change_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    from_plan VARCHAR(20),
    to_plan VARCHAR(20) NOT NULL,
    change_type VARCHAR(20) NOT NULL, -- 'upgrade', 'downgrade', 'cancel'
    reason VARCHAR(100), -- 'user_request', 'payment_failure', 'admin_action'
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_plan_change_history_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_change_type CHECK (change_type IN ('upgrade', 'downgrade', 'cancel')),
    CONSTRAINT chk_reason CHECK (reason IN ('user_request', 'payment_failure', 'admin_action', 'system_auto'))
);

-- 创建索引优化查询性能
CREATE INDEX idx_user_operation_limits_user_id ON user_operation_limits(user_id);
CREATE INDEX idx_user_operation_limits_type_reset ON user_operation_limits(operation_type, last_reset_at);

CREATE INDEX idx_ip_operation_logs_ip_created ON ip_operation_logs(ip_address, created_at);
CREATE INDEX idx_ip_operation_logs_user_id ON ip_operation_logs(user_id);
CREATE INDEX idx_ip_operation_logs_operation_type ON ip_operation_logs(operation_type);

CREATE INDEX idx_blacklist_type_value ON blacklist(type, value);
CREATE INDEX idx_blacklist_active_expires ON blacklist(is_active, expires_at);

CREATE INDEX idx_video_cooldown_user_hash ON video_processing_cooldown(user_id, url_hash);
CREATE INDEX idx_video_cooldown_last_processed ON video_processing_cooldown(last_processed_at);

CREATE INDEX idx_plan_change_history_user_id ON plan_change_history(user_id);
CREATE INDEX idx_plan_change_history_created_at ON plan_change_history(created_at);
CREATE INDEX idx_plan_change_history_change_type ON plan_change_history(change_type);

-- 添加触发器自动更新 updated_at 字段
CREATE TRIGGER update_user_operation_limits_updated_at 
    BEFORE UPDATE ON user_operation_limits 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blacklist_updated_at 
    BEFORE UPDATE ON blacklist 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 添加表注释
COMMENT ON TABLE user_operation_limits IS '用户操作频率限制表，记录各种操作的使用次数';
COMMENT ON TABLE ip_operation_logs IS 'IP操作日志表，用于检测异常行为模式';
COMMENT ON TABLE blacklist IS '黑名单表，支持IP、用户、邮箱多种封禁类型';
COMMENT ON TABLE video_processing_cooldown IS '视频处理冷却期表，防止重复处理相同视频';
COMMENT ON TABLE plan_change_history IS '套餐变更历史表，记录所有套餐变更操作';

-- 添加字段注释
COMMENT ON COLUMN user_operation_limits.operation_count IS '在当前时间窗口内的操作次数';
COMMENT ON COLUMN user_operation_limits.last_reset_at IS '上次重置计数器的时间';
COMMENT ON COLUMN ip_operation_logs.operation_data IS '操作相关的额外数据，JSON格式';
COMMENT ON COLUMN blacklist.expires_at IS '封禁过期时间，NULL表示永久封禁';
COMMENT ON COLUMN video_processing_cooldown.process_count IS '同一用户处理同一视频的总次数';

-- 创建复合索引优化常用查询
CREATE INDEX idx_ip_logs_recent_by_ip ON ip_operation_logs(ip_address, created_at DESC) WHERE created_at > NOW() - INTERVAL '1 hour';
CREATE INDEX idx_user_limits_active ON user_operation_limits(user_id, operation_type, last_reset_at) WHERE last_reset_at > NOW() - INTERVAL '24 hours';