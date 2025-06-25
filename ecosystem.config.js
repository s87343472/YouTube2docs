module.exports = {
  apps: [
    {
      name: 'youtube-learning-backend',
      cwd: './backend',
      script: 'dist/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      // 日志配置
      error_file: '/var/log/youtube-learning/error.log',
      out_file: '/var/log/youtube-learning/out.log',
      log_file: '/var/log/youtube-learning/combined.log',
      time: true,
      
      // 自动重启配置
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      
      // 启动配置
      min_uptime: '10s',
      max_restarts: 10,
      
      // 进程管理
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 8000,
      
      // 高级配置
      node_args: '--max_old_space_size=1024',
      source_map_support: true,
      
      // 环境变量
      env_file: './backend/.env'
    }
  ],

  // 部署配置
  deploy: {
    production: {
      user: 'ubuntu',
      host: 'your-server-ip',
      ref: 'origin/main',
      repo: 'https://github.com/your-username/youtube-learning-generator.git',
      path: '/home/ubuntu/youtube-learning-generator',
      'pre-deploy-local': '',
      'post-deploy': 'cd backend && npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
}
EOF < /dev/null