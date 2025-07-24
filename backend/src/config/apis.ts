import Groq from 'groq-sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import Together from 'together-ai'

// API clients - 延迟初始化以避免启动时错误  
export let groq: Groq | null = null
export let together: Together | null = null
export let gemini: GoogleGenerativeAI | null = null

// 初始化Groq客户端
export function initGroq(): Groq {
  if (!groq && process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your-groq-api-key-here') {
    groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    })
  }
  return groq!
}

// 初始化Together客户端
export function initTogether(): Together {
  if (!together && process.env.TOGETHER_API_KEY && process.env.TOGETHER_API_KEY !== 'your-together-api-key-here') {
    together = new Together({
      apiKey: process.env.TOGETHER_API_KEY,
    })
  }
  return together!
}

// 初始化Gemini客户端
export function initGemini(): GoogleGenerativeAI {
  if (!gemini && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your-gemini-api-key-here') {
    gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  }
  return gemini!
}

// 检查API密钥是否可用
export function hasGroqKey(): boolean {
  return !!(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your-groq-api-key-here')
}

export function hasTogetherKey(): boolean {
  return !!(process.env.TOGETHER_API_KEY && process.env.TOGETHER_API_KEY !== 'your-together-api-key-here')
}

export function hasGeminiKey(): boolean {
  return !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your-gemini-api-key-here')
}

// API configuration constants
export const API_CONFIG = {
  GROQ: {
    MODEL: 'whisper-large-v3-turbo',
    MAX_FILE_SIZE: 25 * 1024 * 1024, // 25MB (actual Groq API limit)
    SUPPORTED_FORMATS: ['mp3', 'wav', 'm4a', 'webm', 'mp4']
  },
  TOGETHER: {
    MODEL: 'openai/whisper-large-v3',
    MAX_FILE_SIZE: 25 * 1024 * 1024, // 25MB (same as Groq for consistency)
    SUPPORTED_FORMATS: ['mp3', 'wav', 'm4a', 'webm', 'mp4', 'flac', 'aac']
  },
  GEMINI: {
    MODEL: 'gemini-2.5-flash',
    MAX_TOKENS: 32768, // Increased for detailed content generation
    TEMPERATURE: 0.3
  }
}

// Test API connections
export async function testAPIConnections() {
  const results = {
    groq: false,
    gemini: false
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

  try {
    // Test Gemini
    if (hasGeminiKey()) {
      const client = initGemini()
      const model = client.getGenerativeModel({ model: API_CONFIG.GEMINI.MODEL })
      await model.generateContent('test')
      results.gemini = true
      console.log('✅ Gemini API connected successfully')
    } else {
      console.log('⚠️  Gemini API key not configured')
    }
  } catch (error) {
    console.error('❌ Gemini API connection failed:', (error as Error).message)
  }

  return results
}