import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useMenu } from '../hooks/useMenu'
import { supabase, simDb } from '../services/supabaseClient'
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
  X,
  Shield,
  Mail,
  Briefcase,
  Layers,
  GitBranch,
  Target,
  Compass,
  Award,
  Users2,
  FileCheck,
  Lightbulb,
  Building2,
  BookOpen,
  FileText,
  Eye,
  ShoppingCart,
  Flag,
  FileWarning,
  FileClock,
  AlertTriangle,
  AlertCircle,
  ClipboardList,
  GraduationCap,
  Megaphone,
  Settings2,
  FileSpreadsheet,
  FilePlus,
  Pause,
  TrendingUp,
  Palette,
  Paintbrush,
  Type,
  History,
  Bot,
  CalendarClock,
  List,
  Network,
  GitMerge,
  BarChartHorizontal,
  UserCheck,
  UserPlus,
  MessageSquare,
  Video,
  DollarSign,
  Receipt,
  ClipboardCheck,
  SlidersHorizontal,
  FileBarChart,
  PieChart,
  BarChart2,
  Bookmark,
  ClockAlert,
  PauseCircle,
  Library,
  Package,
  Activity,
  Calendar,
  Wrench,
  FolderClosed,
} from 'lucide-react'
import { useThemeContext } from '../context/ThemeContext'
import { useBranding } from '../context/BrandingContext'
import { resolveMenuRoutePath, menuPathIsActive } from '../utils/sidebarRouteUtils'
import { useOpenPlanningFindingsCount } from '../hooks/useOpenPlanningFindingsCount'

// Icon mapping for menu items
const iconMap = {
  'layout-dashboard': LayoutDashboard,
  'folder-kanban': FolderKanban,
  'list-checks': CheckSquare,
  'check-square': CheckSquare,
  'users': Users,
  'chart-bar': BarChart,
  'settings': Settings,
  'shield': Shield,
  'mail': Mail,
  'briefcase': Briefcase,
  'layers': Layers,
  'git-branch': GitBranch,
  'target': Target,
  'compass': Compass,
  'award': Award,
  'users-2': Users2,
  'file-text': FileText,
  'file-check': FileCheck,
  'lightbulb': Lightbulb,
  'building-2': Building2,
  'book-open': BookOpen,
  // PMO-specific icons
  'eye': Eye,
  'shopping-cart': ShoppingCart,
  'flag': Flag,
  'file-warning': FileWarning,
  'file-clock': FileClock,
  'alert-triangle': AlertTriangle,
  'alert-circle': AlertCircle,
  'clipboard-list': ClipboardList,
  'graduation-cap': GraduationCap,
  'megaphone': Megaphone,
  'settings-2': Settings2,
  'file-spreadsheet': FileSpreadsheet,
  'file-plus': FilePlus,
  'pause': Pause,
  'trending-up': TrendingUp,
  'palette': Palette,
  'paintbrush': Paintbrush,
  'type': Type,
  'history': History,
  'bot': Bot,
  'calendar-clock': CalendarClock,
  'list': List,
  'network': Network,
  'git-merge': GitMerge,
  'bar-chart-horizontal': BarChartHorizontal,
  'user-check': UserCheck,
  'user-plus': UserPlus,
  'message-square': MessageSquare,
  'video': Video,
  'dollar-sign': DollarSign,
  'receipt': Receipt,
  'clipboard-check': ClipboardCheck,
  'sliders-horizontal': SlidersHorizontal,
  'file-bar-chart': FileBarChart,
  'pie-chart': PieChart,
  'bar-chart-2': BarChart2,
  'bookmark': Bookmark,
  'clock-alert': ClockAlert,
  'pause-circle': PauseCircle,
  'library': Library,
  'package': Package,
  'activity': Activity,
  'calendar': Calendar,
  'wrench': Wrench,
  'folder-closed': FolderClosed,
  'menu': Menu,
}

