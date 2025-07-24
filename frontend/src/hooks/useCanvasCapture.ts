import { useCallback } from 'react'
import html2canvas from 'html2canvas'

/**
 * Canvas图像捕获Hook
 * 用于将React Flow Canvas组件转换为图片
 */

export interface CaptureOptions {
  format?: 'png' | 'jpeg' | 'webp'
  quality?: number
  scale?: number
  backgroundColor?: string
  width?: number
  height?: number
}

export const useCanvasCapture = () => {
  const captureCanvas = useCallback(async (
    elementId: string, 
    options: CaptureOptions = {}
  ): Promise<string> => {
    const {
      format = 'png',
      quality = 0.95,
      scale = 2,
      backgroundColor = '#ffffff',
      width,
      height
    } = options

    try {
      const element = document.getElementById(elementId)
      if (!element) {
        throw new Error(`Element with id "${elementId}" not found`)
      }

      // 等待一小段时间确保Canvas完全渲染
      await new Promise(resolve => setTimeout(resolve, 500))

      const canvas = await html2canvas(element, {
        scale,
        backgroundColor,
        useCORS: true,
        allowTaint: false,
        width: width || element.offsetWidth,
        height: height || element.offsetHeight,
        logging: false,
        onclone: (clonedDoc) => {
          // 确保克隆的文档中的样式正确加载
          const clonedElement = clonedDoc.getElementById(elementId)
          if (clonedElement) {
            clonedElement.style.transform = 'none'
          }
        }
      })

      // 转换为指定格式的数据URL
      const mimeType = `image/${format}`
      return canvas.toDataURL(mimeType, quality)
    } catch (error) {
      console.error('Canvas capture failed:', error)
      throw new Error(`Failed to capture canvas: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }, [])

  const captureCanvasAsBlob = useCallback(async (
    elementId: string,
    options: CaptureOptions = {}
  ): Promise<Blob> => {
    const dataUrl = await captureCanvas(elementId, options)
    
    // 转换dataURL为Blob
    const response = await fetch(dataUrl)
    return response.blob()
  }, [captureCanvas])

  const downloadCanvasImage = useCallback(async (
    elementId: string,
    filename: string = 'knowledge-graph',
    options: CaptureOptions = {}
  ): Promise<void> => {
    try {
      const dataUrl = await captureCanvas(elementId, options)
      
      // 创建下载链接
      const link = document.createElement('a')
      link.download = `${filename}.${options.format || 'png'}`
      link.href = dataUrl
      
      // 触发下载
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Download failed:', error)
      throw error
    }
  }, [captureCanvas])

  return {
    captureCanvas,
    captureCanvasAsBlob,
    downloadCanvasImage
  }
}

export default useCanvasCapture