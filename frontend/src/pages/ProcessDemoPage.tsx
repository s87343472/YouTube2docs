import React, { useState, useEffect } from 'react'
import { useSearchParams, useParams } from 'react-router-dom'
import { VideoAPI, APIUtils } from '../services/api'
import type { VideoStatusResponse, VideoResultResponse } from '../services/api'
import { ShareModal } from '../components/ShareModal'

export const ProcessDemoPage: React.FC = () => {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const urlFromParams = searchParams.get('url')
  const [url, setUrl] = useState(urlFromParams || '')
  const [processId, setProcessId] = useState<string | null>(id || null)
  const [status, setStatus] = useState<VideoStatusResponse | null>(null)
  const [result, setResult] = useState<VideoResultResponse | null>(null)
  const [processing, setProcessing] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)

  // 处理分享
  const handleShare = async (shareData: any) => {
    try {
      const response = await fetch('/api/shares', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          videoProcessId: processId,
          ...shareData
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        return {
          shareId: result.data.shareId,
          shareUrl: result.data.shareUrl
        }
      } else {
        throw new Error(result.error?.message || '分享创建失败')
      }
    } catch (error) {
      console.error('Share creation failed:', error)
      throw error
    }
  }

  const startProcessing = async () => {
    if (!APIUtils.isValidYouTubeURL(url)) {
      alert('❌ 无效的YouTube URL')
      return
    }

    setProcessing(true)
    setProcessId(null)
    setStatus(null)
    setResult(null)

    try {
      const response = await VideoAPI.processVideo({
        youtubeUrl: url,
        options: {
          language: 'zh',
          outputFormat: 'standard',
          includeTimestamps: true
        }
      })

      setProcessId(response.processId)
      // 开始轮询状态
      pollStatus(response.processId)

    } catch (error) {
      alert(`❌ 提交处理请求失败: ${error instanceof Error ? error.message : String(error)}`)
      setProcessing(false)
    }
  }

  const pollStatus = async (id: string) => {
    try {
      const finalStatus = await VideoAPI.pollProcessStatus(
        id,
        (currentStatus) => {
          setStatus(currentStatus)
        },
        2000 // 每2秒轮询一次
      )

      if (finalStatus.status === 'completed') {
        await getResult(id)
      } else {
        alert(`❌ 处理失败: ${finalStatus.error || '未知错误'}`)
        setProcessing(false)
      }

    } catch (error) {
      alert(`❌ 状态监控失败: ${error instanceof Error ? error.message : String(error)}`)
      setProcessing(false)
    }
  }

  const getResult = async (id: string) => {
    try {
      const resultData = await VideoAPI.getProcessResult(id)
      setResult(resultData)
      setProcessing(false)
    } catch (error) {
      alert(`❌ 获取结果失败: ${error instanceof Error ? error.message : String(error)}`)
      setProcessing(false)
    }
  }

  const clearAll = () => {
    setProcessId(null)
    setStatus(null)
    setResult(null)
    setProcessing(false)
  }

  // 如果是从URL参数进入的处理ID页面，先检查状态
  useEffect(() => {
    if (id && !result && !processing) {
      checkProcessStatus(id)
    }
  }, [id])

  const checkProcessStatus = async (processId: string) => {
    try {
      setProcessing(true)
      
      // 先检查状态
      const currentStatus = await VideoAPI.getProcessStatus(processId)
      
      if (currentStatus.status === 'completed') {
        // 如果已完成，直接获取结果
        await getResult(processId)
      } else if (currentStatus.status === 'processing') {
        // 如果正在处理，开始轮询状态
        setStatus(currentStatus)
        pollStatus(processId)
      } else if (currentStatus.status === 'failed') {
        // 如果失败，显示错误信息
        setStatus(currentStatus)
        setProcessing(false)
        alert(`❌ 处理失败: ${currentStatus.error || '未知错误'}`)
      } else {
        // 其他状态，显示当前状态
        setStatus(currentStatus)
        setProcessing(false)
      }
    } catch (error) {
      console.error('Failed to check process status:', error)
      setProcessing(false)
      alert(`❌ 无法获取处理状态: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            🎬 视频处理
          </h1>

          {/* 输入区域 - 仅在没有processId时显示 */}
          {!processId && (
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
          )}

          {/* 处理状态 */}
          {processId && (
            <div className="mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">处理信息</h3>
                <div className="space-y-3">
                  <div className="text-sm">
                    处理ID: <code className="bg-gray-200 px-2 py-1 rounded">{processId}</code>
                  </div>
                  
                  {status && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">状态:</span>
                        <span className={`font-medium text-sm ${
                          status.status === 'completed' ? 'text-green-600' :
                          status.status === 'failed' ? 'text-red-600' :
                          'text-blue-600'
                        }`}>
                          {APIUtils.getStatusText(status.status)}
                        </span>
                      </div>
                      
                      <div>
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
                        {status.currentStep && (
                          <div className="text-xs text-gray-600 mt-1">
                            {APIUtils.getStepText(status.currentStep)}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {!result ? (
            <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
              {processing ? '等待处理完成...' : '暂无结果'}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 左侧 - 视频和摘要信息 */}
              <div className="lg:col-span-1 space-y-6">
                {/* 视频信息 */}
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                  <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
                    <h3 className="font-medium text-gray-900 flex items-center">
                      <span className="text-green-600 mr-2">📺</span>
                      视频信息
                    </h3>
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">标题</div>
                      <div className="text-sm font-medium text-gray-900">{result.result.videoInfo.title}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">频道</div>
                      <div className="text-sm text-gray-700">{result.result.videoInfo.channel}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">时长</div>
                      <div className="text-sm text-gray-700">{result.result.videoInfo.duration}</div>
                    </div>
                  </div>
                </div>

                {/* 学习摘要 */}
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                  <div className="p-4 border-b border-gray-200 bg-blue-50 rounded-t-lg">
                    <h3 className="font-medium text-blue-900 flex items-center">
                      <span className="text-blue-600 mr-2">📋</span>
                      学习摘要
                    </h3>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">难度</div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          result.result.summary.difficulty === 'beginner' ? 'bg-green-100 text-green-800' :
                          result.result.summary.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {result.result.summary.difficulty}
                        </span>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">学习时间</div>
                        <div className="text-sm text-gray-700">{result.result.summary.learningTime}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">关键点</div>
                        <div className="text-lg font-semibold text-blue-600">{result.result.summary.keyPoints.length}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">概念</div>
                        <div className="text-lg font-semibold text-purple-600">{result.result.summary.concepts.length}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
                  <div className="space-y-3">
                    <button
                      onClick={() => setShowShareModal(true)}
                      className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                    >
                      <span>🔗</span>
                      <span>分享结果</span>
                    </button>
                    
                    {result.downloadUrls && (
                      <div className="space-y-2">
                        {result.downloadUrls.pdf && (
                          <a 
                            href={result.downloadUrls.pdf} 
                            target="_blank" 
                            className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2 text-sm"
                          >
                            <span>📄</span>
                            <span>生成PDF</span>
                          </a>
                        )}
                        {result.downloadUrls.markdown && (
                          <a 
                            href={result.downloadUrls.markdown} 
                            className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2 text-sm"
                          >
                            <span>📝</span>
                            <span>下载Markdown</span>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* 右侧 - 详细内容 */}
              <div className="lg:col-span-2 space-y-6">
                {/* 结构化内容 */}
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                  <div className="p-4 border-b border-gray-200 bg-purple-50 rounded-t-lg">
                    <h3 className="font-medium text-purple-900 flex items-center">
                      <span className="text-purple-600 mr-2">📖</span>
                      结构化内容
                    </h3>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="bg-purple-50 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">{result.result.structuredContent.chapters.length}</div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">章节数</div>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{result.result.structuredContent.learningObjectives?.length || 0}</div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">学习目标</div>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{result.result.structuredContent.prerequisites?.length || 0}</div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">前置要求</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 知识图谱 */}
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                  <div className="p-4 border-b border-gray-200 bg-orange-50 rounded-t-lg">
                    <h3 className="font-medium text-orange-900 flex items-center">
                      <span className="text-orange-600 mr-2">🕸️</span>
                      知识图谱
                    </h3>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-orange-50 p-4 rounded-lg text-center">
                        <div className="text-3xl font-bold text-orange-600">{result.result.knowledgeGraph.nodes?.length || 0}</div>
                        <div className="text-sm text-gray-600 mt-1">知识节点</div>
                      </div>
                      <div className="bg-yellow-50 p-4 rounded-lg text-center">
                        <div className="text-3xl font-bold text-yellow-600">{result.result.knowledgeGraph.edges?.length || 0}</div>
                        <div className="text-sm text-gray-600 mt-1">关系边</div>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">复杂度:</span>
                        <span className="ml-2 font-medium text-gray-900">{'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">覆盖度:</span>
                        <span className="ml-2 font-medium text-gray-900">{'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 学习卡片 */}
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                  <div className="p-4 border-b border-gray-200 bg-pink-50 rounded-t-lg">
                    <h3 className="font-medium text-pink-900 flex items-center">
                      <span className="text-pink-600 mr-2">📚</span>
                      学习卡片
                    </h3>
                  </div>
                  <div className="p-4">
                    <div className="text-center mb-4">
                      <div className="text-4xl font-bold text-pink-600">{result.result.studyCards?.length || 0}</div>
                      <div className="text-sm text-gray-600">总卡片数</div>
                    </div>
                    
                    {result.result.studyCards && result.result.studyCards.length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">卡片类型分布</div>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(
                            result.result.studyCards.reduce((acc: Record<string, number>, card) => {
                              acc[card.type] = (acc[card.type] || 0) + 1
                              return acc
                            }, {})
                          ).map(([type, count]) => (
                            <span key={type} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {type}: {count}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* 分享模态框 */}
      {result && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          videoTitle={result.result.videoInfo.title}
          videoProcessId={processId || ''}
          onShare={handleShare}
        />
      )}
    </div>
  )
}