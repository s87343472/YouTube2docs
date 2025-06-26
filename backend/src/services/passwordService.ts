import bcrypt from 'bcryptjs'
import { logger, LogCategory } from '../utils/logger'

/**
 * 密码管理服务
 * 负责密码哈希、验证和安全策略
 */

export interface PasswordValidationResult {
  isValid: boolean
  errors: string[]
}

export class PasswordService {
  private readonly saltRounds: number = 12

  /**
   * 哈希密码
   */
  async hashPassword(password: string): Promise<string> {
    try {
      const salt = await bcrypt.genSalt(this.saltRounds)
      const hashedPassword = await bcrypt.hash(password, salt)
      
      logger.info('Password hashed successfully', undefined, {}, LogCategory.USER)
      return hashedPassword
    } catch (error) {
      logger.error('Password hashing failed', error as Error, {}, LogCategory.USER)
      throw new Error('Password hashing failed')
    }
  }

  /**
   * 验证密码
   */
  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    try {
      const isValid = await bcrypt.compare(password, hashedPassword)
      
      if (isValid) {
        logger.info('Password verification successful', undefined, {}, LogCategory.USER)
      } else {
        logger.warn('Password verification failed', undefined, {}, LogCategory.USER)
      }
      
      return isValid
    } catch (error) {
      logger.error('Password verification error', error as Error, {}, LogCategory.USER)
      return false
    }
  }

  /**
   * 验证密码强度
   */
  validatePasswordStrength(password: string): PasswordValidationResult {
    const errors: string[] = []

    // 最小长度检查
    if (password.length < 6) {
      errors.push('密码长度至少6位')
    }

    // 最大长度检查
    if (password.length > 128) {
      errors.push('密码长度不能超过128位')
    }

    // 基本复杂度检查（可选）
    if (password.length >= 8) {
      const hasLowerCase = /[a-z]/.test(password)
      const hasUpperCase = /[A-Z]/.test(password)
      const hasNumbers = /\d/.test(password)
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)

      const complexityScore = [hasLowerCase, hasUpperCase, hasNumbers, hasSpecialChar].filter(Boolean).length

      if (complexityScore < 2) {
        errors.push('建议密码包含大小写字母、数字或特殊字符以提高安全性')
      }
    }

    // 常见弱密码检查
    const weakPasswords = [
      '123456', 'password', '123456789', '12345678', '12345',
      '1234567', 'qwerty', 'abc123', 'password123', 'admin'
    ]

    if (weakPasswords.includes(password.toLowerCase())) {
      errors.push('请勿使用常见的弱密码')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * 生成随机密码（用于重置等场景）
   */
  generateRandomPassword(length: number = 12): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
    let password = ''

    // 确保包含各种字符类型
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]
    password += '0123456789'[Math.floor(Math.random() * 10)]
    password += '!@#$%^&*'[Math.floor(Math.random() * 8)]

    // 填充剩余长度
    for (let i = password.length; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)]
    }

    // 随机打乱密码字符顺序
    return password.split('').sort(() => Math.random() - 0.5).join('')
  }

  /**
   * 检查密码是否需要更新（基于哈希方式）
   */
  needsRehash(hashedPassword: string): boolean {
    try {
      // 检查当前哈希是否使用了推荐的 salt rounds
      const rounds = bcrypt.getRounds(hashedPassword)
      return rounds < this.saltRounds
    } catch (error) {
      // 如果无法解析哈希，说明可能是旧格式，需要更新
      return true
    }
  }

  /**
   * 安全地比较两个密码哈希（防止时序攻击）
   */
  secureCompareHashes(hash1: string, hash2: string): boolean {
    if (hash1.length !== hash2.length) {
      return false
    }

    let result = 0
    for (let i = 0; i < hash1.length; i++) {
      result |= hash1.charCodeAt(i) ^ hash2.charCodeAt(i)
    }

    return result === 0
  }
}

export const passwordService = new PasswordService()