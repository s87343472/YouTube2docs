"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeGraphService = void 0;
const apis_1 = require("../config/apis");
/**
 * 知识图谱生成服务
 */
class KnowledgeGraphService {
    /**
     * 基于学习材料生成完整知识图谱
     */
    static async generateKnowledgeGraph(videoInfo, transcription, learningMaterial) {
        console.log('🧠 Generating knowledge graph for:', videoInfo.title);
        try {
            // 如果没有Gemini密钥，返回模拟数据
            if (!(0, apis_1.hasGeminiKey)()) {
                console.warn('⚠️ Gemini API key not available, generating mock knowledge graph');
                return this.generateMockKnowledgeGraph(videoInfo, learningMaterial);
            }
            // 第一步：提取知识概念
            const concepts = await this.extractConcepts(videoInfo, transcription, learningMaterial);
            // 第二步：构建知识节点
            const nodes = await this.buildKnowledgeNodes(concepts, transcription);
            // 第三步：分析概念关系
            const edges = await this.analyzeConceptRelationships(nodes, learningMaterial);
            // 第四步：优化知识图谱结构
            const optimizedGraph = this.optimizeKnowledgeGraph(nodes, edges);
            // 第五步：生成元数据和学习路径
            const metadata = this.generateGraphMetadata(optimizedGraph.nodes, optimizedGraph.edges, learningMaterial);
            console.log(`✅ Knowledge graph generated: ${metadata.totalNodes} nodes, ${metadata.totalEdges} edges`);
            return {
                nodes: optimizedGraph.nodes,
                edges: optimizedGraph.edges,
                metadata
            };
        }
        catch (error) {
            console.error('❌ Failed to generate knowledge graph:', error);
            return this.generateMockKnowledgeGraph(videoInfo, learningMaterial);
        }
    }
    /**
     * 生成学习卡片
     */
    static async generateStudyCards(knowledgeGraph, learningMaterial) {
        console.log('📚 Generating study cards from knowledge graph');
        try {
            if (!(0, apis_1.hasGeminiKey)()) {
                return this.generateMockStudyCards(knowledgeGraph, learningMaterial);
            }
            const cards = [];
            // 为核心概念生成概念卡片
            for (const nodeId of knowledgeGraph.metadata?.coreconcepts || []) {
                const node = knowledgeGraph.nodes.find(n => n.id === nodeId);
                if (node) {
                    const conceptCard = await this.generateConceptCard(node);
                    cards.push(conceptCard);
                }
            }
            // 生成总结卡片
            const summaryCards = await this.generateSummaryCards(learningMaterial);
            cards.push(...summaryCards);
            // 生成问答卡片
            const questionCards = await this.generateQuestionCards(knowledgeGraph, learningMaterial);
            cards.push(...questionCards);
            console.log(`✅ Generated ${cards.length} study cards`);
            return cards;
        }
        catch (error) {
            console.error('❌ Failed to generate study cards:', error);
            return this.generateMockStudyCards(knowledgeGraph, learningMaterial);
        }
    }
    /**
     * 第一步：提取关键概念
     */
    static async extractConcepts(videoInfo, transcription, learningMaterial) {
        const systemPrompt = `你是一个知识提取专家。请从视频内容中提取所有重要的概念、技能、事实和过程。

要求：
1. 提取15-30个核心概念
2. 包括理论概念、实践技能、重要事实
3. 避免过于细节的概念
4. 确保概念具有教学价值

请以JSON数组格式返回概念列表：
["概念1", "概念2", ...]`;
        const userPrompt = `视频标题：${videoInfo.title}
频道：${videoInfo.channel}
时长：${videoInfo.duration}

转录内容摘要：
${transcription.text.substring(0, 2000)}...

已生成的关键点：
${learningMaterial.summary.keyPoints.join('\n')}

请提取核心概念：`;
        try {
            const gemini = (0, apis_1.initGemini)();
            const model = gemini.getGenerativeModel({
                model: apis_1.API_CONFIG.GEMINI.MODEL,
                generationConfig: {
                    temperature: apis_1.API_CONFIG.GEMINI.TEMPERATURE,
                    maxOutputTokens: 1000,
                    responseMimeType: "application/json"
                }
            });
            const prompt = `${systemPrompt}\n\n${userPrompt}`;
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const content = response.text();
            if (!content)
                throw new Error('Empty response from Gemini');
            return JSON.parse(content);
        }
        catch (error) {
            console.error('Failed to extract concepts:', error);
            // 降级到基于关键点的概念提取
            return learningMaterial.summary.keyPoints.map(point => point.substring(0, 50).replace(/[^\w\s]/g, '').trim());
        }
    }
    /**
     * 第二步：构建知识节点
     */
    static async buildKnowledgeNodes(concepts, transcription) {
        const nodes = [];
        for (let i = 0; i < concepts.length; i++) {
            const concept = concepts[i];
            const node = {
                id: `concept_${i + 1}`,
                label: concept,
                type: this.classifyConceptType(concept),
                description: await this.generateConceptDescription(concept, transcription),
                importance: this.calculateImportance(concept, transcription),
                complexity: this.calculateComplexity(concept),
                timeRange: this.findConceptTimeRange(concept, transcription),
                examples: this.extractExamples(concept, transcription)
            };
            nodes.push(node);
        }
        return nodes;
    }
    /**
     * 第三步：分析概念关系
     */
    static async analyzeConceptRelationships(nodes, learningMaterial) {
        const edges = [];
        // 基于内容结构分析概念关系
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const sourceNode = nodes[i];
                const targetNode = nodes[j];
                const relationship = await this.analyzeConceptPair(sourceNode, targetNode, learningMaterial);
                if (relationship) {
                    edges.push({
                        id: `edge_${i}_${j}`,
                        source: sourceNode.id,
                        target: targetNode.id,
                        type: relationship.type,
                        strength: relationship.strength,
                        description: relationship.description,
                        bidirectional: relationship.bidirectional
                    });
                }
            }
        }
        return edges;
    }
    /**
     * 第四步：优化知识图谱结构
     */
    static optimizeKnowledgeGraph(nodes, edges) {
        // 移除弱关联边（强度 < 3）
        const strongEdges = edges.filter(edge => edge.strength >= 3);
        // 移除孤立节点
        const connectedNodeIds = new Set([
            ...strongEdges.map(e => e.source),
            ...strongEdges.map(e => e.target)
        ]);
        const connectedNodes = nodes.filter(node => connectedNodeIds.has(node.id));
        return {
            nodes: connectedNodes,
            edges: strongEdges
        };
    }
    /**
     * 第五步：生成图谱元数据
     */
    static generateGraphMetadata(nodes, edges, learningMaterial) {
        const coreconcepts = nodes
            .filter(node => node.importance >= 7)
            .sort((a, b) => b.importance - a.importance)
            .slice(0, 5)
            .map(node => node.id);
        const learningPath = this.generateLearningPath(nodes, edges);
        const avgComplexity = nodes.reduce((sum, node) => sum + node.complexity, 0) / nodes.length;
        const avgImportance = nodes.reduce((sum, node) => sum + node.importance, 0) / nodes.length;
        return {
            totalNodes: nodes.length,
            totalEdges: edges.length,
            complexity: Math.round(avgComplexity),
            coverage: Math.round(avgImportance),
            learningPath,
            coreconcepts,
            generatedAt: new Date().toISOString()
        };
    }
    /**
     * 生成学习路径
     */
    static generateLearningPath(nodes, edges) {
        // 简单的拓扑排序实现
        const path = [];
        const visited = new Set();
        // 按重要性和复杂度排序
        const sortedNodes = [...nodes].sort((a, b) => {
            const scoreA = a.importance - a.complexity;
            const scoreB = b.importance - b.complexity;
            return scoreB - scoreA;
        });
        for (const node of sortedNodes) {
            if (!visited.has(node.id)) {
                path.push(node.id);
                visited.add(node.id);
            }
        }
        return path;
    }
    /**
     * 工具函数：分类概念类型
     */
    static classifyConceptType(concept) {
        const conceptLower = concept.toLowerCase();
        if (conceptLower.includes('如何') || conceptLower.includes('方法') || conceptLower.includes('步骤')) {
            return 'process';
        }
        if (conceptLower.includes('技能') || conceptLower.includes('能力') || conceptLower.includes('操作')) {
            return 'skill';
        }
        if (conceptLower.includes('应用') || conceptLower.includes('实践') || conceptLower.includes('案例')) {
            return 'application';
        }
        if (conceptLower.includes('数据') || conceptLower.includes('统计') || conceptLower.includes('事实')) {
            return 'fact';
        }
        return 'concept';
    }
    /**
     * 生成概念描述
     */
    static async generateConceptDescription(concept, transcription) {
        // 从转录文本中寻找相关描述
        const text = transcription.text.toLowerCase();
        const conceptLower = concept.toLowerCase();
        const sentences = text.split(/[.!?]/);
        const relevantSentences = sentences.filter(sentence => sentence.includes(conceptLower) ||
            conceptLower.split(' ').some(word => sentence.includes(word)));
        if (relevantSentences.length > 0) {
            return relevantSentences[0].trim().substring(0, 200) + '...';
        }
        return `${concept}的相关概念，在视频中有详细讲解。`;
    }
    /**
     * 计算概念重要性
     */
    static calculateImportance(concept, transcription) {
        const text = transcription.text.toLowerCase();
        const conceptLower = concept.toLowerCase();
        // 计算概念在文本中的出现频率
        const occurrences = (text.match(new RegExp(conceptLower, 'g')) || []).length;
        // 基于频率和概念长度计算重要性
        const baseScore = Math.min(occurrences * 2, 8);
        const lengthBonus = concept.length > 10 ? 1 : 0;
        return Math.min(baseScore + lengthBonus + Math.floor(Math.random() * 2), 10);
    }
    /**
     * 计算概念复杂度
     */
    static calculateComplexity(concept) {
        // 基于概念长度和技术词汇判断复杂度
        const length = concept.length;
        const technicalWords = ['算法', '架构', '模式', '原理', '理论', '系统'];
        const hasTechnicalWord = technicalWords.some(word => concept.includes(word));
        let complexity = Math.min(Math.floor(length / 5), 6);
        if (hasTechnicalWord)
            complexity += 2;
        return Math.min(complexity + Math.floor(Math.random() * 2), 10);
    }
    /**
     * 查找概念时间范围
     */
    static findConceptTimeRange(concept, transcription) {
        // 如果有时间戳，查找概念首次出现的时间
        if (transcription.segments && transcription.segments.length > 0) {
            for (const segment of transcription.segments) {
                if (segment.text.toLowerCase().includes(concept.toLowerCase())) {
                    const start = Math.floor(segment.start);
                    const end = Math.floor(segment.end);
                    return `${Math.floor(start / 60)}:${(start % 60).toString().padStart(2, '0')}-${Math.floor(end / 60)}:${(end % 60).toString().padStart(2, '0')}`;
                }
            }
        }
        return '全程';
    }
    /**
     * 提取概念示例
     */
    static extractExamples(concept, transcription) {
        const examples = [];
        const text = transcription.text;
        const sentences = text.split(/[.!?]/);
        // 查找包含"例如"、"比如"等关键词的句子
        const exampleKeywords = ['例如', '比如', '举例', '案例', '实例'];
        for (const sentence of sentences) {
            if (sentence.includes(concept) &&
                exampleKeywords.some(keyword => sentence.includes(keyword))) {
                examples.push(sentence.trim().substring(0, 100));
                if (examples.length >= 2)
                    break;
            }
        }
        return examples;
    }
    /**
     * 分析概念对关系
     */
    static async analyzeConceptPair(sourceNode, targetNode, learningMaterial) {
        // 简化的关系分析逻辑
        const source = sourceNode.label.toLowerCase();
        const target = targetNode.label.toLowerCase();
        // 检查先决条件关系
        if (sourceNode.complexity < targetNode.complexity &&
            sourceNode.importance >= 6 && targetNode.importance >= 6) {
            return {
                type: 'prerequisite',
                strength: 7,
                description: `${sourceNode.label}是理解${targetNode.label}的基础`,
                bidirectional: false
            };
        }
        // 检查应用关系
        if (sourceNode.type === 'concept' && targetNode.type === 'application') {
            return {
                type: 'applies_to',
                strength: 6,
                description: `${sourceNode.label}在${targetNode.label}中得到应用`,
                bidirectional: false
            };
        }
        // 检查相似关系
        const similarity = this.calculateSimilarity(source, target);
        if (similarity > 0.3) {
            return {
                type: 'similar',
                strength: Math.floor(similarity * 10),
                description: `${sourceNode.label}与${targetNode.label}有相似之处`,
                bidirectional: true
            };
        }
        return null;
    }
    /**
     * 计算概念相似度
     */
    static calculateSimilarity(concept1, concept2) {
        const words1 = concept1.split(' ');
        const words2 = concept2.split(' ');
        const commonWords = words1.filter(word => words2.includes(word));
        const totalWords = new Set([...words1, ...words2]).size;
        return commonWords.length / totalWords;
    }
    /**
     * 生成概念卡片
     */
    static async generateConceptCard(node) {
        return {
            id: `card_${node.id}`,
            type: 'concept',
            title: node.label,
            content: node.description,
            relatedConcepts: [node.id],
            difficulty: node.complexity <= 3 ? 'easy' : node.complexity <= 7 ? 'medium' : 'hard',
            estimatedTime: Math.floor(node.complexity * 1.5),
            timeReference: node.timeRange
        };
    }
    /**
     * 生成总结卡片
     */
    static async generateSummaryCards(learningMaterial) {
        const cards = [];
        // 为每个章节生成总结卡片
        learningMaterial.structuredContent.chapters.forEach((chapter, index) => {
            cards.push({
                id: `summary_card_${index + 1}`,
                type: 'summary',
                title: `${chapter.title} - 总结`,
                content: `关键点：\n${chapter.keyPoints.join('\n')}`,
                relatedConcepts: [],
                difficulty: 'medium',
                estimatedTime: 3,
                timeReference: chapter.timeRange
            });
        });
        return cards;
    }
    /**
     * 生成问答卡片
     */
    static async generateQuestionCards(knowledgeGraph, learningMaterial) {
        const cards = [];
        // 为核心概念生成问题
        knowledgeGraph.metadata?.coreconcepts.forEach((nodeId, index) => {
            const node = knowledgeGraph.nodes.find(n => n.id === nodeId);
            if (node) {
                cards.push({
                    id: `question_card_${index + 1}`,
                    type: 'question',
                    title: `关于${node.label}的思考`,
                    content: `请解释${node.label}的核心概念及其重要性。`,
                    relatedConcepts: [nodeId],
                    difficulty: node.complexity <= 3 ? 'easy' : node.complexity <= 7 ? 'medium' : 'hard',
                    estimatedTime: Math.floor(node.complexity * 2),
                    timeReference: node.timeRange
                });
            }
        });
        return cards.slice(0, 5); // 限制问答卡片数量
    }
    /**
     * 生成模拟知识图谱（用于API不可用时）
     */
    static generateMockKnowledgeGraph(videoInfo, learningMaterial) {
        const mockNodes = learningMaterial.summary.keyPoints.slice(0, 8).map((point, index) => ({
            id: `concept_${index + 1}`,
            label: point.substring(0, 30),
            type: index % 4 === 0 ? 'concept' : index % 4 === 1 ? 'skill' : index % 4 === 2 ? 'application' : 'process',
            description: `${point}的详细说明和解释。`,
            importance: Math.floor(Math.random() * 5) + 5,
            complexity: Math.floor(Math.random() * 5) + 3,
            timeRange: `${Math.floor(Math.random() * 20)}:00-${Math.floor(Math.random() * 20) + 20}:00`,
            examples: [`${point}的实际应用示例`]
        }));
        const mockEdges = [];
        for (let i = 0; i < mockNodes.length - 1; i++) {
            mockEdges.push({
                id: `edge_${i + 1}`,
                source: mockNodes[i].id,
                target: mockNodes[i + 1].id,
                type: 'supports',
                strength: Math.floor(Math.random() * 5) + 5,
                description: `${mockNodes[i].label}支持理解${mockNodes[i + 1].label}`,
                bidirectional: false
            });
        }
        return {
            nodes: mockNodes,
            edges: mockEdges,
            metadata: {
                totalNodes: mockNodes.length,
                totalEdges: mockEdges.length,
                complexity: 6,
                coverage: 7,
                learningPath: mockNodes.map(n => n.id),
                coreconcepts: mockNodes.slice(0, 3).map(n => n.id),
                generatedAt: new Date().toISOString()
            }
        };
    }
    /**
     * 生成模拟学习卡片
     */
    static generateMockStudyCards(knowledgeGraph, learningMaterial) {
        return knowledgeGraph.nodes.slice(0, 5).map((node, index) => ({
            id: `card_${index + 1}`,
            type: 'concept',
            title: node.label,
            content: node.description,
            relatedConcepts: [node.id],
            difficulty: node.complexity <= 3 ? 'easy' : node.complexity <= 7 ? 'medium' : 'hard',
            estimatedTime: Math.floor(node.complexity * 1.5),
            timeReference: node.timeRange
        }));
    }
}
exports.KnowledgeGraphService = KnowledgeGraphService;
//# sourceMappingURL=knowledgeGraphService.js.map