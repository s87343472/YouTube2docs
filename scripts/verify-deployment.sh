#!/bin/bash

# 部署验证脚本
set -e

echo "🔍 验证部署状态..."

# 检查后端服务
echo "检查后端服务..."
if curl -s http://localhost:3000/health | grep -q "ok"; then
    echo "✅ 后端健康检查通过"
    
    # 检查系统信息
    if curl -s http://localhost:3000/api/system/info | grep -q "ok"; then
        echo "✅ 系统信息接口正常"
    else
        echo "❌ 系统信息接口异常"
        exit 1
    fi
    
    # 检查视频服务健康
    echo "检查视频服务健康..."
    curl -s http://localhost:3000/api/videos/health | jq . 2>/dev/null || echo "视频服务健康检查响应"
    
else
    echo "❌ 后端服务不可用"
    exit 1
fi

# 检查前端服务
echo "检查前端服务..."
if curl -s http://localhost:5173 &> /dev/null; then
    echo "✅ 前端服务可访问"
else
    echo "❌ 前端服务不可用"
    exit 1
fi

# 检查API集成
echo "检查API集成..."
if curl -s http://localhost:3000/api/videos/test-extract \
    -H "Content-Type: application/json" \
    -d '{"youtubeUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}' | grep -q "success"; then
    echo "✅ API集成测试通过"
else
    echo "⚠️ API集成测试异常（可能需要配置API密钥）"
fi

# 检查依赖工具
echo "检查依赖工具..."

if command -v ffmpeg &> /dev/null; then
    echo "✅ FFmpeg 已安装"
else
    echo "⚠️ FFmpeg 未安装"
fi

if command -v yt-dlp &> /dev/null; then
    echo "✅ yt-dlp 已安装"
else
    echo "⚠️ yt-dlp 未安装"
fi

# 显示服务状态
echo ""
echo "📊 服务状态摘要:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 后端服务: http://localhost:3000"
echo "📱 前端服务: http://localhost:5173"
echo "🏥 健康检查: http://localhost:3000/health"
echo "🧪 API测试: http://localhost:5173/api-test"
echo "🎬 处理演示: http://localhost:5173/process-demo"
echo ""

# 显示环境信息
echo "🔧 环境信息:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"

if command -v psql &> /dev/null; then
    echo "PostgreSQL: $(psql --version | head -n1)"
else
    echo "PostgreSQL: 未安装"
fi

if command -v redis-cli &> /dev/null; then
    echo "Redis: $(redis-cli --version)"
else
    echo "Redis: 未安装"
fi

if command -v ffmpeg &> /dev/null; then
    echo "FFmpeg: $(ffmpeg -version | head -n1 | cut -d' ' -f3)"
else
    echo "FFmpeg: 未安装"
fi

if command -v yt-dlp &> /dev/null; then
    echo "yt-dlp: $(yt-dlp --version)"
else
    echo "yt-dlp: 未安装"
fi

echo ""
echo "✅ 部署验证完成"