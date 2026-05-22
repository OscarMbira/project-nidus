import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { performLogout, getLogoutRedirectPath } from '../../../services/authLogoutService'
import { ChevronRight, ChevronDown, LogOut, X, UserCheck } from 'lucide-react'
import simulatorTMMenuConfig from '../../../config/simulatorTMMenuConfig'

function TMSidebarMenuItem({ menuItem, level = 0, expandedMenuId = null, onToggleExpand = null }) {
  const location = useLocation()
  const [isExpandedLocal, setIsExpandedLocal] = useState(false)
  const hasChildren = menuItem.children && menuItem.children.length > 0
  const isActive = menuItem.path && (
    location.pathname === menuItem.path ||
    location.pathname.startsWith(menuItem.path + '/')
  )
  const isChildActive = hasChildren && menuItem.children.some(
    child => location.pathname === child.path || location.pathname.startsWith((child.path || '') + '/')
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
            ? 'bg-emerald-600 text-white'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
      >
        {Icon && <Icon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />}
        <span className="flex-1 truncate">{menuItem.label}</span>
        {hasChildren && (
          <span className="ml-auto">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
        )}
      </Link>
      {hasChildren && expanded && (
        <div className="mt-1 ml-3 sm:ml-4 pl-2 sm:pl-3 border-l border-gray-200 dark:border-gray-600 space-y-0.5">
          {menuItem.children.map((child) => (
            <TMSidebarMenuItem key={child.id} menuItem={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function SimulatorTMSidebar({ isOpen, onClose }) {
  const [expandedMenuId, setExpandedMenuId] = useState(null)

  const handleToggleExpand = (menuId) => {
    setExpandedMenuId((prev) => (prev === menuId ? null : menuId))
  }

  const handleLogout = async () => {
    const redirectPath = await getLogoutRedirectPath()
    await performLogout()
    window.location.href = redirectPath
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed top-0 left-0 z-30 h-full w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } lg:static lg:z-auto lg:transform-none`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-emerald-500" />
            <span className="font-semibold text-gray-900 dark:text-white text-sm">Team Member</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {simulatorTMMenuConfig.map((item) => (
            <TMSidebarMenuItem
              key={item.id}
              menuItem={item}
              level={0}
              expandedMenuId={expandedMenuId}
              onToggleExpand={handleToggleExpand}
            />
          ))}
        </nav>

        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>
    </>
  )
}
