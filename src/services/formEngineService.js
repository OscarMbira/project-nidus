import { platformDb, simDb } from './supabase/supabaseClient'

function getDb(mode = 'platform') {
  return mode === 'sim' ? simDb : platformDb
}

function ok(data) {
  return { success: true, data }
}

function fail(error) {
  return { success: false, message: error?.message || String(error), error }
}

export async function getFormTemplates(processGroup, mode = 'platform', roleFilter) {
  try {
    let query = getDb(mode).from('form_templates').select('*').order('name')
    if (processGroup) query = query.eq('process_group', processGroup)
    if (roleFilter) query = query.contains('allowed_roles', [roleFilter])
    const { data, error } = await query
    if (error) throw error
    return ok(data || [])
  } catch (error) {
    return fail(error)
  }
}

export async function getFormTemplate(templateCode, mode = 'platform') {
  try {
    const db = getDb(mode)
    const { data: template, error: e1 } = await db.from('form_templates').select('*').eq('template_code', templateCode).single()
    if (e1) throw e1
    const { data: version, error: e2 } = await db
      .from('form_template_versions')
      .select('*')
      .eq('template_id', template.id)
      .eq('is_current', true)
      .single()
    if (e2) throw e2
    return ok({ ...template, current_version: version })
  } catch (error) {
    return fail(error)
  }
}

export async function createFormInstance(projectId, templateCode, ownerId, mode = 'platform') {
  try {
    const db = getDb(mode)
    const template = await getFormTemplate(templateCode, mode)
    if (!template.success) return template
    const { data, error } = await db
      .from('form_instances')
      .insert({
        project_id: projectId,
        template_id: template.data.id,
        template_version_id: template.data.current_version.id,
        owner_id: ownerId,
        status: 'draft',
      })
      .select('*')
      .single()
    if (error) throw error
    return ok(data)
  } catch (error) {
    return fail(error)
  }
}

export async function getFormInstance(formInstanceId, mode = 'platform') {
  try {
    const db = getDb(mode)
    const { data: instance, error: e1 } = await db.from('form_instances').select('*').eq('id', formInstanceId).single()
    if (e1) throw e1
    const { data: values, error: e2 } = await db.from('form_instance_values').select('*').eq('form_instance_id', formInstanceId)
    if (e2) throw e2
    const { data: rows, error: e3 } = await db.from('form_instance_rows').select('*').eq('form_instance_id', formInstanceId)
    if (e3) throw e3
    return ok({ ...instance, values: values || [], rows: rows || [] })
  } catch (error) {
    return fail(error)
  }
}

export async function updateFormValues(formInstanceId, values, mode = 'platform') {
  try {
    const db = getDb(mode)
    const payload = Object.entries(values || {}).map(([field_key, value]) => ({
      form_instance_id: formInstanceId,
      field_key,
      field_value: value,
    }))
    const { error } = await db.from('form_instance_values').upsert(payload, { onConflict: 'form_instance_id,field_key' })
    if (error) throw error
    return createFormVersion(formInstanceId, mode)
  } catch (error) {
    return fail(error)
  }
}

export async function updateFormRows(formInstanceId, sectionKey, rows, mode = 'platform') {
  try {
    const db = getDb(mode)
    await db.from('form_instance_rows').delete().eq('form_instance_id', formInstanceId).eq('section_key', sectionKey)
    const payload = (rows || []).map((row, index) => ({
      form_instance_id: formInstanceId,
      section_key: sectionKey,
      row_index: index,
      row_value: row,
    }))
    if (payload.length) {
      const { error } = await db.from('form_instance_rows').insert(payload)
      if (error) throw error
    }
    return createFormVersion(formInstanceId, mode)
  } catch (error) {
    return fail(error)
  }
}

async function transitionStatus(formInstanceId, status, mode = 'platform', details = {}) {
  const db = getDb(mode)
  const { data, error } = await db
    .from('form_instances')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', formInstanceId)
    .select('*')
    .single()
  if (error) throw error
  await db.from('form_audit_log').insert({
    form_instance_id: formInstanceId,
    action: `status.${status}`,
    details,
  })
  return data
}

export async function submitFormForApproval(formInstanceId, mode = 'platform') {
  try {
    return ok(await transitionStatus(formInstanceId, 'in_review', mode))
  } catch (error) {
    return fail(error)
  }
}

