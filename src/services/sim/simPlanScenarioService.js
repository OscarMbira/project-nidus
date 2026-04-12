import { simDb } from '../supabase/supabaseClient'

export async function getScenarios(practiceProjectId) {
  const { data, error } = await simDb
    .from('plan_scenarios')
    .select('*')
    .eq('practice_project_id', practiceProjectId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getScenario(id) {
  const { data: s, error } = await simDb.from('plan_scenarios').select('*').eq('id', id).single()
  if (error) throw error
  const { data: snaps } = await simDb.from('plan_scenario_task_snapshots').select('*').eq('scenario_id', id)
  return { ...s, snapshots: snaps || [] }
}

export async function createScenario(row) {
  const { data, error } = await simDb.from('plan_scenarios').insert(row).select().single()
  if (error) throw error
  return data
}

export async function updateScenario(id, patch) {
  const { data, error } = await simDb
    .from('plan_scenarios')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function cloneScenario(sourceId, newName, authUserId) {
  const src = await getScenario(sourceId)
  const { data: created, error } = await simDb
    .from('plan_scenarios')
    .insert({
      practice_project_id: src.practice_project_id,
      name: newName,
      scenario_type: src.scenario_type,
      description: src.description,
      status: 'draft',
      is_baseline: false,
      promoted_from_id: sourceId,
      milestone_delta_days: src.milestone_delta_days,
      cost_delta: src.cost_delta,
      created_by: authUserId,
    })
    .select()
    .single()
  if (error) throw error

  const snaps = (src.snapshots || []).map((x) => ({
    scenario_id: created.id,
    task_name: x.task_name,
    start_date: x.start_date,
    end_date: x.end_date,
    duration_days: x.duration_days,
    progress_percentage: x.progress_percentage ?? 0,
    is_milestone: x.is_milestone,
    is_critical_path: x.is_critical_path ?? false,
    confidence_level: x.confidence_level ?? 50,
    notes: x.notes,
  }))
  if (snaps.length) {
    const { error: e2 } = await simDb.from('plan_scenario_task_snapshots').insert(snaps)
    if (e2) throw e2
  }
  return created.id
}

export async function compareScenarios(idA, idB) {
  const [a, b] = await Promise.all([getScenario(idA), getScenario(idB)])
  return { scenarioA: a, scenarioB: b, taskRows: [] }
}

export async function promoteToBaseline(scenarioId, authUserId) {
  const s = await getScenario(scenarioId)
  await simDb.from('plan_scenarios').update({ is_baseline: false }).eq('practice_project_id', s.practice_project_id)
  return updateScenario(scenarioId, {
    is_baseline: true,
    status: 'promoted',
    updated_at: new Date().toISOString(),
    created_by: authUserId ?? s.created_by,
  })
}
