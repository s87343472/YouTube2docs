import { VideoInfo, TranscriptionResult, LearningMaterial, KnowledgeGraph, StudyCard } from '../types';
/**
 * 知识图谱生成服务
 */
export declare class KnowledgeGraphService {
    /**
     * 基于学习材料生成完整知识图谱
     */
    static generateKnowledgeGraph(videoInfo: VideoInfo, transcription: TranscriptionResult, learningMaterial: LearningMaterial): Promise<KnowledgeGraph>;
    /**
     * 生成学习卡片
     */
    static generateStudyCards(knowledgeGraph: KnowledgeGraph, learningMaterial: LearningMaterial): Promise<StudyCard[]>;
    /**
     * 第一步：提取关键概念
     */
    private static extractConcepts;
    /**
     * 第二步：构建知识节点
     */
    private static buildKnowledgeNodes;
    /**
     * 第三步：分析概念关系
     */
    private static analyzeConceptRelationships;
    /**
     * 第四步：优化知识图谱结构
     */
    private static optimizeKnowledgeGraph;
    /**
     * 第五步：生成图谱元数据
     */
    private static generateGraphMetadata;
    /**
     * 生成学习路径
     */
    private static generateLearningPath;
    /**
     * 工具函数：分类概念类型
     */
    private static classifyConceptType;
    /**
     * 生成概念描述
     */
    private static generateConceptDescription;
    /**
     * 计算概念重要性
     */
    private static calculateImportance;
    /**
     * 计算概念复杂度
     */
    private static calculateComplexity;
    /**
     * 查找概念时间范围
     */
    private static findConceptTimeRange;
    /**
     * 提取概念示例
     */
    private static extractExamples;
    /**
     * 分析概念对关系
     */
    private static analyzeConceptPair;
    /**
     * 计算概念相似度
     */
    private static calculateSimilarity;
    /**
     * 生成概念卡片
     */
    private static generateConceptCard;
    /**
     * 生成总结卡片
     */
    private static generateSummaryCards;
    /**
     * 生成问答卡片
     */
    private static generateQuestionCards;
    /**
     * 生成模拟知识图谱（用于API不可用时）
     */
    private static generateMockKnowledgeGraph;
    /**
     * 生成模拟学习卡片
     */
    private static generateMockStudyCards;
}
//# sourceMappingURL=knowledgeGraphService.d.ts.map