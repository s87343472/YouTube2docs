import { VideoInfo, TranscriptionResult, LearningMaterial } from '../types';
/**
 * 智能内容分析引擎
 * 使用GPT-4分析转录内容，生成结构化学习资料
 */
export declare class ContentAnalyzer {
    private static readonly MAX_RETRIES;
    private static readonly RETRY_DELAY;
    /**
     * 分析视频内容并生成完整学习资料
     */
    static analyzeLearningContent(videoInfo: VideoInfo, transcription: TranscriptionResult): Promise<LearningMaterial>;
    /**
     * 选择分析策略
     */
    private static selectAnalysisStrategy;
    /**
     * 生成内容摘要
     */
    private static generateSummary;
    /**
     * 生成结构化内容
     */
    private static generateStructuredContent;
    /**
     * 调用Gemini API
     */
    private static callGemini;
    /**
     * 获取摘要生成的系统提示
     */
    private static getSummarySystemPrompt;
    /**
     * 获取结构化内容的系统提示
     */
    private static getStructuredContentSystemPrompt;
    /**
     * 构建摘要用户提示
     */
    private static buildSummaryUserPrompt;
    /**
     * 构建结构化内容用户提示
     */
    private static buildStructuredContentUserPrompt;
    /**
     * 解析摘要响应
     */
    private static parseSummaryResponse;
    /**
     * 解析结构化内容响应
     */
    private static parseStructuredContentResponse;
    /**
     * 工具函数
     */
    private static parseDurationToSeconds;
    private static formatTime;
    private static delay;
    /**
     * 获取内容分析统计信息
     */
    static getAnalysisStats(material: LearningMaterial): {
        keyPointsCount: number;
        conceptsCount: number;
        chaptersCount: number;
        totalWords: number;
        estimatedReadingTime: number;
    };
}
//# sourceMappingURL=contentAnalyzer.d.ts.map