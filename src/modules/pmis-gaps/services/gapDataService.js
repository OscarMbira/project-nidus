import { platformDb, simDb } from '../../../services/supabase/supabaseClient'

/**
 * Generic CRUD list loader for PMIS gap tables.
 * @param {string} table
 * @param {{ sim?: boolean, select?: string, orderBy?: string, ascending?: boolean }} [opts]
 */
export async function listGapRecords(table, opts = {}) {
  const db = opts.sim ? simDb : platformDb
  let q = db.from(table).select(opts.select || '*')
  if (opts.orderBy) q = q.order(opts.orderBy, { ascending: opts.ascending !== false })
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function getGapRecord(table, id, opts = {}) {
  const db = opts.sim ? simDb : platformDb
  const { data, error } = await db.from(table).select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function createGapRecord(table, payload, opts = {}) {
  const db = opts.sim ? simDb : platformDb
  const { data: { user } } = await db.auth.getUser()
  const row = { ...payload }
  if (user?.id && !row.created_by) row.created_by = user.id
  const { data, error } = await db.from(table).insert(row).select().single()
  if (error) throw error
  return data
}

export async function updateGapRecord(table, id, payload, opts = {}) {
  const db = opts.sim ? simDb : platformDb
  const { data: { user } } = await db.auth.getUser()
  const row = { ...payload, updated_at: new Date().toISOString() }
  if (user?.id) row.updated_by = user.id
  const { data, error } = await db.from(table).update(row).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteGapRecord(table, id, opts = {}) {
  const db = opts.sim ? simDb : platformDb
  const { error } = await db.from(table).delete().eq('id', id)
  if (error) throw error
}
