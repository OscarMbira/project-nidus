import { useState, useMemo, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useMenu } from '@nidus/shared/hooks/useMenu'
import { useSimMenu } from '@nidus/shared/hooks/useSimMenu'
import { performLogout, getLogoutRedirectPath } from '../services/authLogoutService'
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
  PlayCircle,
  Map,
  Zap,
  CheckCircle,
  FileBox,
} from 'lucide-react'
import { useThemeContext } from '@nidus/shared/context/ThemeContext'
import { useBranding } from '@nidus/shared/context/BrandingContext'
import { resolveMenuRoutePath, resolveMenuRoutePathForLayout, menuPathIsActive } from '@nidus/shared/utils/sidebarRouteUtils'
import { persistMenuLayoutScope } from '@nidus/shared/utils/menuLayoutUtils'
import { resolveSidebarThemeTokens } from '@nidus/shared/utils/sidebarThemeUtils'
import { getSidebarNestedRowPadding } from '@nidus/shared/utils/sidebarNavUtils'
import { useOpenPlanningFindingsCount } from '@nidus/shared/hooks/useOpenPlanningFindingsCount'
import { SidebarNavTier, SidebarNavNestedRow } from '@nidus/ui'
import MethodologySwitcher from './ui/MethodologySwitcher'

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
  'layout-template': Layers,
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
  'play-circle': PlayCircle,
  'map': Map,
  'zap': Zap,
  'check-circle': CheckCircle,
  'file-box': FileBox,
  'menu': Menu,
  'bar-chart-3': BarChart,
  'brain': Lightbulb,
  'cpu': Bot,
  'sliders': SlidersHorizontal,
  'search-code': Target,
}

function getMenuNodeKey(menuItem) {
  return menuItem?.id ?? menuItem?.menu_code ?? String(menuItem?.menu_label ?? '')
}

function menuNodeContainsActive(node, location) {
  if (!node) return false
  if (node.route_path) {
    const r = resolveMenuRoutePath(node.route_path, location.pathname)
    if (menuPathIsActive(location.pathname, r, location.search)) return true
  }
  return (node.children || []).some((child) => menuNodeContainsActive(child, location))
}

function findAutoExpandTopLevelKey(items = [], location) {
  for (const item of items) {
    if (item.is_methodology_header) {
      if ((item.children || []).some((child) => menuNodeContainsActive(child, location))) {
        return getMenuNodeKey(item)
      }
      continue
    }
    if (item.children?.length && menuNodeContainsActive(item, location)) {
      return getMenuNodeKey(item)
    }
  }
  return null
}

