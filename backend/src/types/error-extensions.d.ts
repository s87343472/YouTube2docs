/**
 * TypeScript 声明文件
 * 扩展Error接口以支持自定义属性，解决编译错误
 */

declare global {
  interface Error {
    requestId?: string
    userId?: string
    ip?: string
    url?: string
    cacheId?: string
    deletedCount?: number
    processedCount?: number
    youtubeUrl?: string
    error?: string | Error
    [key: string]: any
  }
}

// 扩展Fastify类型
declare module 'fastify' {
  interface FastifySchema {
    description?: string
    [key: string]: any
  }
  
  interface FastifyRequest {
    routerPath?: string
    [key: string]: any
  }
  
  interface FastifyReply {
    addHook?: any
    [key: string]: any
  }
}

export {}