import { VideoProcess, ProcessVideoRequest, ProcessVideoResponse, VideoStatusResponse, VideoResultResponse } from '../types';
/**
 * 视频处理器 - 统筹整个视频处理流程
 */
export declare class VideoProcessor {
    private static readonly PROCESSING_STEPS;
    /**
     * 开始处理视频
     */
    static processVideo(request: ProcessVideoRequest, userId?: number): Promise<ProcessVideoResponse>;
    /**
     * 执行完整的处理流程
     */
    private static executeProcessingPipeline;
    /**
     * 获取处理状态
     */
    static getProcessStatus(processId: string): Promise<VideoStatusResponse>;
    /**
     * 获取处理结果
     */
    static getProcessResult(processId: string): Promise<VideoResultResponse>;
    /**
     * 获取用户的处理历史
     */
    static getUserProcessHistory(userId: number, limit?: number): Promise<VideoProcess[]>;
    /**
     * 创建处理记录
     */
    private static createProcessRecord;
    /**
     * 更新处理状态
     */
    private static updateProcessStatus;
    /**
     * 更新步骤状态
     */
    private static updateStepStatus;
    /**
     * 保存处理结果
     */
    private static saveProcessingResult;
    /**
     * 更新处理时间
     */
    private static updateProcessingTime;
    /**
     * 获取处理统计信息
     */
    static getProcessingStats(): Promise<{
        totalProcesses: number;
        completedProcesses: number;
        failedProcesses: number;
        averageProcessingTime: number;
        todayProcesses: number;
    }>;
    /**
     * 清理过期的处理记录
     */
    static cleanupExpiredProcesses(daysOld?: number): Promise<number>;
    /**
     * 工具函数：解析时长为秒数
     */
    private static parseDurationToSeconds;
}
//# sourceMappingURL=videoProcessor.d.ts.map