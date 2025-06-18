import { VideoAPI, SystemAPI, APIUtils } from '../services/api'

/**
 * 前后端API集成测试工具
 */
export class APITestRunner {
  
  /**
   * 运行完整的API集成测试
   */
  static async runFullIntegrationTest(): Promise<{
    success: boolean
    results: Record<string, any>
    summary: {
      total: number
      passed: number
      failed: number
      duration: number
    }
  }> {
    const startTime = Date.now()
    const results: Record<string, any> = {}
    let passed = 0
    let failed = 0

    const tests = [
      { name: 'basic_health', fn: () => SystemAPI.getBasicHealth() },
      { name: 'system_info', fn: () => SystemAPI.getSystemInfo() },
      { name: 'video_health', fn: () => VideoAPI.getHealthStatus() },
      { name: 'processing_stats', fn: () => VideoAPI.getProcessingStats() },
      { name: 'video_extraction', fn: () => VideoAPI.testVideoExtraction('https://www.youtube.com/watch?v=dQw4w9WgXcQ') }
    ]

    for (const test of tests) {
      try {
        console.log(`Running test: ${test.name}`)
        const result = await test.fn()
        results[test.name] = { success: true, data: result }
        passed++
        console.log(`✅ ${test.name} passed`)
      } catch (error) {
        results[test.name] = { 
          success: false, 
          error: error instanceof Error ? error.message : String(error) 
        }
        failed++
        console.log(`❌ ${test.name} failed:`, error)
      }
    }

    const duration = Date.now() - startTime
    const summary = {
      total: tests.length,
      passed,
      failed,
      duration
    }

    return {
      success: failed === 0,
      results,
      summary
    }
  }

  /**
   * 测试YouTube URL验证
   */
  static testURLValidation(): { success: boolean, results: any[] } {
    const testUrls = [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
      'https://invalid-url.com',
      'not-a-url-at-all'
    ]

    const results = testUrls.map(url => ({
      url,
      valid: APIUtils.isValidYouTubeURL(url),
      expected: url.includes('youtube.com') || url.includes('youtu.be')
    }))

    const success = results.every(r => r.valid === r.expected)

    return { success, results }
  }

  /**
   * 测试视频处理流程（模拟）
   */
  static async testVideoProcessingFlow(youtubeUrl: string): Promise<{
    success: boolean
    steps: Array<{ step: string, success: boolean, data?: any, error?: string }>
  }> {
    const steps: Array<{ step: string, success: boolean, data?: any, error?: string }> = []

    // 步骤1: URL验证
    try {
      const isValid = APIUtils.isValidYouTubeURL(youtubeUrl)
      steps.push({ step: 'URL验证', success: isValid, data: { valid: isValid } })
      if (!isValid) throw new Error('Invalid YouTube URL')
    } catch (error) {
      steps.push({ step: 'URL验证', success: false, error: String(error) })
      return { success: false, steps }
    }

    // 步骤2: 视频信息提取
    try {
      const videoInfo = await VideoAPI.testVideoExtraction(youtubeUrl)
      steps.push({ step: '视频信息提取', success: true, data: videoInfo })
    } catch (error) {
      steps.push({ step: '视频信息提取', success: false, error: String(error) })
      return { success: false, steps }
    }

    // 步骤3: 健康检查
    try {
      const healthStatus = await VideoAPI.getHealthStatus()
      steps.push({ step: '服务健康检查', success: true, data: healthStatus })
    } catch (error) {
      steps.push({ step: '服务健康检查', success: false, error: String(error) })
    }

    const success = steps.every(step => step.success)
    return { success, steps }
  }

  /**
   * 性能测试
   */
  static async runPerformanceTest(): Promise<{
    latency: Record<string, number>
    throughput: { requests: number, duration: number, rps: number }
  }> {
    const latencyTests = {
      'basic_health': () => SystemAPI.getBasicHealth(),
      'system_info': () => SystemAPI.getSystemInfo(),
      'video_health': () => VideoAPI.getHealthStatus()
    }

    const latency: Record<string, number> = {}

    // 测试延迟
    for (const [name, fn] of Object.entries(latencyTests)) {
      const start = Date.now()
      try {
        await fn()
        latency[name] = Date.now() - start
      } catch (error) {
        latency[name] = -1 // 错误标记
      }
    }

    // 测试吞吐量
    const throughputStart = Date.now()
    const requests = 10
    const promises = Array(requests).fill(0).map(() => SystemAPI.getBasicHealth())
    
    try {
      await Promise.all(promises)
      const duration = Date.now() - throughputStart
      const rps = (requests / duration) * 1000

      return {
        latency,
        throughput: { requests, duration, rps }
      }
    } catch (error) {
      return {
        latency,
        throughput: { requests, duration: Date.now() - throughputStart, rps: 0 }
      }
    }
  }
}

/**
 * 在浏览器控制台中运行测试的便捷函数
 */
export const runAPITests = async () => {
  console.log('🚀 开始运行API集成测试...')
  
  const result = await APITestRunner.runFullIntegrationTest()
  
  console.log('\n📊 测试结果总结:')
  console.log(`总测试数: ${result.summary.total}`)
  console.log(`通过: ${result.summary.passed}`)
  console.log(`失败: ${result.summary.failed}`)
  console.log(`耗时: ${result.summary.duration}ms`)
  console.log(`成功率: ${Math.round((result.summary.passed / result.summary.total) * 100)}%`)
  
  if (result.success) {
    console.log('✅ 所有API测试通过！前后端集成正常')
  } else {
    console.log('❌ 部分API测试失败，请检查后端服务状态')
  }
  
  return result
}

// 导出到window对象，方便浏览器控制台调用
if (typeof window !== 'undefined') {
  (window as any).runAPITests = runAPITests
  (window as any).APITestRunner = APITestRunner
}