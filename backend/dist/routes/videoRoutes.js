"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.videoRoutes = videoRoutes;
const videoProcessor_1 = require("../services/videoProcessor");
/**
 * 视频处理相关的API路由
 */
async function videoRoutes(fastify) {
    /**
     * 提交视频处理请求
     */
    fastify.post('/videos/process', {
        schema: {
            body: {
                type: 'object',
                required: ['youtubeUrl'],
                properties: {
                    youtubeUrl: {
                        type: 'string',
                        pattern: '^https?://(www\\.)?(youtube\\.com|youtu\\.be)/.+'
                    },
                    options: {
                        type: 'object',
                        properties: {
                            language: { type: 'string' },
                            outputFormat: {
                                type: 'string',
                                enum: ['concise', 'standard', 'detailed']
                            },
                            includeTimestamps: { type: 'boolean' }
                        }
                    }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        processId: { type: 'string' },
                        status: { type: 'string' },
                        estimatedTime: { type: 'number' },
                        message: { type: 'string' }
                    }
                },
                400: {
                    type: 'object',
                    properties: {
                        error: {
                            type: 'object',
                            properties: {
                                statusCode: { type: 'number' },
                                message: { type: 'string' }
                            }
                        }
                    }
                }
            }
        }
    }, async (request, reply) => {
        try {
            console.log('📥 Received video processing request:', request.body.youtubeUrl);
            // 这里可以添加用户认证逻辑
            // const userId = request.user?.id
            const result = await videoProcessor_1.VideoProcessor.processVideo(request.body);
            reply.code(200).send(result);
        }
        catch (error) {
            console.error('❌ Video processing request failed:', error);
            reply.code(400).send({
                error: {
                    statusCode: 400,
                    message: error instanceof Error ? error.message : 'Processing request failed'
                }
            });
        }
    });
    /**
     * 获取处理状态
     */
    fastify.get('/videos/:id/status', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' }
                },
                required: ['id']
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        processId: { type: 'string' },
                        status: { type: 'string' },
                        progress: { type: 'number' },
                        currentStep: { type: 'string' },
                        estimatedTimeRemaining: { type: 'number' },
                        error: { type: 'string' }
                    }
                }
            }
        }
    }, async (request, reply) => {
        try {
            const { id } = request.params;
            console.log(`📊 Getting status for process: ${id}`);
            const status = await videoProcessor_1.VideoProcessor.getProcessStatus(id);
            reply.code(200).send(status);
        }
        catch (error) {
            console.error('❌ Failed to get process status:', error);
            reply.code(404).send({
                error: {
                    statusCode: 404,
                    message: error instanceof Error ? error.message : 'Process not found'
                }
            });
        }
    });
    /**
     * 获取处理结果
     */
    fastify.get('/videos/:id/result', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' }
                },
                required: ['id']
            }
        }
    }, async (request, reply) => {
        try {
            const { id } = request.params;
            console.log(`📋 Getting result for process: ${id}`);
            const result = await videoProcessor_1.VideoProcessor.getProcessResult(id);
            reply.code(200).send(result);
        }
        catch (error) {
            console.error('❌ Failed to get process result:', error);
            reply.code(404).send({
                error: {
                    statusCode: 404,
                    message: error instanceof Error ? error.message : 'Result not found'
                }
            });
        }
    });
    /**
     * 获取处理统计信息
     */
    fastify.get('/videos/stats', async (request, reply) => {
        try {
            console.log('📈 Getting processing statistics');
            const stats = await videoProcessor_1.VideoProcessor.getProcessingStats();
            reply.code(200).send({
                status: 'success',
                data: stats,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            console.error('❌ Failed to get processing stats:', error);
            reply.code(500).send({
                error: {
                    statusCode: 500,
                    message: 'Failed to retrieve statistics'
                }
            });
        }
    });
    /**
     * 测试视频信息提取
     */
    fastify.post('/videos/test-extract', {
        schema: {
            body: {
                type: 'object',
                required: ['youtubeUrl'],
                properties: {
                    youtubeUrl: { type: 'string' }
                }
            }
        }
    }, async (request, reply) => {
        try {
            const { youtubeUrl } = request.body;
            console.log(`🧪 Testing video extraction for: ${youtubeUrl}`);
            // 动态导入以避免循环依赖
            const { YouTubeService } = await Promise.resolve().then(() => __importStar(require('../services/youtubeService')));
            const videoInfo = await YouTubeService.getDetailedVideoInfo(youtubeUrl);
            const analysis = YouTubeService.analyzeVideoContent(videoInfo);
            const validation = YouTubeService.validateVideoForProcessing(videoInfo);
            reply.code(200).send({
                status: 'success',
                data: {
                    videoInfo,
                    analysis,
                    validation
                }
            });
        }
        catch (error) {
            console.error('❌ Video extraction test failed:', error);
            reply.code(400).send({
                error: {
                    statusCode: 400,
                    message: error instanceof Error ? error.message : 'Extraction test failed'
                }
            });
        }
    });
    /**
     * 健康检查 - 检查所有服务状态
     */
    fastify.get('/videos/health', async (request, reply) => {
        try {
            console.log('🏥 Performing health check');
            // 检查各个服务的状态
            const healthStatus = {
                timestamp: new Date().toISOString(),
                services: {
                    database: false,
                    audio_processor: false,
                    transcription: false,
                    content_analyzer: false
                },
                dependencies: {
                    ytdlp: false,
                    ffmpeg: false
                },
                overall: 'unknown'
            };
            try {
                // 检查数据库连接
                const { testDatabaseConnection } = await Promise.resolve().then(() => __importStar(require('../config/database')));
                healthStatus.services.database = await testDatabaseConnection();
            }
            catch (error) {
                console.warn('Database health check failed:', error);
            }
            try {
                // 检查音频处理依赖
                const { AudioProcessor } = await Promise.resolve().then(() => __importStar(require('../services/audioProcessor')));
                const deps = await AudioProcessor.checkDependencies();
                healthStatus.dependencies.ytdlp = deps.ytdlp;
                healthStatus.dependencies.ffmpeg = deps.ffmpeg;
                healthStatus.services.audio_processor = deps.ytdlp || deps.ffmpeg;
            }
            catch (error) {
                console.warn('Audio processor health check failed:', error);
            }
            try {
                // 检查API连接状态
                const { testAPIConnections } = await Promise.resolve().then(() => __importStar(require('../config/apis')));
                const apiStatus = await testAPIConnections();
                healthStatus.services.transcription = apiStatus.groq;
                healthStatus.services.content_analyzer = apiStatus.gemini;
            }
            catch (error) {
                console.warn('API health check failed:', error);
            }
            // 计算整体健康状态
            const serviceValues = Object.values(healthStatus.services);
            const healthyServices = serviceValues.filter(status => status).length;
            const totalServices = serviceValues.length;
            if (healthyServices === totalServices) {
                healthStatus.overall = 'healthy';
            }
            else if (healthyServices >= totalServices / 2) {
                healthStatus.overall = 'partial';
            }
            else {
                healthStatus.overall = 'unhealthy';
            }
            const httpStatus = healthStatus.overall === 'unhealthy' ? 503 : 200;
            reply.code(httpStatus).send({
                status: healthStatus.overall,
                data: healthStatus
            });
        }
        catch (error) {
            console.error('❌ Health check failed:', error);
            reply.code(503).send({
                status: 'error',
                error: {
                    statusCode: 503,
                    message: 'Health check failed'
                }
            });
        }
    });
    /**
     * 下载处理结果文件
     */
    fastify.get('/download/:id/:format', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    format: { type: 'string', enum: ['pdf', 'markdown', 'json'] }
                },
                required: ['id', 'format']
            }
        }
    }, async (request, reply) => {
        try {
            const { id, format } = request.params;
            console.log(`📥 Download request: ${id} - ${format}`);
            // 获取处理结果
            const result = await videoProcessor_1.VideoProcessor.getProcessResult(id);
            if (!result || result.status !== 'completed') {
                throw new Error('Process not completed or result not found');
            }
            const learningMaterial = result.result;
            const timestamp = new Date().toISOString().split('T')[0];
            const safeTitle = `learning_material_${id.substring(0, 8)}`;
            switch (format) {
                case 'json':
                    reply
                        .header('Content-Type', 'application/json')
                        .header('Content-Disposition', `attachment; filename=${safeTitle}_${timestamp}.json`)
                        .send(JSON.stringify(learningMaterial, null, 2));
                    break;
                case 'markdown':
                    const markdownContent = generateMarkdownContent(learningMaterial);
                    reply
                        .header('Content-Type', 'text/markdown')
                        .header('Content-Disposition', `attachment; filename=${safeTitle}_${timestamp}.md`)
                        .send(markdownContent);
                    break;
                case 'pdf':
                    // 由于PDF生成比较复杂，先返回HTML格式，用户可以在浏览器中打印为PDF
                    const htmlContent = generateHTMLContent(learningMaterial);
                    reply
                        .header('Content-Type', 'text/html')
                        .header('Content-Disposition', `inline; filename=${safeTitle}_${timestamp}.html`)
                        .send(htmlContent);
                    break;
                default:
                    throw new Error('Unsupported format');
            }
        }
        catch (error) {
            console.error('❌ Download failed:', error);
            reply.code(404).send({
                error: {
                    statusCode: 404,
                    message: error instanceof Error ? error.message : 'Download failed'
                }
            });
        }
    });
}
/**
 * 生成Markdown格式内容
 */
