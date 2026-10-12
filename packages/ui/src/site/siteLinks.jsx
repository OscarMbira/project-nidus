/**
 * v1241 Amendment A — link + icon helpers shared by the site header, footer and chooser.
 * ExtLink opens links into another application in a new window (A-D4).
 */
import { createElement } from 'react'
import { LayoutDashboard, GraduationCap, CalendarRange, Box } from 'lucide-react'

const PRODUCT_ICONS = { 'layout-dashboard': LayoutDashboard, 'graduation-cap': GraduationCap, 'calendar-range': CalendarRange }
export const productIcon = (key) => PRODUCT_ICONS[key] || Box

/**
 * The Project Nidus wordmark (header and footer): blue→cyan "Project", orange→red "Nidus",
 * extra-bold, as on the original Platform header. Brand chrome: same colours in both themes.
 */
const WORDMARK_SIZES = {
  lg: 'text-2xl sm:text-3xl lg:text-4xl',
  // v1264 product header: shares its single row with the product name and links.
  md: 'text-xl sm:text-2xl',
}

export function NidusWordmark({ className = '', size = 'lg' }) {
  return (
    <span className={`whitespace-nowrap font-extrabold tracking-tight ${WORDMARK_SIZES[size] || WORDMARK_SIZES.lg} ${className}`}>
      <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">Project</span>{' '}
      <span className="bg-gradient-to-r from-orange-400 via-red-500 to-red-600 bg-clip-text text-transparent">Nidus</span>
    </span>
  )
}

/** A product's icon as an element (the icon component is looked up, not created, per render). */
export function ProductIcon({ iconKey, ...props }) {
  return createElement(productIcon(iconKey), props)
}

export function ExtLink({ to, className, children, onClick, ...rest }) {
  if (!to) return null
  return (
    <a href={to.href} className={className} onClick={onClick} {...(to.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} {...rest}>
      {children}
      {to.external && <span className="sr-only"> (opens in a new window)</span>}
    </a>
  )
}
