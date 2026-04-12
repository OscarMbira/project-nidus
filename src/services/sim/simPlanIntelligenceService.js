/** Sim schema — planning intelligence (practice_project_id) */
import { simDb } from '../supabase/supabaseClient'

export async function getIntelligenceRules() {
  const { data, error } = await simDb.from('plan_intelligence_rules').select('*').eq('is_active', true).order('rule_code')
  if (error) throw error
  return data || []
}

export async function runIntelligenceScan(practiceProjectId) {
  const { data: rules, error: rErr } = await simDb.from('plan_intelligence_rules').select('*').eq('is_active', true)
  if (rErr) throw rErr

  await simDb.from('plan_intelligence_findings').delete().eq('practice_project_id', practiceProjectId).eq('status', 'open')

  const inserts = []
  const rule = (rules || []).find((x) => x.rule_code === 'no_baseline_set')
  if (rule) {
    inserts.push({
      practice_project_id: practiceProjectId,
      rule_id: rule.id,
      finding_text: 'Simulator scan: review schedule baseline and milestones for this practice project.',
      severity: rule.severity,
      status: 'open',
      scanned_at: new Date().toISOString(),
    })
  }

  const rStale = (rules || []).find((x) => x.rule_code === 'micro_plan_activity_stale')
  if (rStale) {
    const today = new Date().toISOString().slice(0, 10)
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString()
    const { data: microRows, error: microErr } = await simDb
      .from('micro_plan_activities')
      .select('id, activity_name, planned_end_date, status, progress_pct, updated_at, micro_plan_id')
      .eq('practice_project_id', practiceProjectId)
      .eq('is_deleted', false)
    if (microErr) throw microErr
    const planIds = [...new Set((microRows || []).map((r) => r.micro_plan_id).filter(Boolean))]
    let activePlanIds = new Set()
    if (planIds.length) {
      const { data: plans, error: pErr } = await simDb
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
        practice_project_id: practiceProjectId,
        rule_id: rStale.id,
        finding_text: `Micro-plan activity "${row.activity_name}" is overdue with no update in 3+ days (sim).`,
        severity: rStale.severity,
        status: 'open',
        scanned_at: new Date().toISOString(),
      })
    }
  }

  if (inserts.length) {
    const { error } = await simDb.from('plan_intelligence_findings').insert(inserts)
    if (error) throw error
  }
  return { scanned: true, findingsCreated: inserts.length }
}

export async function getFindings(practiceProjectId) {
  const { data, error } = await simDb
    .from('plan_intelligence_findings')
    .select('*')
    .eq('practice_project_id', practiceProjectId)
    .order('scanned_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function acknowledgeFindings(ids) {
  if (!ids?.length) return
  const { error } = await simDb.from('plan_intelligence_findings').update({ status: 'acknowledged' }).in('id', ids)
  if (error) throw error
}

export async function resolveFindings(ids) {
  if (!ids?.length) return
  const { error } = await simDb.from('plan_intelligence_findings').update({ status: 'resolved' }).in('id', ids)
  if (error) throw error
}
