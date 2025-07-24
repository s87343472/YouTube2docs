-- 用户计划变更日志表
CREATE TABLE IF NOT EXISTS user_plan_change_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    old_plan VARCHAR(50) NOT NULL,
    new_plan VARCHAR(50) NOT NULL,
    reason TEXT NOT NULL,
    operator_id VARCHAR(255), -- 操作员用户ID（可为空，表示系统自动操作）
    operator_email VARCHAR(255), -- 操作员邮箱
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引提高查询性能
CREATE INDEX IF NOT EXISTS idx_plan_change_logs_user_id ON user_plan_change_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_change_logs_created_at ON user_plan_change_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_plan_change_logs_operator_id ON user_plan_change_logs(operator_id);
CREATE INDEX IF NOT EXISTS idx_plan_change_logs_new_plan ON user_plan_change_logs(new_plan);

-- 创建更新时间戳的触发器
CREATE TRIGGER update_plan_change_logs_updated_at 
    BEFORE UPDATE ON user_plan_change_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 添加表注释
COMMENT ON TABLE user_plan_change_logs IS '用户计划变更日志表，记录所有用户计划的升级、降级操作';
COMMENT ON COLUMN user_plan_change_logs.user_id IS '用户ID';
COMMENT ON COLUMN user_plan_change_logs.email IS '用户邮箱';
COMMENT ON COLUMN user_plan_change_logs.old_plan IS '变更前的计划';
COMMENT ON COLUMN user_plan_change_logs.new_plan IS '变更后的计划';
COMMENT ON COLUMN user_plan_change_logs.reason IS '变更原因';
COMMENT ON COLUMN user_plan_change_logs.operator_id IS '操作员用户ID（空表示系统操作）';
COMMENT ON COLUMN user_plan_change_logs.operator_email IS '操作员邮箱';