/**
 * Register record templates (v1336 PRD/plan): list, preview, New from template, Save as template,
 * Customise, edit and archive. State changes go through the SECURITY DEFINER functions in
 * SQL/v1337; this service also copies annexure files between the template and record buckets
 * (the database cannot copy Storage files).
 *
 * Pass platformDb/simDb as `db`. System templates always live in public (read with platformDb);
 * a Simulator's organisation templates live in sim.
 */
import { platformDb } from '@nidus/supabase'
import { buildRegisterDocumentModel } from '../utils/registerDocumentModel'
import { buildRegisterDocumentPdf } from '../utils/registerDocumentPdf'
import { uploadRecordAttachment, listRecordAttachments, LOCAL_REGISTER_ATTACHMENTS_BUCKET } from './localRegisterAttachmentService'
import { isImageMimeType, formatFileSizeLabel } from './processTemplateAttachmentService'

export const LOCAL_REGISTER_TEMPLATES_BUCKET = 'local-register-templates'

function ok(data) {
  return { success: true, data }
}

function fail(error) {
  return { success: false, message: error?.message || String(error), error }
}

const isSimDb = (db) => db !== platformDb

// v1336 creates local_register_templates. Until that migration is on the database, PostgREST
// answers every templates read with 404 "relation does not exist". Remember that for this page
// load so a document register's Records tab does not toast, and so the list is not requested again.
let templatesSchemaMissing = false
const listInflight = new Map()

function isMissingTemplatesSchema(error) {
  const text = `${error?.code || ''} ${error?.message || ''}`
  return /42P01|PGRST205|PGRST202|does not exist|schema cache|Could not find the (table|function)/i.test(text)
}

function noteMissingTemplatesSchema(error) {
  if (!isMissingTemplatesSchema(error)) return false
  templatesSchemaMissing = true
  return true
}

/** Test hook. */
export function resetRegisterTemplateSchemaCache() {
  templatesSchemaMissing = false
  listInflight.clear()
}

async function loadRegisterTemplates(db, registerKey, includeArchived) {
  try {
    if (!db || !registerKey) throw new Error('Database client and register key are required')
    const base = (client, scopeFilter) => {
      let query = client.from('local_register_templates').select('*').eq('register_key', registerKey)
      if (scopeFilter) query = query.eq('template_scope', scopeFilter)
      if (!includeArchived) query = query.eq('is_archived', false)
      return query
    }
    const queries = isSimDb(db)
      ? [base(platformDb, 'system'), base(db, 'organisation')]
      : [base(db, null)]
    const results = await Promise.all(queries)
    const failed = results.find((r) => r.error)
    if (failed) {
      if (noteMissingTemplatesSchema(failed.error)) return ok([])
      throw failed.error
    }
    const rows = results.flatMap((r) => r.data || [])
    const childCounts = await countChildren(db, rows)
    return ok(rows.map((t) => ({ ...t, child_count: childCounts.get(t.id) || 0 })))
  } catch (error) {
    if (noteMissingTemplatesSchema(error)) return ok([])
    return fail(error)
  }
}

/** Templates for a register: organisation templates of this app + system templates; newest first within each. */
export async function listRegisterTemplates(db, registerKey, { includeArchived = false } = {}) {
  if (templatesSchemaMissing) return ok([])
  const key = `${isSimDb(db) ? 'sim' : 'public'}|${registerKey}|${includeArchived ? 1 : 0}`
  if (!listInflight.has(key)) {
    listInflight.set(key, loadRegisterTemplates(db, registerKey, includeArchived).finally(() => listInflight.delete(key)))
  }
  return listInflight.get(key)
}

async function countChildren(db, templates) {
  const counts = new Map()
  const bySchema = [
    [platformDb, templates.filter((t) => !isSimDb(db) || t.template_scope === 'system').map((t) => t.id)],
    ...(isSimDb(db) ? [[db, templates.filter((t) => t.template_scope === 'organisation').map((t) => t.id)]] : []),
  ]
  await Promise.all(bySchema.filter(([, ids]) => ids.length).map(async ([client, ids]) => {
    const { data } = await client.from('local_register_template_children').select('template_id').in('template_id', ids)
    ;(data || []).forEach((r) => counts.set(r.template_id, (counts.get(r.template_id) || 0) + 1))
  }))
  return counts
}

