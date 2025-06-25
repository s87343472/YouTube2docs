#!/bin/bash
echo "检查服务状态..."
echo ""

# 检查后端
echo "🔧 后端服务 (端口 3000):"
if curl -s http://localhost:3000/health &> /dev/null; then
    echo "  ✅ 运行正常"
    curl -s http://localhost:3000/health | jq . 2>/dev/null || curl -s http://localhost:3000/health
else
    echo "  ❌ 服务不可用"
fi

echo ""

# 检查前端
echo "📱 前端服务 (端口 5173):"
if curl -s http://localhost:5173 &> /dev/null; then
    echo "  ✅ 运行正常"
else
    echo "  ❌ 服务不可用"
fi

echo ""

# 检查端口占用
echo "📊 端口使用情况:"
echo "  后端端口 3000: $(lsof -i:3000 | wc -l) 个进程"
echo "  前端端口 5173: $(lsof -i:5173 | wc -l) 个进程"
