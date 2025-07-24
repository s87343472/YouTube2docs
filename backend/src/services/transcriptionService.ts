import fs from 'fs/promises'
import path from 'path'
import { initGroq, initTogether, hasGroqKey, hasTogetherKey, API_CONFIG } from '../config/apis'
import { TranscriptionResult, TranscriptionSegment, AudioExtractionResult } from '../types'
import { AudioProcessor } from './audioProcessor'
import { ApiQuotaMonitor } from './apiQuotaMonitor'

/**
 * 音频转录服务类
 * 支持Groq和Together AI的Whisper模型，自动降级切换
 */
export class TranscriptionService {
  private static readonly RETRY_ATTEMPTS = 3
  private static readonly RETRY_DELAY = 1000 // 1秒
  private static readonly RATE_LIMIT_RETRY_DELAY = 5 * 60 * 1000 // 5分钟
  private static readonly MAX_RATE_LIMIT_RETRIES = 1 // 最多等待一次限流恢复

  /**
   * 转录音频文件 - 智能多提供商降级
   */
  static async transcribeAudio(
    audioPath: string, 
    language?: string
  ): Promise<TranscriptionResult> {
    // 检查可用的API提供商
    const hasGroq = hasGroqKey()
    const hasTogether = hasTogetherKey()
    
    if (!hasGroq && !hasTogether) {
      throw new Error('没有可用的转录API密钥。请配置Groq或Together AI密钥。')
    }

    console.log(`🎤 Starting transcription: ${audioPath}`)
    console.log(`📡 Available providers: ${hasGroq ? 'Groq' : ''}${hasGroq && hasTogether ? ', ' : ''}${hasTogether ? 'Together' : ''}`)
    
    // 验证音频文件
    await this.validateAudioFile(audioPath)
    
    let lastError: Error | null = null
    
    // 优先尝试Groq（更快速）
    if (hasGroq) {
      try {
        console.log('🚀 Attempting transcription with Groq...')
        const result = await this.transcribeWithGroq(audioPath, language)
        console.log(`✅ Groq transcription completed: ${result.text.length} characters`)
        return result
      } catch (error) {
        lastError = error as Error
        console.warn('⚠️ Groq transcription failed:', error)
        
        // 如果是限流错误且有Together备用，继续尝试
        if (hasTogether && this.shouldFallbackToTogether(error)) {
          console.log('🔄 Falling back to Together AI...')
        } else {
          // 如果不是限流错误或没有备用方案，直接抛出错误
          throw error
        }
      }
    }
    
    // 尝试Together AI
    if (hasTogether) {
      try {
        console.log('🌟 Attempting transcription with Together AI...')
        const result = await this.transcribeWithTogether(audioPath, language)
        console.log(`✅ Together AI transcription completed: ${result.text.length} characters`)
        return result
      } catch (error) {
        lastError = error as Error
        console.error('❌ Together AI transcription failed:', error)
      }
    }
    
    // 所有提供商都失败了
    throw lastError || new Error('所有转录服务都不可用')
  }

