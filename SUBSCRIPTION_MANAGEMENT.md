# 📋 会员订阅管理完整业务逻辑

## 🎯 核心原则

### 💰 成本控制与定价策略
- **成本基础**: Groq Whisper Large v3 Turbo = $0.04/小时
- **毛利率保证**: 30%以上
- **获客策略**: 免费版作为获客工具，承担获客成本

### 🔄 订阅状态管理
- `active` - 当前有效订阅
- `pending` - 待生效订阅（降级/取消等）
- `expired` - 已过期订阅
- `cancelled` - 已取消订阅
- `refunded` - 已退款订阅

## 📊 套餐体系

| 套餐 | 价格/月 | 视频数量 | 单个时长 | 总时长 | 毛利率 |
|------|---------|----------|----------|--------|--------|
| 免费版 | $0 | 2个/月 | ≤30分钟 | ≤60分钟 | 获客成本 |
| Pro版 | $30 | 50个/月 | ≤60分钟 | ≤3000分钟 | 93.3% |
| Max版 | $100 | 200个/月 | ≤120分钟 | ≤24000分钟 | 84% |

## 🔄 业务场景详解

### 1. 🆙 升级 (Upgrade) - 即时生效

**触发条件**: 用户主动升级到更高价格套餐

**业务逻辑**:
```typescript
// 1. 计费方式 - 按比例补差价
const remainingDays = getCurrentPeriodRemainingDays()
const priceDiff = newPlan.price - currentPlan.price
const prorationAmount = (priceDiff * remainingDays) / 30

// 2. 配额变更 - 立即生效
- 立即获得新套餐配额限制
- 当月已用配额保留，按新限制重新计算

// 3. 订阅变更
- 取消当前订阅: status = 'cancelled'
- 创建新订阅: status = 'active', expires_at = 下月同日
```

**API接口**: `POST /api/quota/upgrade`

### 2. 🔽 降级 (Downgrade) - 周期末生效

**触发条件**: 用户主动降级到更低价格套餐

**业务逻辑**:
```typescript
// 1. 当前周期 - 继续享受高级服务
currentSubscription.auto_renew = false

// 2. 创建pending订阅
newSubscription = {
  plan_type: targetPlan,
  status: 'pending', 
  started_at: currentSubscription.expires_at + 1天
}

// 3. 到期处理 - 定时任务执行
- 当前订阅: status = 'expired'
- Pending订阅: status = 'active'
```

**API接口**: `POST /api/quota/downgrade`

### 3. ❌ 取消订阅 (Cancel) - 周期末失效

**触发条件**: 用户取消订阅，不再续费

**业务逻辑**:
```typescript
// 1. 当前周期 - 继续享受付费服务
currentSubscription.auto_renew = false

// 2. 预设免费版
freeSubscription = {
  plan_type: 'free',
  status: 'pending',
  started_at: currentSubscription.expires_at + 1天
}

// 3. 到期处理
- 当前订阅: status = 'expired'  
- 自动激活免费版订阅
```

**API接口**: `POST /api/quota/cancel`

### 4. 💳 退款 (Refund) - 立即失效

**触发条件**: 用户申请退款或客服处理退款

**业务逻辑**:
```typescript
// 1. 退款计算 - 按剩余天数比例
const remainingDays = Math.ceil((expiresAt - now) / (24*60*60*1000))
const refundAmount = (currentPlan.price * remainingDays) / 30

// 2. 立即失效
currentSubscription.status = 'refunded'

// 3. 立即降级
newSubscription = {
  plan_type: 'free',
  status: 'active'
}
```

**API接口**: `POST /api/quota/refund`

### 5. 🔄 自动续费 (Auto-Renew)

**触发条件**: 订阅到期且 `auto_renew = true`

**业务逻辑**:
```typescript
// 定时任务每小时检查到期订阅
if (subscription.auto_renew && subscription.expires_at <= now) {
  // 延长当前订阅30天
  subscription.expires_at = now + 30天
  
  // 触发支付流程 (集成支付系统时实现)
  processPayment(subscription.plan_type.price)
}
```

### 6. ⏰ 到期处理 (Expiration)

**触发条件**: 订阅到期且 `auto_renew = false`

**业务逻辑**:
```typescript
// 1. 当前订阅过期
currentSubscription.status = 'expired'

// 2. 检查pending订阅
const pendingPlan = getPendingSubscription(userId) || 'free'

// 3. 激活新订阅
newSubscription = {
  plan_type: pendingPlan,
  status: 'active'
}

// 4. 清理pending记录
deletePendingSubscriptions(userId)
```

## 🤖 自动化处理

### 定时任务 (CronService)

**订阅处理器** - 每小时执行:
- 检查到期订阅
- 处理自动续费
- 激活pending订阅
- 发送到期提醒

**每日清理** - 凌晨1点执行:
- 清理7天前的已读预警
- 清理3个月前的使用日志
- 生成日度统计报告

## 🛡️ 安全与防滥用

### 升级降级限制
```typescript
// 防止频繁操作
- 同一用户24小时内最多3次套餐变更
- 降级后7天内不允许再次降级

// 验证升级路径
const validUpgrades = {
  'free': ['pro', 'max'],
  'pro': ['max'],
  'max': [] // 已是最高套餐
}

// 验证降级路径  
const validDowngrades = {
  'max': ['pro', 'free'],
  'pro': ['free'],
  'free': [] // 已是最低套餐
}
```

### 配额保护
```typescript
// 升级时立即生效新配额
// 降级时当月已用配额超限的处理
if (usedQuota > newPlan.quota) {
  // 暂停新增处理，直到下月重置
  temporaryQuotaFreeze = true
}
```

## 📊 监控与分析

### 关键指标
- **转化率**: 免费→付费 转化率
- **流失率**: 取消订阅/降级率
- **ARPU**: 平均用户收入
- **LTV**: 用户生命周期价值

### 预警机制
- 配额使用率80%预警
- 配额用完限制提醒
- 订阅即将到期提醒
- 支付失败重试机制

## 🔌 API接口总览

| 接口 | 方法 | 说明 | 生效时间 |
|------|------|------|----------|
| `/quota/upgrade` | POST | 升级套餐 | 立即 |
| `/quota/downgrade` | POST | 降级套餐 | 周期末 |
| `/quota/cancel` | POST | 取消订阅 | 周期末 |
| `/quota/refund` | POST | 退款取消 | 立即 |
| `/quota/subscription` | GET | 订阅详情 | - |
| `/quota/usage` | GET | 配额使用 | - |
| `/quota/plans` | GET | 套餐列表 | - |

这套完整的会员管理系统确保了:
1. **用户体验**: 升级即时生效，降级有缓冲期
2. **商业保护**: 防止恶意操作，确保收入稳定
3. **成本控制**: 精确的配额管理，防止超支
4. **自动化**: 减少人工干预，提高运营效率