import { getSidebarNavTreeDotClassName, getSidebarNavTreeRowClassName } from '@nidus/shared/utils/sidebarNavUtils'

/**
 * One child row in a sidebar nav tree — renders a dot node on the parent tier guide line.
 */
export default function SidebarNavTreeRow({ children, dotClassName = '', dotStyle, className = '' }) {
  return (
    <div className={`${getSidebarNavTreeRowClassName()}${className ? ` ${className}` : ''}`}>
      <span className={getSidebarNavTreeDotClassName(dotClassName)} style={dotStyle} aria-hidden="true" />
      {children}
    </div>
  )
}
