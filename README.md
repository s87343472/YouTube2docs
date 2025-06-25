# YouTube智能学习资料生成器

> 2分钟将任意YouTube视频转换为专业学习资料

## 🚀 快速启动

### 一键启动所有服务
```bash
# 启动数据库、后端、前端服务
./start-all-services.sh

# 停止所有服务
./stop-services.sh

# 重启所有服务
./restart-services.sh
```

### 手动启动
```bash
# 1. 启动数据库服务
brew services start postgresql@14
brew services start redis

# 2. 启动后端服务
cd backend
npm run dev

# 3. 启动前端服务（新终端）
cd frontend  
npm run dev
```

## 📱 访问地址

- **前端界面**: http://localhost:5173
- **后端API**: http://localhost:3000
- **健康检查**: http://localhost:3000/health
- **系统信息**: http://localhost:3000/system/info

## 🔧 环境配置

### 必需的API密钥
编辑 `backend/.env` 文件：

```env
# 音频转录 (必需)
GROQ_API_KEY=your_groq_api_key_here

# 内容分析 (必需)  
GEMINI_API_KEY=your_gemini_api_key_here

# Google OAuth登录 (可选)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# 数据库配置
DATABASE_URL=postgresql://sagasu@localhost:5432/youtube_learning
REDIS_URL=redis://localhost:6379

# 服务配置
PORT=3000
CORS_ORIGIN=http://localhost:5173
```

### 获取API密钥
- **Groq API**: https://console.groq.com/
- **Gemini API**: https://makersuite.google.com/app/apikey
- **Google OAuth**: https://console.cloud.google.com/

## 🎯 核心功能

### ⚡ 智能处理流程
1. **视频信息提取** (10秒) - YouTube视频元数据
2. **音频提取** (30秒) - 高质量音频分离
3. **语音转录** (60秒) - Groq Whisper超速转录
4. **内容分析** (90秒) - Gemini AI智能解析
5. **知识图谱** (30秒) - 概念关联网络
6. **学习资料** (15秒) - 多格式输出

### 📚 输出内容
- **结构化笔记**: 章节化学习内容
- **知识图谱**: 可视化概念关系  
- **学习卡片**: 重点知识卡片
- **概念解释**: AI生成的深度解释
- **多格式导出**: PDF/Markdown/图片

### 🔐 用户认证
- **邮箱登录**: 注册/登录系统
- **Google OAuth**: 一键Google登录
- **会话管理**: 安全的用户会话
- **用户中心**: 个人数据管理

## 🛠️ 技术架构

### 前端技术栈
- **React 18** + TypeScript + Vite
- **Tailwind CSS** 样式框架
- **Better Auth** 用户认证
- **Lucide React** 图标库

### 后端技术栈  
- **Node.js** + TypeScript + Fastify
- **PostgreSQL** 主数据库
- **Redis** 缓存和会话
- **Better Auth** 认证服务
- **Groq SDK** 音频转录
- **Google Gemini** 内容分析

### 处理工具
- **yt-dlp** YouTube视频下载
- **FFmpeg** 音频处理

## 📊 项目结构

```
├── backend/                    # 后端服务
│   ├── src/
│   │   ├── routes/            # API路由
│   │   ├── services/          # 业务逻辑  
│   │   ├── lib/               # 认证配置
│   │   ├── middleware/        # 中间件
│   │   ├── utils/             # 工具函数
│   │   └── config/            # 配置文件
│   └── .env                   # 环境变量
├── frontend/                   # 前端应用
│   ├── src/
│   │   ├── components/        # React组件
│   │   ├── pages/             # 页面组件
│   │   ├── services/          # API服务
│   │   └── lib/               # 认证客户端
├── database/                   # 数据库
│   ├── migrations/            # 数据库迁移
│   └── seeds/                 # 初始数据
├── start-all-services.sh      # 一键启动脚本
├── stop-services.sh           # 停止服务脚本
└── restart-services.sh        # 重启服务脚本
```

## 🚀 开发环境搭建

### 环境要求
- **Node.js** >= 18.0.0
- **PostgreSQL** >= 14.0  
- **Redis** >= 6.0
- **FFmpeg** (用于音频处理)

### 安装步骤
```bash
# 1. 克隆项目
git clone <repository-url>
cd youtube-learning-generator

# 2. 安装依赖
cd backend && npm install
cd ../frontend && npm install

# 3. 配置环境变量
cp backend/.env.example backend/.env
# 编辑 backend/.env 添加API密钥

# 4. 启动数据库
brew services start postgresql@14
brew services start redis

# 5. 运行数据库迁移
cd backend
npm run migrate

# 6. 启动服务
./start-all-services.sh
```

## 📝 使用说明

