#!/usr/bin/env ts-node

/**
 * 用户计划管理CLI工具
 * 提供命令行方式管理用户计划
 */

import { userPlanManagementService } from '../services/userPlanManagementService'
import { userService } from '../services/userService'

async function showHelp() {
  console.log(`
用户计划管理工具
================

使用方法:
  npm run plan:upgrade <email> <plan> <reason>     - 升级单个用户
  npm run plan:batch <emails...> <plan> <reason>   - 批量升级用户
  npm run plan:stats                               - 查看计划统计
  npm run plan:history <email>                     - 查看用户历史
  npm run plan:list                               - 查看所有变更记录

计划类型: free, basic, pro, enterprise

示例:
  npm run plan:upgrade user@example.com pro "VIP客户升级"
  npm run plan:batch user1@example.com,user2@example.com pro "批量VIP升级"
  npm run plan:stats
  npm run plan:history user@example.com
`)
}

async function upgradeUser(email: string, plan: string, reason: string) {
  try {
    console.log(`正在升级用户 ${email} 到 ${plan} 计划...`)
    
    const result = await userPlanManagementService.upgradeUserPlan(email, plan, reason)
    
    if (result.success) {
      console.log(`✅ 升级成功!`)
      console.log(`   用户: ${result.email}`)
      console.log(`   从 ${result.oldPlan} 升级到 ${result.newPlan}`)
      console.log(`   原因: ${reason}`)
    } else {
      console.log(`❌ 升级失败: ${result.message}`)
      if (result.error) {
        console.log(`   错误: ${result.error}`)
      }
    }
  } catch (error) {
    console.error(`❌ 升级过程中发生错误:`, error instanceof Error ? error.message : error)
  }
}

async function batchUpgrade(emails: string[], plan: string, reason: string) {
  try {
    console.log(`正在批量升级 ${emails.length} 个用户到 ${plan} 计划...`)
    
    const result = await userPlanManagementService.batchUpgradeUsers(emails, plan, reason)
    
    console.log(`\n批量升级完成:`)
    console.log(`✅ 成功: ${result.successCount}`)
    console.log(`❌ 失败: ${result.failureCount}`)
    console.log(`📊 总计: ${result.totalUsers}`)
    
    if (result.failureCount > 0) {
      console.log(`\n失败详情:`)
      result.results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`  - ${r.email}: ${r.message}`)
        })
    }
    
    if (result.errors.length > 0) {
      console.log(`\n错误列表:`)
      result.errors.forEach(error => console.log(`  - ${error}`))
    }
  } catch (error) {
    console.error(`❌ 批量升级过程中发生错误:`, error instanceof Error ? error.message : error)
  }
}

async function showStats() {
  try {
    console.log(`正在获取计划统计信息...`)
    
    const stats = await userPlanManagementService.getPlanStatistics()
    
    console.log(`\n计划分布统计:`)
    console.log(`================`)
    stats.planDistribution.forEach((plan: any) => {
      console.log(`${plan.plan.padEnd(10)} : ${plan.user_count} 用户 (最近30天新增: ${plan.new_users_30d})`)
    })
    console.log(`================`)
    console.log(`总用户数: ${stats.totalUsers}`)
    console.log(`最近30天新用户: ${stats.totalNewUsers30d}`)
  } catch (error) {
    console.error(`❌ 获取统计信息失败:`, error instanceof Error ? error.message : error)
  }
}

async function showUserHistory(email: string) {
  try {
    console.log(`正在获取用户 ${email} 的计划变更历史...`)
    
    // 先获取用户ID
    const user = await userService.findUserByEmail(email)
    if (!user) {
      console.log(`❌ 用户 ${email} 不存在`)
      return
    }
    
    const history = await userPlanManagementService.getUserPlanHistory(user.id)
    
    console.log(`\n用户 ${email} 的计划变更历史:`)
    console.log(`=====================================`)
    
    if (history.length === 0) {
      console.log(`暂无计划变更记录`)
      return
    }
    
    history.forEach(record => {
      console.log(`${record.createdAt.toISOString().split('T')[0]} | ${record.oldPlan} → ${record.newPlan}`)
      console.log(`  原因: ${record.reason}`)
      if (record.operatorEmail) {
        console.log(`  操作员: ${record.operatorEmail}`)
      }
      console.log(``)
    })
  } catch (error) {
    console.error(`❌ 获取用户历史失败:`, error instanceof Error ? error.message : error)
  }
}

async function listAllChanges() {
  try {
    console.log(`正在获取所有计划变更记录...`)
    
    const changes = await userPlanManagementService.getAllPlanChanges(50)
    
    console.log(`\n最近的计划变更记录 (最多50条):`)
    console.log(`================================================`)
    
    if (changes.length === 0) {
      console.log(`暂无计划变更记录`)
      return
    }
    
    changes.forEach(record => {
      console.log(`${record.createdAt.toISOString().split('T')[0]} | ${record.email}`)
      console.log(`  ${record.oldPlan} → ${record.newPlan}`)
      console.log(`  原因: ${record.reason}`)
      if (record.operatorEmail) {
        console.log(`  操作员: ${record.operatorEmail}`)
      }
      console.log(``)
    })
  } catch (error) {
    console.error(`❌ 获取变更记录失败:`, error instanceof Error ? error.message : error)
  }
}

async function main() {
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    await showHelp()
    process.exit(0)
  }
  
  const command = args[0]
  
  try {
    switch (command) {
      case 'upgrade':
        if (args.length < 4) {
          console.log(`❌ 参数不足。使用方法: upgrade <email> <plan> <reason>`)
          process.exit(1)
        }
        await upgradeUser(args[1], args[2], args.slice(3).join(' '))
        break
        
      case 'batch':
        if (args.length < 4) {
          console.log(`❌ 参数不足。使用方法: batch <emails> <plan> <reason>`)
          process.exit(1)
        }
        const emails = args[1].split(',').map(e => e.trim()).filter(e => e)
        await batchUpgrade(emails, args[2], args.slice(3).join(' '))
        break
        
      case 'stats':
        await showStats()
        break
        
      case 'history':
        if (args.length < 2) {
          console.log(`❌ 参数不足。使用方法: history <email>`)
          process.exit(1)
        }
        await showUserHistory(args[1])
        break
        
      case 'list':
        await listAllChanges()
        break
        
      default:
        console.log(`❌ 未知命令: ${command}`)
        await showHelp()
        process.exit(1)
    }
  } catch (error) {
    console.error(`❌ 执行命令失败:`, error instanceof Error ? error.message : error)
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