/** The client that holds a template's rows (system templates are always public). */
function clientFor(db, template) {
  return template?.template_scope === 'system' ? platformDb : db
}

/** One template with its child records and annexure rows. */
export async function getRegisterTemplate(db, templateId) {
  try {
    if (!db || !templateId) throw new Error('Database client and template id are required')
    let client = db
    let { data: template, error } = await db.from('local_register_templates').select('*').eq('id', templateId).maybeSingle()
    if (error) throw error
    if (!template && isSimDb(db)) {
      client = platformDb
      ;({ data: template, error } = await platformDb.from('local_register_templates').select('*').eq('id', templateId).maybeSingle())
      if (error) throw error
    }
    if (!template) throw new Error('This template is no longer available.')
    const [children, attachments] = await Promise.all([
      client.from('local_register_template_children').select('*').eq('template_id', templateId).order('sort_order'),
      client.from('local_register_template_attachments').select('*').eq('template_id', templateId).order('sort_order'),
    ])
    if (children.error) throw children.error
    if (attachments.error) throw attachments.error
    return ok({ ...template, children: children.data || [], attachments: attachments.data || [] })
  } catch (error) {
    return fail(error)
  }
}

async function rpc(db, fn, args) {
  const { data, error } = await db.rpc(fn, args)
  if (error) throw error
  return data
}

async function downloadAsFile(client, bucket, path, fileName, mimeType) {
  const { data, error } = await client.storage.from(bucket).download(path)
  if (error) throw error
  return new File([data], fileName, { type: mimeType || data.type || 'application/octet-stream' })
}

/**
 * New from template: creates the record and its child records (database), then copies the
 * template's annexure files into the new record. Returns { recordId, children, copied, failedFiles }.
 * A project that already has a record of a one-per-project register is refused with
 * { code: 'exists', existingRecordId }.
 */
export async function createRecordFromTemplate(db, { templateId, projectId, title = null, accountId = null, uploadedByUserId = null, mode = 'platform' }) {
  try {
    const { data, error } = await db.rpc('local_register_template_create_record', {
      p_template_id: templateId,
      p_project_id: projectId,
      p_title: title,
      p_account_id: accountId,
    })
    if (error) {
      if (/already has a/i.test(error.message || '')) {
        return { success: false, code: 'exists', existingRecordId: error.details || null, message: error.message }
      }
      throw error
    }
    const recordId = data.record_id
    let copied = 0
    const failedFiles = []
    for (const file of data.attachments || []) {
      try {
        // System template files are readable by everyone; organisation files by the organisation.
        const source = file.storage_path.startsWith('system/') ? platformDb : db
        const blob = await downloadAsFile(source, file.storage_bucket || LOCAL_REGISTER_TEMPLATES_BUCKET, file.storage_path, file.file_name, file.mime_type)
        const result = await uploadRecordAttachment(db, { recordId, file: blob, title: file.annexure_title, uploadedByUserId, mode })
        if (!result.success) throw new Error(result.message)
        copied += 1
      } catch {
        failedFiles.push(file.annexure_title || file.file_name)
      }
    }
    return ok({ recordId, children: data.children || 0, copied, failedFiles })
  } catch (error) {
    return fail(error)
  }
}