### 基本使用流程
1. **访问应用**: 打开 http://localhost:5173
2. **用户登录**: 邮箱注册或Google一键登录
3. **输入视频**: 粘贴YouTube视频链接
4. **开始处理**: 点击"开始处理"按钮
5. **查看结果**: 等待2-3分钟查看生成的学习资料
6. **导出分享**: 支持PDF/图片导出和链接分享

### 管理服务
```bash
# 检查服务状态
./check-status.sh

# 查看日志
tail -f backend/logs/app.log

# 重启特定服务
brew services restart postgresql@14
brew services restart redis
```

## 🔍 故障排除

### 常见问题
1. **端口占用**: 确保3000和5173端口可用
2. **数据库连接**: 检查PostgreSQL和Redis服务状态
3. **API密钥**: 验证Groq和Gemini API密钥有效性
4. **权限问题**: 确保脚本有执行权限 `chmod +x *.sh`

### 日志查看
```bash
# 应用日志
tail -f backend/logs/app.log

# 服务状态
./check-status.sh

# 数据库日志
brew services info postgresql@14
```

## 📄 API文档

### 核心端点
- `POST /api/video/process` - 处理YouTube视频
- `GET /api/video/:id` - 获取处理结果
- `POST /auth/sign-in` - 用户登录
- `POST /auth/sign-up` - 用户注册
- `GET /health` - 健康检查

### 认证方式
- **Bearer Token**: API请求需要在Header中包含认证token
- **Cookie Session**: 浏览器自动管理session cookie

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/新功能`)
3. 提交更改 (`git commit -m '添加新功能'`)
4. 推送到分支 (`git push origin feature/新功能`)
5. 创建 Pull Request

## 🌐 生产环境部署

### 🚀 AWS EC2 部署教程

#### 1. 创建和配置 EC2 实例

```bash
# 1. 启动 EC2 实例 (推荐配置)
# - 实例类型: t3.medium (2 vCPU, 4 GB RAM) 或更高
# - 操作系统: Ubuntu 22.04 LTS
# - 存储: 20 GB SSD
# - 安全组: 开放 22 (SSH), 80 (HTTP), 443 (HTTPS) 端口

# 2. 连接到实例
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

#### 2. 安装系统依赖

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 PostgreSQL
sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 安装 Redis
sudo apt install redis-server -y
sudo systemctl start redis-server
sudo systemctl enable redis-server

# 安装 FFmpeg 和 yt-dlp
sudo apt install ffmpeg -y
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp

# 安装 PM2 (进程管理器)
sudo npm install -g pm2

# 安装 Nginx (反向代理)
sudo apt install nginx -y
```

#### 3. 配置数据库

```bash
# 切换到 postgres 用户
sudo -u postgres psql

# 在 PostgreSQL 中执行:
CREATE DATABASE youtube_learning;
CREATE USER youtube_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE youtube_learning TO youtube_user;
\q
```

#### 4. 部署应用代码

```bash
# 克隆项目
git clone https://github.com/your-username/youtube-learning-generator.git
cd youtube-learning-generator

# 安装后端依赖
cd backend
npm install
npm run build

# 安装前端依赖并构建
cd ../frontend
npm install
npm run build

# 返回项目根目录
cd ..
```

#### 5. 配置环境变量

```bash
# 创建生产环境配置
cd backend
cp .env.example .env

# 编辑环境变量
nano .env
```

```env
# 生产环境配置
NODE_ENV=production
PORT=3000

# 数据库配置
DATABASE_URL=postgresql://youtube_user:your_secure_password@localhost:5432/youtube_learning
REDIS_URL=redis://localhost:6379

# API 密钥
GROQ_API_KEY=your_groq_api_key
GEMINI_API_KEY=your_gemini_api_key

# Google OAuth (可选)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# 安全配置
JWT_SECRET=your_jwt_secret_key
CORS_ORIGIN=https://your-domain.com

# 文件存储
UPLOAD_DIR=/var/www/youtube-learning/uploads
```

#### 6. 运行数据库迁移

```bash
cd backend
npm run migrate
```

#### 7. 配置 Nginx

```bash
# 创建 Nginx 配置文件
sudo nano /etc/nginx/sites-available/youtube-learning
```

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # 前端静态文件
    root /home/ubuntu/youtube-learning-generator/frontend/dist;
    index index.html;

    # 前端路由处理
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 代理到后端
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 健康检查
    location /health {
        proxy_pass http://localhost:3000;
    }

    # 文件上传大小限制
    client_max_body_size 100M;
}
```

```bash
# 启用站点
sudo ln -s /etc/nginx/sites-available/youtube-learning /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 8. 使用 PM2 启动应用

```bash
# 创建 PM2 配置文件
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'youtube-learning-backend',
    cwd: './backend',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/youtube-learning/error.log',
    out_file: '/var/log/youtube-learning/out.log',
    log_file: '/var/log/youtube-learning/combined.log',
    time: true
  }]
}
```

```bash
# 创建日志目录
sudo mkdir -p /var/log/youtube-learning
sudo chown ubuntu:ubuntu /var/log/youtube-learning

