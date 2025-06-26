import { pool } from '../utils/database'
import { logger, LogCategory } from '../utils/logger'
import { userService } from './userService'
import { userPlanIntegrationService } from './userPlanIntegrationService'

/**
 * 数据库适配器服务
 * 负责确保新认证系统与现有数据库结构的兼容性
 * 处理数据迁移、模式升级和兼容性检查
 */

export interface MigrationStatus {
  migrationName: string
  status: 'pending' | 'completed' | 'failed'
  executedAt?: Date
  error?: string
}

export interface SchemaValidationResult {
  isValid: boolean
  missingTables: string[]
  missingColumns: string[]
  requiredMigrations: string[]
  warnings: string[]
}

export interface DatabaseMigrationResult {
  success: boolean
  migrationsExecuted: number
  errors: string[]
  newTablesCreated: string[]
  existingTablesModified: string[]
}

export class DatabaseAdapter {
  
  /**
   * 验证数据库模式是否支持新认证系统
   */
  async validateSchema(): Promise<SchemaValidationResult> {
    const result: SchemaValidationResult = {
      isValid: true,
      missingTables: [],
      missingColumns: [],
      requiredMigrations: [],
      warnings: []
    }

    try {
      // 检查必需的表
      const requiredTables = [
        'user',           // 新的用户表
        'account',        // 认证账户表
        'user_id_mapping', // ID映射表
        'user_subscriptions', // 订阅表
        'quota_plans',    // 配额计划表
        'user_quota_usage', // 配额使用表
        'quota_usage_logs', // 配额日志表
        'quota_alerts'    // 配额预警表
      ]

      const existingTables = await this.getExistingTables()
      const missingTables = requiredTables.filter(table => !existingTables.includes(table))
      
      if (missingTables.length > 0) {
        result.isValid = false
        result.missingTables = missingTables
        result.requiredMigrations.push('007_create_user_quota_system.sql')
        result.requiredMigrations.push('008_update_quota_plans.sql')
        result.requiredMigrations.push('009_create_video_cache_system.sql')
        result.requiredMigrations.push('010_create_abuse_prevention_system.sql')
        result.requiredMigrations.push('011_create_notification_system.sql')
        result.requiredMigrations.push('012_create_user_id_mapping.sql')
      }

      // 检查用户表结构
      if (existingTables.includes('user')) {
        const userColumns = await this.getTableColumns('user')
        const requiredUserColumns = [
          'id', 'email', 'name', 'emailVerified', 'image', 
          'plan', 'monthlyQuota', 'usedQuota', 'createdAt', 'updatedAt'
        ]
        
        const missingUserColumns = requiredUserColumns.filter(col => 
          !userColumns.some(existing => existing.column_name === col)
        )
        
        if (missingUserColumns.length > 0) {
          result.isValid = false
          result.missingColumns.push(...missingUserColumns.map(col => `user.${col}`))
        }
      }

      // 检查account表结构
      if (existingTables.includes('account')) {
        const accountColumns = await this.getTableColumns('account')
        const requiredAccountColumns = [
          'id', 'accountId', 'providerId', 'userId', 'password',
          'accessToken', 'refreshToken', 'expiresAt', 'createdAt', 'updatedAt'
        ]
        
        const missingAccountColumns = requiredAccountColumns.filter(col => 
          !accountColumns.some(existing => existing.column_name === col)
        )
        
        if (missingAccountColumns.length > 0) {
          result.isValid = false
          result.missingColumns.push(...missingAccountColumns.map(col => `account.${col}`))
        }
      }

      // 检查是否有旧的users表需要迁移
      if (existingTables.includes('users') && !existingTables.includes('user')) {
        result.warnings.push('发现旧的users表，需要迁移到新的user表结构')
        result.requiredMigrations.push('migrate_users_to_user_table')
      }

      logger.info('Database schema validation completed', undefined, result, LogCategory.USER)
      
      return result
    } catch (error) {
      logger.error('Database schema validation failed', error as Error, {}, LogCategory.USER)
      
      return {
        isValid: false,
        missingTables: [],
        missingColumns: [],
        requiredMigrations: [],
        warnings: [`Schema validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      }
    }
  }

  /**
   * 执行认证系统所需的数据库迁移
   */
  async executeAuthMigrations(): Promise<DatabaseMigrationResult> {
    const result: DatabaseMigrationResult = {
      success: true,
      migrationsExecuted: 0,
      errors: [],
      newTablesCreated: [],
      existingTablesModified: []
    }

    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      // 首先验证模式
      const validation = await this.validateSchema()
      
      // 创建user_id_mapping表（如果不存在）
      if (validation.missingTables.includes('user_id_mapping')) {
        await this.createUserIdMappingTable(client)
        result.newTablesCreated.push('user_id_mapping')
        result.migrationsExecuted++
      }

      // 确保user表存在并具有正确结构
      if (validation.missingTables.includes('user')) {
        await this.createUserTable(client)
        result.newTablesCreated.push('user')
        result.migrationsExecuted++
      } else if (validation.missingColumns.some(col => col.startsWith('user.'))) {
        await this.updateUserTable(client)
        result.existingTablesModified.push('user')
        result.migrationsExecuted++
      }

      // 确保account表存在并具有正确结构
      if (validation.missingTables.includes('account')) {
        await this.createAccountTable(client)
        result.newTablesCreated.push('account')
        result.migrationsExecuted++
      } else if (validation.missingColumns.some(col => col.startsWith('account.'))) {
        await this.updateAccountTable(client)
        result.existingTablesModified.push('account')
        result.migrationsExecuted++
      }

      // 迁移旧users表数据（如果存在）
      const existingTables = await this.getExistingTables()
      if (existingTables.includes('users') && existingTables.includes('user')) {
        const migrated = await this.migrateUsersData(client)
        if (migrated > 0) {
          result.migrationsExecuted++
          logger.info(`Migrated ${migrated} users from old table`, undefined, {}, LogCategory.USER)
        }
      }

      await client.query('COMMIT')
      
      logger.info('Authentication database migrations completed', undefined, result, LogCategory.USER)
      
    } catch (error) {
      await client.query('ROLLBACK')
      result.success = false
      result.errors.push(error instanceof Error ? error.message : 'Unknown migration error')
      
      logger.error('Authentication database migrations failed', error as Error, {}, LogCategory.USER)
    } finally {
      client.release()
    }

    return result
  }

  /**
   * 创建用户ID映射表
   */
  private async createUserIdMappingTable(client: any): Promise<void> {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS user_id_mapping (
        numeric_id SERIAL PRIMARY KEY,
        string_id UUID NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_user_id_mapping_string_id ON user_id_mapping(string_id);
      CREATE INDEX IF NOT EXISTS idx_user_id_mapping_numeric_id ON user_id_mapping(numeric_id);

      COMMENT ON TABLE user_id_mapping IS '用户ID映射表，连接新认证系统和旧配额系统';
    `
    
    await client.query(createTableSQL)
  }

  /**
   * 创建新的用户表
   */
  private async createUserTable(client: any): Promise<void> {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS "user" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        "emailVerified" BOOLEAN DEFAULT FALSE,
        image TEXT,
        plan VARCHAR(50) DEFAULT 'free',
        "monthlyQuota" INTEGER DEFAULT 3,
        "usedQuota" INTEGER DEFAULT 0,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_user_email ON "user"(email);
      CREATE INDEX IF NOT EXISTS idx_user_plan ON "user"(plan);

      COMMENT ON TABLE "user" IS '新认证系统用户表';
    `
    
    await client.query(createTableSQL)
  }

  /**
   * 更新用户表结构
   */
  private async updateUserTable(client: any): Promise<void> {
    const alterTableSQL = `
      ALTER TABLE "user" 
      ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'free',
      ADD COLUMN IF NOT EXISTS "monthlyQuota" INTEGER DEFAULT 3,
      ADD COLUMN IF NOT EXISTS "usedQuota" INTEGER DEFAULT 0;

      CREATE INDEX IF NOT EXISTS idx_user_plan ON "user"(plan);
    `
    
    await client.query(alterTableSQL)
  }

  /**
   * 创建认证账户表
   */
  private async createAccountTable(client: any): Promise<void> {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS account (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "accountId" VARCHAR(255) NOT NULL,
        "providerId" VARCHAR(50) NOT NULL,
        "userId" UUID NOT NULL,
        password TEXT,
        "accessToken" TEXT,
        "refreshToken" TEXT,
        "expiresAt" TIMESTAMP,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE,
        UNIQUE("accountId", "providerId")
      );

      CREATE INDEX IF NOT EXISTS idx_account_user_id ON account("userId");
      CREATE INDEX IF NOT EXISTS idx_account_provider ON account("providerId");

      COMMENT ON TABLE account IS '认证账户表，支持多种登录方式';
    `
    
    await client.query(createTableSQL)
  }

  /**
   * 更新认证账户表结构
   */
  private async updateAccountTable(client: any): Promise<void> {
    // 检查并添加缺失的列
    const alterTableSQL = `
      ALTER TABLE account 
      ADD COLUMN IF NOT EXISTS "accessToken" TEXT,
      ADD COLUMN IF NOT EXISTS "refreshToken" TEXT,
      ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP;
    `
    
    await client.query(alterTableSQL)
  }

  /**
   * 迁移旧users表数据到新user表
   */
  private async migrateUsersData(client: any): Promise<number> {
    try {
      // 检查是否已经迁移过
      const existingMigration = await client.query(`
        SELECT COUNT(*) as count FROM "user" 
        WHERE email IN (SELECT email FROM users)
      `)
      
      if (parseInt(existingMigration.rows[0].count) > 0) {
        logger.info('Users data already migrated, skipping', undefined, {}, LogCategory.USER)
        return 0
      }

      // 迁移用户数据
      const migrationSQL = `
        INSERT INTO "user" (id, email, name, "emailVerified", "createdAt", "updatedAt")
        SELECT 
          gen_random_uuid(),
          email,
          name,
          false,
          "createdAt",
          CURRENT_TIMESTAMP
        FROM users
        WHERE email NOT IN (SELECT email FROM "user")
        ON CONFLICT (email) DO NOTHING
      `
      
      const result = await client.query(migrationSQL)
      const migratedCount = result.rowCount || 0

      // 为迁移的用户创建凭据记录（如果有密码）
      if (migratedCount > 0) {
        const credentialMigrationSQL = `
          INSERT INTO account (id, "accountId", "providerId", "userId", password)
          SELECT 
            gen_random_uuid(),
            u.email,
            'credential',
            nu.id,
            u.password_hash
          FROM users u
          JOIN "user" nu ON u.email = nu.email
          WHERE u.password_hash IS NOT NULL
          ON CONFLICT ("accountId", "providerId") DO NOTHING
        `
        
        await client.query(credentialMigrationSQL)
      }

      logger.info('Users data migration completed', undefined, { migratedCount }, LogCategory.USER)
      return migratedCount
      
    } catch (error) {
      logger.error('Users data migration failed', error as Error, {}, LogCategory.USER)
      throw error
    }
  }

  /**
   * 获取现有表列表
   */
  private async getExistingTables(): Promise<string[]> {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `)
    
    return result.rows.map(row => row.table_name)
  }

  /**
   * 获取表的列信息
   */
  private async getTableColumns(tableName: string): Promise<any[]> {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `, [tableName])
    
    return result.rows
  }

  /**
   * 验证认证系统集成状态
   */
  async validateIntegration(): Promise<{
    isValid: boolean
    userCount: number
    accountCount: number
    mappingCount: number
    issues: string[]
  }> {
    const issues: string[] = []
    
    try {
      // 统计用户数量
      const userResult = await pool.query('SELECT COUNT(*) as count FROM "user"')
      const userCount = parseInt(userResult.rows[0].count)

      // 统计账户数量
      const accountResult = await pool.query('SELECT COUNT(*) as count FROM account')
      const accountCount = parseInt(accountResult.rows[0].count)

      // 统计映射数量
      const mappingResult = await pool.query('SELECT COUNT(*) as count FROM user_id_mapping')
      const mappingCount = parseInt(mappingResult.rows[0].count)

      // 检查数据一致性
      const orphanAccounts = await pool.query(`
        SELECT COUNT(*) as count FROM account a
        LEFT JOIN "user" u ON a."userId" = u.id
        WHERE u.id IS NULL
      `)
      
      if (parseInt(orphanAccounts.rows[0].count) > 0) {
        issues.push(`Found ${orphanAccounts.rows[0].count} orphaned account records`)
      }

      // 检查映射一致性
      const orphanMappings = await pool.query(`
        SELECT COUNT(*) as count FROM user_id_mapping m
        LEFT JOIN "user" u ON m.string_id = u.id
        WHERE u.id IS NULL
      `)
      
      if (parseInt(orphanMappings.rows[0].count) > 0) {
        issues.push(`Found ${orphanMappings.rows[0].count} orphaned mapping records`)
      }

      const isValid = issues.length === 0

      logger.info('Authentication integration validation completed', undefined, {
        isValid, userCount, accountCount, mappingCount, issueCount: issues.length
      }, LogCategory.USER)

      return {
        isValid,
        userCount,
        accountCount,
        mappingCount,
        issues
      }
    } catch (error) {
      logger.error('Authentication integration validation failed', error as Error, {}, LogCategory.USER)
      
      return {
        isValid: false,
        userCount: 0,
        accountCount: 0,
        mappingCount: 0,
        issues: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      }
    }
  }

  /**
   * 清理数据库中的不一致数据
   */
  async cleanupInconsistentData(): Promise<{
    success: boolean
    orphanAccountsRemoved: number
    orphanMappingsRemoved: number
    errors: string[]
  }> {
    const result = {
      success: true,
      orphanAccountsRemoved: 0,
      orphanMappingsRemoved: 0,
      errors: [] as string[]
    }

    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      // 清理孤立的账户记录
      const orphanAccountsResult = await client.query(`
        DELETE FROM account 
        WHERE "userId" NOT IN (SELECT id FROM "user")
      `)
      result.orphanAccountsRemoved = orphanAccountsResult.rowCount || 0

      // 清理孤立的映射记录
      const orphanMappingsResult = await client.query(`
        DELETE FROM user_id_mapping 
        WHERE string_id NOT IN (SELECT id FROM "user")
      `)
      result.orphanMappingsRemoved = orphanMappingsResult.rowCount || 0

      await client.query('COMMIT')
      
      logger.info('Database cleanup completed', undefined, result, LogCategory.USER)
      
    } catch (error) {
      await client.query('ROLLBACK')
      result.success = false
      result.errors.push(error instanceof Error ? error.message : 'Unknown cleanup error')
      
      logger.error('Database cleanup failed', error as Error, {}, LogCategory.USER)
    } finally {
      client.release()
    }

    return result
  }

  /**
   * 获取迁移状态
   */
  async getMigrationStatus(): Promise<MigrationStatus[]> {
    try {
      const result = await pool.query(`
        SELECT filename as migration_name, executed_at
        FROM schema_migrations
        WHERE filename LIKE '%auth%' OR filename LIKE '%user%'
        ORDER BY executed_at DESC
      `)

      const authMigrations = [
        '007_create_user_quota_system.sql',
        '008_update_quota_plans.sql',
        '012_create_user_id_mapping.sql'
      ]

      return authMigrations.map(migration => {
        const executed = result.rows.find(row => row.migration_name === migration)
        return {
          migrationName: migration,
          status: executed ? 'completed' : 'pending',
          executedAt: executed?.executed_at
        }
      })
    } catch (error) {
      logger.error('Failed to get migration status', error as Error, {}, LogCategory.USER)
      return []
    }
  }
}

export const databaseAdapter = new DatabaseAdapter()