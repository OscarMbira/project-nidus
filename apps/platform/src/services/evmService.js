/**
 * EVM snapshots + metric helpers (Platform)
 */

import { platformDb } from './supabase/supabaseClient'

export async function listEvmSnapshots(projectId) {
  const { data, error } = await platformDb
    .from('project_evm_snapshots')
    .select('*')
    .eq('project_id', projectId)
    .order('period_date', { ascending: true })
  if (error) throw error
  return data || []
}

export async function upsertEvmSnapshot(row) {
  const { data, error } = await platformDb
    .from('project_evm_snapshots')
    .upsert(
      {
        project_id: row.project_id,
        period_date: row.period_date,
        planned_value: row.planned_value ?? 0,
        earned_value: row.earned_value ?? 0,
        actual_cost: row.actual_cost ?? 0,
        notes: row.notes || null,
        created_by_user_id: row.created_by_user_id || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'project_id,period_date' }
    )
    .select()
    .single()
  if (error) throw error
  return data
}

export function computeEvmMetrics(snapshot, bac) {
  const pv = Number(snapshot.planned_value) || 0
  const ev = Number(snapshot.earned_value) || 0
  const ac = Number(snapshot.actual_cost) || 0
  const bacN = Number(bac) || 0
  const sv = ev - pv
  const cv = ev - ac
  const spi = pv !== 0 ? ev / pv : null
  const cpi = ac !== 0 ? ev / ac : null
  const eac = cpi && cpi !== 0 ? bacN / cpi : null
  const etc = eac != null ? eac - ac : null
  const vac = eac != null ? bacN - eac : null
  const tcpiDen = bacN - ac
  const tcpi = tcpiDen !== 0 && bacN - ev !== null ? (bacN - ev) / tcpiDen : null
  return { sv, cv, spi, cpi, eac, etc, vac, tcpi }
}
