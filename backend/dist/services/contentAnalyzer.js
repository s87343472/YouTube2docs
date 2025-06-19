"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentAnalyzer = void 0;
const apis_1 = require("../config/apis");
const knowledgeGraphService_1 = require("./knowledgeGraphService");
/**
 * 智能内容分析引擎
 * 使用GPT-4分析转录内容，生成结构化学习资料
 */
class ContentAnalyzer {
    /**
     * 分析视频内容并生成完整学习资料
     */
    static async analyzeLearningContent(videoInfo, transcription) {
        console.log(`🧠 Starting content analysis for: ${videoInfo.title}`);
        // 检查Gemini API
        if (!(0, apis_1.hasGeminiKey)()) {
            throw new Error('Gemini API key required for content analysis. Please configure GEMINI_API_KEY.');
        }
        try {
            // 基于视频时长选择分析策略
            const strategy = this.selectAnalysisStrategy(videoInfo);
            console.log(`📊 Using analysis strategy: ${strategy}, API: Gemini`);
            // 并行生成基础内容
            const [summary, structuredContent] = await Promise.all([
                this.generateSummary(videoInfo, transcription, strategy),
                this.generateStructuredContent(videoInfo, transcription, strategy)
            ]);
            // 创建基础学习材料
            const baseLearningMaterial = {
                videoInfo,
                summary,
                structuredContent,
                knowledgeGraph: { nodes: [], edges: [] },
                studyCards: []
            };
            // 生成知识图谱
            const knowledgeGraph = await knowledgeGraphService_1.KnowledgeGraphService.generateKnowledgeGraph(videoInfo, transcription, baseLearningMaterial);
            // 基于知识图谱生成学习卡片
            const studyCards = await knowledgeGraphService_1.KnowledgeGraphService.generateStudyCards(knowledgeGraph, baseLearningMaterial);
            const result = {
                videoInfo,
                transcription,
                summary,
                structuredContent,
                knowledgeGraph,
                studyCards
            };
            console.log(`✅ Content analysis completed successfully`);
            return result;
        }
        catch (error) {
            console.error('❌ Content analysis failed:', error);
            throw error;
        }
    }
    /**
     * 选择分析策略
     */
    static selectAnalysisStrategy(videoInfo) {
        const duration = this.parseDurationToSeconds(videoInfo.duration);
        if (duration <= 600)
            return 'concise'; // 10分钟以内
        if (duration <= 1800)
            return 'structured'; // 30分钟以内  
        if (duration <= 3600)
            return 'comprehensive'; // 60分钟以内
        return 'course'; // 60分钟以上
    }
    /**
     * 生成内容摘要
     */
    static async generateSummary(videoInfo, transcription, strategy) {
        const systemPrompt = this.getSummarySystemPrompt(strategy);
        const userPrompt = this.buildSummaryUserPrompt(videoInfo, transcription);
        try {
            const response = await this.callGemini(systemPrompt, userPrompt);
            return this.parseSummaryResponse(response);
        }
        catch (error) {
            console.error('Failed to generate summary:', error);
            throw error;
        }
    }
    /**
     * 生成结构化内容
     */
    static async generateStructuredContent(videoInfo, transcription, strategy) {
        const systemPrompt = this.getStructuredContentSystemPrompt(strategy);
        const userPrompt = this.buildStructuredContentUserPrompt(videoInfo, transcription);
        try {
            const response = await this.callGemini(systemPrompt, userPrompt);
            return this.parseStructuredContentResponse(response);
        }
        catch (error) {
            console.error('Failed to generate structured content:', error);
            throw error;
        }
    }
    /**
     * 调用Gemini API
     */
    static async callGemini(systemPrompt, userPrompt) {
        const gemini = (0, apis_1.initGemini)();
        const model = gemini.getGenerativeModel({
            model: apis_1.API_CONFIG.GEMINI.MODEL,
            generationConfig: {
                temperature: apis_1.API_CONFIG.GEMINI.TEMPERATURE,
                maxOutputTokens: apis_1.API_CONFIG.GEMINI.MAX_TOKENS,
                responseMimeType: "application/json"
            }
        });
        let lastError = null;
        for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
            try {
                console.log(`🤖 Gemini API call attempt ${attempt}/${this.MAX_RETRIES}`);
                const prompt = `${systemPrompt}\n\n${userPrompt}`;
                const result = await model.generateContent(prompt);
                const response = await result.response;
                const content = response.text();
                if (!content) {
                    throw new Error('Empty response from Gemini');
                }
                console.log(`✅ Gemini response received (${content.length} characters)`);
                return content;
            }
            catch (error) {
                lastError = error;
                console.error(`❌ Gemini attempt ${attempt} failed:`, error);
                if (attempt < this.MAX_RETRIES) {
                    await this.delay(this.RETRY_DELAY * attempt);
                }
            }
        }
        throw lastError || new Error('Gemini API failed after all retries');
    }
    /**
     * 获取摘要生成的系统提示
     */
    static getSummarySystemPrompt(strategy) {
        const basePrompt = `你是一个专业的学习资料生成专家。根据视频转录内容，生成高质量的学习摘要。

输出要求：
1. 必须返回有效的JSON格式
2. 包含关键要点、学习时间、难度评估和核心概念
3. 内容要准确、简洁、有教育价值

JSON格式示例：
{
  "keyPoints": ["要点1", "要点2", "要点3"],
  "learningTime": "预计学习时间",
  "difficulty": "beginner|intermediate|advanced",
  "concepts": [
    {
      "name": "概念名称",
      "explanation": "概念解释"
    }
  ]
}`;
        const strategyPrompts = {
            concise: '策略：精炼模式 - 提取3-5个核心要点，适合快速学习',
            structured: '策略：结构化模式 - 提取5-8个要点，包含详细概念解释',
            comprehensive: '策略：深度模式 - 提取8-12个要点，包含高级概念和应用',
            course: '策略：课程模式 - 提取完整知识体系，包含多层次概念'
        };
        return basePrompt + '\n\n' + strategyPrompts[strategy];
    }
    /**
     * 获取结构化内容的系统提示
     */
    static getStructuredContentSystemPrompt(strategy) {
        return `你是一个专业的教学内容结构化专家。将视频内容组织成逻辑清晰的学习章节。

输出要求：
1. 必须返回有效的JSON格式
2. 按时间顺序或逻辑顺序组织章节
3. 每个章节包含标题、时间范围、关键要点

JSON格式示例：
{
  "overview": "内容概述",
  "learningObjectives": ["学习目标1", "学习目标2"],
  "prerequisites": ["前置知识1", "前置知识2"],
  "chapters": [
    {
      "title": "章节标题",
      "timeRange": "开始时间-结束时间",
      "keyPoints": ["要点1", "要点2"],
      "concepts": ["相关概念1", "相关概念2"],
      "practicalApplications": ["应用场景1", "应用场景2"]
    }
  ]
}

策略：${strategy}模式 - 根据视频长度和复杂度调整章节划分的细致程度。`;
    }
    /**
     * 构建摘要用户提示
     */
    static buildSummaryUserPrompt(videoInfo, transcription) {
        return `请分析以下视频内容并生成学习摘要：

视频信息：
- 标题：${videoInfo.title}
- 频道：${videoInfo.channel}
- 时长：${videoInfo.duration}
- 描述：${videoInfo.description || '无描述'}

转录内容：
${transcription.text}

请基于以上信息生成JSON格式的学习摘要。`;
    }
    /**
     * 构建结构化内容用户提示
     */
    static buildStructuredContentUserPrompt(videoInfo, transcription) {
        const hasSegments = transcription.segments && transcription.segments.length > 0;
        let segmentInfo = '';
        if (hasSegments) {
            segmentInfo = '\n\n时间分段信息：\n' +
                transcription.segments.slice(0, 10).map(segment => `${this.formatTime(segment.start)}-${this.formatTime(segment.end)}: ${segment.text.substring(0, 100)}...`).join('\n');
        }
        return `请将以下视频内容组织成结构化的学习章节：

视频信息：
- 标题：${videoInfo.title}
- 频道：${videoInfo.channel}
- 时长：${videoInfo.duration}

转录内容：
${transcription.text}${segmentInfo}

请基于以上信息生成JSON格式的结构化内容。`;
    }
    /**
     * 解析摘要响应
     */
    static parseSummaryResponse(response) {
        try {
            const parsed = JSON.parse(response);
            return {
                keyPoints: parsed.keyPoints || [],
                learningTime: parsed.learningTime || '未知',
                difficulty: parsed.difficulty || 'intermediate',
                concepts: parsed.concepts || []
            };
        }
        catch (error) {
            console.error('Failed to parse summary response:', error);
            throw new Error('Invalid JSON response for summary');
        }
    }
    /**
     * 解析结构化内容响应
     */
    static parseStructuredContentResponse(response) {
        try {
            const parsed = JSON.parse(response);
            return {
                overview: parsed.overview,
                learningObjectives: parsed.learningObjectives,
                prerequisites: parsed.prerequisites,
                chapters: parsed.chapters || []
            };
        }
        catch (error) {
            console.error('Failed to parse structured content response:', error);
            throw new Error('Invalid JSON response for structured content');
        }
    }
    /**
     * 工具函数
     */
    static parseDurationToSeconds(duration) {
        const parts = duration.split(':').map(Number);
        if (parts.length === 2)
            return parts[0] * 60 + parts[1];
        if (parts.length === 3)
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        return 0;
    }
    static formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * 获取内容分析统计信息
     */
    static getAnalysisStats(material) {
        const keyPointsCount = material.summary.keyPoints.length;
        const conceptsCount = material.summary.concepts.length;
        const chaptersCount = material.structuredContent.chapters.length;
        // 计算总词数
        let totalWords = 0;
        totalWords += material.summary.keyPoints.join(' ').split(' ').length;
        totalWords += material.summary.concepts.map(c => c.explanation).join(' ').split(' ').length;
        totalWords += material.structuredContent.chapters.map(c => c.keyPoints.join(' ') + ' ' + (c.practicalApplications?.join(' ') || '')).join(' ').split(' ').length;
        // 估算阅读时间（每分钟200词）
        const estimatedReadingTime = Math.ceil(totalWords / 200);
        return {
            keyPointsCount,
            conceptsCount,
            chaptersCount,
            totalWords,
            estimatedReadingTime
        };
    }
}
exports.ContentAnalyzer = ContentAnalyzer;
ContentAnalyzer.MAX_RETRIES = 3;
ContentAnalyzer.RETRY_DELAY = 2000;
//# sourceMappingURL=contentAnalyzer.js.map