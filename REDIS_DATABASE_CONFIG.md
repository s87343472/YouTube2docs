# Redis 数据库配置说明

## 当前配置

项目默认使用 **Redis database 2**（避免与0、1冲突）

## 配置方式

### 1. 通过 REDIS_URL 配置

```env
# 使用 database 2
REDIS_URL=redis://localhost:6379/2

# 如果有密码
REDIS_URL=redis://:password@localhost:6379/2

# 指定其他数据库（3、4、5等）
REDIS_URL=redis://localhost:6379/3
```

### 2. 如需要其他数据库编号

如果database 2也被占用，可以修改为其他编号：

```env
# 使用 database 3
REDIS_URL=redis://localhost:6379/3

# 使用 database 4  
REDIS_URL=redis://localhost:6379/4

# 等等...最多支持 0-15 (默认配置)
```

## 运维建议

### 推荐数据库分配
- **database 0**: 其他系统使用
- **database 1**: 其他系统使用  
- **database 2**: YouTube学习系统 ✅ (当前配置)
- **database 3-15**: 预留

### 验证配置
```bash
# 连接到指定数据库
redis-cli -n 2

# 查看当前数据库的key
redis-cli -n 2 keys "*"

# 清空指定数据库（小心使用）
redis-cli -n 2 flushdb
```

## 项目中的 Redis 使用

### 缓存类型
1. **视频处理缓存**: 避免重复处理相同视频
2. **用户会话缓存**: 登录状态和权限信息
3. **速率限制缓存**: API调用频次控制
4. **临时数据缓存**: 处理过程中的中间结果

### Key 命名规范
```
youtube_learning:cache:video:{hash}
youtube_learning:session:{user_id}
youtube_learning:rate_limit:{ip}:{endpoint}
youtube_learning:temp:{process_id}
```

## 部署时设置

### 1. 修改环境变量
```bash
# 编辑生产环境配置
nano backend/.env

# 设置Redis数据库
REDIS_URL=redis://localhost:6379/2
REDIS_PASSWORD=your_redis_password
```

### 2. 重启服务
```bash
pm2 restart youtube-learning-backend
```

### 3. 验证连接
```bash
# 查看应用日志
pm2 logs youtube-learning-backend

# 应该看到类似输出：
# ✅ Redis connected successfully
```

---

**更新时间**: 2024-12-25  
**推荐配置**: Redis database 2  
**状态**: 已更新配置文件