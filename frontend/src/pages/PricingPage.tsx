import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Button, Badge, Spin, message, Switch, Divider } from 'antd'
import { CheckOutlined, StarOutlined, CrownOutlined } from '@ant-design/icons'
import { QuotaService } from '../services/quotaService'
import type { QuotaPlan } from '../services/quotaService'
import './PricingPage.css'

const PricingPage: React.FC = () => {
  const [plans, setPlans] = useState<QuotaPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [yearly, setYearly] = useState(false)
  const [currentPlan, setCurrentPlan] = useState<string>('free')
  const navigate = useNavigate()

  useEffect(() => {
    loadPlans()
    loadCurrentSubscription()
  }, [])

  const loadPlans = async () => {
    try {
      console.log('Loading plans...')
      const plansData = await QuotaService.getAllPlans()
      console.log('Plans loaded:', plansData)
      setPlans(plansData)
    } catch (error) {
      console.error('Error loading plans:', error)
      message.error('加载套餐信息失败')
    } finally {
      setLoading(false)
    }
  }

  const loadCurrentSubscription = async () => {
    try {
      // 检查用户是否已登录
      const token = localStorage.getItem('token')
      if (!token) {
        console.log('User not logged in, skipping subscription check')
        return
      }
      
      const subscription = await QuotaService.getUserSubscription()
      if (subscription?.subscription) {
        setCurrentPlan(subscription.subscription.planType)
      }
    } catch (error: any) {
      // 忽略401错误，用户未登录是正常情况
      if (error?.response?.status !== 401) {
        console.error('Failed to load current subscription:', error)
      }
    }
  }

  const handleSelectPlan = (planType: string) => {
    if (planType === 'free') {
      navigate('/user-center?tab=quota')
      return
    }
    
    if (planType === currentPlan) {
      navigate('/subscription/manage')
      return
    }

    navigate(`/subscription/upgrade?plan=${planType}&billing=${yearly ? 'yearly' : 'monthly'}`)
  }

  const formatPrice = (monthly: number, yearlyPrice: number) => {
    if (yearly) {
      return `$${yearlyPrice}/年`
    }
    return `$${monthly}/月`
  }

  const getPlanIcon = (planType: string) => {
    switch (planType) {
      case 'free':
        return <CheckOutlined />
      case 'basic':
        return <CheckOutlined />
      case 'pro':
        return <StarOutlined />
      case 'enterprise':
        return <CrownOutlined />
      default:
        return <CheckOutlined />
    }
  }

  const getPlanFeatures = (plan: QuotaPlan) => {
    const features = []
    
    if (plan.monthlyVideoQuota === 0) {
      features.push('无限视频处理')
    } else {
      features.push(`每月 ${plan.monthlyVideoQuota} 个视频`)
    }
    
    if (plan.maxVideoDuration === 0) {
      features.push('无限制视频时长')
    } else {
      features.push(`单个视频最长 ${plan.maxVideoDuration} 分钟`)
    }
    
    if (plan.monthlyDurationQuota === 0) {
      features.push('无限制月度总时长')
    } else {
      const hours = plan.monthlyDurationQuota / 60
      features.push(`月度总时长 ${hours >= 1 ? Math.floor(hours) : hours.toFixed(1)} 小时`)
    }
    
    
    if (plan.hasPriorityProcessing) {
      features.push('优先处理队列')
    }
    
    if (plan.hasAdvancedExport) {
      features.push('高级导出功能')
    }
    
    if (plan.hasApiAccess) {
      features.push('API 接口访问')
    }
    
    if (plan.hasTeamManagement) {
      features.push('团队管理功能')
    }
    
    if (plan.hasCustomBranding) {
      features.push('自定义品牌')
    }
    
    return features
  }

  const getPlanButtonText = (planType: string) => {
    if (planType === 'free') return '免费使用'
    if (planType === currentPlan) return '当前套餐'
    
    const currentPlanIndex = plans.findIndex(p => p.planType === currentPlan)
    const targetPlanIndex = plans.findIndex(p => p.planType === planType)
    
    if (currentPlanIndex >= 0 && targetPlanIndex >= 0) {
      if (targetPlanIndex > currentPlanIndex) {
        return '立即升级'
      } else {
        return '降级至此'
      }
    }
    
    return '选择套餐'
  }

  const getPlanCardClass = (planType: string) => {
    let className = 'pricing-card'
    
    if (planType === currentPlan) {
      className += ' current-plan'
    }
    
    if (planType === 'pro') {
      className += ' recommended'
    }
    
    return className
  }

  const getSavingsText = (monthly: number, yearly: number) => {
    if (yearly && monthly > 0) {
      const monthlyCost = monthly * 12
      const savings = monthlyCost - yearly
      const savingsPercent = Math.round((savings / monthlyCost) * 100)
      return `节省 ${savingsPercent}%`
    }
    return ''
  }

  if (loading) {
    return (
      <div className="pricing-loading">
        <Spin size="large" />
        <p>加载套餐信息中...</p>
      </div>
    )
  }

  return (
    <div className="pricing-page">
      <div className="pricing-header">
        <h1>选择适合的套餐</h1>
        <p>根据您的需求选择最合适的会员套餐，随时可以升级或降级</p>
        
        <div className="billing-toggle">
          <span className={!yearly ? 'active' : ''}>按月付费</span>
          <Switch 
            checked={yearly} 
            onChange={setYearly}
            style={{ margin: '0 12px' }}
          />
          <span className={yearly ? 'active' : ''}>按年付费</span>
          {yearly && <Badge count="省20%" className="savings-badge" />}
        </div>
      </div>

      <div className="pricing-cards">
        {plans.map((plan) => (
          <Card
            key={plan.planType}
            className={getPlanCardClass(plan.planType)}
            title={
              <div className="plan-title">
                {getPlanIcon(plan.planType)}
                <span>{plan.name}</span>
                {plan.planType === 'pro' && <Badge count="推荐" className="recommended-badge" />}
                {plan.planType === currentPlan && <Badge count="当前" className="current-badge" />}
              </div>
            }
          >
            <div className="plan-price">
              {plan.priceMonthly === 0 ? (
                <div className="price-text">
                  <span className="price">免费</span>
                </div>
              ) : (
                <div className="price-text">
                  {yearly && plan.priceYearly < plan.priceMonthly * 12 ? (
                    <>
                      <span className="original-price">${plan.priceMonthly * 12}/年</span>
                      <span className="price">${plan.priceYearly}/年</span>
                      <span className="savings">{getSavingsText(plan.priceMonthly, plan.priceYearly)}</span>
                    </>
                  ) : (
                    <>
                      <span className="price">{formatPrice(plan.priceMonthly, plan.priceYearly)}</span>
                    </>
                  )}
                </div>
              )}
            </div>

            <p className="plan-description">{plan.description}</p>

            <Divider />

            <div className="plan-features">
              {getPlanFeatures(plan).map((feature, index) => (
                <div key={index} className="feature-item">
                  <CheckOutlined className="feature-icon" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <Button
              type={plan.planType === 'pro' ? 'primary' : 'default'}
              size="large"
              block
              className="select-plan-btn"
              disabled={plan.planType === currentPlan}
              onClick={() => handleSelectPlan(plan.planType)}
            >
              {getPlanButtonText(plan.planType)}
            </Button>
          </Card>
        ))}
      </div>

      <div className="pricing-faq">
        <h3>常见问题</h3>
        <div className="faq-item">
          <h4>可以随时取消订阅吗？</h4>
          <p>是的，您可以随时取消订阅。取消后当前订阅期仍然有效，到期后将自动降为免费版。</p>
        </div>
        <div className="faq-item">
          <h4>升级后立即生效吗？</h4>
          <p>是的，升级后立即生效，您可以马上享受新套餐的所有功能和配额。</p>
        </div>
        <div className="faq-item">
          <h4>支持哪些支付方式？</h4>
          <p>我们支持支付宝、微信支付等多种支付方式，安全便捷。</p>
        </div>
      </div>
    </div>
  )
}

export default PricingPage