#!/bin/bash

# YouTube智能学习资料生成器 - 一键部署脚本
# 版本: 1.0.0
# 作者: Claude Code
# 日期: 2025-06-17

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查命令是否存在
check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "$1 未安装，请先安装 $1"
        return 1
    fi
}

# 检查端口是否被占用
check_port() {
    if lsof -i:$1 &> /dev/null; then
        log_warning "端口 $1 已被占用"
        return 1
    fi
    return 0
}

# 检查系统依赖
check_dependencies() {
    log_info "检查系统依赖..."
    
    # 检查必需的命令
    local deps=("node" "npm" "git" "curl")
    for dep in "${deps[@]}"; do
        if ! check_command $dep; then
            log_error "缺少依赖: $dep"
            exit 1
        fi
    done
    
    # 检查Node.js版本
    local node_version=$(node --version | cut -d 'v' -f 2 | cut -d '.' -f 1)
    if [ "$node_version" -lt 18 ]; then
        log_error "Node.js 版本过低，需要 18.0 或更高版本"
        exit 1
    fi
    
    log_success "系统依赖检查通过"
}

# 检查可选依赖
check_optional_dependencies() {
    log_info "检查可选依赖..."
    
    # 检查PostgreSQL
    if check_command psql; then
        log_success "PostgreSQL 已安装"
    else
        log_warning "PostgreSQL 未安装，将使用SQLite作为数据库"
    fi
    
    # 检查Redis
    if check_command redis-cli; then
        log_success "Redis 已安装"
    else
        log_warning "Redis 未安装，将使用内存缓存"
    fi
    
    # 检查FFmpeg
    if check_command ffmpeg; then
        log_success "FFmpeg 已安装"
    else
        log_warning "FFmpeg 未安装，音频处理功能可能受限"
    fi
    
    # 检查yt-dlp
    if check_command yt-dlp; then
        log_success "yt-dlp 已安装"
    else
        log_warning "yt-dlp 未安装，将自动安装"
        if command -v pip3 &> /dev/null; then
            pip3 install yt-dlp
            log_success "yt-dlp 安装完成"
        else
            log_error "pip3 未安装，无法自动安装 yt-dlp"
        fi
    fi
}

# 检查端口可用性
check_ports() {
    log_info "检查端口可用性..."
    
    if check_port 3000; then
        log_success "端口 3000 (后端) 可用"
    else
        log_error "端口 3000 被占用，请停止占用该端口的进程"
        exit 1
    fi
    
    if check_port 5173; then
        log_success "端口 5173 (前端) 可用"
    else
        log_error "端口 5173 被占用，请停止占用该端口的进程"
        exit 1
    fi
}

# 创建环境配置文件
create_env_files() {
    log_info "创建环境配置文件..."
    
    # 后端环境配置
    if [ ! -f backend/.env ]; then
        cat > backend/.env << EOF
# 服务器配置
NODE_ENV=development
PORT=3000
HOST=localhost

# 数据库配置 (如果没有PostgreSQL，将自动使用SQLite)
DATABASE_URL=postgresql://localhost:5432/youtube_learning
REDIS_URL=redis://localhost:6379

# API配置 (请填入您的API密钥)
GROQ_API_KEY=your_groq_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# 文件存储
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=104857600

# CORS配置
CORS_ORIGIN=http://localhost:5173
EOF
        log_success "后端环境配置文件创建完成: backend/.env"
        log_warning "请编辑 backend/.env 文件，填入您的 API 密钥"
    else
        log_info "后端环境配置文件已存在"
    fi
    
    # 前端环境配置
    if [ ! -f frontend/.env.local ]; then
        cat > frontend/.env.local << EOF
VITE_API_BASE_URL=http://localhost:3000
EOF
        log_success "前端环境配置文件创建完成: frontend/.env.local"
    else
        log_info "前端环境配置文件已存在"
    fi
}

