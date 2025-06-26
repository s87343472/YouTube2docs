# YouTube智能学习资料生成器 - 数据库初始化完整指南

## 📋 概述

本文档提供完整的数据库初始化步骤，包括PostgreSQL安装、用户创建、数据库创建和migration脚本执行。

## 🗄️ 数据库架构

### 核心表结构
- **用户系统**: 用户认证、权限管理
- **视频处理**: 视频信息和处理状态
- **学习资料**: 生成的学习内容和知识图谱
- **订阅系统**: 配额管理、订阅计划、使用统计
- **安全系统**: 审计日志、滥用检测、IP封禁
- **缓存系统**: 视频缓存、处理结果复用
- **通知系统**: 邮件通知、系统消息

### Migration文件列表
```
database/migrations/
├── 001_initial_schema.sql          # 基础表结构
├── 005_create_users.sql             # 用户系统
├── 006_better_auth_tables.sql       # Better Auth集成
├── 007_create_user_quota_system.sql # 配额管理系统
├── 008_update_quota_plans.sql       # 订阅计划
├── 009_create_video_cache_system.sql # 视频缓存
├── 010_create_abuse_prevention_system.sql # 滥用防护
└── 011_create_notification_system.sql # 通知系统
```

## 🚀 方式一：自动化初始化（推荐）

### 1. 运行部署脚本
```bash
./deploy.sh
```

脚本会自动引导数据库初始化：
```bash
============================================
 数据库初始化向导
============================================
是否现在初始化数据库? [Y/n]: y

请执行以下SQL命令创建数据库:

sudo -u postgres psql
CREATE USER youtube_app WITH PASSWORD 'your_secure_password';
CREATE DATABASE youtube_learning_db OWNER youtube_app;
GRANT ALL PRIVILEGES ON DATABASE youtube_learning_db TO youtube_app;
\q

数据库用户和数据库是否已创建? [y/N]: y
📊 找到 8 个migration文件
是否运行所有migration脚本? [y/N]: y
```

### 2. 脚本会自动执行所有migrations
- 自动检测migration文件
- 按顺序执行所有SQL脚本
- 提供详细的执行反馈

## 🔧 方式二：手动初始化（详细步骤）

### 第一步：安装PostgreSQL

#### Ubuntu/Debian:
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### CentOS/RHEL:
```bash
sudo yum install postgresql-server postgresql-contrib
sudo postgresql-setup initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 第二步：创建数据库用户和数据库

#### 1. 连接到PostgreSQL
```bash
sudo -u postgres psql
```

#### 2. 创建应用用户
```sql
-- 创建用户（请替换为强密码）
CREATE USER youtube_app WITH PASSWORD 'your_secure_password_here';

-- 创建数据库
CREATE DATABASE youtube_learning_db OWNER youtube_app;

-- 授予权限
GRANT ALL PRIVILEGES ON DATABASE youtube_learning_db TO youtube_app;

-- 授予创建扩展的权限（用于UUID和文本搜索）
ALTER USER youtube_app CREATEDB;

-- 退出
\q
```

#### 3. 验证连接
```bash
psql -U youtube_app -h localhost -d youtube_learning_db -c "SELECT current_database(), current_user;"
```

### 第三步：执行Migration脚本

#### 方法1：使用脚本逐个执行
```bash
# 进入项目目录
cd /path/to/youtube-learning-app

# 执行所有migrations（按顺序）
for migration in database/migrations/*.sql; do
    echo "执行: $(basename $migration)"
    psql -U youtube_app -h localhost -d youtube_learning_db -f "$migration"
done
```

#### 方法2：手动逐个执行
```bash
# 执行基础架构
psql -U youtube_app -h localhost -d youtube_learning_db -f database/migrations/001_initial_schema.sql

# 执行用户系统
psql -U youtube_app -h localhost -d youtube_learning_db -f database/migrations/005_create_users.sql

# 执行Better Auth集成
psql -U youtube_app -h localhost -d youtube_learning_db -f database/migrations/006_better_auth_tables.sql

# 执行配额系统
psql -U youtube_app -h localhost -d youtube_learning_db -f database/migrations/007_create_user_quota_system.sql

# 执行订阅计划
psql -U youtube_app -h localhost -d youtube_learning_db -f database/migrations/008_update_quota_plans.sql

# 执行视频缓存
psql -U youtube_app -h localhost -d youtube_learning_db -f database/migrations/009_create_video_cache_system.sql

# 执行滥用防护
psql -U youtube_app -h localhost -d youtube_learning_db -f database/migrations/010_create_abuse_prevention_system.sql

# 执行通知系统
psql -U youtube_app -h localhost -d youtube_learning_db -f database/migrations/011_create_notification_system.sql
```

### 第四步：验证数据库结构

#### 检查表是否创建成功
```sql
-- 连接数据库
psql -U youtube_app -h localhost -d youtube_learning_db

-- 查看所有表
\dt

-- 查看表结构示例
\d users
\d video_processes
\d learning_materials

-- 查看索引
\di

-- 退出
\q
```

#### 预期表列表
```
Schema |              Name               | Type  |   Owner    
--------+---------------------------------+-------+------------
public | abuse_reports                   | table | youtube_app
public | account                         | table | youtube_app
public | audit_logs                      | table | youtube_app
public | blocked_ips                     | table | youtube_app
public | failed_attempts                 | table | youtube_app
public | learning_materials              | table | youtube_app
public | notification_preferences        | table | youtube_app
public | notification_queue              | table | youtube_app
public | notifications                   | table | youtube_app
public | quota_usage                     | table | youtube_app
public | session                         | table | youtube_app
public | subscription_plans              | table | youtube_app
public | user_subscriptions              | table | youtube_app
public | users                           | table | youtube_app
public | verification                    | table | youtube_app
public | video_cache                     | table | youtube_app
public | video_cache_access_logs         | table | youtube_app
public | video_processes                 | table | youtube_app
```

## 🔑 环境变量配置

### 更新数据库连接配置
```env
# 在 backend/.env 文件中配置
DATABASE_URL=postgresql://youtube_app:your_secure_password_here@localhost:5432/youtube_learning_db

# 数据库连接池配置
DB_POOL_MIN=5
DB_POOL_MAX=20
```

## 🧪 数据库连接测试

### 测试脚本
```bash
# 创建测试脚本
cat > test_db_connection.js << 'EOF'
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://youtube_app:your_secure_password_here@localhost:5432/youtube_learning_db'
});

async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT current_database(), current_user, version()');
    console.log('✅ 数据库连接成功:');
    console.log(`   数据库: ${result.rows[0].current_database}`);
    console.log(`   用户: ${result.rows[0].current_user}`);
    console.log(`   版本: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}`);
    
    // 测试表是否存在
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log(`   表数量: ${tables.rows.length}`);
    
    client.release();
    await pool.end();
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
  }
}

testConnection();
EOF

# 运行测试
node test_db_connection.js
```

## 🚨 常见问题和解决方案

### 问题1: 用户权限不足
```
ERROR: permission denied to create extension "uuid-ossp"
```

**解决方案**:
```sql
-- 使用管理员权限创建扩展
sudo -u postgres psql -d youtube_learning_db -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
sudo -u postgres psql -d youtube_learning_db -c "CREATE EXTENSION IF NOT EXISTS \"pg_trgm\";"
```

### 问题2: 连接被拒绝
```
FATAL: Peer authentication failed for user "youtube_app"
```

**解决方案**:
编辑PostgreSQL配置文件:
```bash
sudo nano /etc/postgresql/*/main/pg_hba.conf

