# Better Auth 清理记录

## 已清理的文件和代码

### 删除的文件
1. `backend/src/routes/betterAuthRoutes.ts.disabled`
2. `backend/src/lib/auth.ts.backup.broken`

### 修改的文件
1. `frontend/src/lib/auth-client.ts` - 移除Better Auth依赖，改为纯JWT系统
2. `frontend/package.json` - 移除better-auth依赖包

### 移除的依赖包
- better-auth
- d3 (未使用)
- @types/d3 (未使用)
- force-graph (未使用) 
- react-force-graph (未使用)

## 保留的相关文件（需要注意）
1. `database/migrations/006_better_auth_tables.sql` - 保留数据库结构，因为与现有用户系统兼容
2. 后端认证系统已完全迁移到自定义JWT系统

## 修复的问题
1. 知识图谱可视化渲染问题 - 移除自定义nodeCanvasObject，使用默认渲染
2. 前端认证客户端统一使用JWT API端点
3. 清理未使用的依赖包，减少包体积

## 注意事项
- 数据库迁移文件保留是为了兼容性，实际使用的是自定义JWT系统
- 如果需要完全清理，可以考虑重构数据库表结构统一化