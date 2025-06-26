import React, { useState } from 'react'
import { X, Share2, Eye, Copy, Check } from 'lucide-react'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  videoTitle: string
  videoProcessId: string
  onShare: (shareData: {
    title: string
    description?: string
    tags?: string[]
    isPublic: boolean
  }) => Promise<{ shareId: string; shareUrl: string }>
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  videoTitle,
  videoProcessId: _videoProcessId, // Currently not used in component body
  onShare
}) => {
  const [title, setTitle] = useState(videoTitle)
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [shareResult, setShareResult] = useState<{
    shareId: string
    shareUrl: string
  } | null>(null)
  const [copied, setCopied] = useState(false)

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim()) && tags.length < 10) {
      setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleShare = async () => {
    if (!title.trim()) return

    setIsLoading(true)
    try {
      const result = await onShare({
        title: title.trim(),
        description: description.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        isPublic
      })
      setShareResult(result)
    } catch (error) {
      console.error('Share failed:', error)
      // TODO: 显示错误提示
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyUrl = async () => {
    if (shareResult?.shareUrl) {
      try {
        await navigator.clipboard.writeText(shareResult.shareUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (error) {
        console.error('Copy failed:', error)
      }
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTag()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {!shareResult ? (
          <>
            {/* 分享设置表单 */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold flex items-center">
                <Share2 className="h-5 w-5 mr-2 text-blue-600" />
                分享学习资料
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 公开设置 */}
            <div className="mb-6">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    公开分享
                  </div>
                  <div className="text-xs text-gray-500">
                    {isPublic ? '所有人都可以通过链接访问' : '仅自己可见，不会被搜索到'}
                  </div>
                </div>
              </label>
            </div>

            {/* 标题 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                标题 *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="给你的学习资料起个标题..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                maxLength={255}
              />
              <div className="text-xs text-gray-500 mt-1">
                {title.length}/255
              </div>
            </div>

            {/* 描述 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                描述
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="简单描述一下这个学习资料的内容..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                maxLength={1000}
              />
              <div className="text-xs text-gray-500 mt-1">
                {description.length}/1000
              </div>
            </div>

            {/* 标签 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                标签 (最多10个)
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              {tags.length < 10 && (
                <div className="flex">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="添加标签..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={handleAddTag}
                    disabled={!tagInput.trim() || tags.includes(tagInput.trim())}
                    className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    添加
                  </button>
                </div>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleShare}
                disabled={!title.trim() || isLoading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  '创建分享'
                )}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* 分享成功结果 */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold flex items-center text-green-600">
                <Check className="h-5 w-5 mr-2" />
                分享创建成功！
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <Eye className="h-4 w-4 text-green-600 mr-2" />
                  <span className="text-sm font-medium text-green-800">
                    {isPublic ? '公开分享已创建' : '私有分享已创建'}
                  </span>
                </div>
                <div className="text-sm text-green-700">
                  分享ID: <span className="font-mono">{shareResult.shareId}</span>
                </div>
              </div>
            </div>

            {/* 分享链接 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                分享链接
              </label>
              <div className="flex">
                <input
                  type="text"
                  value={shareResult.shareUrl}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-sm"
                />
                <button
                  onClick={handleCopyUrl}
                  className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 flex items-center"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
              {copied && (
                <div className="text-xs text-green-600 mt-1">
                  ✅ 链接已复制到剪贴板
                </div>
              )}
            </div>

            <div className="text-sm text-gray-600 mb-6">
              💡 提示：你可以在<a href="/user-center" className="text-blue-600 hover:text-blue-800 underline">个人中心</a>查看这个分享的浏览统计和管理设置
            </div>

            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              完成
            </button>
          </>
        )}
      </div>
    </div>
  )
}