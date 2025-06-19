import fs from 'fs/promises'
import path from 'path'
import { initGroq, hasGroqKey, API_CONFIG } from '../config/apis'
import { TranscriptionResult, TranscriptionSegment, AudioExtractionResult } from '../types'
import { AudioProcessor } from './audioProcessor'

/**
 * 音频转录服务类
 * 使用Groq Whisper Large v3 Turbo进行超高速音频转录
 */
export class TranscriptionService {
  private static readonly RETRY_ATTEMPTS = 3
  private static readonly RETRY_DELAY = 1000 // 1秒

  /**
   * 转录音频文件
   */
  static async transcribeAudio(
    audioPath: string, 
    language?: string
  ): Promise<TranscriptionResult> {
    if (!hasGroqKey()) {
      throw new Error('Groq API key required for transcription but not configured')
    }

    try {
      console.log(`🎤 Starting transcription: ${audioPath}`)
      
      // 验证音频文件
      await this.validateAudioFile(audioPath)
      
      // 执行转录
      const result = await this.performTranscription(audioPath, language)
      
      console.log(`✅ Transcription completed: ${result.text.length} characters`)
      return result

    } catch (error) {
      console.error('❌ Transcription failed:', error)
      throw error
    }
  }

  /**
   * 执行实际的转录操作
   */
  private static async performTranscription(
    audioPath: string,
    language?: string
  ): Promise<TranscriptionResult> {
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
        console.log(`🔄 Transcription attempt ${attempt}/${this.RETRY_ATTEMPTS}`)
        
        const transcription = await groq.audio.transcriptions.create({
          file: audioFile,
          model: API_CONFIG.GROQ.MODEL,
          language: language || 'zh', // 默认使用中文，Groq不支持auto语言检测
          response_format: 'verbose_json', // 获取详细信息包括时间戳
          temperature: 0.0 // 最高准确性
        })

        // 处理转录结果
        return this.processTranscriptionResult(transcription)

      } catch (error) {
        lastError = error as Error
        console.error(`❌ Transcription attempt ${attempt} failed:`, error)
        
        if (attempt < this.RETRY_ATTEMPTS) {
          await this.delay(this.RETRY_DELAY * attempt)
        }
      }
    }

    throw lastError || new Error('Transcription failed after all retries')
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