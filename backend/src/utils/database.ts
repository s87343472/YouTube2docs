import { pool } from '../config/database'
import fs from 'fs'
import path from 'path'

export class DatabaseManager {
  /**
   * 运行数据库迁移
   */
  static async runMigrations() {
    const migrationsDir = path.join(process.cwd(), '../database/migrations')
    
    try {
      // 创建migrations表来跟踪已执行的迁移
      await pool.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id SERIAL PRIMARY KEY,
          filename VARCHAR(255) UNIQUE NOT NULL,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)

      // 获取所有迁移文件
      const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort()

      // 获取已执行的迁移
      const { rows: executedMigrations } = await pool.query(
        'SELECT filename FROM schema_migrations'
      )
      const executed = executedMigrations.map(row => row.filename)

      // 执行未执行的迁移
      for (const file of migrationFiles) {
        if (!executed.includes(file)) {
          console.log(`Running migration: ${file}`)
          
          const migrationPath = path.join(migrationsDir, file)
          const migrationSql = fs.readFileSync(migrationPath, 'utf8')
          
          await pool.query(migrationSql)
          await pool.query(
            'INSERT INTO schema_migrations (filename) VALUES ($1)',
            [file]
          )
          
          console.log(`✅ Migration ${file} completed`)
        }
      }

      console.log('🚀 All migrations completed successfully')
    } catch (error) {
      console.error('❌ Migration failed:', error)
      throw error
    }
  }

  /**
   * 运行种子数据
   */
  static async runSeeds() {
    const seedsDir = path.join(process.cwd(), '../database/seeds')
    
    try {
      // 检查是否已有种子数据
      const { rows } = await pool.query('SELECT COUNT(*) FROM users')
      if (parseInt(rows[0].count) > 0) {
        console.log('⚠️  Database already contains data, skipping seeds')
        return
      }

      // 获取所有种子文件
      const seedFiles = fs.readdirSync(seedsDir)
        .filter(file => file.endsWith('.sql'))
        .sort()

      // 执行种子文件
      for (const file of seedFiles) {
        console.log(`Running seed: ${file}`)
        
        const seedPath = path.join(seedsDir, file)
        const seedSql = fs.readFileSync(seedPath, 'utf8')
        
        await pool.query(seedSql)
        console.log(`✅ Seed ${file} completed`)
      }

      console.log('🌱 All seeds completed successfully')
    } catch (error) {
      console.error('❌ Seeding failed:', error)
      throw error
    }
  }

  /**
   * 重置数据库
   */
  static async resetDatabase() {
    try {
      console.log('🔄 Resetting database...')
      
      // 删除所有表
      await pool.query(`
        DROP SCHEMA public CASCADE;
        CREATE SCHEMA public;
        GRANT ALL ON SCHEMA public TO public;
      `)

      console.log('✅ Database reset completed')
    } catch (error) {
      console.error('❌ Database reset failed:', error)
      throw error
    }
  }

  /**
   * 检查数据库连接和基本功能
   */
  static async healthCheck() {
    try {
      // 基本连接测试
      const { rows } = await pool.query('SELECT NOW() as current_time, version() as pg_version')
      
      // 检查核心表是否存在
      const { rows: tables } = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      `)

      const expectedTables = ['users', 'video_processes', 'concepts', 'knowledge_graphs', 'study_cards']
      const existingTables = tables.map(t => t.table_name)
      const missingTables = expectedTables.filter(table => !existingTables.includes(table))

      return {
        status: 'healthy',
        timestamp: rows[0].current_time,
        postgresql_version: rows[0].pg_version,
        tables_count: existingTables.length,
        missing_tables: missingTables,
        all_tables_exist: missingTables.length === 0
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      }
    }
  }

  /**
   * 获取数据库统计信息
   */
  static async getStats() {
    try {
      const stats = {}

      // 用户统计
      const { rows: userStats } = await pool.query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(*) FILTER (WHERE plan = 'free') as free_users,
          COUNT(*) FILTER (WHERE plan = 'basic') as basic_users,
          COUNT(*) FILTER (WHERE plan = 'pro') as pro_users,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as new_users_today
        FROM users
      `)
      stats.users = userStats[0]

      // 视频处理统计
      const { rows: videoStats } = await pool.query(`
        SELECT 
          COUNT(*) as total_processes,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) FILTER (WHERE status = 'failed') as failed,
          COUNT(*) FILTER (WHERE status = 'processing') as processing,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as today_processes,
          AVG(processing_time) as avg_processing_time
        FROM video_processes
      `)
      stats.videos = videoStats[0]

      // 概念统计
      const { rows: conceptStats } = await pool.query(`
        SELECT 
          COUNT(*) as total_concepts,
          COUNT(DISTINCT category) as categories,
          AVG(usage_count) as avg_usage
        FROM concepts
      `)
      stats.concepts = conceptStats[0]

      return stats
    } catch (error) {
      throw new Error(`Stats query failed: ${error.message}`)
    }
  }
}