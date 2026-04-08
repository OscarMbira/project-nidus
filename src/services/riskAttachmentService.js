/**
 * Risk file attachments — storage + risk_attachments table
 */

import { platformDb } from './supabase/supabaseClient'

const BUCKET = 'risk-attachments'

export async function getAttachmentsByRisk(riskId) {
  try {
    const { data, error } = await platformDb
      .from('risk_attachments')
      .select(`
        *,
        uploaded_by_user:uploaded_by(id, full_name, email)
      `)
      .eq('risk_id', riskId)
      .eq('is_deleted', false)
      .order('uploaded_at', { ascending: false })
    if (error) throw error
    const rows = data || []
    const withUrls = await Promise.all(
      rows.map(async (row) => {
        if (!row.file_path) return row
        const { data: signed } = await platformDb.storage
          .from(BUCKET)
          .createSignedUrl(row.file_path, 3600)
        return {
          ...row,
          file_path: signed?.signedUrl || row.file_path,
        }
      })
    )
    return { success: true, data: withUrls }
  } catch (e) {
    console.error('getAttachmentsByRisk', e)
    return { success: false, error: e.message, data: [] }
  }
}

export async function uploadAttachment(riskId, file, description = '') {
  try {
    const { data: { user } } = await platformDb.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const { data: userRow, error: uErr } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single()
    if (uErr || !userRow) throw new Error('User record not found')
    const uploadedBy = userRow.id

    const { data: riskRow, error: rErr } = await platformDb
      .from('risks')
      .select('project_id')
      .eq('id', riskId)
      .single()
    if (rErr || !riskRow?.project_id) throw new Error('Risk not found')

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${riskRow.project_id}/${riskId}/${Date.now()}_${safeName}`

    const { error: upErr } = await platformDb.storage.from(BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    })
    if (upErr) throw upErr

    const { data: inserted, error: insErr } = await platformDb
      .from('risk_attachments')
      .insert({
        risk_id: riskId,
        file_name: file.name,
        file_path: path,
        file_type: file.type || null,
        file_size: file.size ?? null,
        description: description || null,
        uploaded_by: uploadedBy,
      })
      .select(`
        *,
        uploaded_by_user:uploaded_by(id, full_name, email)
      `)
      .single()
    if (insErr) throw insErr

    return { success: true, data: inserted }
  } catch (e) {
    console.error('uploadAttachment', e)
    return { success: false, error: e.message }
  }
}

export async function deleteAttachment(attachmentId) {
  try {
    const { data: row, error: fErr } = await platformDb
      .from('risk_attachments')
      .select('file_path')
      .eq('id', attachmentId)
      .single()
    if (fErr) throw fErr

    if (row?.file_path) {
      await platformDb.storage.from(BUCKET).remove([row.file_path])
    }

    const { error } = await platformDb
      .from('risk_attachments')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', attachmentId)
    if (error) throw error
    return { success: true }
  } catch (e) {
    console.error('deleteAttachment', e)
    return { success: false, error: e.message }
  }
}
