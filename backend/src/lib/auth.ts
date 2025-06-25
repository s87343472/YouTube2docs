import { betterAuth } from "better-auth"
import { Pool } from "pg"

/**
 * Better Auth 配置
 * 提供完整的用户认证功能
 */

// 数据库连接池
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'youtube_learning',
  user: process.env.POSTGRES_USER || 'sagasu',
  password: process.env.POSTGRES_PASSWORD || '',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

export const auth = betterAuth({
  database: pool,
  secret: process.env.BETTER_AUTH_SECRET || process.env.JWT_SECRET || "your_super_secure_secret_key_here_at_least_32_characters_long",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  
  // 信任的源地址配置
  trustedOrigins: [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
    "https://localhost:3000",
    "https://localhost:5173",
    ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
    ...(process.env.PRODUCTION_URL ? [process.env.PRODUCTION_URL] : [])
  ],
  
  // 成功登录后的重定向配置
  successRedirectURL: process.env.FRONTEND_URL || "http://localhost:5173/user-center",
  
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false
  },
  
  // 社交登录配置
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // 可选：自定义scope
      scope: ["email", "profile"],
      // 重定向URL配置
      redirectURI: process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/callback/google"
    }
  }
})