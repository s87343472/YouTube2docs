import { VideoInfo } from '../types';
/**
 * YouTube服务类 - 处理视频信息提取
 */
export declare class YouTubeService {
    /**
     * 验证YouTube URL格式
     */
    static isValidYouTubeURL(url: string): boolean;
    /**
     * 从YouTube URL提取视频ID
     */
    static extractVideoId(url: string): string | null;
    /**
     * 获取视频基本信息（使用公开的oEmbed API）
     */
    static getBasicVideoInfo(url: string): Promise<Partial<VideoInfo>>;
    /**
     * 使用yt-dlp获取真实视频信息
     */
    static getDetailedVideoInfo(url: string): Promise<VideoInfo>;
    /**
     * 检查yt-dlp是否可用
     */
    private static checkYtDlpAvailable;
    /**
     * 使用yt-dlp提取真实视频信息
     */
    private static extractRealVideoInfo;
    /**
     * 格式化时长（秒转换为MM:SS或HH:MM:SS）
     */
    private static formatDuration;
    /**
     * 格式化观看次数
     */
    private static formatViewCount;
    /**
     * 获取fallback视频信息（当yt-dlp不可用时）
     */
    private static getFallbackVideoInfo;
    /**
     * 估算视频时长（秒）
     */
    static parseDurationToSeconds(duration: string): number;
    /**
     * 验证视频是否适合处理
     */
    static validateVideoForProcessing(videoInfo: VideoInfo): {
        valid: boolean;
        reason?: string;
    };
    /**
     * 获取视频分类和难度评估
     */
    static analyzeVideoContent(videoInfo: VideoInfo): {
        category: string;
        difficulty: 'beginner' | 'intermediate' | 'advanced';
        estimatedLearningTime: string;
    };
}
//# sourceMappingURL=youtubeService.d.ts.map