# 安装依赖
install_dependencies() {
    log_info "安装项目依赖..."
    
    # 安装后端依赖
    log_info "安装后端依赖..."
    cd backend
    npm install
    cd ..
    log_success "后端依赖安装完成"
    
    # 安装前端依赖
    log_info "安装前端依赖..."
    cd frontend
    npm install
    cd ..
    log_success "前端依赖安装完成"
}

# 创建必要的目录
create_directories() {
    log_info "创建必要目录..."
    
    mkdir -p backend/uploads
    mkdir -p backend/logs
    mkdir -p frontend/dist
    mkdir -p logs
    
    log_success "目录创建完成"
}

# 数据库初始化
setup_database() {
    log_info "初始化数据库..."
    
    if check_command psql; then
        log_info "检测到PostgreSQL，尝试创建数据库..."
        
        # 检查数据库是否存在
        if psql -lqt | cut -d \| -f 1 | grep -qw youtube_learning; then
            log_info "数据库已存在"
        else
            log_warning "数据库不存在，需要手动创建"
            log_info "请运行以下命令创建数据库:"
            echo "  createdb youtube_learning"
            echo "  或者使用 psql:"
            echo "  psql -c 'CREATE DATABASE youtube_learning;'"
        fi
    else
        log_warning "PostgreSQL 未安装，将使用SQLite数据库"
    fi
}

# 启动后端服务
start_backend() {
    log_info "启动后端服务..."
    
    cd backend
    
    # 创建启动脚本
    cat > start-backend.sh << 'EOF'
#!/bin/bash
echo "启动YouTube智能学习资料生成器后端服务..."
echo "时间: $(date)"
echo "端口: 3000"
echo "环境: development"
echo ""

# 设置环境变量
export NODE_ENV=development

# 启动服务
npm run dev
EOF
    
    chmod +x start-backend.sh
    
    # 在新终端中启动后端
    if command -v gnome-terminal &> /dev/null; then
        gnome-terminal -- bash -c "cd $(pwd) && ./start-backend.sh; read -p 'Press Enter to close...'"
    elif command -v xterm &> /dev/null; then
        xterm -e "cd $(pwd) && ./start-backend.sh; read -p 'Press Enter to close...'" &
    else
        log_info "请在新终端中运行以下命令启动后端:"
        echo "  cd backend && npm run dev"
        read -p "按回车键继续启动前端..."
    fi
    
    cd ..
    
    # 等待后端启动
    log_info "等待后端服务启动..."
    local timeout=30
    local count=0
    
    while [ $count -lt $timeout ]; do
        if curl -s http://localhost:3000/health &> /dev/null; then
            log_success "后端服务启动成功"
            break
        fi
        sleep 2
        count=$((count + 2))
        echo -n "."
    done
    
    if [ $count -ge $timeout ]; then
        log_warning "后端服务启动超时，请检查日志"
    fi
}

# 启动前端服务
start_frontend() {
    log_info "启动前端服务..."
    
    cd frontend
    
    # 创建启动脚本
    cat > start-frontend.sh << 'EOF'
#!/bin/bash
echo "启动YouTube智能学习资料生成器前端服务..."
echo "时间: $(date)"
echo "端口: 5173"
echo "后端API: http://localhost:3000"
echo ""

# 启动服务
npm run dev
EOF
    
    chmod +x start-frontend.sh
    
    # 在新终端中启动前端
    if command -v gnome-terminal &> /dev/null; then
        gnome-terminal -- bash -c "cd $(pwd) && ./start-frontend.sh; read -p 'Press Enter to close...'"
    elif command -v xterm &> /dev/null; then
        xterm -e "cd $(pwd) && ./start-frontend.sh; read -p 'Press Enter to close...'" &
    else
        log_info "请在新终端中运行以下命令启动前端:"
        echo "  cd frontend && npm run dev"
    fi
    
    cd ..
    
    # 等待前端启动
    log_info "等待前端服务启动..."
    local timeout=30
    local count=0
    
    while [ $count -lt $timeout ]; do
        if curl -s http://localhost:5173 &> /dev/null; then
            log_success "前端服务启动成功"
            break
        fi
        sleep 2
        count=$((count + 2))
        echo -n "."
    done
    
    if [ $count -ge $timeout ]; then
        log_warning "前端服务启动超时，请检查日志"
    fi
}

