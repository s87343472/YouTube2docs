import { AudioExtractionResult } from '../types';
/**
 * 音频处理服务类
 * 负责从YouTube视频提取音频并进行预处理
 */
export declare class AudioProcessor {
    private static readonly TEMP_DIR;
    private static readonly MAX_DURATION;
    private static readonly MAX_FILE_SIZE;
    /**
     * 确保临时目录存在
     */
    private static ensureTempDir;
    /**
     * 检查系统依赖
     */
    static checkDependencies(): Promise<{
        ytdlp: boolean;
        ffmpeg: boolean;
    }>;
    /**
     * 使用yt-dlp提取音频
     */
    static extractAudio(youtubeUrl: string, videoId: string): Promise<AudioExtractionResult>;
    /**
     * 执行yt-dlp命令
     */
    private static executeYtDlp;
    /**
     * 查找提取的音频文件
     */
    private static findAudioFile;
    /**
     * 使用FFmpeg预处理音频
     */
    static preprocessAudio(inputPath: string, videoId: string): Promise<string>;
    /**
     * 执行FFmpeg命令
     */
    private static executeFFmpeg;
    /**
     * 获取音频时长
     */
    private static getAudioDuration;
    /**
     * 分割大音频文件
     */
    static splitLargeAudio(audioPath: string, videoId: string): Promise<string[]>;
    /**
     * 清理临时文件
     */
    static cleanupTempFiles(videoId: string): Promise<void>;
    /**
     * 验证音频文件质量
     */
    static validateAudioQuality(audioPath: string): Promise<{
        isValid: boolean;
        issues: string[];
        recommendations: string[];
    }>;
    /**
     * 获取音频处理统计信息
     */
    static getProcessingStats(): Promise<{
        tempDirSize: number;
        fileCount: number;
        oldestFile: Date | null;
    }>;
}
//# sourceMappingURL=audioProcessor.d.ts.map