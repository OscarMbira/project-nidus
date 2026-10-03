/**
 * Shared presentational shell for role-scoped Layouts (PMOLayout/PMLayout and their Simulator
 * equivalents). Assumes the caller has already resolved that the current user is allowed to see
 * this scope (see RoleScopeGate) — this component has no guard logic of its own, only markup.
 *
 * Every prop is an element/array the caller supplies, so this package stays free of any
 * app-specific import (headers, sidebars, and widgets differ per app/family — see
 * Documentation/Role_Scoped_Routing_Guide.md for the exact slot each existing Layout uses).
 */
import { mainContentSidebarOffsetClass, useSidebarCollapsed } from '@nidus/shared/hooks/useSidebarCollapsed'

export default function RoleScopedShell({
  header,
  sidebar,
  aboveContent = null,
  beforeChildren = null,
  quickCaptureFab = null,
  providers = [],
  contentClassName = 'px-4 sm:px-6 pb-4 sm:pb-6 pt-0 sm:pt-2',
  children,
}) {
  const { collapsed } = useSidebarCollapsed()
  const shell = (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden">
      {header}
      <div className="flex flex-1 overflow-hidden relative">
        {sidebar}
        <main
          id="main-content"
          tabIndex="-1"
          className={`flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden ${mainContentSidebarOffsetClass(collapsed)} transition-[margin] duration-300 ease-in-out pt-2 sm:pt-3`}
        >
          {aboveContent}
          <div className={contentClassName}>
            {beforeChildren}
            {children}
          </div>
        </main>
      </div>
      {quickCaptureFab}
    </div>
  )

  return providers.reduce((acc, Provider) => <Provider>{acc}</Provider>, shell)
}
