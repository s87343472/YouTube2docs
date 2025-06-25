import { createAuthClient } from "better-auth/react"

/**
 * Better Auth 客户端配置
 * 提供类型安全的认证API
 */

export const authClient = createAuthClient({
  baseURL: "http://localhost:3000", // 后端API地址
  
  // 可选配置
  fetchOptions: {
    credentials: "include", // 包含cookies
  }
})

// 导出便捷的hooks和方法
export const {
  useSession,
  signIn,
  signUp,
  signOut,
  useActiveSession
} = authClient

// 类型导出
export type Session = typeof authClient.$Infer.Session
export type User = typeof authClient.$Infer.User