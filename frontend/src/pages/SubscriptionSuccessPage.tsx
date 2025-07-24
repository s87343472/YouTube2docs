import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Result, Button, Card, Descriptions, Space, Divider } from 'antd'
import { CheckCircleOutlined, HomeOutlined, SettingOutlined } from '@ant-design/icons'
import { QuotaService, QuotaPlan } from '../services/quotaService'
import './SubscriptionSuccessPage.css'

const SubscriptionSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [plan, setPlan] = useState<QuotaPlan | null>(null)
  const [loading, setLoading] = useState(true)

  const planType = searchParams.get('plan') || 'pro'

  useEffect(() => {
    loadPlanInfo()
  }, [planType])

  const loadPlanInfo = async () => {
    try {
      const plans = await QuotaService.getAllPlans()
      const selectedPlan = plans.find(p => p.planType === planType)
      setPlan(selectedPlan || null)
    } catch (error) {
      console.error('Failed to load plan info:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGoHome = () => {
    navigate('/')
  }

  const handleManageSubscription = () => {
    navigate('/subscription/manage')
  }

  const handleStartUsing = () => {
    navigate('/user-center?tab=quota')
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
      features.push(`月度总时长 ${Math.floor(plan.monthlyDurationQuota / 60)} 小时`)
    }
    
    features.push(`存储空间 ${plan.maxStorageGb}GB`)
    features.push(`最多分享 ${plan.maxSharedItems} 个内容`)
    
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

  if (loading) {
    return (
      <div className="success-loading">
        <div>加载中...</div>
      </div>
    )
  }

  return (
    <div className="subscription-success-page">
      <Result
        icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
        title="订阅成功！"
        subTitle={`恭喜您成功订阅 ${plan?.name || '会员套餐'}，现在可以享受更多权益了`}
        className="success-result"
      />

      {plan && (
        <Card className="plan-details-card" title="套餐详情">
          <div className="plan-summary">
            <div className="plan-info">
              <h3>{plan.name}</h3>
              <p className="plan-description">{plan.description}</p>
              <div className="plan-price">
                <span className="monthly-price">${plan.priceMonthly}/月</span>
                {plan.priceYearly > 0 && (
                  <span className="yearly-price">或 ${plan.priceYearly}/年</span>
                )}
              </div>
            </div>
          </div>

          <Divider />

          <div className="plan-features">
            <h4>您现在可以享受以下权益：</h4>
            <div className="features-grid">
              {getPlanFeatures(plan).map((feature, index) => (
                <div key={index} className="feature-item">
                  <CheckCircleOutlined className="feature-icon" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <Divider />

          <Descriptions title="订阅信息" column={1} size="small">
            <Descriptions.Item label="生效时间">
              立即生效
            </Descriptions.Item>
            <Descriptions.Item label="计费周期">
              按月自动续费
            </Descriptions.Item>
            <Descriptions.Item label="下次扣费">
              {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('zh-CN')}
            </Descriptions.Item>
            <Descriptions.Item label="管理订阅">
              您可以随时在账户设置中管理您的订阅
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      <Card className="next-steps-card" title="接下来您可以">
        <div className="action-buttons">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Button 
              type="primary" 
              size="large" 
              block
              onClick={handleStartUsing}
              icon={<SettingOutlined />}
            >
              查看配额使用情况
            </Button>
            
            <Button 
              size="large" 
              block
              onClick={handleManageSubscription}
              icon={<SettingOutlined />}
            >
              管理我的订阅
            </Button>
            
            <Button 
              size="large" 
              block
              onClick={handleGoHome}
              icon={<HomeOutlined />}
            >
              开始使用服务
            </Button>
          </Space>
        </div>
      </Card>

      <div className="help-section">
        <Card size="small">
          <h4>需要帮助？</h4>
          <p>
            如果您有任何问题或需要帮助，请联系我们的客服团队。
            我们会尽快为您解答。
          </p>
          <Space>
            <Button type="link">常见问题</Button>
            <Button type="link">联系客服</Button>
            <Button type="link">使用指南</Button>
          </Space>
        </Card>
      </div>
    </div>
  )
}

export default SubscriptionSuccessPage