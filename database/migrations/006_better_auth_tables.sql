-- Better Auth 数据库表结构
-- 006_better_auth_tables.sql

-- 删除旧的用户表（如果需要的话）
-- DROP TABLE IF EXISTS users CASCADE;

-- Better Auth 用户表
CREATE TABLE IF NOT EXISTS "user" (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  emailVerified BOOLEAN DEFAULT false,
  name VARCHAR(255) NOT NULL,
  image VARCHAR(500),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- 自定义字段
  plan VARCHAR(50) DEFAULT 'free',
  monthlyQuota INTEGER DEFAULT 3,
  usedQuota INTEGER DEFAULT 0
);

-- Better Auth 账户表（用于社交登录）
CREATE TABLE IF NOT EXISTS account (
  id VARCHAR(255) PRIMARY KEY,
  accountId VARCHAR(255) NOT NULL,
  providerId VARCHAR(255) NOT NULL,
  userId VARCHAR(255) NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  accessToken TEXT,
  refreshToken TEXT,
  idToken TEXT,
  accessTokenExpiresAt TIMESTAMP,
  refreshTokenExpiresAt TIMESTAMP,
  scope TEXT,
  password VARCHAR(255),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Better Auth 会话表
CREATE TABLE IF NOT EXISTS session (
  id VARCHAR(255) PRIMARY KEY,
  expiresAt TIMESTAMP NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ipAddress VARCHAR(45),
  userAgent TEXT,
  userId VARCHAR(255) NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);

-- Better Auth 验证表（邮箱验证、密码重置等）
CREATE TABLE IF NOT EXISTS verification (
  id VARCHAR(255) PRIMARY KEY,
  identifier VARCHAR(255) NOT NULL,
  value VARCHAR(255) NOT NULL,
  expiresAt TIMESTAMP NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_email ON "user"(email);
CREATE INDEX IF NOT EXISTS idx_account_user_id ON account(userId);
CREATE INDEX IF NOT EXISTS idx_account_provider ON account(providerId, accountId);
CREATE INDEX IF NOT EXISTS idx_session_user_id ON session(userId);
CREATE INDEX IF NOT EXISTS idx_session_token ON session(token);
CREATE INDEX IF NOT EXISTS idx_verification_identifier ON verification(identifier);

-- 更新现有表，关联新的用户表
-- 如果video_processes表存在user_id字段，需要更新外键关系
DO $$
BEGIN
  -- 检查是否存在video_processes表
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'video_processes') THEN
    -- 如果存在，但外键指向旧的users表，需要更新
    -- 这里先删除旧的外键约束，添加新的
    ALTER TABLE video_processes DROP CONSTRAINT IF EXISTS video_processes_user_id_fkey;
    
    -- 如果user_id字段类型不匹配，需要转换
    -- ALTER TABLE video_processes ALTER COLUMN user_id TYPE VARCHAR(255);
    
    -- 添加新的外键约束
    -- ALTER TABLE video_processes ADD CONSTRAINT video_processes_user_id_fkey 
    --   FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE SET NULL;
  END IF;
END
$$;

-- 数据迁移：将现有users表数据迁移到新的user表
-- （如果需要保留现有数据）
DO $$
BEGIN
  -- 检查是否存在旧的users表
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
    -- 迁移数据（需要根据实际情况调整）
    INSERT INTO "user" (id, email, name, plan, monthlyQuota, usedQuota, createdAt)
    SELECT 
      'user_' || id::text as id,
      email,
      COALESCE(name, 'User ' || id::text) as name,
      plan,
      monthly_quota,
      used_quota,
      created_at
    FROM users
    ON CONFLICT (email) DO NOTHING;
    
    -- 为每个用户创建密码账户（如果有密码）
    INSERT INTO account (id, accountId, providerId, userId, password)
    SELECT 
      'account_' || u.id::text as id,
      u.email as accountId,
      'credential' as providerId,
      'user_' || u.id::text as userId,
      u.password_hash as password
    FROM users u
    WHERE u.password_hash IS NOT NULL
    ON CONFLICT DO NOTHING;
  END IF;
END
$$;

-- 创建触发器自动更新updatedAt字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updatedAt = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为每个表创建触发器
DROP TRIGGER IF EXISTS update_user_updated_at ON "user";
CREATE TRIGGER update_user_updated_at
    BEFORE UPDATE ON "user"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_account_updated_at ON account;
CREATE TRIGGER update_account_updated_at
    BEFORE UPDATE ON account
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_session_updated_at ON session;
CREATE TRIGGER update_session_updated_at
    BEFORE UPDATE ON session
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 注释
COMMENT ON TABLE "user" IS 'Better Auth用户表，存储用户基本信息';
COMMENT ON TABLE account IS 'Better Auth账户表，存储认证提供商信息';
COMMENT ON TABLE session IS 'Better Auth会话表，管理用户会话';
COMMENT ON TABLE verification IS 'Better Auth验证表，处理邮箱验证和密码重置';

COMMENT ON COLUMN "user".plan IS '用户计划类型：free, basic, pro, enterprise';
COMMENT ON COLUMN "user".monthlyQuota IS '月度使用额度';
COMMENT ON COLUMN "user".usedQuota IS '当月已使用额度';