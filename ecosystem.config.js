module.exports = {
  apps: [
    {
      name: 'youtube-learning-backend',
      cwd: './backend',
      script: 'src/index.ts',
      interpreter: './node_modules/.bin/ts-node',
      instances: 1,
      exec_mode: 'fork',
      
      // 环境变量配置
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        TS_NODE_PROJECT: './tsconfig.json'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        script: 'dist/index.js',
        interpreter: 'node',
        interpreter_args: ''
      },
      
      // 日志配置
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      time: true,
      
      // 自动重启配置
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      
      // 启动配置
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      
      // 进程管理
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 8000,
      
      // 高级配置
      node_args: '--max_old_space_size=512',
      source_map_support: true,
      merge_logs: true,
      
      // 环境变量文件
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
      'pre-setup': 'mkdir -p logs uploads temp'
    },
    
    development: {
      user: 'developer',
      host: 'localhost',
      ref: 'origin/develop',
      repo: 'https://github.com/your-username/youtube-learning-generator.git',
      path: '/home/developer/youtube-learning-generator',
      'pre-deploy-local': '',
      'post-deploy': 'cd backend && npm install && pm2 reload ecosystem.config.js --env development',
      'pre-setup': 'mkdir -p logs uploads temp'
    }
  }
}