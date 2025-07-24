-- 修复缺失的时间戳列
-- 为所有表添加统一的 created_at 和 updated_at 列

-- 1. account 表
ALTER TABLE account 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 2. billing_config_history 表
ALTER TABLE billing_config_history 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 3. concepts 表
ALTER TABLE concepts 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 4. knowledge_graphs 表
ALTER TABLE knowledge_graphs 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 5. processing_stats 表
ALTER TABLE processing_stats 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 6. quota_alerts 表
ALTER TABLE quota_alerts 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 7. quota_usage_logs 表
ALTER TABLE quota_usage_logs 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 8. session 表
ALTER TABLE session 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 9. shared_content_likes 表
ALTER TABLE shared_content_likes 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 10. shared_content_views 表
ALTER TABLE shared_content_views 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 11. study_cards 表
ALTER TABLE study_cards 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 12. system_config 表
ALTER TABLE system_config 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 13. translation_cache 表
ALTER TABLE translation_cache 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 14. user 表 (需要处理现有的 createdAt/updatedAt)
-- 先检查是否已有 createdAt/updatedAt，如果有则重命名
DO $$
BEGIN
    -- 检查并重命名 createdAt 到 created_at
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'createdAt') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'created_at') THEN
            ALTER TABLE "user" RENAME COLUMN "createdAt" TO created_at;
        END IF;
    ELSE
        ALTER TABLE "user" ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
    
    -- 检查并重命名 updatedAt 到 updated_at
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'updatedAt') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'updated_at') THEN
            ALTER TABLE "user" RENAME COLUMN "updatedAt" TO updated_at;
        END IF;
    ELSE
        ALTER TABLE "user" ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- 15. user_feedback 表
ALTER TABLE user_feedback 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 16. verification 表
-- 类似 user 表，处理现有的 createdAt/updatedAt
DO $$
BEGIN
    -- 检查并重命名 createdAt 到 created_at
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'verification' AND column_name = 'createdAt') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'verification' AND column_name = 'created_at') THEN
            ALTER TABLE verification RENAME COLUMN "createdAt" TO created_at;
        END IF;
    ELSE
        ALTER TABLE verification ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
    
    -- 检查并重命名 updatedAt 到 updated_at
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'verification' AND column_name = 'updatedAt') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'verification' AND column_name = 'updated_at') THEN
            ALTER TABLE verification RENAME COLUMN "updatedAt" TO updated_at;
        END IF;
    ELSE
        ALTER TABLE verification ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- 更新现有记录的时间戳（如果为空）
UPDATE account SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL;
UPDATE account SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL;

UPDATE billing_config_history SET updated_at = created_at WHERE updated_at IS NULL;

UPDATE concepts SET created_at = "createdAt" WHERE created_at IS NULL AND "createdAt" IS NOT NULL;
UPDATE concepts SET updated_at = "updatedAt" WHERE updated_at IS NULL AND "updatedAt" IS NOT NULL;
UPDATE concepts SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL;
UPDATE concepts SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL;

UPDATE knowledge_graphs SET updated_at = created_at WHERE updated_at IS NULL;

UPDATE processing_stats SET updated_at = created_at WHERE updated_at IS NULL;

UPDATE quota_alerts SET updated_at = created_at WHERE updated_at IS NULL;

UPDATE quota_usage_logs SET updated_at = created_at WHERE updated_at IS NULL;

UPDATE session SET created_at = "createdAt" WHERE created_at IS NULL AND "createdAt" IS NOT NULL;
UPDATE session SET updated_at = "updatedAt" WHERE updated_at IS NULL AND "updatedAt" IS NOT NULL;
UPDATE session SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL;
UPDATE session SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL;

UPDATE shared_content_likes SET updated_at = created_at WHERE updated_at IS NULL;

UPDATE shared_content_views SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL;
UPDATE shared_content_views SET updated_at = viewed_at WHERE updated_at IS NULL;

UPDATE study_cards SET updated_at = created_at WHERE updated_at IS NULL;

UPDATE system_config SET created_at = "createdAt" WHERE created_at IS NULL AND "createdAt" IS NOT NULL;
UPDATE system_config SET updated_at = "updatedAt" WHERE updated_at IS NULL AND "updatedAt" IS NOT NULL;
UPDATE system_config SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL;
UPDATE system_config SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL;

UPDATE translation_cache SET updated_at = created_at WHERE updated_at IS NULL;

UPDATE user_feedback SET updated_at = created_at WHERE updated_at IS NULL;

-- 创建或更新触发器，确保 updated_at 自动更新
-- 为所有新增了 updated_at 列的表创建触发器

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为各表创建 updated_at 触发器（如果不存在）
DO $$
DECLARE
    table_names TEXT[] := ARRAY[
        'account', 'billing_config_history', 'concepts', 'knowledge_graphs', 
        'processing_stats', 'quota_alerts', 'quota_usage_logs', 'session', 
        'shared_content_likes', 'shared_content_views', 'study_cards', 
        'system_config', 'translation_cache', 'user', 'user_feedback', 'verification'
    ];
    table_name TEXT;
    trigger_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY table_names
    LOOP
        trigger_name := 'update_' || table_name || '_updated_at';
        
        -- 删除触发器如果存在
        EXECUTE 'DROP TRIGGER IF EXISTS ' || trigger_name || ' ON ' || table_name;
        
        -- 创建新触发器
        EXECUTE 'CREATE TRIGGER ' || trigger_name || 
                ' BEFORE UPDATE ON ' || table_name || 
                ' FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()';
    END LOOP;
END $$;

-- 添加注释
COMMENT ON FUNCTION update_updated_at_column() IS '自动更新 updated_at 列的触发器函数';

-- 为修复的列添加注释
COMMENT ON COLUMN account.created_at IS '记录创建时间';
COMMENT ON COLUMN account.updated_at IS '记录最后更新时间';
COMMENT ON COLUMN concepts.created_at IS '概念创建时间';
COMMENT ON COLUMN concepts.updated_at IS '概念最后更新时间';
COMMENT ON COLUMN session.created_at IS '会话创建时间';
COMMENT ON COLUMN session.updated_at IS '会话最后更新时间';
COMMENT ON COLUMN system_config.created_at IS '配置创建时间';
COMMENT ON COLUMN system_config.updated_at IS '配置最后更新时间';
COMMENT ON COLUMN verification.created_at IS '验证记录创建时间';
COMMENT ON COLUMN verification.updated_at IS '验证记录最后更新时间';

COMMENT ON COLUMN "user".created_at IS '用户创建时间';
COMMENT ON COLUMN "user".updated_at IS '用户最后更新时间';