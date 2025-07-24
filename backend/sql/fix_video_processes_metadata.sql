-- 为 video_processes 表添加缺失的 metadata 列
-- 修复视频处理功能中的列缺失问题

-- 添加 metadata 列
ALTER TABLE video_processes 
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- 为 metadata 列添加注释
COMMENT ON COLUMN video_processes.metadata IS '视频处理相关的元数据，包含缓存信息等';

-- 检查列是否添加成功
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'video_processes' 
        AND column_name = 'metadata'
    ) THEN
        RAISE NOTICE '✅ metadata 列已成功添加到 video_processes 表';
    ELSE
        RAISE EXCEPTION '❌ metadata 列添加失败';
    END IF;
END $$;