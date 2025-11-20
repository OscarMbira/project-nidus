import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useMenu } from '../hooks/useMenu'

function MenuItem({ menuItem, level = 0 }) {
  const location = useLocation()
  const [isExpanded, setIsExpanded] = useState(false)
  const hasChildren = menuItem.children && menuItem.children.length > 0
  const isActive = location.pathname === menuItem.route_path || 
                   (menuItem.route_path && location.pathname.startsWith(menuItem.route_path + '/'))

  const handleClick = (e) => {
    if (hasChildren) {
      e.preventDefault()
      setIsExpanded(!isExpanded)
    }
  }

  const menuContent = (
    <>
      {menuItem.menu_icon && (
        <span className="mr-2 text-base" style={{ color: menuItem.menu_color || '#6B7280' }}>
          {/* Icon placeholder - you can use an icon library like react-icons or heroicons */}
          {menuItem.menu_icon === 'layout-dashboard' && '📊'}
          {menuItem.menu_icon === 'folder-kanban' && '📁'}
          {menuItem.menu_icon === 'list-checks' && '✓'}
          {menuItem.menu_icon === 'users' && '👥'}
          {menuItem.menu_icon === 'chart-bar' && '📈'}
          {menuItem.menu_icon === 'settings' && '⚙️'}
          {!['layout-dashboard', 'folder-kanban', 'list-checks', 'users', 'chart-bar', 'settings'].includes(menuItem.menu_icon) && '•'}
        </span>
      )}
      <span>{menuItem.menu_label}</span>
      {menuItem.badge_text && (
        <span
          className="ml-2 px-2 py-0.5 text-xs rounded-full font-medium"
          style={{ backgroundColor: menuItem.badge_color || '#EF4444', color: 'white' }}
        >
          {menuItem.badge_text}
        </span>
      )}
      {hasChildren && (
        <span className="ml-auto text-xs">
          {isExpanded ? '▼' : '▶'}
        </span>
      )}
    </>
  )

  if (menuItem.external_url) {
    return (
      <a
        href={menuItem.external_url}
        target="_blank"
        rel="noopener noreferrer"
        className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          isActive
            ? 'bg-blue-600 text-white'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
        style={isActive && menuItem.menu_color ? { backgroundColor: menuItem.menu_color } : {}}
      >
        {menuContent}
      </a>
    )
  }

  if (!menuItem.route_path && !hasChildren) {
    return null
  }

  return (
    <div>
      <Link
        to={menuItem.route_path || '#'}
        onClick={handleClick}
        className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          isActive
            ? 'bg-blue-600 text-white'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
        style={isActive && menuItem.menu_color ? { backgroundColor: menuItem.menu_color } : {}}
      >
        {menuContent}
      </Link>
      {hasChildren && isExpanded && (
        <div className={`ml-4 mt-1 space-y-1 border-l-2 ${isActive ? 'border-blue-600' : 'border-gray-200 dark:border-gray-700'}`}>
          {menuItem.children.map((child) => (
            <MenuItem key={child.id} menuItem={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function DynamicMenu() {
  const { menuItems, loading, error } = useMenu()

  if (loading) {
    return (
      <nav className="flex space-x-4">
        <div className="animate-pulse">
          <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </nav>
    )
  }

  if (error) {
    console.error('Menu error:', error)
    // Fallback to static menu if dynamic menu fails
    return (
      <nav className="flex space-x-4">
        <Link
          to="/dashboard"
          className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          Dashboard
        </Link>
        <Link
          to="/projects"
          className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          Projects
        </Link>
        <Link
          to="/tasks"
          className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          Tasks
        </Link>
      </nav>
    )
  }

  if (!menuItems || menuItems.length === 0) {
    return (
      <nav className="flex space-x-4">
        <span className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
          No menu items available
        </span>
      </nav>
    )
  }

  return (
    <nav className="flex flex-wrap items-center gap-1">
      {menuItems.map((menuItem) => (
        <MenuItem key={menuItem.id} menuItem={menuItem} />
      ))}
    </nav>
  )
}

