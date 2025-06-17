import axios from 'axios'
import { VideoInfo } from '../types'

/**
 * YouTube服务类 - 处理视频信息提取
 */
export class YouTubeService {
  
  /**
   * 验证YouTube URL格式
   */
  static isValidYouTubeURL(url: string): boolean {
    const patterns = [
      /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]{11}/,
      /^https?:\/\/(www\.)?youtu\.be\/[\w-]{11}/,
      /^https?:\/\/(www\.)?youtube\.com\/embed\/[\w-]{11}/,
      /^https?:\/\/(www\.)?youtube\.com\/v\/[\w-]{11}/
    ]
    
    return patterns.some(pattern => pattern.test(url))
  }
  
  /**
   * 从YouTube URL提取视频ID
   */
  static extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^#\&\?]*)/
    ]
    
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match && match[1]) {
        return match[1]
      }
    }
    
    return null
  }
  
  /**
   * 获取视频基本信息（使用公开的oEmbed API）
   */
  static async getBasicVideoInfo(url: string): Promise<Partial<VideoInfo>> {
    try {
      if (!this.isValidYouTubeURL(url)) {
        throw new Error('Invalid YouTube URL format')
      }
      
      const videoId = this.extractVideoId(url)
      if (!videoId) {
        throw new Error('Could not extract video ID from URL')
      }
      
      // 使用YouTube oEmbed API获取基本信息
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
      const response = await axios.get(oembedUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; YouTube-Learning-Generator/1.0)'
        }
      })
      
      const data = response.data
      
      return {
        title: data.title,
        channel: data.author_name,
        url: url,
        thumbnail: data.thumbnail_url,
        description: undefined, // oEmbed doesn't provide description
        duration: undefined, // oEmbed doesn't provide duration
        views: undefined // oEmbed doesn't provide view count
      }
      
    } catch (error) {
      console.error('Error fetching video info:', error)
      
      // 如果API调用失败，返回基本的解析信息
      const videoId = this.extractVideoId(url)
      return {
        title: `Video ${videoId}`,
        channel: 'Unknown Channel',
        url: url,
        thumbnail: videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : undefined
      }
    }
  }
  
  /**
   * 模拟完整视频信息提取（用于开发测试）
   * 在生产环境中，这里会使用yt-dlp或其他工具
   */
  static async getDetailedVideoInfo(url: string): Promise<VideoInfo> {
    const basicInfo = await this.getBasicVideoInfo(url)
    const videoId = this.extractVideoId(url)
    
    // 生成模拟的详细信息
    const mockDetails = this.generateMockVideoDetails(videoId || 'unknown', basicInfo.title || 'Unknown Title')
    
    return {
      title: basicInfo.title || mockDetails.title,
      channel: basicInfo.channel || mockDetails.channel,
      duration: mockDetails.duration,
      views: mockDetails.views,
      url: url,
      thumbnail: basicInfo.thumbnail || mockDetails.thumbnail,
      description: mockDetails.description
    }
  }
  
  /**
   * 生成模拟的视频详细信息
   */
  private static generateMockVideoDetails(videoId: string, title: string) {
    // 根据标题内容生成相应的模拟数据
    const isReactVideo = title.toLowerCase().includes('react')
    const isPythonVideo = title.toLowerCase().includes('python')
    const isJavaScriptVideo = title.toLowerCase().includes('javascript') || title.toLowerCase().includes('js')
    
    let category = 'Programming'
    let duration = '25:30'
    let views = '245K'
    let description = 'A comprehensive tutorial covering the fundamentals and advanced concepts.'
    
    if (isReactVideo) {
      category = 'Frontend Development'
      duration = '45:20'
      views = '1.2M'
      description = 'Complete React tutorial covering hooks, components, state management, and best practices. Perfect for beginners and intermediate developers.'
    } else if (isPythonVideo) {
      category = 'Data Science'
      duration = '38:15'
      views = '856K'
      description = 'Learn Python programming with practical examples. Covers data analysis, pandas, numpy, and visualization techniques.'
    } else if (isJavaScriptVideo) {
      category = 'Web Development'
      duration = '52:40'
      views = '634K'
      description = 'Master JavaScript fundamentals including ES6+, async/await, DOM manipulation, and modern development practices.'
    }
    
    return {
      title: title,
      channel: this.getChannelNameByCategory(category),
      duration: duration,
      views: views,
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      description: description
    }
  }
  
  /**
   * 根据分类获取模拟频道名称
   */
  private static getChannelNameByCategory(category: string): string {
    const channels = {
      'Frontend Development': 'React Academy',
      'Data Science': 'Data Science Pro',
      'Web Development': 'JavaScript Masters',
      'Programming': 'Code With Examples'
    }
    
    return channels[category as keyof typeof channels] || 'Tech Tutorial Channel'
  }
  
  /**
   * 估算视频时长（秒）
   */
  static parseDurationToSeconds(duration: string): number {
    const parts = duration.split(':').map(part => parseInt(part, 10))
    
    if (parts.length === 2) {
      // MM:SS格式
      return parts[0] * 60 + parts[1]
    } else if (parts.length === 3) {
      // HH:MM:SS格式
      return parts[0] * 3600 + parts[1] * 60 + parts[2]
    }
    
    return 0
  }
  
  /**
   * 验证视频是否适合处理
   */
  static validateVideoForProcessing(videoInfo: VideoInfo): { valid: boolean; reason?: string } {
    // 检查时长限制（假设最大1小时）
    const durationSeconds = this.parseDurationToSeconds(videoInfo.duration)
    if (durationSeconds > 3600) {
      return {
        valid: false,
        reason: 'Video duration exceeds 1 hour limit'
      }
    }
    
    // 检查是否有有效标题
    if (!videoInfo.title || videoInfo.title.length < 10) {
      return {
        valid: false,
        reason: 'Video title is too short or missing'
      }
    }
    
    // 检查频道信息
    if (!videoInfo.channel) {
      return {
        valid: false,
        reason: 'Channel information is missing'
      }
    }
    
    return { valid: true }
  }
  
  /**
   * 获取视频分类和难度评估
   */
  static analyzeVideoContent(videoInfo: VideoInfo): {
    category: string
    difficulty: 'beginner' | 'intermediate' | 'advanced'
    estimatedLearningTime: string
  } {
    const title = videoInfo.title.toLowerCase()
    const description = videoInfo.description?.toLowerCase() || ''
    
    // 分类判断
    let category = 'General'
    if (title.includes('react') || title.includes('vue') || title.includes('angular')) {
      category = 'Frontend Development'
    } else if (title.includes('python') || title.includes('data') || title.includes('pandas')) {
      category = 'Data Science'
    } else if (title.includes('javascript') || title.includes('web') || title.includes('html')) {
      category = 'Web Development'
    } else if (title.includes('machine learning') || title.includes('ai')) {
      category = 'Machine Learning'
    }
    
    // 难度判断
    let difficulty: 'beginner' | 'intermediate' | 'advanced' = 'intermediate'
    if (title.includes('beginner') || title.includes('intro') || title.includes('basic')) {
      difficulty = 'beginner'
    } else if (title.includes('advanced') || title.includes('expert') || title.includes('master')) {
      difficulty = 'advanced'
    }
    
    // 学习时间估算
    const videoDuration = this.parseDurationToSeconds(videoInfo.duration)
    const learningMultiplier = difficulty === 'beginner' ? 1.5 : difficulty === 'advanced' ? 2.5 : 2.0
    const estimatedMinutes = Math.round((videoDuration / 60) * learningMultiplier)
    
    const estimatedLearningTime = estimatedMinutes > 60 
      ? `${Math.floor(estimatedMinutes / 60)}h ${estimatedMinutes % 60}m`
      : `${estimatedMinutes}m`
    
    return {
      category,
      difficulty,
      estimatedLearningTime
    }
  }
}