function generateMarkdownContent(material) {
    const { videoInfo, summary, structuredContent, knowledgeGraph, studyCards } = material;
    let markdown = `# ${videoInfo.title}\n\n`;
    // 视频信息
    markdown += `## 📺 视频信息\n\n`;
    markdown += `- **频道**: ${videoInfo.channel}\n`;
    markdown += `- **时长**: ${videoInfo.duration}\n`;
    markdown += `- **链接**: ${videoInfo.url}\n\n`;
    // 学习摘要
    markdown += `## 📋 学习摘要\n\n`;
    markdown += `- **预计学习时间**: ${summary.learningTime}\n`;
    markdown += `- **难度等级**: ${summary.difficulty}\n\n`;
    // 核心要点
    markdown += `### 🎯 核心要点\n\n`;
    summary.keyPoints.forEach((point, index) => {
        markdown += `${index + 1}. ${point}\n`;
    });
    markdown += `\n`;
    // 核心概念
    if (summary.concepts && summary.concepts.length > 0) {
        markdown += `### 💡 核心概念\n\n`;
        summary.concepts.forEach((concept) => {
            markdown += `#### ${concept.name}\n`;
            markdown += `${concept.explanation}\n\n`;
        });
    }
    // 结构化内容
    if (structuredContent.chapters && structuredContent.chapters.length > 0) {
        markdown += `## 📖 详细内容\n\n`;
        structuredContent.chapters.forEach((chapter, index) => {
            markdown += `### ${index + 1}. ${chapter.title}\n`;
            markdown += `**时间范围**: ${chapter.timeRange}\n\n`;
            if (chapter.keyPoints && chapter.keyPoints.length > 0) {
                markdown += `**要点**:\n`;
                chapter.keyPoints.forEach((point) => {
                    markdown += `- ${point}\n`;
                });
                markdown += `\n`;
            }
            if (chapter.concepts && chapter.concepts.length > 0) {
                markdown += `**涉及概念**: ${chapter.concepts.join(', ')}\n\n`;
            }
        });
    }
    // 知识图谱信息
    if (knowledgeGraph.nodes && knowledgeGraph.nodes.length > 0) {
        markdown += `## 🕸️ 知识图谱\n\n`;
        markdown += `- **概念节点数**: ${knowledgeGraph.nodes.length}\n`;
        markdown += `- **关联边数**: ${knowledgeGraph.edges ? knowledgeGraph.edges.length : 0}\n\n`;
    }
    // 学习卡片
    if (studyCards && studyCards.length > 0) {
        markdown += `## 📚 学习卡片\n\n`;
        studyCards.forEach((card, index) => {
            markdown += `### 卡片 ${index + 1}: ${card.title || card.question}\n`;
            if (card.content)
                markdown += `${card.content}\n\n`;
            if (card.answer)
                markdown += `**答案**: ${card.answer}\n\n`;
        });
    }
    markdown += `---\n`;
    markdown += `*由YouTube智能学习资料生成器生成 - ${new Date().toLocaleString()}*\n`;
    return markdown;
}
/**
 * 生成HTML格式内容（用于PDF打印）
 */
