import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

export function LoginSuccessPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const handleLoginSuccess = async () => {
      const token = searchParams.get('token')
      const refreshToken = searchParams.get('refresh')
      const isNewUser = searchParams.get('new') === 'true'

      if (token && refreshToken) {
        try {
          // 保存令牌到 localStorage
          localStorage.setItem('token', token)
          localStorage.setItem('refreshToken', refreshToken)

          // 显示成功消息
          const message = isNewUser ? '注册成功！欢迎使用 YouTube 智能学习资料生成器' : '登录成功！'
          console.log(message)

          // 延迟跳转，让用户看到成功消息
          setTimeout(() => {
            // 重定向到首页并刷新页面以更新认证状态
            window.location.href = '/'
          }, 1000)
        } catch (error) {
          console.error('Failed to process login:', error)
          navigate('/login?error=processing_failed', { replace: true })
        }
      } else {
        // 没有令牌，重定向到登录页
        navigate('/login?error=missing_token', { replace: true })
      }
    }

    handleLoginSuccess()
  }, [searchParams, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">登录成功</h2>
        <p className="text-gray-600">正在跳转到首页...</p>
      </div>
    </div>
  )
}