/** Copies a record's current annexures into a template (after the template rows were saved). */
async function copyRecordAttachmentsToTemplate(db, { recordId, templateId, mode }) {
  const list = await listRecordAttachments(db, recordId)
  if (!list.success) throw new Error(list.message)
  const failed = []
  for (const row of list.data) {
    try {
      const file = await downloadAsFile(db, LOCAL_REGISTER_ATTACHMENTS_BUCKET, row.storage_path, row.file_name, row.mime_type)
      const path = `${mode === 'sim' ? 'sim' : 'platform'}/${templateId}/${crypto.randomUUID()}-${String(row.file_name).replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const up = await db.storage.from(LOCAL_REGISTER_TEMPLATES_BUCKET).upload(path, file, { contentType: file.type, upsert: false })
      if (up.error) throw up.error
      await rpc(db, 'local_register_template_add_attachment', {
        p_template_id: templateId, p_title: row.annexure_title, p_storage_path: path,
        p_file_name: row.file_name, p_mime_type: row.mime_type, p_file_size: row.file_size,
      })
    } catch {
      failed.push(row.annexure_title || row.file_name)
    }
  }
  return failed
}

/**
 * Save as template (PMO Admin / Project Manager): an organisation template from the record, its
 * linked child records in the same project, and its annexures. Pass templateId to replace an
 * existing organisation template. Returns { templateId, failedFiles }.
 */
export async function saveRecordAsTemplate(db, { recordId, name, description = '', templateId = null, accountId = null, mode = 'platform' }) {
  try {
    const id = await rpc(db, 'local_register_template_save', {
      p_record_id: recordId, p_name: name, p_description: description, p_template_id: templateId, p_account_id: accountId,
    })
    const failedFiles = await copyRecordAttachmentsToTemplate(db, { recordId, templateId: id, mode })
    return ok({ templateId: id, failedFiles })
  } catch (error) {
    return fail(error)
  }
}

/** Customise a system (or own) template into a new organisation template. */
export async function customiseTemplate(db, { templateId, name, accountId }) {
  try {
    return ok(await rpc(db, 'local_register_template_customise', { p_template_id: templateId, p_name: name, p_account_id: accountId }))
  } catch (error) {
    return fail(error)
  }
}

export async function updateTemplate(db, { templateId, name, description, recordTitle, recordDescription, fieldValues }) {
  try {
    return ok(await rpc(db, 'local_register_template_update', {
      p_template_id: templateId, p_name: name, p_description: description,
      p_record_title: recordTitle, p_record_description: recordDescription, p_field_values: fieldValues,
    }))
  } catch (error) {
    return fail(error)
  }
}

export async function archiveTemplate(db, { templateId, archived = true }) {
  try {
    await rpc(db, 'local_register_template_archive', { p_template_id: templateId, p_archived: archived })
    return ok(true)
  } catch (error) {
    return fail(error)
  }
}

/** TRUE when the viewer may save / customise / edit organisation templates for the account. */
export async function canManageRegisterTemplates(db, accountId) {
  if (!db || !accountId || templatesSchemaMissing) return false
  const { data, error } = await db.rpc('auth_user_can_manage_register_templates', { p_account_id: accountId })
  if (error) {
    noteMissingTemplatesSchema(error)
    return false
  }
  return data === true
}

/**
 * The complete document (PDF Blob) of a template — for Preview before using it. Child records come
 * from `childRegisters` ({ [register_key]: register definition with fields }).
 */
export async function buildTemplateDocumentPdfBlob(db, { register, template, childRegisters = {}, settings = null, branding = null }) {
  const client = clientFor(db, template)
  const attachments = await Promise.all((template.attachments || []).map(async (a) => {
    const source = a.storage_path.startsWith('system/') ? platformDb : client
    const { data } = await source.storage.from(a.storage_bucket || LOCAL_REGISTER_TEMPLATES_BUCKET).createSignedUrl(a.storage_path, 600)
    return {
      title: a.annexure_title, file_name: a.file_name, mime_type: a.mime_type, file_size: a.file_size,
      size_label: formatFileSizeLabel(a.file_size), is_image: isImageMimeType(a.mime_type), url: data?.signedUrl || null,
    }
  }))
  const linked = {}
  for (const child of template.children || []) {
    const childRegister = childRegisters[child.register_key]
    if (!childRegister) continue
    if (!linked[child.link_field_key]) linked[child.link_field_key] = { register: childRegister, records: [] }
    linked[child.link_field_key].records.push({
      id: child.id, display_id: String(child.sort_order).padStart(3, '0'), title: child.title,
      description: child.description, status: child.status, field_values: child.field_values || {},
    })
  }
  const model = buildRegisterDocumentModel({
    register,
    record: { id: template.id, title: template.record_title, description: template.record_description, status: template.record_status, field_values: template.field_values || {} },
    settings,
    attachments,
    linked,
  })
  const doc = await buildRegisterDocumentPdf(model, branding)
  return doc.output('blob')
}