# 验证部署
verify_deployment() {
    log_info "验证部署状态..."
    
    # 检查后端健康状态
    if curl -s http://localhost:3000/health | grep -q "ok"; then
        log_success "后端服务健康检查通过"
    else
        log_error "后端服务健康检查失败"
        return 1
    fi
    
    # 检查前端可访问性
    if curl -s http://localhost:5173 &> /dev/null; then
        log_success "前端服务可正常访问"
    else
        log_error "前端服务无法访问"
        return 1
    fi
    
    # 检查API接口
    if curl -s http://localhost:3000/api/system/info | grep -q "ok"; then
        log_success "API接口响应正常"
    else
        log_error "API接口响应异常"
        return 1
    fi
    
    log_success "部署验证完成"
}

# 显示部署信息
show_deployment_info() {
    echo ""
    echo "================================="
    echo "🎉 部署完成！"
    echo "================================="
    echo ""
    echo "📱 前端地址: http://localhost:5173"
    echo "🔧 后端地址: http://localhost:3000"
    echo "🏥 健康检查: http://localhost:3000/health"
    echo "🧪 API测试: http://localhost:5173/api-test"
    echo "🎬 处理演示: http://localhost:5173/process-demo"
    echo ""
    echo "📋 下一步操作:"
    echo "1. 编辑 backend/.env 文件，配置您的 API 密钥"
    echo "2. 访问前端地址开始使用"
    echo "3. 查看部署指南: docs/部署指南.md"
    echo ""
    echo "🔧 管理命令:"
    echo "- 查看后端日志: cd backend && npm run dev"
    echo "- 查看前端日志: cd frontend && npm run dev"
    echo "- 停止服务: Ctrl+C"
    echo ""
}

# 创建快速操作脚本
create_management_scripts() {
    log_info "创建管理脚本..."
    
    # 状态检查脚本
    cat > check-status.sh << 'EOF'
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
EOF
    
    # 停止服务脚本
    cat > stop-services.sh << 'EOF'
#!/bin/bash
echo "停止所有服务..."

# 停止端口上的进程
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "node.*3000" 2>/dev/null || true
pkill -f "vite.*5173" 2>/dev/null || true

echo "服务已停止"
EOF
    
    # 重启服务脚本
    cat > restart-services.sh << 'EOF'
#!/bin/bash
echo "重启服务..."

# 停止现有服务
./stop-services.sh

# 等待进程完全停止
sleep 3

# 重新启动
./deploy.sh --restart-only
EOF
    
    chmod +x check-status.sh stop-services.sh restart-services.sh
    
    log_success "管理脚本创建完成"
}

# 主函数
main() {
    echo ""
    echo "🚀 YouTube智能学习资料生成器 - 一键部署"
    echo "================================================"
    echo ""
    
    # 解析命令行参数
    local restart_only=false
    for arg in "$@"; do
        case $arg in
            --restart-only)
                restart_only=true
                shift
                ;;
        esac
    done
    
    if [ "$restart_only" = false ]; then
        # 完整部署流程
        check_dependencies
        check_optional_dependencies
        check_ports
        create_env_files
        install_dependencies
        create_directories
        setup_database
        create_management_scripts
    fi
    
    # 启动服务
    start_backend
    sleep 5  # 给后端一些启动时间
    start_frontend
    sleep 5  # 给前端一些启动时间
    
    # 验证部署
    if verify_deployment; then
        show_deployment_info
    else
        log_error "部署验证失败，请检查错误信息"
        exit 1
    fi
}

# 错误处理
trap 'log_error "部署过程中发生错误，请检查上面的错误信息"; exit 1' ERR

# 运行主函数
main "$@"