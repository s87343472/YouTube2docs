import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { userService, CreateUserData } from '../services/userService'
import { googleOAuthService } from '../services/googleOAuthService'
import { userPlanIntegrationService } from '../services/userPlanIntegrationService'
import { jwtService } from '../services/jwtService'
import { passwordService } from '../services/passwordService'
import { refreshTokenMiddleware, requireAuth } from '../middleware/authMiddleware'
import { logger, LogCategory } from '../utils/logger'
import { getFrontendUrl } from '../utils/corsHelper'
import { config } from '../config'
import { z } from 'zod'

/**
 * 新的认证路由系统
 * 替换 Better Auth，提供邮箱注册/登录和Google OAuth功能
 */

// 请求体验证schemas
const registerSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(6, '密码至少6位'),
  name: z.string().min(1, '姓名不能为空').max(100, '姓名过长'),
  confirmPassword: z.string().min(6, '确认密码至少6位')
}).refine((data) => data.password === data.confirmPassword, {
  message: '两次输入的密码不一致',
  path: ['confirmPassword']
})

const loginSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(1, '密码不能为空')
})

const googleCallbackSchema = z.object({
  code: z.string().min(1, 'Authorization code required'),
  state: z.string().optional()
})

export async function authRoutes(fastify: FastifyInstance) {
  
  /**
   * 邮箱注册
   * POST /api/auth/register
   */
  fastify.post('/auth/register', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // 验证请求体
      const validatedData = registerSchema.parse(request.body)
      
      // 验证密码强度
      const passwordValidation = passwordService.validatePasswordStrength(validatedData.password)
      if (!passwordValidation.isValid) {
        return reply.code(400).send({
          success: false,
          message: '密码强度不足',
          errors: passwordValidation.errors
        })
      }

      // 检查邮箱是否已被注册
      const existingUser = await userService.findUserByEmail(validatedData.email)
      if (existingUser) {
        return reply.code(409).send({
          success: false,
          message: '该邮箱已被注册',
          code: 'EMAIL_ALREADY_EXISTS'
        })
      }

      // 创建用户数据
      const userData: CreateUserData = {
        email: validatedData.email,
        password: validatedData.password,
        name: validatedData.name,
        email_verified: false
      }

      // 创建用户
      const newUser = await userService.createUser(userData)
      
      // 初始化用户付费计划
      await userPlanIntegrationService.initializeUserPlan(newUser.id, 'free')

      // 生成JWT令牌
      const tokens = jwtService.generateTokenPair({
        userId: newUser.id,
        email: newUser.email,
        plan: newUser.plan
      })

      // 返回用户信息和令牌
      return reply.code(201).send({
        success: true,
        message: '注册成功',
        data: {
          user: {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
            plan: newUser.plan,
            email_verified: newUser.email_verified,
            image: newUser.image
          },
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken
        }
      })

    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          message: '输入数据格式错误',
          errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        })
      }

      logger.error('Registration failed', error as Error, { 
        email: (request.body as any)?.email 
      }, LogCategory.USER)

      return reply.code(500).send({
        success: false,
        message: error instanceof Error ? error.message : '注册失败'
      })
    }
  })

  /**
   * 邮箱登录
   * POST /api/auth/login
   */
  fastify.post('/auth/login', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // 验证请求体
      const validatedData = loginSchema.parse(request.body)

      // 验证用户凭据
      const user = await userService.verifyUserPassword(validatedData.email, validatedData.password)
      if (!user) {
        return reply.code(401).send({
          success: false,
          message: '邮箱或密码错误',
          code: 'INVALID_CREDENTIALS'
        })
      }

      // 同步用户计划状态
      await userPlanIntegrationService.syncUserPlanStatus(user.id)

      // 生成JWT令牌
      const tokens = jwtService.generateTokenPair({
        userId: user.id,
        email: user.email,
        plan: user.plan
      })

      // 返回用户信息和令牌
      return reply.send({
        success: true,
        message: '登录成功',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            plan: user.plan,
            email_verified: user.email_verified,
            image: user.image
          },
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken
        }
      })

    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          message: '输入数据格式错误',
          errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        })
      }

      logger.error('Login failed', error as Error, { 
        email: (request.body as any)?.email 
      }, LogCategory.USER)

      return reply.code(500).send({
        success: false,
        message: '登录失败'
      })
    }
  })

  /**
   * Google OAuth 登录入口
   * GET /api/auth/google
   */
  fastify.get('/auth/google', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // 生成随机state参数防止CSRF
      const state = Math.random().toString(36).substring(2, 15)
      
      // 生成Google OAuth授权URL
      const authUrl = googleOAuthService.generateAuthUrl(state)
      
      // 在session中保存state（这里简化处理，实际应用中可以使用Redis等）
      // 可以考虑将state存储到数据库临时表中
      
      return reply.send({
        success: true,
        data: {
          authUrl,
          state
        }
      })

    } catch (error) {
      logger.error('Google OAuth init failed', error as Error, {}, LogCategory.USER)
      
      return reply.code(500).send({
        success: false,
        message: 'Google登录初始化失败'
      })
    }
  })

  /**
   * Google OAuth 回调
   * POST /api/auth/callback/google
   */
  fastify.post('/auth/callback/google', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // 验证请求体
      const validatedData = googleCallbackSchema.parse(request.body)

      // 处理Google OAuth回调
      const authResult = await googleOAuthService.handleGoogleAuth(validatedData.code)

      // 如果是新用户，初始化付费计划
      if (authResult.isNewUser) {
        await userPlanIntegrationService.initializeUserPlan(authResult.user.id, 'free')
      } else {
        // 已有用户，同步计划状态
        await userPlanIntegrationService.syncUserPlanStatus(authResult.user.id)
      }

      // 获取最新的用户信息（包含计划信息）
      const userWithPlan = await userPlanIntegrationService.getUserWithPlan(authResult.user.id)
      if (!userWithPlan) {
        throw new Error('用户信息获取失败')
      }

      // 生成JWT令牌
      const tokens = jwtService.generateTokenPair({
        userId: userWithPlan.id,
        email: userWithPlan.email,
        plan: userWithPlan.plan
      })

      return reply.send({
        success: true,
        message: authResult.isNewUser ? 'Google账户注册成功' : 'Google登录成功',
        data: {
          user: {
            id: userWithPlan.id,
            email: userWithPlan.email,
            name: userWithPlan.name,
            plan: userWithPlan.plan,
            email_verified: userWithPlan.email_verified,
            image: userWithPlan.image
          },
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          isNewUser: authResult.isNewUser
        }
      })

    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          message: '回调参数格式错误',
          errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        })
      }

      logger.error('Google OAuth callback failed', error as Error, {}, LogCategory.USER)

      return reply.code(500).send({
        success: false,
        message: error instanceof Error ? error.message : 'Google登录失败'
      })
    }
  })

  /**
   * 刷新访问令牌
   * POST /api/auth/refresh
   */
  fastify.post('/auth/refresh', { preHandler: refreshTokenMiddleware }, async (request: FastifyRequest, reply: FastifyReply) => {
    // refreshTokenMiddleware 已经处理了所有逻辑
    // 这里不需要额外处理，响应已经在中间件中发送
  })

  /**
   * 登出
   * POST /api/auth/logout
   */
  fastify.post('/auth/logout', { preHandler: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user
      
      // 这里可以添加令牌黑名单逻辑（如果需要的话）
      // 目前JWT是无状态的，客户端删除令牌即可实现登出
      
      logger.info('User logged out', undefined, { userId: user?.id }, LogCategory.USER)

      return reply.send({
        success: true,
        message: '登出成功'
      })

    } catch (error) {
      logger.error('Logout failed', error as Error, {}, LogCategory.USER)
      
      return reply.code(500).send({
        success: false,
        message: '登出失败'
      })
    }
  })

  /**
   * 获取当前用户信息
   * GET /api/auth/me
   */
  fastify.get('/auth/me', { preHandler: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = request.user?.id
      if (!userId) {
        return reply.code(401).send({
          success: false,
          message: '用户未认证'
        })
      }

      // 获取完整的用户信息（包含订阅和配额信息）
      const userOverview = await userPlanIntegrationService.getUserQuotaOverview(userId)

      return reply.send({
        success: true,
        data: {
          user: {
            id: userOverview.user.id,
            email: userOverview.user.email,
            name: userOverview.user.name,
            plan: userOverview.user.plan,
            email_verified: userOverview.user.email_verified,
            image: userOverview.user.image,
            created_at: userOverview.user.created_at,
            updated_at: userOverview.user.updated_at
          },
          subscription: userOverview.subscription,
          quotaPlan: userOverview.quotaPlan,
          quotaUsages: userOverview.quotaUsages,
          alerts: userOverview.alerts
        }
      })

    } catch (error) {
      logger.error('Get current user failed', error as Error, { 
        userId: request.user?.id 
      }, LogCategory.USER)
      
      return reply.code(500).send({
        success: false,
        message: '获取用户信息失败'
      })
    }
  })

  /**
   * 更新用户信息
   * PUT /api/auth/profile
   */
  fastify.put('/auth/profile', { preHandler: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = request.user?.id
      if (!userId) {
        return reply.code(401).send({
          success: false,
          message: '用户未认证'
        })
      }

      const updateSchema = z.object({
        name: z.string().min(1, '姓名不能为空').max(100, '姓名过长').optional(),
        image: z.string().url('头像URL格式不正确').optional()
      })

      const validatedData = updateSchema.parse(request.body)

      // 更新用户信息
      const updatedUser = await userService.updateUser(userId, validatedData)
      if (!updatedUser) {
        return reply.code(404).send({
          success: false,
          message: '用户不存在'
        })
      }

      return reply.send({
        success: true,
        message: '用户信息更新成功',
        data: {
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
            plan: updatedUser.plan,
            email_verified: updatedUser.email_verified,
            image: updatedUser.image
          }
        }
      })

    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          message: '输入数据格式错误',
          errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        })
      }

      logger.error('Update profile failed', error as Error, { 
        userId: request.user?.id 
      }, LogCategory.USER)

      return reply.code(500).send({
        success: false,
        message: '更新用户信息失败'
      })
    }
  })

  /**
   * 健康检查
   * GET /api/auth/health
   */
  fastify.get('/auth/health', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // 检查认证系统健康状态
      const healthCheck = await userPlanIntegrationService.healthCheck()
      
      return reply.send({
        success: true,
        data: {
          status: healthCheck.healthy ? 'healthy' : 'unhealthy',
          timestamp: new Date().toISOString(),
          service: 'auth-system',
          version: '2.0.0',
          details: healthCheck
        }
      })

    } catch (error) {
      logger.error('Auth health check failed', error as Error, {}, LogCategory.USER)
      
      return reply.code(500).send({
        success: false,
        message: '健康检查失败',
        data: {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          service: 'auth-system',
          version: '2.0.0'
        }
      })
    }
  })

  // 兼容性路由：保持与前端的现有API兼容
  
  /**
   * 兼容性路由：Better Auth Google登录入口 (旧API)
   * GET /api/auth/sign-in/google
   */
  fastify.get('/auth/sign-in/google', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // 重定向到新的Google OAuth端点
      const state = Math.random().toString(36).substring(2, 15)
      const authUrl = googleOAuthService.generateAuthUrl(state)
      
      // 直接重定向到Google授权页面（兼容旧的行为）
      return reply.redirect(authUrl)
      
    } catch (error) {
      logger.error('Google OAuth redirect failed', error as Error, {}, LogCategory.USER)
      
      return reply.code(500).send({
        success: false,
        message: 'Google登录重定向失败'
      })
    }
  })

  /**
   * 兼容性路由：Better Auth Google回调 (旧API)
   * GET /api/auth/callback/google
   */
  fastify.get('/auth/callback/google', async (request: FastifyRequest, reply: FastifyReply) => {
    // 获取正确的前端URL
    const frontendUrl = config.server.frontendUrl
    
    try {
      const query = request.query as { code?: string; state?: string; error?: string }
      
      if (query.error) {
        logger.warn('Google OAuth error', new Error(query.error || 'OAuth error'), {}, LogCategory.USER)
        return reply.redirect(`${frontendUrl}/login?error=oauth_failed`)
      }

      if (!query.code) {
        logger.warn('Google OAuth callback missing code', new Error('Missing authorization code'), {}, LogCategory.USER)
        return reply.redirect(`${frontendUrl}/login?error=missing_code`)
      }

      // 处理Google OAuth回调
      const authResult = await googleOAuthService.handleGoogleAuth(query.code)

      // 如果是新用户，初始化付费计划
      if (authResult.isNewUser) {
        await userPlanIntegrationService.initializeUserPlan(authResult.user.id, 'free')
      } else {
        // 已有用户，同步计划状态
        await userPlanIntegrationService.syncUserPlanStatus(authResult.user.id)
      }

      // 获取最新的用户信息（包含计划信息）
      const userWithPlan = await userPlanIntegrationService.getUserWithPlan(authResult.user.id)
      if (!userWithPlan) {
        throw new Error('用户信息获取失败')
      }

      // 生成JWT令牌
      const tokens = jwtService.generateTokenPair({
        userId: userWithPlan.id,
        email: userWithPlan.email,
        plan: userWithPlan.plan
      })

      // 重定向到前端，传递令牌
      const redirectUrl = `${frontendUrl}/login-success?token=${encodeURIComponent(tokens.accessToken)}&refresh=${encodeURIComponent(tokens.refreshToken)}&new=${authResult.isNewUser}`
      return reply.redirect(redirectUrl)

    } catch (error) {
      logger.error('Google OAuth callback (GET) failed', error as Error, {}, LogCategory.USER)
      return reply.redirect(`${frontendUrl}/login?error=oauth_callback_failed`)
    }
  })

  /**
   * 兼容性路由：获取用户信息 (旧API)
   * GET /api/user/me
   */
  fastify.get('/user/me', { preHandler: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = request.user?.id
      if (!userId) {
        return reply.code(401).send({
          success: false,
          message: '用户未认证'
        })
      }

      const userOverview = await userPlanIntegrationService.getUserQuotaOverview(userId)

      return reply.send({
        success: true,
        data: {
          user: userOverview.user,
          session: {
            userId: userOverview.user.id,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15分钟后过期
          }
        }
      })

    } catch (error) {
      logger.error('Get user me (compatibility) failed', error as Error, { 
        userId: request.user?.id 
      }, LogCategory.USER)
      
      return reply.code(500).send({
        success: false,
        message: '获取用户信息失败'
      })
    }
  })

  /**
   * 兼容性路由：登出 (旧API)
   * POST /api/auth/signout
   */
  fastify.post('/auth/signout', { preHandler: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user
      
      logger.info('User signed out (compatibility)', undefined, { userId: user?.id }, LogCategory.USER)

      return reply.send({
        success: true,
        message: '登出成功'
      })

    } catch (error) {
      logger.error('Signout (compatibility) failed', error as Error, {}, LogCategory.USER)
      
      return reply.code(500).send({
        success: false,
        message: '登出失败'
      })
    }
  })

  /**
   * 社交登录通用接口
   * POST /api/auth/sign-in/social
   */
  fastify.addContentTypeParser('*', { parseAs: 'string' }, function (req, body, done) {
    try {
      const json = JSON.parse(body as string)
      done(null, json)
    } catch (err) {
      // 如果不是JSON，返回原始字符串
      done(null, body)
    }
  })

  fastify.post('/auth/sign-in/social', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      logger.info('Social sign-in request received', undefined, {
        contentType: request.headers['content-type'],
        bodyType: typeof request.body,
        body: request.body,
        headers: request.headers
      }, LogCategory.USER)

      let provider = 'google' // 默认为Google
      let callbackURL = undefined
      
      // 尝试从各种可能的格式中提取provider
      if (request.body && typeof request.body === 'object') {
        const body = request.body as any
        provider = body.provider || 'google'
        callbackURL = body.callbackURL
      }
      
      // 目前只支持Google登录
      if (provider !== 'google') {
        return reply.code(400).send({
          success: false,
          message: '暂不支持该登录方式'
        })
      }

      // 生成随机state参数防止CSRF
      const state = Math.random().toString(36).substring(2, 15)
      
      // 生成Google OAuth授权URL
      const authUrl = googleOAuthService.generateAuthUrl(state)
      
      logger.info('Google OAuth URL generated', undefined, {
        authUrl,
        provider,
        state
      }, LogCategory.USER)
      
      // Better Auth期望的响应格式 - 直接返回URL
      return reply.send({
        url: authUrl,
        redirect: true
      })

    } catch (error) {
      logger.error('Social sign-in failed', error as Error, {
        contentType: request.headers['content-type'],
        body: request.body
      }, LogCategory.USER)
      
      return reply.code(500).send({
        success: false,
        message: '社交登录初始化失败',
        error: {
          message: '社交登录初始化失败'
        }
      })
    }
  })

  /**
   * 获取会话信息 (兼容旧API)
   * GET /api/auth/get-session
   */
  fastify.get('/auth/get-session', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // 从Authorization header获取token
      const authHeader = request.headers.authorization
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.send({
          success: true,
          data: {
            session: null,
            user: null
          }
        })
      }

      const token = authHeader.substring(7)
      
      try {
        // 验证JWT令牌
        const payload = jwtService.verifyAccessToken(token)
        
        // 获取用户信息
        const user = await userService.findUserById(payload.userId)
        
        if (!user) {
          return reply.send({
            success: true,
            data: {
              session: null,
              user: null
            }
          })
        }

        return reply.send({
          success: true,
          data: {
            session: {
              userId: user.id,
              email: user.email,
              expiresAt: new Date(payload.exp * 1000).toISOString()
            },
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              image: user.image,
              email_verified: user.email_verified,
              plan: user.plan
            }
          }
        })

      } catch (tokenError) {
        // Token无效或过期
        return reply.send({
          success: true,
          data: {
            session: null,
            user: null
          }
        })
      }

    } catch (error) {
      logger.error('Get session failed', error as Error, {}, LogCategory.USER)
      
      return reply.code(500).send({
        success: false,
        message: '获取会话信息失败'
      })
    }
  })
}