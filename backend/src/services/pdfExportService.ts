import puppeteer from 'puppeteer'
import { logger, LogCategory } from '../utils/logger'
import { config } from '../config'
import path from 'path'
import fs from 'fs/promises'
import { LearningMaterial, VideoInfo } from '../types'

/**
 * PDF导出服务
 * 提供学习资料的PDF生成和导出功能
 */

interface PDFExportOptions {
  format?: 'A4' | 'Letter'
  orientation?: 'portrait' | 'landscape'
  includeGraphs?: boolean
  includeCards?: boolean
  watermark?: string
  theme?: 'light' | 'dark' | 'minimal'
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

export class PDFExportService {
  private static browser: any | null = null
  
  /**
   * 初始化浏览器实例
   */
  private static async getBrowser(): Promise<any> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-default-apps'
        ]
      })
    }
    return this.browser
  }
  
  /**
   * 导出学习资料为PDF
   */
  static async exportLearningMaterial(
    videoInfo: VideoInfo,
    learningMaterial: LearningMaterial,
    options: PDFExportOptions = {}
  ): Promise<ExportResult> {
    const startTime = Date.now()
    
    try {
      logger.info('Starting PDF export', undefined, {
        videoTitle: videoInfo.title,
        options
      }, LogCategory.SERVICE)
      
      // 生成HTML内容
      const htmlContent = this.generateHTMLContent(videoInfo, learningMaterial, options)
      
      // 生成PDF
      const browser = await this.getBrowser()
      const page = await browser.newPage()
      
      // 设置页面内容
      await page.setContent(htmlContent, { 
        waitUntil: 'networkidle0',
        timeout: 30000
      })
      
      // 设置页面大小和样式
      await page.addStyleTag({
        content: this.getDefaultStyles(options.theme || 'light')
      })
      
      // 生成PDF文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const safeTitle = videoInfo.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_').substring(0, 50)
      const fileName = `学习资料_${safeTitle}_${timestamp}.pdf`
      const outputPath = path.join(config.server.uploadPath, 'exports', fileName)
      
      // 确保导出目录存在
      await fs.mkdir(path.dirname(outputPath), { recursive: true })
      
      // 生成PDF
      await page.pdf({
        path: outputPath,
        format: options.format || 'A4',
        landscape: options.orientation === 'landscape',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        },
        headerTemplate: this.getHeaderTemplate(videoInfo, options),
        footerTemplate: this.getFooterTemplate(options),
        displayHeaderFooter: true
      })
      
      await page.close()
      
      // 获取文件信息
      const stats = await fs.stat(outputPath)
      const exportTime = Date.now() - startTime
      
      logger.info('PDF export completed', undefined, {
        fileName,
        fileSize: stats.size,
        exportTime,
        videoTitle: videoInfo.title
      }, LogCategory.SERVICE)
      
      return {
        filePath: outputPath,
        fileName,
        fileSize: stats.size,
        exportTime,
        format: 'PDF'
      }
      
    } catch (error) {
      logger.error('PDF export failed', error as Error, {
        videoTitle: videoInfo.title,
        options
      }, LogCategory.SERVICE)
      throw error
    }
  }
  
  /**
   * 导出知识卡片为PDF
   */
  static async exportStudyCards(
    videoInfo: VideoInfo,
    studyCards: any[],
    options: PDFExportOptions = {}
  ): Promise<ExportResult> {
    const startTime = Date.now()
    
    try {
      logger.info('Starting study cards PDF export', undefined, {
        videoTitle: videoInfo.title,
        cardsCount: studyCards.length
      }, LogCategory.SERVICE)
      
      // 生成卡片HTML
      const htmlContent = this.generateCardsHTML(videoInfo, studyCards, options)
      
      const browser = await this.getBrowser()
      const page = await browser.newPage()
      
      await page.setContent(htmlContent, { 
        waitUntil: 'networkidle0',
        timeout: 30000
      })
      
      await page.addStyleTag({
        content: this.getCardsStyles(options.theme || 'light')
      })
      
      // 生成文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const safeTitle = videoInfo.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_').substring(0, 50)
      const fileName = `学习卡片_${safeTitle}_${timestamp}.pdf`
      const outputPath = path.join(config.server.uploadPath, 'exports', fileName)
      
      await fs.mkdir(path.dirname(outputPath), { recursive: true })
      
      // 使用卡片专用的PDF设置
      await page.pdf({
        path: outputPath,
        format: 'A4',
        landscape: false,
        printBackground: true,
        margin: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm'
        }
      })
      
      await page.close()
      
      const stats = await fs.stat(outputPath)
      const exportTime = Date.now() - startTime
      
      return {
        filePath: outputPath,
        fileName,
        fileSize: stats.size,
        exportTime,
        format: 'PDF'
      }
      
    } catch (error) {
      logger.error('Study cards PDF export failed', error as Error, {
        videoTitle: videoInfo.title,
        cardsCount: studyCards.length
      }, LogCategory.SERVICE)
      throw error
    }
  }
  
  /**
   * 生成完整学习资料的HTML内容
   */
  private static generateHTMLContent(
    videoInfo: VideoInfo,
    learningMaterial: LearningMaterial,
    options: PDFExportOptions
  ): string {
    const theme = options.theme || 'light'
    
    return `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>学习资料 - ${videoInfo.title}</title>
        <style>
            ${this.getDefaultStyles(theme)}
        </style>
    </head>
    <body class="${theme}">
        <div class="container">
            <!-- 封面页 -->
            <div class="cover-page">
                <div class="cover-header">
                    <h1>YouTube 智能学习资料</h1>
                    <div class="cover-logo">📚</div>
                </div>
                <div class="cover-content">
                    <h2 class="video-title">${videoInfo.title}</h2>
                    <div class="video-info">
                        <div class="info-item">
                            <span class="label">频道：</span>
                            <span class="value">${videoInfo.channel || '未知'}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">时长：</span>
                            <span class="value">${videoInfo.duration || '未知'}</span>
                        </div>
                        <div class="info-item">
                            <span class="label">生成时间：</span>
                            <span class="value">${new Date().toLocaleString('zh-CN')}</span>
                        </div>
                    </div>
                </div>
                <div class="cover-footer">
                    <p>由 YouTube智学 AI智能生成</p>
                    ${options.watermark ? `<p class="watermark">${options.watermark}</p>` : ''}
                </div>
            </div>
            
            <!-- 目录页 -->
            <div class="page-break"></div>
            <div class="toc-page">
                <h2>目录</h2>
                <ul class="toc">
                    <li><a href="#summary">学习概要</a></li>
                    <li><a href="#concepts">核心概念</a></li>
                    ${options.graphImage ? '<li><a href="#knowledge-graph">知识图谱</a></li>' : ''}
                    <li><a href="#content">结构化内容</a></li>
                    ${options.includeCards ? '<li><a href="#cards">学习卡片</a></li>' : ''}
                    <li><a href="#appendix">附录</a></li>
                </ul>
            </div>
            
            <!-- 学习概要 -->
            <div class="page-break"></div>
            <section id="summary" class="section">
                <h2>📋 学习概要</h2>
                
                <div class="summary-grid">
                    <div class="summary-item">
                        <h3>学习时长</h3>
                        <p>${(learningMaterial.summary as any)?.estimatedStudyTime || '45-60分钟'}</p>
                    </div>
                    <div class="summary-item">
                        <h3>难度等级</h3>
                        <p>${learningMaterial.summary?.difficulty || '中级'}</p>
                    </div>
                    <div class="summary-item">
                        <h3>核心概念数</h3>
                        <p>${learningMaterial.summary?.concepts?.length || 0}</p>
                    </div>
                </div>
                
                <h3>关键要点</h3>
                <ul class="key-points">
                    ${learningMaterial.summary?.keyPoints?.map(point => 
                      `<li>${point}</li>`
                    ).join('') || '<li>暂无关键要点</li>'}
                </ul>
            </section>
            
            <!-- 核心概念 -->
            <div class="page-break"></div>
            <section id="concepts" class="section">
                <h2>🧠 核心概念</h2>
                ${learningMaterial.summary?.concepts?.map(concept => `
                    <div class="concept-item">
                        <h3>${concept.name}</h3>
                        <p>${concept.explanation}</p>
                    </div>
                `).join('') || '<p>暂无核心概念</p>'}
            </section>
            
            <!-- 知识图谱 -->
            ${options.graphImage ? `
                <div class="page-break"></div>
                <section id="knowledge-graph" class="section">
                    <h2>📊 知识图谱</h2>
                    <div class="graph-container">
                        <img src="${options.graphImage.data}" alt="知识图谱" class="graph-image" />
                        <p class="graph-caption">${options.graphImage.caption}</p>
                    </div>
                </section>
            ` : ''}
            
            <!-- 结构化内容 -->
            <div class="page-break"></div>
            <section id="content" class="section">
                <h2>📖 结构化学习内容</h2>
                ${learningMaterial.structuredContent?.chapters?.map(chapter => `
                    <div class="chapter">
                        <h3>${chapter.title}</h3>
                        <div class="time-range">${chapter.timeRange}</div>
                        <ul>
                            ${chapter.keyPoints.map(point => `<li>${point}</li>`).join('')}
                        </ul>
                    </div>
                `).join('') || '<p>暂无结构化内容</p>'}
            </section>
            
            <!-- 学习卡片 -->
            ${options.includeCards && learningMaterial.studyCards ? `
                <div class="page-break"></div>
                <section id="cards" class="section">
                    <h2>🎴 学习卡片</h2>
                    ${learningMaterial.studyCards.map(card => `
                        <div class="study-card">
                            <div class="card-header">
                                <h4>${card.title}</h4>
                                <span class="card-type">${card.type}</span>
                            </div>
                            <div class="card-content">${card.content}</div>
                            <div class="card-footer">
                                <span class="difficulty">${card.difficulty}</span>
                                <span class="time">${card.estimatedTime}分钟</span>
                            </div>
                        </div>
                    `).join('')}
                </section>
            ` : ''}
            
            <!-- 附录 -->
            <div class="page-break"></div>
            <section id="appendix" class="section">
                <h2>📎 附录</h2>
                <h3>原视频信息</h3>
                <div class="video-details">
                    <p><strong>标题：</strong>${videoInfo.title}</p>
                    <p><strong>URL：</strong>${videoInfo.url}</p>
                    <p><strong>频道：</strong>${videoInfo.channel || '未知'}</p>
                    <p><strong>时长：</strong>${videoInfo.duration || '未知'}</p>
                </div>
                
                <h3>使用说明</h3>
                <ul>
                    <li>本学习资料由AI智能生成，建议结合原视频学习</li>
                    <li>核心概念部分可重点关注和记忆</li>
                    <li>学习卡片可用于复习和自测</li>
                    <li>如有疑问，请参考原视频内容</li>
                </ul>
            </section>
        </div>
    </body>
    </html>
    `
  }
  
  /**
   * 生成学习卡片HTML
   */
  private static generateCardsHTML(
    videoInfo: VideoInfo,
    studyCards: any[],
    options: PDFExportOptions
  ): string {
    return `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>学习卡片 - ${videoInfo.title}</title>
        <style>
            ${this.getCardsStyles(options.theme || 'light')}
        </style>
    </head>
    <body>
        <div class="cards-container">
            <div class="cards-header">
                <h1>📚 学习卡片</h1>
                <p>来源：${videoInfo.title}</p>
                <p>生成时间：${new Date().toLocaleString('zh-CN')}</p>
            </div>
            
            <div class="cards-grid">
                ${studyCards.map((card, index) => `
                    <div class="card">
                        <div class="card-number">${index + 1}</div>
                        <div class="card-type">${card.type}</div>
                        <h3 class="card-title">${card.title}</h3>
                        <div class="card-content">${card.content}</div>
                        <div class="card-footer">
                            <span class="difficulty difficulty-${card.difficulty}">${card.difficulty}</span>
                            <span class="time">⏱️ ${card.estimatedTime}分钟</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    </body>
    </html>
    `
  }
  
  /**
   * 获取默认样式
   */
  private static getDefaultStyles(theme: string): string {
    const baseStyles = `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', 'Microsoft YaHei', sans-serif; line-height: 1.6; }
        .container { max-width: 800px; margin: 0 auto; padding: 20px; }
        .page-break { page-break-before: always; }
        h1, h2, h3, h4 { margin-bottom: 1rem; }
        p, ul, ol { margin-bottom: 1rem; }
        
        /* 封面页样式 */
        .cover-page { text-align: center; padding: 100px 0; }
        .cover-header h1 { font-size: 2.5rem; margin-bottom: 2rem; }
        .cover-logo { font-size: 5rem; margin: 2rem 0; }
        .video-title { font-size: 1.8rem; margin: 2rem 0; }
        .video-info { text-align: left; max-width: 400px; margin: 2rem auto; }
        .info-item { margin: 0.5rem 0; }
        .label { font-weight: bold; }
        
        /* 目录样式 */
        .toc-page h2 { border-bottom: 2px solid #333; padding-bottom: 1rem; }
        .toc { list-style: none; padding: 2rem 0; }
        .toc li { margin: 0.5rem 0; }
        .toc a { text-decoration: none; }
        
        /* 内容样式 */
        .section { margin: 2rem 0; }
        .section h2 { border-bottom: 1px solid #ccc; padding-bottom: 0.5rem; margin-bottom: 1.5rem; }
        .summary-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; margin: 1rem 0; }
        .summary-item { text-align: center; padding: 1rem; border: 1px solid #ddd; border-radius: 8px; }
        .key-points li { margin: 0.5rem 0; padding-left: 1rem; }
        .concept-item { margin: 1.5rem 0; padding: 1rem; border-left: 4px solid #007acc; background: #f8f9fa; }
        .chapter { margin: 1.5rem 0; }
        .time-range { color: #666; font-size: 0.9rem; margin-bottom: 0.5rem; }
        
        /* 学习卡片样式 */
        .study-card { margin: 1rem 0; padding: 1rem; border: 1px solid #ddd; border-radius: 8px; }
        .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
        .card-type { background: #007acc; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem; }
        .card-content { margin: 1rem 0; }
        .card-footer { display: flex; justify-content: space-between; font-size: 0.9rem; color: #666; }
        
        /* 知识图谱样式 */
        .graph-container { text-align: center; margin: 2rem 0; }
        .graph-image { max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 1rem; }
        .graph-caption { font-size: 0.9rem; color: #666; font-style: italic; }
    `
    
    const themeStyles = {
      light: `
        body { background: white; color: #333; }
        .cover-page { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
        .toc a { color: #007acc; }
        .toc a:hover { color: #005999; }
      `,
      dark: `
        body { background: #1a1a1a; color: #e0e0e0; }
        .cover-page { background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%); color: white; }
        .section h2 { border-bottom-color: #555; }
        .concept-item { background: #2a2a2a; border-left-color: #007acc; }
        .study-card { background: #2a2a2a; border-color: #444; }
      `,
      minimal: `
        body { background: white; color: #333; font-size: 14px; }
        .cover-page { background: white; color: #333; border: 2px solid #333; }
        h1, h2, h3 { color: #333; }
        .concept-item { background: none; border-left: 3px solid #333; }
      `
    }
    
    return baseStyles + (themeStyles[theme as keyof typeof themeStyles] || themeStyles.light)
  }
  
  /**
   * 获取卡片样式
   */
  private static getCardsStyles(theme: string): string {
    return `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', 'Microsoft YaHei', sans-serif; background: #f5f5f5; }
        .cards-container { padding: 20px; }
        .cards-header { text-align: center; margin-bottom: 2rem; }
        .cards-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .card { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1); position: relative; }
        .card-number { position: absolute; top: 1rem; right: 1rem; background: #007acc; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: bold; }
        .card-type { background: #e3f2fd; color: #1976d2; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem; display: inline-block; margin-bottom: 0.5rem; }
        .card-title { color: #333; margin-bottom: 1rem; font-size: 1.1rem; }
        .card-content { color: #666; line-height: 1.6; margin-bottom: 1rem; }
        .card-footer { display: flex; justify-content: space-between; align-items: center; }
        .difficulty { padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem; }
        .difficulty-easy { background: #e8f5e8; color: #2e7d32; }
        .difficulty-medium { background: #fff3e0; color: #f57c00; }
        .difficulty-hard { background: #ffebee; color: #c62828; }
        .time { color: #666; font-size: 0.9rem; }
    `
  }
  
  /**
   * 获取页眉模板
   */
  private static getHeaderTemplate(videoInfo: VideoInfo, options: PDFExportOptions): string {
    return `
    <div style="font-size: 10px; color: #666; text-align: center; width: 100%; padding: 10px 0;">
        <span>YouTube智学 - ${videoInfo.title}</span>
    </div>
    `
  }
  
  /**
   * 获取页脚模板
   */
  private static getFooterTemplate(options: PDFExportOptions): string {
    return `
    <div style="font-size: 10px; color: #666; text-align: center; width: 100%; padding: 10px 0;">
        <span class="pageNumber"></span> / <span class="totalPages"></span>
        ${options.watermark ? ` | ${options.watermark}` : ''}
    </div>
    `
  }
  
  /**
   * 清理资源
   */
  static async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }
}

export default PDFExportService