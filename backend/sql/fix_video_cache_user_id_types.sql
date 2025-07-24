-- 修复video_cache表的created_by列类型以匹配users.id类型
-- users.id是VARCHAR(50)，但video_cache.created_by是INTEGER

-- 1. 修改video_cache.created_by列的类型
ALTER TABLE video_cache 
ALTER COLUMN created_by TYPE VARCHAR(50);

-- 2. 同样修复video_cache_access_logs.user_id列的类型
ALTER TABLE video_cache_access_logs 
ALTER COLUMN user_id TYPE VARCHAR(50);

-- 3. 现在添加外键约束
ALTER TABLE video_cache 
ADD CONSTRAINT fk_video_cache_created_by 
FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE video_cache_access_logs 
ADD CONSTRAINT fk_cache_access_cache_id 
FOREIGN KEY (cache_id) REFERENCES video_cache(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_cache_access_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 4. 验证修复结果
DO $$
DECLARE
    video_cache_created_by_type TEXT;
    access_logs_user_id_type TEXT;
BEGIN
    -- 检查列类型
    SELECT data_type INTO video_cache_created_by_type
    FROM information_schema.columns 
    WHERE table_name = 'video_cache' AND column_name = 'created_by';
    
    SELECT data_type INTO access_logs_user_id_type
    FROM information_schema.columns 
    WHERE table_name = 'video_cache_access_logs' AND column_name = 'user_id';
    
    IF video_cache_created_by_type LIKE '%character%' AND access_logs_user_id_type LIKE '%character%' THEN
        RAISE NOTICE '✅ 用户ID类型修复完成';
        RAISE NOTICE '   video_cache.created_by: %', video_cache_created_by_type;
        RAISE NOTICE '   video_cache_access_logs.user_id: %', access_logs_user_id_type;
        RAISE NOTICE '✅ 外键约束已添加';
    ELSE
        RAISE EXCEPTION '❌ 类型修复失败: created_by=%, user_id=%', video_cache_created_by_type, access_logs_user_id_type;
    END IF;
END $$;