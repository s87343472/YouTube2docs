#!/bin/bash

echo "🛑 停止服务..."

# 函数：停止占用端口的进程
kill_port() {
    local port=$1
    local service_name=$2
    
    local pids=$(lsof -ti :$port 2>/dev/null)
    if [ -n "$pids" ]; then
        echo "🔪 停止 $service_name (端口 $port)..."
        for pid in $pids; do
            kill $pid 2>/dev/null
            sleep 1
            if kill -0 $pid 2>/dev/null; then
                kill -9 $pid 2>/dev/null
            fi
        done
    fi
}

# 停止服务
kill_port 3000 "后端服务"
kill_port 5173 "前端服务"
kill_port 5174 "前端服务备用"

# 清理进程
pkill -f "vite" 2>/dev/null || true
pkill -f "npm.*dev" 2>/dev/null || true
pkill -f "node.*dist/index.js" 2>/dev/null || true

# 验证结果
echo "📊 验证结果..."
all_clear=true

for port in 3000 5173 5174; do
    if lsof -i :$port >/dev/null 2>&1; then
        echo "❌ 端口 $port 仍被占用"
        all_clear=false
    fi
done

if [ "$all_clear" = "true" ]; then
    echo "✅ 所有端口已释放"
fi

echo "🎉 服务已停止！"