# 修改认证方式为md5
local   all             all                                     md5
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5

# 重启PostgreSQL
sudo systemctl restart postgresql
```

### 问题3: 数据库已存在
```
ERROR: database "youtube_learning_db" already exists
```

**解决方案**:
```sql
-- 删除现有数据库（注意：会丢失所有数据）
DROP DATABASE IF EXISTS youtube_learning_db;

-- 重新创建
CREATE DATABASE youtube_learning_db OWNER youtube_app;
```

### 问题4: Migration执行失败
```
ERROR: relation "users" already exists
```

**解决方案**:
```bash
# 检查哪些表已存在
psql -U youtube_app -h localhost -d youtube_learning_db -c "\dt"

# 选择性执行未完成的migrations
# 或者重新初始化数据库
```

## 📊 数据库性能优化

### 创建推荐索引
```sql
-- 连接数据库
psql -U youtube_app -h localhost -d youtube_learning_db

-- 用户表索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan);

-- 视频处理索引
CREATE INDEX IF NOT EXISTS idx_video_processes_user_id ON video_processes(user_id);
CREATE INDEX IF NOT EXISTS idx_video_processes_status ON video_processes(status);
CREATE INDEX IF NOT EXISTS idx_video_processes_created_at ON video_processes(created_at);

-- 学习资料索引
CREATE INDEX IF NOT EXISTS idx_learning_materials_video_id ON learning_materials(video_process_id);
CREATE INDEX IF NOT EXISTS idx_learning_materials_user_id ON learning_materials(user_id);

-- 配额使用索引
CREATE INDEX IF NOT EXISTS idx_quota_usage_user_period ON quota_usage(user_id, period_start, period_end);

-- 审计日志索引
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
```

## 🔄 数据库备份策略

### 自动备份脚本
```bash
#!/bin/bash
# 创建备份脚本
cat > backup_database.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/var/backups/youtube-learning"
DB_NAME="youtube_learning_db"
DB_USER="youtube_app"
DATE=$(date +%Y%m%d_%H%M%S)

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 执行备份
pg_dump -U "$DB_USER" -h localhost "$DB_NAME" > "$BACKUP_DIR/db_backup_$DATE.sql"

# 压缩备份文件
gzip "$BACKUP_DIR/db_backup_$DATE.sql"

# 删除7天前的备份
find "$BACKUP_DIR" -name "db_backup_*.sql.gz" -mtime +7 -delete

echo "✅ 数据库备份完成: $BACKUP_DIR/db_backup_$DATE.sql.gz"
EOF

chmod +x backup_database.sh

# 设置定时备份（每日凌晨2点）
echo "0 2 * * * /path/to/backup_database.sh" | crontab -
```

## ✅ 初始化完成检查

### 验证清单
- [ ] PostgreSQL服务运行正常
- [ ] 数据库用户 `youtube_app` 创建成功
- [ ] 数据库 `youtube_learning_db` 创建成功
- [ ] 所有8个migration脚本执行成功
- [ ] 数据库包含所有必需的表（约18个表）
- [ ] 应用可以成功连接数据库
- [ ] 环境变量 `DATABASE_URL` 配置正确

### 最终测试
```bash
# 启动应用并检查数据库连接
cd /path/to/youtube-learning-app
npm run dev  # 或 pm2 start ecosystem.config.js

# 查看日志确认数据库连接成功
tail -f logs/app.log
# 应该看到类似：✅ PostgreSQL connected successfully to youtube_learning_db
```

---

**初始化完成！**
- 数据库已准备就绪
- 支持完整的用户认证、视频处理、订阅管理功能
- 包含企业级安全和审计功能
- 配置了性能优化索引

**下一步**: 配置API密钥并启动应用服务