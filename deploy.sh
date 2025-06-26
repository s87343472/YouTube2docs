#!/bin/bash

# YouTube智能学习资料生成器 - 一键部署脚本
# 版本: 1.0.1
# 作者: Claude Code
# 日期: 2024-12-25

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
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

log_title() {
    echo -e "${CYAN}============================================${NC}"
    echo -e "${CYAN} $1${NC}"
    echo -e "${CYAN}============================================${NC}"
}

# 用户确认函数
confirm() {
    local message="$1"
    local default="${2:-n}"
    
    if [ "$default" = "y" ]; then
        local prompt="${message} [Y/n]: "
    else
        local prompt="${message} [y/N]: "
    fi
    
    read -p "$prompt" -n 1 -r
    echo
    
    if [ "$default" = "y" ]; then
        [[ $REPLY =~ ^[Nn]$ ]] && return 1 || return 0
    else
        [[ $REPLY =~ ^[Yy]$ ]] && return 0 || return 1
    fi
}

# 显示系统依赖汇总
show_dependencies_summary() {
    log_title "系统依赖检查和安装向导"
    
    echo -e "${CYAN}本系统需要以下组件才能正常运行:${NC}"
    echo
    echo "🔧 基础环境:"
    echo "   - Node.js 18.0+ (JavaScript运行环境)"
    echo "   - npm/yarn (包管理器)"
    echo
    echo "🗄️ 数据存储:"
    echo "   - PostgreSQL 14+ (主数据库)"
    echo "   - Redis 6+ (缓存数据库，将使用database 2)"
    echo
    echo "🌐 Web服务:"
    echo "   - Nginx (反向代理和静态文件服务)"
    echo
    echo "⚙️ 进程管理:"
    echo "   - PM2 (Node.js进程管理器)"
    echo
    echo "📺 YouTube工具:"
    echo "   - yt-dlp (YouTube视频信息获取工具)"
    echo
    echo "📁 目录结构:"
    echo "   - /var/www/youtube-learning-app (应用目录)"
    echo "   - logs/ (日志目录)"
    echo "   - uploads/ (文件上传目录)"
    echo "   - temp/ (临时文件目录)"
    echo
    echo -e "${YELLOW}注意事项:${NC}"
    echo "- Redis将使用database 2 (避免与0、1冲突)"
    echo "- 需要配置API密钥: Groq、Google Gemini"
    echo "- 需要安装yt-dlp工具获取YouTube视频信息"
    echo "- 建议在Ubuntu 20.04+或CentOS 8+上运行"
    echo
    
    if ! confirm "是否继续进行系统检查和安装?" "y"; then
        log_info "部署已取消"
        exit 0
    fi
}

# 检查并提示安装Node.js
check_and_install_nodejs() {
    log_title "检查 Node.js"
    
    if command -v node >/dev/null 2>&1; then
        local node_version=$(node --version | sed 's/v//')
        local major_version=$(echo $node_version | cut -d. -f1)
        
        if [ "$major_version" -ge 18 ]; then
            log_success "Node.js $node_version 已安装且版本符合要求"
            return 0
        else
            log_warning "Node.js版本过低: $node_version (需要18.0+)"
        fi
    else
        log_warning "Node.js 未安装"
    fi
    
    if confirm "是否安装/更新 Node.js 18?"; then
        log_info "安装 Node.js 18..."
        if command -v apt >/dev/null 2>&1; then
            # Ubuntu/Debian
            curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
            sudo apt-get install -y nodejs
        elif command -v yum >/dev/null 2>&1; then
            # CentOS/RHEL
            curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
            sudo yum install -y nodejs
        else
            log_error "无法自动安装Node.js，请手动安装"
            exit 1
        fi
        log_success "Node.js 安装完成"
    else
        log_warning "跳过 Node.js 安装 - 请确保手动安装Node.js 18+"
    fi
}

