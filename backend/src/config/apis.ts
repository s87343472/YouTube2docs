import OpenAI from 'openai'
import Groq from 'groq-sdk'

// OpenAI configuration - 延迟初始化以避免启动时错误
export let openai: OpenAI | null = null
export let groq: Groq | null = null

// 初始化OpenAI客户端
export function initOpenAI(): OpenAI {
  if (!openai && process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key-here') {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openai!
}

// 初始化Groq客户端
export function initGroq(): Groq {
  if (!groq && process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your-groq-api-key-here') {
    groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    })
  }
  return groq!
}

// 检查API密钥是否可用
export function hasOpenAIKey(): boolean {
  return !!(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key-here')
}

export function hasGroqKey(): boolean {
  return !!(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your-groq-api-key-here')
}

// API configuration constants
export const API_CONFIG = {
  GROQ: {
    MODEL: 'whisper-large-v3-turbo',
    MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
    SUPPORTED_FORMATS: ['mp3', 'wav', 'm4a', 'webm', 'mp4']
  },
  OPENAI: {
    MODEL: 'gpt-4o',
    MAX_TOKENS: 4000,
    TEMPERATURE: 0.3
  }
}

// Test API connections
export async function testAPIConnections() {
  const results = {
    openai: false,
    groq: false
  }

  try {
    // Test OpenAI
    if (hasOpenAIKey()) {
      const client = initOpenAI()
      await client.models.list()
      results.openai = true
      console.log('✅ OpenAI API connected successfully')
    } else {
      console.log('⚠️  OpenAI API key not configured')
    }
  } catch (error) {
    console.error('❌ OpenAI API connection failed:', (error as Error).message)
  }

  try {
    // Test Groq
    if (hasGroqKey()) {
      const client = initGroq()
      await client.models.list()
      results.groq = true
      console.log('✅ Groq API connected successfully')
    } else {
      console.log('⚠️  Groq API key not configured')
    }
  } catch (error) {
    console.error('❌ Groq API connection failed:', (error as Error).message)
  }

  return results
}