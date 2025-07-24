import { useQuery } from "@tanstack/react-query"
import axios from 'axios'

/**
 * 自定义认证客户端
 * 使用JWT系统提供认证API
 */

const API_BASE_URL = "http://localhost:3000"

// 自定义 signOut 方法
export const signOut = async () => {
  // 清除本地存储的令牌
  localStorage.removeItem('token')
  localStorage.removeItem('refreshToken')
  
  // 调用后端登出接口
  try {
    const token = localStorage.getItem('token')
    if (token) {
      await axios.post(`${API_BASE_URL}/api/auth/logout`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
    }
  } catch (error) {
    console.error('Signout error:', error)
  }
  
  // 刷新页面以更新状态
  window.location.href = '/'
}

// 自动刷新令牌的函数
const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem('refreshToken')
  if (!refreshToken) {
    throw new Error('No refresh token available')
  }

  try {
    const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
      refreshToken
    })

    if (response.data?.success && response.data?.data) {
      const { accessToken, refreshToken: newRefreshToken } = response.data.data
      localStorage.setItem('token', accessToken)
      localStorage.setItem('refreshToken', newRefreshToken)
      return accessToken
    }
    
    throw new Error('Token refresh failed')
  } catch (error) {
    console.error('Token refresh failed:', error)
    // 刷新失败，清除所有令牌
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    throw error
  }
}

// 自定义 useSession hook，使用JWT系统
export const useSession = () => {
  return useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const token = localStorage.getItem('token')
      if (!token) {
        return null
      }

      try {
        const response = await axios.get(`${API_BASE_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.data?.success && response.data?.data?.user) {
          return {
            user: response.data.data.user,
            session: response.data.data.session
          }
        }
        return null
      } catch (error) {
        console.error('Failed to get session:', error)
        // 如果是401错误，尝试刷新令牌
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          try {
            console.log('Access token expired, attempting to refresh...')
            const newToken = await refreshAccessToken()
            
            // 用新令牌重新请求
            const retryResponse = await axios.get(`${API_BASE_URL}/api/auth/me`, {
              headers: {
                'Authorization': `Bearer ${newToken}`
              }
            })

            if (retryResponse.data?.success && retryResponse.data?.data?.user) {
              console.log('Token refreshed successfully')
              return {
                user: retryResponse.data.data.user,
                session: retryResponse.data.data.session
              }
            }
          } catch (refreshError) {
            console.error('Token refresh failed, clearing tokens:', refreshError)
            localStorage.removeItem('token')
            localStorage.removeItem('refreshToken')
          }
        }
        return null
      }
    },
    staleTime: 5 * 60 * 1000, // 5 分钟
    retry: false
  })
}

// 类型导出
export interface User {
  id: string
  email: string
  name?: string
  plan?: string
  email_verified?: boolean
  image?: string
}

export interface Session {
  user: User
  expiresAt?: string
}