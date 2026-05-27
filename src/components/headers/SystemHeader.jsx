/**
 * System Header Component
 * 
 * Base header component for Platform and Simulator systems
 * Provides consistent structure with customization options
 */

import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Bell, Search, User, LogOut, Settings, ChevronDown, X, Menu, Smartphone } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'
import { performLogout, getLogoutRedirectPath } from '../../services/authLogoutService'
import ThemeToggle from '../ThemeToggle'
import { getUnreadCount } from '../../utils/notificationUtils'
import { normalizeDashboardTab } from '../../utils/pmoDashboardTabs'
import { useBranding } from '../../context/BrandingContext'
import GlobalSearchModal, { useGlobalSearchShortcut } from '../../modules/pmis-gaps/components/GlobalSearchModal'

export default function SystemHeader({
  systemName = 'Platform', // 'Platform' or 'Simulator'
  systemIcon: SystemIcon = null, // Optional custom icon component
  logoBgColor = 'bg-blue-600', // Background color for logo
  headerBgClass = 'bg-white dark:bg-gray-900', // Header background
  textColor = 'text-gray-900 dark:text-white', // Text color
  subtextColor = 'text-gray-600 dark:text-gray-400', // Subtext color
  hoverBgClass = 'hover:bg-gray-100 dark:hover:bg-gray-700', // Hover background
  borderColor = 'border-gray-200 dark:border-gray-800', // Border color
  dashboardPath = '/platform/dashboard', // Dashboard path
  settingsPath = '/platform/settings', // Settings path
  profilePath = '/platform/profile', // Profile path
  /** If set, shows "App install" in the user menu (PWA settings). */
  pwaSettingsPath = null,
  navLinks = [], // Array of navigation links: [{ label: 'Dashboard', path: '/dashboard' }, ...]
  onSidebarToggle = null, // Optional sidebar toggle function for mobile
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const { branding } = useBranding()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [user, setUser] = useState(null)
  const [userInitials, setUserInitials] = useState('U')
  const [unreadCount, setUnreadCount] = useState(0)
  const [searchOpen, setSearchOpen] = useState(false)
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const isSimulator = systemName === 'Simulator'
  useGlobalSearchShortcut(() => setGlobalSearchOpen(true))

  useEffect(() => {
    fetchUser()
    fetchUnreadCount()
    
    // Refresh notification count every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000)
    
    // Close menu when clicking outside
    const handleClickOutside = (event) => {
      if (userMenuOpen && !event.target.closest('.user-menu-container')) {
        setUserMenuOpen(false)
      }
      if (mobileNavOpen && !event.target.closest('.mobile-nav-container')) {
        setMobileNavOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
      clearInterval(interval)
    }
  }, [userMenuOpen, mobileNavOpen])

  const fetchUser = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (currentUser) {
        setUser(currentUser)
        // Get user initials from email or name
        const email = currentUser.email || ''
        const name = currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || ''
        
        if (name) {
          const parts = name.split(' ')
          if (parts.length >= 2) {
            setUserInitials((parts[0][0] + parts[parts.length - 1][0]).toUpperCase())
          } else {
            setUserInitials(name.substring(0, 2).toUpperCase())
          }
        } else if (email) {
          setUserInitials(email.substring(0, 2).toUpperCase())
        }
      }
    } catch (error) {
      console.error('Error fetching user:', error)
    }
  }

  const fetchUnreadCount = async () => {
    try {
      const count = await getUnreadCount()
      setUnreadCount(count)
    } catch (error) {
      console.error('Error fetching unread count:', error)
    }
  }

  const handleLogout = async () => {
    try {
      const simulator = (location.pathname || '').startsWith('/simulator')
      await performLogout({ simulator })
    } catch (error) {
      console.error('Error logging out:', error)
    } finally {
      navigate(getLogoutRedirectPath(location.pathname), { replace: true })
    }
  }

  const isActiveLink = (path) => {
    // Normalize paths for comparison
    const currentPath = location.pathname
    const normalizedPath = path.replace(/\/$/, '') // Remove trailing slash
    const dashNorm = dashboardPath.replace(/\/$/, '')

    // For dashboard, check exact match or if we're at the base path
    if (path === dashboardPath || path.includes('/dashboard')) {
      // PMO unified dashboard: top-nav "Dashboard" highlights only Overview (?tab omitted / overview).
      if (path === dashboardPath && currentPath === dashNorm) {
        const tab = normalizeDashboardTab(new URLSearchParams(location.search.replace(/^\?/, '')).get('tab'))
        return tab === 'overview'
      }
      return currentPath === path ||
             currentPath === normalizedPath ||
             currentPath === path.replace('/dashboard', '') ||
             (currentPath.startsWith('/platform') && path === '/platform/dashboard' && currentPath === '/platform') ||
             (currentPath.startsWith('/simulator') && path === '/simulator/dashboard' && currentPath === '/simulator')
    }
    
    // For other paths, check if current path starts with the link path
    return currentPath === path || currentPath.startsWith(normalizedPath + '/') || currentPath === normalizedPath
  }

  // Apply brand header background if set
  const headerStyle = branding?.header_bg_color
    ? { backgroundColor: branding.header_bg_color }
    : {}

  return (
    <header
      className={`sticky top-0 z-50 ${headerBgClass} border-b ${borderColor} shadow-sm`}
      style={headerStyle}
    >
      <div className="px-3 sm:px-4 md:px-6 lg:px-8">
        {/* Mobile Search Bar */}
        {searchOpen && (
          <div className="md:hidden py-3 border-b border-gray-200 dark:border-gray-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={() => {
                  setSearchQuery('')
                  setSearchOpen(false)
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Left: Brand - Gradient text with Platform label */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Sidebar Toggle - Mobile only, if provided */}
            {onSidebarToggle && (
              <button
                onClick={onSidebarToggle}
                className={`lg:hidden p-1.5 ${subtextColor} ${hoverBgClass} rounded-lg transition-colors`}
                aria-label="Toggle sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            {/* Mobile Menu Toggle - Only show if navLinks exist and no sidebar toggle */}
            {!onSidebarToggle && navLinks && navLinks.length > 0 && (
              <button
                onClick={() => setMobileNavOpen(!mobileNavOpen)}
                className={`md:hidden p-1.5 ${subtextColor} ${hoverBgClass} rounded-lg transition-colors`}
                aria-label="Toggle navigation"
                aria-expanded={mobileNavOpen}
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <Link
              to={dashboardPath}
              className="flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
              {/* Brand logo or fallback gradient text */}
              {branding?.primary_logo_url ? (
                <img
                  src={branding.primary_logo_url}
                  alt={branding.app_display_name || 'Logo'}
                  className="h-8 sm:h-9 max-w-[160px] object-contain"
                />
              ) : (
                <div>
                  <h1 className="text-base sm:text-lg font-bold leading-tight">
                    {branding?.app_display_name ? (
                      <span className="text-gray-900 dark:text-white">{branding.app_display_name}</span>
                    ) : (
                      <>
                        <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                          Project
                        </span>
                        <span className="bg-gradient-to-r from-orange-400 via-red-500 to-red-600 bg-clip-text text-transparent ml-0.5 sm:ml-1">
                          Nidus
                        </span>
                      </>
                    )}
                  </h1>
                  <p className={`text-[10px] sm:text-xs ${subtextColor} font-medium mt-0.5 hidden sm:block`}>
                    {branding?.app_tagline || systemName}
                  </p>
                </div>
              )}
            </Link>
          </div>

          {/* Center: Search Bar and Navigation Links - Desktop */}
          <div className="hidden lg:flex items-center gap-4 mx-4 flex-1">
            {/* Search Bar — opens global command palette (GAP-02) */}
            <div className="relative flex-1 max-w-md">
              <button
                type="button"
                onClick={() => setGlobalSearchOpen(true)}
                className="w-full flex items-center gap-2 pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:border-blue-500 transition-all text-left"
                aria-label="Open global search (Ctrl+K)"
              >
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                Search... <span className="ml-auto hidden xl:inline text-xs opacity-60">Ctrl+K</span>
              </button>
            </div>

            {/* Navigation Links */}
            {navLinks && navLinks.length > 0 && (
              <nav className="flex items-center gap-1">
                {navLinks.map((link, index) => {
                  const isActive = isActiveLink(link.path)
                  return (
                    <Link
                      key={index}
                      to={link.path}
                      className={`px-3 xl:px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative ${
                        isActive
                          ? 'text-blue-700 dark:text-white bg-blue-50 dark:bg-white/25 backdrop-blur-sm shadow-sm dark:shadow-md font-semibold border border-blue-100 dark:border-transparent'
                          : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10'
                      }`}
                    >
                      {link.label}
                      {isActive && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-white rounded-full shadow-sm" />
                      )}
                    </Link>
                  )
                })}
              </nav>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Search Toggle - Mobile/Tablet */}
            <button
              onClick={() => {
                setGlobalSearchOpen(true)
                setMobileNavOpen(false)
              }}
              className={`lg:hidden p-1.5 sm:p-2 ${subtextColor} ${hoverBgClass} rounded-lg transition-colors`}
              aria-label="Search"
              title="Search (Ctrl+K)"
            >
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => navigate('/notifications')}
                className={`relative p-1.5 sm:p-2 ${subtextColor} ${hoverBgClass} rounded-lg transition-colors`}
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-red-500 text-[10px] sm:text-xs font-medium text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            </div>

            {/* Theme Toggle */}
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>

            {/* User Profile Menu */}
            <div className="relative user-menu-container">
              <button
                onClick={() => {
                  setUserMenuOpen(!userMenuOpen)
                  setMobileNavOpen(false)
                }}
                className={`flex items-center gap-1 sm:gap-2 p-1 sm:p-1.5 ${subtextColor} ${hoverBgClass} rounded-lg transition-colors`}
                aria-label="User menu"
                aria-expanded={userMenuOpen}
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center shadow-md">
                  <span className="text-white text-xs sm:text-sm font-medium">{userInitials}</span>
                </div>
                <ChevronDown className={`w-3 h-3 sm:w-4 sm:h-4 transition-transform hidden sm:block ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {userMenuOpen && (
                <div className={`absolute right-0 mt-2 w-56 rounded-lg shadow-xl border ${borderColor} ${headerBgClass} py-1 z-50`}>
                  {/* User Info */}
                  {user && (
                    <div className={`px-4 py-3 border-b ${borderColor}`}>
                      <p className={`text-sm font-medium ${textColor}`}>
                        {user.user_metadata?.full_name || user.user_metadata?.name || 'User'}
                      </p>
                      <p className={`text-xs ${subtextColor} truncate`}>
                        {user.email}
                      </p>
                    </div>
                  )}

                  {/* Menu Items */}
                  <Link
                    to={profilePath}
                    onClick={() => setUserMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2 text-sm ${subtextColor} ${hoverBgClass} transition-colors`}
                  >
                    <User className="w-4 h-4" />
                    <span>Profile</span>
                  </Link>
                  <Link
                    to={settingsPath}
                    onClick={() => setUserMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2 text-sm ${subtextColor} ${hoverBgClass} transition-colors`}
                  >
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </Link>
                  {pwaSettingsPath ? (
                    <Link
                      to={pwaSettingsPath}
                      onClick={() => setUserMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2 text-sm ${subtextColor} ${hoverBgClass} transition-colors`}
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>App install</span>
                    </Link>
                  ) : null}

                  {/* Divider */}
                  <div className={`my-1 border-t ${borderColor}`}></div>

                  {/* Logout */}
                  <button
                    onClick={() => {
                      setUserMenuOpen(false)
                      handleLogout()
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 ${hoverBgClass} transition-colors text-left`}
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileNavOpen && navLinks && navLinks.length > 0 && (
          <div className="mobile-nav-container md:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <nav className="px-4 py-3 space-y-1">
              {navLinks.map((link, index) => {
                const isActive = isActiveLink(link.path)
                return (
                  <Link
                    key={index}
                    to={link.path}
                    onClick={() => setMobileNavOpen(false)}
                    className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'text-blue-700 dark:text-white bg-blue-50 dark:bg-white/25 backdrop-blur-sm shadow-sm dark:shadow-md font-semibold border border-blue-100 dark:border-transparent'
                        : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10'
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </nav>
          </div>
        )}
      </div>
      <GlobalSearchModal
        open={globalSearchOpen}
        onClose={() => setGlobalSearchOpen(false)}
        sim={isSimulator}
      />
    </header>
  )
}

