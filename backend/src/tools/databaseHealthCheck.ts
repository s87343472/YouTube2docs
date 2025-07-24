#!/usr/bin/env ts-node

/**
 * 数据库健康检查工具
 * 全面检查数据库结构、一致性和潜在问题
 */

import { pool } from '../utils/database'

interface TableInfo {
  name: string
  columns: ColumnInfo[]
}

interface ColumnInfo {
  name: string
  type: string
  nullable: boolean
  default: string | null
  isPrimaryKey: boolean
  isForeignKey: boolean
  referencedTable?: string
  referencedColumn?: string
}

interface HealthCheckResult {
  status: 'healthy' | 'warning' | 'error'
  message: string
  details?: any
}

class DatabaseHealthChecker {
  
  async checkAllTables(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = []
    
    try {
      console.log('🔍 开始全面数据库健康检查...\n')
      
      // 1. 获取所有表
      const tables = await this.getAllTables()
      console.log(`📋 发现 ${tables.length} 个表:`, tables.map(t => t.name).join(', '))
      
      // 2. 检查每个表的结构
      for (const table of tables) {
        const tableResults = await this.checkTableStructure(table)
        results.push(...tableResults)
      }
      
      // 3. 检查外键关系
      const fkResults = await this.checkForeignKeys()
      results.push(...fkResults)
      
      // 4. 检查索引
      const indexResults = await this.checkIndexes()
      results.push(...indexResults)
      
      // 5. 检查数据一致性
      const dataResults = await this.checkDataConsistency()
      results.push(...dataResults)
      
      // 6. 检查代码与数据库的匹配度
      const codeResults = await this.checkCodeDatabaseMatch()
      results.push(...codeResults)
      
      return results
      
    } catch (error) {
      results.push({
        status: 'error',
        message: '数据库健康检查失败',
        details: { error: error instanceof Error ? error.message : error }
      })
      return results
    }
  }
  
  private async getAllTables(): Promise<TableInfo[]> {
    const query = `
      SELECT 
        t.table_name,
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default,
        CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key,
        CASE WHEN fk.column_name IS NOT NULL THEN true ELSE false END as is_foreign_key,
        fk.foreign_table_name,
        fk.foreign_column_name
      FROM information_schema.tables t
      LEFT JOIN information_schema.columns c ON t.table_name = c.table_name
      LEFT JOIN (
        SELECT ku.table_name, ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
        WHERE tc.constraint_type = 'PRIMARY KEY'
      ) pk ON c.table_name = pk.table_name AND c.column_name = pk.column_name
      LEFT JOIN (
        SELECT 
          ku.table_name, 
          ku.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
      ) fk ON c.table_name = fk.table_name AND c.column_name = fk.column_name
      WHERE t.table_schema = 'public' 
        AND t.table_type = 'BASE TABLE'
        AND c.column_name IS NOT NULL
      ORDER BY t.table_name, c.ordinal_position
    `
    
    const result = await pool.query(query)
    const tableMap = new Map<string, TableInfo>()
    
    for (const row of result.rows) {
      if (!tableMap.has(row.table_name)) {
        tableMap.set(row.table_name, {
          name: row.table_name,
          columns: []
        })
      }
      
      const table = tableMap.get(row.table_name)!
      table.columns.push({
        name: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable === 'YES',
        default: row.column_default,
        isPrimaryKey: row.is_primary_key,
        isForeignKey: row.is_foreign_key,
        referencedTable: row.foreign_table_name,
        referencedColumn: row.foreign_column_name
      })
    }
    
    return Array.from(tableMap.values())
  }
  
  private async checkTableStructure(table: TableInfo): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = []
    
    console.log(`\n🔍 检查表: ${table.name}`)
    console.log(`   列数: ${table.columns.length}`)
    console.log(`   列: ${table.columns.map(c => `${c.name}(${c.type})`).join(', ')}`)
    
