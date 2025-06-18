#!/bin/bash

# 后端启动脚本
set -e

echo "🚀 启动后端服务..."

# 进入后端目录
cd "$(dirname "$0")/../backend"

# 检查依赖是否安装
if [ ! -d "node_modules" ]; then
    echo "安装后端依赖..."
    npm install
fi

# 检查环境配置文件
if [ ! -f ".env" ]; then
    echo "创建默认环境配置..."
    cat > .env << 'EOF'
NODE_ENV=development
PORT=3000
HOST=localhost
DATABASE_URL=postgresql://localhost:5432/youtube_learning
REDIS_URL=redis://localhost:6379
GROQ_API_KEY=your_groq_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=104857600
CORS_ORIGIN=http://localhost:5173
EOF
    echo "⚠️ 请编辑 backend/.env 文件，配置您的 API 密钥"
fi

# 创建必要目录
mkdir -p uploads logs

# 启动服务
echo "启动后端服务 (端口 3000)..."
npm run dev