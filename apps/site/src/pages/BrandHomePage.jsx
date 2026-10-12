/**
 * v1241 — Nidus brand site home page content (apex domain). The shared header and footer come
 * from SiteLayout (Amendment A). Rendered at build time for search engines (scripts/prerender.mjs)
 * and hydrated in the browser. All copy and product cards come from public.site_content /
 * public.site_products; render must stay free of browser-only calls.
 * Product links open in a new window: each product is another application (A-D4).
 */
import { createElement } from 'react'
import { CalendarRange, GraduationCap, LayoutDashboard, Package, ArrowRight } from 'lucide-react'
import { activeProductsInOrder, contentMap, withReferral } from '../lib/siteData.js'

// Presentation lookups keyed by DB values (icon_key / accent_key). Full class strings so Tailwind
// can see them; unknown keys fall back to a neutral style.
const ICONS = {
  'layout-dashboard': LayoutDashboard,
  'graduation-cap': GraduationCap,
  'calendar-range': CalendarRange,
}
export const ACCENTS = {
  blue: { chip: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', cta: 'bg-blue-600 hover:bg-blue-700' },
  green: { chip: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', cta: 'bg-green-600 hover:bg-green-700' },
  violet: { chip: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300', cta: 'bg-violet-600 hover:bg-violet-700' },
}
export const NEUTRAL = { chip: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', cta: 'bg-gray-700 hover:bg-gray-800' }
export const productIconFor = (key) => ICONS[key] || Package
const NEW_WINDOW = { target: '_blank', rel: 'noopener noreferrer' }

export function ProductCard({ product, refCode }) {
  const icon = productIconFor(product.icon_key)
  const accent = ACCENTS[product.accent_key] || NEUTRAL
  return (
    <article
      data-testid="product-card"
      className="flex flex-col rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-sm"
    >
      <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${accent.chip}`}>
        {createElement(icon, { className: "h-6 w-6", "aria-hidden": "true" })}
      </div>
      <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-gray-100">{product.name}</h2>
      {product.tagline && <p className="mt-1 text-sm font-medium text-gray-600 dark:text-gray-300">{product.tagline}</p>}
      {product.description && <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 flex-1">{product.description}</p>}
      {product.audience && (
        <p className="mt-3 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">For: {product.audience}</p>
      )}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <a
          href={withReferral(product.landing_url, refCode)}
          {...NEW_WINDOW}
          className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white ${accent.cta}`}
        >
          Learn more <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </a>
        {product.sign_up_url && (
          <a
            href={withReferral(product.sign_up_url, refCode)}
            {...NEW_WINDOW}
            className="text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
          >
            Get started
          </a>
        )}
      </div>
    </article>
  )
}

export default function BrandHomePage({ data, refCode = null }) {
  const products = activeProductsInOrder(data?.products)
  const text = contentMap(data?.content)

  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pt-16 pb-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">{text['hero.heading']}</h1>
        {text['hero.subheading'] && (
          <p className="mx-auto mt-4 max-w-2xl text-base text-gray-600 dark:text-gray-300 sm:text-lg">{text['hero.subheading']}</p>
        )}
      </section>

      <section aria-label="Products" className="mx-auto grid max-w-6xl gap-6 px-4 pb-16 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <ProductCard key={p.slug} product={p} refCode={refCode} />
        ))}
      </section>

      {(text['connect.heading'] || text['connect.body']) && (
        <section className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="mx-auto max-w-3xl px-4 py-14 text-center">
            {text['connect.heading'] && <h2 className="text-2xl font-semibold">{text['connect.heading']}</h2>}
            {text['connect.body'] && <p className="mt-3 text-gray-600 dark:text-gray-300">{text['connect.body']}</p>}
          </div>
        </section>
      )}
    </>
  )
}
