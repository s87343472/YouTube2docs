# 认证系统 v2.0 - 完整文档

## 概述

本项目已从 Better Auth v1.2.10 迁移到自定义认证系统，解决了生产环境中的兼容性问题，并提供了更可靠的邮箱注册/登录和 Google OAuth 功能。

## 系统架构

### 核心组件

1. **JWT 服务** (`src/services/jwtService.ts`)
   - 生成和验证访问令牌（15分钟有效期）
   - 生成和验证刷新令牌（7天有效期）
   - 支持令牌对生成和自动刷新

2. **密码服务** (`src/services/passwordService.ts`)
   - bcrypt 密码哈希（12轮加密）
   - 密码强度验证
   - 弱密码检测

3. **用户服务** (`src/services/userService.ts`)
   - 用户注册、登录、更新
   - 密码验证
   - 用户查询和管理

4. **Google OAuth 服务** (`src/services/googleOAuthService.ts`)
   - Google OAuth 2.0 集成
   - 授权URL生成
   - 用户信息获取和账户关联

5. **用户计划集成服务** (`src/services/userPlanIntegrationService.ts`)
   - 新认证系统与现有配额系统的桥接
   - 用户ID映射管理
   - 计划状态同步

6. **数据库适配器** (`src/services/databaseAdapter.ts`)
   - 数据库模式验证和迁移
   - 新旧系统数据兼容性
   - 系统健康检查

### 认证中间件

**authMiddleware.ts** 提供以下中间件：

- `requireAuth`: 必需认证
- `optionalAuth`: 可选认证
- `requireVerifiedAuth`: 需要邮箱验证
- `requirePremiumAuth`: 需要高级计划
- `refreshTokenMiddleware`: 令牌刷新
- `adminAuthMiddleware`: 管理员认证
- `createQuotaMiddleware`: 配额检查

## API 端点

### 认证路由 (`/api/auth/`)

#### 用户注册
```
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "User Name",
  "confirmPassword": "SecurePassword123!"
}

Response:
{
  "success": true,
  "message": "注册成功",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "User Name",
      "plan": "free",
      "emailVerified": false
    },
    "accessToken": "jwt_access_token",
    "refreshToken": "jwt_refresh_token"
  }
}
```

#### 用户登录
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}

Response:
{
  "success": true,
  "message": "登录成功",
  "data": {
    "user": { /* 用户信息 */ },
    "accessToken": "jwt_access_token",
    "refreshToken": "jwt_refresh_token"
  }
}
```

#### Google OAuth 登录
```
GET /api/auth/google

Response:
{
  "success": true,
  "data": {
    "authUrl": "https://accounts.google.com/oauth/authorize?...",
    "state": "random_state_string"
  }
}
```

#### Google OAuth 回调
```
POST /api/auth/callback/google
Content-Type: application/json

{
  "code": "authorization_code_from_google",
  "state": "state_from_previous_request"
}

Response:
{
  "success": true,
  "message": "Google登录成功",
  "data": {
    "user": { /* 用户信息 */ },
    "accessToken": "jwt_access_token",
    "refreshToken": "jwt_refresh_token",
    "isNewUser": false
  }
}
```

#### 刷新令牌
```
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "jwt_refresh_token"
}

Response:
{
  "success": true,
  "data": {
    "accessToken": "new_jwt_access_token",
    "refreshToken": "new_jwt_refresh_token",
    "user": { /* 用户信息 */ }
  }
}
```

#### 获取当前用户信息
```
GET /api/auth/me
Authorization: Bearer <access_token>

Response:
{
  "success": true,
  "data": {
    "user": { /* 详细用户信息 */ },
    "subscription": { /* 订阅信息 */ },
    "quotaPlan": { /* 配额计划 */ },
    "quotaUsages": [ /* 配额使用情况 */ ],
    "alerts": [ /* 配额预警 */ ]
  }
}
```

#### 登出
```
POST /api/auth/logout
Authorization: Bearer <access_token>

Response:
{
  "success": true,
  "message": "登出成功"
}
```

#### 健康检查
```
GET /api/auth/health

Response:
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "service": "auth-system",
    "version": "2.0.0",
    "details": { /* 健康检查详情 */ }
  }
}
```

### 兼容性路由

为保持前端兼容性，以下旧路由仍然可用：

- `GET /api/user/me` → 重定向到 `/api/auth/me`
- `POST /api/auth/signout` → 重定向到 `/api/auth/logout`

## 数据库模式

### 新增表

#### user 表（主用户表）
```sql
CREATE TABLE "user" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    "emailVerified" BOOLEAN DEFAULT FALSE,
    image TEXT,
    plan VARCHAR(50) DEFAULT 'free',
    "monthlyQuota" INTEGER DEFAULT 3,
    "usedQuota" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### account 表（认证账户表）
