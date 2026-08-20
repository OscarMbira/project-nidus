import { platformDb, simDb } from './supabase/supabaseClient'
import { resolveEffectiveDocumentMaster } from '@nidus/shared/services/pmTemplateInheritanceService.js'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'
import {
  DEFAULT_FORM_BULK_APPROVE_MAX,
  looksLikeFormInstanceUuid,
  normalizeFormBulkApproveMax,
  pickFormInstanceDisplayTitle,
} from '@nidus/shared/utils/formInstanceRegisterUtils.js'

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

const TEMPLATE_CODE_RE = /^F(\d+)$/i

export function parseTemplateCodeNumber(templateCode) {
  const match = String(templateCode || '').trim().match(TEMPLATE_CODE_RE)
  return match ? Number(match[1]) : null
}

export function formatTemplateCode(number) {
  return `F${String(number).padStart(3, '0')}`
}

/** Suggest the next F0xx code from existing templates. */
export async function suggestNextTemplateCode(mode = 'platform') {
  try {
    const { data, error } = await getDb(mode).from('form_templates').select('template_code')
    if (error) throw error
    const maxNum = (data || []).reduce((max, row) => {
      const n = parseTemplateCodeNumber(row.template_code)
      return n != null && n > max ? n : max
    }, 0)
    return ok(formatTemplateCode(maxNum + 1))
  } catch (error) {
    return fail(error)
  }
}

function normalizeTemplateSchema(schema) {
  const sections = Array.isArray(schema?.sections) ? schema.sections : []
  return {
    title: schema?.title || '',
    sections: sections.map((section, sIdx) => ({
      key: String(section.key || `section_${sIdx + 1}`).trim(),
      title: String(section.title || `Section ${sIdx + 1}`).trim(),
      fields: (section.fields || []).map((field, fIdx) => {
        const type = field.type || 'text'
        const normalized = {
          key: String(field.key || `field_${fIdx + 1}`).trim(),
          label: String(field.label || `Field ${fIdx + 1}`).trim(),
          type,
        }
        if (field.required) normalized.required = true
        if (type === 'select' && Array.isArray(field.options)) {
          normalized.options = field.options.filter(Boolean)
        }
        return normalized
      }),
    })),
  }
}

/** Upsert form_templates row by template_code. */
export async function upsertFormTemplate(
  { templateCode, name, processGroup, isActive = true },
  mode = 'platform',
) {
  try {
    const db = getDb(mode)
    const code = String(templateCode || '').trim().toUpperCase()
    if (!code) throw new Error('Template code is required')
    if (!name?.trim()) throw new Error('Template name is required')
    if (!processGroup?.trim()) throw new Error('Process group is required')

    const payload = {
      template_code: code,
      name: name.trim(),
      process_group: processGroup.trim(),
      is_active: Boolean(isActive),
      updated_at: new Date().toISOString(),
    }

    try {
      const { data: authData } = await db.auth.getUser()
      if (authData?.user?.id) payload.updated_by = authData.user.id
    } catch {
      // updated_by optional when auth unavailable
    }

    const { data: existing, error: existingErr } = await db
      .from('form_templates')
      .select('id')
      .eq('template_code', code)
      .maybeSingle()
    if (existingErr) throw existingErr

    if (existing?.id) {
      const { data, error } = await db
        .from('form_templates')
        .update(payload)
        .eq('id', existing.id)
        .select('*')
        .single()
      if (error) throw error
      return ok(data)
    }

    const insertPayload = {
      ...payload,
      ...(payload.updated_by ? { created_by: payload.updated_by } : {}),
    }
    const { data, error } = await db.from('form_templates').insert(insertPayload).select('*').single()
    if (error) throw error
    return ok(data)
  } catch (error) {
    return fail(error)
  }
}

/** Insert a new current version and retire the previous current version. */
export async function publishFormTemplateVersion(templateId, schema, mode = 'platform') {
  try {
    const db = getDb(mode)
    if (!templateId) throw new Error('Template id is required')

    const normalizedSchema = normalizeTemplateSchema(schema)

    const { data: latest, error: latestErr } = await db
      .from('form_template_versions')
      .select('version_number')
      .eq('template_id', templateId)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (latestErr) throw latestErr

    const nextVersion = (latest?.version_number || 0) + 1

    const { error: retireErr } = await db
      .from('form_template_versions')
      .update({ is_current: false })
      .eq('template_id', templateId)
      .eq('is_current', true)
    if (retireErr) throw retireErr

    const { data, error } = await db
      .from('form_template_versions')
      .insert({
        template_id: templateId,
        version_number: nextVersion,
        schema: normalizedSchema,
        is_current: true,
      })
      .select('*')
      .single()
    if (error) throw error

    return ok(data)
  } catch (error) {
    return fail(error)
  }
}

/** Upsert template metadata and publish a new schema version in one call. */
export async function saveFormTemplate(
  { templateCode, name, processGroup, isActive, schema },
  mode = 'platform',
) {
  try {
    const templateResult = await upsertFormTemplate(
      { templateCode, name, processGroup, isActive },
      mode,
    )
    if (!templateResult.success) return templateResult

    const versionResult = await publishFormTemplateVersion(
      templateResult.data.id,
      schema,
      mode,
    )
    if (!versionResult.success) return versionResult

    return ok({
      template: templateResult.data,
      version: versionResult.data,
      template_code: templateResult.data.template_code,
      version_number: versionResult.data.version_number,
    })
  } catch (error) {
    return fail(error)
  }
}

