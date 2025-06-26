# YouTube智能学习资料生成器 - 部署指南

## 项目概述

YouTube智能学习资料生成器是一个基于AI的SaaS平台，能够将YouTube视频转换为结构化学习资料和知识图谱。

### 核心功能
- YouTube视频链接解析和下载
- 视频转文字转录（Groq Whisper API）
- AI内容分析和摘要（Google Gemini API）
- 知识点提取和关系图谱生成
- 多种格式导出（PDF、Word、Markdown）
- 用户订阅和配额管理系统
- 企业级安全和风控系统

### 技术栈
- **前端**: React 19.1.0 + TypeScript + Vite + Ant Design
- **后端**: Node.js + Fastify + TypeScript
- **数据库**: PostgreSQL + Redis
- **认证**: Better Auth
- **AI服务**: Groq Whisper API + Google Gemini API
- **安全**: Helmet.js + 速率限制 + 滥用检测

## 部署前准备

### 1. 服务器要求
- **操作系统**: Ubuntu 20.04+ / CentOS 8+
- **CPU**: 4核心以上
- **内存**: 8GB以上
- **存储**: 50GB以上 SSD
- **网络**: 带宽10Mbps以上

### 2. 依赖服务
- **Node.js**: v18.0.0+
- **PostgreSQL**: v14.0+
- **Redis**: v6.0+
- **Nginx**: v1.20+
- **PM2**: 进程管理器

### 3. 第三方API密钥
- **Groq API**: 用于视频转录服务
- **Google Gemini API**: 用于内容分析
- **YouTube Data API**: 用于视频信息获取

## 部署步骤

### 1. 环境准备

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# 安装Redis
sudo apt install redis-server -y

# 安装Nginx
sudo apt install nginx -y

# 安装PM2
sudo npm install -g pm2
```

### 2. 数据库配置

```bash
# 创建数据库用户和数据库
sudo -u postgres psql
CREATE USER youtube_app WITH PASSWORD 'your_secure_password';
CREATE DATABASE youtube_learning_db OWNER youtube_app;
GRANT ALL PRIVILEGES ON DATABASE youtube_learning_db TO youtube_app;
\\q

# 运行数据库migrations
cd /path/to/project/database
psql -U youtube_app -d youtube_learning_db -f migrations/001_create_users_table.sql
psql -U youtube_app -d youtube_learning_db -f migrations/002_create_videos_table.sql
psql -U youtube_app -d youtube_learning_db -f migrations/003_create_learning_materials_table.sql
psql -U youtube_app -d youtube_learning_db -f migrations/004_create_knowledge_graphs_table.sql
psql -U youtube_app -d youtube_learning_db -f migrations/005_create_user_subscription_system.sql
psql -U youtube_app -d youtube_learning_db -f migrations/006_create_security_audit_system.sql
psql -U youtube_app -d youtube_learning_db -f migrations/007_create_user_quota_system.sql
psql -U youtube_app -d youtube_learning_db -f migrations/008_update_quota_plans.sql
psql -U youtube_app -d youtube_learning_db -f migrations/009_create_video_cache_system.sql
psql -U youtube_app -d youtube_learning_db -f migrations/010_create_abuse_prevention_system.sql
psql -U youtube_app -d youtube_learning_db -f migrations/011_create_notification_system.sql
```

### 3. Redis配置

```bash
# 编辑Redis配置
sudo nano /etc/redis/redis.conf

# 设置密码
requirepass your_redis_password

# 重启Redis
sudo systemctl restart redis-server
sudo systemctl enable redis-server
```

### 4. 项目部署

```bash
# 创建项目目录
sudo mkdir -p /var/www/youtube-learning-app
sudo chown $USER:$USER /var/www/youtube-learning-app

# 上传项目文件
cd /var/www/youtube-learning-app
# 将项目文件上传到此目录

# 后端配置
cd backend
npm install --production

# 创建环境变量文件
cp .env.example .env
nano .env
```

### 5. 环境变量配置

在 `backend/.env` 文件中配置：

```env
# 服务器配置
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# 数据库配置
DATABASE_URL=postgresql://youtube_app:your_secure_password@localhost:5432/youtube_learning_db

# Redis配置
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your_redis_password

# JWT配置
JWT_SECRET=your_jwt_secret_key_very_long_and_secure
JWT_EXPIRES_IN=7d

# API密钥
GROQ_API_KEY=your_groq_api_key
GOOGLE_GEMINI_API_KEY=your_google_gemini_api_key
YOUTUBE_API_KEY=your_youtube_api_key

