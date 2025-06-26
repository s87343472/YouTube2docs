import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { 
  Card, 
  Button, 
  Radio, 
  Divider, 
  Steps, 
  Form, 
  Input, 
  Select, 
  message, 
  Spin,
  Space,
  Modal,
  Alert
} from 'antd'
import { 
  CreditCardOutlined, 
  AlipayOutlined, 
  CheckCircleOutlined,
  LoadingOutlined
} from '@ant-design/icons'
import { QuotaService, QuotaPlan } from '../services/quotaService'
import './SubscriptionUpgradePage.css'

const { Step } = Steps
const { Option } = Select

interface PaymentForm {
  paymentMethod: 'alipay' | 'wechat' | 'credit_card'
  billingCycle: 'monthly' | 'yearly'
  email?: string
  phone?: string
  cardNumber?: string
  cardExpiry?: string
  cardCvc?: string
  cardName?: string
}

const SubscriptionUpgradePage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedPlan, setSelectedPlan] = useState<QuotaPlan | null>(null)
  const [allPlans, setAllPlans] = useState<QuotaPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [paymentForm, setPaymentForm] = useState<PaymentForm>({
    paymentMethod: 'alipay',
    billingCycle: 'monthly'
  })

  const planType = searchParams.get('plan') || 'pro'
  const billingType = searchParams.get('billing') || 'monthly'

  useEffect(() => {
    loadPlans()
  }, [])

  useEffect(() => {
    if (allPlans.length > 0) {
      const plan = allPlans.find(p => p.planType === planType)
      if (plan) {
        setSelectedPlan(plan)
        setPaymentForm(prev => ({
          ...prev,
          billingCycle: billingType as 'monthly' | 'yearly'
        }))
      }
    }
  }, [allPlans, planType, billingType])

  const loadPlans = async () => {
    try {
      const plans = await QuotaService.getAllPlans()
      setAllPlans(plans.filter(p => p.planType !== 'free'))
    } catch (error) {
      message.error('加载套餐信息失败')
    } finally {
      setLoading(false)
    }
  }

  const calculatePrice = () => {
    if (!selectedPlan) return 0
    return paymentForm.billingCycle === 'yearly' 
      ? selectedPlan.priceYearly 
      : selectedPlan.priceMonthly
  }

  const calculateSavings = () => {
    if (!selectedPlan || paymentForm.billingCycle !== 'yearly') return 0
    const monthlyTotal = selectedPlan.priceMonthly * 12
    return monthlyTotal - selectedPlan.priceYearly
  }

  const handlePlanChange = (plan: QuotaPlan) => {
    setSelectedPlan(plan)
  }

  const handleNext = () => {
    if (currentStep === 0) {
      if (!selectedPlan) {
        message.warning('请选择套餐')
        return
      }
      setCurrentStep(1)
    } else if (currentStep === 1) {
      form.validateFields().then(() => {
        setCurrentStep(2)
      }).catch(() => {
        message.warning('请完善支付信息')
      })
    }
  }

  const handlePrev = () => {
    setCurrentStep(currentStep - 1)
  }

  const handlePayment = async () => {
    if (!selectedPlan) {
      message.error('请选择套餐')
      return
    }

    try {
      setProcessing(true)

      // 模拟支付处理
      await new Promise(resolve => setTimeout(resolve, 2000))

      // 调用升级API
      await QuotaService.upgradeSubscription(selectedPlan.planType, paymentForm.paymentMethod)

      message.success('支付成功！套餐已升级')
      
      // 跳转到成功页面
      navigate('/subscription/success?plan=' + selectedPlan.planType)
    } catch (error) {
      message.error('支付失败，请重试')
    } finally {
      setProcessing(false)
    }
  }

  const renderPlanSelection = () => (
    <div className="plan-selection">
      <h3>选择套餐</h3>
      <div className="plans-grid">
        {allPlans.map(plan => (
          <Card
            key={plan.planType}
            className={`plan-card ${selectedPlan?.planType === plan.planType ? 'selected' : ''}`}
            onClick={() => handlePlanChange(plan)}
          >
            <div className="plan-header">
              <h4>{plan.name}</h4>
              <div className="plan-price">
                <span className="price">
                  ¥{paymentForm.billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly}
                </span>
                <span className="period">
                  /{paymentForm.billingCycle === 'yearly' ? '年' : '月'}
                </span>
              </div>
            </div>
            <p className="plan-desc">{plan.description}</p>
            <div className="plan-features">
              <div className="feature">
                {plan.monthlyVideoQuota === 0 ? '无限视频处理' : `${plan.monthlyVideoQuota}个视频/月`}
              </div>
              <div className="feature">
                {plan.maxVideoDuration === 0 ? '无限时长' : `${plan.maxVideoDuration}分钟/视频`}
              </div>
              <div className="feature">
                {plan.maxStorageGb}GB 存储空间
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="billing-cycle">
        <h4>计费周期</h4>
        <Radio.Group
          value={paymentForm.billingCycle}
          onChange={(e) => setPaymentForm({...paymentForm, billingCycle: e.target.value})}
        >
          <Radio value="monthly">按月付费</Radio>
          <Radio value="yearly">
            按年付费
            {selectedPlan && selectedPlan.priceYearly < selectedPlan.priceMonthly * 12 && (
              <span className="savings-tag">节省 ¥{selectedPlan.priceMonthly * 12 - selectedPlan.priceYearly}</span>
            )}
          </Radio>
        </Radio.Group>
      </div>
    </div>
  )

  const renderPaymentMethod = () => (
    <div className="payment-method">
      <h3>支付方式</h3>
      
      <Radio.Group
        value={paymentForm.paymentMethod}
        onChange={(e) => setPaymentForm({...paymentForm, paymentMethod: e.target.value})}
        className="payment-options"
      >
        <Radio value="alipay" className="payment-option">
          <AlipayOutlined />
          <span>支付宝</span>
        </Radio>
        <Radio value="wechat" className="payment-option">
          <img src="/wechat-pay.png" alt="微信支付" className="payment-icon" />
          <span>微信支付</span>
        </Radio>
        <Radio value="credit_card" className="payment-option">
          <CreditCardOutlined />
          <span>信用卡</span>
        </Radio>
      </Radio.Group>

      <Form
        form={form}
        layout="vertical"
        className="payment-form"
      >
        <Form.Item
          label="邮箱地址"
          name="email"
          rules={[
            { required: true, message: '请输入邮箱地址' },
            { type: 'email', message: '请输入有效的邮箱地址' }
          ]}
        >
          <Input placeholder="用于接收账单和通知" />
        </Form.Item>

        <Form.Item
          label="手机号码"
          name="phone"
          rules={[{ required: true, message: '请输入手机号码' }]}
        >
          <Input placeholder="用于支付验证" />
        </Form.Item>

        {paymentForm.paymentMethod === 'credit_card' && (
          <>
            <Form.Item
              label="持卡人姓名"
              name="cardName"
              rules={[{ required: true, message: '请输入持卡人姓名' }]}
            >
              <Input placeholder="请输入银行卡上的姓名" />
            </Form.Item>

            <Form.Item
              label="卡号"
              name="cardNumber"
              rules={[{ required: true, message: '请输入银行卡号' }]}
            >
              <Input placeholder="1234 5678 9012 3456" maxLength={19} />
            </Form.Item>

            <div className="card-details">
              <Form.Item
                label="有效期"
                name="cardExpiry"
                rules={[{ required: true, message: '请输入有效期' }]}
              >
                <Input placeholder="MM/YY" maxLength={5} />
              </Form.Item>

              <Form.Item
                label="CVV"
                name="cardCvc"
                rules={[{ required: true, message: '请输入CVV' }]}
              >
                <Input placeholder="123" maxLength={3} />
              </Form.Item>
            </div>
          </>
        )}
      </Form>
    </div>
  )

  const renderConfirmation = () => (
    <div className="confirmation">
      <h3>确认订单</h3>
      
      <Card className="order-summary">
        <div className="summary-header">
          <h4>订单摘要</h4>
        </div>
        
        <div className="summary-item">
          <span>套餐</span>
          <span>{selectedPlan?.name}</span>
        </div>
        
        <div className="summary-item">
          <span>计费周期</span>
          <span>{paymentForm.billingCycle === 'yearly' ? '按年付费' : '按月付费'}</span>
        </div>
        
        {paymentForm.billingCycle === 'yearly' && calculateSavings() > 0 && (
          <div className="summary-item savings">
            <span>年付优惠</span>
            <span>-¥{calculateSavings()}</span>
          </div>
        )}
        
        <Divider />
        
        <div className="summary-total">
          <span>总计</span>
          <span className="total-price">¥{calculatePrice()}</span>
        </div>
      </Card>

      <Alert
        message="订阅说明"
        description="订阅成功后立即生效，您可以随时在账户设置中管理订阅。支持随时取消，取消后当前周期内仍可正常使用。"
        type="info"
        showIcon
        style={{ margin: '16px 0' }}
      />
    </div>
  )

  if (loading) {
    return (
      <div className="upgrade-loading">
        <Spin size="large" />
        <p>加载中...</p>
      </div>
    )
  }

  const steps = [
    { title: '选择套餐', content: renderPlanSelection() },
    { title: '支付信息', content: renderPaymentMethod() },
    { title: '确认订单', content: renderConfirmation() }
  ]

  return (
    <div className="subscription-upgrade-page">
      <div className="page-header">
        <h1>升级套餐</h1>
        <p>选择最适合您的会员套餐</p>
      </div>

      <Card className="upgrade-card">
        <Steps current={currentStep} className="upgrade-steps">
          {steps.map(step => (
            <Step key={step.title} title={step.title} />
          ))}
        </Steps>

        <div className="step-content">
          {steps[currentStep].content}
        </div>

        <div className="step-actions">
          <Space>
            {currentStep > 0 && (
              <Button onClick={handlePrev}>
                上一步
              </Button>
            )}
            
            {currentStep < steps.length - 1 && (
              <Button type="primary" onClick={handleNext}>
                下一步
              </Button>
            )}
            
            {currentStep === steps.length - 1 && (
              <Button 
                type="primary" 
                loading={processing}
                onClick={handlePayment}
                size="large"
              >
                {processing ? '处理中...' : `支付 ¥${calculatePrice()}`}
              </Button>
            )}
            
            <Button onClick={() => navigate('/pricing')}>
              取消
            </Button>
          </Space>
        </div>
      </Card>
    </div>
  )
}

export default SubscriptionUpgradePage