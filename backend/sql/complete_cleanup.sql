-- 完整的数据库清理和修复脚本

-- 1. 先删除所有依赖视图
DROP VIEW IF EXISTS user_quota_summary CASCADE;

-- 2. 删除级联依赖的数据
DELETE FROM shared_content_views WHERE share_id IN (
    SELECT share_id FROM shared_content WHERE user_id IS NOT NULL AND user_id::text NOT IN (SELECT id FROM users)
);
DELETE FROM shared_content_likes WHERE share_id IN (
    SELECT share_id FROM shared_content WHERE user_id IS NOT NULL AND user_id::text NOT IN (SELECT id FROM users)
);
DELETE FROM shared_content WHERE user_id IS NOT NULL AND user_id::text NOT IN (SELECT id FROM users);
DELETE FROM shared_content WHERE video_process_id IN (
    SELECT id FROM video_processes WHERE user_id IS NOT NULL AND user_id::text NOT IN (SELECT id FROM users)
);

-- 3. 现在可以删除video_processes中的孤立记录
DELETE FROM video_processes WHERE user_id IS NOT NULL AND user_id::text NOT IN (SELECT id FROM users);

-- 4. 清理其他表
DELETE FROM user_subscriptions WHERE user_id IS NOT NULL AND user_id::text NOT IN (SELECT id FROM users);
DELETE FROM quota_usage_logs WHERE user_id IS NOT NULL AND user_id::text NOT IN (SELECT id FROM users);
DELETE FROM user_feedback WHERE user_id IS NOT NULL AND user_id::text NOT IN (SELECT id FROM users);
DELETE FROM user_quota_usage WHERE user_id IS NOT NULL AND user_id::text NOT IN (SELECT id FROM users);
DELETE FROM quota_alerts WHERE user_id IS NOT NULL AND user_id::text NOT IN (SELECT id FROM users);
DELETE FROM user_duration_usage WHERE user_id IS NOT NULL AND user_id::text NOT IN (SELECT id FROM users);
DELETE FROM billing_records WHERE user_id IS NOT NULL AND user_id::text NOT IN (SELECT id FROM users);
DELETE FROM translation_cache WHERE user_id IS NOT NULL AND user_id::text NOT IN (SELECT id FROM users);
DELETE FROM translation_results WHERE created_by_user_id IS NOT NULL AND created_by_user_id::text NOT IN (SELECT id FROM users);

-- 5. 修改列类型并添加外键约束
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

ALTER TABLE user_feedback DROP CONSTRAINT IF EXISTS user_feedback_user_id_fkey;
ALTER TABLE user_feedback ALTER COLUMN user_id TYPE VARCHAR(50);
ALTER TABLE user_feedback ADD CONSTRAINT user_feedback_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE shared_content DROP CONSTRAINT IF EXISTS shared_content_user_id_fkey;
ALTER TABLE shared_content ALTER COLUMN user_id TYPE VARCHAR(50);
ALTER TABLE shared_content ADD CONSTRAINT shared_content_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE shared_content_likes DROP CONSTRAINT IF EXISTS shared_content_likes_user_id_fkey;
ALTER TABLE shared_content_likes ALTER COLUMN user_id TYPE VARCHAR(50);
ALTER TABLE shared_content_likes ADD CONSTRAINT shared_content_likes_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_quota_usage DROP CONSTRAINT IF EXISTS fk_user_quota_usage_user_id;
ALTER TABLE user_quota_usage ALTER COLUMN user_id TYPE VARCHAR(50);
ALTER TABLE user_quota_usage ADD CONSTRAINT fk_user_quota_usage_user_id 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE quota_alerts DROP CONSTRAINT IF EXISTS fk_quota_alerts_user_id;
ALTER TABLE quota_alerts ALTER COLUMN user_id TYPE VARCHAR(50);
ALTER TABLE quota_alerts ADD CONSTRAINT fk_quota_alerts_user_id 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_duration_usage DROP CONSTRAINT IF EXISTS fk_user_duration_usage_user_id;
ALTER TABLE user_duration_usage ALTER COLUMN user_id TYPE VARCHAR(50);
ALTER TABLE user_duration_usage ADD CONSTRAINT fk_user_duration_usage_user_id 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE billing_records DROP CONSTRAINT IF EXISTS billing_records_user_id_fkey;
ALTER TABLE billing_records ALTER COLUMN user_id TYPE VARCHAR(50);
ALTER TABLE billing_records ADD CONSTRAINT billing_records_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE translation_cache DROP CONSTRAINT IF EXISTS translation_cache_user_id_fkey;
ALTER TABLE translation_cache ALTER COLUMN user_id TYPE VARCHAR(50);
ALTER TABLE translation_cache ADD CONSTRAINT translation_cache_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE translation_results DROP CONSTRAINT IF EXISTS translation_results_created_by_user_id_fkey;
ALTER TABLE translation_results ALTER COLUMN created_by_user_id TYPE VARCHAR(50);
ALTER TABLE translation_results ADD CONSTRAINT translation_results_created_by_user_id_fkey 
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 6. 重建用户配额使用情况视图
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

-- 7. 显示当前用户
SELECT id, email, name, plan, created_at FROM users ORDER BY created_at DESC LIMIT 10;

-- 8. 显示清理结果
SELECT 'Database cleanup and migration completed successfully' as message;