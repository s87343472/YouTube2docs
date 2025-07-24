-- 修复 user_quota_usage 表结构

-- 1. 添加缺失的 quota_period 列
ALTER TABLE user_quota_usage 
ADD COLUMN IF NOT EXISTS quota_period VARCHAR(20) DEFAULT 'monthly';

-- 2. 删除多余的 limit_amount 列（如果存在）
ALTER TABLE user_quota_usage 
DROP COLUMN IF EXISTS limit_amount;

-- 3. 修改 period_start 和 period_end 列类型为 TIMESTAMP（如果需要）
ALTER TABLE user_quota_usage 
ALTER COLUMN period_start TYPE TIMESTAMP,
ALTER COLUMN period_end TYPE TIMESTAMP;

-- 4. 更新唯一约束
DROP INDEX IF EXISTS user_quota_usage_user_id_quota_type_quota_period_period_start_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_quota_usage_unique 
ON user_quota_usage(user_id, quota_type, quota_period, period_start);

-- 5. 添加注释
COMMENT ON COLUMN user_quota_usage.quota_period IS '配额周期 (monthly, daily等)';