```sql
CREATE TABLE account (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "accountId" VARCHAR(255) NOT NULL,
    "providerId" VARCHAR(50) NOT NULL,
    "userId" UUID NOT NULL,
    password TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE,
    UNIQUE("accountId", "providerId")
);
```

#### user_id_mapping 表（ID映射表）
```sql
CREATE TABLE user_id_mapping (
    numeric_id SERIAL PRIMARY KEY,
    string_id UUID NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 与现有系统的兼容性

新认证系统完全兼容现有的配额和订阅系统：

- `user_subscriptions` 表通过 `user_id_mapping` 表连接
- `quota_plans` 表无需修改
- `user_quota_usage` 表无需修改
- 所有现有 API 端点保持兼容

## 环境变量配置

确保以下环境变量已正确配置：

```bash
# JWT 配置
JWT_SECRET=your_jwt_secret_key_at_least_32_characters_long
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_different_from_jwt_secret

# Google OAuth 配置
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google

# 数据库配置
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=youtube_learning
POSTGRES_USER=youtube_app
POSTGRES_PASSWORD=your_secure_password

# 管理员邮箱配置（可选）
ADMIN_EMAILS=admin@yourdomain.com,admin2@yourdomain.com
```

## 安全特性

### 密码安全
- bcrypt 哈希，12轮加密
- 密码强度验证
- 弱密码检测
- 防止密码重用

### JWT 安全
- 短期访问令牌（15分钟）
- 长期刷新令牌（7天）
- 令牌签名验证
- 发行者和受众验证

### Google OAuth 安全
- 状态参数防CSRF攻击
- 授权码验证
- 安全的令牌交换

### API 安全
- 请求频率限制
- 输入验证和清洗
- 错误信息标准化
- 详细的安全日志

## 迁移指南

### 从 Better Auth 迁移

1. **数据迁移**：
   - 现有用户数据自动迁移到新的 `user` 表
   - 密码哈希保持兼容
   - Google 账户关联保持完整

2. **API 兼容性**：
   - 大部分现有 API 端点保持不变
   - 新增的认证端点提供更丰富的功能
   - 令牌格式从 Better Auth 迁移到标准 JWT

3. **前端更新**：
   - 更新登录/注册表单的 API 端点
   - 更新令牌存储和刷新逻辑
   - 更新用户状态管理

### 测试迁移

使用内置测试工具验证迁移：

```bash
# 运行认证系统测试
npm run test:auth

# 或使用 TypeScript 直接运行
npx ts-node src/scripts/runAuthTests.ts
```

## 监控和维护

### 健康检查端点

- `GET /api/auth/health` - 认证系统健康状态
- `GET /health` - 整体系统健康状态

### 日志监控

关键事件会记录到日志：
- 用户注册和登录
- 令牌生成和验证
- Google OAuth 流程
- 数据库迁移状态
- 安全相关事件

### 定期维护

1. **令牌清理**：
   - 清理过期的刷新令牌
   - 监控令牌使用模式

2. **数据库维护**：
   - 定期检查数据一致性
   - 清理孤立的映射记录

3. **安全审计**：
   - 定期检查密码哈希强度
   - 监控异常登录活动

## 故障排除

### 常见问题

1. **Google OAuth 失败**
   - 检查 `GOOGLE_CLIENT_ID` 和 `GOOGLE_CLIENT_SECRET`
   - 验证重定向 URI 配置
   - 确认 Google Cloud Console 设置

2. **JWT 令牌无效**
   - 检查 `JWT_SECRET` 配置
   - 验证令牌未过期
   - 确认令牌格式正确

3. **数据库连接问题**
   - 检查数据库连接配置
   - 验证用户权限
   - 确认必需的表已创建

4. **配额系统集成问题**
   - 检查用户ID映射
   - 验证数据一致性
   - 运行数据库适配器健康检查

### 调试工具

```bash
# 检查数据库模式
npx ts-node -e "
import { databaseAdapter } from './src/services/databaseAdapter';
databaseAdapter.validateSchema().then(console.log);
"

# 检查用户计划集成
npx ts-node -e "
import { userPlanIntegrationService } from './src/services/userPlanIntegrationService';
userPlanIntegrationService.healthCheck().then(console.log);
"

# 运行完整测试套件
npm run test:auth
```

## 更新日志

### v2.0.0 (2024-06-26)
- 完全替换 Better Auth 系统
- 新增自定义 JWT 认证
- 改进的 Google OAuth 集成
- 完整的配额系统兼容性
- 增强的安全特性
- 完整的数据迁移支持

---

**注意**：此文档涵盖了认证系统 v2.0 的所有核心功能。如需更详细的 API 文档，请参考各服务文件中的 JSDoc 注释。