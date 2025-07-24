-- 修复video_cache表结构和相关表
-- 让video_cache表结构与代码期望匹配

-- 1. 先备份现有的video_cache表数据
CREATE TABLE IF NOT EXISTS video_cache_backup AS 
SELECT * FROM video_cache;

-- 2. 为video_cache添加缺失的列
ALTER TABLE video_cache 
ADD COLUMN IF NOT EXISTS url_hash VARCHAR(64),
ADD COLUMN IF NOT EXISTS video_title TEXT,
ADD COLUMN IF NOT EXISTS video_duration INTEGER,
ADD COLUMN IF NOT EXISTS video_channel TEXT,
ADD COLUMN IF NOT EXISTS result_data JSONB,
ADD COLUMN IF NOT EXISTS processing_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS created_by INTEGER,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 3. 重命名列以匹配代码期望
ALTER TABLE video_cache 
RENAME COLUMN last_accessed TO last_accessed_at;

-- 4. 为url_hash列添加索引
CREATE INDEX IF NOT EXISTS idx_video_cache_url_hash 
ON video_cache(url_hash);

-- 5. 创建video_cache_access_logs表
CREATE TABLE IF NOT EXISTS video_cache_access_logs (
    id SERIAL PRIMARY KEY,
    cache_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    access_type VARCHAR(10) NOT NULL CHECK (access_type IN ('create', 'reuse')),
    process_id VARCHAR(50),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. 为video_cache_access_logs添加索引
CREATE INDEX IF NOT EXISTS idx_video_cache_access_logs_cache_id 
ON video_cache_access_logs(cache_id);

CREATE INDEX IF NOT EXISTS idx_video_cache_access_logs_user_id 
ON video_cache_access_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_video_cache_access_logs_created_at 
ON video_cache_access_logs(created_at);

-- 7. 添加外键约束（如果users表存在）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        -- 为video_cache添加外键
        ALTER TABLE video_cache 
        ADD CONSTRAINT fk_video_cache_created_by 
        FOREIGN KEY (created_by) REFERENCES users(id);
        
        -- 为video_cache_access_logs添加外键
        ALTER TABLE video_cache_access_logs 
        ADD CONSTRAINT fk_cache_access_cache_id 
        FOREIGN KEY (cache_id) REFERENCES video_cache(id),
        ADD CONSTRAINT fk_cache_access_user_id 
        FOREIGN KEY (user_id) REFERENCES users(id);
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE '跳过外键创建: %', SQLERRM;
END $$;

-- 8. 为video_cache_access_logs创建更新触发器
CREATE TRIGGER update_video_cache_access_logs_updated_at
    BEFORE UPDATE ON video_cache_access_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. 添加列注释
COMMENT ON COLUMN video_cache.url_hash IS '视频URL的哈希值，用于快速查找';
COMMENT ON COLUMN video_cache.video_title IS '视频标题';
COMMENT ON COLUMN video_cache.video_duration IS '视频时长（秒）';
COMMENT ON COLUMN video_cache.video_channel IS '视频频道名称';
COMMENT ON COLUMN video_cache.result_data IS '处理结果数据';
COMMENT ON COLUMN video_cache.processing_cost IS '处理成本';
COMMENT ON COLUMN video_cache.created_by IS '缓存创建者用户ID';
COMMENT ON COLUMN video_cache.expires_at IS '缓存过期时间';
COMMENT ON COLUMN video_cache.is_active IS '缓存是否活跃';

COMMENT ON TABLE video_cache_access_logs IS '视频缓存访问日志';
COMMENT ON COLUMN video_cache_access_logs.access_type IS '访问类型：create创建，reuse复用';

-- 10. 验证修复结果
DO $$
DECLARE
    video_cache_columns INTEGER;
    access_logs_exists BOOLEAN;
BEGIN
    -- 检查video_cache列数
    SELECT COUNT(*) INTO video_cache_columns
    FROM information_schema.columns 
    WHERE table_name = 'video_cache';
    
    -- 检查access_logs表是否存在
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'video_cache_access_logs'
    ) INTO access_logs_exists;
    
    IF video_cache_columns >= 20 AND access_logs_exists THEN
        RAISE NOTICE '✅ video_cache结构修复完成，现有%个列', video_cache_columns;
        RAISE NOTICE '✅ video_cache_access_logs表已创建';
    ELSE
        RAISE EXCEPTION '❌ 修复未完成：video_cache列数=%，access_logs存在=%', video_cache_columns, access_logs_exists;
    END IF;
END $$;