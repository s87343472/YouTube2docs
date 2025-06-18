#!/bin/bash

# 数据库设置脚本
set -e

echo "🗄️ 设置数据库..."

# 检测操作系统并启动服务
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    echo "启动 macOS 服务..."
    
    # 启动 PostgreSQL
    if command -v brew &> /dev/null; then
        brew services start postgresql@14 2>/dev/null || brew services start postgresql
        brew services start redis
    fi
    
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    echo "启动 Linux 服务..."
    
    # 启动 PostgreSQL
    if command -v systemctl &> /dev/null; then
        sudo systemctl start postgresql
        sudo systemctl enable postgresql
        sudo systemctl start redis-server
        sudo systemctl enable redis-server
    else
        sudo service postgresql start
        sudo service redis-server start
    fi
    
    # 初始化 PostgreSQL (如果需要)
    if [ ! -d "/var/lib/postgresql/data" ]; then
        sudo postgresql-setup initdb 2>/dev/null || true
    fi
fi

# 等待服务启动
echo "等待服务启动..."
sleep 5

# 检查 PostgreSQL 连接
if command -v psql &> /dev/null; then
    echo "检查 PostgreSQL 连接..."
    
    # 尝试连接并创建数据库
    if sudo -u postgres psql -c "SELECT 1;" &> /dev/null; then
        echo "PostgreSQL 连接成功"
        
        # 创建数据库和用户
        echo "创建数据库和用户..."
        sudo -u postgres psql << EOF
-- 创建数据库用户
CREATE USER youtube_learner WITH PASSWORD 'youtube_password';

-- 创建数据库
CREATE DATABASE youtube_learning OWNER youtube_learner;

-- 授予权限
GRANT ALL PRIVILEGES ON DATABASE youtube_learning TO youtube_learner;

-- 创建必要的扩展
\c youtube_learning
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\q
EOF
        
        echo "数据库设置完成"
        
        # 更新环境变量
        if [ -f backend/.env ]; then
            sed -i.bak 's|DATABASE_URL=.*|DATABASE_URL=postgresql://youtube_learner:youtube_password@localhost:5432/youtube_learning|' backend/.env
        fi
        
    else
        echo "⚠️ PostgreSQL 连接失败，将使用 SQLite"
    fi
else
    echo "⚠️ PostgreSQL 未安装，将使用 SQLite"
fi

# 检查 Redis 连接
if command -v redis-cli &> /dev/null; then
    echo "检查 Redis 连接..."
    
    if redis-cli ping | grep -q "PONG"; then
        echo "Redis 连接成功"
    else
        echo "⚠️ Redis 连接失败，将使用内存缓存"
    fi
else
    echo "⚠️ Redis 未安装，将使用内存缓存"
fi

echo "✅ 数据库设置完成"