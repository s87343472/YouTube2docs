import React, { useState } from 'react'
import { VideoAPI, APIUtils } from '../services/api'
import type { ProcessVideoResponse, VideoStatusResponse, VideoResultResponse } from '../services/api'

export const ProcessDemoPage: React.FC = () => {
  const [url, setUrl] = useState('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
  const [processId, setProcessId] = useState<string | null>(null)
  const [status, setStatus] = useState<VideoStatusResponse | null>(null)
  const [result, setResult] = useState<VideoResultResponse | null>(null)
  const [processing, setProcessing] = useState(false)
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, `[${timestamp}] ${message}`])
  }

  const startProcessing = async () => {
    if (!APIUtils.isValidYouTubeURL(url)) {
      addLog('❌ 无效的YouTube URL')
      return
    }

    setProcessing(true)
    setProcessId(null)
    setStatus(null)
    setResult(null)
    setLogs([])

    try {
      addLog('🚀 开始提交视频处理请求...')
      
      const response = await VideoAPI.processVideo({
        youtubeUrl: url,
        options: {
          language: 'zh',
          outputFormat: 'standard',
          includeTimestamps: true
        }
      })

      setProcessId(response.processId)
      addLog(`✅ 处理请求已提交，处理ID: ${response.processId}`)
      addLog(`⏱️ 预计处理时间: ${APIUtils.formatProcessingTime(response.estimatedTime)}`)

      // 开始轮询状态
      pollStatus(response.processId)

    } catch (error) {
      addLog(`❌ 提交处理请求失败: ${error instanceof Error ? error.message : String(error)}`)
      setProcessing(false)
    }
  }

  const pollStatus = async (id: string) => {
    try {
      addLog('📊 开始监控处理状态...')

      const finalStatus = await VideoAPI.pollProcessStatus(
        id,
        (currentStatus) => {
          setStatus(currentStatus)
          addLog(`📈 处理进度: ${currentStatus.progress}% - ${APIUtils.getStepText(currentStatus.currentStep || '')}`)
          
          if (currentStatus.estimatedTimeRemaining) {
            addLog(`⏳ 剩余时间: ${APIUtils.formatProcessingTime(currentStatus.estimatedTimeRemaining)}`)
          }
        },
        2000 // 每2秒轮询一次
      )

      if (finalStatus.status === 'completed') {
        addLog('🎉 视频处理完成！正在获取结果...')
        await getResult(id)
      } else {
        addLog(`❌ 处理失败: ${finalStatus.error || '未知错误'}`)
        setProcessing(false)
      }

    } catch (error) {
      addLog(`❌ 状态监控失败: ${error instanceof Error ? error.message : String(error)}`)
      setProcessing(false)
    }
  }

  const getResult = async (id: string) => {
    try {
      const resultData = await VideoAPI.getProcessResult(id)
      setResult(resultData)
      addLog(`✅ 结果获取成功！处理耗时: ${APIUtils.formatProcessingTime(resultData.processingTime)}`)
      addLog(`📋 生成了 ${resultData.result.structuredContent.chapters.length} 个章节`)
      addLog(`🧠 生成了 ${resultData.result.knowledgeGraph.nodes?.length || 0} 个知识节点`)
      addLog(`📚 生成了 ${resultData.result.studyCards?.length || 0} 张学习卡片`)
      setProcessing(false)
    } catch (error) {
      addLog(`❌ 获取结果失败: ${error instanceof Error ? error.message : String(error)}`)
      setProcessing(false)
    }
  }

  const clearAll = () => {
    setProcessId(null)
    setStatus(null)
    setResult(null)
    setLogs([])
    setProcessing(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            🎬 视频处理演示
          </h1>

          {/* 输入区域 */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h2 className="text-lg font-semibold text-blue-900 mb-4">输入YouTube视频</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  YouTube URL:
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="输入YouTube视频URL"
                  disabled={processing}
                />
                <p className="text-sm mt-1">
                  有效性: {APIUtils.isValidYouTubeURL(url) ? 
                    <span className="text-green-600">✅ 有效</span> : 
                    <span className="text-red-600">❌ 无效</span>
                  }
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={startProcessing}
                  disabled={processing || !APIUtils.isValidYouTubeURL(url)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {processing ? '处理中...' : '开始处理'}
                </button>
                
                <button
                  onClick={clearAll}
                  disabled={processing}
                  className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50"
                >
                  清除
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 状态区域 */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800">处理状态</h2>
              
              {processId && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">处理信息</h3>
                  <div className="text-sm space-y-1">
                    <div>处理ID: <code className="bg-gray-200 px-1 rounded">{processId}</code></div>
                    {status && (
                      <>
                        <div>状态: <span className={`font-medium ${
                          status.status === 'completed' ? 'text-green-600' :
                          status.status === 'failed' ? 'text-red-600' :
                          'text-blue-600'
                        }`}>
                          {APIUtils.getStatusText(status.status)}
                        </span></div>
                        <div>进度: {status.progress}%</div>
                        {status.currentStep && (
                          <div>当前步骤: {APIUtils.getStepText(status.currentStep)}</div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* 进度条 */}
              {status && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span>处理进度</span>
                    <span>{status.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${status.progress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* 处理日志 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">处理日志</h3>
                <div className="text-sm space-y-1 max-h-60 overflow-y-auto">
                  {logs.length === 0 ? (
                    <p className="text-gray-500">暂无日志</p>
                  ) : (
                    logs.map((log, index) => (
                      <div key={index} className="font-mono text-xs text-gray-700">
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* 结果区域 */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800">处理结果</h2>
              
              {!result ? (
                <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
                  {processing ? '等待处理完成...' : '暂无结果'}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 视频信息 */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-medium text-green-900 mb-2">视频信息</h3>
                    <div className="text-sm space-y-1">
                      <div><strong>标题:</strong> {result.result.videoInfo.title}</div>
                      <div><strong>频道:</strong> {result.result.videoInfo.channel}</div>
                      <div><strong>时长:</strong> {result.result.videoInfo.duration}</div>
                    </div>
                  </div>

                  {/* 学习摘要 */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-medium text-blue-900 mb-2">学习摘要</h3>
                    <div className="text-sm space-y-2">
                      <div><strong>难度:</strong> {result.result.summary.difficulty}</div>
                      <div><strong>学习时间:</strong> {result.result.summary.learningTime}</div>
                      <div><strong>关键点数量:</strong> {result.result.summary.keyPoints.length}</div>
                      <div><strong>概念数量:</strong> {result.result.summary.concepts.length}</div>
                    </div>
                  </div>

                  {/* 结构化内容 */}
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h3 className="font-medium text-purple-900 mb-2">结构化内容</h3>
                    <div className="text-sm space-y-2">
                      <div><strong>章节数:</strong> {result.result.structuredContent.chapters.length}</div>
                      <div><strong>学习目标:</strong> {result.result.structuredContent.learningObjectives?.length || 0}</div>
                      <div><strong>前置要求:</strong> {result.result.structuredContent.prerequisites?.length || 0}</div>
                    </div>
                  </div>

                  {/* 知识图谱 */}
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h3 className="font-medium text-orange-900 mb-2">知识图谱</h3>
                    <div className="text-sm space-y-2">
                      <div><strong>知识节点:</strong> {result.result.knowledgeGraph.nodes?.length || 0}</div>
                      <div><strong>关系边:</strong> {result.result.knowledgeGraph.edges?.length || 0}</div>
                      <div><strong>复杂度:</strong> {result.result.knowledgeGraph.metadata?.complexity || 'N/A'}</div>
                      <div><strong>覆盖度:</strong> {result.result.knowledgeGraph.metadata?.coverage || 'N/A'}</div>
                    </div>
                  </div>

                  {/* 学习卡片 */}
                  <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
                    <h3 className="font-medium text-pink-900 mb-2">学习卡片</h3>
                    <div className="text-sm space-y-2">
                      <div><strong>总卡片数:</strong> {result.result.studyCards?.length || 0}</div>
                      {result.result.studyCards && result.result.studyCards.length > 0 && (
                        <div>
                          <strong>卡片类型分布:</strong>
                          <div className="mt-1 text-xs">
                            {Object.entries(
                              result.result.studyCards.reduce((acc: Record<string, number>, card) => {
                                acc[card.type] = (acc[card.type] || 0) + 1
                                return acc
                              }, {})
                            ).map(([type, count]) => (
                              <span key={type} className="inline-block bg-white px-2 py-1 rounded mr-2 mb-1">
                                {type}: {count}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 下载链接 */}
                  {result.downloadUrls && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h3 className="font-medium text-gray-900 mb-2">下载结果</h3>
                      <div className="space-y-2">
                        {result.downloadUrls.pdf && (
                          <a href={result.downloadUrls.pdf} className="text-blue-600 hover:underline block">
                            📄 下载PDF版本
                          </a>
                        )}
                        {result.downloadUrls.markdown && (
                          <a href={result.downloadUrls.markdown} className="text-blue-600 hover:underline block">
                            📝 下载Markdown版本
                          </a>
                        )}
                        {result.downloadUrls.json && (
                          <a href={result.downloadUrls.json} className="text-blue-600 hover:underline block">
                            🔧 下载JSON数据
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}