function SidebarMenuItem({
  menuItem,
  level = 0,
  expandedMenuId = null,
  onToggleExpand = null,
  planningOpenFindingsCount = null,
  sidebarTokens = null,
  menuLayout = null,
}) {
  const location = useLocation()
  const { branding } = useBranding()
  const tokens = sidebarTokens || resolveSidebarThemeTokens('dark', branding)
  const hasChildren = menuItem.children && menuItem.children.length > 0
  const isMethodologySection = menuItem.is_methodology_header && level === 0

  if (isMethodologySection) {
    const nodeKey = getMenuNodeKey(menuItem)
    const isChildActive = hasChildren && menuItem.children.some((child) => menuNodeContainsActive(child, location))
    const usesAccordion = hasChildren && onToggleExpand != null
    const [isExpandedLocal, setIsExpandedLocal] = useState(() => isChildActive)

    useEffect(() => {
      if (usesAccordion) return
      if (isChildActive) setIsExpandedLocal(true)
    }, [location.pathname, location.search, usesAccordion, isChildActive])

    const expanded = usesAccordion ? expandedMenuId === nodeKey : isExpandedLocal
    const trackIconMap = { structured: Shield, standards_based: Settings2, agile: Zap }
    const TrackIcon = trackIconMap[menuItem.methodology_track] || iconMap[menuItem.menu_icon] || Shield
    const accent = menuItem.menu_color || '#3B82F6'
    const badgeText = menuItem.badge_text || 'S'

    const handleSectionClick = (e) => {
      e.preventDefault()
      if (usesAccordion && onToggleExpand) {
        onToggleExpand(nodeKey)
      } else {
        setIsExpandedLocal((prev) => !prev)
      }
    }

    const sectionActiveStyle = isChildActive
      ? { backgroundColor: accent, color: tokens.activeTextColor }
      : {}
    const sectionClassName = `group flex items-center gap-2 sm:gap-3 ${getSidebarNestedRowPadding(level)} py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors w-full ${
      isChildActive ? 'shadow-sm' : tokens.sectionParentClass
    }`

    return (
      <div className="mb-1">
        <SidebarNavNestedRow level={level}>
          <button
            type="button"
            onClick={handleSectionClick}
            className={sectionClassName}
            style={sectionActiveStyle}
            aria-expanded={expanded}
          >
            <span
              className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded text-white"
              style={{ backgroundColor: accent }}
              aria-hidden
            >
              [{badgeText}]
            </span>
            <TrackIcon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-current opacity-90" />
            <span className="flex-1 truncate text-left">{menuItem.menu_label}</span>
            {hasChildren && (
              <span className={`ml-auto ${isChildActive ? 'text-current' : tokens.chevronClass}`}>
                {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </span>
            )}
          </button>
        </SidebarNavNestedRow>
        {hasChildren && expanded && (
          <SidebarNavTier
            borderClassName={isChildActive ? '' : tokens.childBorderClass}
            style={isChildActive ? { borderLeftColor: accent } : undefined}
          >
            {(menuItem.children || []).map((child) => (
              <SidebarMenuItem
                key={getMenuNodeKey(child)}
                menuItem={child}
                level={level + 1}
                expandedMenuId={expandedMenuId}
                onToggleExpand={onToggleExpand}
                planningOpenFindingsCount={planningOpenFindingsCount}
                sidebarTokens={tokens}
                menuLayout={menuLayout}
              />
            ))}
          </SidebarNavTier>
        )}
      </div>
    )
  }

  const resolvedPath = resolveMenuRoutePathForLayout(menuItem.route_path, location.pathname, menuLayout)
  const isNodeOrDescendantActive = (node) => {
    if (!node) return false
    if (node.route_path) {
      const r = resolveMenuRoutePathForLayout(node.route_path, location.pathname, menuLayout)
      if (menuPathIsActive(location.pathname, r, location.search)) return true
    }
    return (node.children || []).some(isNodeOrDescendantActive)
  }
  const isChildActive = hasChildren && menuItem.children.some(isNodeOrDescendantActive)
  const nodeKey = getMenuNodeKey(menuItem)
  const isTopLevel = level === 0
  const usesAccordion = isTopLevel && hasChildren && onToggleExpand != null
  // Treat a menu item as active ONLY when its route_path matches exactly.
  // This prevents all siblings in a section from appearing active at once.
  const isActive = !!menuItem.route_path && menuPathIsActive(location.pathname, resolvedPath, location.search)
  // Nested navigable parents (e.g. Template Library under Portfolio & Delivery) must
  // open when the parent itself is selected — not only when a Forms/Templates child is.
  const shouldExpandLocal = isChildActive || (hasChildren && isActive)
  const [isExpandedLocal, setIsExpandedLocal] = useState(() => shouldExpandLocal)

  useEffect(() => {
    if (usesAccordion) return
    if (shouldExpandLocal) setIsExpandedLocal(true)
  }, [location.pathname, location.search, usesAccordion, shouldExpandLocal])

  const expanded = usesAccordion ? expandedMenuId === nodeKey : isExpandedLocal

  const Icon = iconMap[menuItem.menu_icon] || LayoutDashboard

  const brandActiveColor = menuItem.menu_color || tokens.activeBackgroundColor
  const isSectionParent = hasChildren && !String(menuItem.route_path || '').trim()

  const routePath = menuItem.route_path || ''
  const isPlanIntelligenceNav =
    menuItem.menu_code === 'planning_intelligence' ||
    menuItem.menu_code === 'pmo_intel_rules' ||
    menuItem.menu_code === 'plat_plan_intel_rules' ||
    /planning\/intelligence-rules/i.test(routePath) ||
    /\/pmo\/planning\/intelligence\/?$/i.test(routePath)

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

  const hasOwnRoute = Boolean(String(menuItem.route_path || '').trim())

  const toggleExpand = () => {
    if (usesAccordion && onToggleExpand) {
      onToggleExpand(nodeKey)
    } else {
      setIsExpandedLocal((prev) => !prev)
    }
  }

  const handleClick = (e) => {
    // Section parents (no route): click only expands/collapses.
    // Navigable parents with children (v851 Templates): allow navigation; chevron toggles.
    if (hasChildren && !hasOwnRoute) {
      e.preventDefault()
      toggleExpand()
      return
    }
    if (menuLayout === 'pm') {
      persistMenuLayoutScope('pm')
    } else if (menuLayout === 'pmo') {
      persistMenuLayoutScope('pmo')
    }
  }

  const handleChevronClick = (e) => {
    if (!hasChildren) return
    e.preventDefault()
    e.stopPropagation()
    toggleExpand()
  }

  const activeStyle = isActive
    ? { backgroundColor: brandActiveColor, color: tokens.activeTextColor }
    : {}
  const inactiveClass = isSectionParent ? tokens.sectionParentClass : tokens.inactiveItemClass
  const textStyle =
    !isActive && tokens.useBrandInactiveText && tokens.brandInactiveTextColor
      ? { color: tokens.brandInactiveTextColor }
      : {}

  const itemClassName = `group flex items-center gap-2 sm:gap-3 ${getSidebarNestedRowPadding(level)} py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
    isActive ? 'shadow-sm' : inactiveClass
  }`

  return (
    <div>
      {menuItem.external_url ? (
        <SidebarNavNestedRow level={level}>
          <a
            href={menuItem.external_url}
            target="_blank"
            rel="noopener noreferrer"
            className={itemClassName}
            style={{ ...activeStyle, ...textStyle }}
          >
            <Icon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-current opacity-90" />
            <span className={`flex-1 ${menuItem.canUse === false ? 'opacity-75' : ''}`}>{menuItem.menu_label}</span>
            {menuItem.canUse === false && (
              <Eye className="h-3.5 w-3.5 flex-shrink-0 opacity-60" aria-label="View only" title="View only" />
            )}
            {badgeText && (
              <span
                className="px-2 py-0.5 text-xs rounded-full font-medium text-white"
                style={{ backgroundColor: badgeColorResolved }}
              >
                {badgeText}
              </span>
            )}
          </a>
        </SidebarNavNestedRow>
      ) : (
        <SidebarNavNestedRow level={level}>
          <Link
            to={
              !menuItem.route_path
                ? '#'
                : resolvedPath === '/'
                  ? '/platform/dashboard'
                  : resolvedPath
            }
            onClick={handleClick}
            className={itemClassName}
            style={{ ...activeStyle, ...textStyle }}
          >
            <Icon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-current opacity-90" />
            <span className={`flex-1 ${menuItem.canUse === false ? 'opacity-75' : ''}`}>{menuItem.menu_label}</span>
            {menuItem.canUse === false && (
              <Eye className="h-3.5 w-3.5 flex-shrink-0 opacity-60" aria-label="View only" title="View only" />
            )}
            {badgeText && (
              <span
                className="px-2 py-0.5 text-xs rounded-full font-medium text-white"
                style={{ backgroundColor: badgeColorResolved }}
              >
                {badgeText}
              </span>
            )}
            {hasChildren && (
              <span
                role="button"
                tabIndex={0}
                aria-label={expanded ? 'Collapse submenu' : 'Expand submenu'}
                onClick={handleChevronClick}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleChevronClick(e)
                  }
                }}
                className={`ml-auto ${isActive ? 'text-current' : tokens.chevronClass}`}
              >
                {expanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </span>
            )}
          </Link>
        </SidebarNavNestedRow>
      )}
      {hasChildren && expanded && (
        <SidebarNavTier
          borderClassName={isActive ? '' : tokens.childBorderClass}
          style={isActive ? { borderColor: brandActiveColor } : {}}
        >
          {menuItem.children.map((child) => (
            <SidebarMenuItem
              key={getMenuNodeKey(child)}
              menuItem={child}
              level={level + 1}
              expandedMenuId={expandedMenuId}
              onToggleExpand={onToggleExpand}
              planningOpenFindingsCount={planningOpenFindingsCount}
              sidebarTokens={tokens}
              menuLayout={menuLayout}
            />
          ))}
        </SidebarNavTier>
      )}
    </div>
  )
}