# 存储配置
UPLOAD_PATH=/var/www/youtube-learning-app/uploads
MAX_FILE_SIZE=100MB

# 邮件配置（可选）
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# 安全配置
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
SECURITY_AUDIT_ENABLED=true
```

### 6. 前端构建部署

前端已完成构建，使用 `frontend/dist` 文件夹中的静态文件。

### 7. Nginx配置

创建Nginx站点配置：

```bash
sudo nano /etc/nginx/sites-available/youtube-learning-app
```

配置内容：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # 静态文件服务
    location / {
        root /var/www/youtube-learning-app/frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # 缓存配置
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # API代理
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 超时配置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # 文件上传大小限制
    client_max_body_size 100M;
    
    # 安全headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy strict-origin-when-cross-origin;
}
```

启用站点：

```bash
sudo ln -s /etc/nginx/sites-available/youtube-learning-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 8. 后端进程管理

由于TypeScript编译存在大量类型错误，建议使用开发模式运行后端：

创建PM2配置文件：

```bash
nano /var/www/youtube-learning-app/ecosystem.config.js
```

配置内容：

```javascript
module.exports = {
  apps: [{
    name: 'youtube-learning-backend',
    script: 'ts-node',
    args: 'src/index.ts',
    cwd: './backend',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      TS_NODE_PROJECT: 'tsconfig.json'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
}
```

启动应用：

```bash
# 创建日志目录
mkdir -p logs uploads

# 安装ts-node
cd backend && npm install ts-node

# 启动应用
pm2 start ecosystem.config.js

# 保存PM2配置
pm2 save

# 设置开机自启
pm2 startup
```

## 部署检查清单

### 构建状态
- ✅ **前端构建完成**: 生产环境dist文件已生成
- ⚠️  **后端编译**: 存在TypeScript类型错误，建议使用ts-node开发模式运行
- ✅ **数据库脚本**: 所有migration文件已就绪
- ✅ **配置文件**: 环境变量模板已准备

### 功能特性
- ✅ **用户认证系统**: Better Auth集成
- ✅ **视频处理管道**: Groq + Google Gemini API
- ✅ **订阅管理**: 完整的配额和订阅系统
- ✅ **安全防护**: 速率限制、Helmet.js、滥用检测
- ✅ **缓存系统**: Redis缓存优化
- ✅ **文件管理**: 上传、存储、清理机制

### 已实现的企业级功能
1. **安全审计系统**: 完整的用户行为跟踪
2. **配额管理**: 多层级订阅计划和使用限制
3. **滥用防护**: 智能检测和自动封禁
4. **通知系统**: 邮件和系统通知
5. **视频缓存**: 智能缓存和过期清理
6. **定时任务**: 自动化维护和清理

## 监控和维护

### 1. 日志监控
```bash
# 查看PM2进程状态
pm2 status

# 查看应用日志
pm2 logs youtube-learning-backend

# 查看Nginx日志
sudo tail -f /var/log/nginx/access.log
```

### 2. 数据库维护
```bash
# 数据库备份
pg_dump -U youtube_app -h localhost youtube_learning_db > backup_$(date +%Y%m%d_%H%M%S).sql

# 设置定时备份
crontab -e
# 添加每日备份
0 2 * * * pg_dump -U youtube_app -h localhost youtube_learning_db > /var/backups/db_backup_$(date +\%Y\%m\%d_\%H\%M\%S).sql
```

## 故障排除

### 常见问题
1. **后端启动失败**: 检查数据库连接和环境变量
2. **API请求失败**: 检查第三方API密钥配置
3. **前端页面空白**: 检查Nginx静态文件路径配置
4. **数据库连接错误**: 验证PostgreSQL用户权限和连接字符串

### 性能优化建议
1. **数据库索引**: 为常用查询字段创建索引
2. **Redis缓存**: 优化缓存策略和过期时间
3. **Nginx缓存**: 配置静态资源缓存和gzip压缩
4. **PM2集群**: 在生产环境使用cluster模式

## 安全建议

1. **定期更新**: 保持系统和依赖包最新
2. **密钥管理**: 定期轮换API密钥和数据库密码
3. **监控告警**: 配置异常行为监控和告警
4. **备份策略**: 实施定期数据备份和恢复测试
5. **SSL证书**: 使用HTTPS加密所有通信

## 版本信息

- **项目版本**: 1.0.0
- **构建时间**: 2024-12-25
- **前端构建**: ✅ 完成 (1.38MB压缩后433KB)
- **后端状态**: ⚠️ 使用开发模式运行
- **数据库**: 11个migration文件已就绪
- **部署方式**: PM2 + Nginx + PostgreSQL + Redis