# 检查并提示安装PostgreSQL
check_and_install_postgresql() {
    log_title "检查 PostgreSQL"
    
    if command -v psql >/dev/null 2>&1; then
        local pg_version=$(psql --version | awk '{print $3}' | cut -d. -f1)
        log_success "PostgreSQL $pg_version 已安装"
        return 0
    fi
    
    log_warning "PostgreSQL 未安装"
    
    if confirm "是否安装 PostgreSQL?"; then
        log_info "安装 PostgreSQL..."
        if command -v apt >/dev/null 2>&1; then
            sudo apt update
            sudo apt install -y postgresql postgresql-contrib
        elif command -v yum >/dev/null 2>&1; then
            sudo yum install -y postgresql-server postgresql-contrib
            sudo postgresql-setup initdb
        fi
        
        sudo systemctl enable postgresql
        sudo systemctl start postgresql
        log_success "PostgreSQL 安装完成"
        
        log_info "请记住稍后需要创建数据库用户和数据库"
    else
        log_warning "跳过 PostgreSQL 安装 - 请确保手动安装"
    fi
}

# 检查并提示安装Redis
check_and_install_redis() {
    log_title "检查 Redis"
    
    if command -v redis-server >/dev/null 2>&1; then
        log_success "Redis 已安装"
        return 0
    fi
    
    log_warning "Redis 未安装"
    
    if confirm "是否安装 Redis?"; then
        log_info "安装 Redis..."
        if command -v apt >/dev/null 2>&1; then
            sudo apt update
            sudo apt install -y redis-server
        elif command -v yum >/dev/null 2>&1; then
            sudo yum install -y redis
        fi
        
        sudo systemctl enable redis-server 2>/dev/null || sudo systemctl enable redis
        sudo systemctl start redis-server 2>/dev/null || sudo systemctl start redis
        log_success "Redis 安装完成"
        
        log_info "Redis将使用database 2，避免与其他应用冲突"
    else
        log_warning "跳过 Redis 安装 - 请确保手动安装"
    fi
}

# 检查并提示安装Nginx
check_and_install_nginx() {
    log_title "检查 Nginx"
    
    if command -v nginx >/dev/null 2>&1; then
        log_success "Nginx 已安装"
        return 0
    fi
    
    log_warning "Nginx 未安装"
    
    if confirm "是否安装 Nginx?"; then
        log_info "安装 Nginx..."
        if command -v apt >/dev/null 2>&1; then
            sudo apt update
            sudo apt install -y nginx
        elif command -v yum >/dev/null 2>&1; then
            sudo yum install -y nginx
        fi
        
        sudo systemctl enable nginx
        sudo systemctl start nginx
        log_success "Nginx 安装完成"
    else
        log_warning "跳过 Nginx 安装 - 请确保手动安装"
    fi
}

# 检查并安装PM2
check_and_install_pm2() {
    log_title "检查 PM2"
    
    if command -v pm2 >/dev/null 2>&1; then
        log_success "PM2 已安装"
        return 0
    fi
    
    log_warning "PM2 未安装"
    
    if confirm "是否安装 PM2?"; then
        log_info "安装 PM2..."
        if command -v npm >/dev/null 2>&1; then
            sudo npm install -g pm2
            log_success "PM2 安装完成"
        else
            log_error "npm未找到，无法安装PM2"
            exit 1
        fi
    else
        log_warning "跳过 PM2 安装 - 请确保手动安装"
    fi
}

# 检查并安装yt-dlp
check_and_install_ytdlp() {
    log_title "检查 yt-dlp"
    
    if command -v yt-dlp >/dev/null 2>&1; then
        local version=$(yt-dlp --version 2>/dev/null)
        log_success "yt-dlp $version 已安装"
        return 0
    fi
    
    log_warning "yt-dlp 未安装"
    log_info "yt-dlp是YouTube视频信息获取工具，项目必需"
    
    if confirm "是否安装 yt-dlp?"; then
        log_info "安装 yt-dlp..."
        
        # 优先使用系统包管理器
        if command -v apt >/dev/null 2>&1; then
            sudo apt update
            sudo apt install -y yt-dlp 2>/dev/null || {
                log_info "系统包不可用，使用pip安装..."
                if command -v pip3 >/dev/null 2>&1; then
                    sudo pip3 install yt-dlp
                elif command -v pip >/dev/null 2>&1; then
                    sudo pip install yt-dlp
                else
                    log_error "pip未找到，无法安装yt-dlp"
                    exit 1
                fi
            }
        elif command -v yum >/dev/null 2>&1; then
            if command -v pip3 >/dev/null 2>&1; then
                sudo pip3 install yt-dlp
            elif command -v pip >/dev/null 2>&1; then
                sudo pip install yt-dlp
            else
                log_error "pip未找到，无法安装yt-dlp"
                exit 1
            fi
        else
            log_error "无法自动安装yt-dlp，请手动安装"
            exit 1
        fi
        
        # 验证安装
        if command -v yt-dlp >/dev/null 2>&1; then
            log_success "yt-dlp 安装完成"
        else
            log_error "yt-dlp 安装失败"
            exit 1
        fi
    else
        log_warning "跳过 yt-dlp 安装 - 请确保手动安装"
        log_warning "注意: 没有yt-dlp，YouTube视频信息获取功能将受限"
    fi
}

