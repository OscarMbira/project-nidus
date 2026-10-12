/**
 * v1241 — Pure helpers for the Nidus brand site. Data comes from public.site_products and
 * public.site_content (rule 25.1); nothing here hardcodes a product.
 */

// The Admin app is internal and invite-only: never shown publicly, even if a row is added by mistake.
const NEVER_LISTED = new Set(['admin'])

const byOrderThenName = (a, b) =>
  (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
  String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' })

export function activeProductsInOrder(rows) {
  return (rows || [])
    .filter((r) => r && r.is_active !== false && !NEVER_LISTED.has(String(r.slug || '').toLowerCase()))
    .sort(byOrderThenName)
}

export function contentMap(rows) {
  const map = {}
  for (const r of rows || []) {
    if (r && r.is_active !== false && r.content_key) map[r.content_key] = r.content_value ?? ''
  }
  return map
}

export function signInLinks(rows) {
  return activeProductsInOrder(rows).filter((r) => r.sign_in_url)
}

// Same format the product apps accept (packages/shared/src/hooks/useAffiliateTracking.js).
const REF_PATTERN = /^[A-Za-z0-9]{4,20}$/

/** Affiliate code from ?ref= (same format the product apps accept), or null. */
export function readReferralCode(search) {
  const value = new URLSearchParams(search || '').get('ref')
  return value && REF_PATTERN.test(value) ? value : null
}

/**
 * Pass the affiliate code through to a product link. Browser storage is per subdomain, so the
 * product's own landing page records the click (with its correct target system), not this site.
 */
export function withReferral(url, refCode) {
  if (!refCode || !url) return url
  const [base, hash = ''] = String(url).split('#')
  const sep = base.includes('?') ? '&' : '?'
  return `${base}${sep}ref=${encodeURIComponent(refCode)}${hash ? `#${hash}` : ''}`
}
