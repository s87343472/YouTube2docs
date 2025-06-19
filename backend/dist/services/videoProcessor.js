"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoProcessor = void 0;
const uuid_1 = require("uuid");
const database_1 = require("../config/database");
const youtubeService_1 = require("./youtubeService");
const audioProcessor_1 = require("./audioProcessor");
const transcriptionService_1 = require("./transcriptionService");
const contentAnalyzer_1 = require("./contentAnalyzer");
/**
 * 视频处理器 - 统筹整个视频处理流程
 */
class VideoProcessor {
    /**
     * 开始处理视频
     */
    static async processVideo(request, userId) {
        console.log(`🎬 Starting video processing: ${request.youtubeUrl}`);
        try {
            // 验证YouTube URL
            if (!youtubeService_1.YouTubeService.isValidYouTubeURL(request.youtubeUrl)) {
                throw new Error('Invalid YouTube URL format');
            }
            // 生成处理ID
            const processId = (0, uuid_1.v4)();
            // 估算总处理时间
            const estimatedTime = this.PROCESSING_STEPS.reduce((sum, step) => sum + step.estimatedDuration, 0);
            // 创建处理记录
            await this.createProcessRecord(processId, request.youtubeUrl, userId);
            // 设置初始状态
            await this.updateProcessStatus(processId, 'processing', 0, 'extract_info');
            // 异步开始处理
            this.executeProcessingPipeline(processId, request).catch(error => {
                console.error(`❌ Processing pipeline failed for ${processId}:`, error);
                this.updateProcessStatus(processId, 'failed', 0, 'extract_info', error instanceof Error ? error.message : String(error));
            });
            return {
                processId,
                status: 'accepted',
                estimatedTime,
                message: '视频处理已开始，预计需要2-3分钟完成'
            };
        }
        catch (error) {
            console.error('❌ Failed to start video processing:', error);
            throw new Error(`Processing failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * 执行完整的处理流程
     */
    static async executeProcessingPipeline(processId, request) {
        const startTime = Date.now();
        try {
            console.log(`🚀 Executing processing pipeline for ${processId}`);
            // 步骤1: 提取视频信息
            await this.updateStepStatus(processId, 'extract_info', 'processing');
            const videoInfo = await youtubeService_1.YouTubeService.getDetailedVideoInfo(request.youtubeUrl);
            await this.updateStepStatus(processId, 'extract_info', 'completed');
            await this.updateProcessStatus(processId, 'processing', 15, 'extract_audio');
            // 验证视频是否适合处理
            const validation = youtubeService_1.YouTubeService.validateVideoForProcessing(videoInfo);
            if (!validation.valid) {
                throw new Error(`Video validation failed: ${validation.reason}`);
            }
            // 步骤2: 提取音频
            await this.updateStepStatus(processId, 'extract_audio', 'processing');
            const videoId = youtubeService_1.YouTubeService.extractVideoId(request.youtubeUrl) || processId;
            const audioResult = await audioProcessor_1.AudioProcessor.extractAudio(request.youtubeUrl, videoId);
            await this.updateStepStatus(processId, 'extract_audio', 'completed');
            await this.updateProcessStatus(processId, 'processing', 35, 'transcribe');
            // 步骤3: 音频转录
            await this.updateStepStatus(processId, 'transcribe', 'processing');
            const transcription = await transcriptionService_1.TranscriptionService.smartTranscribe(audioResult, videoId, request.options?.language);
            await this.updateStepStatus(processId, 'transcribe', 'completed');
            await this.updateProcessStatus(processId, 'processing', 60, 'analyze_content');
            // 步骤4: 内容分析
            await this.updateStepStatus(processId, 'analyze_content', 'processing');
            const learningMaterial = await contentAnalyzer_1.ContentAnalyzer.analyzeLearningContent(videoInfo, transcription);
            await this.updateStepStatus(processId, 'analyze_content', 'completed');
            await this.updateProcessStatus(processId, 'processing', 85, 'generate_knowledge_graph');
            // 步骤5: 知识图谱生成（已集成到内容分析中）
            await this.updateStepStatus(processId, 'generate_knowledge_graph', 'processing');
            // 知识图谱生成已在ContentAnalyzer中完成
            await this.updateStepStatus(processId, 'generate_knowledge_graph', 'completed');
            await this.updateProcessStatus(processId, 'processing', 95, 'finalize');
            // 步骤6: 完成处理
            await this.updateStepStatus(processId, 'finalize', 'processing');
            await this.saveProcessingResult(processId, learningMaterial);
            await this.updateStepStatus(processId, 'finalize', 'completed');
            // 计算实际处理时间
            const processingTime = Math.round((Date.now() - startTime) / 1000);
            await this.updateProcessStatus(processId, 'completed', 100, 'finalize');
            await this.updateProcessingTime(processId, processingTime);
            // 清理临时文件
            await audioProcessor_1.AudioProcessor.cleanupTempFiles(videoId);
            console.log(`✅ Processing pipeline completed for ${processId} in ${processingTime}s`);
        }
        catch (error) {
            console.error(`❌ Processing pipeline failed for ${processId}:`, error);
            await this.updateProcessStatus(processId, 'failed', 0, 'extract_info', error instanceof Error ? error.message : String(error));
            throw error;
        }
    }
    /**
     * 获取处理状态
     */
    static async getProcessStatus(processId) {
        try {
            const result = await database_1.pool.query('SELECT status, progress, current_step, error_message FROM video_processes WHERE id = $1', [processId]);
            if (result.rows.length === 0) {
                throw new Error('Process not found');
            }
            const process = result.rows[0];
            // 计算剩余时间
            let estimatedTimeRemaining = 0;
            if (process.status === 'processing') {
                const remainingSteps = this.PROCESSING_STEPS.slice(this.PROCESSING_STEPS.findIndex(s => s.id === process.current_step));
                estimatedTimeRemaining = remainingSteps.reduce((sum, step) => sum + step.estimatedDuration, 0);
            }
            return {
                processId,
                status: process.status,
                progress: process.progress || 0,
                currentStep: process.current_step,
                estimatedTimeRemaining,
                error: process.error_message
            };
        }
        catch (error) {
            console.error('Failed to get process status:', error);
            throw new Error(`Status query failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * 获取处理结果
     */
    static async getProcessResult(processId) {
        try {
            const result = await database_1.pool.query(`
        SELECT 
          status, 
          result_data, 
          processing_time,
          created_at
        FROM video_processes 
        WHERE id = $1 AND status = 'completed'
      `, [processId]);
            if (result.rows.length === 0) {
                throw new Error('Completed process not found');
            }
            const process = result.rows[0];
            return {
                processId,
                status: 'completed',
                result: process.result_data,
                processingTime: process.processing_time || 0,
                downloadUrls: {
                    pdf: `/api/download/${processId}/pdf`,
                    markdown: `/api/download/${processId}/markdown`,
                    json: `/api/download/${processId}/json`
                }
            };
        }
        catch (error) {
            console.error('Failed to get process result:', error);
            throw new Error(`Result query failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * 获取用户的处理历史
     */
    static async getUserProcessHistory(userId, limit = 10) {
        try {
            const result = await database_1.pool.query(`
        SELECT 
          id, youtube_url, video_title, channel_name, 
          status, progress, created_at, processing_time
        FROM video_processes 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2
      `, [userId, limit]);
            return result.rows;
        }
        catch (error) {
            console.error('Failed to get user process history:', error);
            throw new Error(`History query failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * 创建处理记录
     */
    static async createProcessRecord(processId, youtubeUrl, userId) {
        await database_1.pool.query(`
      INSERT INTO video_processes (
        id, user_id, youtube_url, status, progress, created_at
      ) VALUES ($1, $2, $3, 'pending', 0, CURRENT_TIMESTAMP)
    `, [processId, userId || null, youtubeUrl]);
    }
    /**
     * 更新处理状态
     */
    static async updateProcessStatus(processId, status, progress, currentStep, errorMessage) {
        const query = errorMessage
            ? `UPDATE video_processes 
         SET status = $2, progress = $3, current_step = $4, error_message = $5, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1`
            : `UPDATE video_processes 
         SET status = $2, progress = $3, current_step = $4, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1`;
        const params = errorMessage
            ? [processId, status, progress, currentStep, errorMessage]
            : [processId, status, progress, currentStep];
        await database_1.pool.query(query, params);
        // 同时更新Redis缓存以供实时查询
        const statusData = {
            processId,
            status,
            progress,
            currentStep,
            timestamp: Date.now(),
            error: errorMessage
        };
        await database_1.redis.setex(`process:${processId}`, 3600, JSON.stringify(statusData)); // 1小时过期
    }
    /**
     * 更新步骤状态
     */
    static async updateStepStatus(processId, stepId, status) {
        // 这里可以实现更详细的步骤状态跟踪
        console.log(`📝 Step ${stepId} for ${processId}: ${status}`);
    }
    /**
     * 保存处理结果
     */
    static async saveProcessingResult(processId, learningMaterial) {
        await database_1.pool.query(`
      UPDATE video_processes 
      SET 
        video_title = $2,
        video_description = $3,
        channel_name = $4,
        duration = $5,
        result_data = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [
            processId,
            learningMaterial.videoInfo.title,
            learningMaterial.videoInfo.description,
            learningMaterial.videoInfo.channel,
            this.parseDurationToSeconds(learningMaterial.videoInfo.duration),
            JSON.stringify(learningMaterial)
        ]);
    }
    /**
     * 更新处理时间
     */
    static async updateProcessingTime(processId, processingTime) {
        await database_1.pool.query(`
      UPDATE video_processes 
      SET processing_time = $2, processing_end_time = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [processId, processingTime]);
    }
    /**
     * 获取处理统计信息
     */
    static async getProcessingStats() {
        try {
            const result = await database_1.pool.query(`
        SELECT 
          COUNT(*) as total_processes,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_processes,
          COUNT(*) FILTER (WHERE status = 'failed') as failed_processes,
          AVG(processing_time) FILTER (WHERE processing_time IS NOT NULL) as avg_processing_time,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as today_processes
        FROM video_processes
      `);
            const stats = result.rows[0];
            return {
                totalProcesses: parseInt(stats.total_processes) || 0,
                completedProcesses: parseInt(stats.completed_processes) || 0,
                failedProcesses: parseInt(stats.failed_processes) || 0,
                averageProcessingTime: Math.round(parseFloat(stats.avg_processing_time)) || 0,
                todayProcesses: parseInt(stats.today_processes) || 0
            };
        }
        catch (error) {
            console.error('Failed to get processing stats:', error);
            return {
                totalProcesses: 0,
                completedProcesses: 0,
                failedProcesses: 0,
                averageProcessingTime: 0,
                todayProcesses: 0
            };
        }
    }
    /**
     * 清理过期的处理记录
     */
    static async cleanupExpiredProcesses(daysOld = 30) {
        try {
            const result = await database_1.pool.query(`
        DELETE FROM video_processes 
        WHERE created_at < CURRENT_DATE - INTERVAL '${daysOld} days'
        AND status IN ('completed', 'failed')
      `);
            const deletedCount = result.rowCount || 0;
            console.log(`🧹 Cleaned up ${deletedCount} expired process records`);
            return deletedCount;
        }
        catch (error) {
            console.error('Failed to cleanup expired processes:', error);
            return 0;
        }
    }
    /**
     * 工具函数：解析时长为秒数
     */
    static parseDurationToSeconds(duration) {
        const parts = duration.split(':').map(Number);
        if (parts.length === 2)
            return parts[0] * 60 + parts[1];
        if (parts.length === 3)
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        return 0;
    }
}
exports.VideoProcessor = VideoProcessor;
VideoProcessor.PROCESSING_STEPS = [
    {
        id: 'extract_info',
        name: '视频信息提取',
        description: '获取YouTube视频基本信息',
        estimatedDuration: 10,
        status: 'pending'
    },
    {
        id: 'extract_audio',
        name: '音频提取',
        description: '从视频中提取高质量音频',
        estimatedDuration: 30,
        status: 'pending'
    },
    {
        id: 'transcribe',
        name: '音频转录',
        description: '使用Groq Whisper进行语音识别',
        estimatedDuration: 40,
        status: 'pending'
    },
    {
        id: 'analyze_content',
        name: '内容分析',
        description: '使用GPT-4分析内容生成学习资料',
        estimatedDuration: 60,
        status: 'pending'
    },
    {
        id: 'generate_knowledge_graph',
        name: '知识图谱生成',
        description: '构建概念关联和知识网络',
        estimatedDuration: 30,
        status: 'pending'
    },
    {
        id: 'finalize',
        name: '完成处理',
        description: '整合所有结果并保存',
        estimatedDuration: 10,
        status: 'pending'
    }
];
//# sourceMappingURL=videoProcessor.js.map