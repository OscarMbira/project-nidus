import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useMenu } from '../hooks/useMenu'
import { supabase } from '../services/supabaseClient'
import { 
  LayoutDashboard, 
  FolderKanban, 
  CheckSquare, 
  Users, 
  BarChart, 
  Settings,
  ChevronRight,
  ChevronDown,
  LogOut,
  Menu,
  X
} from 'lucide-react'
import { useThemeContext } from '../context/ThemeContext'

// Icon mapping for menu items
const iconMap = {
  'layout-dashboard': LayoutDashboard,
  'folder-kanban': FolderKanban,
  'list-checks': CheckSquare,
  'users': Users,
  'chart-bar': BarChart,
  'settings': Settings,
}

function SidebarMenuItem({ menuItem, level = 0 }) {
  const location = useLocation()
  const [isExpanded, setIsExpanded] = useState(false)
  const hasChildren = menuItem.children && menuItem.children.length > 0
  const isActive = location.pathname === menuItem.route_path || 
                   (menuItem.route_path && location.pathname.startsWith(menuItem.route_path + '/'))

  const Icon = iconMap[menuItem.menu_icon] || LayoutDashboard

  const handleClick = (e) => {
    if (hasChildren) {
      e.preventDefault()
      setIsExpanded(!isExpanded)
    }
  }

  return (
    <div>
      {menuItem.external_url ? (
        <a
          href={menuItem.external_url}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            isActive
              ? 'bg-blue-600 text-white'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          style={isActive && menuItem.menu_color ? { backgroundColor: menuItem.menu_color } : {}}
        >
          <Icon className="h-5 w-5 flex-shrink-0" />
          <span className="flex-1">{menuItem.menu_label}</span>
          {menuItem.badge_text && (
            <span
              className="px-2 py-0.5 text-xs rounded-full font-medium text-white"
              style={{ backgroundColor: menuItem.badge_color || '#EF4444' }}
            >
              {menuItem.badge_text}
            </span>
          )}
        </a>
      ) : (
        <Link
          to={menuItem.route_path || '#'}
          onClick={handleClick}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            isActive
              ? 'bg-blue-600 text-white'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          style={isActive && menuItem.menu_color ? { backgroundColor: menuItem.menu_color } : {}}
        >
          <Icon className="h-5 w-5 flex-shrink-0" />
          <span className="flex-1">{menuItem.menu_label}</span>
          {menuItem.badge_text && (
            <span
              className="px-2 py-0.5 text-xs rounded-full font-medium text-white"
              style={{ backgroundColor: menuItem.badge_color || '#EF4444' }}
            >
              {menuItem.badge_text}
            </span>
          )}
          {hasChildren && (
            <span className="ml-auto">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </span>
          )}
        </Link>
      )}
      {hasChildren && isExpanded && (
        <div className={`ml-4 mt-1 space-y-1 border-l-2 pl-2 ${
          isActive ? 'border-blue-600' : 'border-gray-200 dark:border-gray-700'
        }`}>
          {menuItem.children.map((child) => (
            <SidebarMenuItem key={child.id} menuItem={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Sidebar({ isOpen, onClose }) {
  const { menuItems, loading, error } = useMenu()
  const navigate = useNavigate()
  const { theme } = useThemeContext()
  const location = useLocation()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  // Don't show sidebar on auth pages
  const isAuthPage = location.pathname.startsWith('/login') || 
                     location.pathname.startsWith('/register') ||
                     location.pathname.startsWith('/auth/confirm-email') ||
                     location.pathname.startsWith('/onboarding')

  if (isAuthPage) {
    return null
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-800 shadow-lg z-50 lg:z-auto
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:shadow-none
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        aria-label="Sidebar navigation"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <div className="p-2 bg-blue-600 rounded-lg">
                <LayoutDashboard className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                Project Nidus
              </span>
            </Link>
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 overflow-y-auto py-4 px-3">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="p-4 text-center text-sm text-red-600 dark:text-red-400">
                Error loading menu. Showing fallback menu.
              </div>
            ) : menuItems && menuItems.length > 0 ? (
              <div className="space-y-1">
                {menuItems.map((menuItem) => (
                  <SidebarMenuItem key={menuItem.id} menuItem={menuItem} />
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                No menu items available
              </div>
            )}
          </nav>

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-2">
            <Link
              to="/help"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Settings className="h-5 w-5" />
              <span>Settings</span>
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

