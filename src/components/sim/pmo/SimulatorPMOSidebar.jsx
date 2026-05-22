import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { performLogout, getLogoutRedirectPath } from '../../../services/authLogoutService'
import { ChevronRight, ChevronDown, LogOut, X, Shield } from 'lucide-react'
import simulatorPMOMenuConfig from '../../../config/simulatorPMOMenuConfig'

function SimulatorPMOSidebarMenuItem({ menuItem, level = 0, expandedMenuId = null, onToggleExpand = null }) {
  const location = useLocation()
  const [isExpandedLocal, setIsExpandedLocal] = useState(false)
  const hasChildren = menuItem.children && menuItem.children.length > 0
  const isActive = menuItem.path && (
    location.pathname === menuItem.path ||
    location.pathname.startsWith(menuItem.path + '/')
  )

  const isChildActive = hasChildren && menuItem.children.some(
    child => location.pathname === child.path || location.pathname.startsWith(child.path + '/')
  )

  const isTopLevel = level === 0
  const expandedByParent = isTopLevel && hasChildren && onToggleExpand != null
    ? (expandedMenuId === menuItem.id) || isChildActive
    : undefined
  const expanded = expandedByParent !== undefined ? expandedByParent : (isExpandedLocal || isChildActive)
  const Icon = menuItem.icon

  const handleClick = (e) => {
    if (hasChildren) {
      e.preventDefault()
      if (isTopLevel && onToggleExpand) {
        onToggleExpand(menuItem.id)
      } else {
        setIsExpandedLocal((prev) => !prev)
      }
    }
  }

  return (
    <div>
      <Link
        to={menuItem.path || '#'}
        onClick={handleClick}
        className={`flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
          isActive
            ? 'bg-indigo-600 text-white'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
      >
        <Icon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
        <span className="flex-1 truncate">{menuItem.label}</span>
        {hasChildren && (
          <span className="ml-auto">
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </span>
        )}
      </Link>
      {hasChildren && expanded && (
        <div className={`ml-4 mt-1 space-y-1 border-l-2 pl-2 ${
          isChildActive ? 'border-indigo-600' : 'border-gray-200 dark:border-gray-700'
        }`}>
          {menuItem.children.map((child) => (
            <SimulatorPMOSidebarMenuItem key={child.id} menuItem={child} level={level + 1} expandedMenuId={expandedMenuId} onToggleExpand={onToggleExpand} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function SimulatorPMOSidebar({ isOpen, onClose }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [expandedMenuId, setExpandedMenuId] = useState(null)
  const [loggingOut, setLoggingOut] = useState(false)
  const handleToggleExpand = (id) => setExpandedMenuId((prev) => (prev === id ? null : id))

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    onClose?.()
    try {
      await performLogout({ simulator: true })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      navigate(getLogoutRedirectPath(location.pathname), { replace: true })
      setLoggingOut(false)
    }
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
          fixed top-14 sm:top-16 left-0 h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] w-64 sm:w-72 bg-white dark:bg-gray-800 shadow-lg z-40
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:h-[calc(100vh-4rem)] lg:w-64
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        aria-label="Practice PMO Dashboard navigation"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Practice PMO Dashboard</span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 lg:hidden"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 overflow-y-auto py-4 px-3">
            <div className="space-y-1">
              {simulatorPMOMenuConfig.map((menuItem) => (
                <SimulatorPMOSidebarMenuItem key={menuItem.id} menuItem={menuItem} level={0} expandedMenuId={expandedMenuId} onToggleExpand={handleToggleExpand} />
              ))}
            </div>
          </nav>

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              aria-busy={loggingOut}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <LogOut className={`h-5 w-5 flex-shrink-0 ${loggingOut ? 'animate-pulse' : ''}`} />
              <span>{loggingOut ? 'Signing out…' : 'Logout'}</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
