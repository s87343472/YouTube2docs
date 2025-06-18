import axios, { AxiosInstance, AxiosResponse } from 'axios'

// API配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

// 创建axios实例
const api: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000, // 30秒超时
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`)
    return config
  },
  (error) => {
    console.error('❌ API Request Error:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`)
    return response
  },
  (error) => {
    console.error('❌ API Response Error:', error?.response?.data || error.message)
    return Promise.reject(error)
  }
)

// 类型定义
export interface ProcessVideoRequest {
  youtubeUrl: string
  options?: {
    language?: string
    outputFormat?: 'concise' | 'standard' | 'detailed'
    includeTimestamps?: boolean
  }
}

export interface ProcessVideoResponse {
  processId: string
  status: 'accepted'
  estimatedTime: number
  message: string
}

export interface VideoStatusResponse {
  processId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  currentStep?: string
  estimatedTimeRemaining?: number
  error?: string
}

export interface VideoInfo {
  title: string
  channel: string
  duration: string
  views?: string
  url: string
  thumbnail?: string
  description?: string
}

export interface LearningMaterial {
  videoInfo: VideoInfo
  summary: {
    keyPoints: string[]
    learningTime: string
    difficulty: 'beginner' | 'intermediate' | 'advanced'
    concepts: Array<{
      name: string
      explanation: string
    }>
  }
  structuredContent: {
    overview?: string
    learningObjectives?: string[]
    prerequisites?: string[]
    chapters: Array<{
      title: string
      timeRange: string
      keyPoints: string[]
      concepts: string[]
      practicalApplications?: string[]
    }>
  }
  knowledgeGraph: {
    nodes: any[]
    edges: any[]
  }
  studyCards: any[]
}

export interface VideoResultResponse {
  processId: string
  status: 'completed'
  result: LearningMaterial
  processingTime: number
  downloadUrls: {
    pdf?: string
    markdown?: string
    json?: string
  }
}

export interface ProcessingStats {
  totalProcesses: number
  completedProcesses: number
  failedProcesses: number
  averageProcessingTime: number
  todayProcesses: number
}

export interface HealthStatus {
  status: 'healthy' | 'partial' | 'unhealthy' | 'error'
  data: {
    timestamp: string
    services: {
      database: boolean
      audio_processor: boolean
      transcription: boolean
      content_analyzer: boolean
    }
    dependencies: {
      ytdlp: boolean
      ffmpeg: boolean
    }
    overall: string
  }
}

/**
 * 视频处理API服务类
 */
export class VideoAPI {
  /**
   * 提交视频处理请求
   */
  static async processVideo(request: ProcessVideoRequest): Promise<ProcessVideoResponse> {
    try {
      const response = await api.post<ProcessVideoResponse>('/videos/process', request)
      return response.data
    } catch (error: any) {
      throw new Error(error?.response?.data?.error?.message || 'Failed to submit video for processing')
    }
  }

  /**
   * 获取处理状态
   */
  static async getProcessStatus(processId: string): Promise<VideoStatusResponse> {
    try {
      const response = await api.get<VideoStatusResponse>(`/videos/${processId}/status`)
      return response.data
    } catch (error: any) {
      throw new Error(error?.response?.data?.error?.message || 'Failed to get process status')
    }
  }

  /**
   * 获取处理结果
   */
  static async getProcessResult(processId: string): Promise<VideoResultResponse> {
    try {
      const response = await api.get<VideoResultResponse>(`/videos/${processId}/result`)
      return response.data
    } catch (error: any) {
      throw new Error(error?.response?.data?.error?.message || 'Failed to get process result')
    }
  }

