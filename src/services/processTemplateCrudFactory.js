/**
 * Generic CRUD factory for v629 process template tables.
 */
import { platformDb, simDb } from './supabase/supabaseClient'

const STATUS_VALUES = ['draft', 'active', 'on_hold']

export function createProcessTemplateService(config, { sim = false } = {}) {
  const db = sim ? simDb : platformDb
  const { table, refPrefix = 'PT', titleField = 'title' } = config
  const projectCol = sim ? 'practice_project_id' : 'project_id'

  async function listByProject(projectId, filters = {}) {
    let q = db.from(table).select('*').eq('is_deleted', false).order('created_at', { ascending: false })
    if (projectId) q = q.eq(projectCol, projectId)
    if (filters.status) q = q.eq('status', filters.status)
    if (filters.is_master != null) q = q.eq('is_master', filters.is_master)
    const { data, error } = await q
    if (error) throw error
    return data || []
  }

  /** All organisation master templates (no project filter). */
  async function listMasterCatalog() {
    const { data, error } = await db
      .from(table)
      .select('*')
      .eq('is_deleted', false)
      .eq('is_master', true)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }

  /** Non-master copies for a project workspace. */
  async function listWorkspaceByProject(projectId) {
    if (!projectId) return []
    let q = db
      .from(table)
      .select('*')
      .eq('is_deleted', false)
      .eq('is_master', false)
      .eq(projectCol, projectId)
      .order('created_at', { ascending: false })
    const { data, error } = await q
    if (error) throw error
    return data || []
  }

  async function listMasters(projectId) {
    return listMasterCatalog()
  }

  async function getById(id) {
    const { data, error } = await db.from(table).select('*').eq('id', id).single()
    if (error) throw error
    return data
  }

  async function create(payload) {
    const row = {
      status: 'draft',
      is_master: false,
      is_deleted: false,
      ...payload,
    }
    if (projectCol !== 'project_id' && row.project_id != null && row[projectCol] == null) {
      row[projectCol] = row.project_id
      delete row.project_id
    }
    if (!row[titleField]) row[titleField] = 'Untitled'
    const { data, error } = await db.from(table).insert(row).select('*').single()
    if (error) throw error
    return data
  }

  async function update(id, payload) {
    const { data, error } = await db.from(table).update(payload).eq('id', id).select('*').single()
    if (error) throw error
    return data
  }

  async function remove(id) {
    const { error } = await db.from(table).update({ is_deleted: true }).eq('id', id)
    if (error) throw error
  }

  async function setOnHold(id) {
    return update(id, { status: 'on_hold' })
  }

  async function copyMaster(masterId, { projectId, copiedBy, accountId }) {
    const master = await getById(masterId)
    if (!master) throw new Error('Master template not found')
    const { id, created_at, updated_at, reference_code, is_master, master_id, copied_by, project_id, practice_project_id, ...rest } = master
    return create({
      ...rest,
      [projectCol]: projectId,
      account_id: accountId ?? master.account_id,
      is_master: false,
      master_id: masterId,
      copied_by: copiedBy,
      status: 'draft',
      [titleField]: `${master[titleField] || 'Copy'} (Copy)`,
    })
  }

  return {
    table,
    refPrefix,
    titleField,
    STATUS_VALUES,
    listByProject,
    listMasterCatalog,
    listWorkspaceByProject,
    getById,
    create,
    update,
    remove,
    setOnHold,
    copyMaster,
  }
}

/** Map slug → service instance (platform) */
const PLATFORM_SERVICES = {}

/** Map slug → service instance (simulator) */
const SIM_SERVICES = {}

export function registerTemplateService(slug, config) {
  PLATFORM_SERVICES[slug] = createProcessTemplateService(config, { sim: false })
  SIM_SERVICES[slug] = createProcessTemplateService(config, { sim: true })
}

export function getTemplateService(slug, { sim = false } = {}) {
  const map = sim ? SIM_SERVICES : PLATFORM_SERVICES
  const svc = map[slug]
  if (!svc) throw new Error(`No process template service registered for slug: ${slug}`)
  return svc
}

export function initProcessTemplateServices(registryEntries) {
  for (const entry of registryEntries) {
    if (entry.kind !== 'new' || !entry.table) continue
    registerTemplateService(entry.slug, {
      table: entry.table,
      refPrefix: entry.refPrefix,
      titleField: entry.titleField || 'title',
    })
  }
}
