import SidebarNavTreeRow from './SidebarNavTreeRow.jsx'

/**
 * Wraps a nested sidebar row with a tree connector dot when level > 0.
 */
export default function SidebarNavNestedRow({ level = 0, children, dotClassName = '', dotStyle, className = '' }) {
  if (level <= 0) return children
  return (
    <SidebarNavTreeRow dotClassName={dotClassName} dotStyle={dotStyle} className={className}>
      {children}
    </SidebarNavTreeRow>
  )
}
