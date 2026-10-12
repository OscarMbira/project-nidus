/**
 * v1241 Amendment A — every brand-site page: shared header + footer (packages/ui, also used by
 * the Platform, Simulator and Planner public pages) around the page content.
 */
import NidusSiteHeader from '@nidus/ui/site/NidusSiteHeader.jsx'
import NidusSiteFooter from '@nidus/ui/site/NidusSiteFooter.jsx'
import ThemeToggle from '../pages/ThemeToggle.jsx'

/** Shown instead of an empty page while loading, or when the content could not be read (rule 26). */
export function SiteLoadNotice({ status }) {
  if (status === 'loading') {
    return <p className="mx-auto max-w-6xl px-4 py-16 text-center text-sm text-gray-500 dark:text-gray-400">Loading…</p>
  }
  return (
    <div role="alert" className="mx-auto my-16 max-w-xl rounded-lg border border-red-300 bg-red-50 px-5 py-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
      <p className="font-medium">This page could not be loaded.</p>
      <p className="mt-1">Please try again in a moment.</p>
    </div>
  )
}

export default function SiteLayout({ chrome, loadStatus = 'ready', children }) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <NidusSiteHeader chrome={chrome} onBrandSite themeToggle={<ThemeToggle />} />
      <main className="flex-1">
        {loadStatus !== 'ready' ? <SiteLoadNotice status={loadStatus} /> : children}
      </main>
      <NidusSiteFooter chrome={chrome} onBrandSite />
    </div>
  )
}
