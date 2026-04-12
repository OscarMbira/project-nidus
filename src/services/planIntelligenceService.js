/**
 * Planning Intelligence (M1) — public schema
 */

import { platformDb } from './supabase/supabaseClient'

const FINDING_SELECT = `
  *,
  rule:rule_id (
    id, rule_code, rule_name, rule_description, severity, applies_to, is_active
  )
`

async function getProjectOrg(projectId) {
  const { data, error } = await platformDb.from('projects').select('id, organisation_id').eq('id', projectId).single()
  if (error) throw error
  return data
}

export async function getIntelligenceRules(orgId) {
  let q = platformDb.from('plan_intelligence_rules').select('*').eq('is_active', true)
  if (orgId) {
    q = q.or(`organisation_id.is.null,organisation_id.eq.${orgId}`)
  } else {
    q = q.is('organisation_id', null)
  }
  const { data, error } = await q.order('rule_code')
  if (error) throw error
  return data || []
}

export async function toggleRule(ruleId, isActive) {
  const { data, error } = await platformDb
    .from('plan_intelligence_rules')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', ruleId)
    .select()
    .single()
  if (error) throw error
  return data
}

/**
 * Run heuristic scan: clears open findings, re-evaluates active rules against tasks/dependencies.
 */
export async function runIntelligenceScan(projectId) {
  const project = await getProjectOrg(projectId)
  const orgId = project.organisation_id

  const { data: rules, error: rulesErr } = await platformDb
    .from('plan_intelligence_rules')
    .select('*')
    .eq('is_active', true)
    .or(`organisation_id.is.null,organisation_id.eq.${orgId}`)
  if (rulesErr) throw rulesErr

  const { data: tasks, error: tasksErr } = await platformDb
    .from('tasks')
    .select('id, task_name, start_date, due_date, progress_percentage, is_milestone, is_critical_path, baseline_start_date, baseline_end_date')
    .eq('project_id', projectId)
    .eq('is_deleted', false)
  if (tasksErr) throw tasksErr

  const taskIds = (tasks || []).map((t) => t.id)
  let projectDeps = []
  if (taskIds.length) {
    const { data: deps, error: depErr } = await platformDb
      .from('task_dependencies')
      .select('source_task_id, target_task_id')
      .eq('is_deleted', false)
      .in('target_task_id', taskIds)
    if (depErr) throw depErr
    projectDeps = deps || []
  }

  const hasIncoming = (taskId) => projectDeps.some((d) => d.target_task_id === taskId)
  const today = new Date().toISOString().slice(0, 10)

  await platformDb.from('plan_intelligence_findings').delete().eq('project_id', projectId).eq('status', 'open')

  const inserts = []
  const ruleByCode = Object.fromEntries((rules || []).map((r) => [r.rule_code, r]))

  for (const task of tasks || []) {
    const r = ruleByCode.missing_predecessor
    if (r && (tasks || []).length > 1 && !hasIncoming(task.id) && !task.is_milestone) {
      inserts.push({
        project_id: projectId,
        rule_id: r.id,
        task_id: task.id,
        finding_text: `Task "${task.task_name}" has no predecessor dependency.`,
        severity: r.severity,
        status: 'open',
        scanned_at: new Date().toISOString(),
      })
    }

    const rOver = ruleByCode.overdue_critical_task
    if (
      rOver &&
      task.is_critical_path &&
      task.due_date &&
      task.due_date < today &&
      (task.progress_percentage == null || task.progress_percentage < 100)
    ) {
      inserts.push({
        project_id: projectId,
        rule_id: rOver.id,
        task_id: task.id,
        finding_text: `Critical task "${task.task_name}" is overdue with incomplete progress.`,
        severity: rOver.severity,
        status: 'open',
        scanned_at: new Date().toISOString(),
      })
    }

    const rBase = ruleByCode.no_baseline_set
    if (
      rBase &&
      task.start_date &&
      !task.baseline_start_date &&
      !task.baseline_end_date
    ) {
      inserts.push({
        project_id: projectId,
        rule_id: rBase.id,
        task_id: task.id,
        finding_text: `Task "${task.task_name}" has schedule dates but no baseline recorded.`,
        severity: rBase.severity,
        status: 'open',
        scanned_at: new Date().toISOString(),
      })
    }
  }

  const rStale = ruleByCode.micro_plan_activity_stale
  if (rStale) {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString()
    const { data: microRows, error: microErr } = await platformDb
      .from('micro_plan_activities')
      .select('id, activity_name, planned_end_date, status, progress_pct, updated_at, micro_plan_id')
      .eq('project_id', projectId)
      .eq('is_deleted', false)
    if (microErr) throw microErr
    const planIds = [...new Set((microRows || []).map((r) => r.micro_plan_id).filter(Boolean))]
    let activePlanIds = new Set()
    if (planIds.length) {
      const { data: plans, error: pErr } = await platformDb
        .from('project_micro_plans')
        .select('id, is_deleted')
        .in('id', planIds)
      if (pErr) throw pErr
      activePlanIds = new Set((plans || []).filter((p) => !p.is_deleted).map((p) => p.id))
    }
    const activeStatus = new Set(['not_started', 'in_progress', 'on_hold'])
    for (const row of microRows || []) {
      if (!activePlanIds.has(row.micro_plan_id)) continue
      if (!row.planned_end_date || row.planned_end_date >= today) continue
      if (!activeStatus.has(row.status)) continue
      if ((row.progress_pct ?? 0) >= 100) continue
      if (row.updated_at && row.updated_at >= threeDaysAgo) continue
      inserts.push({
        project_id: projectId,
        rule_id: rStale.id,
        task_id: null,
        finding_text: `Micro-plan activity "${row.activity_name}" is overdue with no update in 3+ days.`,
        severity: rStale.severity,
        status: 'open',
        scanned_at: new Date().toISOString(),
      })
    }
  }

  if (inserts.length) {
    const { error: insErr } = await platformDb.from('plan_intelligence_findings').insert(inserts)
    if (insErr) throw insErr
  }

  return { scanned: true, findingsCreated: inserts.length }
}

export async function getFindings(projectId, filters = {}) {
  let q = platformDb.from('plan_intelligence_findings').select(FINDING_SELECT).eq('project_id', projectId)

  if (filters.status) q = q.eq('status', filters.status)
  if (filters.severity) q = q.eq('severity', filters.severity)

  q = q.order('scanned_at', { ascending: false })
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function acknowledgeFindings(ids) {
  if (!ids?.length) return
  const { error } = await platformDb.from('plan_intelligence_findings').update({ status: 'acknowledged' }).in('id', ids)
  if (error) throw error
}

export async function resolveFindings(ids, resolvedByProfileId) {
  if (!ids?.length) return
  const { error } = await platformDb
    .from('plan_intelligence_findings')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      resolved_by: resolvedByProfileId ?? null,
    })
    .in('id', ids)
  if (error) throw error
}
