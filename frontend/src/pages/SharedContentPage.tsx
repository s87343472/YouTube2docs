import React, { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Eye, Clock, User, Tag, Share2, Heart } from 'lucide-react'
import YoutubeEmbed from '../components/YoutubeEmbed'

interface SharedContent {
  id: string
  shareId: string
  title: string
  description?: string
  tags: string[]
  viewCount: number
  likeCount: number
  createdAt: string
  videoInfo: {
    title: string
    url: string
    duration: string
    thumbnail?: string
  }
  learningMaterial: {
    summary: {
      concepts: Array<{
        name: string
        explanation: string
      }>
      keyPoints: string[]
    }
    studyCards: Array<{
      id: string
      type: string
      title: string
      content: string
      difficulty: string
      estimatedTime: number
    }>
    structuredContent: {
      chapters: Array<{
        title: string
        timeRange: string
        keyPoints: string[]
      }>
    }
  }
}

export const SharedContentPage: React.FC = () => {
  const { shareId } = useParams<{ shareId: string }>()
  const [searchParams] = useSearchParams()
  const source = searchParams.get('from') || 'direct'
  
  const [content, setContent] = useState<SharedContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [liked, setLiked] = useState(false)

  useEffect(() => {
    if (shareId) {
      fetchSharedContent(shareId, source)
    }
  }, [shareId, source])

  const fetchSharedContent = async (id: string, fromSource: string) => {
    try {
      const response = await fetch(`/api/shares/${id}?from=${fromSource}`)
      const data = await response.json()
      
      if (data.success) {
        setContent(data.data)
      } else {
        setError(data.error?.message || '获取分享内容失败')
      }
    } catch (err) {
      setError('网络请求失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const handleLike = async () => {
    // TODO: 实现点赞功能
    setLiked(!liked)
  }

  const handleShare = async () => {
    if (navigator.share && content) {
      try {
        await navigator.share({
          title: content.title,
          text: content.description || `来看看这个YouTube视频的学习资料：${content.title}`,
          url: window.location.href
        })
      } catch (err) {
        // 如果原生分享失败，复制链接到剪贴板
        await navigator.clipboard.writeText(window.location.href)
        alert('链接已复制到剪贴板')
      }
    } else {
      // 复制链接到剪贴板
      await navigator.clipboard.writeText(window.location.href)
      alert('链接已复制到剪贴板')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载学习资料...</p>
        </div>
      </div>
    )
  }

  if (error || !content) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">内容不存在</h2>
          <p className="text-gray-600 mb-4">
            {error || '该分享链接可能已失效或被设为私有'}
          </p>
          <a
            href="/"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            回到首页
          </a>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* SEO Meta Tags */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": content.title,
            "description": content.description || `学习资料：${content.title}`,
            "url": window.location.href,
            "image": content.videoInfo.thumbnail,
            "publisher": {
              "@type": "Organization",
              "name": "YouTube智学"
            },
            "mainEntity": {
              "@type": "VideoObject",
              "name": content.videoInfo.title,
              "description": content.description || `学习视频：${content.videoInfo.title}`,
              "thumbnailUrl": content.videoInfo.thumbnail,
              "uploadDate": content.createdAt,
              "contentUrl": content.videoInfo.url,
              "duration": content.videoInfo.duration
            }
          })
        }}
      />
      
      <div className="min-h-screen bg-gray-50">
        {/* 头部信息 */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {content.title}
              </h1>
              
              {content.description && (
                <p className="text-gray-600 mb-4">
                  {content.description}
                </p>
              )}
              
              <div className="flex items-center space-x-6 text-sm text-gray-500">
                <div className="flex items-center">
                  <Eye className="h-4 w-4 mr-1" />
                  {content.viewCount} 次浏览
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {new Date(content.createdAt).toLocaleDateString()}
                </div>
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-1" />
                  学习分享
                </div>
              </div>
              
              {content.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {content.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      <Tag className="h-3 w-3 mr-1" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex space-x-2 ml-4">
              <button
                onClick={handleLike}
                className={`flex items-center px-3 py-2 rounded-md text-sm ${
                  liked 
                    ? 'bg-red-100 text-red-700' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Heart className={`h-4 w-4 mr-1 ${liked ? 'fill-current' : ''}`} />
                {content.likeCount + (liked ? 1 : 0)}
              </button>
              
              <button
                onClick={handleShare}
                className="flex items-center px-3 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-sm"
              >
                <Share2 className="h-4 w-4 mr-1" />
                分享
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 视频播放区域 */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">📹 视频内容</h2>
          
          {/* YouTube视频嵌入 */}
          <div className="mb-6">
            <YoutubeEmbed
              videoUrl={content.videoInfo.url}
              title={content.videoInfo.title}
              thumbnail={content.videoInfo.thumbnail}
              className="w-full"
            />
          </div>
          
          {/* 视频信息 */}
          <div className="border-t pt-4">
            <h3 className="font-medium text-gray-900 mb-2">
              {content.videoInfo.title}
            </h3>
            <div className="text-sm text-gray-600 space-y-1">
              <div>时长: {content.videoInfo.duration}</div>
              <a
                href={content.videoInfo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 inline-flex items-center"
              >
                在YouTube上观看 →
              </a>
            </div>
          </div>
        </div>

        {/* 核心概念 */}
        {content.learningMaterial.summary.concepts.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">🧠 核心概念</h2>
            <div className="space-y-4">
              {content.learningMaterial.summary.concepts.map((concept, index) => (
                <div key={index} className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-medium text-gray-900 mb-1">
                    {concept.name}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {concept.explanation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 关键要点 */}
        {content.learningMaterial.summary.keyPoints.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">🎯 关键要点</h2>
            <ul className="space-y-2">
              {content.learningMaterial.summary.keyPoints.map((point, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span className="text-gray-700">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 学习卡片 */}
        {content.learningMaterial.studyCards && content.learningMaterial.studyCards.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">🎴 学习卡片</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {content.learningMaterial.studyCards.map((card, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900">{card.title}</h3>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <span className={`px-2 py-1 rounded ${
                        card.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                        card.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {card.difficulty === 'easy' ? '简单' : card.difficulty === 'medium' ? '中等' : '困难'}
                      </span>
                      <span>{card.estimatedTime}分钟</span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 whitespace-pre-line">
                    {card.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 结构化内容 */}
        {content.learningMaterial.structuredContent?.chapters && content.learningMaterial.structuredContent.chapters.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">📖 结构化内容</h2>
            <div className="space-y-6">
              {content.learningMaterial.structuredContent.chapters.map((chapter, index) => (
                <div key={index} className="border-b border-gray-200 pb-4 last:border-b-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">{chapter.title}</h3>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {chapter.timeRange}
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {chapter.keyPoints.map((point, pointIndex) => (
                      <li key={pointIndex} className="flex items-start text-sm">
                        <span className="text-blue-600 mr-2">•</span>
                        <span className="text-gray-700">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 底部操作 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">喜欢这个学习资料？</h3>
            <p className="text-gray-600 mb-4">
              试试自己处理YouTube视频，2分钟生成专业学习资料
            </p>
            <a
              href="/"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              立即体验
            </a>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}