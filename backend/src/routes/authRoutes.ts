import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { config } from '../config'
import { logger, LogCategory } from '../utils/logger'
import { validators } from '../middleware/validation'
import { DatabaseError, ValidationError, AuthenticationError } from '../errors'
import { pool } from '../utils/database'

/**
 * 用户认证相关的API路由
 * 处理用户注册、登录、登出等功能
 */

interface RegisterRequest {
  name: string
  email: string
  password: string
}

interface LoginRequest {
  email: string
  password: string
}

interface User {
  id: string
  name: string
  email: string
  password_hash: string
  createdAt: string
  is_active: boolean
}

export async function authRoutes(fastify: FastifyInstance) {
  
  /**
   * 用户注册
   * POST /api/auth/register
   */
  fastify.post('/auth/register', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 50 },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6, maxLength: 100 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    email: { type: 'string' }
                  }
                },
                token: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: RegisterRequest }>, reply: FastifyReply) => {
    try {
      const { name, email, password } = request.body
      
      logger.info('User registration attempt', undefined, {
        email,
        userAgent: request.headers['user-agent']
      }, LogCategory.USER)

      // 检查邮箱是否已存在
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      )

      if (existingUser.rows.length > 0) {
        logger.warn('Registration failed: email already exists', undefined, {
          email
        }, LogCategory.USER)
        
        return reply.code(400).send({
          success: false,
          message: '邮箱地址已被注册'
        })
      }

      // 密码加密
      const saltRounds = 12
      const passwordHash = await bcrypt.hash(password, saltRounds)

      // 创建用户（使用自增ID）
      const result = await pool.query(`
        INSERT INTO users (name, email, password_hash, is_active)
        VALUES ($1, $2, $3, true)
        RETURNING id, name, email, "createdAt"
      `, [name, email, passwordHash])

      const newUser = result.rows[0]

      // 生成JWT token
      const token = jwt.sign(
        { 
          userId: newUser.id.toString(), 
          email: newUser.email,
          role: 'user'
        },
        config.security.jwtSecret,
        { expiresIn: config.security.jwtExpiresIn } as jwt.SignOptions
      )

      logger.info('User registered successfully', undefined, {
        userId: newUser.id,
        email: newUser.email,
        name: newUser.name
      }, LogCategory.USER)

      return reply.send({
        success: true,
        message: '注册成功',
        data: {
          user: {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email
          },
          token
        }
      })

    } catch (error) {
      logger.error('Registration error', error as Error, {
        email: request.body.email
      }, LogCategory.USER)

      if (error instanceof ValidationError) {
        return reply.code(400).send({
          success: false,
          message: error.message
        })
      }

      return reply.code(500).send({
        success: false,
        message: '注册失败，请稍后重试'
      })
    }
  })

  /**
   * 用户登录
   * POST /api/auth/login
   */
  fastify.post('/auth/login', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 1 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    email: { type: 'string' }
                  }
                },
                token: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: LoginRequest }>, reply: FastifyReply) => {
    try {
      const { email, password } = request.body
      
      logger.info('User login attempt', undefined, {
        email,
        userAgent: request.headers['user-agent']
      }, LogCategory.USER)

      // 查找用户
      const result = await pool.query(`
        SELECT id, name, email, password_hash, is_active 
        FROM users 
        WHERE email = $1
      `, [email])

      if (result.rows.length === 0) {
        logger.warn('Login failed: user not found', undefined, {
          email
        }, LogCategory.SECURITY)
        
        return reply.code(401).send({
          success: false,
          message: '邮箱或密码错误'
        })
      }

      const user = result.rows[0] as User

      // 检查用户是否激活
      if (!user.is_active) {
        logger.warn('Login failed: user not active', undefined, {
          userId: user.id,
          email
        }, LogCategory.SECURITY)
        
        return reply.code(401).send({
          success: false,
          message: '账户已被禁用，请联系客服'
        })
      }

      // 验证密码
      const isPasswordValid = await bcrypt.compare(password, user.password_hash)
      
      if (!isPasswordValid) {
        logger.warn('Login failed: invalid password', undefined, {
          userId: user.id,
          email
        }, LogCategory.SECURITY)
        
        return reply.code(401).send({
          success: false,
          message: '邮箱或密码错误'
        })
      }

      // 生成JWT token
      const token = jwt.sign(
        { 
          userId: user.id.toString(), 
          email: user.email,
          role: 'user'
        },
        config.security.jwtSecret,
        { expiresIn: config.security.jwtExpiresIn } as jwt.SignOptions
      )

      // 更新最后登录时间
      await pool.query(
        'UPDATE users SET last_login_at = NOW() WHERE id = $1',
        [user.id]
      )

      logger.info('User logged in successfully', undefined, {
        userId: user.id,
        email: user.email,
        name: user.name
      }, LogCategory.USER)

      return reply.send({
        success: true,
        message: '登录成功',
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email
          },
          token
        }
      })

    } catch (error) {
      logger.error('Login error', error as Error, {
        email: request.body.email
      }, LogCategory.USER)

      return reply.code(500).send({
        success: false,
        message: '登录失败，请稍后重试'
      })
    }
  })

  /**
   * 获取当前用户信息
   * GET /api/auth/me
   */
  fastify.get('/auth/me', {
    preHandler: [
      async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          const token = request.headers.authorization?.replace('Bearer ', '')
          
          if (!token) {
            return reply.code(401).send({
              success: false,
              message: '未提供认证令牌'
            })
          }

          if (!config.security.jwtSecret) {
            throw new Error('JWT secret not configured')
          }

          const decoded = jwt.verify(token, config.security.jwtSecret) as any
          
          // 查询用户信息
          const result = await pool.query(`
            SELECT id, name, email, "createdAt", is_active 
            FROM users 
            WHERE id = $1 AND is_active = true
          `, [decoded.userId])

          if (result.rows.length === 0) {
            return reply.code(401).send({
              success: false,
              message: '用户不存在或已被禁用'
            })
          }

          request.user = {
            id: decoded.userId,
            email: decoded.email,
            role: decoded.role || 'user',
            isActive: true
          }
          
        } catch (error) {
          return reply.code(401).send({
            success: false,
            message: '认证令牌无效'
          })
        }
      }
    ],
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                email: { type: 'string' },
                createdAt: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = request.user?.id
      
      const result = await pool.query(`
        SELECT id, name, email, "createdAt" 
        FROM users 
        WHERE id = $1
      `, [userId])

      const user = result.rows[0]

      return reply.send({
        success: true,
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt
        }
      })

    } catch (error) {
      logger.error('Get user info error', error as Error, {
        userId: request.user?.id
      }, LogCategory.USER)

      return reply.code(500).send({
        success: false,
        message: '获取用户信息失败'
      })
    }
  })

  /**
   * 用户登出
   * POST /api/auth/logout
   */
  fastify.post('/auth/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    // 注意：JWT是无状态的，实际的登出需要在客户端删除token
    // 这里只是记录登出行为
    logger.info('User logout', undefined, {
      userId: request.user?.id,
      userAgent: request.headers['user-agent']
    }, LogCategory.USER)

    return reply.send({
      success: true,
      message: '登出成功'
    })
  })
}