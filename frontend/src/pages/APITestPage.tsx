import React, { useState } from 'react'
import { VideoAPI, SystemAPI, APIUtils } from '../services/api'
// import type { HealthStatus, ProcessingStats } from '../services/api' // Types used internally

export const APITestPage: React.FC = () => {
  const [testResults, setTestResults] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [testUrl, setTestUrl] = useState('https://www.youtube.com/watch?v=dQw4w9WgXcQ')

  const runTest = async (testName: string, testFn: () => Promise<any>) => {
    setLoading(prev => ({ ...prev, [testName]: true }))
    try {
      const result = await testFn()
      setTestResults(prev => ({ 
        ...prev, 
        [testName]: { 
          success: true, 
          data: result,
          timestamp: new Date().toISOString()
        } 
      }))
    } catch (error) {
      setTestResults(prev => ({ 
        ...prev, 
        [testName]: { 
          success: false, 
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        } 
      }))
    } finally {
      setLoading(prev => ({ ...prev, [testName]: false }))
    }
  }

  const tests = [
    {
      name: 'basic_health',
      label: '基础健康检查',
      fn: () => SystemAPI.getBasicHealth()
    },
    {
      name: 'system_info',
      label: '系统信息',
      fn: () => SystemAPI.getSystemInfo()
    },
    {
      name: 'video_health',
      label: '视频服务健康检查',
      fn: () => VideoAPI.getHealthStatus()
    },
    {
      name: 'processing_stats',
      label: '处理统计信息',
      fn: () => VideoAPI.getProcessingStats()
    },
    {
      name: 'video_extraction',
      label: '视频信息提取测试',
      fn: () => VideoAPI.testVideoExtraction(testUrl)
    }
  ]

  const runAllTests = async () => {
    for (const test of tests) {
      await runTest(test.name, test.fn)
      // 延迟一点避免请求过快
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  const clearResults = () => {
    setTestResults({})
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            🔧 API 测试面板
          </h1>
          
          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              这个页面用于测试前后端API接口的连通性和功能完整性。
            </p>
            
            <div className="flex gap-4 mb-4">
              <button
                onClick={runAllTests}
                disabled={Object.values(loading).some(Boolean)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {Object.values(loading).some(Boolean) ? '测试中...' : '运行所有测试'}
              </button>
              
              <button
                onClick={clearResults}
                className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
              >
                清除结果
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                测试 YouTube URL:
              </label>
              <input
                type="url"
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="输入YouTube视频URL"
              />
              <p className="text-sm text-gray-500 mt-1">
                有效: {APIUtils.isValidYouTubeURL(testUrl) ? '✅' : '❌'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 测试按钮区域 */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800">测试项目</h2>
              
              {tests.map((test) => (
                <div key={test.name} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium text-gray-900">{test.label}</h3>
                    <button
                      onClick={() => runTest(test.name, test.fn)}
                      disabled={loading[test.name]}
                      className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700 disabled:opacity-50 text-sm"
                    >
                      {loading[test.name] ? '测试中...' : '运行'}
                    </button>
                  </div>
                  
                  {testResults[test.name] && (
                    <div className={`text-sm p-2 rounded ${
                      testResults[test.name].success 
                        ? 'bg-green-50 text-green-800' 
                        : 'bg-red-50 text-red-800'
                    }`}>
                      {testResults[test.name].success ? '✅ 成功' : '❌ 失败'}
                      <span className="text-xs ml-2">
                        {new Date(testResults[test.name].timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* 结果显示区域 */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800">测试结果</h2>
              
              {Object.keys(testResults).length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  还没有测试结果
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(testResults).map(([testName, result]) => (
                    <div key={testName} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-medium text-gray-900">
                          {tests.find(t => t.name === testName)?.label || testName}
                        </h3>
                        <span className={`text-xs px-2 py-1 rounded ${
                          result.success 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {result.success ? 'SUCCESS' : 'ERROR'}
                        </span>
                      </div>
                      
                      <div className="bg-gray-50 rounded p-3 text-sm">
                        <pre className="whitespace-pre-wrap overflow-x-auto">
                          {result.success 
                            ? JSON.stringify(result.data, null, 2)
                            : result.error
                          }
                        </pre>
                      </div>
                      
                      <div className="text-xs text-gray-500 mt-2">
                        测试时间: {new Date(result.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* API 连接状态总览 */}
          <div className="mt-8 border-t pt-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">API 连接状态总览</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">后端状态</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>基础健康:</span>
                    <span className={testResults.basic_health?.success ? 'text-green-600' : 'text-red-600'}>
                      {testResults.basic_health?.success ? '✅' : '❌'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>系统信息:</span>
                    <span className={testResults.system_info?.success ? 'text-green-600' : 'text-red-600'}>
                      {testResults.system_info?.success ? '✅' : '❌'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-medium text-green-900 mb-2">视频服务</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>健康检查:</span>
                    <span className={testResults.video_health?.success ? 'text-green-600' : 'text-red-600'}>
                      {testResults.video_health?.success ? '✅' : '❌'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>视频提取:</span>
                    <span className={testResults.video_extraction?.success ? 'text-green-600' : 'text-red-600'}>
                      {testResults.video_extraction?.success ? '✅' : '❌'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="font-medium text-purple-900 mb-2">统计信息</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>处理统计:</span>
                    <span className={testResults.processing_stats?.success ? 'text-green-600' : 'text-red-600'}>
                      {testResults.processing_stats?.success ? '✅' : '❌'}
                    </span>
                  </div>
                  {testResults.processing_stats?.success && (
                    <div className="text-xs text-gray-600 mt-2">
                      总处理数: {testResults.processing_stats.data.totalProcesses}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}