export default function Sidebar({ isOpen, onClose, simulatorScope = null }) {
  const platformMenu = useMenu()
  const simMenu = useSimMenu(simulatorScope || 'pmo', !!simulatorScope)
  const { menuItems, loading, error, refetch, layoutHint } = simulatorScope ? simMenu : platformMenu
  const showMethodologySwitcher =
    !simulatorScope && (layoutHint?.layout === 'pmo' || layoutHint?.layout === 'pm')
  const navigate = useNavigate()
  const { theme } = useThemeContext()
  const { branding } = useBranding()
  const sidebarTokens = useMemo(
    () => resolveSidebarThemeTokens(theme, branding),
    [theme, branding]
  )
  const location = useLocation()
  const [loggingOut, setLoggingOut] = useState(false)
  const [expandedMenuId, setExpandedMenuId] = useState(null)
  const lastAutoExpandPathRef = useRef('')
  const planningOpenFindingsCount = useOpenPlanningFindingsCount(!simulatorScope && !location.pathname.startsWith('/simulator'))
  const isSimulatorContext = !!simulatorScope || (location.pathname || '').startsWith('/simulator')

  const routeMatchesContext = (routePath) => {
    const route = (routePath || '').trim()
    if (!route) return true
    if (isSimulatorContext) return route.startsWith('/simulator')
    // Keep all non-simulator routes in platform context.
    // Some valid DB routes are absolute paths that do not start with /platform|/pmo|/pm.
    return !route.startsWith('/simulator')
  }

  const pruneMenuTreeByContext = (items = []) => {
    return items
      .map((item) => {
        const children = Array.isArray(item.children) ? pruneMenuTreeByContext(item.children) : []
        const hasChildren = children.length > 0
        const ownRouteOk = routeMatchesContext(item.route_path)
        // Keep section headers only when at least one child is valid in current context.
        if (!String(item.route_path || '').trim() && !hasChildren) {
          const code = String(item?.menu_code || '').trim()
          if (code && !item?.is_methodology_header) return { ...item, children: [] }
          return null
        }
        if (String(item.route_path || '').trim() && !ownRouteOk) {
          if (!hasChildren) return null
          return { ...item, route_path: null, children }
        }
        return { ...item, children: hasChildren ? children : item.children }
      })
      .filter(Boolean)
  }
  const prunedMenuItems = useMemo(
    () => pruneMenuTreeByContext(menuItems || []),
    [menuItems, isSimulatorContext]
  )

  const handleToggleExpand = (id) => {
    setExpandedMenuId((prev) => (prev === id ? null : id))
  }

  useEffect(() => {
    if (loading || prunedMenuItems.length === 0) return
    const pathKey = `${location.pathname}${location.search}`
    if (lastAutoExpandPathRef.current === pathKey) return
    lastAutoExpandPathRef.current = pathKey
    const activeKey = findAutoExpandTopLevelKey(prunedMenuItems, location)
    if (activeKey) setExpandedMenuId(activeKey)
  }, [location.pathname, location.search, prunedMenuItems, loading])

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    const path = location.pathname || ''
    const simulator = path.startsWith('/simulator')
    try {
      await performLogout({ simulator })
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      navigate(getLogoutRedirectPath(path), { replace: true })
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
          ${sidebarTokens.asideClass}
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={sidebarTokens.asideStyle}
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
            {showMethodologySwitcher && !loading && (
              <MethodologySwitcher onChange={() => refetch?.()} />
            )}
            {error && (
              <div
                className="mb-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm space-y-2"
                role="alert"
              >
                <p>{error}</p>
                <button
                  type="button"
                  onClick={() => refetch?.()}
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
            ) : prunedMenuItems.length > 0 ? (
              <div className="space-y-1">
                {prunedMenuItems
                  .map((menuItem) => (
                    <SidebarMenuItem
                      key={getMenuNodeKey(menuItem)}
                      menuItem={menuItem}
                      level={0}
                      expandedMenuId={expandedMenuId}
                      onToggleExpand={handleToggleExpand}
                      planningOpenFindingsCount={planningOpenFindingsCount}
                      sidebarTokens={sidebarTokens}
                      menuLayout={layoutHint?.layout}
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
          <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4">
            <button
              type="button"
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

