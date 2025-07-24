import { userService } from '../services/userService'
import { googleOAuthService } from '../services/googleOAuthService'
import { userPlanIntegrationService } from '../services/userPlanIntegrationService'
import { jwtService } from '../services/jwtService'
import { passwordService } from '../services/passwordService'
import { databaseAdapter } from '../services/databaseAdapter'
import { pool } from '../utils/database'
import { logger, LogCategory } from '../utils/logger'

/**
 * 新认证系统综合测试
 * 验证所有认证相关功能是否正常工作
 */

interface TestResult {
  name: string
  status: 'pass' | 'fail' | 'skip'
  duration: number
  error?: string
  details?: any
}

export class AuthSystemTester {
  private results: TestResult[] = []
  private testUser: any = null

  /**
   * 运行所有认证系统测试
   */
  async runAllTests(): Promise<{
    success: boolean
    totalTests: number
    passed: number
    failed: number
    skipped: number
    results: TestResult[]
  }> {
    logger.info('Starting comprehensive authentication system tests...', undefined, {}, LogCategory.USER)

    const tests = [
      this.testDatabaseSchema.bind(this),
      this.testPasswordService.bind(this),
      this.testJWTService.bind(this),
      this.testUserService.bind(this),
      this.testUserRegistration.bind(this),
      this.testUserLogin.bind(this),
      this.testUserPlanIntegration.bind(this),
      this.testGoogleOAuthService.bind(this),
      this.testDatabaseAdapter.bind(this),
      this.testHealthCheck.bind(this),
      this.cleanupTestData.bind(this)
    ]

    for (const test of tests) {
      try {
        await test()
      } catch (error) {
        logger.error('Test execution failed', error as Error, {}, LogCategory.USER)
      }
    }

    const summary = {
      success: this.results.filter(r => r.status === 'fail').length === 0,
      totalTests: this.results.length,
      passed: this.results.filter(r => r.status === 'pass').length,
      failed: this.results.filter(r => r.status === 'fail').length,
      skipped: this.results.filter(r => r.status === 'skip').length,
      results: this.results
    }

    logger.info('Authentication system tests completed', undefined, summary, LogCategory.USER)
    return summary
  }

