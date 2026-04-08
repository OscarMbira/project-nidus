import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, Home, LayoutDashboard, FolderKanban, Settings, HelpCircle, LogOut } from 'lucide-react'
import { useMenu } from '../hooks/useMenu'
import { supabase } from '../services/supabaseClient'
import { resolveMenuRoutePath, menuPathIsActive } from '../utils/sidebarRouteUtils'

export default function MobileNavigation() {
  const [isOpen, setIsOpen] = useState(false)
  const [isBottomNavVisible, setIsBottomNavVisible] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { menuItems, loading } = useMenu()

  useEffect(() => {
    // Show bottom navigation on mobile (screen width < 768px)
    const checkScreenSize = () => {
      setIsBottomNavVisible(window.innerWidth < 768)
    }
    
    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  useEffect(() => {
    // Close mobile menu when route changes
    setIsOpen(false)
  }, [location.pathname])

  // Close menu when clicking outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e) => {
      const menu = document.getElementById('mobile-menu')
      const button = document.getElementById('mobile-menu-button')
      if (menu && !menu.contains(e.target) && !button?.contains(e.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isOpen])

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      navigate('/platform/login', { replace: true })
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const handleMenuItemClick = () => {
    setIsOpen(false)
  }

  // Quick navigation items for bottom nav
  const quickNavItems = [
    { path: '/dashboard', icon: Home, label: 'Home' },
    { path: '/projects', icon: FolderKanban, label: 'Projects' },
    { path: '/help', icon: HelpCircle, label: 'Help' },
    { path: '/settings/security', icon: Settings, label: 'Settings' }
  ]

  // Top-level menu items for mobile menu
  const topLevelItems = menuItems?.filter(item => !item.parent_menu_id) || []

  if (loading) {
    return null
  }

  return (
    <>
      {/* Hamburger Menu Button (Top) */}
      <button
        id="mobile-menu-button"
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isOpen}
        aria-controls="mobile-menu"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Side Menu */}
          <nav
            id="mobile-menu"
            className="fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-white dark:bg-gray-800 shadow-xl z-50 md:hidden overflow-y-auto transform transition-transform duration-300 ease-in-out"
            aria-label="Mobile navigation"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Menu</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                  aria-label="Close menu"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Menu Items */}
              <div className="flex-1 overflow-y-auto py-4">
                {topLevelItems.length > 0 ? (
                  <div className="space-y-1 px-2">
                    {topLevelItems.map((item) => (
                      <MobileMenuItem
                        key={item.id}
                        item={item}
                        menuItems={menuItems}
                        onClick={handleMenuItemClick}
                        level={0}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No menu items available
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-2">
                <Link
                  to="/help"
                  onClick={handleMenuItemClick}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <HelpCircle className="h-5 w-5" />
                  <span>Help & Support</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </nav>
        </>
      )}

      {/* Bottom Navigation (Mobile only) */}
      {isBottomNavVisible && (
        <nav
          className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-30 md:hidden safe-area-inset-bottom"
          aria-label="Bottom navigation"
        >
          <div className="flex items-center justify-around h-16 px-2">
            {quickNavItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/')
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center justify-center flex-1 h-full min-w-0 px-2 rounded-lg transition-colors ${
                    isActive
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                  aria-label={item.label}
                >
                  <Icon className="h-6 w-6 mb-1" />
                  <span className="text-xs font-medium truncate w-full text-center">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      )}
    </>
  )
}

function MobileMenuItem({ item, menuItems, onClick, level = 0 }) {
  const location = useLocation()
  const children = menuItems?.filter(child => child.parent_menu_id === item.id) || []
  const hasChildren = children.length > 0
  const resolved = resolveMenuRoutePath(item.route_path, location.pathname)
  const linkTo = !item.route_path ? '#' : (resolved === '/' ? '/platform/dashboard' : resolved)
  const childActive = children.some((ch) => {
    if (!ch.route_path) return false
    const r = resolveMenuRoutePath(ch.route_path, location.pathname)
    return menuPathIsActive(location.pathname, r)
  })
  const [isExpanded, setIsExpanded] = useState(childActive)
  useEffect(() => {
    if (childActive) setIsExpanded(true)
  }, [location.pathname, childActive])

  const isActive = item.route_path
    ? menuPathIsActive(location.pathname, resolved)
    : childActive

  const handleClick = (e) => {
    if (hasChildren) {
      e.preventDefault()
      setIsExpanded(!isExpanded)
    } else {
      onClick()
    }
  }

  const getIcon = (iconName) => {
    // Map common icon names to Lucide icons
    const iconMap = {
      'layout-dashboard': 'LayoutDashboard',
      'folder-kanban': 'FolderKanban',
      'list-checks': 'CheckSquare',
      'users': 'Users',
      'chart-bar': 'BarChart',
      'settings': 'Settings',
      'help-circle': 'HelpCircle',
      'shield': 'Shield',
      'book': 'Book',
      'video': 'Video',
      'file-text': 'FileText',
      'message-circle': 'MessageCircle',
      'mail': 'Mail'
    }
    return iconMap[iconName] || null
  }

  return (
    <div>
      {item.external_url ? (
        <a
          href={item.external_url}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
            isActive
              ? 'bg-blue-600 text-white'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          style={isActive && item.menu_color ? { backgroundColor: item.menu_color } : {}}
        >
          <span className="text-lg">{item.menu_icon || '•'}</span>
          <span className="flex-1">{item.menu_label}</span>
        </a>
      ) : (
        <Link
          to={linkTo}
          onClick={handleClick}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
            isActive
              ? 'bg-blue-600 text-white'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          style={isActive && item.menu_color ? { backgroundColor: item.menu_color } : {}}
        >
          <span className="text-lg">{item.menu_icon || '•'}</span>
          <span className="flex-1">{item.menu_label}</span>
          {item.badge_text && (
            <span
              className="px-2 py-0.5 text-xs rounded-full font-medium text-white"
              style={{ backgroundColor: item.badge_color || '#EF4444' }}
            >
              {item.badge_text}
            </span>
          )}
          {hasChildren && (
            <span className="text-xs">{isExpanded ? '▼' : '▶'}</span>
          )}
        </Link>
      )}
      
      {hasChildren && isExpanded && (
        <div className={`ml-4 mt-1 space-y-1 border-l-2 ${isActive ? 'border-blue-600' : 'border-gray-200 dark:border-gray-700'}`}>
          {children.map((child) => (
            <MobileMenuItem
              key={child.id}
              item={child}
              menuItems={menuItems}
              onClick={onClick}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

