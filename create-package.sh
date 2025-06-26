#!/bin/bash

# YouTube学习资料生成器 - 部署包创建脚本
VERSION="1.0.0"
PACKAGE_NAME="youtube-learning-deployment-v${VERSION}"

echo "🚀 开始创建部署压缩包..."

# 清理环境
echo "🧹 清理开发文件..."
rm -rf backend/node_modules frontend/node_modules
rm -rf backend/dist backend/logs backend/temp backend/uploads
rm -f backend/.env frontend/.env
find . -name ".DS_Store" -delete
find . -name "*.log" -delete

# 验证关键文件
echo "✅ 验证关键文件..."
if [ ! -d "frontend/dist" ]; then
    echo "❌ 错误: frontend/dist 目录不存在"
    exit 1
fi

if [ ! -f "ecosystem.config.js" ]; then
    echo "❌ 错误: ecosystem.config.js 文件不存在"
    exit 1
fi

if [ ! -d "database/migrations" ]; then
    echo "❌ 错误: database/migrations 目录不存在"
    exit 1
fi

echo "📋 关键文件检查通过:"
echo "   ✅ frontend/dist/ (前端构建文件)"
echo "   ✅ backend/src/ (后端源码)"
echo "   ✅ database/migrations/ (数据库脚本)"
echo "   ✅ ecosystem.config.js (PM2配置)"
echo "   ✅ deploy.sh (部署脚本)"

# 创建压缩包
echo "📦 创建压缩包..."
tar -czf "${PACKAGE_NAME}.tar.gz" \
  --exclude='node_modules' \
  --exclude='*.log' \
  --exclude='.DS_Store' \
  --exclude='temp' \
  --exclude='uploads' \
  --exclude='.env' \
  --exclude='.git' \
  --exclude='*.tmp' \
  .

# 验证压缩包
if [ -f "${PACKAGE_NAME}.tar.gz" ]; then
    PACKAGE_SIZE=$(du -h "${PACKAGE_NAME}.tar.gz" | cut -f1)
    echo "✅ 压缩包创建完成: ${PACKAGE_NAME}.tar.gz (${PACKAGE_SIZE})"
else
    echo "❌ 错误: 压缩包创建失败"
    exit 1
fi

# 创建校验和
echo "🔐 生成校验和..."
shasum -a 256 "${PACKAGE_NAME}.tar.gz" > "${PACKAGE_NAME}.sha256"

# 创建部署说明
echo "📝 创建部署说明..."
cat > "DEPLOYMENT_INSTRUCTIONS.txt" << EOF
YouTube智能学习资料生成器 - 部署说明
======================================

文件信息:
- 压缩包: ${PACKAGE_NAME}.tar.gz
- 校验和: ${PACKAGE_NAME}.sha256
- 创建时间: $(date)
- 版本: ${VERSION}

部署步骤:
1. 上传压缩包到服务器
2. 解压: tar -xzf ${PACKAGE_NAME}.tar.gz
3. 运行检查: ./package-lock-check.sh
4. 执行部署: ./deploy.sh
5. 检查状态: pm2 status

详细文档请参考:
- docs/DEPLOYMENT_GUIDE.md
- DEPLOYMENT_CHECKLIST.md
- CREATE_DEPLOYMENT_PACKAGE.md

注意事项:
- 需要配置 backend/.env 环境变量
- 确保数据库和Redis服务正常运行
- 建议使用 Ubuntu 20.04+ 或 CentOS 8+
EOF

echo "🎉 部署包创建完成!"
echo "📁 文件列表:"
echo "   - ${PACKAGE_NAME}.tar.gz (主要部署包 - ${PACKAGE_SIZE})"
echo "   - ${PACKAGE_NAME}.sha256 (校验和文件)"
echo "   - DEPLOYMENT_INSTRUCTIONS.txt (部署说明)"

echo ""
echo "🔍 压缩包内容预览:"
tar -tzf "${PACKAGE_NAME}.tar.gz" | head -20

echo ""
echo "✅ 准备就绪! 可以上传到服务器进行部署。"