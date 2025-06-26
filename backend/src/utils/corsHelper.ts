/**
 * 动态CORS配置工具
 * 自动适应不同的部署环境和域名
 */

export interface CorsConfig {
  origin: string | string[] | boolean | ((origin: string | undefined) => boolean)
  credentials: boolean
  methods: string[]
  allowedHeaders: string[]
  exposedHeaders?: string[]
}

/**
 * 从请求头获取前端域名
 */
function getFrontendOriginFromRequest(request: any): string | null {
  // 1. 检查Referer头
  const referer = request.headers.referer
  if (referer) {
    try {
      const url = new URL(referer)
      return url.origin
    } catch {
      // ignore
    }
  }

  // 2. 检查Origin头
  const origin = request.headers.origin
  if (origin) {
    return origin
  }

  // 3. 检查X-Forwarded-Host头（反向代理）
  const forwardedHost = request.headers['x-forwarded-host']
  if (forwardedHost) {
    const protocol = request.headers['x-forwarded-proto'] || 'https'
    return `${protocol}://${forwardedHost}`
  }

  return null
}

/**
 * 检查域名是否为允许的域名
 */
function isAllowedOrigin(origin: string): boolean {
  // 开发环境域名
  const devPatterns = [
    /^http:\/\/localhost:\d+$/,
    /^http:\/\/127\.0\.0\.1:\d+$/,
    /^http:\/\/0\.0\.0\.0:\d+$/
  ]

  // 生产环境域名模式
  const prodPatterns = [
    /^https:\/\/ytb\.sagasu\.art$/,
    /^https:\/\/.*\.sagasu\.art$/,  // 支持子域名
    /^https:\/\/.*\.vercel\.app$/,  // Vercel部署
    /^https:\/\/.*\.netlify\.app$/, // Netlify部署
    /^https:\/\/.*\.github\.io$/    // GitHub Pages
  ]

  const allPatterns = [...devPatterns, ...prodPatterns]
  
  return allPatterns.some(pattern => pattern.test(origin))
}

/**
 * 生成动态CORS配置
 */
export function createDynamicCorsConfig(): CorsConfig {
  return {
    origin: (origin: string | undefined) => {
      // 如果没有origin（比如Postman请求），在开发环境允许
      if (!origin) {
        return process.env.NODE_ENV === 'development'
      }

      // 检查是否为允许的域名
      if (isAllowedOrigin(origin)) {
        return true
      }

      // 检查环境变量中的额外允许域名
      const extraOrigins = process.env.EXTRA_CORS_ORIGINS?.split(',') || []
      if (extraOrigins.includes(origin)) {
        return true
      }

      console.warn(`🚫 CORS: 拒绝来自未授权域名的请求: ${origin}`)
      return false
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'Cache-Control',
      'X-File-Name'
    ],
    exposedHeaders: ['Authorization']
  }
}

/**
 * 获取前端URL用于重定向
 */
export function getFrontendUrl(request?: any): string {
  // 1. 优先使用环境变量
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL
  }

  // 2. 从CORS_ORIGIN环境变量获取
  if (process.env.CORS_ORIGIN) {
    return process.env.CORS_ORIGIN
  }

  // 3. 从请求头动态获取
  if (request) {
    const detectedOrigin = getFrontendOriginFromRequest(request)
    if (detectedOrigin && isAllowedOrigin(detectedOrigin)) {
      return detectedOrigin
    }
  }

  // 4. 根据环境返回默认值
  if (process.env.NODE_ENV === 'production') {
    return 'https://ytb.sagasu.art'
  } else {
    return 'http://localhost:5173'
  }
}

/**
 * 开发者工具：显示当前CORS配置
 */
export function debugCorsConfig(): void {
  console.log('🔧 CORS Configuration:')
  console.log('  - Environment:', process.env.NODE_ENV || 'development')
  console.log('  - Frontend URL:', getFrontendUrl())
  console.log('  - CORS Origin:', process.env.CORS_ORIGIN || 'auto-detect')
  console.log('  - Extra Origins:', process.env.EXTRA_CORS_ORIGINS || 'none')
}