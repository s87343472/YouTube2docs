#!/bin/bash

# 前端启动脚本
set -e

echo "🎨 启动前端服务..."

# 进入前端目录
cd "$(dirname "$0")/../frontend"

# 检查依赖是否安装
if [ ! -d "node_modules" ]; then
    echo "安装前端依赖..."
    npm install
fi

# 检查环境配置文件
if [ ! -f ".env.local" ]; then
    echo "创建前端环境配置..."
    cat > .env.local << 'EOF'
VITE_API_BASE_URL=http://localhost:3000
EOF
fi

# 启动服务
echo "启动前端服务 (端口 5173)..."
npm run dev