/**
 * v1344 — option lists for project fields (public.project_attribute_options, SQL v1480):
 * priority, billing_type, classification. DB-driven (rule 25.1); cached for the session tab
 * (rule 66 — the lists change rarely), like deliveryMethodologyOptionsService.
 */

const CACHE_KEY = 'nidus:projectAttributeOptions:v1'
const CACHE_TTL_MS = 30 * 60 * 1000

function readCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.at || !Array.isArray(parsed?.rows)) return null
    if (Date.now() - parsed.at > CACHE_TTL_MS) return null
    return parsed.rows
  } catch {
    return null
  }
}

function writeCache(rows) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), rows }))
  } catch {
    /* ignore quota / private mode */
  }
}

/** Group rows by attribute, each list in display order. */
export function groupProjectAttributeOptions(rows = []) {
  const out = { priority: [], billing_type: [], classification: [] }
  const sorted = [...(rows || [])].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
  for (const r of sorted) {
    if (!r?.attribute || !r?.code) continue
    if (!out[r.attribute]) out[r.attribute] = []
    out[r.attribute].push({ value: r.code, label: r.label || r.code, description: r.description || '' })
  }
  return out
}

/** Label for a stored code, falling back to a tidy version of the code. */
export function projectAttributeLabel(options, attribute, code) {
  if (!code) return ''
  const hit = (options?.[attribute] || []).find((o) => o.value === code)
  return hit ? hit.label : String(code).replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} db
 * @returns {Promise<{ priority: object[], billing_type: object[], classification: object[] }>}
 */
export async function listProjectAttributeOptions(db) {
  const cached = readCache()
  if (cached) return groupProjectAttributeOptions(cached)
  if (!db) return groupProjectAttributeOptions([])
  const { data, error } = await db
    .from('project_attribute_options')
    .select('attribute, code, label, description, display_order')
    .eq('is_active', true)
  if (error) throw error
  writeCache(data || [])
  return groupProjectAttributeOptions(data || [])
}
