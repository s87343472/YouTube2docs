#!/usr/bin/env ts-node

/**
 * Together AI降级测试工具
 * 测试当Groq不可用时是否能正确降级到Together AI
 */

import { TranscriptionService } from '../services/transcriptionService'
import path from 'path'

async function testTogetherFallback() {
  console.log('🧪 Testing Together AI fallback mechanism...\n')

  // 创建一个小的测试音频文件路径（你需要一个实际的音频文件来测试）
  const testAudioPath = path.join(__dirname, '../../temp/test-audio.mp3')
  
  console.log(`📁 Test audio file: ${testAudioPath}`)
  
  try {
    // 模拟Groq API不可用的情况
    // 你可以临时修改GROQ_API_KEY来测试
    console.log('🚀 Starting transcription test...')
    
    const result = await TranscriptionService.transcribeAudio(testAudioPath, 'en')
    
    console.log('\n✅ Transcription successful!')
    console.log(`📝 Text length: ${result.text.length} characters`)
    console.log(`🌐 Language: ${result.language}`)
    console.log(`🎯 Confidence: ${result.confidence}`)
    console.log(`📊 Segments: ${result.segments?.length || 0}`)
    
    if (result.text.length > 100) {
      console.log(`📄 Preview: ${result.text.substring(0, 100)}...`)
    } else {
      console.log(`📄 Full text: ${result.text}`)
    }
    
  } catch (error) {
    console.error('❌ Transcription test failed:', error)
    
    // 检查错误类型
    if (error instanceof Error) {
      if (error.message.includes('Groq API限流')) {
        console.log('🔄 Expected: Groq rate limit detected, should fallback to Together AI')
      } else if (error.message.includes('Together AI')) {
        console.log('🌟 Together AI was used (fallback successful)')
      } else if (error.message.includes('所有转录服务都不可用')) {
        console.log('⚠️ All services unavailable')
      }
    }
  }
}

// 使用说明
console.log(`
🎯 Together AI Fallback Test Tool

This tool tests the automatic fallback from Groq to Together AI.

To test the fallback:
1. Place a small audio file at: backend/temp/test-audio.mp3
2. Run: npx ts-node src/tools/testTogetherFallback.ts

To simulate Groq failure:
1. Temporarily set GROQ_API_KEY to invalid value in .env
2. Or modify quotas in ApiQuotaMonitor

Current providers:
- Groq: ${process.env.GROQ_API_KEY ? '✅ Available' : '❌ Missing'}
- Together: ${process.env.TOGETHER_API_KEY ? '✅ Available' : '❌ Missing'}
`)

// 只有在有音频文件的情况下才运行测试
if (require.main === module) {
  const fs = require('fs')
  const testAudioExists = fs.existsSync(path.join(__dirname, '../../temp/test-audio.mp3'))
  
  if (testAudioExists) {
    testTogetherFallback().catch(console.error)
  } else {
    console.log('\n⚠️ No test audio file found. Please add a test audio file to run the actual test.')
    console.log('For now, showing configuration status only.')
  }
}