  /**
   * 使用Groq进行转录
   */
  private static async transcribeWithGroq(
    audioPath: string,
    language?: string
  ): Promise<TranscriptionResult> {
    // 获取音频时长并检查配额
    const audioDuration = await AudioProcessor.getAudioDuration(audioPath)
    const quotaCheck = await ApiQuotaMonitor.canProcessAudio(audioDuration)
    
    if (!quotaCheck.canProcess) {
      throw new Error(`Groq API配额不足：${quotaCheck.reason}`)
    }
    
    console.log(`📊 Groq quota check passed: ${quotaCheck.currentUsage}/${quotaCheck.limit}s used`)
    
    const groq = initGroq()
    
    // 读取音频文件
    const audioBuffer = await fs.readFile(audioPath)
    const audioFile = new File([audioBuffer], path.basename(audioPath), {
      type: this.getMimeType(audioPath)
    })

    let lastError: Error | null = null

    // 重试机制
    for (let attempt = 1; attempt <= this.RETRY_ATTEMPTS; attempt++) {
      try {
        console.log(`🔄 Groq attempt ${attempt}/${this.RETRY_ATTEMPTS}`)
        
        const transcription = await groq.audio.transcriptions.create({
          file: audioFile,
          model: API_CONFIG.GROQ.MODEL,
          language: language || 'zh',
          response_format: 'verbose_json',
          temperature: 0.0
        })

        // 记录API使用情况
        await ApiQuotaMonitor.recordApiUsage('groq', 'transcription', audioDuration, 0, audioDuration * 0.0002)
        
        return this.processTranscriptionResult(transcription)

      } catch (error) {
        lastError = error as Error
        console.error(`❌ Groq attempt ${attempt} failed:`, error)
        
        // 检查是否是限流错误
        if (this.isRateLimitError(error)) {
          const retryAfter = this.extractRetryAfter(error)
          console.warn(`⏳ Groq rate limit: wait ${Math.ceil(retryAfter / 60)}m${Math.ceil((retryAfter % 60))}s`)
          
          // 如果重试时间超过5分钟，直接抛出限流错误供上层降级
          if (retryAfter > this.RATE_LIMIT_RETRY_DELAY / 1000) {
            throw new Error(`Groq API限流：需要等待${Math.ceil(retryAfter / 60)}分钟`)
          }
          
          // 等待限流恢复（仅第一次尝试）
          if (attempt === 1) {
            console.log(`⏳ Waiting ${Math.ceil(retryAfter)}s for Groq rate limit to reset...`)
            await this.delay(retryAfter * 1000)
            continue
          } else {
            throw new Error(`Groq API限流：已达到最大重试次数`)
          }
        }
        
        if (attempt < this.RETRY_ATTEMPTS) {
          await this.delay(this.RETRY_DELAY * attempt)
        }
      }
    }

    throw lastError || new Error('Groq transcription failed after all retries')
  }

  /**
   * 使用Together AI进行转录
   */
  private static async transcribeWithTogether(
    audioPath: string,
    language?: string
  ): Promise<TranscriptionResult> {
    const together = initTogether()
    
    // 读取音频文件
    const audioBuffer = await fs.readFile(audioPath)
    const audioFile = new File([audioBuffer], path.basename(audioPath), {
      type: this.getMimeType(audioPath)
    })

    let lastError: Error | null = null

    // 重试机制
    for (let attempt = 1; attempt <= this.RETRY_ATTEMPTS; attempt++) {
      try {
        console.log(`🔄 Together AI attempt ${attempt}/${this.RETRY_ATTEMPTS}`)
        
        const transcription = await together.audio.transcriptions.create({
          file: audioFile,
          model: API_CONFIG.TOGETHER.MODEL as "openai/whisper-large-v3",
          language: language || 'zh',
          response_format: 'json',
          timestamp_granularities: 'segment' as "segment"
        })

        // 记录API使用情况
        const audioDuration = await AudioProcessor.getAudioDuration(audioPath)
        await ApiQuotaMonitor.recordApiUsage('together', 'transcription', audioDuration, 0, audioDuration * 0.0001)
        
        return this.processTogetherTranscriptionResult(transcription)

      } catch (error) {
        lastError = error as Error
        console.error(`❌ Together AI attempt ${attempt} failed:`, error)
        
        if (attempt < this.RETRY_ATTEMPTS) {
          await this.delay(this.RETRY_DELAY * attempt)
        }
      }
    }

    throw lastError || new Error('Together AI transcription failed after all retries')
  }

  /**
   * 处理转录结果
   */
  private static processTranscriptionResult(transcription: any): TranscriptionResult {
    const result: TranscriptionResult = {
      text: transcription.text || '',
      language: transcription.language || 'unknown',
      confidence: 0.95, // Groq Whisper通常有很高的准确性
      segments: []
    }

    // 处理分段信息（如果可用）
    if (transcription.segments && Array.isArray(transcription.segments)) {
      result.segments = transcription.segments.map((segment: any) => ({
        start: segment.start || 0,
        end: segment.end || 0,
        text: segment.text || '',
        confidence: segment.avg_logprob ? Math.exp(segment.avg_logprob) : 0.9
      }))
    }

    return result
  }

