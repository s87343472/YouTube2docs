import { useAuth } from '../components/AuthProvider'

/**
 * 管理员权限检查Hook
 */
export const useAdminAccess = () => {
  const { user } = useAuth()
  
  const isAdmin = user?.email === 'sagasu718@gmail.com'
  
  return {
    isAdmin,
    hasAdminAccess: isAdmin
  }
}