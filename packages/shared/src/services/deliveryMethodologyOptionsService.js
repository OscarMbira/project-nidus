/**
 * Load seeded delivery methodology options (public.delivery_methodology_options, v1470).
 * Used by Project Details Methodology and other delivery_methodology pickers.
 */

const CACHE_KEY = 'nidus:deliveryMethodologyOptions:v1'
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

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} db
 * @param {{ includeLegacy?: boolean }} [opts]
 * @returns {Promise<Array<{ code: string, label: string, description?: string, display_order: number, is_legacy: boolean }>>}
 */
export async function listDeliveryMethodologyOptions(db, { includeLegacy = false } = {}) {
  if (!db) return []

  const cached = readCache()
  if (cached) {
    return includeLegacy ? cached : cached.filter((r) => !r.is_legacy)
  }

  const { data, error } = await db
    .from('delivery_methodology_options')
    .select('code, label, description, display_order, is_legacy')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  if (error) throw error

  const rows = (data || []).map((r) => ({
    code: r.code,
    label: r.label,
    description: r.description || '',
    display_order: r.display_order ?? 0,
    is_legacy: Boolean(r.is_legacy),
  }))
  writeCache(rows)
  return includeLegacy ? rows : rows.filter((r) => !r.is_legacy)
}

/** Clear session cache after Admin/seed changes (optional). */
export function clearDeliveryMethodologyOptionsCache() {
  try {
    sessionStorage.removeItem(CACHE_KEY)
  } catch {
    /* ignore */
  }
}
