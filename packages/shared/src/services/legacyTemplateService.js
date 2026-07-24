import { createTierDocumentTemplateNode } from './pmTemplateNodeService.js'
import { slugIndustryCode } from '../utils/legacyTemplateParse.js'

/**
 * Upload a file to the shared legacy-templates bucket.
 * @param {import('@supabase/supabase-js').SupabaseClient} storageClient - auth-aware client with storage
 */
export async function uploadLegacyTemplateFile(storageClient, {
  accountId,
  file,
  templateId = null,
}) {
  if (!storageClient?.storage) throw new Error('storageClient is required')
  if (!accountId) throw new Error('accountId is required')
  if (!file) throw new Error('file is required')

  const id = templateId || crypto.randomUUID()
  const safeName = String(file.name || 'upload.bin').replace(/[^\w.\-]+/g, '_')
  const path = `${accountId}/${id}/${safeName}`

  const { error } = await storageClient.storage
    .from('legacy-templates')
    .upload(path, file, {
      upsert: true,
      contentType: file.type || 'application/octet-stream',
    })
  if (error) throw error

  return {
    templateId: id,
    storage_bucket: 'legacy-templates',
    storage_path: path,
    file_size: file.size,
    mime_type: file.type || null,
    original_filename: file.name,
  }
}

export async function getLegacyTemplateSignedUrl(storageClient, storagePath, expiresIn = 3600) {
  const { data, error } = await storageClient.storage
    .from('legacy-templates')
    .createSignedUrl(storagePath, expiresIn)
  if (error) throw error
  return data?.signedUrl || null
}

export async function createLegacyDocumentTemplate(db, {
  accountId,
  userId = null,
  title,
  docCategory = 'other',
  originalFilename,
  storageBucket = 'legacy-templates',
  storagePath,
  fileSize = null,
  mimeType = null,
  extractedText = null,
  status = 'published',
}) {
  const { data, error } = await db
    .from('pmo_legacy_document_templates')
    .insert({
      account_id: accountId,
      title,
      doc_category: docCategory,
      original_filename: originalFilename,
      storage_bucket: storageBucket,
      storage_path: storagePath,
      file_size: fileSize,
      mime_type: mimeType,
      extracted_text: extractedText,
      status,
      version: 1,
      created_by: userId,
    })
    .select()
    .single()
  if (error) throw error

  const node = await createTierDocumentTemplateNode(db, {
    accountId,
    tier: 'pmo',
    domain: 'legacy_document',
    scopeEntityType: 'account',
    scopeEntityId: null,
    name: title,
    description: extractedText ? String(extractedText).slice(0, 280) : null,
    category: docCategory,
    domainRefId: data.id,
    userId,
  })

  const { data: linked, error: linkErr } = await db
    .from('pmo_legacy_document_templates')
    .update({ pm_template_node_id: node.id, updated_at: new Date().toISOString() })
    .eq('id', data.id)
    .select()
    .single()
  if (linkErr) throw linkErr

  return { template: linked, node }
}

export async function createStructuredListTemplate(db, {
  accountId,
  userId = null,
  title,
  listType,
  rows = [],
  columnMapping = {},
  status = 'published',
}) {
  const { data, error } = await db
    .from('pmo_legacy_structured_lists')
    .insert({
      account_id: accountId,
      title,
      list_type: listType,
      rows,
      column_mapping: columnMapping,
      status,
      version: 1,
      created_by: userId,
    })
    .select()
    .single()
  if (error) throw error

  const node = await createTierDocumentTemplateNode(db, {
    accountId,
    tier: 'pmo',
    domain: 'structured_list',
    scopeEntityType: 'account',
    scopeEntityId: null,
    name: title,
    description: `${listType} (${rows.length} rows)`,
    category: listType,
    domainRefId: data.id,
    userId,
  })

  const { data: linked, error: linkErr } = await db
    .from('pmo_legacy_structured_lists')
    .update({ pm_template_node_id: node.id, updated_at: new Date().toISOString() })
    .eq('id', data.id)
    .select()
    .single()
  if (linkErr) throw linkErr

  return { template: linked, node }
}

export async function createScheduleFromLegacyUpload({
  createTemplateFn,
  replaceTemplateChildrenFn,
  title,
  bundle,
  description = null,
}) {
  if (typeof createTemplateFn !== 'function') throw new Error('createTemplateFn required')
  if (typeof replaceTemplateChildrenFn !== 'function') throw new Error('replaceTemplateChildrenFn required')

  const template = await createTemplateFn({
    industry_code: slugIndustryCode(title),
    industry_name: title,
    description: description || `Imported legacy schedule: ${title}`,
    typical_duration: '',
    icon: 'upload',
    tags: ['legacy-upload', 'schedule'],
    status: 'draft',
  })
  await replaceTemplateChildrenFn(template.id, bundle)
  return template
}

export async function listLegacyDocumentTemplates(db, { search = '', status = null } = {}) {
  let q = db
    .from('pmo_legacy_document_templates')
    .select('*')
    .order('updated_at', { ascending: false })
  if (status) q = q.eq('status', status)
  const { data, error } = await q
  if (error) throw error
  let rows = data || []
  if (search) {
    const s = search.toLowerCase()
    rows = rows.filter((r) =>
      (r.title || '').toLowerCase().includes(s)
      || (r.original_filename || '').toLowerCase().includes(s)
      || (r.extracted_text || '').toLowerCase().includes(s),
    )
  }
  return rows
}

export async function listStructuredListTemplates(db, { listType = null, search = '' } = {}) {
  let q = db
    .from('pmo_legacy_structured_lists')
    .select('*')
    .order('updated_at', { ascending: false })
  if (listType) q = q.eq('list_type', listType)
  const { data, error } = await q
  if (error) throw error
  let rows = data || []
  if (search) {
    const s = search.toLowerCase()
    rows = rows.filter((r) => (r.title || '').toLowerCase().includes(s))
  }
  return rows
}

export async function getLegacyDocumentById(db, id) {
  const { data, error } = await db
    .from('pmo_legacy_document_templates')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getStructuredListById(db, id) {
  const { data, error } = await db
    .from('pmo_legacy_structured_lists')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function duplicateLegacyDocumentTemplate(db, id, { accountId, userId = null } = {}) {
  const src = await getLegacyDocumentById(db, id)
  if (!src) throw new Error('Legacy document not found')
  return createLegacyDocumentTemplate(db, {
    accountId: accountId || src.account_id,
    userId,
    title: `${src.title} (copy)`,
    docCategory: src.doc_category,
    originalFilename: src.original_filename,
    storageBucket: src.storage_bucket,
    storagePath: src.storage_path,
    fileSize: src.file_size,
    mimeType: src.mime_type,
    extractedText: src.extracted_text,
    status: 'draft',
  })
}

export async function duplicateStructuredListTemplate(db, id, { accountId, userId = null } = {}) {
  const src = await getStructuredListById(db, id)
  if (!src) throw new Error('Structured list not found')
  return createStructuredListTemplate(db, {
    accountId: accountId || src.account_id,
    userId,
    title: `${src.title} (copy)`,
    listType: src.list_type,
    rows: src.rows || [],
    columnMapping: src.column_mapping || {},
    status: 'draft',
  })
}
