# Google OAuth 配置说明

## 环境变量配置

在 `backend/.env` 文件中，更新以下配置：

```bash
# Google OAuth (可选 - 用于 Google 一键登录)
# 从 Google Cloud Console 获取
GOOGLE_CLIENT_ID=你的客户端ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=你的客户端密钥
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google
```

## Google Cloud Console 配置步骤

### 1. 访问 Google Cloud Console
- 打开 https://console.cloud.google.com/

### 2. 创建项目（如果需要）
- 点击顶部项目选择器
- 点击"新建项目"
- 项目名称：youtube-learning-generator
- 点击"创建"

### 3. 启用必要的 API
- 在左侧菜单：API和服务 → 库
- 搜索并启用：
  - Google+ API
  - Google Identity Toolkit API

### 4. 配置 OAuth 同意屏幕
- API和服务 → OAuth 同意屏幕
- 用户类型：外部
- 填写信息：
  - 应用名称：YouTube Learning Generator
  - 用户支持邮箱：你的邮箱
  - 应用网域（可选）
  - 开发者联系邮箱：你的邮箱
- 作用域：保持默认
- 测试用户：添加你的 Gmail 账号

### 5. 创建 OAuth 2.0 客户端 ID
- API和服务 → 凭据
- 点击"创建凭据" → "OAuth 客户端 ID"
- 应用类型：Web 应用
- 名称：YouTube Learning Web Client
- 授权的 JavaScript 来源：
  ```
  http://localhost:3000
  http://localhost:5173
  ```
- 授权的重定向 URI：
  ```
  http://localhost:3000/api/auth/callback/google
  ```
- 点击"创建"

### 6. 保存凭据
- 复制显示的客户端 ID 和客户端密钥
- 更新到 `.env` 文件中

## 生产环境配置

部署到生产环境时，需要：

1. 更新授权的 JavaScript 来源为你的域名：
   ```
   https://yourdomain.com
   ```

2. 更新授权的重定向 URI：
   ```
   https://yourdomain.com/api/auth/callback/google
   ```

3. 在 `.env` 中更新 `GOOGLE_REDIRECT_URI`

## 常见问题

1. **错误：redirect_uri_mismatch**
   - 确保重定向 URI 完全匹配
   - 检查是否包含端口号
   - 确认 http/https 协议正确

2. **错误：未经验证的应用**
   - 开发阶段这是正常的
   - 添加测试用户到 OAuth 同意屏幕
   - 生产环境需要提交应用审核

3. **错误：invalid_client**
   - 检查客户端 ID 和密钥是否正确
   - 确保没有多余的空格或换行符

## 测试登录

配置完成后：
1. 重启服务：`./stop-services.sh && ./start-services.sh`
2. 访问前端：http://localhost:5173
3. 点击"使用 Google 登录"按钮
4. 完成 Google 账号授权