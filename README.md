# YouTube智能学习资料生成器

> 将YouTube教学视频转化为专业级、网状化学习资料的智能平台

## 🎯 产品特色

- **⚡ 极速生成**：2分钟完成视频到学习资料的转换
- **🧠 知识网络化**：生成概念关联图谱和AI解释
- **📚 专业品质**：教科书级别的结构化学习资料
- **🌍 多语言支持**：英文、中文、日语、韩语无缝处理
- **🎴 图文并茂**：可视化学习卡片和知识图谱

## 📁 项目结构

```
├── docs/                          # 项目文档
│   ├── 产品需求文档.md              # 产品需求文档
│   ├── 开发计划.md                 # 开发计划
│   └── logs/                       # 开发日志
├── frontend/                       # 前端项目
│   ├── src/
│   │   ├── components/             # React组件
│   │   ├── pages/                  # 页面组件
│   │   ├── services/               # API服务
│   │   ├── hooks/                  # 自定义Hooks
│   │   ├── utils/                  # 工具函数
│   │   └── types/                  # TypeScript类型定义
│   └── public/                     # 静态资源
├── backend/                        # 后端项目
│   ├── src/
│   │   ├── routes/                 # API路由
│   │   ├── services/               # 业务逻辑
│   │   ├── models/                 # 数据模型
│   │   ├── middleware/             # 中间件
│   │   ├── utils/                  # 工具函数
│   │   └── config/                 # 配置文件
│   └── tests/                      # 测试文件
├── database/                       # 数据库相关
│   ├── migrations/                 # 数据库迁移
│   └── seeds/                      # 初始数据
├── docker/                         # Docker配置
└── scripts/                        # 构建脚本
```

## 🛠 技术栈

### 前端
- **框架**：React 18 + TypeScript
- **样式**：Tailwind CSS + Radix UI
- **状态管理**：Zustand
- **图表可视化**：D3.js
- **文件生成**：jsPDF + html-to-image

### 后端
- **运行时**：Node.js
- **框架**：Fastify
- **数据库**：PostgreSQL + Redis
- **任务队列**：Bull Queue
- **文件存储**：阿里云OSS

### 核心服务
- **音频转录**：Groq Whisper Large v3 Turbo
- **内容生成**：OpenAI GPT-4o
- **音频处理**：yt-dlp + FFmpeg

## 🚀 快速开始

### 环境要求
- Node.js >= 18.0.0
- PostgreSQL >= 14.0
- Redis >= 6.0
- FFmpeg

### 安装依赖
```bash
# 安装前端依赖
cd frontend
npm install

# 安装后端依赖
cd ../backend
npm install
```

### 环境配置
```bash
# 复制环境变量模板
cp backend/.env.example backend/.env

# 配置必要的API密钥
# - GROQ_API_KEY
# - OPENAI_API_KEY
# - DATABASE_URL
# - REDIS_URL
```

### 启动开发服务
```bash
# 启动后端服务
cd backend
npm run dev

# 启动前端服务
cd frontend
npm run dev
```

## 📊 开发进度

### Week 1-2: 基础架构搭建
- [x] 项目目录结构创建
- [x] Git版本管理初始化
- [ ] 前端基础框架搭建
- [ ] 后端基础服务搭建
- [ ] 第三方服务集成测试

### Week 3-4: 核心功能开发
- [ ] 视频处理pipeline开发
- [ ] 内容生成系统
- [ ] 用户认证系统

### Week 5-6: 知识网络化功能
- [ ] 知识图谱生成系统
- [ ] AI解释功能
- [ ] 学习卡片生成器

### Week 7-8: 用户体验优化
- [ ] 前端界面完善
- [ ] 文件导出功能
- [ ] 移动端适配
- [ ] 测试与部署

## 🎯 核心功能

### 视频处理流程
1. **视频信息提取** (10秒) - 获取YouTube视频基本信息
2. **音频提取与预处理** (20秒) - 使用yt-dlp提取高质量音频
3. **超速音频转录** (30秒) - Groq Whisper v3 Turbo转录
4. **智能内容分析** (60秒) - GPT-4分析生成结构化内容
5. **知识图谱生成** (30秒) - 概念关联和知识网络构建
6. **学习卡片生成** (15秒) - 个性化学习辅助材料

### 输出格式
- 📄 结构化学习笔记
- 🧠 交互式知识图谱
- 🎴 学习回顾卡片
- 📚 概念扩展解释
- 📥 多格式导出（PDF/Markdown/图片）

## 🔄 版本计划

- **v1.0 (MVP)**: 基础视频处理和学习资料生成
- **v1.1**: 用户系统和批量处理
- **v1.2**: 付费功能和社交分享
- **v1.3**: AI问答和学习路径推荐

## 📝 开发日志

开发日志记录在 `docs/logs/` 目录下，按日期组织：
- 每日开发进展
- 技术决策记录
- 问题解决方案
- 功能测试结果

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 📞 联系方式

- 项目地址：[GitHub Repository](https://github.com/username/youtube-learning-generator)
- 问题反馈：[Issues](https://github.com/username/youtube-learning-generator/issues)

---

*让每个YouTube视频都成为你的专属教科书* 📚✨