import { spawn, exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs/promises'
import { AudioExtractionResult, TranscriptionResult } from '../types'
import { API_CONFIG } from '../config/apis'

const execAsync = promisify(exec)

/**
 * 音频处理服务类
 * 负责从YouTube视频提取音频并进行预处理
 */
export class AudioProcessor {
  private static readonly TEMP_DIR = path.join(process.cwd(), 'temp')
  private static readonly MAX_DURATION = 7200 // 2小时
  private static readonly MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB (increased limit)

  /**
   * 确保临时目录存在
   */
  private static async ensureTempDir(): Promise<void> {
    try {
      await fs.access(this.TEMP_DIR)
    } catch {
      await fs.mkdir(this.TEMP_DIR, { recursive: true })
    }
  }

  /**
   * 检查系统依赖
   */
  static async checkDependencies(): Promise<{ ytdlp: boolean; ffmpeg: boolean }> {
    const results = { ytdlp: false, ffmpeg: false }

    try {
      await execAsync('yt-dlp --version')
      results.ytdlp = true
    } catch {
      console.warn('⚠️ yt-dlp not found. Audio extraction will use mock data.')
    }

    try {
      await execAsync('ffmpeg -version')
      results.ffmpeg = true
    } catch {
      console.warn('⚠️ FFmpeg not found. Audio processing will use mock data.')
    }

    return results
  }

  /**
   * 使用yt-dlp提取音频
   */
  static async extractAudio(youtubeUrl: string, videoId: string): Promise<AudioExtractionResult> {
    await this.ensureTempDir()
    
    const dependencies = await this.checkDependencies()
    
    if (!dependencies.ytdlp) {
      throw new Error('yt-dlp is required for audio extraction but not available')
    }

    const outputPath = path.join(this.TEMP_DIR, `${videoId}.%(ext)s`)
    
    try {
      // yt-dlp命令参数 - 优化为质量平衡
      const args = [
        '--extract-audio',
        '--audio-format', 'mp3',
        '--audio-quality', '64K', // 降低质量减小文件大小
        '--no-playlist',
        '--max-filesize', `${this.MAX_FILE_SIZE}`,
        '--match-filter', `duration < ${this.MAX_DURATION}`,
        '--postprocessor-args', 'ffmpeg:-ar 16000 -ac 1', // 直接在提取时优化
        '-o', outputPath,
        youtubeUrl
      ]

      console.log(`🎵 Extracting audio from: ${youtubeUrl}`)
      
      const result = await this.executeYtDlp(args)
      
      // 等待文件处理完成
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // 查找生成的音频文件
      const audioFile = await this.findAudioFile(videoId)
      
      if (!audioFile) {
        // 尝试列出临时目录中的文件进行调试
        const files = await fs.readdir(this.TEMP_DIR).catch(() => [])
        console.log(`🔍 Available files in temp dir: ${files.join(', ')}`)
        throw new Error('Audio file not found after extraction')
      }

      const stats = await fs.stat(audioFile)
      
      return {
        audioPath: audioFile,
        duration: await this.getAudioDuration(audioFile),
        format: path.extname(audioFile).slice(1),
        size: stats.size
      }

    } catch (error) {
      console.error('❌ Audio extraction failed:', error)
      throw error
    }
  }

  /**
   * 执行yt-dlp命令
   */
  private static async executeYtDlp(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn('yt-dlp', args)
      let output = ''
      let errorOutput = ''

      process.stdout.on('data', (data) => {
        output += data.toString()
        console.log(`📥 ${data.toString().trim()}`)
      })

      process.stderr.on('data', (data) => {
        errorOutput += data.toString()
        console.error(`📥 ${data.toString().trim()}`)
      })

      process.on('close', (code) => {
        if (code === 0) {
          resolve(output)
        } else {
          reject(new Error(`yt-dlp failed with code ${code}: ${errorOutput}`))
        }
      })

      process.on('error', (error) => {
        reject(new Error(`Failed to start yt-dlp: ${error.message}`))
      })
    })
  }

  /**
   * 查找提取的音频文件
   */
  private static async findAudioFile(videoId: string): Promise<string | null> {
    try {
      const files = await fs.readdir(this.TEMP_DIR)
      const audioFile = files.find(file => 
        file.startsWith(videoId) && 
        API_CONFIG.GROQ.SUPPORTED_FORMATS.some(format => file.endsWith(`.${format}`))
      )
      
      return audioFile ? path.join(this.TEMP_DIR, audioFile) : null
    } catch {
      return null
    }
  }

  /**
   * 使用FFmpeg预处理音频
   */
  static async preprocessAudio(inputPath: string, videoId: string): Promise<string> {
    const dependencies = await this.checkDependencies()
    
    if (!dependencies.ffmpeg) {
      console.warn('⚠️ FFmpeg not available, skipping preprocessing')
      return inputPath
    }

    const outputPath = path.join(this.TEMP_DIR, `${videoId}_processed.wav`)

    try {
      // FFmpeg预处理参数（Groq推荐的格式）
      const args = [
        '-i', inputPath,
        '-ar', '16000',           // 采样率16kHz
        '-ac', '1',               // 单声道
        '-c:a', 'pcm_s16le',      // 16位PCM编码
        '-filter:a', 'volume=1.5', // 音量标准化
        '-y',                     // 覆盖输出文件
        outputPath
      ]

      console.log(`🔧 Preprocessing audio: ${inputPath}`)
      
      await this.executeFFmpeg(args)
      
      // 验证输出文件
      await fs.access(outputPath)
      
      return outputPath

    } catch (error) {
      console.error('❌ Audio preprocessing failed:', error)
      return inputPath // 失败时返回原始文件
    }
  }

  /**
   * 执行FFmpeg命令
   */
  private static async executeFFmpeg(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn('ffmpeg', args)
      let errorOutput = ''

      process.stderr.on('data', (data) => {
        errorOutput += data.toString()
        // FFmpeg输出到stderr，这是正常的
      })

      process.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`FFmpeg failed with code ${code}: ${errorOutput}`))
        }
      })

      process.on('error', (error) => {
        reject(new Error(`Failed to start FFmpeg: ${error.message}`))
      })
    })
  }

  /**
   * 获取音频时长
   */
  static async getAudioDuration(audioPath: string): Promise<number> {
    try {
      const { stdout } = await execAsync(
        `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${audioPath}"`
      )
      return Math.round(parseFloat(stdout.trim()))
    } catch {
      return 0
    }
  }

  /**
   * 分割大音频文件
   */
  static async splitLargeAudio(audioPath: string, videoId: string): Promise<string[]> {
    const stats = await fs.stat(audioPath)
    
    if (stats.size <= this.MAX_FILE_SIZE) {
      return [audioPath]
    }

    console.log(`📂 Splitting large audio file: ${audioPath}`)
    
    const duration = await this.getAudioDuration(audioPath)
    const segmentDuration = Math.ceil(duration / Math.ceil(stats.size / this.MAX_FILE_SIZE))
    
    const segments: string[] = []
    const segmentCount = Math.ceil(duration / segmentDuration)

    for (let i = 0; i < segmentCount; i++) {
      const startTime = i * segmentDuration
      const outputPath = path.join(this.TEMP_DIR, `${videoId}_segment_${i}.wav`)
      
      const args = [
        '-i', audioPath,
        '-ss', startTime.toString(),
        '-t', segmentDuration.toString(),
        '-c', 'copy',
        '-y',
        outputPath
      ]

      try {
        await this.executeFFmpeg(args)
        segments.push(outputPath)
      } catch (error) {
        console.error(`❌ Failed to create segment ${i}:`, error)
      }
    }

    return segments
  }

  /**
   * 清理临时文件
   */
  static async cleanupTempFiles(videoId: string): Promise<void> {
    try {
      const files = await fs.readdir(this.TEMP_DIR)
      const tempFiles = files.filter(file => file.includes(videoId))
      
      for (const file of tempFiles) {
        await fs.unlink(path.join(this.TEMP_DIR, file))
      }
      
      console.log(`🧹 Cleaned up ${tempFiles.length} temporary files for ${videoId}`)
    } catch (error) {
      console.error('❌ Cleanup failed:', error)
    }
  }

  /**
   * 清理指定时间之前的旧音频文件
   */
  static async cleanupOldAudioFiles(hoursOld: number = 24): Promise<number> {
    try {
      await this.ensureTempDir()
      const files = await fs.readdir(this.TEMP_DIR)
      const cutoffTime = Date.now() - (hoursOld * 60 * 60 * 1000)
      
      let deletedCount = 0
      
      for (const file of files) {
        const filePath = path.join(this.TEMP_DIR, file)
        try {
          const stats = await fs.stat(filePath)
          
          // 删除超过指定时间的文件
          if (stats.mtime.getTime() < cutoffTime) {
            await fs.unlink(filePath)
            deletedCount++
          }
        } catch (fileError) {
          console.warn(`Failed to process file ${file}:`, fileError)
        }
      }
      
      if (deletedCount > 0) {
        console.log(`🧹 Cleaned up ${deletedCount} old audio files (>${hoursOld}h old)`)
      }
      
      return deletedCount
    } catch (error) {
      console.error('❌ Old audio files cleanup failed:', error)
      return 0
    }
  }



  /**
   * 验证音频文件质量
   */
  static async validateAudioQuality(audioPath: string): Promise<{
    isValid: boolean
    issues: string[]
    recommendations: string[]
  }> {
    const issues: string[] = []
    const recommendations: string[] = []

    try {
      // 检查文件大小
      const stats = await fs.stat(audioPath)
      if (stats.size === 0) {
        issues.push('Audio file is empty')
      } else if (stats.size > this.MAX_FILE_SIZE) {
        issues.push('Audio file exceeds maximum size')
        recommendations.push('Consider splitting into segments')
      }

      // 检查音频时长
      const duration = await this.getAudioDuration(audioPath)
      if (duration === 0) {
        issues.push('Unable to determine audio duration')
      } else if (duration > this.MAX_DURATION) {
        issues.push('Audio duration exceeds maximum length')
        recommendations.push('Consider processing in segments')
      }

      // 检查文件格式
      const format = path.extname(audioPath).slice(1).toLowerCase()
      if (!API_CONFIG.GROQ.SUPPORTED_FORMATS.includes(format)) {
        issues.push(`Audio format '${format}' not supported`)
        recommendations.push('Convert to mp3, wav, or m4a format')
      }

    } catch (error) {
      issues.push(`Audio validation failed: ${error instanceof Error ? error.message : String(error)}`)
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations
    }
  }

  /**
   * 获取音频处理统计信息
   */
  static async getProcessingStats(): Promise<{
    tempDirSize: number
    fileCount: number
    oldestFile: Date | null
  }> {
    try {
      await this.ensureTempDir()
      const files = await fs.readdir(this.TEMP_DIR)
      
      let totalSize = 0
      let oldestTime = Date.now()

      for (const file of files) {
        const filePath = path.join(this.TEMP_DIR, file)
        const stats = await fs.stat(filePath)
        totalSize += stats.size
        
        if (stats.mtime.getTime() < oldestTime) {
          oldestTime = stats.mtime.getTime()
        }
      }

      return {
        tempDirSize: totalSize,
        fileCount: files.length,
        oldestFile: files.length > 0 ? new Date(oldestTime) : null
      }
    } catch {
      return {
        tempDirSize: 0,
        fileCount: 0,
        oldestFile: null
      }
    }
  }
}