export async function approveForm(formInstanceId, approverId, comments, mode = 'platform') {
  try {
    const db = getDb(mode)
    await db.from('form_approvals').insert({ form_instance_id: formInstanceId, approver_id: approverId, decision: 'approved', comments })
    return ok(await transitionStatus(formInstanceId, 'approved', mode, { approverId, comments }))
  } catch (error) {
    return fail(error)
  }
}

export async function rejectForm(formInstanceId, approverId, comments, mode = 'platform') {
  try {
    const db = getDb(mode)
    await db.from('form_approvals').insert({ form_instance_id: formInstanceId, approver_id: approverId, decision: 'rejected', comments })
    return ok(await transitionStatus(formInstanceId, 'rejected', mode, { approverId, comments }))
  } catch (error) {
    return fail(error)
  }
}

export async function archiveForm(formInstanceId, mode = 'platform') {
  try {
    return ok(await transitionStatus(formInstanceId, 'archived', mode))
  } catch (error) {
    return fail(error)
  }
}

export async function createFormVersion(formInstanceId, mode = 'platform') {
  try {
    const instance = await getFormInstance(formInstanceId, mode)
    if (!instance.success) return instance
    const db = getDb(mode)
    const { data: latest } = await db
      .from('form_version_history')
      .select('version_number')
      .eq('form_instance_id', formInstanceId)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle()
    const nextVersion = (latest?.version_number || 0) + 1
    const { data, error } = await db
      .from('form_version_history')
      .insert({
        form_instance_id: formInstanceId,
        version_number: nextVersion,
        snapshot: instance.data,
      })
      .select('*')
      .single()
    if (error) throw error
    return ok(data)
  } catch (error) {
    return fail(error)
  }
}

export async function getFormsByProject(projectId, filters = {}, mode = 'platform') {
  try {
    let query = getDb(mode).from('form_instances').select('*').eq('project_id', projectId).order('updated_at', { ascending: false })
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.templateId) query = query.eq('template_id', filters.templateId)
    const { data, error } = await query
    if (error) throw error
    return ok(data || [])
  } catch (error) {
    return fail(error)
  }
}

export async function getFormDashboardSummary(projectId, mode = 'platform') {
  try {
    const forms = await getFormsByProject(projectId, {}, mode)
    if (!forms.success) return forms
    const summary = forms.data.reduce((acc, item) => {
      acc.total += 1
      acc.byStatus[item.status] = (acc.byStatus[item.status] || 0) + 1
      return acc
    }, { total: 0, byStatus: {} })
    return ok(summary)
  } catch (error) {
    return fail(error)
  }
}

export async function addFormAttachment(formInstanceId, file, mode = 'platform') {
  try {
    const db = getDb(mode)
    const path = `forms/${formInstanceId}/${Date.now()}-${file.name}`
    const bucket = 'form-attachments'
    const { error: uploadError } = await db.storage.from(bucket).upload(path, file, { upsert: true })
    if (uploadError) throw uploadError
    const { data, error } = await db.from('form_attachments').insert({
      form_instance_id: formInstanceId,
      storage_bucket: bucket,
      storage_path: path,
      file_name: file.name,
    }).select('*').single()
    if (error) throw error
    return ok(data)
  } catch (error) {
    return fail(error)
  }
}

export async function addFormComment(formInstanceId, userId, text, mode = 'platform') {
  try {
    const { data, error } = await getDb(mode)
      .from('form_comments')
      .insert({ form_instance_id: formInstanceId, user_id: userId, comment_text: text })
      .select('*')
      .single()
    if (error) throw error
    return ok(data)
  } catch (error) {
    return fail(error)
  }
}

export async function syncToNormalizedTable(formInstanceId) {
  return ok({ formInstanceId, synced: true })
}

export async function createRecordLink(projectId, sourceType, sourceId, targetType, targetId, relationshipType, mode = 'platform') {
  try {
    const { data, error } = await getDb(mode)
      .from('record_links')
      .insert({
        project_id: projectId,
        source_type: sourceType,
        source_id: sourceId,
        target_type: targetType,
        target_id: targetId,
        relationship_type: relationshipType,
      })
      .select('*')
      .single()
    if (error) throw error
    return ok(data)
  } catch (error) {
    return fail(error)
  }
}
