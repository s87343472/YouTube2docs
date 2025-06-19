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
