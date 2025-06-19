"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.YouTubeService = void 0;
const axios_1 = __importDefault(require("axios"));
const child_process_1 = require("child_process");
/**
 * YouTube服务类 - 处理视频信息提取
 */
class YouTubeService {
    /**
     * 验证YouTube URL格式
     */
    static isValidYouTubeURL(url) {
        const patterns = [
            /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]{11}/,
            /^https?:\/\/(www\.)?youtu\.be\/[\w-]{11}/,
            /^https?:\/\/(www\.)?youtube\.com\/embed\/[\w-]{11}/,
            /^https?:\/\/(www\.)?youtube\.com\/v\/[\w-]{11}/
        ];
        return patterns.some(pattern => pattern.test(url));
    }
    /**
     * 从YouTube URL提取视频ID
     */
    static extractVideoId(url) {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^#\&\?]*)/
        ];
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }
        return null;
    }
    /**
     * 获取视频基本信息（使用公开的oEmbed API）
     */
    static async getBasicVideoInfo(url) {
        try {
            if (!this.isValidYouTubeURL(url)) {
                throw new Error('Invalid YouTube URL format');
            }
            const videoId = this.extractVideoId(url);
            if (!videoId) {
                throw new Error('Could not extract video ID from URL');
            }
            // 使用YouTube oEmbed API获取基本信息
            const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
            const response = await axios_1.default.get(oembedUrl, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; YouTube-Learning-Generator/1.0)'
                }
            });
            const data = response.data;
            return {
                title: data.title,
                channel: data.author_name,
                url: url,
                thumbnail: data.thumbnail_url,
                description: undefined, // oEmbed doesn't provide description
                duration: undefined, // oEmbed doesn't provide duration
                views: undefined // oEmbed doesn't provide view count
            };
        }
        catch (error) {
            console.error('Error fetching video info:', error);
            // 如果API调用失败，返回基本的解析信息
            const videoId = this.extractVideoId(url);
            return {
                title: `Video ${videoId}`,
                channel: 'Unknown Channel',
                url: url,
                thumbnail: videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : undefined
            };
        }
    }
    /**
     * 使用yt-dlp获取真实视频信息
     */
    static async getDetailedVideoInfo(url) {
        try {
            console.log(`🔍 Extracting real video info for: ${url}`);
            // 首先检查yt-dlp是否可用
            const hasYtDlp = await this.checkYtDlpAvailable();
            console.log(`🔧 yt-dlp availability check: ${hasYtDlp}`);
            if (!hasYtDlp) {
                console.warn('⚠️ yt-dlp not available, using fallback method');
                return this.getFallbackVideoInfo(url);
            }
            // 使用yt-dlp获取真实信息
            console.log(`🚀 Using yt-dlp to extract real video info`);
            const realInfo = await this.extractRealVideoInfo(url);
            console.log(`✅ Real video info extracted: ${realInfo.duration}`);
            return realInfo;
        }
        catch (error) {
            console.error('❌ Failed to get real video info:', error);
            console.warn('🔄 Falling back to mock data due to error');
            // 如果获取真实信息失败，使用fallback
            return this.getFallbackVideoInfo(url);
        }
    }
    /**
     * 检查yt-dlp是否可用
     */
    static async checkYtDlpAvailable() {
        return new Promise((resolve) => {
            const process = (0, child_process_1.spawn)('yt-dlp', ['--version']);
            process.on('close', (code) => {
                resolve(code === 0);
            });
            process.on('error', () => {
                resolve(false);
            });
            // 超时处理
            setTimeout(() => {
                process.kill();
                resolve(false);
            }, 5000);
        });
    }
    /**
     * 使用yt-dlp提取真实视频信息
     */
    static async extractRealVideoInfo(url) {
        return new Promise((resolve, reject) => {
            const args = [
                '--print',
                '%(title)s|||%(uploader)s|||%(duration)s|||%(view_count)s|||%(thumbnail)s',
                url
            ];
            const process = (0, child_process_1.spawn)('yt-dlp', args);
            let output = '';
            let errorOutput = '';
            process.stdout.on('data', (data) => {
                output += data.toString();
            });
            process.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });
            process.on('close', (code) => {
                if (code === 0 && output.trim()) {
                    try {
                        const parts = output.trim().split('|||');
                        const [title, uploader, duration, viewCount, thumbnail] = parts;
                        // 格式化时长
                        const durationInt = parseInt(duration) || 0;
                        const formattedDuration = this.formatDuration(durationInt);
                        // 格式化观看次数
                        const viewCountInt = parseInt(viewCount) || 0;
                        const formattedViews = this.formatViewCount(viewCountInt);
                        resolve({
                            title: title || 'Unknown Title',
                            channel: uploader || 'Unknown Channel',
                            duration: formattedDuration,
                            views: formattedViews,
                            url: url,
                            thumbnail: thumbnail || undefined,
                            description: undefined // 暂时不获取描述以简化解析
                        });
                    }
                    catch (parseError) {
                        console.error('❌ Failed to parse yt-dlp output:', parseError);
                        reject(new Error('Failed to parse video information'));
                    }
                }
                else {
                    reject(new Error(`yt-dlp failed with code ${code}: ${errorOutput}`));
                }
            });
            process.on('error', (error) => {
                reject(new Error(`Failed to start yt-dlp: ${error.message}`));
            });
            // 超时处理
            setTimeout(() => {
                process.kill();
                reject(new Error('yt-dlp extraction timeout'));
            }, 30000); // 30秒超时
        });
    }
    /**
     * 格式化时长（秒转换为MM:SS或HH:MM:SS）
     */
    static formatDuration(seconds) {
        if (seconds <= 0)
            return '0:00';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
        }
        else {
            return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
        }
    }
    /**
     * 格式化观看次数
     */
    static formatViewCount(views) {
        if (views >= 1000000) {
            return `${(views / 1000000).toFixed(1)}M`;
        }
        else if (views >= 1000) {
            return `${(views / 1000).toFixed(1)}K`;
        }
        else {
            return views.toString();
        }
    }
    /**
     * 获取fallback视频信息（当yt-dlp不可用时）
     */
    static async getFallbackVideoInfo(url) {
        // 只使用基本信息，不生成模拟数据
        const basicInfo = await this.getBasicVideoInfo(url);
        if (!basicInfo.title) {
            throw new Error('Unable to extract video information - yt-dlp required');
        }
        return {
            title: basicInfo.title,
            channel: basicInfo.channel || 'Unknown Channel',
            duration: '0:00', // 无法确定时长
            views: '0',
            url: url,
            thumbnail: basicInfo.thumbnail,
            description: undefined
        };
    }
    /**
     * 估算视频时长（秒）
     */
    static parseDurationToSeconds(duration) {
        const parts = duration.split(':').map(part => parseInt(part, 10));
        if (parts.length === 2) {
            // MM:SS格式
            return parts[0] * 60 + parts[1];
        }
        else if (parts.length === 3) {
            // HH:MM:SS格式
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
        return 0;
    }
    /**
     * 验证视频是否适合处理
     */
    static validateVideoForProcessing(videoInfo) {
        // 检查时长限制（最大2小时，可配置）
        const durationSeconds = this.parseDurationToSeconds(videoInfo.duration);
        const maxDuration = 7200; // 2小时，可以根据需要调整
        if (durationSeconds > maxDuration) {
            return {
                valid: false,
                reason: `Video duration exceeds ${Math.floor(maxDuration / 3600)} hour limit`
            };
        }
        // 检查是否有有效标题
        if (!videoInfo.title || videoInfo.title.length < 10) {
            return {
                valid: false,
                reason: 'Video title is too short or missing'
            };
        }
        // 检查频道信息
        if (!videoInfo.channel) {
            return {
                valid: false,
                reason: 'Channel information is missing'
            };
        }
        return { valid: true };
    }
    /**
     * 获取视频分类和难度评估
     */
    static analyzeVideoContent(videoInfo) {
        const title = videoInfo.title.toLowerCase();
        const description = videoInfo.description?.toLowerCase() || '';
        // 分类判断
        let category = 'General';
        if (title.includes('react') || title.includes('vue') || title.includes('angular')) {
            category = 'Frontend Development';
        }
        else if (title.includes('python') || title.includes('data') || title.includes('pandas')) {
            category = 'Data Science';
        }
        else if (title.includes('javascript') || title.includes('web') || title.includes('html')) {
            category = 'Web Development';
        }
        else if (title.includes('machine learning') || title.includes('ai')) {
            category = 'Machine Learning';
        }
        // 难度判断
        let difficulty = 'intermediate';
        if (title.includes('beginner') || title.includes('intro') || title.includes('basic')) {
            difficulty = 'beginner';
        }
        else if (title.includes('advanced') || title.includes('expert') || title.includes('master')) {
            difficulty = 'advanced';
        }
        // 学习时间估算
        const videoDuration = this.parseDurationToSeconds(videoInfo.duration);
        const learningMultiplier = difficulty === 'beginner' ? 1.5 : difficulty === 'advanced' ? 2.5 : 2.0;
        const estimatedMinutes = Math.round((videoDuration / 60) * learningMultiplier);
        const estimatedLearningTime = estimatedMinutes > 60
            ? `${Math.floor(estimatedMinutes / 60)}h ${estimatedMinutes % 60}m`
            : `${estimatedMinutes}m`;
        return {
            category,
            difficulty,
            estimatedLearningTime
        };
    }
}
exports.YouTubeService = YouTubeService;
//# sourceMappingURL=youtubeService.js.map