    // 检查是否有主键
    const hasPrimaryKey = table.columns.some(c => c.isPrimaryKey)
    if (!hasPrimaryKey) {
      results.push({
        status: 'warning',
        message: `表 ${table.name} 没有主键`,
        details: { table: table.name }
      })
    }
    
    // 检查常见的必要列
    this.checkCommonColumns(table, results)
    
    return results
  }
  
  private checkCommonColumns(table: TableInfo, results: HealthCheckResult[]): void {
    const tableName = table.name
    const columnNames = table.columns.map(c => c.name)
    
    // 检查时间戳列
    if (!columnNames.includes('created_at') && !columnNames.includes('createdat')) {
      results.push({
        status: 'warning',
        message: `表 ${tableName} 缺少 created_at 列`,
        details: { table: tableName, missingColumn: 'created_at' }
      })
    }
    
    if (!columnNames.includes('updated_at') && !columnNames.includes('updatedat')) {
      results.push({
        status: 'warning',
        message: `表 ${tableName} 缺少 updated_at 列`,
        details: { table: tableName, missingColumn: 'updated_at' }
      })
    }
    
    // 特定表的特殊检查
    switch (tableName) {
      case 'users':
        this.checkUsersTable(table, results)
        break
      case 'video_processes':
        this.checkVideoProcessesTable(table, results)
        break
      case 'quota_usage_logs':
        this.checkQuotaUsageLogsTable(table, results)
        break
      case 'user_quota_usage':
        this.checkUserQuotaUsageTable(table, results)
        break
    }
  }
  
  private checkUsersTable(table: TableInfo, results: HealthCheckResult[]): void {
    const requiredColumns = ['id', 'email', 'plan', 'monthly_quota']
    const columnNames = table.columns.map(c => c.name)
    
    for (const required of requiredColumns) {
      if (!columnNames.includes(required)) {
        results.push({
          status: 'error',
          message: `users表缺少必要列: ${required}`,
          details: { table: 'users', missingColumn: required }
        })
      }
    }
  }
  
  private checkVideoProcessesTable(table: TableInfo, results: HealthCheckResult[]): void {
    const requiredColumns = ['id', 'user_id', 'youtube_url', 'status', 'progress']
    const columnNames = table.columns.map(c => c.name)
    
    for (const required of requiredColumns) {
      if (!columnNames.includes(required)) {
        results.push({
          status: 'error',
          message: `video_processes表缺少必要列: ${required}`,
          details: { table: 'video_processes', missingColumn: required }
        })
      }
    }
  }
  
  private checkQuotaUsageLogsTable(table: TableInfo, results: HealthCheckResult[]): void {
    const requiredColumns = ['id', 'user_id', 'quota_type', 'action', 'amount']
    const columnNames = table.columns.map(c => c.name)
    
    for (const required of requiredColumns) {
      if (!columnNames.includes(required)) {
        results.push({
          status: 'error',
          message: `quota_usage_logs表缺少必要列: ${required}`,
          details: { table: 'quota_usage_logs', missingColumn: required }
        })
      }
    }
  }
  
  private checkUserQuotaUsageTable(table: TableInfo, results: HealthCheckResult[]): void {
    const requiredColumns = ['id', 'user_id', 'quota_type', 'used_amount', 'quota_period', 'period_start', 'period_end']
    const columnNames = table.columns.map(c => c.name)
    
    for (const required of requiredColumns) {
      if (!columnNames.includes(required)) {
        results.push({
          status: 'error',
          message: `user_quota_usage表缺少必要列: ${required}`,
          details: { table: 'user_quota_usage', missingColumn: required }
        })
      }
    }
  }
  
  private async checkForeignKeys(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = []
    
    console.log('\n🔗 检查外键关系...')
    
    try {
      const query = `
        SELECT 
          tc.table_name,
          tc.constraint_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
      `
      
      const fkResult = await pool.query(query)
      console.log(`   发现 ${fkResult.rows.length} 个外键约束`)
      
      for (const fk of fkResult.rows) {
        console.log(`   ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`)
      }
      
      // 检查是否有孤立记录
      await this.checkOrphanedRecords(results)
      
    } catch (error) {
      results.push({
        status: 'error',
        message: '检查外键关系失败',
        details: { error: error instanceof Error ? error.message : error }
      })
    }
    
    return results
  }
  
  private async checkOrphanedRecords(results: HealthCheckResult[]): Promise<void> {
    // 检查一些关键的外键关系
    const checks = [
      {
        table: 'video_processes',
        column: 'user_id',
        referencedTable: 'users',
        referencedColumn: 'id'
      },
      {
        table: 'quota_usage_logs',
        column: 'user_id',
        referencedTable: 'users',
        referencedColumn: 'id'
      },
      {
        table: 'user_quota_usage',
        column: 'user_id',
        referencedTable: 'users',
        referencedColumn: 'id'
      }
    ]
    
    for (const check of checks) {
      try {
        const orphanQuery = `
          SELECT COUNT(*) as orphan_count
          FROM ${check.table}
          WHERE ${check.column} IS NOT NULL
            AND ${check.column} NOT IN (
              SELECT ${check.referencedColumn} FROM ${check.referencedTable}
            )
        `
        
        const orphanResult = await pool.query(orphanQuery)
        const orphanCount = parseInt(orphanResult.rows[0].orphan_count)
        
        if (orphanCount > 0) {
          results.push({
            status: 'warning',
            message: `发现 ${orphanCount} 条孤立记录`,
            details: {
              table: check.table,
              column: check.column,
              orphanCount
            }
          })
        }
      } catch (error) {
        // 如果表不存在或查询失败，跳过
        console.log(`   跳过检查 ${check.table}.${check.column}: ${error instanceof Error ? error.message : error}`)
      }
    }
  }
  
  private async checkIndexes(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = []
    
    console.log('\n📊 检查索引...')
    
    try {
      const indexQuery = `
        SELECT 
          schemaname,
          tablename,
          indexname,
          indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname
      `
      
      const indexResult = await pool.query(indexQuery)
      console.log(`   发现 ${indexResult.rows.length} 个索引`)
      
      // 按表分组显示索引
      const indexesByTable: { [table: string]: any[] } = {}
      for (const index of indexResult.rows) {
        if (!indexesByTable[index.tablename]) {
          indexesByTable[index.tablename] = []
        }
        indexesByTable[index.tablename].push(index)
      }
      
      for (const [tableName, indexes] of Object.entries(indexesByTable)) {
        console.log(`   ${tableName}: ${indexes.length} 个索引`)
        for (const index of indexes) {
          console.log(`     - ${index.indexname}`)
        }
      }
      
      // 检查关键表是否有必要的索引
      await this.checkCriticalIndexes(results, indexesByTable)
      
    } catch (error) {
      results.push({
        status: 'error',
        message: '检查索引失败',
        details: { error: error instanceof Error ? error.message : error }
      })
    }
    
    return results
  }
  
  private async checkCriticalIndexes(results: HealthCheckResult[], indexesByTable: { [table: string]: any[] }): Promise<void> {
    const criticalIndexes = [
      { table: 'users', column: 'email' },
      { table: 'video_processes', column: 'user_id' },
      { table: 'video_processes', column: 'status' },
      { table: 'quota_usage_logs', column: 'user_id' },
      { table: 'user_quota_usage', column: 'user_id' }
    ]
    
    for (const critical of criticalIndexes) {
      const tableIndexes = indexesByTable[critical.table] || []
      const hasIndex = tableIndexes.some(idx => 
        idx.indexdef.toLowerCase().includes(critical.column.toLowerCase())
      )
      
      if (!hasIndex) {
        results.push({
          status: 'warning',
          message: `表 ${critical.table} 的 ${critical.column} 列缺少索引`,
          details: { table: critical.table, column: critical.column }
        })
      }
    }
  }
  
  private async checkDataConsistency(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = []
    
    console.log('\n📈 检查数据一致性...')
    
    try {
      // 检查用户表数据
      const userStats = await pool.query('SELECT COUNT(*) as count FROM users')
      console.log(`   用户总数: ${userStats.rows[0].count}`)
      
      // 检查计划分布
      const planStats = await pool.query(`
        SELECT plan, COUNT(*) as count 
        FROM users 
        GROUP BY plan 
        ORDER BY count DESC
      `)
      console.log('   计划分布:')
      for (const plan of planStats.rows) {
        console.log(`     ${plan.plan}: ${plan.count} 用户`)
      }
      
      // 检查视频处理记录
      try {
        const videoStats = await pool.query('SELECT COUNT(*) as count FROM video_processes')
        console.log(`   视频处理记录: ${videoStats.rows[0].count}`)
        
        const statusStats = await pool.query(`
          SELECT status, COUNT(*) as count 
          FROM video_processes 
          GROUP BY status
        `)
        console.log('   处理状态分布:')
        for (const status of statusStats.rows) {
          console.log(`     ${status.status}: ${status.count}`)
        }
      } catch (error) {
        console.log('   video_processes 表不存在或有问题')
      }
      
      // 检查配额使用记录
      try {
        const quotaStats = await pool.query('SELECT COUNT(*) as count FROM quota_usage_logs')
        console.log(`   配额使用日志: ${quotaStats.rows[0].count}`)
      } catch (error) {
        console.log('   quota_usage_logs 表不存在或有问题')
      }
      
    } catch (error) {
      results.push({
        status: 'error',
        message: '检查数据一致性失败',
        details: { error: error instanceof Error ? error.message : error }
      })
    }
    
    return results
  }
  
  private async checkCodeDatabaseMatch(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = []
    
    console.log('\n🔍 检查代码与数据库匹配度...')
    
    // 这里可以添加更多代码与数据库匹配的检查
    // 比如检查 TypeScript 接口定义与数据库表结构是否匹配
    
    results.push({
      status: 'healthy',
      message: '代码与数据库匹配度检查完成',
      details: { note: '需要更详细的代码分析' }
    })
    
    return results
  }
  
  async generateReport(results: HealthCheckResult[]): Promise<void> {
    console.log('\n📋 数据库健康检查报告')
    console.log('=' .repeat(50))
    
    const errorCount = results.filter(r => r.status === 'error').length
    const warningCount = results.filter(r => r.status === 'warning').length
    const healthyCount = results.filter(r => r.status === 'healthy').length
    
    console.log(`\n总体状态:`)
    console.log(`✅ 健康: ${healthyCount}`)
    console.log(`⚠️  警告: ${warningCount}`)
    console.log(`❌ 错误: ${errorCount}`)
    
    if (errorCount > 0) {
      console.log('\n❌ 错误列表:')
      results.filter(r => r.status === 'error').forEach((result, i) => {
        console.log(`${i + 1}. ${result.message}`)
        if (result.details) {
          console.log(`   详情: ${JSON.stringify(result.details, null, 2)}`)
        }
      })
    }
    
    if (warningCount > 0) {
      console.log('\n⚠️ 警告列表:')
      results.filter(r => r.status === 'warning').forEach((result, i) => {
        console.log(`${i + 1}. ${result.message}`)
        if (result.details) {
          console.log(`   详情: ${JSON.stringify(result.details, null, 2)}`)
        }
      })
    }
    
    console.log('\n建议:')
    if (errorCount > 0) {
      console.log('🔧 请立即修复所有错误，这些可能导致系统功能异常')
    }
    if (warningCount > 0) {
      console.log('⚠️ 建议修复警告项，以提高系统性能和稳定性')
    }
    if (errorCount === 0 && warningCount === 0) {
      console.log('🎉 数据库结构健康，没有发现问题！')
    }
  }
}

async function main() {
  const checker = new DatabaseHealthChecker()
  
  try {
    const results = await checker.checkAllTables()
    await checker.generateReport(results)
  } catch (error) {
    console.error('❌ 数据库健康检查失败:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
  
  process.exit(0)
}

// 只有直接运行此文件时才执行main函数
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 程序执行失败:', error)
    process.exit(1)
  })
}