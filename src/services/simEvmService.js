import { simDb } from './supabase/supabaseClient'
import { computeEvmMetrics } from './evmService'

export async function listSimEvmSnapshots(practiceProjectId) {
  const { data, error } = await simDb
    .from('project_evm_snapshots')
    .select('*')
    .eq('practice_project_id', practiceProjectId)
    .order('period_date', { ascending: true })
  if (error) throw error
  return data || []
}

export async function upsertSimEvmSnapshot(row) {
  const { data, error } = await simDb
    .from('project_evm_snapshots')
    .upsert(
      {
        practice_project_id: row.practice_project_id,
        period_date: row.period_date,
        planned_value: row.planned_value ?? 0,
        earned_value: row.earned_value ?? 0,
        actual_cost: row.actual_cost ?? 0,
        notes: row.notes || null,
        created_by_user_id: row.created_by_user_id || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'practice_project_id,period_date' }
    )
    .select()
    .single()
  if (error) throw error
  return data
}

export { computeEvmMetrics }
