import { Link } from 'react-router-dom'
import { Play, Menu, X } from 'lucide-react'
import { useState } from 'react'

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

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
            <button className="btn-primary">
              立即体验
            </button>
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
              <div className="px-3 py-2">
                <button className="btn-primary w-full">
                  立即体验
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}