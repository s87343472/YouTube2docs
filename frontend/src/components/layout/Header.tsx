import { Link } from 'react-router-dom'
import { Play, Menu, X, User, LogOut } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../AuthProvider'
import { authClient } from '../../lib/auth-client'

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { isLoggedIn, user } = useAuth()

  const handleSignOut = async () => {
    await authClient.signOut()
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
              <Play className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">
              YouTube<span className="text-gradient">智学</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link 
              to="/" 
              className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              首页
            </Link>
            <Link 
              to="/about" 
              className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              关于
            </Link>
            <Link 
              to="/api-test" 
              className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              API测试
            </Link>
            {isLoggedIn ? (
              <div className="flex items-center space-x-4">
                <Link 
                  to="/user-center" 
                  className="text-gray-600 hover:text-gray-900 font-medium transition-colors flex items-center"
                >
                  <User className="h-4 w-4 mr-1" />
                  {user?.name || '个人中心'}
                </Link>
                <button
                  onClick={handleSignOut}
                  className="text-gray-600 hover:text-gray-900 font-medium transition-colors flex items-center"
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  登出
                </button>
              </div>
            ) : (
              <Link 
                to="/login" 
                className="text-gray-600 hover:text-gray-900 font-medium transition-colors flex items-center"
              >
                <User className="h-4 w-4 mr-1" />
                登录
              </Link>
            )}
            <Link 
              to="/process-demo" 
              className="btn-primary text-white hover:text-white no-underline"
            >
              立即体验
            </Link>
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-600 hover:text-gray-900 focus:outline-none"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-200">
              <Link
                to="/"
                className="block px-3 py-2 text-gray-600 hover:text-gray-900 font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                首页
              </Link>
              <Link
                to="/about"
                className="block px-3 py-2 text-gray-600 hover:text-gray-900 font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                关于
              </Link>
              <Link
                to="/api-test"
                className="block px-3 py-2 text-gray-600 hover:text-gray-900 font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                API测试
              </Link>
              {isLoggedIn ? (
                <>
                  <Link
                    to="/user-center"
                    className="block px-3 py-2 text-gray-600 hover:text-gray-900 font-medium flex items-center"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <User className="h-4 w-4 mr-1" />
                    {user?.name || '个人中心'}
                  </Link>
                  <button
                    onClick={() => {
                      handleSignOut()
                      setIsMenuOpen(false)
                    }}
                    className="block w-full text-left px-3 py-2 text-gray-600 hover:text-gray-900 font-medium flex items-center"
                  >
                    <LogOut className="h-4 w-4 mr-1" />
                    登出
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="block px-3 py-2 text-gray-600 hover:text-gray-900 font-medium flex items-center"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <User className="h-4 w-4 mr-1" />
                  登录
                </Link>
              )}
              <div className="px-3 py-2">
                <Link to="/process-demo" className="btn-primary w-full block text-center text-white hover:text-white no-underline">
                  立即体验
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}