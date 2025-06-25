#!/bin/bash

echo "🔍 服务状态检查"
echo "================================================"

# 检查端口状态
check_port() {
    local port=$1
    local service_name=$2
    
    if lsof -i :$port >/dev/null 2>&1; then
        echo "✅ $service_name (端口 $port): 运行中"
        
        # 测试服务响应
        if [ "$port" = "3000" ]; then
            if curl -s http://localhost:$port/health >/dev/null 2>&1; then
                echo "   🟢 服务响应正常"
            else
                echo "   🔴 服务无响应"
            fi
        elif [ "$port" = "5173" ] || [ "$port" = "5174" ]; then
            if curl -s http://localhost:$port >/dev/null 2>&1; then
                echo "   🟢 服务响应正常"
            else
                echo "   🔴 服务无响应"
            fi
        fi
    else
        echo "❌ $service_name (端口 $port): 未运行"
    fi
}

# 检查服务状态
check_port 3000 "后端服务"
check_port 5173 "前端服务"
check_port 5174 "前端服务备用"

echo ""
echo "🔗 服务链接:"
echo "----------------------------------------"

if curl -s http://localhost:5173 >/dev/null 2>&1; then
    echo "🌐 前端: http://localhost:5173"
elif curl -s http://localhost:5174 >/dev/null 2>&1; then
    echo "🌐 前端: http://localhost:5174"
else
    echo "❌ 前端服务未运行"
fi

if curl -s http://localhost:3000/health >/dev/null 2>&1; then
    echo "🔗 后端: http://localhost:3000"
else
    echo "❌ 后端服务未运行"
fi

echo ""
echo "💡 常用命令:"
echo "启动服务: ./start-services.sh"
echo "停止服务: ./stop-services.sh"
echo "查看日志: tail -f backend.log 或 tail -f frontend.log"
echo ""