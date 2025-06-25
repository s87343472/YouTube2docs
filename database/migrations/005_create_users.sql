-- 创建用户表
-- 005_create_users.sql

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(500),
  plan VARCHAR(50) DEFAULT 'free',
  monthly_quota INTEGER DEFAULT 3,
  used_quota INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan);

-- 用户会话表（可选，用于更安全的会话管理）
CREATE TABLE IF NOT EXISTS user_sessions (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_agent TEXT,
  ip_address INET
);

-- 创建会话表索引
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions(token_hash);

-- 用户活动日志表
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建活动日志索引
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_action ON user_activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON user_activity_logs(created_at);

-- 更新视频处理记录表，关联用户
ALTER TABLE video_processes 
ADD COLUMN IF NOT EXISTS user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL;

-- 创建视频处理记录的用户索引
CREATE INDEX IF NOT EXISTS idx_video_processes_user_id ON video_processes(user_id);

-- 更新分享内容表，关联用户
ALTER TABLE shared_content 
ADD COLUMN IF NOT EXISTS user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE;

-- 创建分享内容的用户索引
CREATE INDEX IF NOT EXISTS idx_shared_content_user_id ON shared_content(user_id);

-- 插入测试数据（开发环境使用）
-- 默认密码是 'password123'，经过bcrypt加密
INSERT INTO users (id, name, email, password_hash, plan, is_active, email_verified) 
VALUES (
  'user_test_123',
  '测试用户',
  'test@example.com',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LLJLf7TDLnV4QPBhW', -- password123
  'free',
  true,
  true
) ON CONFLICT (email) DO NOTHING;

-- 创建触发器函数来自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为用户表创建触发器
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 注释
COMMENT ON TABLE users IS '用户表，存储用户基本信息和账户设置';
COMMENT ON TABLE user_sessions IS '用户会话表，用于会话管理和安全控制';
COMMENT ON TABLE user_activity_logs IS '用户活动日志表，记录用户的重要操作';

COMMENT ON COLUMN users.plan IS '用户计划类型：free, basic, pro, enterprise';
COMMENT ON COLUMN users.monthly_quota IS '月度使用额度';
COMMENT ON COLUMN users.used_quota IS '当月已使用额度';
COMMENT ON COLUMN users.email_verified IS '邮箱是否已验证';