/**
 * Public auth flows (invitation accept/decline, etc.)
 * Uses the same branded MainHeader and PlatformFooter as Platform login.
 */

import { lazy, Suspense } from 'react'
import MainHeader from '../homepage/MainHeader'

const PlatformFooter = lazy(() => import('../homepage/PlatformFooter'))

/**
 * @param {{
 *   children: import('react').ReactNode
 *   className?: string
 *   contentClassName?: string
 *   hidePlatformButton?: boolean
 *   hideSimulatorButton?: boolean
 *   disablePlatformSimulatorButtons?: boolean
 * }} props
 */
export default function AuthPublicLayout({
  children,
  className = '',
  contentClassName = 'flex-1 flex flex-col items-center justify-center py-10 px-4 sm:py-12 sm:px-6 lg:px-8',
  hidePlatformButton = false,
  hideSimulatorButton = false,
  disablePlatformSimulatorButtons = false,
}) {
  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col ${className}`}>
      <MainHeader
        hidePlatformButton={hidePlatformButton}
        hideSimulatorButton={hideSimulatorButton}
        disablePlatformSimulatorButtons={disablePlatformSimulatorButtons}
      />
      <main className={contentClassName}>{children}</main>
      <Suspense fallback={<div className="h-64 bg-gray-900" aria-hidden />}>
        <PlatformFooter />
      </Suspense>
    </div>
  )
}