export async function createFormInstance(projectId, templateCode, ownerId, mode = 'platform') {
  try {
    const db = getDb(mode)
    let resolvedOwnerId = ownerId || null
    if (!resolvedOwnerId) {
      try {
        const { data: authData } = await platformDb.auth.getUser()
        const authUserId = authData?.user?.id
        if (authUserId) {
          // users lives in public schema even when writing sim.form_instances
          const { data: userRow } = await platformDb
            .from('users')
            .select('id')
            .eq('auth_user_id', authUserId)
            .maybeSingle()
          resolvedOwnerId = userRow?.id || null
        }
      } catch {
        // owner is optional; continue without it
      }
    }

    // Prefer membership-checked SECURITY DEFINER RPC (v859) — avoids PostgREST
    // INSERT…RETURNING 403 when table RLS is missing/misapplied.
    const { data: rpcData, error: rpcError } = await db.rpc('create_draft_form_instance', {
      p_project_id: projectId,
      p_template_code: String(templateCode || '').trim(),
      p_owner_id: resolvedOwnerId,
    })
    if (!rpcError && rpcData) {
      return ok(Array.isArray(rpcData) ? rpcData[0] : rpcData)
    }
    // Fall back to direct insert when RPC not deployed yet
    if (rpcError && !/Could not find the function|PGRST202|42883/i.test(rpcError.message || '')) {
      throw rpcError
    }

    const template = await getFormTemplate(templateCode, mode)
    if (!template.success) return template
    const { data, error } = await db
      .from('form_instances')
      .insert({
        project_id: projectId,
        template_id: template.data.id,
        template_version_id: template.data.current_version.id,
        owner_id: resolvedOwnerId,
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

export async function getFormInstance(formInstanceKey, mode = 'platform') {
  try {
    const db = getDb(mode)
    const key = String(formInstanceKey || '').trim()
    if (!key) throw new Error('Form instance id is required')

    let instance = null
    // Prefer UUID lookup when the segment looks like one (legacy bookmarks).
    if (looksLikeFormInstanceUuid(key)) {
      const { data, error } = await db.from('form_instances').select('*').eq('id', key).maybeSingle()
      if (error) throw error
      instance = data
    }
    if (!instance) {
      const { data, error } = await db
        .from('form_instances')
        .select('*')
        .eq('instance_reference', key)
        .maybeSingle()
      if (error) throw error
      instance = data
    }
    // Last resort: treat as UUID even if the regex failed (defensive).
    if (!instance) {
      const { data, error } = await db.from('form_instances').select('*').eq('id', key).maybeSingle()
      if (error) throw error
      instance = data
    }
    if (!instance) throw new Error('Form instance not found')

    const formInstanceId = instance.id
    const { data: values, error: e2 } = await db.from('form_instance_values').select('*').eq('form_instance_id', formInstanceId)
    if (e2) throw e2
    const { data: rows, error: e3 } = await db.from('form_instance_rows').select('*').eq('form_instance_id', formInstanceId)
    if (e3) throw e3

    let schema = { sections: [] }
    if (instance.template_version_id) {
      const { data: version } = await db
        .from('form_template_versions')
        .select('schema')
        .eq('id', instance.template_version_id)
        .maybeSingle()
      if (version?.schema) schema = version.schema
    }

    let template = null
    if (instance.template_id) {
      const { data: tmpl } = await db
        .from('form_templates')
        .select('id, template_code, name')
        .eq('id', instance.template_id)
        .maybeSingle()
      template = tmpl || null
    }

    const display_title = pickFormInstanceDisplayTitle({
      valueRows: values || [],
      instanceReference: instance.instance_reference,
      templateName: template?.name || '',
      fallbackId: instance.id,
    })
    return ok({
      ...instance,
      values: values || [],
      rows: rows || [],
      schema,
      template,
      display_title,
    })
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

async function resolveCurrentAppUserId() {
  try {
    const { data: authData } = await platformDb.auth.getUser()
    const authUserId = authData?.user?.id
    if (!authUserId) return null
    const { data: userRow } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', authUserId)
      .maybeSingle()
    return userRow?.id || null
  } catch {
    return null
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
    const trimmed = String(comments || '').trim()
    if (!trimmed) throw new Error('Approval justification is required')
    const db = getDb(mode)
    const resolvedApproverId = approverId || (await resolveCurrentAppUserId())
    await db.from('form_approvals').insert({
      form_instance_id: formInstanceId,
      approver_id: resolvedApproverId,
      decision: 'approved',
      comments: trimmed,
    })
    return ok(
      await transitionStatus(formInstanceId, 'approved', mode, {
        approverId: resolvedApproverId,
        comments: trimmed,
      }),
    )
  } catch (error) {
    return fail(error)
  }
}

export async function rejectForm(formInstanceId, approverId, comments, mode = 'platform') {
  try {
    const trimmed = String(comments || '').trim()
    if (!trimmed) throw new Error('Rejection justification is required')
    const db = getDb(mode)
    const resolvedApproverId = approverId || (await resolveCurrentAppUserId())
    await db.from('form_approvals').insert({
      form_instance_id: formInstanceId,
      approver_id: resolvedApproverId,
      decision: 'rejected',
      comments: trimmed,
    })
    return ok(
      await transitionStatus(formInstanceId, 'rejected', mode, {
        approverId: resolvedApproverId,
        comments: trimmed,
      }),
    )
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

/** Archive many form instances (used by Draft Queue bulk delete). */
export async function bulkArchiveFormInstances(formInstanceIds, mode = 'platform') {
  try {
    const ids = [...new Set((formInstanceIds || []).filter(Boolean))]
    if (!ids.length) throw new Error('No drafts selected')
    const results = []
    const errors = []
    for (const id of ids) {
      const r = await archiveForm(id, mode)
      if (r.success) results.push(r.data)
      else errors.push({ id, message: r.message })
    }
    if (errors.length && !results.length) {
      throw new Error(errors[0]?.message || 'Bulk delete failed')
    }
    return ok({ archived: results, errors })
  } catch (error) {
    return fail(error)
  }
}

/** Approve many draft instances with one shared comment (v860). */
export async function bulkApproveFormInstances(formInstanceIds, comments, mode = 'platform') {
  try {
    const ids = [...new Set((formInstanceIds || []).filter(Boolean))]
    if (!ids.length) throw new Error('No drafts selected')
    const trimmed = String(comments || '').trim()
    if (!trimmed) throw new Error('Approval justification is required')
    const results = []
    const errors = []
    for (const id of ids) {
      const r = await approveForm(id, null, trimmed, mode)
      if (r.success) results.push(r.data)
      else errors.push({ id, message: r.message })
    }
    if (errors.length && !results.length) {
      throw new Error(errors[0]?.message || 'Bulk approve failed')
    }
    return ok({ approved: results, errors })
  } catch (error) {
    return fail(error)
  }
}

export async function getFormVersionHistory(formInstanceId, mode = 'platform') {
  try {
    const { data, error } = await getDb(mode)
      .from('form_version_history')
      .select('id, version_number, created_at')
      .eq('form_instance_id', formInstanceId)
      .order('version_number', { ascending: false })
    if (error) throw error
    return ok(data || [])
  } catch (error) {
    return fail(error)
  }
}

/**
 * Re-point a form instance at its template's CURRENT version (v863) — lets an existing
 * draft/in-review record pick up fields added to the template since the record was created
 * (e.g. a new Attachment field). Purely re-binds `template_version_id`; does not attempt to
 * migrate/reshape already-submitted values for fields that were renamed, retyped, or removed
 * on the newer version — those values stay in `form_instance_values` untouched but simply stop
 * being rendered (not deleted), since only the schema drives what's shown.
 */
export async function syncFormInstanceToLatestVersion(formInstanceId, mode = 'platform') {
  try {
    if (!formInstanceId) throw new Error('Form instance id is required')
    const db = getDb(mode)
    const { data: instance, error: instErr } = await db
      .from('form_instances')
      .select('template_id, template_version_id')
      .eq('id', formInstanceId)
      .single()
    if (instErr) throw instErr

    const { data: currentVersion, error: verErr } = await db
      .from('form_template_versions')
      .select('id, version_number')
      .eq('template_id', instance.template_id)
      .eq('is_current', true)
      .single()
    if (verErr) throw verErr

    if (currentVersion.id === instance.template_version_id) {
      return ok({ alreadyCurrent: true, versionNumber: currentVersion.version_number })
    }

    const { data, error } = await db
      .from('form_instances')
      .update({ template_version_id: currentVersion.id, updated_at: new Date().toISOString() })
      .eq('id', formInstanceId)
      .select('*')
      .single()
    if (error) throw error

    await db.from('form_audit_log').insert({
      form_instance_id: formInstanceId,
      action: 'template_version.synced',
      details: {
        fromVersionId: instance.template_version_id,
        toVersionId: currentVersion.id,
        toVersionNumber: currentVersion.version_number,
      },
    })

    return ok({ alreadyCurrent: false, versionNumber: currentVersion.version_number, instance: data })
  } catch (error) {
    return fail(error)
  }
}

export async function getFormAuditLog(formInstanceId, mode = 'platform') {
  try {
    const { data, error } = await getDb(mode)
      .from('form_audit_log')
      .select('id, action, details, created_at')
      .eq('form_instance_id', formInstanceId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return ok(data || [])
  } catch (error) {
    return fail(error)
  }
}

/** Org soft cap for bulk approve (accounts.form_bulk_approve_max). */
export async function getFormBulkApproveMaxForProject(projectId, mode = 'platform') {
  try {
    let accountId = null
    if (projectId && mode !== 'sim') {
      const { data: project, error: pErr } = await platformDb
        .from('projects')
        .select('account_id')
        .eq('id', projectId)
        .maybeSingle()
      if (pErr) throw pErr
      accountId = project?.account_id || null
    }
    // Simulator practice projects have no account_id — use current user's org account.
    if (!accountId) {
      accountId = await getCurrentUserAccountId()
    }
    if (!accountId) return ok(DEFAULT_FORM_BULK_APPROVE_MAX)
    const { data: account, error: aErr } = await platformDb
      .from('accounts')
      .select('form_bulk_approve_max')
      .eq('id', accountId)
      .maybeSingle()
    if (aErr) throw aErr
    return ok(normalizeFormBulkApproveMax(account?.form_bulk_approve_max))
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
    // v850: join template name/code for the Project Forms register columns
    const db = getDb(mode)
    let query = db
      .from('form_instances')
      .select('*, form_templates(id, template_code, name)')
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false })
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.templateId) query = query.eq('template_id', filters.templateId)
    const { data, error } = await query
    if (error) throw error

    const ids = (data || []).map((r) => r.id).filter(Boolean)
    const valuesByInstance = {}
    if (ids.length) {
      const { data: valueRows, error: vErr } = await db
        .from('form_instance_values')
        .select('form_instance_id, field_key, field_value')
        .in('form_instance_id', ids)
      if (vErr) throw vErr
      for (const vr of valueRows || []) {
        if (!valuesByInstance[vr.form_instance_id]) valuesByInstance[vr.form_instance_id] = []
        valuesByInstance[vr.form_instance_id].push(vr)
      }
    }

    const rows = (data || []).map((row) => {
      const tmpl = row.form_templates
      const { form_templates: _ft, ...rest } = row
      const template_name = tmpl?.name || ''
      const template_code = tmpl?.template_code || ''
      const display_title = pickFormInstanceDisplayTitle({
        valueRows: valuesByInstance[row.id] || [],
        instanceReference: rest.instance_reference,
        templateName: template_name,
        fallbackId: row.id,
      })
      return {
        ...rest,
        template_name,
        template_code,
        display_title,
      }
    })
    return ok(rows)
  } catch (error) {
    return fail(error)
  }
}

/** All translation rows for a template (every language) — callers filter/index by language client-side. */
export async function getFieldTranslations(templateId, mode = 'platform') {
  try {
    if (!templateId) throw new Error('Template id is required')
    const { data, error } = await getDb(mode)
      .from('form_field_translations')
      .select('section_key, field_key, language_code, label, option_labels')
      .eq('template_id', templateId)
    if (error) throw error
    return ok(data || [])
  } catch (error) {
    return fail(error)
  }
}

/** Upsert translated labels/option-labels for one template + language (used by the bulk Excel import). */
export async function bulkUpsertFieldTranslations(templateId, languageCode, rows, mode = 'platform') {
  try {
    if (!templateId || !languageCode) throw new Error('Template id and language code are required')

    const payload = (rows || [])
      .filter((row) => row?.section_key && row?.field_key)
      .map((row) => ({
        template_id: templateId,
        section_key: row.section_key,
        field_key: row.field_key,
        language_code: languageCode,
        label: row.label || null,
        option_labels: row.option_labels || {},
      }))

    if (!payload.length) return ok({ upserted: 0 })

    const { error } = await getDb(mode)
      .from('form_field_translations')
      .upsert(payload, { onConflict: 'template_id,section_key,field_key,language_code' })
    if (error) throw error

    return ok({ upserted: payload.length })
  } catch (error) {
    return fail(error)
  }
}

/** Which fields/sections of a template have at least one submitted record's data — used to gate safe deletion in the builder. */
export async function getFormTemplateFieldUsage(templateId, mode = 'platform') {
  try {
    if (!templateId) throw new Error('Template id is required')
    const db = getDb(mode)

    const { data: valueRows, error: valuesErr } = await db
      .from('form_instance_values')
      .select('field_key, field_value, form_instances!inner(template_id)')
      .eq('form_instances.template_id', templateId)
    if (valuesErr) throw valuesErr

    const { data: rowRows, error: rowsErr } = await db
      .from('form_instance_rows')
      .select('section_key, form_instances!inner(template_id)')
      .eq('form_instances.template_id', templateId)
    if (rowsErr) throw rowsErr

    const fieldKeysInUse = new Set(
      (valueRows || [])
        .filter((row) => row.field_value !== null && row.field_value !== undefined && String(row.field_value).trim() !== '')
        .map((row) => row.field_key),
    )
    const sectionKeysWithRows = new Set((rowRows || []).map((row) => row.section_key))

    return ok({
      fieldKeysInUse: [...fieldKeysInUse],
      sectionKeysWithRows: [...sectionKeysWithRows],
    })
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

/**
 * scope = { scopeEntityType, scopeEntityId } — omitted/null means the org-wide default row
 * (scope_entity_type = 'account', unchanged pre-v812 behaviour). scope_entity_id is only
 * meaningful (and only filtered on) for a real tier scope — the 'account' row's own
 * scope_entity_id is just a NOT-NULL sentinel (the organisation's own id), never queried on.
 */
function applyScopeFilter(query, scope = {}) {
  const scopeEntityType = scope?.scopeEntityType || 'account'
  const scoped = query.eq('scope_entity_type', scopeEntityType)
  return scopeEntityType === 'account' ? scoped : scoped.eq('scope_entity_id', scope.scopeEntityId)
}

/** Fetch field overrides for a template at a given scope (org-wide by default; no row = enabled, required inherits master). */
export async function getFieldOverridesForOrg(organisationId, templateId, mode = 'platform', scope = {}) {
  try {
    if (!organisationId || !templateId) {
      throw new Error('Organisation id and template id are required')
    }
    let query = getDb(mode)
      .from('form_template_field_overrides')
      .select('section_key, field_key, is_enabled, is_required, label_override, field_type_override, options_override, scope_entity_type, scope_entity_id')
      .eq('organisation_id', organisationId)
      .eq('template_id', templateId)
    query = applyScopeFilter(query, scope)
    const { data, error } = await query
    if (error) throw error
    return ok(data || [])
  } catch (error) {
    return fail(error)
  }
}

/** Upsert a field enable/disable override at a given scope (org-wide by default). */
export async function setFieldEnabledForOrg(
  { organisationId, templateId, sectionKey, fieldKey, isEnabled, updatedByUserId = null, scopeEntityType = null, scopeEntityId = null },
  mode = 'platform',
) {
  try {
    if (!organisationId || !templateId || !sectionKey || !fieldKey) {
      throw new Error('Organisation id, template id, section key, and field key are required')
    }
    const payload = {
      organisation_id: organisationId,
      template_id: templateId,
      section_key: String(sectionKey).trim(),
      field_key: String(fieldKey).trim(),
      is_enabled: Boolean(isEnabled),
      scope_entity_type: scopeEntityType || 'account',
      scope_entity_id: scopeEntityType ? scopeEntityId : organisationId,
      updated_by: updatedByUserId || null,
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await getDb(mode)
      .from('form_template_field_overrides')
      .upsert(payload, { onConflict: 'organisation_id,template_id,section_key,field_key,scope_entity_type,scope_entity_id' })
      .select('*')
      .single()
    if (error) throw error
    return ok(data)
  } catch (error) {
    return fail(error)
  }
}

/** Upsert a field required override at a given scope. `isRequired = null` clears the override (inherit). */
export async function setFieldRequiredForOrg(
  { organisationId, templateId, sectionKey, fieldKey, isRequired, updatedByUserId = null, scopeEntityType = null, scopeEntityId = null },
  mode = 'platform',
) {
  try {
    if (!organisationId || !templateId || !sectionKey || !fieldKey) {
      throw new Error('Organisation id, template id, section key, and field key are required')
    }
    const payload = {
      organisation_id: organisationId,
      template_id: templateId,
      section_key: String(sectionKey).trim(),
      field_key: String(fieldKey).trim(),
      is_required: isRequired === null || isRequired === undefined ? null : Boolean(isRequired),
      scope_entity_type: scopeEntityType || 'account',
      scope_entity_id: scopeEntityType ? scopeEntityId : organisationId,
      updated_by: updatedByUserId || null,
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await getDb(mode)
      .from('form_template_field_overrides')
      .upsert(payload, { onConflict: 'organisation_id,template_id,section_key,field_key,scope_entity_type,scope_entity_id' })
      .select('*')
      .single()
    if (error) throw error
    return ok(data)
  } catch (error) {
    return fail(error)
  }
}

/** Upsert a field label override at a given scope. `label = null` clears the override (inherit). */
export async function setFieldLabelForOrg(
  { organisationId, templateId, sectionKey, fieldKey, label, updatedByUserId = null, scopeEntityType = null, scopeEntityId = null },
  mode = 'platform',
) {
  try {
    if (!organisationId || !templateId || !sectionKey || !fieldKey) {
      throw new Error('Organisation id, template id, section key, and field key are required')
    }
    const trimmed = label == null ? null : String(label).trim()
    const payload = {
      organisation_id: organisationId,
      template_id: templateId,
      section_key: String(sectionKey).trim(),
      field_key: String(fieldKey).trim(),
      label_override: trimmed === '' ? null : trimmed,
      scope_entity_type: scopeEntityType || 'account',
      scope_entity_id: scopeEntityType ? scopeEntityId : organisationId,
      updated_by: updatedByUserId || null,
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await getDb(mode)
      .from('form_template_field_overrides')
      .upsert(payload, { onConflict: 'organisation_id,template_id,section_key,field_key,scope_entity_type,scope_entity_id' })
      .select('*')
      .single()
    if (error) throw error
    return ok(data)
  } catch (error) {
    return fail(error)
  }
}

/**
 * Upsert a field type override at a given scope. `fieldType = null` clears both the type and
 * options overrides together — an override without a type doesn't make sense to keep half-set.
 * `options` is only persisted when `fieldType === 'select'`.
 */
export async function setFieldTypeForOrg(
  { organisationId, templateId, sectionKey, fieldKey, fieldType, options = null, updatedByUserId = null, scopeEntityType = null, scopeEntityId = null },
  mode = 'platform',
) {
  try {
    if (!organisationId || !templateId || !sectionKey || !fieldKey) {
      throw new Error('Organisation id, template id, section key, and field key are required')
    }
    const type = fieldType || null
    if (type === 'select' && !(Array.isArray(options) && options.filter(Boolean).length > 0)) {
      throw new Error('At least one option is required when overriding a field to Select.')
    }
    const payload = {
      organisation_id: organisationId,
      template_id: templateId,
      section_key: String(sectionKey).trim(),
      field_key: String(fieldKey).trim(),
      field_type_override: type,
      options_override: type === 'select' ? options.filter(Boolean) : null,
      scope_entity_type: scopeEntityType || 'account',
      scope_entity_id: scopeEntityType ? scopeEntityId : organisationId,
      updated_by: updatedByUserId || null,
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await getDb(mode)
      .from('form_template_field_overrides')
      .upsert(payload, { onConflict: 'organisation_id,template_id,section_key,field_key,scope_entity_type,scope_entity_id' })
      .select('*')
      .single()
    if (error) throw error
    return ok(data)
  } catch (error) {
    return fail(error)
  }
}

/**
 * Upsert min/max character length overrides at a given scope.
 * Pass `null` for either bound to clear that override (inherit). Both may be set together.
 */
export async function setFieldLengthForOrg(
  {
    organisationId,
    templateId,
    sectionKey,
    fieldKey,
    minLength = null,
    maxLength = null,
    updatedByUserId = null,
    scopeEntityType = null,
    scopeEntityId = null,
  },
  mode = 'platform',
) {
  try {
    if (!organisationId || !templateId || !sectionKey || !fieldKey) {
      throw new Error('Organisation id, template id, section key, and field key are required')
    }
    const toNullableInt = (value) => {
      if (value == null || value === '') return null
      const n = Number(value)
      if (!Number.isInteger(n) || n < 0) {
        throw new Error('Min/max length must be a non-negative whole number')
      }
      return n
    }
    const min = toNullableInt(minLength)
    const max = toNullableInt(maxLength)
    if (min != null && max != null && max < min) {
      throw new Error('Max length cannot be less than min length')
    }
    const payload = {
      organisation_id: organisationId,
      template_id: templateId,
      section_key: String(sectionKey).trim(),
      field_key: String(fieldKey).trim(),
      min_length_override: min,
      max_length_override: max,
      scope_entity_type: scopeEntityType || 'account',
      scope_entity_id: scopeEntityType ? scopeEntityId : organisationId,
      updated_by: updatedByUserId || null,
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await getDb(mode)
      .from('form_template_field_overrides')
      .upsert(payload, { onConflict: 'organisation_id,template_id,section_key,field_key,scope_entity_type,scope_entity_id' })
      .select('*')
      .single()
    if (error) throw error
    return ok(data)
  } catch (error) {
    return fail(error)
  }
}

/** List locally-added fields for a template at a given scope (org-wide by default). */
export async function listFieldAdditionsForOrg(organisationId, templateId, mode = 'platform', scope = {}) {
  try {
    if (!organisationId || !templateId) {
      throw new Error('Organisation id and template id are required')
    }
    let query = getDb(mode)
      .from('form_template_field_additions')
      .select('id, section_key, field_key, field_definition, scope_entity_type, scope_entity_id, created_by, created_at')
      .eq('organisation_id', organisationId)
      .eq('template_id', templateId)
    query = applyScopeFilter(query, scope)
    const { data, error } = await query.order('created_at')
    if (error) throw error
    return ok(data || [])
  } catch (error) {
    return fail(error)
  }
}

/** Add a new locally-added field to a template section at a given scope (org-wide by default). fieldDefinition: { key, label, type, required, options }. */
export async function addFieldForOrg(
  { organisationId, templateId, sectionKey, fieldDefinition, createdByUserId = null, scopeEntityType = null, scopeEntityId = null },
  mode = 'platform',
) {
  try {
    if (!organisationId || !templateId || !sectionKey || !fieldDefinition?.key) {
      throw new Error('Organisation id, template id, section key, and field definition (with key) are required')
    }
    const fieldKey = String(fieldDefinition.key).trim()
    if (fieldDefinition.type === 'select' && !(Array.isArray(fieldDefinition.options) && fieldDefinition.options.filter(Boolean).length > 0)) {
      throw new Error('At least one option is required for a Select field.')
    }
    const db = getDb(mode)

    // Field keys must be unique per template across ALL scopes/tiers (not just the DB's
    // per-scope unique constraint, v816) — getFormTemplateFieldUsage() checks usage by field_key
    // alone, so a same-keyed addition from two different tiers would corrupt that gate.
    const { data: existing, error: existingErr } = await db
      .from('form_template_field_additions')
      .select('id')
      .eq('organisation_id', organisationId)
      .eq('template_id', templateId)
      .eq('field_key', fieldKey)
      .limit(1)
    if (existingErr) throw existingErr
    if (existing && existing.length > 0) {
      throw new Error(`Field key "${fieldKey}" is already used by another locally-added field on this template — choose a unique key.`)
    }

    // Also must not collide with a standard (master-schema) field key — same reason: field_key
    // is the join key for submitted data across the whole template, master fields included.
    const { data: currentVersion, error: versionErr } = await db
      .from('form_template_versions')
      .select('schema')
      .eq('template_id', templateId)
      .eq('is_current', true)
      .maybeSingle()
    if (versionErr) throw versionErr
    const masterKeys = new Set(
      (currentVersion?.schema?.sections || []).flatMap((s) => (s.fields || []).map((f) => f.key)),
    )
    if (masterKeys.has(fieldKey)) {
      throw new Error(`Field key "${fieldKey}" is already used by a standard field in this template — choose a unique key.`)
    }

    const { data, error } = await db
      .from('form_template_field_additions')
      .insert({
        organisation_id: organisationId,
        template_id: templateId,
        section_key: String(sectionKey).trim(),
        field_key: fieldKey,
        field_definition: fieldDefinition,
        scope_entity_type: scopeEntityType || 'account',
        scope_entity_id: scopeEntityType ? scopeEntityId : organisationId,
        created_by: createdByUserId || null,
      })
      .select('*')
      .single()
    if (error) throw error
    return ok(data)
  } catch (error) {
    return fail(error)
  }
}

/** Delete a locally-added field at a given scope — refuses if any submitted record already has data in it. */
export async function deleteFieldAdditionForOrg(
  { organisationId, templateId, sectionKey, fieldKey, scopeEntityType = null, scopeEntityId = null },
  mode = 'platform',
) {
  try {
    if (!organisationId || !templateId || !sectionKey || !fieldKey) {
      throw new Error('Organisation id, template id, section key, and field key are required')
    }
    const usage = await getFormTemplateFieldUsage(templateId, mode)
    if (!usage.success) throw new Error(usage.message)
    if (usage.data.fieldKeysInUse.includes(fieldKey)) {
      return fail(new Error('This field already has submitted data and cannot be deleted — disable it instead.'))
    }
    let query = getDb(mode)
      .from('form_template_field_additions')
      .delete()
      .eq('organisation_id', organisationId)
      .eq('template_id', templateId)
      .eq('section_key', sectionKey)
      .eq('field_key', fieldKey)
    query = applyScopeFilter(query, { scopeEntityType, scopeEntityId })
    const { error } = await query
    if (error) throw error
    return ok({ deleted: true })
  } catch (error) {
    return fail(error)
  }
}

/**
 * Update display label and/or input type on a local addition's field_definition (v847+).
 * Field key stays locked; label/type/options (and lengths via updateFieldAdditionLength) are editable.
 */
export async function updateFieldAdditionDisplay(
  {
    organisationId,
    templateId,
    sectionKey,
    fieldKey,
    label,
    fieldType,
    options = null,
    scopeEntityType = null,
    scopeEntityId = null,
  },
  mode = 'platform',
) {
  try {
    if (!organisationId || !templateId || !sectionKey || !fieldKey) {
      throw new Error('Organisation id, template id, section key, and field key are required')
    }
    const trimmedLabel = label == null ? '' : String(label).trim()
    if (!trimmedLabel) throw new Error('Display name is required for a local field.')
    const type = fieldType || null
    if (!type) throw new Error('Input type is required for a local field.')
    if (type === 'select' && !(Array.isArray(options) && options.filter(Boolean).length > 0)) {
      throw new Error('At least one option is required when the field type is Select.')
    }
    const db = getDb(mode)
    let query = db
      .from('form_template_field_additions')
      .select('id, field_definition, scope_entity_type, scope_entity_id')
      .eq('organisation_id', organisationId)
      .eq('template_id', templateId)
      .eq('section_key', sectionKey)
      .eq('field_key', fieldKey)
    query = applyScopeFilter(query, { scopeEntityType, scopeEntityId })
    let { data: existing, error: fetchErr } = await query.maybeSingle()
    if (fetchErr) throw fetchErr
    if (!existing) {
      const fallback = await db
        .from('form_template_field_additions')
        .select('id, field_definition, scope_entity_type, scope_entity_id')
        .eq('organisation_id', organisationId)
        .eq('template_id', templateId)
        .eq('section_key', sectionKey)
        .eq('field_key', fieldKey)
        .maybeSingle()
      if (fallback.error) throw fallback.error
      existing = fallback.data
    }
    if (!existing) throw new Error('Local field not found.')
    const nextDefinition = {
      ...existing.field_definition,
      label: trimmedLabel,
      type,
    }
    if (type === 'select') {
      nextDefinition.options = options.filter(Boolean)
    } else {
      delete nextDefinition.options
    }
    const { data, error } = await db
      .from('form_template_field_additions')
      .update({ field_definition: nextDefinition, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select('*')
      .single()
    if (error) throw error
    return ok(data)
  } catch (error) {
    return fail(error)
  }
}

/**
 * Edit the dropdown options on an already-added local Select field, at a given scope.
 * Label/type are editable via updateFieldAdditionDisplay; this helper only patches options.
 */
export async function updateFieldAdditionOptions(
  { organisationId, templateId, sectionKey, fieldKey, options, scopeEntityType = null, scopeEntityId = null },
  mode = 'platform',
) {
  try {
    if (!organisationId || !templateId || !sectionKey || !fieldKey) {
      throw new Error('Organisation id, template id, section key, and field key are required')
    }
    if (!(Array.isArray(options) && options.filter(Boolean).length > 0)) {
      throw new Error('At least one option is required.')
    }
    const db = getDb(mode)
    let query = db
      .from('form_template_field_additions')
      .select('id, field_definition')
      .eq('organisation_id', organisationId)
      .eq('template_id', templateId)
      .eq('section_key', sectionKey)
      .eq('field_key', fieldKey)
    query = applyScopeFilter(query, { scopeEntityType, scopeEntityId })
    const { data: existing, error: fetchErr } = await query.maybeSingle()
    if (fetchErr) throw fetchErr
    if (!existing) throw new Error('Local field not found.')
    if (existing.field_definition?.type !== 'select') {
      throw new Error('Only Select fields have options to edit.')
    }
    const nextDefinition = { ...existing.field_definition, options: options.filter(Boolean) }
    const { data, error } = await db
      .from('form_template_field_additions')
      .update({ field_definition: nextDefinition, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select('*')
      .single()
    if (error) throw error
    return ok(data)
  } catch (error) {
    return fail(error)
  }
}

/**
 * Update min/max character length on a local text/textarea addition's field_definition.
 * Pass null/'' for either bound to clear it.
 */
export async function updateFieldAdditionLength(
  {
    organisationId,
    templateId,
    sectionKey,
    fieldKey,
    minLength = null,
    maxLength = null,
    scopeEntityType = null,
    scopeEntityId = null,
  },
  mode = 'platform',
) {
  try {
    if (!organisationId || !templateId || !sectionKey || !fieldKey) {
      throw new Error('Organisation id, template id, section key, and field key are required')
    }
    const toNullableInt = (value) => {
      if (value == null || value === '') return null
      const n = Number(value)
      if (!Number.isInteger(n) || n < 0) {
        throw new Error('Min/max length must be a non-negative whole number')
      }
      return n
    }
    const min = toNullableInt(minLength)
    const max = toNullableInt(maxLength)
    if (min != null && max != null && max < min) {
      throw new Error('Max length cannot be less than min length')
    }
    const db = getDb(mode)
    let query = db
      .from('form_template_field_additions')
      .select('id, field_definition, scope_entity_type, scope_entity_id')
      .eq('organisation_id', organisationId)
      .eq('template_id', templateId)
      .eq('section_key', sectionKey)
      .eq('field_key', fieldKey)
    query = applyScopeFilter(query, { scopeEntityType, scopeEntityId })
    let { data: existing, error: fetchErr } = await query.maybeSingle()
    if (fetchErr) throw fetchErr
    // Fallback: field_key is unique per template (v816) — find without scope if scoped lookup misses.
    if (!existing) {
      const fallback = await db
        .from('form_template_field_additions')
        .select('id, field_definition, scope_entity_type, scope_entity_id')
        .eq('organisation_id', organisationId)
        .eq('template_id', templateId)
        .eq('section_key', sectionKey)
        .eq('field_key', fieldKey)
        .maybeSingle()
      if (fallback.error) throw fallback.error
      existing = fallback.data
    }
    if (!existing) throw new Error('Local field not found.')
    const type = existing.field_definition?.type || 'text'
    if (type !== 'text' && type !== 'textarea') {
      throw new Error('Min/max length only applies to Text and Textarea local fields.')
    }
    const nextDefinition = { ...existing.field_definition }
    if (min != null) nextDefinition.minLength = min
    else delete nextDefinition.minLength
    if (max != null) nextDefinition.maxLength = max
    else delete nextDefinition.maxLength
    const { data, error } = await db
      .from('form_template_field_additions')
      .update({ field_definition: nextDefinition, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select('*')
      .single()
    if (error) throw error
    return ok(data)
  } catch (error) {
    return fail(error)
  }
}

/**
 * Resolve the ancestor chain (root-to-leaf) for a Portfolio/Programme/Project entity, per the
 * "checked, not assumed" linkage rules: a project's portfolio_projects and programme_projects
 * links are independent (not nested); a programme's own portfolio_id may be null (orphan).
 * Does NOT include the org-wide layer — callers prepend that themselves.
 * Returns e.g. [{ entityType: 'portfolio', entityId }, { entityType: 'programme', entityId }, { entityType: 'project', entityId }]
 * with only the tiers that actually have a link, in Portfolio-before-Programme order (decision 10).
 */
export async function resolveEntityPolicyChain(entityType, entityId, mode = 'platform') {
  try {
    if (!entityType || !entityId) throw new Error('Entity type and entity id are required')
    const db = getDb(mode)
    const chain = []

    if (entityType === 'project') {
      const [{ data: portfolioLink }, { data: programmeLink }] = await Promise.all([
        db.from('portfolio_projects').select('portfolio_id').eq('project_id', entityId).maybeSingle(),
        db.from('programme_projects').select('programme_id').eq('project_id', entityId).maybeSingle(),
      ])
      if (portfolioLink?.portfolio_id) chain.push({ entityType: 'portfolio', entityId: portfolioLink.portfolio_id })
      if (programmeLink?.programme_id) chain.push({ entityType: 'programme', entityId: programmeLink.programme_id })
      chain.push({ entityType: 'project', entityId })
    } else if (entityType === 'programme') {
      const { data: programme } = await db.from('programmes').select('portfolio_id').eq('id', entityId).maybeSingle()
      if (programme?.portfolio_id) chain.push({ entityType: 'portfolio', entityId: programme.portfolio_id })
      chain.push({ entityType: 'programme', entityId })
    } else if (entityType === 'portfolio') {
      chain.push({ entityType: 'portfolio', entityId })
    } else {
      throw new Error(`Unsupported entity type: ${entityType}`)
    }

    return ok(chain)
  } catch (error) {
    return fail(error)
  }
}

/**
 * List every completed example instance published anywhere in an entity's ancestor chain
 * (org-wide always included, plus whichever tiers actually resolved via resolveEntityPolicyChain),
 * each tagged with its own scope so the UI can label its source tier (decision 16). Pass no
 * entityType/entityId to list only the org-wide examples (e.g. from the PMO builder).
 */
export async function listInstanceTemplatesForChain(organisationId, templateId, entityType = null, entityId = null, mode = 'platform') {
  try {
    if (!organisationId || !templateId) {
      throw new Error('Organisation id and template id are required')
    }
    let scopes = [{ scopeEntityType: null, scopeEntityId: null }]
    if (entityType && entityId) {
      const chainResult = await resolveEntityPolicyChain(entityType, entityId, mode)
      if (!chainResult.success) throw new Error(chainResult.message)
      scopes = [...scopes, ...chainResult.data.map((n) => ({ scopeEntityType: n.entityType, scopeEntityId: n.entityId }))]
    }
    const { data, error } = await getDb(mode)
      .from('form_instance_templates')
      .select('id, name, description, values, rows, scope_entity_type, scope_entity_id, created_at')
      .eq('organisation_id', organisationId)
      .eq('template_id', templateId)
      .order('created_at', { ascending: false })
    if (error) throw error
    const scopeKeys = new Set(scopes.map((s) => `${s.scopeEntityType || ''}::${s.scopeEntityId || ''}`))
    const filtered = (data || []).filter((row) => scopeKeys.has(`${row.scope_entity_type || ''}::${row.scope_entity_id || ''}`))
    return ok(filtered)
  } catch (error) {
    return fail(error)
  }
}

/** List only the completed examples authored at one specific scope (org-wide by default) — for the authoring/management UI, not the cross-chain picker. */
export async function listInstanceTemplatesForScope(organisationId, templateId, scopeEntityType = null, scopeEntityId = null, mode = 'platform') {
  try {
    if (!organisationId || !templateId) {
      throw new Error('Organisation id and template id are required')
    }
    let query = getDb(mode)
      .from('form_instance_templates')
      .select('id, name, description, values, rows, created_at')
      .eq('organisation_id', organisationId)
      .eq('template_id', templateId)
    query = scopeEntityType
      ? query.eq('scope_entity_type', scopeEntityType).eq('scope_entity_id', scopeEntityId)
      : query.is('scope_entity_type', null)
    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return ok(data || [])
  } catch (error) {
    return fail(error)
  }
}

/** Author a new completed example — org-wide (scopeEntityType null) or scoped to a specific tier's entity. */
export async function createInstanceTemplate(
  { organisationId, templateId, name, description = null, values = {}, rows = {}, scopeEntityType = null, scopeEntityId = null, createdByUserId = null },
  mode = 'platform',
) {
  try {
    if (!organisationId || !templateId || !name?.trim()) {
      throw new Error('Organisation id, template id, and name are required')
    }
    const { data, error } = await getDb(mode)
      .from('form_instance_templates')
      .insert({
        organisation_id: organisationId,
        template_id: templateId,
        name: name.trim(),
        description: description ? String(description).trim() : null,
        values,
        rows,
        scope_entity_type: scopeEntityType || null,
        scope_entity_id: scopeEntityType ? scopeEntityId : null,
        created_by: createdByUserId || null,
      })
      .select('*')
      .single()
    if (error) throw error
    return ok(data)
  } catch (error) {
    return fail(error)
  }
}

/** Delete a completed example — no usage-gate (decision 17): copies already made are independent of the source. */
export async function deleteInstanceTemplate(id, mode = 'platform') {
  try {
    if (!id) throw new Error('Instance template id is required')
    const { error } = await getDb(mode).from('form_instance_templates').delete().eq('id', id)
    if (error) throw error
    return ok({ deleted: true })
  } catch (error) {
    return fail(error)
  }
}

/** Fetch per-organisation default field values for a template (no row = empty field). */
export async function getFieldDefaultsForOrg(organisationId, templateId, mode = 'platform') {
  try {
    if (!organisationId || !templateId) {
      throw new Error('Organisation id and template id are required')
    }
    const { data, error } = await getDb(mode)
      .from('form_template_field_defaults')
      .select('section_key, field_key, default_value, guidance_text')
      .eq('organisation_id', organisationId)
      .eq('template_id', templateId)
    if (error) throw error
    return ok(data || [])
  } catch (error) {
    return fail(error)
  }
}

/** Upsert a per-organisation sample default and/or guidance for a template field. */
export async function setFieldDefaultForOrg(
  {
    organisationId,
    templateId,
    sectionKey,
    fieldKey,
    defaultValue,
    guidanceText = null,
    updatedByUserId = null,
  },
  mode = 'platform',
) {
  try {
    if (!organisationId || !templateId || !sectionKey || !fieldKey) {
      throw new Error('Organisation id, template id, section key, and field key are required')
    }
    // default_value is JSONB NOT NULL — store empty string when sample is cleared
    // but guidance_text remains (SQL NULL is invalid for default_value).
    const sampleEmpty =
      defaultValue == null
      || (typeof defaultValue === 'string' && defaultValue.trim() === '')
    const payload = {
      organisation_id: organisationId,
      template_id: templateId,
      section_key: String(sectionKey).trim(),
      field_key: String(fieldKey).trim(),
      default_value: sampleEmpty ? '' : defaultValue,
      guidance_text: guidanceText == null || String(guidanceText).trim() === ''
        ? null
        : String(guidanceText).trim(),
      updated_by: updatedByUserId || null,
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await getDb(mode)
      .from('form_template_field_defaults')
      .upsert(payload, { onConflict: 'organisation_id,template_id,section_key,field_key' })
      .select('*')
      .single()
    if (error) throw error
    return ok(data)
  } catch (error) {
    return fail(error)
  }
}

/** Clear a per-organisation default value for a template field. */
export async function clearFieldDefaultForOrg(
  { organisationId, templateId, sectionKey, fieldKey },
  mode = 'platform',
) {
  try {
    if (!organisationId || !templateId || !sectionKey || !fieldKey) {
      throw new Error('Organisation id, template id, section key, and field key are required')
    }
    const { error } = await getDb(mode)
      .from('form_template_field_defaults')
      .delete()
      .eq('organisation_id', organisationId)
      .eq('template_id', templateId)
      .eq('section_key', String(sectionKey).trim())
      .eq('field_key', String(fieldKey).trim())
    if (error) throw error
    return ok(true)
  } catch (error) {
    return fail(error)
  }
}

/**
 * Resolve the form template a project should default to, walking the PM
 * Template Hierarchy chain (project → programme/portfolio → PMO/Global).
 * Returns the template_code (existing flows key by code, not id) so callers
 * don't need to change how they instantiate forms. `sim.projects` doesn't
 * exist (practice projects have no account column), so mode='sim' falls
 * back to the current user's account, matching getProjectAccountId's
 * existing no-op behaviour for sim mode.
 */
export async function resolveEffectiveFormTemplate(projectId, mode = 'platform') {
  if (!projectId) return ok(null)
  try {
    const db = getDb(mode)
    let accountId = null
    if (mode === 'sim') {
      accountId = await getCurrentUserAccountId()
    } else {
      const { data } = await db.from('projects').select('account_id').eq('id', projectId).maybeSingle()
      accountId = data?.account_id || null
    }

    const node = await resolveEffectiveDocumentMaster(db, 'project', projectId, 'form_template', { accountId })
    if (!node?.domain_ref_id) return ok(null)

    const { data: templateRow, error } = await db
      .from('form_templates')
      .select('template_code')
      .eq('id', node.domain_ref_id)
      .maybeSingle()
    if (error) throw error
    if (!templateRow?.template_code) return ok(null)

    return ok({ templateCode: templateRow.template_code, tier: node.tier, scopeEntityId: node.scope_entity_id })
  } catch (error) {
    return fail(error)
  }
}

/** Resolve account_id for a project (used when filtering template fields for PM consumption). */
export async function getProjectAccountId(projectId, mode = 'platform') {
  try {
    if (!projectId) throw new Error('Project id is required')
    const { data, error } = await getDb(mode)
      .from('projects')
      .select('account_id')
      .eq('id', projectId)
      .maybeSingle()
    if (error) throw error
    return ok(data?.account_id || null)
  } catch (error) {
    return fail(error)
  }
}
