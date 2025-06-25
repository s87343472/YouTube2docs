import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Mail, Lock, Eye, EyeOff, LogIn, UserPlus } from 'lucide-react'
import { authClient } from '../lib/auth-client'

/**
 * 用户登录和注册页面
 */

export const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (isLogin) {
        // 登录
        const { data, error } = await authClient.signIn.email({
          email: formData.email,
          password: formData.password,
        })

        if (error) {
          setError(error.message || '登录失败')
        } else {
          // 登录成功，跳转到用户中心
          navigate('/user-center')
        }
      } else {
        // 注册
        const { data, error } = await authClient.signUp.email({
          email: formData.email,
          password: formData.password,
          name: formData.name,
        })

        if (error) {
          setError(error.message || '注册失败')
        } else {
          // 注册成功，跳转到用户中心
          navigate('/user-center')
        }
      }
    } catch (err) {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center space-x-2 mb-8">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
              <User className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">
              YouTube<span className="text-gradient">智学</span>
            </span>
          </Link>
          
          <h2 className="text-3xl font-bold text-gray-900">
            {isLogin ? '登录账户' : '创建账户'}
          </h2>
          <p className="mt-2 text-gray-600">
            {isLogin ? '欢迎回来！' : '加入我们，开始智能学习之旅'}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* 登录/注册切换 */}
          <div className="flex mb-6">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 px-4 text-center font-medium rounded-l-lg transition-colors ${
                isLogin 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <LogIn className="h-4 w-4 inline mr-2" />
              登录
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 px-4 text-center font-medium rounded-r-lg transition-colors ${
                !isLogin 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <UserPlus className="h-4 w-4 inline mr-2" />
              注册
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  用户名
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required={!isLogin}
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="请输入用户名"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                邮箱地址
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="请输入邮箱地址"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                密码
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder={isLogin ? "请输入密码" : "请设置密码（至少6位）"}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? '处理中...' : (isLogin ? '登录' : '注册')}
            </button>
          </form>

          {/* Google登录分隔线 */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">或</span>
              </div>
            </div>
          </div>

          {/* Google登录按钮 */}
          <div className="mt-6">
            <button
              type="button"
              onClick={async () => {
                setLoading(true)
                try {
                  const { data, error } = await authClient.signIn.social({
                    provider: 'google',
                    callbackURL: `${window.location.origin}/user-center`
                  })
                  if (error) {
                    setError('Google登录失败')
                  }
                } catch (err) {
                  setError('Google登录失败')
                } finally {
                  setLoading(false)
                }
              }}
              disabled={loading}
              className="w-full flex justify-center items-center px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              使用 Google 账户{isLogin ? '登录' : '注册'}
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              {isLogin ? '还没有账户？' : '已有账户？'}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="ml-1 text-blue-600 hover:text-blue-800 font-medium"
              >
                {isLogin ? '立即注册' : '立即登录'}
              </button>
            </p>
          </div>

          {isLogin && (
            <div className="mt-4 text-center">
              <Link 
                to="/" 
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                返回首页
              </Link>
            </div>
          )}
        </div>

        <div className="text-center text-sm text-gray-500">
          登录即表示您同意我们的
          <Link to="/terms" className="text-blue-600 hover:text-blue-800 mx-1">
            服务条款
          </Link>
          和
          <Link to="/privacy" className="text-blue-600 hover:text-blue-800 ml-1">
            隐私政策
          </Link>
        </div>
      </div>
    </div>
  )
}