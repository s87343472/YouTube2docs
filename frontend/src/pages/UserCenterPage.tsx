import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  User, 
  Eye, 
  Heart, 
  Share2, 
  Calendar, 
  BarChart3, 
  Settings, 
  Download,
  ExternalLink,
  Trash2,
  Edit3,
  Globe,
  Lock,
  TrendingUp,
  Users,
  Play,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader,
  FileText
} from 'lucide-react'

/**
 * 用户个人中心页面
 * 显示用户的分享内容、浏览统计和账户管理
 */

interface UserShare {
  id: string
  shareId: string
  title: string
  description?: string
  tags: string[]
  isPublic: boolean
  viewCount: number
  likeCount: number
  createdAt: string
  updatedAt: string
  videoInfo: {
    title: string
    url: string
    duration: string
    thumbnail?: string
  }
}

interface Analytics {
  totalViews: number
  totalShares: number
  totalLikes: number
  recentViews: number
  topPerformingShare?: UserShare
  viewsLastWeek: Array<{ date: string; views: number }>
  sharesLastMonth: Array<{ date: string; shares: number }>
}

interface UserTask {
  id: string
  youtubeUrl: string
  videoTitle: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  currentStep?: string
  createdAt: string
  updatedAt: string
}

export const UserCenterPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tasks' | 'shares' | 'analytics' | 'settings'>('tasks')
  const [userShares, setUserShares] = useState<UserShare[]>([])
  const [userTasks, setUserTasks] = useState<UserTask[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // 用户信息 (临时模拟数据)
  const user = {
    id: '1',
    name: '学习达人',
    email: 'learner@example.com',
    joinDate: '2024-01-15',
    avatar: '/api/placeholder/64/64'
  }

  useEffect(() => {
    fetchUserData()
  }, [])

  const fetchUserData = async () => {
    try {
      setLoading(true)
      
      // 获取用户处理任务列表
      const tasksResponse = await fetch('/api/user/tasks')
      const tasksData = await tasksResponse.json()
      
      if (tasksData.success) {
        setUserTasks(tasksData.data.tasks)
      }
      
      // 获取用户分享列表
      const sharesResponse = await fetch('/api/shares')
      const sharesData = await sharesResponse.json()
      
      if (sharesData.success) {
        setUserShares(sharesData.data.shares)
      }
      
      // 获取用户分析数据
      const analyticsResponse = await fetch('/api/user/analytics')
      const analyticsData = await analyticsResponse.json()
      
      if (analyticsData.success) {
        setAnalytics(analyticsData.data)
      }
      
    } catch (err) {
      setError('获取用户数据失败')
      console.error('Failed to fetch user data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteShare = async (shareId: string) => {
    if (!confirm('确定要删除这个分享吗？此操作不可恢复。')) {
      return
    }

    try {
      const response = await fetch(`/api/shares/${shareId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setUserShares(prev => prev.filter(share => share.shareId !== shareId))
        // 重新获取分析数据
        fetchUserData()
      } else {
        alert('删除分享失败')
      }
    } catch (error) {
      console.error('Delete share error:', error)
      alert('删除分享失败')
    }
  }

  const handleTogglePublic = async (shareId: string, isPublic: boolean) => {
    try {
      const response = await fetch(`/api/shares/${shareId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isPublic: !isPublic })
      })
      
      if (response.ok) {
        setUserShares(prev => 
          prev.map(share => 
            share.shareId === shareId 
              ? { ...share, isPublic: !isPublic }
              : share
          )
        )
      } else {
        alert('更新分享设置失败')
      }
    } catch (error) {
      console.error('Toggle public error:', error)
      alert('更新分享设置失败')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载个人中心...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">加载失败</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchUserData}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部用户信息 */}
      <div className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center space-x-6">
            <div className="h-20 w-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <User className="h-10 w-10 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
              <p className="text-gray-600">{user.email}</p>
              <p className="text-sm text-gray-500">加入于 {formatDate(user.joinDate)}</p>
            </div>
            {analytics && (
              <div className="flex space-x-6 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{analytics.totalShares}</div>
                  <div className="text-sm text-gray-600">分享数</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{formatNumber(analytics.totalViews)}</div>
                  <div className="text-sm text-gray-600">总浏览</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">{analytics.totalLikes}</div>
                  <div className="text-sm text-gray-600">获赞数</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 导航标签 */}
      <div className="max-w-6xl mx-auto px-4">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'tasks', label: '处理任务', icon: FileText },
              { id: 'shares', label: '我的分享', icon: Share2 },
              { id: 'analytics', label: '数据统计', icon: BarChart3 },
              { id: 'settings', label: '账户设置', icon: Settings }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-5 w-5 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {activeTab === 'tasks' && (
          <div>
            {/* 处理任务列表 */}
            {userTasks.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">还没有处理任务</h3>
                <p className="text-gray-600 mb-4">开始处理YouTube视频生成学习资料吧！</p>
                <Link
                  to="/"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  开始处理
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {userTasks.map((task) => (
                  <div key={task.id} className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {task.videoTitle || '处理中...'}
                          </h3>
                          <div className="flex items-center space-x-2">
                            {task.status === 'completed' && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                已完成
                              </span>
                            )}
                            {task.status === 'processing' && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                <Loader className="h-3 w-3 mr-1 animate-spin" />
                                处理中
                              </span>
                            )}
                            {task.status === 'failed' && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                失败
                              </span>
                            )}
                            {task.status === 'pending' && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                <Clock className="h-3 w-3 mr-1" />
                                等待中
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-sm text-gray-600 mb-3">
                          <p>YouTube URL: {task.youtubeUrl}</p>
                          <p>创建时间: {new Date(task.createdAt).toLocaleString()}</p>
                          {task.currentStep && <p>当前步骤: {task.currentStep}</p>}
                        </div>

                        {task.status === 'processing' && (
                          <div className="mb-3">
                            <div className="flex justify-between text-sm mb-1">
                              <span>处理进度</span>
                              <span>{task.progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${task.progress}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="ml-4 flex items-center space-x-2">
                        {task.status === 'completed' && (
                          <Link
                            to={`/process/${task.id}`}
                            className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                          >
                            查看结果
                          </Link>
                        )}
                        {(task.status === 'processing' || task.status === 'pending') && (
                          <Link
                            to={`/process/${task.id}`}
                            className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                          >
                            查看进度
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'shares' && (
          <div>
            {/* 分享列表 */}
            {userShares.length === 0 ? (
              <div className="text-center py-12">
                <Share2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">还没有分享</h3>
                <p className="text-gray-600 mb-4">开始处理YouTube视频并分享你的学习资料吧！</p>
                <Link
                  to="/"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  开始创建
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {userShares.map((share) => (
                  <div key={share.id} className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <h3 className="text-lg font-semibold text-gray-900">{share.title}</h3>
                          <div className="flex items-center space-x-2">
                            {share.isPublic ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <Globe className="h-3 w-3 mr-1" />
                                公开
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                <Lock className="h-3 w-3 mr-1" />
                                私有
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {share.description && (
                          <p className="text-gray-600 mb-3">{share.description}</p>
                        )}
                        
                        <div className="flex items-center space-x-6 text-sm text-gray-500 mb-4">
                          <div className="flex items-center">
                            <Eye className="h-4 w-4 mr-1" />
                            {share.viewCount} 次浏览
                          </div>
                          <div className="flex items-center">
                            <Heart className="h-4 w-4 mr-1" />
                            {share.likeCount} 个赞
                          </div>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {formatDate(share.createdAt)}
                          </div>
                        </div>
                        
                        {share.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {share.tags.map((tag, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        <div className="text-sm text-gray-600">
                          原视频: {share.videoInfo.title}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <a
                          href={`/shared/${share.shareId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          查看
                        </a>
                        
                        <button
                          onClick={() => handleTogglePublic(share.shareId, share.isPublic)}
                          className="inline-flex items-center px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                        >
                          {share.isPublic ? (
                            <>
                              <Lock className="h-4 w-4 mr-1" />
                              设为私有
                            </>
                          ) : (
                            <>
                              <Globe className="h-4 w-4 mr-1" />
                              设为公开
                            </>
                          )}
                        </button>
                        
                        <button
                          onClick={() => handleDeleteShare(share.shareId)}
                          className="inline-flex items-center px-3 py-2 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && analytics && (
          <div className="space-y-6">
            {/* 统计卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Eye className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">总浏览量</p>
                    <p className="text-2xl font-bold text-gray-900">{formatNumber(analytics.totalViews)}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Share2 className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">分享总数</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.totalShares}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Heart className="h-8 w-8 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">获赞总数</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.totalLikes}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <TrendingUp className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">近期浏览</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.recentViews}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 最佳表现分享 */}
            {analytics.topPerformingShare && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">🏆 最受欢迎的分享</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">{analytics.topPerformingShare.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{analytics.topPerformingShare.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">{analytics.topPerformingShare.viewCount}</div>
                    <div className="text-sm text-gray-500">浏览次数</div>
                  </div>
                </div>
              </div>
            )}

            {/* 图表区域 - 简化版 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">过去7天浏览量</h3>
                <div className="h-64 flex items-end space-x-2">
                  {analytics.viewsLastWeek.map((day, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div
                        className="bg-blue-600 rounded-t w-full"
                        style={{ 
                          height: `${Math.max(day.views / Math.max(...analytics.viewsLastWeek.map(d => d.views)) * 200, 4)}px` 
                        }}
                      />
                      <div className="text-xs text-gray-500 mt-2">
                        {new Date(day.date).toLocaleDateString('zh-CN', { weekday: 'short' })}
                      </div>
                      <div className="text-xs font-medium text-gray-900">{day.views}</div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">过去30天分享创建</h3>
                <div className="h-64 flex items-end space-x-1">
                  {analytics.sharesLastMonth.map((day, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div
                        className="bg-green-600 rounded-t w-full"
                        style={{ 
                          height: `${Math.max(day.shares / Math.max(...analytics.sharesLastMonth.map(d => d.shares)) * 200, 4)}px` 
                        }}
                      />
                      <div className="text-xs text-gray-500 mt-2">
                        {new Date(day.date).getDate()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">账户信息</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">用户名</label>
                  <input
                    type="text"
                    value={user.name}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">邮箱</label>
                  <input
                    type="email"
                    value={user.email}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                    disabled
                  />
                </div>
                <p className="text-sm text-gray-500">
                  💡 账户设置功能将在后续版本中开放
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default UserCenterPage