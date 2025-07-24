-- 清理孤立数据（没有对应用户的记录）

-- 1. 删除没有对应用户的视频处理记录
DELETE FROM video_processes WHERE user_id IS NOT NULL AND user_id::text NOT IN (SELECT id FROM users);

-- 2. 删除没有对应用户的订阅记录
DELETE FROM user_subscriptions WHERE user_id IS NOT NULL AND user_id::text NOT IN (SELECT id FROM users);

-- 3. 删除没有对应用户的配额使用日志
DELETE FROM quota_usage_logs WHERE user_id IS NOT NULL AND user_id::text NOT IN (SELECT id FROM users);

-- 4. 删除没有对应用户的其他相关记录
DELETE FROM user_feedback WHERE user_id IS NOT NULL AND user_id::text NOT IN (SELECT id FROM users);
DELETE FROM shared_content WHERE user_id IS NOT NULL AND user_id::text NOT IN (SELECT id FROM users);
DELETE FROM shared_content_likes WHERE user_id IS NOT NULL AND user_id::text NOT IN (SELECT id FROM users);
DELETE FROM user_quota_usage WHERE user_id IS NOT NULL AND user_id::text NOT IN (SELECT id FROM users);
DELETE FROM quota_alerts WHERE user_id IS NOT NULL AND user_id::text NOT IN (SELECT id FROM users);
DELETE FROM user_duration_usage WHERE user_id IS NOT NULL AND user_id::text NOT IN (SELECT id FROM users);
DELETE FROM billing_records WHERE user_id IS NOT NULL AND user_id::text NOT IN (SELECT id FROM users);
DELETE FROM translation_cache WHERE user_id IS NOT NULL AND user_id::text NOT IN (SELECT id FROM users);
DELETE FROM translation_results WHERE created_by_user_id IS NOT NULL AND created_by_user_id::text NOT IN (SELECT id FROM users);

-- 5. 现在可以安全地添加外键约束
ALTER TABLE video_processes DROP CONSTRAINT IF EXISTS video_processes_user_id_fkey;
ALTER TABLE video_processes ALTER COLUMN user_id TYPE VARCHAR(50);
ALTER TABLE video_processes ADD CONSTRAINT video_processes_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_subscriptions DROP CONSTRAINT IF EXISTS user_subscriptions_user_id_fkey;
ALTER TABLE user_subscriptions ALTER COLUMN user_id TYPE VARCHAR(50);
ALTER TABLE user_subscriptions ADD CONSTRAINT user_subscriptions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE quota_usage_logs DROP CONSTRAINT IF EXISTS quota_usage_logs_user_id_fkey;
ALTER TABLE quota_usage_logs ALTER COLUMN user_id TYPE VARCHAR(50);
ALTER TABLE quota_usage_logs ADD CONSTRAINT quota_usage_logs_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 6. 重建用户配额使用情况视图
DROP VIEW IF EXISTS user_quota_summary;
CREATE VIEW user_quota_summary AS
SELECT 
    u.id AS user_id,
    u.email,
    u.plan,
    qp.monthly_video_quota,
    qp.monthly_duration_quota,
    COUNT(DISTINCT ql.id) AS videos_processed_this_month,
    COALESCE(SUM(CASE WHEN ql.quota_type = 'video_processing' THEN ql.amount ELSE 0 END), 0) AS total_videos_processed,
    COALESCE(SUM(CASE WHEN ql.quota_type = 'video_duration' THEN ql.amount ELSE 0 END), 0) AS total_duration_processed
FROM users u
LEFT JOIN quota_plans qp ON u.plan = qp.plan_type
LEFT JOIN quota_usage_logs ql ON u.id = ql.user_id 
    AND ql.created_at >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY u.id, u.email, u.plan, qp.monthly_video_quota, qp.monthly_duration_quota;

-- 7. 显示清理结果
SELECT 'Cleanup completed successfully' as message;