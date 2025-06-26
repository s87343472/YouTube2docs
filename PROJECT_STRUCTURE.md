# YouTube智能学习资料生成器 - 项目结构

## 📁 项目目录结构

```
youtube-learning-generator/
├── README.md                           # 项目主要说明文档
├── .gitignore                          # Git忽略文件配置
├── package.json                        # 项目元信息和脚本
├── 
├── 📁 backend/                         # 后端服务
│   ├── package.json                    # 后端依赖配置
│   ├── tsconfig.json                   # TypeScript配置
│   ├── start-backend.sh               # 后端启动脚本
│   └── src/                            # 源代码目录
│       ├── index.ts                    # 应用入口点
│       ├── config/                     # 配置管理
│       │   ├── index.ts               # 主配置文件
│       │   ├── database.ts            # 数据库配置
│       │   └── apis.ts                # API配置
│       ├── routes/                     # API路由
│       │   ├── videoRoutes.ts         # 视频处理路由
│       │   ├── authRoutes.ts          # 认证路由
│       │   ├── quotaRoutes.ts         # 配额管理路由
│       │   ├── cacheRoutes.ts         # 缓存管理路由
│       │   └── shareRoutes.ts         # 分享功能路由
│       ├── services/                   # 业务服务层
│       │   ├── videoProcessor.ts      # 视频处理服务
│       │   ├── audioProcessor.ts      # 音频处理服务
│       │   ├── transcriptionService.ts # 转录服务
│       │   ├── contentAnalyzer.ts     # 内容分析服务
│       │   ├── knowledgeGraphService.ts # 知识图谱服务
│       │   ├── quotaService.ts        # 配额管理服务
│       │   └── cronService.ts         # 定时任务服务
│       ├── middleware/                 # 中间件
│       │   ├── auth.ts                # 认证中间件
│       │   ├── logging.ts             # 日志中间件
│       │   └── validation.ts          # 验证中间件
│       ├── utils/                      # 工具函数
│       │   ├── logger.ts              # 日志工具
│       │   └── database.ts            # 数据库工具
│       ├── types/                      # TypeScript类型定义
│       │   ├── index.ts               # 主要类型定义
│       │   └── error-extensions.d.ts  # 错误类型扩展
│       └── errors/                     # 错误处理
│           ├── index.ts               # 自定义错误类
│           └── errorHandler.ts        # 全局错误处理
│
├── 📁 frontend/                        # 前端应用
│   ├── package.json                    # 前端依赖配置
│   ├── vite.config.ts                 # Vite构建配置
│   ├── tsconfig.json                   # TypeScript配置
│   ├── tailwind.config.js             # Tailwind CSS配置
│   ├── index.html                      # HTML入口
│   └── src/                            # 源代码目录
│       ├── main.tsx                    # 应用入口
│       ├── App.tsx                     # 主应用组件
│       ├── pages/                      # 页面组件
│       │   ├── HomePage.tsx           # 首页
│       │   ├── ProcessPage.tsx        # 处理页面
│       │   ├── ResultPage.tsx         # 结果页面
│       │   └── UserCenterPage.tsx     # 用户中心
│       ├── components/                 # 可复用组件
│       │   ├── layout/                # 布局组件
│       │   └── ui/                    # UI组件
│       ├── services/                   # 前端服务
│       │   └── api.ts                 # API调用服务
│       ├── hooks/                      # 自定义Hook
│       │   └── useQuotaCheck.ts       # 配额检查Hook
│       └── types/                      # 类型定义
│
├── 📁 database/                        # 数据库相关
│   ├── migrations/                     # 数据库迁移文件
│   │   ├── 001_initial_schema.sql     # 初始数据库结构
│   │   ├── 005_create_users.sql       # 用户表
│   │   ├── 007_create_user_quota_system.sql # 配额系统
│   │   └── ...                        # 其他迁移文件
│   └── seeds/                          # 种子数据
│       └── 001_sample_data.sql        # 示例数据
│
├── 📁 scripts/                         # 部署和运维脚本
│   ├── install-dependencies.sh        # 依赖安装脚本
│   ├── setup-database.sh             # 数据库设置脚本
│   ├── start-backend.sh               # 后端启动脚本
│   ├── start-frontend.sh              # 前端启动脚本
│   └── verify-deployment.sh           # 部署验证脚本
│
├── 📁 docker/                          # Docker配置
│   ├── Dockerfile.backend             # 后端Docker文件
│   ├── Dockerfile.frontend            # 前端Docker文件
│   └── docker-compose.yml             # Docker编排配置
│
└── 📁 docs/                            # 项目文档
    ├── DEPLOYMENT_GUIDE.md            # 部署指南
    └── logs/                           # 开发日志
```

## 📚 核心文档

- `README.md` - 项目主要说明和快速开始指南
- `DATABASE_INITIALIZATION_GUIDE.md` - 数据库初始化指南
- `FEATURE_IMPLEMENTATION_STATUS.md` - 功能实现状态
- `SECURITY.md` - 安全相关说明
- `SUBSCRIPTION_MANAGEMENT.md` - 订阅管理文档

## 🚀 快速开始

1. **安装依赖**
   ```bash
   # 后端
   cd backend && npm install
   
   # 前端
   cd frontend && npm install
   ```

2. **配置环境变量**
   ```bash
   cp backend/.env.example backend/.env
   # 编辑 .env 文件配置必要的环境变量
   ```

3. **初始化数据库**
   ```bash
   ./scripts/setup-database.sh
   ```

4. **启动服务**
   ```bash
   # 启动后端
   cd backend && npm run dev
   
   # 启动前端
   cd frontend && npm run dev
   ```

## 📝 开发说明

- 后端使用 **Fastify + TypeScript** 构建
- 前端使用 **React + TypeScript + Vite + Tailwind CSS**
- 数据库使用 **PostgreSQL** 和 **Redis**
- 支持 **Docker** 容器化部署
- 完整的 **TypeScript** 类型支持，零编译错误
- 结构化日志系统和错误处理
- 完善的用户配额管理系统

## 🔧 构建和部署

```bash
# 构建后端
cd backend && npm run build

# 构建前端
cd frontend && npm run build

# 使用Docker部署
docker-compose up -d
```

项目已完成核心功能实现，代码质量优秀，ready for production！