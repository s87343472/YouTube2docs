import { initGroq, hasGroqKey, hasGeminiKey, testAPIConnections } from '../config/apis'
import { testDatabaseConnection } from '../config/database'

/**
 * 测试Gemini API连接和功能
 */
export async function testGeminiAPI() {
  console.log('🔍 Testing Gemini API...')
  
  if (!hasGeminiKey()) {
    console.log('❌ Gemini API key not configured')
    return {
      status: 'failed',
      message: 'API key not configured'
    }
  }
  
  try {
    const { initGemini, API_CONFIG } = await import('../config/apis')
    const gemini = initGemini()
    const model = gemini.getGenerativeModel({ 
      model: API_CONFIG.GEMINI.MODEL,
      generationConfig: {
        temperature: API_CONFIG.GEMINI.TEMPERATURE,
        maxOutputTokens: 100
      }
    })
    
    console.log(`✅ Gemini API connected successfully`)
    console.log(`🤖 Using model: ${API_CONFIG.GEMINI.MODEL}`)
    
    // 测试基本内容生成
    const testPrompt = '请用一句话介绍React Hooks。'
    const result = await model.generateContent(testPrompt)
    const response = await result.response
    const content = response.text()
    
    console.log(`💬 Test completion successful:`)
    console.log(`📝 Response: ${content}`)
    
    return {
      status: 'success',
      model: API_CONFIG.GEMINI.MODEL,
      testResponse: content
    }
    
  } catch (error) {
    console.error('❌ Gemini API test failed:', error)
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
    console.log('❌ Groq API key not configured')
    return {
      status: 'failed',
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
 * 测试YouTube视频信息提取（真实）
 */
export async function testYouTubeExtraction() {
  console.log('🔍 Testing YouTube video extraction...')
  
  try {
    const { YouTubeService } = await import('./youtubeService')
    
    // 使用真实的YouTube URL测试
    const testUrl = 'https://www.youtube.com/watch?v=LF9sd-2jCoY'
    
    if (!YouTubeService.isValidYouTubeURL(testUrl)) {
      throw new Error('Invalid test URL')
    }
    
    const videoInfo = await YouTubeService.getDetailedVideoInfo(testUrl)
    
    console.log(`✅ Video extraction test successful`)
    console.log(`📺 Title: ${videoInfo.title}`)
    console.log(`👤 Channel: ${videoInfo.channel}`)
    console.log(`⏱️ Duration: ${videoInfo.duration}`)
    
    return {
      status: 'success',
      videoInfo: videoInfo
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
  
  if (!hasGeminiKey()) {
    console.log('❌ Gemini API key not configured')
    return {
      status: 'failed',
      message: 'API key not configured'
    }
  }
  
  try {
    const { initGemini, API_CONFIG } = await import('../config/apis')
    const gemini = initGemini()
    const model = gemini.getGenerativeModel({ 
      model: API_CONFIG.GEMINI.MODEL,
      generationConfig: {
        temperature: API_CONFIG.GEMINI.TEMPERATURE,
        maxOutputTokens: 500,
        responseMimeType: "application/json"
      }
    })
    
    const systemPrompt = `你是一个专业的学习资料生成助手。根据给定的视频转录内容，生成结构化的学习资料。

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

    const userPrompt = `视频标题：React Hooks Complete Tutorial
视频内容：React Hooks是React 16.8版本引入的新特性，它让你可以在不编写class的情况下使用state以及其他的React特性。主要包括useState用于状态管理，useEffect用于副作用处理，useContext用于上下文消费等。`
    
    const prompt = `${systemPrompt}\n\n${userPrompt}`
    const result = await model.generateContent(prompt)
    const response = await result.response
    const generatedContent = response.text()
    
    console.log(`✅ Content generation successful`)
    console.log(`📝 Generated content: ${generatedContent.substring(0, 100)}...`)
    
    return {
      status: 'success',
      content: generatedContent
    }
    
  } catch (error) {
    console.error('❌ Content generation test failed:', error)
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}


/**
 * 运行所有API测试
 */
export async function runAllAPITests() {
  console.log('🚀 Starting comprehensive API tests...\n')
  
  const results = {
    database: null as any,
    apis: null as any,
    gemini: null as any,
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
  
  // 3. 测试Gemini
  console.log('3️⃣ Gemini API Test')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  results.gemini = await testGeminiAPI()
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
  console.log(`🤖 Gemini: ${results.gemini?.status === 'success' ? '✅ Working' : '❌ Failed'}`)
  console.log(`⚡ Groq: ${results.groq?.status === 'success' ? '✅ Working' : '❌ Failed'}`)
  console.log(`📺 YouTube: ${results.youtube?.status === 'success' ? '✅ Working' : '❌ Failed'}`)
  console.log(`📝 Content Gen: ${results.contentGeneration?.status === 'success' ? '✅ Working' : '❌ Failed'}`)
  
  return results
}