  /**
   * 批量转录多个音频文件
   */
  static async transcribeMultipleFiles(
    audioPaths: string[],
    language?: string
  ): Promise<TranscriptionResult> {
    const results: TranscriptionResult[] = []
    
    console.log(`🎵 Transcribing ${audioPaths.length} audio segments`)

    for (let i = 0; i < audioPaths.length; i++) {
      const audioPath = audioPaths[i]
      console.log(`📝 Processing segment ${i + 1}/${audioPaths.length}`)
      
      try {
        const result = await this.transcribeAudio(audioPath, language)
        results.push(result)
      } catch (error) {
        console.error(`❌ Failed to transcribe segment ${i + 1}:`, error)
        // 继续处理其他段，但记录错误
        results.push({
          text: `[Transcription failed for segment ${i + 1}]`,
          language: language || 'unknown',
          confidence: 0,
          segments: []
        })
      }
    }

    // 合并所有转录结果
    return this.mergeTranscriptionResults(results)
  }

  /**
   * 合并多个转录结果
   */
  private static mergeTranscriptionResults(results: TranscriptionResult[]): TranscriptionResult {
    const mergedResult: TranscriptionResult = {
      text: '',
      language: results[0]?.language || 'unknown',
      confidence: 0,
      segments: []
    }

    let totalConfidence = 0
    let segmentOffset = 0

    for (const result of results) {
      // 合并文本
      if (mergedResult.text && result.text) {
        mergedResult.text += ' '
      }
      mergedResult.text += result.text

      // 累计置信度
      totalConfidence += result.confidence

      // 合并分段（调整时间偏移）
      if (result.segments) {
        const adjustedSegments = result.segments.map(segment => ({
          ...segment,
          start: segment.start + segmentOffset,
          end: segment.end + segmentOffset
        }))
        mergedResult.segments!.push(...adjustedSegments)
        
        // 更新偏移量（假设每段大约10分钟）
        segmentOffset += 600
      }
    }

    // 计算平均置信度
    mergedResult.confidence = results.length > 0 ? totalConfidence / results.length : 0

    return mergedResult
  }

  /**
   * 智能转录（包含音频预处理和分割）
   */
  static async smartTranscribe(
    audioResult: AudioExtractionResult,
    videoId: string,
    language?: string
  ): Promise<TranscriptionResult> {
    console.log(`🧠 Starting smart transcription for ${videoId}`)

    try {
      // 检查文件大小，决定是否需要分割
      if (audioResult.size > API_CONFIG.GROQ.MAX_FILE_SIZE) {
        console.log('📂 Audio file too large, splitting into segments')
        
        // 使用AudioProcessor分割大文件
        const segmentPaths = await AudioProcessor.splitLargeAudio(audioResult.audioPath, videoId)
        
        if (segmentPaths.length === 0) {
          throw new Error('Failed to split audio file into segments')
        }
        
        console.log(`📝 Split audio into ${segmentPaths.length} segments`)
        return await this.transcribeMultipleFiles(segmentPaths, language)
      } else {
        return await this.transcribeAudio(audioResult.audioPath, language)
      }

    } catch (error) {
      console.error('❌ Smart transcription failed:', error)
      throw error
    }
  }

