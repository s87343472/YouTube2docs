-- 修复缺失的数据库列

-- 1. 为 video_processes 表添加 progress 列
ALTER TABLE video_processes 
ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;

-- 2. 为 video_processes 表添加其他可能需要的列
ALTER TABLE video_processes 
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP DEFAULT NULL,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP DEFAULT NULL,
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_error TEXT DEFAULT NULL;

-- 3. 修正 quota_usage_logs 表的 user_id 类型，确保与其他表一致
-- 检查是否需要修改 user_id 的数据类型
-- 注意：如果表中已有数据，需要小心处理

-- 4. 为 video_cache 表添加可能需要的索引
CREATE INDEX IF NOT EXISTS idx_video_cache_youtube_url_hash ON video_cache USING hash(youtube_url);

-- 5. 为 video_processes 表添加索引
CREATE INDEX IF NOT EXISTS idx_video_processes_user_id_status ON video_processes(user_id, status);
CREATE INDEX IF NOT EXISTS idx_video_processes_status_created ON video_processes(status, created_at);

-- 6. 添加表注释
COMMENT ON COLUMN video_processes.progress IS '处理进度 (0-100)';
COMMENT ON COLUMN video_processes.started_at IS '开始处理时间';
COMMENT ON COLUMN video_processes.completed_at IS '完成时间';
COMMENT ON COLUMN video_processes.retry_count IS '重试次数';
COMMENT ON COLUMN video_processes.last_error IS '最后一次错误信息';