/**
 * v1262 — Brand-site marketing sections (public.site_sections, SQL v1262). Pure helpers used by
 * the brand site (render + prerender) and its tests. The Admin app replicates SECTION_TYPES /
 * the validators in its own publicSiteServices.js (separate codebase, rule 34.4).
 *
 * Button links (`href`):
 *   '#get-started'      open the "Which product?" chooser
 *   '#<section_key>'    scroll to another section on the same page
 *   '/…'                a brand-site page (same window)
 *   'https://…'         another application (new window)
 */

/** The 11 section types, in the order they usually appear on a page. */
export const SECTION_TYPES = [
  { value: 'hero', label: 'Hero' },
  { value: 'trust_strip', label: 'Trust strip (logos / figures)' },
  { value: 'value_points', label: 'Problem → value points' },
  { value: 'product_cards', label: 'Product cards' },
  { value: 'feature_grid', label: 'Feature highlights' },
  { value: 'steps', label: 'How it works (steps)' },
  { value: 'audience_links', label: 'Solutions by audience' },
  { value: 'testimonials', label: 'Testimonials' },
  { value: 'pricing_teaser', label: 'Pricing teaser' },
  { value: 'faq', label: 'Frequently asked questions' },
  { value: 'cta_band', label: 'Call-to-action band' },
]

/** Which item fields each type uses (empty = the type has no item list). */
export const SECTION_ITEM_FIELDS = {
  hero: [],
  trust_strip: ['title', 'text', 'image_url', 'image_alt'],
  value_points: ['title', 'text', 'icon'],
  product_cards: [],
  feature_grid: ['title', 'text', 'icon'],
  steps: ['title', 'text'],
  audience_links: ['title', 'text', 'icon', 'href'],
  testimonials: ['text', 'title', 'subtitle', 'image_url', 'image_alt'],
  pricing_teaser: [],
  faq: ['title', 'text'],
  cta_band: [],
}

/** Presentation-only icon keys a section item may use (drawn by the brand site). */
export const SITE_ICON_KEYS = [
  'layout-dashboard', 'graduation-cap', 'calendar-range', 'shield-check', 'git-branch', 'bar-chart',
  'users', 'layers', 'workflow', 'smartphone', 'clipboard-check', 'target', 'briefcase', 'book-open',
  'sparkles', 'clock', 'link', 'alert-triangle', 'trending-up', 'repeat',
]

const HREF_RE = /^(#[a-z0-9_-]+|\/[^\s]*|https?:\/\/\S+)$/i

export const isValidSectionHref = (href) => HREF_RE.test(String(href || '').trim())

/**
 * How a button behaves. Returns null for a missing or invalid button so the site never renders
 * a dead link.
 */
export function resolveSectionCta(cta) {
  const label = String(cta?.label || '').trim()
  const href = String(cta?.href || '').trim()
  if (!label || !isValidSectionHref(href)) return null
  if (href === '#get-started') return { label, kind: 'chooser', href }
  if (href.startsWith('#')) return { label, kind: 'anchor', href }
  if (/^https?:\/\//i.test(href)) return { label, kind: 'external', href }
  return { label, kind: 'internal', href }
}

/** Active sections of one page in display order ('home' for the homepage). */
export function sectionsForPage(rows, pageSlug) {
  return (rows || [])
    .filter((s) => s.page_slug === pageSlug && s.is_active !== false)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || String(a.section_key).localeCompare(String(b.section_key)))
}

/** A section with nothing to show (e.g. a trust strip with no items) is skipped. */
export function sectionHasContent(section) {
  const fields = SECTION_ITEM_FIELDS[section?.section_type]
  if (!fields) return false
  if (fields.length) return Array.isArray(section.items) && section.items.length > 0
  if (section.section_type === 'product_cards') return true
  return Boolean(String(section.heading || '').trim())
}

/** schema.org FAQPage data for the page's FAQ sections, or null when there is none. */
export function faqJsonLd(sections) {
  const entries = (sections || [])
    .filter((s) => s.section_type === 'faq')
    .flatMap((s) => s.items || [])
    .filter((i) => String(i.title || '').trim() && String(i.text || '').trim())
  if (!entries.length) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries.map((i) => ({ '@type': 'Question', name: i.title, acceptedAnswer: { '@type': 'Answer', text: i.text } })),
  }
}

/**
 * Field checks for one section's content (heading, buttons, image, items). Returns
 * { field: message }; empty object when valid.
 */
export function validateSectionContent(type, c = {}) {
  const errors = {}
  const itemFields = SECTION_ITEM_FIELDS[type]
  if (!itemFields) return { section_type: 'Unknown section type' }
  if (!['product_cards', 'trust_strip', 'testimonials'].includes(type) && !String(c.heading || '').trim()) errors.heading = 'Heading is required'
  for (const key of ['primary_cta', 'secondary_cta']) {
    const cta = c[key]
    if (!cta || (!String(cta.label || '').trim() && !String(cta.href || '').trim())) continue
    if (!String(cta.label || '').trim()) errors[key] = 'Button text is required'
    else if (!isValidSectionHref(cta.href)) errors[key] = 'Link must start with / (this site), https:// (another app) or # (#get-started or a section)'
  }
  if (String(c.image_url || '').trim() && !String(c.image_alt || '').trim()) errors.image_alt = 'Describe the image (alt text)'
  const items = Array.isArray(c.items) ? c.items : []
  items.forEach((item, i) => {
    const n = i + 1
    if (type === 'testimonials') {
      if (!String(item.text || '').trim() || !String(item.title || '').trim()) errors[`items.${i}`] = `Item ${n}: quote and name are required`
    } else if (type === 'trust_strip') {
      if (!String(item.title || '').trim()) errors[`items.${i}`] = `Item ${n}: name or figure is required`
    } else if (itemFields.length && (!String(item.title || '').trim() || (itemFields.includes('text') && type === 'faq' && !String(item.text || '').trim()))) {
      errors[`items.${i}`] = type === 'faq' ? `Item ${n}: question and answer are required` : `Item ${n}: title is required`
    }
    if (item.href && !isValidSectionHref(item.href)) errors[`items.${i}`] = `Item ${n}: link must start with /, https:// or #`
    if (item.image_url && !String(item.image_alt || '').trim()) errors[`items.${i}`] = `Item ${n}: describe the image (alt text)`
  })
  return errors
}
