import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Card, 
  Button, 
  Descriptions, 
  Tag, 
  Modal, 
  message, 
  Spin, 
  Progress,
  Space,
  Divider,
  Alert
} from 'antd'
import { 
  CrownOutlined, 
  CalendarOutlined, 
  CreditCardOutlined,
  ExclamationCircleOutlined,
  UpOutlined as UpgradeOutlined,
  DownOutlined as DowngradeOutlined
} from '@ant-design/icons'
import { QuotaService } from '../services/quotaService'
import type { UserSubscription, QuotaPlan, QuotaUsage } from '../services/quotaService'
import './SubscriptionManagePage.css'

const { confirm } = Modal

const SubscriptionManagePage: React.FC = () => {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null)
  const [plan, setPlan] = useState<QuotaPlan | null>(null)
  const [usage, setUsage] = useState<QuotaUsage[]>([])
  const [loading, setLoading] = useState(true)
  const [allPlans, setAllPlans] = useState<QuotaPlan[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    loadSubscriptionData()
  }, [])

  const loadSubscriptionData = async () => {
    try {
      setLoading(true)
      
      // 并行加载数据
      const [subscriptionData, usageData, plansData] = await Promise.all([
        QuotaService.getUserSubscription(),
        QuotaService.getUserQuotaUsage(),
        QuotaService.getAllPlans()
      ])

      if (subscriptionData) {
        setSubscription(subscriptionData.subscription)
        setPlan(subscriptionData.plan)
      }
      
      setUsage(usageData)
      setAllPlans(plansData)
    } catch (error) {
      message.error('加载订阅信息失败')
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = () => {
    navigate('/pricing')
  }

  const handleDowngrade = () => {
    if (!subscription || !plan) return

    const lowerPlans = allPlans.filter(p => p.priceMonthly < plan.priceMonthly)
    if (lowerPlans.length === 0) {
      message.info('当前已是最低套餐')
      return
    }

    confirm({
      title: '确认降级套餐',
      icon: <ExclamationCircleOutlined />,
      content: '降级后将在当前订阅期结束后生效，期间仍可享受当前套餐权益。确认降级吗？',
      okText: '确认降级',
      cancelText: '取消',
      onOk: async () => {
        try {
          const targetPlan = lowerPlans[lowerPlans.length - 1] // 选择最高的低价套餐
          await QuotaService.downgradeSubscription(subscription.userId, targetPlan.planType)
          message.success('降级设置成功，将在当前订阅期结束后生效')
          loadSubscriptionData()
        } catch (error) {
          message.error('降级失败')
        }
      }
    })
  }

  const handleCancelSubscription = () => {
    if (!subscription) return

    confirm({
      title: '确认取消订阅',
      icon: <ExclamationCircleOutlined />,
      content: '取消订阅后将在当前订阅期结束后降为免费版，期间仍可享受当前套餐权益。确认取消吗？',
      okText: '确认取消',
      cancelText: '保留订阅',
      onOk: async () => {
        try {
          await QuotaService.cancelSubscription(subscription.userId)
          message.success('订阅已取消，将在当前订阅期结束后降为免费版')
          loadSubscriptionData()
        } catch (error) {
          message.error('取消订阅失败')
        }
      }
    })
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('zh-CN')
  }

  const getStatusTag = (status: string) => {
    const statusMap = {
      'active': { color: 'green', text: '有效' },
      'expired': { color: 'red', text: '已过期' },
      'cancelled': { color: 'orange', text: '已取消' },
      'pending': { color: 'blue', text: '待生效' }
    }
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { color: 'default', text: status }
    return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return '#ff4d4f'
    if (percentage >= 70) return '#faad14'
    return '#52c41a'
  }

  const getUsageTypeName = (type: string) => {
    const typeMap = {
      'video_processing': '视频处理',
      'storage': '存储空间',
      'shares': '分享内容',
      'exports': '导出功能',
      'api_calls': 'API调用'
    }
    return typeMap[type as keyof typeof typeMap] || type
  }

  const getRemainingDays = () => {
    if (!subscription?.expiresAt) return null
    
    const now = new Date()
    const expiresAt = new Date(subscription.expiresAt)
    const diffTime = expiresAt.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    return diffDays > 0 ? diffDays : 0
  }

  if (loading) {
    return (
      <div className="subscription-loading">
        <Spin size="large" />
        <p>加载订阅信息中...</p>
      </div>
    )
  }

  if (!subscription || !plan) {
    return (
      <div className="subscription-error">
        <Alert
          message="无法加载订阅信息"
          description="请刷新页面重试，或联系客服"
          type="error"
          showIcon
        />
      </div>
    )
  }

  const remainingDays = getRemainingDays()

  return (
    <div className="subscription-manage-page">
      <div className="page-header">
        <h1>订阅管理</h1>
        <p>管理您的会员订阅和配额使用情况</p>
      </div>

      {/* 订阅信息卡片 */}
      <Card
        title={
          <div className="card-title">
            <CrownOutlined />
            <span>当前订阅</span>
          </div>
        }
        className="subscription-card"
      >
        <div className="subscription-info">
          <div className="plan-info">
            <div className="plan-name">
              <h2>{plan.name}</h2>
              {getStatusTag(subscription.status)}
            </div>
            <p className="plan-description">{plan.description}</p>
            <div className="plan-price">
              {plan.priceMonthly === 0 ? (
                <span className="free-plan">免费版</span>
              ) : (
                <span className="paid-plan">¥{plan.priceMonthly}/月</span>
              )}
            </div>
          </div>

          <Divider />

          <Descriptions column={2} size="small">
            <Descriptions.Item label="订阅状态">
              {getStatusTag(subscription.status)}
            </Descriptions.Item>
            <Descriptions.Item label="开始时间">
              {formatDate(subscription.startedAt)}
            </Descriptions.Item>
            {subscription.expiresAt && (
              <Descriptions.Item label="到期时间">
                <Space>
                  <CalendarOutlined />
                  {formatDate(subscription.expiresAt)}
                  {remainingDays !== null && (
                    <Tag color={remainingDays <= 7 ? 'red' : 'blue'}>
                      剩余 {remainingDays} 天
                    </Tag>
                  )}
                </Space>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="自动续费">
              {subscription.autoRenew ? (
                <Tag color="green">已开启</Tag>
              ) : (
                <Tag color="orange">已关闭</Tag>
              )}
            </Descriptions.Item>
            {subscription.paymentMethod && (
              <Descriptions.Item label="支付方式">
                <Space>
                  <CreditCardOutlined />
                  {subscription.paymentMethod}
                </Space>
              </Descriptions.Item>
            )}
          </Descriptions>

          <div className="subscription-actions">
            <Space>
              <Button
                type="primary"
                icon={<UpgradeOutlined />}
                onClick={handleUpgrade}
              >
                升级套餐
              </Button>
              
              {plan.planType !== 'free' && (
                <Button
                  icon={<DowngradeOutlined />}
                  onClick={handleDowngrade}
                >
                  降级套餐
                </Button>
              )}
              
              {plan.planType !== 'free' && (
                <Button
                  danger
                  onClick={handleCancelSubscription}
                >
                  取消订阅
                </Button>
              )}
            </Space>
          </div>
        </div>
      </Card>

      {/* 配额使用情况 */}
      <Card
        title="配额使用情况"
        className="usage-card"
      >
        <div className="usage-list">
          {usage.map((item) => (
            <div key={item.quotaType} className="usage-item">
              <div className="usage-header">
                <span className="usage-type">{getUsageTypeName(item.quotaType)}</span>
                <span className="usage-numbers">
                  {item.usedAmount} / {item.maxAmount === 0 ? '无限制' : item.maxAmount}
                </span>
              </div>
              
              {item.maxAmount > 0 && (
                <Progress
                  percent={item.percentage}
                  strokeColor={getUsageColor(item.percentage)}
                  showInfo={false}
                  size="small"
                />
              )}
              
              <div className="usage-period">
                统计周期: {formatDate(item.periodStart)} - {formatDate(item.periodEnd)}
              </div>
            </div>
          ))}
        </div>

        {usage.length === 0 && (
          <div className="no-usage">
            <p>暂无配额使用记录</p>
          </div>
        )}
      </Card>

      {/* 套餐特权 */}
      <Card title="套餐特权" className="features-card">
        <div className="features-grid">
          <div className="feature-item">
            <h4>视频处理</h4>
            <p>
              {plan.monthlyVideoQuota === 0 
                ? '无限制' 
                : `每月 ${plan.monthlyVideoQuota} 个视频`}
            </p>
          </div>
          
          <div className="feature-item">
            <h4>视频时长</h4>
            <p>
              {plan.maxVideoDuration === 0 
                ? '无限制' 
                : `单个视频最长 ${plan.maxVideoDuration} 分钟`}
            </p>
          </div>
          
          <div className="feature-item">
            <h4>存储空间</h4>
            <p>{plan.maxStorageGb}GB</p>
          </div>
          
          <div className="feature-item">
            <h4>分享内容</h4>
            <p>最多 {plan.maxSharedItems} 个</p>
          </div>
          
          {plan.hasPriorityProcessing && (
            <div className="feature-item">
              <h4>优先处理</h4>
              <p>享受优先处理队列</p>
            </div>
          )}
          
          {plan.hasAdvancedExport && (
            <div className="feature-item">
              <h4>高级导出</h4>
              <p>支持多种格式导出</p>
            </div>
          )}
          
          {plan.hasApiAccess && (
            <div className="feature-item">
              <h4>API 访问</h4>
              <p>开发者 API 接口</p>
            </div>
          )}
          
          {plan.hasTeamManagement && (
            <div className="feature-item">
              <h4>团队管理</h4>
              <p>多人协作功能</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

export default SubscriptionManagePage