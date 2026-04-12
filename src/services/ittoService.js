/**
 * ITTO — organisation templates + project instances (public schema)
 */

import { platformDb } from './supabase/supabaseClient'

function mapTemplateRow(row) {
  if (!row) return row
  const asArr = (v) => (Array.isArray(v) ? v : [])
  return {
    ...row,
    inputs: asArr(row.inputs),
    tools_techniques: asArr(row.tools_techniques),
    outputs: asArr(row.outputs),
  }
}

function mapProjectRow(row) {
  return mapTemplateRow(row)
}

export async function getITTOTemplates(organisationId, filters = {}) {
  let q = platformDb
    .from('itto_templates')
    .select('*')
    .eq('organisation_id', organisationId)
    .order('updated_at', { ascending: false })

  if (filters.process_group) q = q.eq('process_group', filters.process_group)
  if (filters.knowledge_area) q = q.eq('knowledge_area', filters.knowledge_area)
  if (filters.status) q = q.eq('status', filters.status)

  const { data, error } = await q
  if (error) throw error
  return (data || []).map(mapTemplateRow)
}

export async function getITTOTemplateById(id) {
  const { data, error } = await platformDb.from('itto_templates').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data ? mapTemplateRow(data) : null
}

export async function createITTOTemplate(payload) {
  const row = {
    organisation_id: payload.organisation_id,
    name: payload.name,
    process_group: payload.process_group || 'Planning',
    knowledge_area: payload.knowledge_area || 'Integration',
    description: payload.description ?? null,
    inputs: payload.inputs ?? [],
    tools_techniques: payload.tools_techniques ?? [],
    outputs: payload.outputs ?? [],
    tags: payload.tags ?? [],
    status: payload.status || 'draft',
    is_draft: !!payload.is_draft,
    draft_expires_at: payload.draft_expires_at ?? null,
    created_by: payload.created_by ?? null,
  }
  const { data, error } = await platformDb.from('itto_templates').insert(row).select().single()
  if (error) throw error
  return mapTemplateRow(data)
}

export async function updateITTOTemplate(id, patch) {
  const { data, error } = await platformDb
    .from('itto_templates')
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return mapTemplateRow(data)
}

/** Archive (soft) — set status archived */
export async function deleteITTOTemplate(id) {
  return updateITTOTemplate(id, { status: 'archived' })
}

export async function getProjectITTOs(projectId, filters = {}) {
  let q = platformDb
    .from('project_ittos')
    .select('*')
    .eq('project_id', projectId)
    .order('updated_at', { ascending: false })

  if (filters.status) q = q.eq('status', filters.status)
  if (filters.process_group) q = q.eq('process_group', filters.process_group)
  if (filters.draftsOnly) q = q.eq('is_draft', true)

  const { data, error } = await q
  if (error) throw error
  return (data || []).map(mapProjectRow)
}

export async function getProjectITTOById(id) {
  const { data, error } = await platformDb.from('project_ittos').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data ? mapProjectRow(data) : null
}

export async function createProjectITTO(payload) {
  const row = {
    project_id: payload.project_id,
    template_id: payload.template_id ?? null,
    name: payload.name,
    process_group: payload.process_group || 'Planning',
    knowledge_area: payload.knowledge_area || 'Integration',
    description: payload.description ?? null,
    inputs: payload.inputs ?? [],
    tools_techniques: payload.tools_techniques ?? [],
    outputs: payload.outputs ?? [],
    tags: payload.tags ?? [],
    status: payload.status || 'draft',
    is_draft: !!payload.is_draft,
    draft_expires_at: payload.draft_expires_at ?? null,
    tailoring_notes: payload.tailoring_notes ?? null,
    created_by: payload.created_by ?? null,
  }
  const { data, error } = await platformDb.from('project_ittos').insert(row).select().single()
  if (error) throw error
  return mapProjectRow(data)
}

export async function copyFromTemplate(templateId, projectId, tailoringNotes, createdByUserId) {
  const tpl = await getITTOTemplateById(templateId)
  if (!tpl) throw new Error('Template not found')
  return createProjectITTO({
    project_id: projectId,
    template_id: templateId,
    name: tpl.name,
    process_group: tpl.process_group,
    knowledge_area: tpl.knowledge_area,
    description: tpl.description,
    inputs: tpl.inputs,
    tools_techniques: tpl.tools_techniques,
    outputs: tpl.outputs,
    tags: tpl.tags || [],
    status: 'draft',
    is_draft: true,
    tailoring_notes: tailoringNotes ?? null,
    created_by: createdByUserId,
  })
}

export async function updateProjectITTO(id, patch) {
  const { data, error } = await platformDb
    .from('project_ittos')
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return mapProjectRow(data)
}

export async function deleteProjectITTO(id) {
  const { error } = await platformDb.from('project_ittos').delete().eq('id', id)
  if (error) throw error
}

/**
 * Draft queue: templates and project ITTOs created by user (on hold).
 */
export async function getDraftITTOs(userId, organisationId) {
  const { data: tpls, error: e1 } = await platformDb
    .from('itto_templates')
    .select('*')
    .eq('organisation_id', organisationId)
    .eq('created_by', userId)
    .eq('is_draft', true)
    .order('updated_at', { ascending: false })

  if (e1) throw e1

  const { data: projects, error: e2 } = await platformDb
    .from('project_ittos')
    .select('*')
    .eq('created_by', userId)
    .eq('is_draft', true)
    .order('updated_at', { ascending: false })

  if (e2) throw e2

  return {
    templates: (tpls || []).map(mapTemplateRow),
    projectITTos: (projects || []).map(mapProjectRow),
  }
}