# 创建必要目录
create_directories() {
    log_title "创建项目目录"
    
    local dirs=("logs" "uploads" "temp")
    
    for dir in "${dirs[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            log_success "创建目录: $dir"
        else
            log_info "目录已存在: $dir"
        fi
    done
    
    # 设置权限
    chmod 755 logs uploads temp
    log_success "目录权限设置完成"
}

# 安装项目依赖
install_dependencies() {
    log_title "安装项目依赖"
    
    # 后端依赖
    if [ -d "backend" ] && [ -f "backend/package.json" ]; then
        log_info "安装后端依赖..."
        cd backend
        
        if confirm "是否使用npm安装后端依赖?" "y"; then
            npm install
            log_success "后端依赖安装完成"
        else
            log_warning "跳过后端依赖安装"
        fi
        
        cd ..
    else
        log_error "backend目录或package.json不存在"
    fi
}

# 配置环境变量
configure_environment() {
    log_title "配置环境变量"
    
    if [ -f "backend/.env.production" ] && [ ! -f "backend/.env" ]; then
        if confirm "是否复制生产环境配置模板?" "y"; then
            cp backend/.env.production backend/.env
            log_success "环境配置文件已创建: backend/.env"
            
            log_warning "请编辑 backend/.env 文件，配置以下重要参数:"
            echo "  - GROQ_API_KEY (Groq API密钥)"
            echo "  - GEMINI_API_KEY (Google Gemini API密钥)"  
            echo "  - DATABASE_URL (PostgreSQL连接字符串)"
            echo "  - REDIS_PASSWORD (Redis密码)"
            echo "  - JWT_SECRET (JWT密钥)"
            echo "  - 注意: YouTube视频信息通过yt-dlp工具获取，无需API密钥"
            echo
            
            if confirm "是否现在编辑配置文件?"; then
                ${EDITOR:-nano} backend/.env
            fi
        fi
    elif [ -f "backend/.env" ]; then
        log_success "环境配置文件已存在: backend/.env"
    else
        log_error "找不到环境配置模板文件"
    fi
}