function generateHTMLContent(material) {
    const { videoInfo, summary, structuredContent, knowledgeGraph, studyCards } = material;
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${videoInfo.title} - 学习资料</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
        }
        h1, h2, h3 { color: #2c3e50; }
        h1 { border-bottom: 3px solid #3498db; padding-bottom: 10px; }
        h2 { border-bottom: 1px solid #bdc3c7; padding-bottom: 5px; margin-top: 30px; }
        .video-info { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .concept { background: #e8f4fd; padding: 10px; margin: 10px 0; border-left: 4px solid #3498db; }
        .chapter { margin: 20px 0; padding: 15px; border: 1px solid #e0e0e0; border-radius: 5px; }
        .key-points { list-style-type: none; padding: 0; }
        .key-points li { padding: 5px 0; padding-left: 20px; position: relative; }
        .key-points li:before { content: "▸"; color: #3498db; position: absolute; left: 0; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #bdc3c7; text-align: center; color: #7f8c8d; }
        @media print {
            body { font-size: 12px; }
            h1 { font-size: 18px; }
            h2 { font-size: 16px; }
            h3 { font-size: 14px; }
        }
    </style>
</head>
<body>
    <h1>${videoInfo.title}</h1>
    
    <div class="video-info">
        <h2>📺 视频信息</h2>
        <p><strong>频道:</strong> ${videoInfo.channel}</p>
        <p><strong>时长:</strong> ${videoInfo.duration}</p>
        <p><strong>链接:</strong> <a href="${videoInfo.url}">${videoInfo.url}</a></p>
    </div>
    
    <h2>📋 学习摘要</h2>
    <p><strong>预计学习时间:</strong> ${summary.learningTime}</p>
    <p><strong>难度等级:</strong> ${summary.difficulty}</p>
    
    <h3>🎯 核心要点</h3>
    <ul class="key-points">
        ${summary.keyPoints.map((point) => `<li>${point}</li>`).join('')}
    </ul>
    
    ${summary.concepts && summary.concepts.length > 0 ? `
    <h3>💡 核心概念</h3>
    ${summary.concepts.map((concept) => `
        <div class="concept">
            <h4>${concept.name}</h4>
            <p>${concept.explanation}</p>
        </div>
    `).join('')}
    ` : ''}
    
    ${structuredContent.chapters && structuredContent.chapters.length > 0 ? `
    <h2>📖 详细内容</h2>
    ${structuredContent.chapters.map((chapter, index) => `
        <div class="chapter">
            <h3>${index + 1}. ${chapter.title}</h3>
            <p><strong>时间范围:</strong> ${chapter.timeRange}</p>
            ${chapter.keyPoints && chapter.keyPoints.length > 0 ? `
                <p><strong>要点:</strong></p>
                <ul class="key-points">
                    ${chapter.keyPoints.map((point) => `<li>${point}</li>`).join('')}
                </ul>
            ` : ''}
            ${chapter.concepts && chapter.concepts.length > 0 ? `
                <p><strong>涉及概念:</strong> ${chapter.concepts.join(', ')}</p>
            ` : ''}
        </div>
    `).join('')}
    ` : ''}
    
    ${knowledgeGraph.nodes && knowledgeGraph.nodes.length > 0 ? `
    <h2>🕸️ 知识图谱</h2>
    <p><strong>概念节点数:</strong> ${knowledgeGraph.nodes.length}</p>
    <p><strong>关联边数:</strong> ${knowledgeGraph.edges ? knowledgeGraph.edges.length : 0}</p>
    ` : ''}
    
    ${studyCards && studyCards.length > 0 ? `
    <h2>📚 学习卡片</h2>
    ${studyCards.map((card, index) => `
        <div class="chapter">
            <h3>卡片 ${index + 1}: ${card.title || card.question}</h3>
            ${card.content ? `<p>${card.content}</p>` : ''}
            ${card.answer ? `<p><strong>答案:</strong> ${card.answer}</p>` : ''}
        </div>
    `).join('')}
    ` : ''}
    
    <div class="footer">
        <p>由YouTube智能学习资料生成器生成 - ${new Date().toLocaleString()}</p>
        <p>打印提示: 使用浏览器的打印功能，选择"保存为PDF"即可生成PDF文件</p>
    </div>
</body>
</html>
  `;
}
//# sourceMappingURL=videoRoutes.js.map