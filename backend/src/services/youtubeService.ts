import axios from 'axios'
import { VideoInfo } from '../types'
import { spawn } from 'child_process'

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
   * 使用yt-dlp获取真实视频信息
   */
  static async getDetailedVideoInfo(url: string): Promise<VideoInfo> {
    try {
      console.log(`🔍 Extracting real video info for: ${url}`)
      
      // 首先检查yt-dlp是否可用
      const hasYtDlp = await this.checkYtDlpAvailable()
      console.log(`🔧 yt-dlp availability check: ${hasYtDlp}`)
      
      if (!hasYtDlp) {
        console.warn('⚠️ yt-dlp not available, using fallback method')
        return this.getFallbackVideoInfo(url)
      }
      
      // 使用yt-dlp获取真实信息
      console.log(`🚀 Using yt-dlp to extract real video info`)
      const realInfo = await this.extractRealVideoInfo(url)
      console.log(`✅ Real video info extracted: ${realInfo.duration}`)
      return realInfo
      
    } catch (error) {
      console.error('❌ Failed to get real video info:', error)
      console.warn('🔄 Falling back to mock data due to error')
      // 如果获取真实信息失败，使用fallback
      return this.getFallbackVideoInfo(url)
    }
  }
  
  /**
   * 检查yt-dlp是否可用
   */
  private static async checkYtDlpAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const process = spawn('yt-dlp', ['--version'])
      
      process.on('close', (code) => {
        resolve(code === 0)
      })
      
      process.on('error', () => {
        resolve(false)
      })
      
      // 超时处理
      setTimeout(() => {
        process.kill()
        resolve(false)
      }, 5000)
    })
  }
  
  /**
   * 使用yt-dlp提取真实视频信息
   */
  private static async extractRealVideoInfo(url: string): Promise<VideoInfo> {
    return new Promise((resolve, reject) => {
      const args = [
        '--print',
        '%(title)s|||%(uploader)s|||%(duration)s|||%(view_count)s|||%(thumbnail)s',
        url
      ]
      
      const process = spawn('yt-dlp', args)
      let output = ''
      let errorOutput = ''
      
      process.stdout.on('data', (data) => {
        output += data.toString()
      })
      
      process.stderr.on('data', (data) => {
        errorOutput += data.toString()
      })
      
      process.on('close', (code) => {
        if (code === 0 && output.trim()) {
          try {
            const parts = output.trim().split('|||')
            const [title, uploader, duration, viewCount, thumbnail] = parts
            
            // 格式化时长
            const durationInt = parseInt(duration) || 0
            const formattedDuration = this.formatDuration(durationInt)
            
            // 格式化观看次数
            const viewCountInt = parseInt(viewCount) || 0
            const formattedViews = this.formatViewCount(viewCountInt)
            
            resolve({
              title: title || 'Unknown Title',
              channel: uploader || 'Unknown Channel',
              duration: formattedDuration,
              views: formattedViews,
              url: url,
              thumbnail: thumbnail || undefined,
              description: undefined // 暂时不获取描述以简化解析
            })
          } catch (parseError) {
            console.error('❌ Failed to parse yt-dlp output:', parseError)
            reject(new Error('Failed to parse video information'))
          }
        } else {
          reject(new Error(`yt-dlp failed with code ${code}: ${errorOutput}`))
        }
      })
      
      process.on('error', (error) => {
        reject(new Error(`Failed to start yt-dlp: ${error.message}`))
      })
      
      // 超时处理
      setTimeout(() => {
        process.kill()
        reject(new Error('yt-dlp extraction timeout'))
      }, 30000) // 30秒超时
    })
  }
  
  /**
   * 格式化时长（秒转换为MM:SS或HH:MM:SS）
   */
  private static formatDuration(seconds: number): string {
    if (seconds <= 0) return '0:00'
    
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
    } else {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
    }
  }
  
  /**
   * 格式化观看次数
   */
  private static formatViewCount(views: number): string {
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M`
    } else if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K`
    } else {
      return views.toString()
    }
  }
  
  /**
   * 获取fallback视频信息（当yt-dlp不可用时）
   */
  private static async getFallbackVideoInfo(url: string): Promise<VideoInfo> {
    // 只使用基本信息，不生成模拟数据
    const basicInfo = await this.getBasicVideoInfo(url)
    
    if (!basicInfo.title) {
      throw new Error('Unable to extract video information - yt-dlp required')
    }
    
    return {
      title: basicInfo.title,
      channel: basicInfo.channel || 'Unknown Channel',
      duration: '0:00', // 无法确定时长
      views: '0',
      url: url,
      thumbnail: basicInfo.thumbnail,
      description: undefined
    }
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
  static validateVideoForProcessing(videoInfo: VideoInfo): { 
    valid: boolean; 
    reason?: string;
    suggestion?: string;
    limits?: {
      maxDuration: string;
      currentDuration: string;
      exceeded: boolean;
    }
  } {
    // 检查时长限制（最大2小时）
    const durationSeconds = this.parseDurationToSeconds(videoInfo.duration)
    const maxDuration = 7200 // 2小时
    const currentDurationStr = this.formatDuration(durationSeconds)
    const maxDurationStr = this.formatDuration(maxDuration)
    
    if (durationSeconds > maxDuration) {
      return {
        valid: false,
        reason: `视频时长过长 (${currentDurationStr})，超出免费版限制 (${maxDurationStr})`,
        suggestion: '💡 建议：1) 选择较短视频(≤2小时) 2) 分段处理长内容 3) 升级付费版处理大型视频',
        limits: {
          maxDuration: maxDurationStr,
          currentDuration: currentDurationStr,
          exceeded: true
        }
      }
    }
    
    // 检查是否有有效标题
    if (!videoInfo.title || videoInfo.title.length < 10) {
      return {
        valid: false,
        reason: '视频标题信息不完整',
        suggestion: '请检查视频链接是否有效且可访问'
      }
    }
    
    // 检查频道信息
    if (!videoInfo.channel) {
      return {
        valid: false,
        reason: '无法获取频道信息',
        suggestion: '请确认视频为公开可访问状态'
      }
    }
    
    return { 
      valid: true,
      limits: {
        maxDuration: maxDurationStr,
        currentDuration: currentDurationStr,
        exceeded: false
      }
    }
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