  /**
   * 轮询处理状态直到完成
   */
  static async pollProcessStatus(
    processId: string,
    onProgress?: (status: VideoStatusResponse) => void,
    interval: number = 2000
  ): Promise<VideoStatusResponse> {
    return new Promise((resolve, reject) => {
      const pollInterval = setInterval(async () => {
        try {
          const status = await this.getProcessStatus(processId)
          
          // 调用进度回调
          if (onProgress) {
            onProgress(status)
          }

          // 检查是否完成
          if (status.status === 'completed' || status.status === 'failed') {
            clearInterval(pollInterval)
            resolve(status)
          }

        } catch (error) {
          clearInterval(pollInterval)
          reject(error)
        }
      }, interval)

      // 设置超时（最多等待10分钟）
      setTimeout(() => {
        clearInterval(pollInterval)
        reject(new Error('Process polling timeout'))
      }, 10 * 60 * 1000)
    })
  }

  /**
   * 测试视频信息提取
   */
  static async testVideoExtraction(youtubeUrl: string): Promise<{
    videoInfo: VideoInfo
    analysis: any
    validation: any
  }> {
    try {
      const response = await api.post('/videos/test-extract', { youtubeUrl })
      return response.data.data
    } catch (error: any) {
      throw new Error(error?.response?.data?.error?.message || 'Failed to extract video information')
    }
  }

  /**
   * 获取处理统计信息
   */
  static async getProcessingStats(): Promise<ProcessingStats> {
    try {
      const response = await api.get<{ status: string; data: ProcessingStats }>('/videos/stats')
      return response.data.data
    } catch (error: any) {
      throw new Error(error?.response?.data?.error?.message || 'Failed to get processing statistics')
    }
  }

  /**
   * 检查服务健康状态
   */
  static async getHealthStatus(): Promise<HealthStatus> {
    try {
      const response = await api.get<HealthStatus>('/videos/health')
      return response.data
    } catch (error: any) {
      // 健康检查失败时返回错误状态
      return {
        status: 'error',
        data: {
          timestamp: new Date().toISOString(),
          services: {
            database: false,
            audio_processor: false,
            transcription: false,
            content_analyzer: false
          },
          dependencies: {
            ytdlp: false,
            ffmpeg: false
          },
          overall: 'error'
        }
      }
    }
  }
}

/**
 * 系统API服务类
 */
export class SystemAPI {
  /**
   * 获取系统信息
   */
  static async getSystemInfo(): Promise<{
    status: string
    version: string
    features: Record<string, boolean>
    timestamp: string
  }> {
    try {
      const response = await api.get('/system/info')
      return response.data
    } catch (error: any) {
      throw new Error(error?.response?.data?.error?.message || 'Failed to get system information')
    }
  }

  /**
   * 获取基本健康检查
   */
  static async getBasicHealth(): Promise<{
    status: string
    timestamp: string
    uptime: number
    environment: string
  }> {
    try {
      const response = await axios.get(`${API_BASE_URL}/health`)
      return response.data
    } catch (error: any) {
      throw new Error('Failed to get basic health status')
    }
  }
}

/**
 * 工具函数
 */
export class APIUtils {
  /**
   * 检查YouTube URL格式
   */
  static isValidYouTubeURL(url: string): boolean {
    const patterns = [
      /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]{11}/,
      /^https?:\/\/(www\.)?youtu\.be\/[\w-]{11}/,
      /^https?:\/\/(www\.)?youtube\.com\/embed\/[\w-]{11}/
    ]
    return patterns.some(pattern => pattern.test(url))
  }

  /**
   * 格式化处理时间
   */
  static formatProcessingTime(seconds: number): string {
    if (seconds < 60) return `${seconds}秒`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}分${remainingSeconds}秒`
  }

  /**
   * 格式化文件大小
   */
  static formatFileSize(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 B'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`
  }

  /**
   * 获取处理状态的显示文本
   */
  static getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      'pending': '等待处理',
      'processing': '处理中',
      'completed': '已完成',
      'failed': '处理失败'
    }
    return statusMap[status] || status
  }

  /**
   * 获取步骤的显示文本
   */
  static getStepText(step: string): string {
    const stepMap: Record<string, string> = {
      'extract_info': '提取视频信息',
      'extract_audio': '提取音频',
      'transcribe': '音频转录',
      'analyze_content': '内容分析',
      'generate_knowledge_graph': '生成知识图谱',
      'finalize': '完成处理'
    }
    return stepMap[step] || step
  }
}

export default api