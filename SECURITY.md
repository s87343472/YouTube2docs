# 🔒 安全配置指南

## ⚠️ 重要安全提醒

本项目已经进行了安全检查和修复，确保不会意外提交敏感信息。

### 已修复的安全问题

1. **✅ 移除了包含真实API密钥的 `.env` 文件**
2. **✅ 添加了完善的 `.gitignore` 规则**
3. **✅ 创建了安全的 `.env.example` 模板**

### 🔧 环境配置

#### 1. 后端配置 (`backend/.env`)

复制模板并配置您自己的密钥：

```bash
cp backend/.env.example backend/.env
```

然后在 `backend/.env` 中配置：

```env
# 必需的API密钥 - 请替换为您自己的密钥
GROQ_API_KEY=your_actual_groq_key_here
GEMINI_API_KEY=your_actual_gemini_key_here

# 数据库配置
DATABASE_URL=postgresql://your_username@localhost:5432/youtube_learning
DB_USER=your_username
DB_PASSWORD=your_password
```

#### 2. 前端配置 (`frontend/.env.local`)

```bash
cp frontend/.env.example frontend/.env.local
```

### 🛡️ 安全最佳实践

1. **永远不要提交 `.env` 文件**
2. **API密钥应该保密，不能分享**
3. **定期轮换API密钥**
4. **使用不同的密钥用于开发和生产环境**

### 📋 获取API密钥

- **Groq API**: https://console.groq.com/
- **Google Gemini API**: https://makersuite.google.com/

### 🚨 如果发现安全问题

如果您发现项目中有任何安全问题，请：

1. **不要**在公开的issue中报告
2. 直接联系维护者
3. 等待修复后再公开

### ✅ 安全检查清单

- [ ] `.env` 文件在 `.gitignore` 中
- [ ] 所有API密钥都是示例值
- [ ] 生产环境使用独立的密钥
- [ ] 定期检查提交历史中的敏感信息