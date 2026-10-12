/**
 * v1241 Amendment A — "Which product?" chooser behind the header's Get started button (A-D2).
 * One card per active product with a sign-up link (rule 25.1). Links into another application
 * open in a new window (A-D4).
 */
import { useEffect } from 'react'
import { X } from 'lucide-react'
import { resolveProductHref } from '@nidus/shared/site/siteChrome.js'
import { ExtLink, ProductIcon } from './siteLinks.jsx'

export default function GetStartedChooser({ open, onClose, products = [], currentProduct = null }) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  const choices = products.filter((p) => p.sign_up_url)
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-16" role="dialog" aria-modal="true" aria-labelledby="get-started-title" onClick={onClose}>
      <div className="w-full max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="get-started-title" className="text-xl font-bold text-gray-900 dark:text-white">Which product do you need?</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Pick one to create your account. You can add the others later.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {choices.map((p) => {
            return (
              <ExtLink key={p.slug} to={resolveProductHref(p, 'sign_up_url', currentProduct)} onClick={onClose}
                className="flex flex-col rounded-xl border border-gray-200 p-4 hover:border-blue-500 hover:shadow-md dark:border-gray-700">
                <ProductIcon iconKey={p.icon_key} className="h-6 w-6 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                <span className="mt-3 font-semibold text-gray-900 dark:text-white">{p.name}</span>
                {p.tagline && <span className="mt-1 text-sm text-gray-600 dark:text-gray-400">{p.tagline}</span>}
                {p.audience && <span className="mt-3 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">For: {p.audience}</span>}
                <span className="mt-4 text-sm font-semibold text-blue-600 dark:text-blue-400">Get started →</span>
              </ExtLink>
            )
          })}
        </div>
      </div>
    </div>
  )
}