function SidebarMenuItem({ menuItem, level = 0, expandedMenuId = null, onToggleExpand = null, planningOpenFindingsCount = null }) {
  const location = useLocation()
  const { branding } = useBranding()
  const hasChildren = menuItem.children && menuItem.children.length > 0
  const resolvedPath = resolveMenuRoutePath(menuItem.route_path, location.pathname)
  const isChildActive = hasChildren && menuItem.children.some((child) => {
    if (!child.route_path) return false
    const r = resolveMenuRoutePath(child.route_path, location.pathname)
    return menuPathIsActive(location.pathname, r)
  })
  const [isExpandedLocal, setIsExpandedLocal] = useState(isChildActive)
  const isTopLevel = level === 0
  const expandedByParent = isTopLevel && hasChildren && onToggleExpand != null
    ? (expandedMenuId === menuItem.id) || isChildActive
    : undefined
  const expanded = expandedByParent !== undefined
    ? expandedByParent
    : (isExpandedLocal || isChildActive)
  // Treat a menu item as active ONLY when its route_path matches exactly.
  // This prevents all siblings in a section from appearing active at once.
  const isActive = !!menuItem.route_path && menuPathIsActive(location.pathname, resolvedPath)

  const Icon = iconMap[menuItem.menu_icon] || LayoutDashboard

  // Brand active colour (item-level override > brand colour > blue fallback)
  const brandActiveColor = menuItem.menu_color || branding?.sidebar_active_color || '#3B82F6'
  const brandTextColor   = branding?.sidebar_text_color || null

  const routePath = menuItem.route_path || ''
  const isPlanIntelligenceNav =
    menuItem.menu_code === 'planning_intelligence' ||
    menuItem.menu_code === 'pmo_intel_rules' ||
    /planning\/intelligence/i.test(routePath)

  let badgeText = menuItem.badge_text?.trim?.() ? menuItem.badge_text.trim() : null
  let badgeColorResolved = menuItem.badge_color || '#EF4444'
  if (
    isPlanIntelligenceNav &&
    typeof planningOpenFindingsCount === 'number' &&
    planningOpenFindingsCount > 0
  ) {
    badgeText = planningOpenFindingsCount > 99 ? '99+' : String(planningOpenFindingsCount)
    badgeColorResolved = menuItem.badge_color || '#D97706'
  }

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

  const activeStyle = isActive ? { backgroundColor: brandActiveColor, color: '#ffffff' } : {}
  const inactiveClass = 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
  const textStyle = (!isActive && brandTextColor) ? { color: brandTextColor } : {}

  return (
    <div>
      {menuItem.external_url ? (
        <a
          href={menuItem.external_url}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
            isActive ? '' : inactiveClass
          }`}
          style={{ ...activeStyle, ...textStyle }}
        >
          <Icon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
          <span className="flex-1">{menuItem.menu_label}</span>
          {badgeText && (
            <span
              className="px-2 py-0.5 text-xs rounded-full font-medium text-white"
              style={{ backgroundColor: badgeColorResolved }}
            >
              {badgeText}
            </span>
          )}
        </a>
      ) : (
        <Link
          to={
            !menuItem.route_path
              ? '#'
              : resolvedPath === '/'
                ? '/platform/dashboard'
                : resolvedPath
          }
          onClick={handleClick}
          className={`flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
            isActive ? '' : inactiveClass
          }`}
          style={{ ...activeStyle, ...textStyle }}
        >
          <Icon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
          <span className="flex-1">{menuItem.menu_label}</span>
          {badgeText && (
            <span
              className="px-2 py-0.5 text-xs rounded-full font-medium text-white"
              style={{ backgroundColor: badgeColorResolved }}
            >
              {badgeText}
            </span>
          )}
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
      )}
      {hasChildren && expanded && (
        <div className={`ml-4 mt-1 space-y-1 border-l-2 pl-2 ${
          isActive ? '' : 'border-gray-200 dark:border-gray-700'
        }`}
          style={isActive ? { borderColor: brandActiveColor } : {}}
        >
          {menuItem.children.map((child) => (
            <SidebarMenuItem
              key={child.id}
              menuItem={child}
              level={level + 1}
              expandedMenuId={expandedMenuId}
              onToggleExpand={onToggleExpand}
              planningOpenFindingsCount={planningOpenFindingsCount}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Sidebar({ isOpen, onClose }) {
  const { menuItems, loading, error, refetch } = useMenu()
  const navigate = useNavigate()
  const { theme } = useThemeContext()
  const { branding } = useBranding()
  const location = useLocation()
  const [loggingOut, setLoggingOut] = useState(false)
  const [expandedMenuId, setExpandedMenuId] = useState(null)
  const planningOpenFindingsCount = useOpenPlanningFindingsCount(!location.pathname.startsWith('/simulator'))

  const handleToggleExpand = (id) => {
    setExpandedMenuId((prev) => (prev === id ? null : id))
  }

  const handleLogout = async () => {
    if (loggingOut) return
    try {
      setLoggingOut(true)
      const path = location.pathname || ''
      if (path.startsWith('/simulator')) {
        await simDb.auth.signOut()
        navigate('/simulator/login', { replace: true })
      } else {
        await supabase.auth.signOut()
        navigate('/platform/login', { replace: true })
      }
    } catch (err) {
      console.error('Logout error:', err)
      setLoggingOut(false)
    }
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

      {/* Sidebar - Positioned below header */}
      <aside
        className={`
          fixed top-14 sm:top-16 left-0 h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] w-64 sm:w-72 shadow-lg z-40
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:h-[calc(100vh-4rem)] lg:w-80
          ${!branding?.sidebar_bg_color ? 'bg-white dark:bg-gray-900' : ''}
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={branding?.sidebar_bg_color
          ? { backgroundColor: branding.sidebar_bg_color }
          : undefined
        }
        aria-label="Sidebar navigation"
      >
        <div className="flex flex-col h-full">
          {/* Close Button - Mobile only */}
          <div className="flex items-center justify-end p-4 border-b border-gray-200 dark:border-gray-700 lg:hidden">
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 overflow-y-auto py-4 px-3">
            {error && (
              <div
                className="mb-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm space-y-2"
                role="alert"
              >
                <p>{error}</p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="text-sm font-medium underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-amber-400 rounded"
                >
                  Retry
                </button>
              </div>
            )}
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : menuItems && menuItems.length > 0 ? (
              <div className="space-y-1">
                {menuItems
                  .filter((menuItem) => {
                    // Show only menu items for current app context (Platform vs Simulator)
                    const pathname = location.pathname || ''
                    const routePath = menuItem.route_path || ''
                    if (pathname.startsWith('/simulator')) {
                      const isSimRoute = !routePath.trim() || routePath.startsWith('/simulator')
                      if (!isSimRoute) return false
                    } else {
                      // Platform context: /platform, /pmo, /pm, or section parents with no route_path
                      const isPlatformRoute = routePath.startsWith('/platform') ||
                        routePath.startsWith('/pmo') ||
                        routePath.startsWith('/pm') ||
                        !routePath.trim()
                      if (!isPlatformRoute) return false
                    }
                    // Filter out red-circled sections: Administration (but NOT PMO Admin), Settings, Help, Support
                    const label = menuItem.menu_label?.toLowerCase() || ''
                    const code = menuItem.menu_code?.toLowerCase() || ''
                    if (label === 'pmo admin' || code === 'pmo_admin_section') {
                      return true
                    }
                    return !(
                      (label === 'administration' || code === 'administration') ||
                      (label === 'settings' || code === 'settings') ||
                      (label === 'help' || code === 'help') ||
                      (label === 'support' || code === 'support')
                    )
                  })
                  .map((menuItem) => (
                    <SidebarMenuItem
                      key={menuItem.id}
                      menuItem={menuItem}
                      level={0}
                      expandedMenuId={expandedMenuId}
                      onToggleExpand={handleToggleExpand}
                      planningOpenFindingsCount={planningOpenFindingsCount}
                    />
                  ))}
              </div>
            ) : !error ? (
              <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                No menu items available
              </div>
            ) : null}
          </nav>

          {/* Footer - Logout */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <LogOut className={`h-5 w-5 ${loggingOut ? 'animate-pulse' : ''}`} />
              <span>{loggingOut ? 'Signing out...' : 'Logout'}</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

