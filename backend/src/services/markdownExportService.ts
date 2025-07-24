import { logger, LogCategory } from '../utils/logger'
import { config } from '../config'
import path from 'path'
import fs from 'fs/promises'
import { LearningMaterial, VideoInfo } from '../types'

/**
 * Markdown导出服务
 * 提供学习资料的Markdown格式导出功能，支持知识图谱图片
 */

interface MarkdownExportOptions {
  includeGraphs?: boolean
  includeCards?: boolean
  graphImage?: {
    data: string // base64 data URL
    type: 'canvas' | 'network'
    caption: string
  }
}

interface ExportResult {
  filePath: string
  fileName: string
  fileSize: number
  exportTime: number
  format: string
}

export class MarkdownExportService {
  
  /**
   * 导出学习资料为Markdown
   */
  static async exportLearningMaterial(
    videoInfo: VideoInfo,
    learningMaterial: LearningMaterial,
    options: MarkdownExportOptions = {}
  ): Promise<ExportResult> {
    const startTime = Date.now()
    
    try {
      logger.info('Starting Markdown export', undefined, {
        videoTitle: videoInfo.title,
        options
      }, LogCategory.SERVICE)
      
      // 生成Markdown内容
      const markdownContent = this.generateMarkdownContent(videoInfo, learningMaterial, options)
      
      // 生成文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const safeTitle = videoInfo.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_').substring(0, 50)
      const fileName = `学习资料_${safeTitle}_${timestamp}.md`
      const outputPath = path.join(config.server.uploadPath, 'exports', fileName)
      
      // 确保导出目录存在
      await fs.mkdir(path.dirname(outputPath), { recursive: true })
      
      // 如果有知识图谱图片，需要保存图片文件
      let imageFileName = ''
      if (options.graphImage) {
        imageFileName = `knowledge-graph_${safeTitle}_${timestamp}.png`
        const imagePath = path.join(config.server.uploadPath, 'exports', imageFileName)
        
        // 从base64数据URL中提取图片数据
        const base64Data = options.graphImage.data.replace(/^data:image\/\w+;base64,/, '')
        const imageBuffer = Buffer.from(base64Data, 'base64')
        
        await fs.writeFile(imagePath, imageBuffer)
        
        logger.info('Knowledge graph image saved', undefined, {
          imageFileName,
          imageSize: imageBuffer.length
        }, LogCategory.SERVICE)
      }
      
      // 写入Markdown文件
      await fs.writeFile(outputPath, markdownContent, 'utf-8')
      
      // 获取文件信息
      const stats = await fs.stat(outputPath)
      const exportTime = Date.now() - startTime
      
      logger.info('Markdown export completed', undefined, {
        fileName,
        fileSize: stats.size,
        exportTime,
        videoTitle: videoInfo.title,
        hasGraphImage: !!options.graphImage
      }, LogCategory.SERVICE)
      
      return {
        filePath: outputPath,
        fileName,
        fileSize: stats.size,
        exportTime,
        format: 'Markdown'
      }
      
    } catch (error) {
      logger.error('Markdown export failed', error as Error, {
        videoTitle: videoInfo.title,
        options
      }, LogCategory.SERVICE)
      throw error
    }
  }
  
  /**
   * 生成Markdown内容
   */
  private static generateMarkdownContent(
    videoInfo: VideoInfo,
    learningMaterial: LearningMaterial,
    options: MarkdownExportOptions
  ): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const safeTitle = videoInfo.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_').substring(0, 50)
    const imageFileName = options.graphImage ? `knowledge-graph_${safeTitle}_${timestamp}.png` : ''
    
    return `# YouTube 智能学习资料

## 📋 基本信息

**视频标题**: ${videoInfo.title}  
**频道**: ${videoInfo.channel || '未知'}  
**时长**: ${videoInfo.duration || '未知'}  
**生成时间**: ${new Date().toLocaleString('zh-CN')}

---

## 📖 目录

- [学习概要](#学习概要)
- [核心概念](#核心概念)${options.graphImage ? `
- [知识图谱](#知识图谱)` : ''}
- [结构化学习内容](#结构化学习内容)${options.includeCards ? `
- [学习卡片](#学习卡片)` : ''}
- [使用说明](#使用说明)

---

## 📊 学习概要

### 基本信息
- **预计学习时间**: ${(learningMaterial.summary as any)?.estimatedStudyTime || '45-60分钟'}
- **难度等级**: ${learningMaterial.summary?.difficulty || '中级'}
- **核心概念数**: ${learningMaterial.summary?.concepts?.length || 0}

### 关键要点
${learningMaterial.summary?.keyPoints?.map(point => `- ${point}`).join('\n') || '- 暂无关键要点'}

---

## 🧠 核心概念

${learningMaterial.summary?.concepts?.map(concept => `
### ${concept.name}

${concept.explanation}
`).join('') || '暂无核心概念'}

---

${options.graphImage ? `
## 📈 知识图谱

![${options.graphImage.caption}](./${imageFileName})

*${options.graphImage.caption}*

这个知识图谱展示了视频中各个概念之间的关系和重要程度。图中的连线表示不同类型的关系：
- **红色连线**: 依赖关系 - 表示一个概念依赖于另一个概念
- **紫色连线**: 相关关系 - 表示两个概念相互关联
- **青色连线**: 包含关系 - 表示一个概念包含另一个概念

---

` : ''}## 📚 结构化学习内容

${learningMaterial.structuredContent?.chapters?.map(chapter => `
### ${chapter.title}
**时间范围**: ${chapter.timeRange}

${chapter.keyPoints.map(point => `- ${point}`).join('\n')}
`).join('') || '暂无结构化内容'}

---

${options.includeCards && learningMaterial.studyCards ? `
## 🎴 学习卡片

${learningMaterial.studyCards.map((card, index) => `
### 卡片 ${index + 1}: ${card.title}

**类型**: ${card.type}  
**难度**: ${card.difficulty}  
**预计时间**: ${card.estimatedTime}分钟

${card.content}

---
`).join('')}

` : ''}## 📝 使用说明

### 学习建议
1. **按顺序学习**: 建议按照结构化内容的顺序进行学习
2. **理解概念**: 重点关注核心概念部分，这些是理解视频内容的关键
3. **实践练习**: 如果有学习卡片，可以用于复习和自测
4. **参考原视频**: 如有疑问，建议回到原视频查看具体讲解

### 知识图谱使用
- **节点大小**: 表示概念的重要程度
- **颜色区分**: 蓝色=核心概念，绿色=子主题，黄色=相关资源
- **连线关系**: 帮助理解概念之间的逻辑关系

### 原视频信息
- **标题**: ${videoInfo.title}
- **链接**: ${videoInfo.url}
- **频道**: ${videoInfo.channel || '未知'}
- **时长**: ${videoInfo.duration || '未知'}

---

*本学习资料由 [YouTube智学](https://github.com/your-repo) AI智能生成*  
*生成时间: ${new Date().toLocaleString('zh-CN')}*`
  }
}

export default MarkdownExportService