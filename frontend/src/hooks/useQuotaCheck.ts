import { useState, useCallback } from 'react'
import { QuotaService, type QuotaCheckResult } from '../services/quotaService'

/**
 * 配额检查钩子
 * 提供配额检查和提示功能
 */
export const useQuotaCheck = () => {
  const [checking, setChecking] = useState(false)
  const [lastCheckResult, setLastCheckResult] = useState<QuotaCheckResult | null>(null)

  /**
   * 检查配额
   */
  const checkQuota = useCallback(async (
    quotaType: string,
    amount: number = 1,
    metadata?: any
  ): Promise<QuotaCheckResult> => {
    try {
      setChecking(true)
      const result = await QuotaService.checkQuota(quotaType, amount, metadata)
      setLastCheckResult(result)
      return result
    } catch (error) {
      console.error('Quota check failed:', error)
      const errorResult: QuotaCheckResult = {
        allowed: false,
        reason: '配额检查失败，请稍后重试'
      }
      setLastCheckResult(errorResult)
      return errorResult
    } finally {
      setChecking(false)
    }
  }, [])

  /**
   * 检查视频处理配额
   */
  const checkVideoProcessingQuota = useCallback(async (
    videoDuration?: number,
    fileSize?: number
  ): Promise<QuotaCheckResult> => {
    return checkQuota('video_processing', 1, {
      videoDuration,
      fileSize
    })
  }, [checkQuota])

  /**
   * 检查分享配额
   */
  const checkShareQuota = useCallback(async (amount: number = 1): Promise<QuotaCheckResult> => {
    return checkQuota('shares', amount)
  }, [checkQuota])

  /**
   * 检查导出配额
   */
  const checkExportQuota = useCallback(async (amount: number = 1): Promise<QuotaCheckResult> => {
    return checkQuota('exports', amount)
  }, [checkQuota])

  /**
   * 检查存储配额
   */
  const checkStorageQuota = useCallback(async (fileSize: number): Promise<QuotaCheckResult> => {
    return checkQuota('storage', fileSize)
  }, [checkQuota])

  /**
   * 检查API调用配额
   */
  const checkApiCallQuota = useCallback(async (amount: number = 1): Promise<QuotaCheckResult> => {
    return checkQuota('api_calls', amount)
  }, [checkQuota])

  /**
   * 记录配额使用
   */
  const recordQuotaUsage = useCallback(async (
    quotaType: string,
    action: string,
    amount: number = 1,
    resourceId?: string,
    resourceType?: string,
    metadata?: any
  ) => {
    try {
      await QuotaService.recordQuotaUsage(
        quotaType,
        action,
        amount,
        resourceId,
        resourceType,
        metadata
      )
    } catch (error) {
      console.error('Failed to record quota usage:', error)
    }
  }, [])

  /**
   * 检查并记录视频处理
   */
  const checkAndRecordVideoProcessing = useCallback(async (
    videoDuration?: number,
    fileSize?: number,
    videoId?: string
  ): Promise<{ allowed: boolean; result: QuotaCheckResult }> => {
    const result = await checkVideoProcessingQuota(videoDuration, fileSize)
    
    if (result.allowed) {
      await recordQuotaUsage(
        'video_processing',
        'video_processed',
        1,
        videoId,
        'video',
        { videoDuration, fileSize }
      )
    }
    
    return { allowed: result.allowed, result }
  }, [checkVideoProcessingQuota, recordQuotaUsage])

  /**
   * 检查并记录分享
   */
  const checkAndRecordShare = useCallback(async (
    shareId?: string,
    shareType?: string
  ): Promise<{ allowed: boolean; result: QuotaCheckResult }> => {
    const result = await checkShareQuota(1)
    
    if (result.allowed) {
      await recordQuotaUsage(
        'shares',
        'share_created',
        1,
        shareId,
        shareType
      )
    }
    
    return { allowed: result.allowed, result }
  }, [checkShareQuota, recordQuotaUsage])

  /**
   * 检查并记录导出
   */
  const checkAndRecordExport = useCallback(async (
    exportType: string,
    exportId?: string
  ): Promise<{ allowed: boolean; result: QuotaCheckResult }> => {
    const result = await checkExportQuota(1)
    
    if (result.allowed) {
      await recordQuotaUsage(
        'exports',
        'export_generated',
        1,
        exportId,
        exportType
      )
    }
    
    return { allowed: result.allowed, result }
  }, [checkExportQuota, recordQuotaUsage])

  return {
    checking,
    lastCheckResult,
    checkQuota,
    checkVideoProcessingQuota,
    checkShareQuota,
    checkExportQuota,
    checkStorageQuota,
    checkApiCallQuota,
    recordQuotaUsage,
    checkAndRecordVideoProcessing,
    checkAndRecordShare,
    checkAndRecordExport
  }
}