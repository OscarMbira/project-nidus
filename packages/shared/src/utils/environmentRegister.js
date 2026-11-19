/**
 * v1342 — environments live in the core register `core_environments` (SQL v1467 / v1468).
 * Test suites and test runs still pick from a simple { id, name, … } list; these helpers turn
 * register records into that shape (same ids as the old test_environments rows).
 */

export const CORE_ENVIRONMENTS_REGISTER_ID = '00000000-0000-4000-9100-000000000002'
export const CORE_ENVIRONMENTS_REGISTER_KEY = 'core_environments'
export const DECOMMISSIONED_STATUS = 'decommissioned'

export const ENVIRONMENT_RECORD_COLUMNS =
  'id, record_project_id, title, description, status, created_at, updated_at, created_by, updated_by'

/** Register record → the environment shape test suites / runs use. */
export function environmentFromRecord(record, projectKey = 'project_id') {
  return {
    id: record.id,
    [projectKey]: record.record_project_id,
    name: record.title || '',
    description: record.description || null,
    status: record.status,
    is_active: record.status !== DECOMMISSIONED_STATUS,
    created_at: record.created_at,
    updated_at: record.updated_at,
    created_by: record.created_by,
    updated_by: record.updated_by,
  }
}

/** Alphabetical by name, then oldest first (rule 40.1). */
export function sortEnvironments(rows) {
  return [...(rows || [])].sort((a, b) => {
    const byName = String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' })
    if (byName) return byName
    return String(a.created_at || '').localeCompare(String(b.created_at || ''))
  })
}

/** Address of the Environments register list for a project (rule 16.1 friendly key). */
export function environmentsRegisterPath(app = 'platform') {
  return `/${app === 'simulator' ? 'simulator' : 'platform'}/local-registers/${CORE_ENVIRONMENTS_REGISTER_KEY}`
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Where an old core Environments address (Platform /platform/testing/environments…, Simulator
 * /simulator/practice-testing/environments…) now goes (v1342 D8). Same record ids, so an id in
 * the old address opens that record; a name (the old pages used names too) opens the list.
 * Platform keeps the query string (?projectId=…). The Simulator's old pages kept the practice
 * project in local storage; the register list takes it as ?scopeLevel=project&scopeEntityId=….
 * @param {{ app?: 'platform'|'simulator', environmentKey?: string, mode?: 'view'|'edit'|'new', search?: string, practiceProjectId?: string|null }} input
 */
export function environmentsRedirectPath({ app = 'platform', environmentKey = '', mode = 'view', search = '', practiceProjectId = null } = {}) {
  const base = environmentsRegisterPath(app)
  let query = String(search || '').replace(/^\?/, '')
  if (app === 'simulator' && practiceProjectId && !/(^|&)scopeEntityId=/.test(query)) {
    query = [query, `scopeLevel=project&scopeEntityId=${encodeURIComponent(practiceProjectId)}`].filter(Boolean).join('&')
  }
  const qs = query ? `?${query}` : ''
  if (mode === 'new') return `${base}/new${qs}`
  const key = decodeURIComponent(String(environmentKey || ''))
  if (!UUID_RE.test(key)) return `${base}${qs}`
  return `${base}/${key}${mode === 'edit' ? '/edit' : ''}${qs}`
}