# 启动应用
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### 9. 配置 SSL (使用 Let's Encrypt)

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx -y

# 获取 SSL 证书
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 自动续期
sudo crontab -e
# 添加: 0 12 * * * /usr/bin/certbot renew --quiet
```

### ☁️ Cloudflare Pages 部署教程

#### 1. 准备前端部署

```bash
# 构建前端
cd frontend
npm install
npm run build

# 生成静态文件在 dist/ 目录
```

#### 2. Cloudflare Pages 配置

1. **连接 GitHub 仓库**
   - 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
   - 进入 "Pages" → "Create a project"
   - 连接你的 GitHub 仓库

2. **构建设置**
   ```yaml
   Framework preset: Vite
   Build command: cd frontend && npm install && npm run build
   Build output directory: frontend/dist
   Root directory: /
   ```

3. **环境变量配置**
   ```env
   NODE_VERSION=20
   VITE_API_URL=https://your-backend-api.com
   VITE_APP_URL=https://your-app.pages.dev
   ```

#### 3. 后端部署到 Cloudflare Workers (可选)

```bash
# 安装 Wrangler CLI
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 初始化 Workers 项目
cd backend
npx create-cloudflare-app worker-backend worker

# 配置 wrangler.toml
```

```toml
name = "youtube-learning-api"
main = "src/index.js"
compatibility_date = "2024-01-01"

[env.production]
vars = { NODE_ENV = "production" }

[[env.production.kv_namespaces]]
binding = "CACHE"
id = "your-kv-namespace-id"

[env.production.durable_objects]
bindings = [
  { name = "RATE_LIMITER", class_name = "RateLimiter" }
]
```

#### 4. 数据库配置 (Cloudflare D1 或外部)

```bash
# 使用 Cloudflare D1 (SQLite)
wrangler d1 create youtube-learning-db

# 或使用外部 PostgreSQL 服务
# 推荐: Supabase, PlanetScale, Neon
```

### 🔒 安全配置最佳实践

#### 1. 环境变量安全

```bash
# 使用 AWS Systems Manager Parameter Store
aws ssm put-parameter --name "/youtube-learning/groq-api-key" --value "your-key" --type "SecureString"

# 或使用 AWS Secrets Manager
aws secretsmanager create-secret --name "youtube-learning/api-keys" --secret-string '{"groq":"your-key","gemini":"your-key"}'
```

#### 2. 防火墙配置

```bash
# UFW 防火墙设置
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

#### 3. 定期备份

```bash
# 创建备份脚本
cat > /home/ubuntu/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump youtube_learning > /home/ubuntu/backups/db_backup_$DATE.sql
aws s3 cp /home/ubuntu/backups/db_backup_$DATE.sql s3://your-backup-bucket/
find /home/ubuntu/backups -name "*.sql" -mtime +7 -delete
EOF

chmod +x /home/ubuntu/backup.sh

# 设置定时备份
crontab -e
# 添加: 0 2 * * * /home/ubuntu/backup.sh
```

### 📊 监控和日志

#### 1. 系统监控

```bash
# 安装监控工具
sudo apt install htop iotop -y

# PM2 监控
pm2 monit

# 日志查看
pm2 logs
tail -f /var/log/nginx/access.log
```

#### 2. 性能优化

```nginx
# Nginx 性能优化
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/css text/javascript application/javascript application/json;

# 静态文件缓存
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 🚨 故障排除

#### 常见部署问题

1. **数据库连接问题**
   ```bash
   # 检查 PostgreSQL 状态
   sudo systemctl status postgresql
   
   # 测试连接
   psql -h localhost -U youtube_user -d youtube_learning
   ```

2. **端口占用**
   ```bash
   # 检查端口使用
   sudo netstat -tlnp | grep :3000
   
   # 杀死占用进程
   sudo kill -9 <PID>
   ```

3. **PM2 进程问题**
   ```bash
   # 重启应用
   pm2 restart youtube-learning-backend
   
   # 查看错误日志
   pm2 logs --err
   ```

4. **SSL 证书问题**
   ```bash
   # 检查证书状态
   sudo certbot certificates
   
   # 手动续期
   sudo certbot renew
   ```

### 📈 扩展性考虑

#### 1. 负载均衡
- 使用 AWS ALB 或 Cloudflare Load Balancer
- 多实例部署

#### 2. 数据库优化
- 读写分离
- 连接池配置
- 索引优化

#### 3. 缓存策略
- Redis 集群
- CDN 配置
- 应用层缓存

---

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

---

*将每个YouTube视频转化为你的专属学习材料* 📚✨