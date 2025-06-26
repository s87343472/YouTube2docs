import React, { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { useSession } from '../lib/auth-client'

/**
 * 认证上下文提供器
 * 为整个应用提供用户认证状态
 */

interface AuthContextType {
  user: any | null
  session: any | null
  isLoading: boolean
  isLoggedIn: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { data: session, isPending: isLoading } = useSession()

  const authValue: AuthContextType = {
    user: session?.user || null,
    session: session?.session || null,
    isLoading,
    isLoggedIn: !!session?.user
  }

  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  )
}

// 自定义hook用于访问认证状态
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// 保护路由组件
interface ProtectedRouteProps {
  children: ReactNode
  fallback?: ReactNode
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  fallback = <div>请先登录</div> 
}) => {
  const { isLoggedIn, isLoading } = useAuth()

  if (isLoading) {
    return <div>加载中...</div>
  }

  if (!isLoggedIn) {
    return <>{fallback}</>
  }

  return <>{children}</>
}