# 数据库初始化向导
setup_database() {
    log_title "数据库初始化向导"
    
    if confirm "是否现在初始化数据库?" "y"; then
        log_info "数据库初始化步骤:"
        echo "1. 创建PostgreSQL用户和数据库"
        echo "2. 运行数据库migration脚本"
        echo
        
        if confirm "是否继续数据库初始化?"; then
            log_info "请执行以下SQL命令创建数据库:"
            echo
            echo "sudo -u postgres psql"
            echo "CREATE USER youtube_app WITH PASSWORD 'your_secure_password';"
            echo "CREATE DATABASE youtube_learning_db OWNER youtube_app;"
            echo "GRANT ALL PRIVILEGES ON DATABASE youtube_learning_db TO youtube_app;"
            echo "\\q"
            echo
            
            if confirm "数据库用户和数据库是否已创建?"; then
                log_info "运行migration脚本..."
                
                if [ -d "database/migrations" ]; then
                    local migration_count=$(ls database/migrations/*.sql 2>/dev/null | wc -l)
                    log_info "找到 $migration_count 个migration文件"
                    
                    if confirm "是否运行所有migration脚本?"; then
                        read -p "请输入数据库连接信息 (默认: youtube_app@localhost:5432/youtube_learning_db): " db_connection
                        db_connection=${db_connection:-"postgresql://youtube_app@localhost:5432/youtube_learning_db"}
                        
                        for migration in database/migrations/*.sql; do
                            log_info "执行: $(basename $migration)"
                            psql "$db_connection" -f "$migration"
                        done
                        
                        log_success "数据库初始化完成"
                    fi
                else
                    log_error "找不到database/migrations目录"
                fi
            fi
        fi
    else
        log_warning "跳过数据库初始化 - 请手动执行"
    fi
}

# 启动服务
start_services() {
    log_title "启动应用服务"
    
    if [ -f "ecosystem.config.js" ]; then
        if confirm "是否使用PM2启动后端服务?" "y"; then
            log_info "启动后端服务..."
            pm2 start ecosystem.config.js --env production
            
            # 等待服务启动
            sleep 3
            
            pm2 status
            log_success "后端服务启动完成"
            
            # 保存PM2配置
            pm2 save
            
            if confirm "是否设置PM2开机自启?"; then
                pm2 startup
                log_success "PM2开机自启设置完成"
            fi
        fi
    else
        log_error "找不到ecosystem.config.js文件"
    fi
}

# 健康检查
health_check() {
    log_title "系统健康检查"
    
    log_info "检查服务状态..."
    
    # 检查PM2进程
    if command -v pm2 >/dev/null 2>&1; then
        pm2 list
    fi
    
    # 检查端口
    local backend_port=3001
    if lsof -i:$backend_port >/dev/null 2>&1; then
        log_success "后端服务 (端口$backend_port) 正在运行"
    else
        log_warning "后端服务 (端口$backend_port) 未运行"
    fi
    
    # 检查Nginx
    if systemctl is-active --quiet nginx; then
        log_success "Nginx 服务正在运行"
    else
        log_warning "Nginx 服务未运行"
    fi
    
    # 检查数据库连接
    if command -v psql >/dev/null 2>&1; then
        log_info "数据库连接检查请查看应用日志: pm2 logs"
    fi
}

# 显示完成信息
show_completion_info() {
    log_title "部署完成"
    
    log_success "🎉 YouTube智能学习资料生成器部署完成!"
    echo
    echo "📋 重要信息:"
    echo "  - 后端服务端口: 3001"
    echo "  - 前端文件目录: frontend/dist/"
    echo "  - 配置文件: backend/.env"
    echo "  - Redis数据库: database 2"
    echo
    echo "🔧 管理命令:"
    echo "  - 查看服务状态: pm2 status"
    echo "  - 查看日志: pm2 logs youtube-learning-backend"
    echo "  - 重启服务: pm2 restart youtube-learning-backend"
    echo "  - 停止服务: pm2 stop youtube-learning-backend"
    echo
    echo "📚 文档参考:"
    echo "  - 详细部署指南: docs/DEPLOYMENT_GUIDE.md"
    echo "  - Redis配置说明: REDIS_DATABASE_CONFIG.md"
    echo
    echo "⚠️ 下一步操作:"
    echo "  1. 配置Nginx反向代理"
    echo "  2. 设置SSL证书 (可选)"
    echo "  3. 配置域名解析"
    echo "  4. 测试API接口功能"
    echo
    log_warning "请确保已正确配置所有API密钥！"
}

# 主函数
main() {
    log_title "YouTube智能学习资料生成器 - 自动部署脚本 v1.0.1"
    
    # 检查是否为root用户
    if [[ $EUID -eq 0 ]]; then
        log_warning "建议不要使用root用户运行此脚本"
        if ! confirm "是否继续?"; then
            exit 1
        fi
    fi
    
    # 显示依赖汇总
    show_dependencies_summary
    
    # 系统检查和安装
    check_and_install_nodejs
    check_and_install_postgresql  
    check_and_install_redis
    check_and_install_nginx
    check_and_install_pm2
    check_and_install_ytdlp
    
    # 项目设置
    create_directories
    install_dependencies
    configure_environment
    setup_database
    
    # 启动服务
    start_services
    
    # 健康检查
    health_check
    
    # 完成信息
    show_completion_info
}

# 执行主函数
main "$@"