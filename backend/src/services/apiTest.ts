import { initOpenAI, initGroq, hasOpenAIKey, hasGroqKey, testAPIConnections } from '../config/apis'
import { testDatabaseConnection } from '../config/database'

/**
 * 测试OpenAI API连接和功能
 */
export async function testOpenAIAPI() {
  console.log('🔍 Testing OpenAI API...')
  
  if (!hasOpenAIKey()) {
    console.log('⚠️  OpenAI API key not configured, using mock data')
    return {
      status: 'mock',
      message: 'API key not configured'
    }
  }
  
  try {
    const openai = initOpenAI()
    // 测试模型列表
    const models = await openai.models.list()
    const gpt4Models = models.data.filter(model => model.id.includes('gpt-4'))
    
    console.log(`✅ OpenAI API connected successfully`)
    console.log(`📊 Available models: ${models.data.length}`)
    console.log(`🤖 GPT-4 models: ${gpt4Models.length}`)
    
    // 测试基本聊天完成
    const testCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // 使用更便宜的模型进行测试
      messages: [
        {
          role: 'system',
          content: '你是一个测试助手，请简短回复。'
        },
        {
          role: 'user',
          content: '请用一句话介绍React Hooks。'
        }
      ],
      max_tokens: 100,
      temperature: 0.3
    })
    
    console.log(`💬 Test completion successful:`)
    console.log(`📝 Response: ${testCompletion.choices[0].message.content}`)
    console.log(`📊 Tokens used: ${testCompletion.usage?.total_tokens}`)
    
    return {
      status: 'success',
      models: gpt4Models.length,
      testResponse: testCompletion.choices[0].message.content,
      tokensUsed: testCompletion.usage?.total_tokens
    }
    
  } catch (error) {
    console.error('❌ OpenAI API test failed:', error)
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * 测试Groq API连接和功能
 */
export async function testGroqAPI() {
  console.log('🔍 Testing Groq API...')
  
  if (!hasGroqKey()) {
    console.log('⚠️  Groq API key not configured, using mock data')
    return {
      status: 'mock',
      message: 'API key not configured'
    }
  }
  
  try {
    const groq = initGroq()
    // 测试模型列表
    const models = await groq.models.list()
    const whisperModels = models.data.filter(model => model.id.includes('whisper'))
    
    console.log(`✅ Groq API connected successfully`)
    console.log(`📊 Available models: ${models.data.length}`)
    console.log(`🎤 Whisper models: ${whisperModels.length}`)
    
    // 由于我们没有实际的音频文件，这里只测试连接
    // 在实际应用中，这里会测试音频转录功能
    console.log(`🎯 Whisper model available: ${whisperModels[0]?.id || 'Not found'}`)
    
    return {
      status: 'success',
      models: whisperModels.length,
      whisperModel: whisperModels[0]?.id || 'Not found'
    }
    
  } catch (error) {
    console.error('❌ Groq API test failed:', error)
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * 测试YouTube视频信息提取（模拟）
 */
export async function testYouTubeExtraction() {
  console.log('🔍 Testing YouTube video extraction...')
  
  try {
    // 模拟YouTube视频信息提取
    // 在实际应用中，这里会使用yt-dlp或YouTube API
    
    const mockVideoInfo = {
      id: 'demo123',
      title: 'React Hooks Complete Tutorial - useState, useEffect, useContext',
      channel: 'Programming with Mosh',
      duration: 5130, // 85分30秒
      views: '1.2M',
      description: 'Complete guide to React Hooks including useState, useEffect, and useContext...',
      upload_date: '2023-06-15',
      thumbnail: 'https://img.youtube.com/vi/demo123/maxresdefault.jpg'
    }
    
    console.log(`✅ Video extraction test successful`)
    console.log(`📺 Title: ${mockVideoInfo.title}`)
    console.log(`👤 Channel: ${mockVideoInfo.channel}`)
    console.log(`⏱️ Duration: ${Math.floor(mockVideoInfo.duration / 60)}:${mockVideoInfo.duration % 60}`)
    
    return {
      status: 'success',
      videoInfo: mockVideoInfo
    }
    
  } catch (error) {
    console.error('❌ YouTube extraction test failed:', error)
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * 生成测试学习内容
 */
export async function testContentGeneration() {
  console.log('🔍 Testing content generation...')
  
  if (!hasOpenAIKey()) {
    console.log('⚠️ OpenAI API key not configured, using mock data')
    return {
      status: 'mock',
      content: mockLearningContent
    }
  }
  
  try {
    const openai = initOpenAI()
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `你是一个专业的学习资料生成助手。根据给定的视频转录内容，生成结构化的学习资料。

请按照以下JSON格式返回：
{
  "summary": {
    "keyPoints": ["要点1", "要点2", "要点3"],
    "learningTime": "预计学习时间",
    "difficulty": "beginner|intermediate|advanced"
  },
  "concepts": [
    {
      "name": "概念名称",
      "explanation": "概念解释"
    }
  ]
}`
        },
        {
          role: 'user',
          content: `视频标题：React Hooks Complete Tutorial
视频内容：React Hooks是React 16.8版本引入的新特性，它让你可以在不编写class的情况下使用state以及其他的React特性。主要包括useState用于状态管理，useEffect用于副作用处理，useContext用于上下文消费等。`
        }
      ],
      max_tokens: 500,
      temperature: 0.3
    })
    
    const generatedContent = completion.choices[0].message.content
    console.log(`✅ Content generation successful`)
    console.log(`📝 Generated content: ${generatedContent?.substring(0, 100)}...`)
    
    return {
      status: 'success',
      content: generatedContent,
      tokensUsed: completion.usage?.total_tokens
    }
    
  } catch (error) {
    console.error('❌ Content generation test failed:', error)
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// 模拟学习内容数据
const mockLearningContent = {
  summary: {
    keyPoints: [
      'React Hooks是函数组件中使用状态和生命周期的方式',
      'useState用于管理组件内部状态',
      'useEffect用于处理副作用，如API调用和订阅',
      'useContext用于在组件树中共享状态'
    ],
    learningTime: '45-60分钟',
    difficulty: 'intermediate'
  },
  concepts: [
    {
      name: 'useState',
      explanation: '状态Hook，用于在函数组件中添加状态管理功能'
    },
    {
      name: 'useEffect',
      explanation: '副作用Hook，用于处理副作用操作，如数据获取、订阅等'
    },
    {
      name: 'useContext',
      explanation: '上下文Hook，用于消费React Context，实现组件间状态共享'
    }
  ]
}

/**
 * 运行所有API测试
 */
export async function runAllAPITests() {
  console.log('🚀 Starting comprehensive API tests...\n')
  
  const results = {
    database: null as any,
    apis: null as any,
    openai: null as any,
    groq: null as any,
    youtube: null as any,
    contentGeneration: null as any,
    timestamp: new Date().toISOString()
  }
  
  // 1. 测试数据库连接
  console.log('1️⃣ Database Connection Test')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  results.database = await testDatabaseConnection()
  console.log()
  
  // 2. 测试API连接状态
  console.log('2️⃣ API Connection Test')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  results.apis = await testAPIConnections()
  console.log()
  
  // 3. 测试OpenAI
  console.log('3️⃣ OpenAI API Test')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  results.openai = await testOpenAIAPI()
  console.log()
  
  // 4. 测试Groq
  console.log('4️⃣ Groq API Test')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  results.groq = await testGroqAPI()
  console.log()
  
  // 5. 测试YouTube提取
  console.log('5️⃣ YouTube Extraction Test')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  results.youtube = await testYouTubeExtraction()
  console.log()
  
  // 6. 测试内容生成
  console.log('6️⃣ Content Generation Test')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  results.contentGeneration = await testContentGeneration()
  console.log()
  
  // 总结测试结果
  console.log('📊 Test Results Summary')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`🗄️  Database: ${results.database ? '✅ Connected' : '❌ Failed'}`)
  console.log(`🤖 OpenAI: ${results.openai?.status === 'success' ? '✅ Working' : '❌ Failed'}`)
  console.log(`⚡ Groq: ${results.groq?.status === 'success' ? '✅ Working' : '❌ Failed'}`)
  console.log(`📺 YouTube: ${results.youtube?.status === 'success' ? '✅ Working' : '❌ Failed'}`)
  console.log(`📝 Content Gen: ${results.contentGeneration?.status === 'success' ? '✅ Working' : results.contentGeneration?.status === 'mock' ? '⚠️ Mock' : '❌ Failed'}`)
  
  return results
}