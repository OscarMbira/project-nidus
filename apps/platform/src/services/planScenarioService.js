/**
 * Scenario planning (M2) — public schema
 */

import { platformDb } from './supabase/supabaseClient'

const SCENARIO_SELECT = '*, plan_scenario_task_snapshots(*)'

export async function getScenarios(projectId) {
  const { data, error } = await platformDb
    .from('plan_scenarios')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getScenario(id) {
  const { data, error } = await platformDb.from('plan_scenarios').select(SCENARIO_SELECT).eq('id', id).single()
  if (error) throw error
  return data
}

export async function createScenario(data) {
  const row = {
    project_id: data.project_id,
    organisation_id: data.organisation_id,
    name: data.name,
    scenario_type: data.scenario_type || 'custom',
    description: data.description ?? null,
    status: data.status || 'draft',
    is_baseline: !!data.is_baseline,
    milestone_delta_days: data.milestone_delta_days ?? 0,
    cost_delta: data.cost_delta ?? 0,
    is_draft: !!data.is_draft,
    draft_expires_at: data.draft_expires_at ?? null,
    created_by: data.created_by ?? null,
  }
  const { data: inserted, error } = await platformDb.from('plan_scenarios').insert(row).select('*').single()
  if (error) throw error
  return inserted
}

export async function cloneScenario(scenarioId, newName, createdByProfileId) {
  const { data, error } = await platformDb.rpc('clone_scenario', {
    p_source_scenario_id: scenarioId,
    p_new_name: newName,
    p_created_by: createdByProfileId,
  })
  if (error) throw error
  return data
}

export async function updateScenario(id, patch) {
  const { data, error } = await platformDb
    .from('plan_scenarios')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function compareScenarios(idA, idB) {
  const [a, b] = await Promise.all([getScenario(idA), getScenario(idB)])
  const snapsA = a.plan_scenario_task_snapshots || a.snapshots
  const snapsB = b.plan_scenario_task_snapshots || b.snapshots
  const mapByName = (snaps) => Object.fromEntries((snaps || []).map((s) => [s.task_name, s]))
  const sa = mapByName(snapsA)
  const sb = mapByName(snapsB)
  const names = new Set([...Object.keys(sa), ...Object.keys(sb)])
  const rows = []
  for (const name of names) {
    const x = sa[name]
    const y = sb[name]
    rows.push({
      task_name: name,
      a_start: x?.start_date ?? null,
      b_start: y?.start_date ?? null,
      delta_days:
        x?.start_date && y?.start_date
          ? Math.round((new Date(y.start_date) - new Date(x.start_date)) / 86400000)
          : null,
      a_duration: x?.duration_days ?? null,
      b_duration: y?.duration_days ?? null,
      a_owner: x?.assigned_to ?? null,
      b_owner: y?.assigned_to ?? null,
    })
  }
  return {
    scenarioA: a,
    scenarioB: b,
    milestone_delta_a: a.milestone_delta_days,
    milestone_delta_b: b.milestone_delta_days,
    cost_delta_a: a.cost_delta,
    cost_delta_b: b.cost_delta,
    taskRows: rows,
  }
}

export async function promoteToBaseline(scenarioId, approverId) {
  const scenario = await getScenario(scenarioId)
  await platformDb
    .from('plan_scenarios')
    .update({ is_baseline: false })
    .eq('project_id', scenario.project_id)
    .neq('id', scenarioId)

  const { data, error } = await platformDb
    .from('plan_scenarios')
    .update({
      is_baseline: true,
      status: 'promoted',
      promoted_at: new Date().toISOString(),
      promoted_by: approverId,
      approved_by: approverId,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', scenarioId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteScenario(id) {
  const { data, error } = await platformDb
    .from('plan_scenarios')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function upsertTaskSnapshots(scenarioId, snapshots) {
  const rows = (snapshots || []).map((s) => ({
    scenario_id: scenarioId,
    source_task_id: s.source_task_id ?? null,
    task_name: s.task_name,
    start_date: s.start_date ?? null,
    end_date: s.end_date ?? null,
    duration_days: s.duration_days ?? null,
    progress_percentage: s.progress_percentage ?? 0,
    assigned_to: s.assigned_to ?? null,
    is_milestone: !!s.is_milestone,
    is_critical_path: !!s.is_critical_path,
    dependency_type: s.dependency_type ?? null,
    confidence_level: s.confidence_level ?? 50,
    notes: s.notes ?? null,
  }))
  const { error } = await platformDb.from('plan_scenario_task_snapshots').delete().eq('scenario_id', scenarioId)
  if (error) throw error
  if (!rows.length) return []
  const { data, error: ins } = await platformDb.from('plan_scenario_task_snapshots').insert(rows).select()
  if (ins) throw ins
  return data || []
}
