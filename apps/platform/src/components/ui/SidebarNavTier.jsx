import { getSidebarNavTierClassName } from '@nidus/shared/utils/sidebarNavUtils'

/**
 * One drill-down tier in sidebar navigation. Nest for each expanded menu level.
 */
export default function SidebarNavTier({ children, borderClassName = '', className = '', style }) {
  return (
    <div className={`${getSidebarNavTierClassName(borderClassName)}${className ? ` ${className}` : ''}`} style={style}>
      {children}
    </div>
  )
}
