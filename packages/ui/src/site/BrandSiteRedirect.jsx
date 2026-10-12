/**
 * v1241 Amendment A (A-D1) — common pages (About, Contact, Blog, Resources …) live only on the
 * brand site. A product app's old route for one of them sends the visitor there, using the brand
 * address from site_content ('brand.url'). Until that is known it shows a short message with a
 * link (no hard-coded address, rule 25.1).
 */
import { useEffect } from 'react'
import { brandHref } from '@nidus/shared/site/siteChrome.js'
import { useSiteChrome } from '@nidus/shared/hooks/useSiteChrome.js'

export default function BrandSiteRedirect({ path, label = 'this page' }) {
  const chrome = useSiteChrome()
  const target = chrome?.brandUrl ? brandHref(chrome.brandUrl, path) : null

  useEffect(() => {
    if (target) window.location.replace(target)
  }, [target])

  return (
    <div className="flex min-h-[50vh] items-center justify-center bg-white px-4 text-center text-gray-700 dark:bg-gray-950 dark:text-gray-300">
      {target ? (
        <p>Opening {label} on the Project Nidus site… <a className="text-blue-600 underline dark:text-blue-400" href={target}>Continue</a></p>
      ) : (
        <p>Opening {label}…</p>
      )}
    </div>
  )
}
