#!/usr/bin/env ts-node

/**
 * 认证系统测试运行脚本
 * 用于独立运行认证系统的所有测试
 */

import { runAuthSystemTests } from '../tests/authSystemTest'
import { logger, LogCategory } from '../utils/logger'

async function main() {
  try {
    console.log('🚀 启动认证系统测试...\n')
    
    const success = await runAuthSystemTests()
    
    if (success) {
      console.log('\n🎉 所有测试通过！认证系统工作正常。')
      process.exit(0)
    } else {
      console.log('\n❌ 有测试失败。请检查上述错误信息。')
      process.exit(1)
    }
  } catch (error) {
    logger.error('测试运行失败', error as Error, {}, LogCategory.USER)
    console.error('❌ 测试运行失败:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

main()