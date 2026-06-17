/**
 * Theme-aware sidebar colours (light/dark + optional org branding).
 * Branding sidebar bg/text apply in dark mode; light mode uses neutral palette.
 */

/**
 * @param {'light'|'dark'} theme
 * @param {object} [branding]
 */
export function resolveSidebarThemeTokens(theme = 'dark', branding = {}) {
  const isDark = theme === 'dark'
  const activeColor = branding?.sidebar_active_color || '#3B82F6'

  if (isDark) {
    return {
      asideClass: branding?.sidebar_bg_color ? '' : 'bg-gray-900',
      asideStyle: branding?.sidebar_bg_color ? { backgroundColor: branding.sidebar_bg_color } : undefined,
      inactiveItemClass:
        'text-gray-300 hover:bg-gray-700/80 hover:text-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50',
      sectionParentClass:
        'text-gray-200 hover:bg-gray-700/60 hover:text-white',
      childBorderClass: 'border-gray-600',
      chevronClass: 'text-gray-400',
      useBrandInactiveText: Boolean(branding?.sidebar_text_color),
      brandInactiveTextColor: branding?.sidebar_text_color || null,
      activeBackgroundColor: activeColor,
      activeTextColor: '#ffffff',
      methodologyHeaderBg: 'bg-gray-800/80',
      methodologyHeaderText: 'text-gray-300',
    }
  }

  return {
    asideClass: 'bg-white border-r border-gray-200',
    asideStyle: undefined,
    inactiveItemClass:
      'text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40',
    sectionParentClass:
      'text-gray-800 hover:bg-gray-100 hover:text-gray-900 font-semibold',
    childBorderClass: 'border-gray-200',
    chevronClass: 'text-gray-500',
    useBrandInactiveText: false,
    brandInactiveTextColor: null,
    activeBackgroundColor: activeColor,
    activeTextColor: '#ffffff',
    methodologyHeaderBg: 'bg-gray-100',
    methodologyHeaderText: 'text-gray-700',
  }
}
