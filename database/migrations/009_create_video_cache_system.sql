-- 视频结果缓存系统数据库迁移
-- 创建时间: 2025-06-25
-- 描述: 实现视频处理结果复用，节省成本和提升响应速度

-- 1. 视频缓存表
CREATE TABLE video_cache (
    id SERIAL PRIMARY KEY,
    youtube_url TEXT NOT NULL,
    url_hash VARCHAR(64) NOT NULL UNIQUE, -- URL的SHA-256哈希值
    video_title VARCHAR(500),
    video_duration INTEGER, -- 视频时长（秒）
    video_channel VARCHAR(200),
    
    -- 处理结果数据
    result_data JSONB NOT NULL, -- 完整的LearningMaterial JSON
    processing_cost DECIMAL(10,4) DEFAULT 0, -- 处理成本（美元）
    
    -- 使用统计
    access_count INTEGER DEFAULT 1,
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 创建信息
    created_by INTEGER NOT NULL, -- 首次处理的用户ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 有效性控制
    expires_at TIMESTAMP WITH TIME ZONE, -- 缓存过期时间
    is_active BOOLEAN DEFAULT true,
    
    CONSTRAINT fk_video_cache_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 2. 视频缓存访问记录表
CREATE TABLE video_cache_access_logs (
    id SERIAL PRIMARY KEY,
    cache_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    access_type VARCHAR(20) NOT NULL DEFAULT 'reuse', -- 'create', 'reuse'
    process_id VARCHAR(100), -- 关联的处理ID
    ip_address INET,
    user_agent TEXT,
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_cache_access_cache_id FOREIGN KEY (cache_id) REFERENCES video_cache(id) ON DELETE CASCADE,
    CONSTRAINT fk_cache_access_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_access_type CHECK (access_type IN ('create', 'reuse'))
);

-- 3. 创建索引优化查询性能
CREATE INDEX idx_video_cache_url_hash ON video_cache(url_hash);
CREATE INDEX idx_video_cache_youtube_url ON video_cache(youtube_url);
CREATE INDEX idx_video_cache_created_at ON video_cache(created_at);
CREATE INDEX idx_video_cache_last_accessed ON video_cache(last_accessed_at);
CREATE INDEX idx_video_cache_is_active ON video_cache(is_active);
CREATE INDEX idx_video_cache_expires_at ON video_cache(expires_at);

CREATE INDEX idx_cache_access_logs_cache_id ON video_cache_access_logs(cache_id);
CREATE INDEX idx_cache_access_logs_user_id ON video_cache_access_logs(user_id);
CREATE INDEX idx_cache_access_logs_accessed_at ON video_cache_access_logs(accessed_at);

-- 4. 添加触发器自动更新 updated_at 字段
CREATE TRIGGER update_video_cache_updated_at 
    BEFORE UPDATE ON video_cache 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. 添加表注释
COMMENT ON TABLE video_cache IS '视频处理结果缓存表，用于复用相同视频的处理结果';
COMMENT ON TABLE video_cache_access_logs IS '视频缓存访问日志，记录每次缓存使用情况';

COMMENT ON COLUMN video_cache.url_hash IS 'YouTube URL的SHA-256哈希值，用于快速查找';
COMMENT ON COLUMN video_cache.result_data IS '完整的学习材料JSON数据';
COMMENT ON COLUMN video_cache.processing_cost IS '首次处理的成本，用于成本统计';
COMMENT ON COLUMN video_cache.access_count IS '缓存被使用的总次数';
COMMENT ON COLUMN video_cache.expires_at IS '缓存过期时间，过期后需要重新处理';

-- 6. 创建复合索引优化常用查询
CREATE INDEX idx_video_cache_active_hash ON video_cache(url_hash, is_active) WHERE is_active = true;
CREATE INDEX idx_video_cache_active_expires ON video_cache(is_active, expires_at) WHERE is_active = true;