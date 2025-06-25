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

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

---

*将每个YouTube视频转化为你的专属学习材料* 📚✨