  /**
   * 验证音频文件
   */
  private static async validateAudioFile(audioPath: string): Promise<void> {
    try {
      await fs.access(audioPath)
      
      const stats = await fs.stat(audioPath)
      if (stats.size === 0) {
        throw new Error('Audio file is empty')
      }
      
      if (stats.size > API_CONFIG.GROQ.MAX_FILE_SIZE) {
        throw new Error('Audio file exceeds maximum size limit')
      }

      const extension = path.extname(audioPath).toLowerCase().slice(1)
      if (!API_CONFIG.GROQ.SUPPORTED_FORMATS.includes(extension)) {
        throw new Error(`Audio format '${extension}' is not supported`)
      }

    } catch (error) {
      throw new Error(`Audio file validation failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * 获取音频文件的MIME类型
   */
  private static getMimeType(audioPath: string): string {
    const extension = path.extname(audioPath).toLowerCase()
    const mimeTypes: { [key: string]: string } = {
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.m4a': 'audio/mp4',
      '.webm': 'audio/webm',
      '.mp4': 'video/mp4'
    }
    
    return mimeTypes[extension] || 'audio/mpeg'
  }

  /**
   * 延迟函数
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 检查是否是限流错误
   */
  private static isRateLimitError(error: any): boolean {
    return error?.status === 429 || 
           error?.error?.code === 'rate_limit_exceeded' ||
           (error?.message && error.message.includes('Rate limit'))
  }

  /**
   * 从错误信息中提取重试等待时间
   */
  private static extractRetryAfter(error: any): number {
    // 优先从headers中获取retry-after
    if (error?.headers?.['retry-after']) {
      return parseInt(error.headers['retry-after'], 10)
    }
    
    // 从错误消息中解析时间
    const message = error?.error?.message || error?.message || ''
    
    // 匹配 "Please try again in 19m14.152s" 格式
    const timeMatch = message.match(/try again in (\d+)m(\d+(?:\.\d+)?)s/)
    if (timeMatch) {
      const minutes = parseInt(timeMatch[1], 10)
      const seconds = parseFloat(timeMatch[2])
      return minutes * 60 + seconds
    }
    
    // 匹配 "try again in 30s" 格式
    const secondsMatch = message.match(/try again in (\d+(?:\.\d+)?)s/)
    if (secondsMatch) {
      return parseFloat(secondsMatch[1])
    }
    
    // 默认等待1分钟
    return 60
  }

  /**
   * 判断是否应该降级到Together AI
   */
  private static shouldFallbackToTogether(error: any): boolean {
    // 限流错误
    if (this.isRateLimitError(error)) {
      return true
    }
    
    // 服务不可用错误
    if (error?.status >= 500) {
      return true
    }
    
    // API密钥无效
    if (error?.status === 401) {
      return true
    }
    
    // 其他可恢复的错误
    return false
  }

  /**
   * 处理Together AI转录结果
   */
  private static processTogetherTranscriptionResult(transcription: any): TranscriptionResult {
    const result: TranscriptionResult = {
      text: transcription.text || '',
      language: transcription.language || 'unknown',
      confidence: 0.95, // Together AI Whisper通常有很高的准确性
      segments: []
    }

    // 处理分段信息（如果可用）
    if (transcription.segments && Array.isArray(transcription.segments)) {
      result.segments = transcription.segments.map((segment: any) => ({
        start: segment.start || 0,
        end: segment.end || 0,
        text: segment.text || '',
        confidence: segment.confidence || 0.9
      }))
    }

    return result
  }



  /**
   * 获取转录统计信息
   */
  static getTranscriptionStats(result: TranscriptionResult): {
    characterCount: number
    wordCount: number
    segmentCount: number
    averageConfidence: number
    estimatedDuration: number
  } {
    const characterCount = result.text.length
    const wordCount = result.text.split(/\s+/).filter(word => word.length > 0).length
    const segmentCount = result.segments?.length || 0
    
    let averageConfidence = result.confidence
    if (result.segments && result.segments.length > 0) {
      const totalConfidence = result.segments.reduce((sum, segment) => sum + segment.confidence, 0)
      averageConfidence = totalConfidence / result.segments.length
    }
    
    const estimatedDuration = result.segments && result.segments.length > 0
      ? Math.max(...result.segments.map(s => s.end))
      : wordCount / 150 * 60 // 估算：150词/分钟
    
    return {
      characterCount,
      wordCount,
      segmentCount,
      averageConfidence: Math.round(averageConfidence * 1000) / 1000,
      estimatedDuration: Math.round(estimatedDuration)
    }
  }
}