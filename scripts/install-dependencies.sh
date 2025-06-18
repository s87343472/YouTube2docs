#!/bin/bash

# 依赖安装脚本
set -e

echo "🔧 安装系统依赖..."

# 检测操作系统
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    echo "检测到 macOS 系统"
    
    # 检查 Homebrew
    if ! command -v brew &> /dev/null; then
        echo "安装 Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi
    
    # 安装依赖
    echo "安装必要依赖..."
    brew install node postgresql redis ffmpeg
    
    # 安装 yt-dlp
    if ! command -v yt-dlp &> /dev/null; then
        echo "安装 yt-dlp..."
        brew install yt-dlp
    fi
    
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    echo "检测到 Linux 系统"
    
    # 检测发行版
    if command -v apt-get &> /dev/null; then
        # Ubuntu/Debian
        echo "使用 apt 包管理器..."
        sudo apt-get update
        sudo apt-get install -y curl wget gnupg2 software-properties-common
        
        # 安装 Node.js
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
        
        # 安装其他依赖
        sudo apt-get install -y postgresql postgresql-contrib redis-server ffmpeg python3-pip
        
        # 安装 yt-dlp
        pip3 install yt-dlp
        
    elif command -v yum &> /dev/null; then
        # CentOS/RHEL
        echo "使用 yum 包管理器..."
        sudo yum update -y
        
        # 安装 Node.js
        curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
        sudo yum install -y nodejs
        
        # 安装其他依赖
        sudo yum install -y postgresql-server postgresql-contrib redis ffmpeg python3-pip
        
        # 安装 yt-dlp
        pip3 install yt-dlp
        
    else
        echo "不支持的 Linux 发行版"
        exit 1
    fi
    
else
    echo "不支持的操作系统: $OSTYPE"
    exit 1
fi

echo "✅ 系统依赖安装完成"