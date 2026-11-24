/**
 * v1355 — load and save quantitative risk analysis inputs and runs.
 * Platform and Planner use public; Simulator uses sim. Planner is schedule-only (no risks).
 */
import { platformDb, simDb } from '@nidus/supabase'
import { buildCalendar } from '../engine/schedule.js'

export function createQraData(isSim) {
  const db = isSim ? simDb : platformDb
  const riskTable = isSim ? 'practice_risks' : 'risks'

  function fail(error, message) {
    const err = new Error(error?.message || message)
    err.cause = error
    throw err
  }

  async function listGroups(projectId) {
    const { data, error } = await db.from('qra_groups').select('*').eq('project_id', projectId).order('name')
    if (error) fail(error, 'Could not load groups.')
    return data || []
  }

  async function saveGroup(projectId, group) {
    const row = { project_id: projectId, name: group.name.trim(), strength: group.strength || 'medium' }
    if (group.id) {
      const { data, error } = await db.from('qra_groups').update(row).eq('id', group.id).select('*').single()
      if (error) fail(error, 'Could not save the group.')
      return data
    }
    const { data, error } = await db.from('qra_groups').insert(row).select('*').single()
    if (error) fail(error, 'Could not add the group.')
    return data
  }

  async function deleteGroup(id) {
    const { error } = await db.from('qra_groups').delete().eq('id', id)
    if (error) fail(error, 'Could not delete the group.')
  }

  async function listRanges(projectId) {
    const { data, error } = await db.from('task_duration_ranges').select('*').eq('project_id', projectId)
    if (error) fail(error, 'Could not load task ranges.')
    return data || []
  }

  async function saveRanges(projectId, rows) {
    const keep = rows.filter((r) => r.min_days != null || r.ml_days != null || r.max_days != null)
    const drop = rows.filter((r) => r.id && r.min_days == null && r.ml_days == null && r.max_days == null).map((r) => r.id)
    if (drop.length) {
      const { error } = await db.from('task_duration_ranges').delete().in('id', drop)
      if (error) fail(error, 'Could not clear a task range.')
    }
    if (!keep.length) return
    const payload = keep.map((r) => ({
      id: r.id || undefined,
      project_id: projectId,
      task_id: r.task_id,
      min_days: r.min_days,
      ml_days: r.ml_days,
      max_days: r.max_days,
      distribution: r.distribution || 'triangular',
      qra_group_id: r.qra_group_id || null,
    }))
    const { error } = await db.from('task_duration_ranges').upsert(payload, { onConflict: 'task_id' })
    if (error) fail(error, 'Could not save task ranges.')
  }

  async function listLinks(projectId) {
    const { data, error } = await db.from('risk_task_links').select('*').eq('project_id', projectId)
    if (error) fail(error, 'Could not load risk links.')
    return data || []
  }

  async function replaceLinks(projectId, links) {
    const { error: delError } = await db.from('risk_task_links').delete().eq('project_id', projectId)
    if (delError) fail(delError, 'Could not update risk links.')
    if (!links.length) return
    const { error } = await db.from('risk_task_links').insert(links.map((l) => ({
      project_id: projectId, risk_id: l.risk_id, task_id: l.task_id,
    })))
    if (error) fail(error, 'Could not save risk links.')
  }

  async function listRisks(projectId) {
    const column = isSim ? 'practice_project_id' : 'project_id'
    const { data, error } = await db.from(riskTable).select('*').eq(column, projectId).eq('is_deleted', false)
    if (error) fail(error, 'Could not load risks.')
    return data || []
  }

  async function listCostLines(projectId) {
    const { data, error } = await db.from('cost_line_ranges').select('*').eq('project_id', projectId).order('line_label')
    if (error) fail(error, 'Could not load cost lines.')
    return data || []
  }

  async function saveCostLines(projectId, rows) {
    for (const row of rows) {
      const payload = {
        project_id: projectId,
        line_label: row.line_label,
        source_kind: row.source_kind || 'manual',
        source_id: row.source_id || null,
        min_amount: row.min_amount,
        ml_amount: row.ml_amount,
        max_amount: row.max_amount,
        distribution: row.distribution || 'triangular',
        is_time_dependent: Boolean(row.is_time_dependent),
        daily_rate: row.daily_rate,
        qra_group_id: row.qra_group_id || null,
      }
      const query = row.id
        ? db.from('cost_line_ranges').update(payload).eq('id', row.id)
        : db.from('cost_line_ranges').insert(payload)
      const { error } = await query
      if (error) fail(error, 'Could not save a cost line.')
    }
  }

  async function deleteCostLine(id) {
    const { error } = await db.from('cost_line_ranges').delete().eq('id', id)
    if (error) fail(error, 'Could not delete the cost line.')
  }

  async function listBudgetLines(projectId) {
    if (isSim) return []
    const { data: plan, error: planError } = await db.from('project_plans').select('id').eq('project_id', projectId).eq('is_deleted', false).maybeSingle()
    if (planError || !plan) return []
    const { data, error } = await db.from('project_plan_budget_lines').select('id, category, amount, notes').eq('project_plan_id', plan.id).order('sort_order')
    if (error) return []
    return data || []
  }

  async function loadSettings(projectId) {
    const { data, error } = await db.from('qra_settings').select('*').eq('project_id', projectId).maybeSingle()
    if (error) fail(error, 'Could not load analysis settings.')
    return data
  }

  async function saveSettings(projectId, values, organisationId) {
    const row = {
      project_id: projectId,
      organisation_id: organisationId || null,
      target_confidence: values.target_confidence,
      default_distribution: values.default_distribution,
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await db.from('qra_settings').upsert(row, { onConflict: 'project_id' }).select('*').single()
    if (error) fail(error, 'Could not save analysis settings.')
    return data
  }

  async function saveRun(payload) {
    const { data, error } = await db.rpc('save_qra_run', { p_payload: payload })
    if (error) fail(error, 'Could not save the analysis.')
    return data
  }

  async function listRuns(projectId) {
    const { data, error } = await db.from('qra_runs').select('id, display_id, kind, response_basis, iterations, seed, summary, created_at')
      .eq('project_id', projectId).order('created_at', { ascending: false })
    if (error) fail(error, 'Could not load saved analyses.')
    return data || []
  }

  async function getRun(id) {
    const { data, error } = await db.from('qra_runs').select('*').eq('id', id).maybeSingle()
    if (error) fail(error, 'Could not load the analysis.')
    return data
  }

  async function adopt(runId) {
    const { data, error } = await db.rpc('adopt_qra_contingency', { p_run_id: runId })
    if (error) fail(error, 'Could not adopt the contingency.')
    return data
  }

  async function heldContingency(projectId) {
    if (isSim) {
      const { data } = await db.from('practice_project_plans').select('contingency_amount').eq('practice_project_id', projectId).eq('is_deleted', false).maybeSingle()
      return data?.contingency_amount ?? 0
    }
    const { data } = await db.from('project_plans').select('contingency_amount, total_budget').eq('project_id', projectId).eq('is_deleted', false).maybeSingle()
    return { held: data?.contingency_amount ?? 0, budget: data?.total_budget ?? null }
  }

  return {
    listGroups, saveGroup, deleteGroup, listRanges, saveRanges, listLinks, replaceLinks,
    listRisks, listCostLines, saveCostLines, deleteCostLine, listBudgetLines,
    loadSettings, saveSettings, saveRun, listRuns, getRun, adopt, heldContingency,
  }
}

export function calendarToJson(calendar) {
  if (!calendar?.workingDays) return null
  return {
    workingDays: [...calendar.workingDays],
    exceptions: [...(calendar.exceptions || [])],
    extraWorkingDays: [...(calendar.extra || [])],
  }
}

export function calendarFromJson(json) {
  if (!json) return buildCalendar()
  return buildCalendar(json)
}

/** Plain inputs stored on the run so a re-run with the same seed matches. */
export function snapshotOf(model) {
  return {
    seed: model.seed,
    iterations: model.iterations,
    basis: model.basis,
    kind: model.kind,
    projectStart: model.projectStart,
    calendar: calendarToJson(model.calendar),
    targetDate: model.targetDate,
    targetCost: model.targetCost,
    confidence: model.confidence,
    baseBudget: model.baseBudget,
    contingencyHeld: model.contingencyHeld,
    includeRisks: model.includeRisks,
    tasks: model.tasks,
    dependencies: model.dependencies,
    risks: model.risks,
    groups: model.groups,
    costLines: model.costLines,
  }
}
