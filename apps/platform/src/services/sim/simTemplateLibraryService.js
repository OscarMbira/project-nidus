/**
 * Template Library — Simulator (sim.template_library)
 */

import { simDb, platformDb } from '../supabase/supabaseClient'
import { defaultContentSchemaForType, emptyContentFromSchema } from '../templateLibraryConstants'

const TLIB = 'template_library'
const TVERS = 'template_library_versions'
const CAT = 'template_categories'

function mapTemplateRow(row) {
  if (!row) return row
  return { ...row, tags: row.tags || [] }
}

export async function listTemplateCategories() {
  const { data, error } = await simDb
    .from(CAT)
    .select('id, category_code, category_name, description, sort_order, is_active')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
  if (error) return { data: [], error }
  return { data: data || [], error: null }
}

export async function getTemplatesForAccount(accountId, { manage = false, search = '', typeCode = '', categoryId = '' } = {}) {
  if (!accountId) return { data: [], error: new Error('Organisation required') }
  let q = simDb
    .from(TLIB)
    .select(`*, category:${CAT}(id, category_code, category_name)`)
    .eq('account_id', accountId)
    .eq('is_deleted', false)
    .order('updated_at', { ascending: false })
  if (!manage) q = q.eq('status', 'published')
  const { data, error } = await q
  if (error) return { data: [], error }
  let rows = (data || []).map(mapTemplateRow)
  if (typeCode) rows = rows.filter((r) => r.template_type_code === typeCode)
  if (categoryId) rows = rows.filter((r) => r.category_id === categoryId)
  if (search && String(search).trim()) {
    const s = String(search).trim().toLowerCase()
    rows = rows.filter(
      (r) =>
        (r.title && r.title.toLowerCase().includes(s)) ||
        (r.description && r.description.toLowerCase().includes(s)) ||
        (r.tags && r.tags.some((t) => String(t).toLowerCase().includes(s)))
    )
  }
  return { data: rows, error: null }
}

export async function getTemplateById(id) {
  const { data, error } = await simDb
    .from(TLIB)
    .select(`*, category:${CAT}(id, category_code, category_name)`)
    .eq('id', id)
    .eq('is_deleted', false)
    .maybeSingle()
  return { data: mapTemplateRow(data), error }
}

export async function getMasterVersionHistory(templateId) {
  const { data, error } = await simDb
    .from(TVERS)
    .select('id, version_number, content_snapshot, changed_at, is_published, change_description, changed_by')
    .eq('template_id', templateId)
    .order('changed_at', { ascending: false })
  return { data: data || [], error }
}

export async function createTemplate(payload) {
  const {
    data: { user },
  } = await platformDb.auth.getUser()
  if (!user) return { data: null, error: new Error('Not authenticated') }
  const schema = payload.content_schema || defaultContentSchemaForType(payload.template_type_code || 'generic')
  const content = payload.content && Object.keys(payload.content).length ? payload.content : emptyContentFromSchema(schema)
  const row = {
    account_id: payload.account_id,
    category_id: payload.category_id || null,
    template_type_code: payload.template_type_code || 'generic',
    title: payload.title,
    description: payload.description || null,
    purpose: payload.purpose || null,
    content,
    content_schema: schema,
    version: payload.version || '1.0',
    status: payload.status || 'draft',
    is_default: !!payload.is_default,
    tags: payload.tags || [],
    notes: payload.notes || null,
    created_by: user.id,
    updated_by: user.id,
  }
  const { data, error } = await simDb.from(TLIB).insert(row).select().single()
  return { data: mapTemplateRow(data), error }
}

export async function updateTemplate(id, patch) {
  const {
    data: { user },
  } = await platformDb.auth.getUser()
  if (!user) return { data: null, error: new Error('Not authenticated') }
  const row = { ...patch, updated_by: user.id, updated_at: new Date().toISOString() }
  if (patch.status === 'published') {
    row.published_at = new Date().toISOString()
    row.published_by = user.id
  }
  if (patch.status === 'archived') {
    row.archived_at = new Date().toISOString()
    row.archived_by = user.id
  }
  const { data, error } = await simDb.from(TLIB).update(row).eq('id', id).select().single()
  return { data: mapTemplateRow(data), error }
}

export async function softDeleteTemplate(id) {
  return updateTemplate(id, { is_deleted: true })
}

export async function upsertTemplateCategory({ id, category_code, category_name, description, sort_order = 0 }) {
  const row = {
    category_code,
    category_name,
    description: description || null,
    sort_order,
    is_active: true,
    updated_at: new Date().toISOString(),
  }
  if (id) {
    const { data, error } = await simDb.from(CAT).update(row).eq('id', id).select().single()
    return { data, error }
  }
  const { data, error } = await simDb.from(CAT).insert(row).select().single()
  return { data, error }
}

export async function deleteTemplateCategory(id) {
  const { error } = await simDb.from(CAT).update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', id)
  return { error }
}

export async function listAllTemplateCategoriesForManage() {
  const { data, error } = await simDb
    .from(CAT)
    .select('id, category_code, category_name, description, sort_order, is_active')
    .order('sort_order', { ascending: true })
  return { data: data || [], error }
}

export async function bulkImportTemplatesFromRows(accountId, rows, { onProgress } = {}) {
  const {
    data: { user },
  } = await platformDb.auth.getUser()
  if (!user) return { imported: 0, errors: ['Not authenticated'] }
  if (!accountId) return { imported: 0, errors: ['Organisation required'] }

  const { data: cats } = await simDb.from(CAT).select('id, category_code')
  const catByCode = Object.fromEntries((cats || []).map((c) => [c.category_code, c.id]))

  let imported = 0
  const errors = []
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] || {}
    const title = String(r.title || '').trim()
    if (!title) {
      errors.push(`Row ${i + 2}: title required`)
      continue
    }
    const typeCode = String(r.template_type_code || 'generic').trim()
    const schema = defaultContentSchemaForType(typeCode)
    const content = emptyContentFromSchema(schema)
    const catCode = String(r.category_code || '').trim()
    const category_id = catCode ? catByCode[catCode] || null : null
    const status = ['draft', 'published'].includes(String(r.status || '').toLowerCase())
      ? String(r.status).toLowerCase()
      : 'draft'

    const { error } = await simDb.from(TLIB).insert({
      account_id: accountId,
      category_id,
      template_type_code: typeCode,
      title,
      description: r.description ? String(r.description) : null,
      content,
      content_schema: schema,
      version: '1.0',
      status,
      created_by: user.id,
      updated_by: user.id,
    })
    if (error) errors.push(`Row ${i + 2}: ${error.message}`)
    else imported += 1
    if (onProgress) onProgress(i + 1, rows.length)
  }
  return { imported, errors }
}
