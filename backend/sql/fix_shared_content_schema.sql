-- 修复shared_content表架构
-- 添加缺失的列以匹配shareService.ts期望

-- 1. 为shared_content表添加缺失的列
ALTER TABLE shared_content 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- 2. 修改access_type为可选的，因为代码使用is_public
ALTER TABLE shared_content 
ALTER COLUMN access_type DROP NOT NULL;

-- 3. 添加索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_shared_content_is_public 
ON shared_content(is_public);

CREATE INDEX IF NOT EXISTS idx_shared_content_title 
ON shared_content(title);

CREATE INDEX IF NOT EXISTS idx_shared_content_tags 
ON shared_content USING gin(tags);

-- 4. 添加列注释
COMMENT ON COLUMN shared_content.title IS '分享内容标题';
COMMENT ON COLUMN shared_content.description IS '分享内容描述';
COMMENT ON COLUMN shared_content.tags IS '标签数组（JSON格式）';
COMMENT ON COLUMN shared_content.is_public IS '是否公开分享';

-- 5. 验证修复结果
DO $$
DECLARE
    shared_content_columns INTEGER;
    required_columns TEXT[] := ARRAY['title', 'description', 'tags', 'is_public'];
    missing_columns TEXT[] := '{}';
    col TEXT;
BEGIN
    -- 检查所有必需的列是否存在
    FOREACH col IN ARRAY required_columns
    LOOP
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'shared_content' 
            AND column_name = col
        ) THEN
            missing_columns := array_append(missing_columns, col);
        END IF;
    END LOOP;
    
    -- 检查总列数
    SELECT COUNT(*) INTO shared_content_columns
    FROM information_schema.columns 
    WHERE table_name = 'shared_content';
    
    IF array_length(missing_columns, 1) IS NULL THEN
        RAISE NOTICE '✅ shared_content架构修复完成，现有%个列', shared_content_columns;
        RAISE NOTICE '✅ 新增列：title, description, tags, is_public';
    ELSE
        RAISE EXCEPTION '❌ 修复未完成，缺失列：%', array_to_string(missing_columns, ', ');
    END IF;
END $$;