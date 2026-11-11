/**
 * Complete document export for a Local Register document record (v1318): gathers the current
 * sign-off round and the annexure attachments, builds the document model and downloads it as
 * Word or PDF. Pass platformDb/simDb as `db` (sim records keep their signatories, attachments and
 * practice projects in the sim schema; accounts are always public).
 */
import { platformDb } from '@nidus/supabase'
import { buildRegisterDocumentModel } from '../utils/registerDocumentModel'
import { exportRegisterDocumentToWord } from '../utils/registerDocumentWord'
import { buildRegisterDocumentPdf, exportRegisterDocumentToPdf } from '../utils/registerDocumentPdf'
import { resolveRecordSignatoriesForExport } from './localRegisterSignoffService'
import { resolveRecordAttachmentsForExport } from './localRegisterAttachmentService'

async function lookupLabels(db, record, accountId) {
  const projectTable = db === platformDb ? 'projects' : 'practice_projects'
  const [account, project] = await Promise.all([
    accountId
      ? platformDb.from('accounts').select('account_display_name, account_name, company_name').eq('id', accountId).maybeSingle()
      : Promise.resolve({ data: null }),
    record?.record_project_id
      ? db.from(projectTable).select('project_name, project_code').eq('id', record.record_project_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])
  const a = account.data
  const p = project.data
  return {
    organisationName: a?.account_display_name || a?.company_name || a?.account_name || '',
    projectLabel: p ? [p.project_code, p.project_name].filter(Boolean).join(' — ') : '',
  }
}

/** Gathers sign-off, annexures and labels, and builds the complete document model. */
export async function buildRegisterRecordDocumentModel(db, { register, record, customFields = [], settings = null, accountId = null, linked = {} }) {
  const [signatories, attachments, labels] = await Promise.all([
    resolveRecordSignatoriesForExport(db, record.id),
    resolveRecordAttachmentsForExport(db, record.id),
    lookupLabels(db, record, accountId || record?.account_id || null),
  ])
  const model = buildRegisterDocumentModel({
    register,
    record,
    customFields,
    settings,
    signatories: signatories.success ? signatories.data : [],
    attachments: attachments.success ? attachments.data : [],
    linked,
    ...labels,
  })
  return model
}

/** The complete document as a PDF Blob — for the in-app View preview (no download). */
export async function buildRegisterRecordDocumentPdfBlob(db, input) {
  const model = await buildRegisterRecordDocumentModel(db, input)
  const doc = await buildRegisterDocumentPdf(model, input.branding || null)
  return doc.output('blob')
}

/**
 * @param {object} db platformDb / simDb
 * @param {{ format: 'word'|'pdf', register: object, record: object, customFields?: object[],
 *           settings?: object|null, branding?: object|null, accountId?: string|null, linked?: object }} input
 */
export async function exportRegisterRecordDocument(db, input) {
  const { format, branding = null } = input
  const model = await buildRegisterRecordDocumentModel(db, input)
  if (format === 'pdf') await exportRegisterDocumentToPdf(model, branding)
  else await exportRegisterDocumentToWord(model, branding)
  return model
}
