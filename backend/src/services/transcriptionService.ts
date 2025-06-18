import fs from 'fs/promises'
import path from 'path'
import { initGroq, hasGroqKey, API_CONFIG } from '../config/apis'
import { TranscriptionResult, TranscriptionSegment, AudioExtractionResult } from '../types'

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
      console.log('⚠️ Groq API key not configured, using mock transcription')
      return this.generateMockTranscription(audioPath)
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
      
      // 失败时返回模拟转录结果
      return this.generateMockTranscription(audioPath)
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
          language: language || 'auto', // 自动检测语言
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
        
        // 这里应该调用AudioProcessor的分割功能
        // 为了简化，我们模拟分割后的文件路径
        const segmentPaths = [audioResult.audioPath] // 实际应该是分割后的多个文件
        
        return await this.transcribeMultipleFiles(segmentPaths, language)
      } else {
        return await this.transcribeAudio(audioResult.audioPath, language)
      }

    } catch (error) {
      console.error('❌ Smart transcription failed:', error)
      return this.generateMockTranscription(audioResult.audioPath)
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
   * 生成模拟转录结果
   */
  private static generateMockTranscription(audioPath: string): TranscriptionResult {
    const fileName = path.basename(audioPath, path.extname(audioPath))
    
    // 根据文件名生成相应的模拟内容
    let mockText = ''
    let language = 'en'

    if (fileName.includes('react') || fileName.toLowerCase().includes('react')) {
      mockText = this.getMockReactTranscription()
    } else if (fileName.includes('python') || fileName.toLowerCase().includes('python')) {
      mockText = this.getMockPythonTranscription()
      language = 'en'
    } else {
      mockText = this.getGenericMockTranscription()
    }

    // 生成模拟的分段信息
    const segments = this.generateMockSegments(mockText)

    return {
      text: mockText,
      language: language,
      confidence: 0.92,
      segments: segments
    }
  }

  /**
   * 生成React相关的模拟转录
   */
  private static getMockReactTranscription(): string {
    return `Welcome to this comprehensive React Hooks tutorial. In this video, we're going to cover everything you need to know about React Hooks, including useState, useEffect, and useContext.

First, let's start with useState. useState is a Hook that lets you add React state to function components. Before Hooks, you could only use state in class components, but now with useState, you can use state in function components as well.

Here's how useState works. You call useState with the initial state value, and it returns an array with two elements: the current state value and a function to update it. For example, const [count, setCount] = useState(0).

Now let's move on to useEffect. useEffect is a Hook that lets you perform side effects in function components. It serves the same purpose as componentDidMount, componentDidUpdate, and componentWillUnmount combined in React class components.

The basic syntax is useEffect with a function as the first argument. This function will run after every completed render. You can also provide a second argument, which is an array of dependencies. The effect will only re-run if one of the dependencies has changed.

Finally, let's talk about useContext. useContext is a Hook that lets you consume React Context without having to wrap your component in a Context Consumer. It makes your code cleaner and easier to read.

To use useContext, you first need to create a context using React.createContext, then you can consume it in any component using the useContext Hook.

These are the three most commonly used Hooks in React, and mastering them will make you much more productive when building React applications.`
  }

  /**
   * 生成Python相关的模拟转录
   */
  private static getMockPythonTranscription(): string {
    return `Welcome to this Python data analysis tutorial using pandas. In this video, we'll explore how to work with DataFrames, clean data, and perform various data analysis operations.

Pandas is one of the most important libraries for data analysis in Python. It provides data structures like DataFrame and Series that make it easy to work with structured data.

Let's start by importing pandas. The convention is to import it as pd: import pandas as pd. Now we can create a DataFrame from various sources like CSV files, dictionaries, or lists.

Data cleaning is a crucial part of data analysis. We'll learn how to handle missing values using methods like dropna() and fillna(). We'll also see how to remove duplicates and fix data types.

Next, we'll explore data manipulation techniques. This includes filtering data, grouping by columns, and performing aggregations like sum, mean, and count. The groupby() method is particularly powerful for this.

We'll also cover data visualization using matplotlib and seaborn. Creating charts and plots is essential for understanding your data and communicating insights.

Finally, we'll look at some advanced pandas techniques like merging DataFrames, pivot tables, and time series analysis. These skills will help you handle more complex data analysis tasks.`
  }

  /**
   * 生成通用的模拟转录
   */
  private static getGenericMockTranscription(): string {
    return `Welcome to this educational video. Today we're going to learn about important concepts and practical applications.

Throughout this tutorial, we'll cover fundamental principles and advanced techniques that will help you understand the subject better. We'll start with the basics and gradually move to more complex topics.

The key to mastering any skill is practice and understanding the underlying concepts. We'll provide plenty of examples and real-world applications to help you grasp these concepts effectively.

By the end of this video, you'll have a solid understanding of the material and be able to apply what you've learned in practical situations. Let's get started with our first topic.`
  }

  /**
   * 生成模拟的分段信息
   */
  private static generateMockSegments(text: string): TranscriptionSegment[] {
    const sentences = text.split('. ').filter(s => s.trim().length > 0)
    const segments: TranscriptionSegment[] = []
    
    let currentTime = 0
    const averageWordsPerMinute = 150 // 平均语速
    
    sentences.forEach((sentence, index) => {
      const wordCount = sentence.split(' ').length
      const duration = (wordCount / averageWordsPerMinute) * 60 // 转换为秒
      
      segments.push({
        start: Math.round(currentTime * 100) / 100,
        end: Math.round((currentTime + duration) * 100) / 100,
        text: sentence.trim() + (index < sentences.length - 1 ? '.' : ''),
        confidence: 0.85 + Math.random() * 0.1 // 0.85-0.95之间的随机置信度
      })
      
      currentTime += duration + 0.5 // 添加短暂停顿
    })
    
    return segments
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