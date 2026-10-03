/**
 * Simulator Deliverable Register — sim.deliverable_register
 */
import { simDb } from '@nidus/supabase'

const STATUSES = ['planned', 'submitted', 'accepted', 'rework']
export { STATUSES as DELIVERABLE_STATUSES }

export async function listDeliverables(practiceProjectId, { status } = {}) {
  let q = simDb
    .from('deliverable_register')
    .select('*')
    .eq('practice_project_id', practiceProjectId)
    .eq('is_deleted', false)
    .order('title', { ascending: true })
  if (status && STATUSES.includes(status)) q = q.eq('status', status)
  const { data, error } = await q
  if (error) return { success: false, data: [], error: error.message }
  return { success: true, data: data || [] }
}

export async function getDeliverable(idOrDisplayId) {
  const looksUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    String(idOrDisplayId || '')
  )
  let q = simDb.from('deliverable_register').select('*').eq('is_deleted', false)
  q = looksUuid ? q.eq('id', idOrDisplayId) : q.eq('display_id', idOrDisplayId)
  const { data, error } = await q.maybeSingle()
  if (error) return { success: false, data: null, error: error.message }
  return { success: true, data }
}

export async function createDeliverable(practiceProjectId, fields, userId) {
  const status = fields.status || 'planned'
  const { data, error } = await simDb
    .from('deliverable_register')
    .insert({
      practice_project_id: practiceProjectId,
      display_id: '',
      title: fields.title,
      description: fields.description || null,
      status,
      pbs_node_id: fields.pbs_node_id || null,
      due_date: fields.due_date || null,
      notes: fields.notes || null,
      created_by: userId || null,
      updated_by: userId || null,
    })
    .select()
    .single()
  if (error) return { success: false, data: null, error: error.message }
  return { success: true, data }
}

export async function updateDeliverable(id, fields, userId) {
  const { data, error } = await simDb
    .from('deliverable_register')
    .update({
      title: fields.title,
      description: fields.description ?? null,
      status: fields.status || 'planned',
      pbs_node_id: fields.pbs_node_id || null,
      due_date: fields.due_date || null,
      notes: fields.notes || null,
      updated_by: userId || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) return { success: false, data: null, error: error.message }
  return { success: true, data }
}

export async function softDeleteDeliverable(id, userId) {
  const { error } = await simDb
    .from('deliverable_register')
    .update({ is_deleted: true, updated_by: userId || null, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { success: false, error: error.message }
  return { success: true }
}