  /**
   * 测试数据库模式
   */
  private async testDatabaseSchema(): Promise<void> {
    const start = Date.now()
    try {
      const validation = await databaseAdapter.validateSchema()
      
      if (validation.isValid) {
        this.results.push({
          name: 'Database Schema Validation',
          status: 'pass',
          duration: Date.now() - start,
          details: validation
        })
      } else {
        this.results.push({
          name: 'Database Schema Validation',
          status: 'fail',
          duration: Date.now() - start,
          error: `Schema validation failed: ${validation.missingTables.length} missing tables, ${validation.missingColumns.length} missing columns`,
          details: validation
        })
      }
    } catch (error) {
      this.results.push({
        name: 'Database Schema Validation',
        status: 'fail',
        duration: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * 测试密码服务
   */
  private async testPasswordService(): Promise<void> {
    const start = Date.now()
    try {
      const testPassword = 'TestPassword123!'
      
      // 测试密码验证
      const validation = passwordService.validatePasswordStrength(testPassword)
      if (!validation.isValid) {
        throw new Error('Password validation failed')
      }

      // 测试密码哈希
      const hashedPassword = await passwordService.hashPassword(testPassword)
      if (!hashedPassword || hashedPassword.length < 10) {
        throw new Error('Password hashing failed')
      }

      // 测试密码验证
      const isValid = await passwordService.verifyPassword(testPassword, hashedPassword)
      if (!isValid) {
        throw new Error('Password verification failed')
      }

      // 测试错误密码
      const isInvalid = await passwordService.verifyPassword('wrongpassword', hashedPassword)
      if (isInvalid) {
        throw new Error('Invalid password should not verify')
      }

      this.results.push({
        name: 'Password Service',
        status: 'pass',
        duration: Date.now() - start
      })
    } catch (error) {
      this.results.push({
        name: 'Password Service',
        status: 'fail',
        duration: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * 测试JWT服务
   */
  private async testJWTService(): Promise<void> {
    const start = Date.now()
    try {
      const testPayload = {
        userId: 'test-user-id',
        email: 'test@example.com',
        plan: 'free'
      }

      // 生成令牌对
      const tokens = jwtService.generateTokenPair(testPayload)
      if (!tokens.accessToken || !tokens.refreshToken) {
        throw new Error('Token generation failed')
      }

      // 验证访问令牌
      const decodedAccess = jwtService.verifyAccessToken(tokens.accessToken)
      if (decodedAccess.userId !== testPayload.userId) {
        throw new Error('Access token verification failed')
      }

      // 验证刷新令牌
      const decodedRefresh = jwtService.verifyRefreshToken(tokens.refreshToken)
      if (decodedRefresh.userId !== testPayload.userId) {
        throw new Error('Refresh token verification failed')
      }

      // 测试令牌提取
      const extractedToken = jwtService.extractTokenFromHeader(`Bearer ${tokens.accessToken}`)
      if (extractedToken !== tokens.accessToken) {
        throw new Error('Token extraction failed')
      }

      this.results.push({
        name: 'JWT Service',
        status: 'pass',
        duration: Date.now() - start
      })
    } catch (error) {
      this.results.push({
        name: 'JWT Service',
        status: 'fail',
        duration: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * 测试用户服务基础功能
   */
  private async testUserService(): Promise<void> {
    const start = Date.now()
    try {
      const testEmail = `test-${Date.now()}@example.com`
      
      // 测试邮箱检查
      const emailTaken = await userService.isEmailTaken(testEmail)
      if (emailTaken) {
        throw new Error('Email should not be taken initially')
      }

      this.results.push({
        name: 'User Service',
        status: 'pass',
        duration: Date.now() - start
      })
    } catch (error) {
      this.results.push({
        name: 'User Service',
        status: 'fail',
        duration: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * 测试用户注册
   */
  private async testUserRegistration(): Promise<void> {
    const start = Date.now()
    try {
      const testEmail = `test-user-${Date.now()}@example.com`
      const userData = {
        email: testEmail,
        password: 'TestPassword123!',
        name: 'Test User',
        email_verified: false
      }

      // 创建用户
      const newUser = await userService.createUser(userData)
      if (!newUser || !newUser.id || newUser.email !== testEmail) {
        throw new Error('User creation failed')
      }

      this.testUser = newUser

      // 验证用户可以通过邮箱找到
      const foundUser = await userService.findUserByEmail(testEmail)
      if (!foundUser || foundUser.id !== newUser.id) {
        throw new Error('User lookup failed')
      }

      // 验证密码验证
      const verifiedUser = await userService.verifyUserPassword(testEmail, 'TestPassword123!')
      if (!verifiedUser || verifiedUser.id !== newUser.id) {
        throw new Error('User password verification failed')
      }

      this.results.push({
        name: 'User Registration',
        status: 'pass',
        duration: Date.now() - start,
        details: { userId: newUser.id }
      })
    } catch (error) {
      this.results.push({
        name: 'User Registration',
        status: 'fail',
        duration: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * 测试用户登录
   */
  private async testUserLogin(): Promise<void> {
    const start = Date.now()
    try {
      if (!this.testUser) {
        throw new Error('No test user available for login test')
      }

      // 测试正确密码登录
      const loginUser = await userService.verifyUserPassword(this.testUser.email, 'TestPassword123!')
      if (!loginUser || loginUser.id !== this.testUser.id) {
        throw new Error('Login with correct password failed')
      }

      // 测试错误密码登录
      const invalidLogin = await userService.verifyUserPassword(this.testUser.email, 'WrongPassword')
      if (invalidLogin) {
        throw new Error('Login with wrong password should fail')
      }

      this.results.push({
        name: 'User Login',
        status: 'pass',
        duration: Date.now() - start
      })
    } catch (error) {
      this.results.push({
        name: 'User Login',
        status: 'fail',
        duration: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * 测试用户计划集成
   */
  private async testUserPlanIntegration(): Promise<void> {
    const start = Date.now()
    try {
      if (!this.testUser) {
        throw new Error('No test user available for plan integration test')
      }

      // 初始化用户计划
      await userPlanIntegrationService.initializeUserPlan(this.testUser.id, 'free')

      // 获取用户计划信息
      const userWithPlan = await userPlanIntegrationService.getUserWithPlan(this.testUser.id)
      if (!userWithPlan || !userWithPlan.subscription) {
        throw new Error('User plan initialization failed')
      }

      // 同步计划状态
      await userPlanIntegrationService.syncUserPlanStatus(this.testUser.id)

      // 获取配额概览
      const overview = await userPlanIntegrationService.getUserQuotaOverview(this.testUser.id)
      if (!overview || !overview.user || !overview.subscription) {
        throw new Error('User quota overview failed')
      }

      this.results.push({
        name: 'User Plan Integration',
        status: 'pass',
        duration: Date.now() - start,
        details: { plan: userWithPlan.plan, quotaPlan: overview.quotaPlan?.name }
      })
    } catch (error) {
      this.results.push({
        name: 'User Plan Integration',
        status: 'fail',
        duration: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * 测试Google OAuth服务（基础功能）
   */
  private async testGoogleOAuthService(): Promise<void> {
    const start = Date.now()
    try {
      // 测试授权URL生成
      const authUrl = googleOAuthService.generateAuthUrl('test-state')
      if (!authUrl || !authUrl.includes('oauth2') || !authUrl.includes('google')) {
        throw new Error('Google OAuth URL generation failed')
      }

      // 测试状态验证
      const isValidState = googleOAuthService.validateState('test-state', 'test-state')
      if (!isValidState) {
        throw new Error('State validation failed')
      }

      const isInvalidState = googleOAuthService.validateState('test-state', 'wrong-state')
      if (isInvalidState) {
        throw new Error('Invalid state should not validate')
      }

      this.results.push({
        name: 'Google OAuth Service',
        status: 'pass',
        duration: Date.now() - start
      })
    } catch (error) {
      this.results.push({
        name: 'Google OAuth Service',
        status: 'fail',
        duration: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * 测试数据库适配器
   */
  private async testDatabaseAdapter(): Promise<void> {
    const start = Date.now()
    try {
      // 验证集成状态
      const integration = await databaseAdapter.validateIntegration()
      if (!integration) {
        throw new Error('Integration validation failed')
      }

      // 获取迁移状态
      const migrations = await databaseAdapter.getMigrationStatus()
      if (!migrations || typeof migrations !== 'object') {
        throw new Error('Migration status check failed')
      }

      this.results.push({
        name: 'Database Adapter',
        status: 'pass',
        duration: Date.now() - start,
        details: { 
          integrationValid: integration,
          migrationStatus: migrations.status 
        }
      })
    } catch (error) {
      this.results.push({
        name: 'Database Adapter',
        status: 'fail',
        duration: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * 测试系统健康检查
   */
  private async testHealthCheck(): Promise<void> {
    const start = Date.now()
    try {
      const healthCheck = await userPlanIntegrationService.healthCheck()
      if (!healthCheck) {
        throw new Error('Health check failed')
      }

      this.results.push({
        name: 'Health Check',
        status: 'pass',
        duration: Date.now() - start,
        details: { 
          healthy: healthCheck.healthy,
          totalUsers: healthCheck.statistics.totalUsers 
        }
      })
    } catch (error) {
      this.results.push({
        name: 'Health Check',
        status: 'fail',
        duration: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * 清理测试数据
   */
  private async cleanupTestData(): Promise<void> {
    const start = Date.now()
    try {
      if (this.testUser) {
        // 删除测试用户相关数据
        await pool.query('DELETE FROM accounts WHERE user_id = $1', [this.testUser.id])
        await pool.query('-- 不再需要user_id_mapping表', [this.testUser.id])
        await pool.query('DELETE FROM users WHERE id = $1', [this.testUser.id])
        
        logger.info('Test user data cleaned up', undefined, { userId: this.testUser.id }, LogCategory.USER)
      }

      this.results.push({
        name: 'Cleanup Test Data',
        status: 'pass',
        duration: Date.now() - start
      })
    } catch (error) {
      this.results.push({
        name: 'Cleanup Test Data',
        status: 'fail',
        duration: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}

/**
 * 运行认证系统测试的快捷函数
 */
export async function runAuthSystemTests(): Promise<boolean> {
  const tester = new AuthSystemTester()
  const results = await tester.runAllTests()
  
  console.log('\n=== 认证系统测试结果 ===')
  console.log(`总测试数: ${results.totalTests}`)
  console.log(`通过: ${results.passed}`)
  console.log(`失败: ${results.failed}`)
  console.log(`跳过: ${results.skipped}`)
  console.log(`成功率: ${((results.passed / results.totalTests) * 100).toFixed(1)}%`)
  
  console.log('\n=== 详细结果 ===')
  results.results.forEach(result => {
    const status = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⏭️'
    console.log(`${status} ${result.name} (${result.duration}ms)${result.error ? ` - ${result.error}` : ''}`)
  })
  
  return results.success
}