import { TranscriptionResult, AudioExtractionResult } from '../types';
/**
 * 音频转录服务类
 * 使用Groq Whisper Large v3 Turbo进行超高速音频转录
 */
export declare class TranscriptionService {
    private static readonly RETRY_ATTEMPTS;
    private static readonly RETRY_DELAY;
    /**
     * 转录音频文件
     */
    static transcribeAudio(audioPath: string, language?: string): Promise<TranscriptionResult>;
    /**
     * 执行实际的转录操作
     */
    private static performTranscription;
    /**
     * 处理转录结果
     */
    private static processTranscriptionResult;
    /**
     * 批量转录多个音频文件
     */
    static transcribeMultipleFiles(audioPaths: string[], language?: string): Promise<TranscriptionResult>;
    /**
     * 合并多个转录结果
     */
    private static mergeTranscriptionResults;
    /**
     * 智能转录（包含音频预处理和分割）
     */
    static smartTranscribe(audioResult: AudioExtractionResult, videoId: string, language?: string): Promise<TranscriptionResult>;
    /**
     * 验证音频文件
     */
    private static validateAudioFile;
    /**
     * 获取音频文件的MIME类型
     */
    private static getMimeType;
    /**
     * 延迟函数
     */
    private static delay;
    /**
     * 获取转录统计信息
     */
    static getTranscriptionStats(result: TranscriptionResult): {
        characterCount: number;
        wordCount: number;
        segmentCount: number;
        averageConfidence: number;
        estimatedDuration: number;
    };
}
//# sourceMappingURL=transcriptionService.d.ts.map