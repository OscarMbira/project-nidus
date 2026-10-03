import { platformDb, simDb } from '@nidus/supabase'

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

/**
 * @param {string} table
 * @param {object} payload
 * @param {{ sim?: boolean, setCreatedBy?: boolean }} [opts] — v963: NOT every gap
 *   table has a `created_by` column, so this only sets it when the caller opts in
 *   via `setCreatedBy: true` for tables that actually have the column.
 */
export async function createGapRecord(table, payload, opts = {}) {
  const db = opts.sim ? simDb : platformDb
  const row = { ...payload }
  if (opts.setCreatedBy && !row.created_by) {
    const { data: { user } } = await db.auth.getUser()
    if (user?.id) row.created_by = user.id
  }
  const { data, error } = await db.from(table).insert(row).select().single()
  if (error) throw error
  return data
}

export async function updateGapRecord(table, id, payload, opts = {}) {
  const db = opts.sim ? simDb : platformDb
  // v963: none of the v643-v645/v963l/v963m PMIS gap tables have an `updated_by`
  // column (only `created_by`) — unconditionally setting it here 400'd every
  // update on every gap table. Callers that DO have one can pass updated_by explicitly.
  const row = { ...payload, updated_at: new Date().toISOString() }
  const { data, error } = await db.from(table).update(row).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteGapRecord(table, id, opts = {}) {
  const db = opts.sim ? simDb : platformDb
  const { error } = await db.from(table).delete().eq('id', id)
  if (error) throw error
}
