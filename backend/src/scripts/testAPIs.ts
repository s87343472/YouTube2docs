#!/usr/bin/env ts-node

import dotenv from 'dotenv'
import { runAllAPITests } from '../services/apiTest'

// 加载环境变量
dotenv.config()

async function main() {
  console.log('🧪 YouTube智能学习资料生成器 - API测试套件')
  console.log('='.repeat(50))
  console.log()
  
  try {
    const results = await runAllAPITests()
    
    // 将结果保存到文件
    const fs = require('fs')
    const path = require('path')
    
    const resultsDir = path.join(process.cwd(), 'test-results')
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true })
    }
    
    const resultsFile = path.join(resultsDir, `api-test-${new Date().toISOString().slice(0, 10)}.json`)
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2))
    
    console.log(`📄 Test results saved to: ${resultsFile}`)
    console.log()
    
    // 检查是否所有关键测试都通过
    const criticalTests = [
      results.database,
      results.openai?.status === 'success' || results.openai?.status === 'mock',
      results.groq?.status === 'success' || results.groq?.status === 'mock',
      results.youtube?.status === 'success'
    ]
    
    const allPassed = criticalTests.every(test => test)
    
    if (allPassed) {
      console.log('🎉 All critical tests passed! The system is ready for development.')
      process.exit(0)
    } else {
      console.log('⚠️ Some tests failed. Please check your configuration.')
      process.exit(1)
    }
    
  } catch (error) {
    console.error('💥 Test suite failed:', error)
    process.exit(1)
  }
}

// 只有在直接运行时才执行
if (require.main === module) {
  main()
}