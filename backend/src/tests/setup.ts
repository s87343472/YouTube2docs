// Jest测试环境设置
import dotenv from 'dotenv'
import path from 'path'

// 加载测试环境变量
dotenv.config({ path: path.resolve(__dirname, '../../.env.test') })

// 模拟logger避免测试时输出日志
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
  LogCategory: {
    SERVER: 'server',
    DATABASE: 'database',
    API: 'api',
    SERVICE: 'service',
    SECURITY: 'security',
    PERFORMANCE: 'performance',
    USER: 'user',
  },
}))