import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { auth } from '../lib/auth'
import { logger, LogCategory } from '../utils/logger'
// import { loginAttemptRateLimit } from '../middleware/rateLimitMiddleware' // Temporarily disabled

/**
 * Better Auth 路由处理器
 * 处理所有认证相关的API端点
 */

export async function betterAuthRoutes(fastify: FastifyInstance) {
  
  /**
   * Better Auth API 路由
   * 处理所有 /api/auth/* 的请求
   */
  fastify.all('/auth/*', {
    // preHandler: [loginAttemptRateLimit] // Temporarily disabled
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      logger.info('Better Auth request', undefined, {}, LogCategory.USER)

      // 创建Web API请求对象
      const url = new URL(request.url, `http://${request.headers.host}`)
      const method = request.method
      
      const webRequest = new Request(url.toString(), {
        method,
        headers: request.headers as any,
        body: method !== 'GET' && method !== 'HEAD' ? JSON.stringify(request.body) : undefined,
      })

      // 使用Better Auth处理请求
      const response = await auth.handler(webRequest)
      
      // 设置响应头
      response.headers.forEach((value, key) => {
        reply.header(key, value)
      })
      
      // 设置状态码并发送响应
      const body = await response.text()
      return reply.code(response.status).send(body)
      
    } catch (error) {
      logger.error('Better Auth error', error as Error, {}, LogCategory.USER)

      return reply.code(500).send({
        success: false,
        message: '认证服务错误'
      })
    }
  })

  /**
   * 获取当前用户信息 (兼容旧API)
   * GET /api/user/me
   */
  fastify.get('/user/me', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const session = await auth.api.getSession({
        headers: request.headers as any
      })

      if (!session) {
        return reply.code(401).send({
          success: false,
          message: '未登录'
        })
      }

      logger.info('User info retrieved', undefined, { userId: session.user.id }, LogCategory.USER)

      return reply.send({
        success: true,
        data: {
          user: session.user,
          session: session.session
        }
      })

    } catch (error) {
      logger.error('Get user info error', undefined, {}, LogCategory.USER)

      return reply.code(500).send({
        success: false,
        message: '获取用户信息失败'
      })
    }
  })

  /**
   * 用户登出 (兼容旧API)
   * POST /api/auth/signout
   */
  fastify.post('/auth/signout', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await auth.api.signOut({
        headers: request.headers as Record<string, string>
      })

      logger.info('User signed out', undefined, {}, LogCategory.USER)

      return reply.send({
        success: true,
        message: '登出成功'
      })

    } catch (error) {
      logger.error('Sign out error', undefined, {}, LogCategory.USER)

      return reply.code(500).send({
        success: false,
        message: '登出失败'
      })
    }
  })

  // 健康检查端点
  fastify.get('/auth/health', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      status: 'ok',
      service: 'better-auth',
      timestamp: new Date().toISOString()
    })
  })
}