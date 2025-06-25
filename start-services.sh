#!/bin/bash

echo "🚀 启动服务..."
echo "================================================"

# 函数：停止占用端口的进程
kill_port() {
    local port=$1
    local service_name=$2
    
    if lsof -i :$port >/dev/null 2>&1; then
        echo "🔄 清理端口 $port ($service_name)..."
        local pids=$(lsof -ti :$port 2>/dev/null)
        for pid in $pids; do
            kill $pid 2>/dev/null
            sleep 1
            if kill -0 $pid 2>/dev/null; then
                kill -9 $pid 2>/dev/null
            fi
        done
        echo "✅ 端口 $port 已清理"
    fi
}

# 1. 启动数据库服务
echo "1️⃣ 启动数据库服务..."
brew services start postgresql@14 2>/dev/null || brew services start postgresql >/dev/null 2>&1
brew services start redis >/dev/null 2>&1
sleep 2

# 2. 清理并启动后端
echo "2️⃣ 启动后端服务..."
kill_port 3000 "后端服务"
(cd backend && npm start 2>&1 | tee ../backend.log &)
echo "✅ 后端服务已启动 (端口 3000)"
sleep 3

# 3. 清理并启动前端
echo "3️⃣ 启动前端服务..."
kill_port 5173 "前端服务"
kill_port 5174 "前端服务备用"
(cd frontend && npm run dev 2>&1 | tee ../frontend.log &)
echo "✅ 前端服务已启动 (端口 5173)"
sleep 3

# 4. 检查服务状态
echo "4️⃣ 检查服务状态..."
echo "================================================"

if curl -s http://localhost:3000/health >/dev/null 2>&1; then
    echo "✅ 后端服务正常: http://localhost:3000"
else
    echo "❌ 后端服务异常"
fi

if curl -s http://localhost:5173 >/dev/null 2>&1; then
    echo "✅ 前端服务正常: http://localhost:5173"
elif curl -s http://localhost:5174 >/dev/null 2>&1; then
    echo "✅ 前端服务正常: http://localhost:5174"
else
    echo "❌ 前端服务异常"
fi

echo ""
echo "🎉 服务启动完成！"
echo "🌐 前端: http://localhost:5173"
echo "🔗 后端: http://localhost:3000"
echo ""
echo "💡 运行 ./stop-services.sh 停止服务"
echo "💡 运行 ./check-ports.sh 检查状态"
echo ""