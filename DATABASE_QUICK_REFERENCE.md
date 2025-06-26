# 数据库初始化 - 快速参考

## 🚀 一键初始化（推荐）

```bash
# 运行快速初始化脚本
./quick_db_init.sh

# 或指定密码
./quick_db_init.sh "your_secure_password"
```

## 📋 手动命令参考

### 1. 创建用户和数据库
```bash
sudo -u postgres psql
```
```sql
CREATE USER youtube_app WITH PASSWORD 'your_secure_password';
CREATE DATABASE youtube_learning_db OWNER youtube_app;
GRANT ALL PRIVILEGES ON DATABASE youtube_learning_db TO youtube_app;
ALTER USER youtube_app CREATEDB;
\q
```

### 2. 创建扩展
```bash
sudo -u postgres psql -d youtube_learning_db
```
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
\q
```

### 3. 执行Migrations
```bash
# 设置密码环境变量
export PGPASSWORD="your_secure_password"

# 执行所有migration文件
for migration in database/migrations/*.sql; do
    echo "执行: $(basename $migration)"
    psql -U youtube_app -h localhost -d youtube_learning_db -f "$migration"
done
```

### 4. 验证安装
```bash
psql -U youtube_app -h localhost -d youtube_learning_db -c "\dt"
```

## 🔧 数据库连接配置

### 环境变量 (backend/.env)
```env
DATABASE_URL=postgresql://youtube_app:your_secure_password@localhost:5432/youtube_learning_db
DB_POOL_MIN=5
DB_POOL_MAX=20
```

## 📊 表结构概览

```
18个核心表:
├── users                      # 用户基础信息
├── account                    # Better Auth账户
├── session                    # 用户会话
├── verification              # 邮箱验证
├── video_processes           # 视频处理记录
├── learning_materials        # 学习资料
├── subscription_plans        # 订阅计划
├── user_subscriptions       # 用户订阅
├── quota_usage              # 配额使用
├── video_cache              # 视频缓存
├── video_cache_access_logs  # 缓存访问日志
├── audit_logs               # 审计日志
├── blocked_ips              # IP封禁
├── failed_attempts          # 失败尝试
├── abuse_reports            # 滥用举报
├── notifications            # 通知记录
├── notification_queue       # 通知队列
└── notification_preferences # 通知偏好
```

## 🚨 故障排除

### 权限问题
```bash
# 如果扩展创建失败
sudo -u postgres psql -d youtube_learning_db -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
```

### 连接问题
```bash
# 修改认证方式
sudo nano /etc/postgresql/*/main/pg_hba.conf
# 将 peer 改为 md5
sudo systemctl restart postgresql
```

### 重置数据库
```sql
-- 谨慎使用！会删除所有数据
DROP DATABASE IF EXISTS youtube_learning_db;
CREATE DATABASE youtube_learning_db OWNER youtube_app;
```

## ✅ 初始化成功标志

成功后应该看到：
- 数据库连接正常
- 18个表创建完成
- 所有索引创建成功
- 应用可以正常启动

---

**初始化完成后，可以启动应用服务！**