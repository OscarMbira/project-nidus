/**
 * Requirements register — owner, rationale, verification method and non-functional area (v1338 D4/D5).
 *
 * The columns are added by SQL that is run by the owner, so until it is on the database the forms must
 * not send them (PostgREST rejects unknown columns). `requirementExtrasAvailable(db)` asks once per
 * client and remembers the answer for the page session; pages show and save the fields only when it is
 * true. Works for public.requirements_register (platformDb) and sim.requirements_register (simDb).
 */
import { platformDb } from '@nidus/supabase'

export const REQUIREMENT_EXTRA_KEYS = ['owner_name', 'rationale', 'verification_method', 'nfr_area_key']

/** Values match the column's CHECK constraint. */
export const VERIFICATION_METHODS = [
  { value: 'test', label: 'Test' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'demonstration', label: 'Demonstration' },
  { value: 'analysis', label: 'Analysis' },
]

export const NFR_CATEGORY = 'non_functional'

const NFR_AREAS_CACHE_KEY = 'nidus:requirementNfrAreas:v1'

const availability = new WeakMap()

/** TRUE when the requirement columns of v1338 exist on this client's requirements_register. */
export function requirementExtrasAvailable(db = platformDb) {
  if (!db) return Promise.resolve(false)
  if (!availability.has(db)) {
    const probe = db
      .from('requirements_register')
      .select('owner_name, rationale, verification_method, nfr_area_key')
      .limit(1)
      .then(({ error }) => !error, () => false)
    availability.set(db, probe)
  }
  return availability.get(db)
}

/** Test hook. */
export function resetRequirementExtrasCache(db = platformDb) {
  availability.delete(db)
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(NFR_AREAS_CACHE_KEY)
  } catch {
    /* ignore */
  }
}

/** Form state for the four fields from a loaded row. */
export function requirementExtrasFromRow(row) {
  return {
    owner_name: row?.owner_name || '',
    rationale: row?.rationale || '',
    verification_method: row?.verification_method || '',
    nfr_area_key: row?.nfr_area_key || '',
  }
}

/**
 * Column values to save. Empty when the columns are not on the database yet. The area is kept only for
 * non-functional requirements.
 */
export function requirementExtraValues(form, available) {
  if (!available) return {}
  const text = (v) => (String(v ?? '').trim() ? String(v).trim() : null)
  return {
    owner_name: text(form?.owner_name),
    rationale: text(form?.rationale),
    verification_method: form?.verification_method || null,
    nfr_area_key: form?.category === NFR_CATEGORY ? (form?.nfr_area_key || null) : null,
  }
}

/**
 * The non-functional areas (public.requirement_nfr_areas — database reference data, rule 25.1), in
 * order: [{ value, label }]. Cached for the browser session (rule 66). Empty until the table exists.
 */
export async function loadRequirementNfrAreas() {
  try {
    const cached = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(NFR_AREAS_CACHE_KEY) : null
    if (cached) return JSON.parse(cached)
  } catch {
    /* ignore */
  }
  const { data, error } = await platformDb
    .from('requirement_nfr_areas')
    .select('area_key, label, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
  // Missing table (SQL not run yet) or no access: no areas, and the Area field stays hidden.
  if (error) return []
  const areas = (data || []).map((a) => ({ value: a.area_key, label: a.label }))
  try {
    if (areas.length && typeof sessionStorage !== 'undefined') sessionStorage.setItem(NFR_AREAS_CACHE_KEY, JSON.stringify(areas))
  } catch {
    /* ignore */
  }
  return areas
}

/**
 * "CODE – Name" labels for requirement ids, in the order given (v1338 Requirement Changes). Ids that
 * no longer exist are left out.
 * @param {object} db platformDb (public) or simDb (practice projects)
 * @param {string[]} ids
 */
export async function loadRequirementLabels(db, ids) {
  const list = Array.isArray(ids) ? ids.filter(Boolean) : []
  if (!db || list.length === 0) return []
  const { data, error } = await db.from('requirements_register').select('id, requirement_code, name').in('id', list)
  if (error) return []
  const byId = new Map((data || []).map((r) => [r.id, [r.requirement_code, r.name].filter(Boolean).join(' – ')]))
  return list.map((id) => byId.get(id)).filter(Boolean)
}

export function optionLabel(options, value) {
  return (options || []).find((o) => o.value === value)?.label || ''
}
