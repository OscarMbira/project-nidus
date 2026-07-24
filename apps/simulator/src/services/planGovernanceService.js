/**
 * Planning governance gates (M10)
 */

import { platformDb } from './supabase/supabaseClient'

export async function getGovernanceRules(orgId, projectTypeCode) {
  let q = platformDb.from('plan_governance_rules').select('*').eq('is_active', true)
  if (orgId) {
    q = q.or(`organisation_id.is.null,organisation_id.eq.${orgId}`)
  } else {
    q = q.is('organisation_id', null)
  }
  const { data, error } = await q
  if (error) throw error
  let rules = data || []
  if (projectTypeCode) {
    rules = rules.filter((r) => !r.project_type || r.project_type === projectTypeCode)
  }
  return rules
}

async function evaluateRule(projectId, rule, project) {
  let status = 'pending'

  if (rule.check_type === 'milestone_exists') {
    const { count, error } = await platformDb
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('is_milestone', true)
      .eq('is_deleted', false)
    if (error) throw error
    status = (count || 0) > 0 ? 'compliant' : 'non_compliant'
  } else if (rule.check_type === 'risk_review_done') {
    const { data: risks, error } = await platformDb
      .from('risks')
      .select('status')
      .eq('project_id', projectId)
      .eq('is_deleted', false)
    if (error) throw error
    const reviewed = (risks || []).some((r) => r.status && !['identified', 'draft', 'closed'].includes(r.status))
    status = reviewed ? 'compliant' : 'non_compliant'
  } else {
    status = 'pending'
  }

  return status
}

export async function evaluateGates(projectId) {
  const { data: project, error: pErr } = await platformDb
    .from('projects')
    .select('id, organisation_id, project_types(type_code)')
    .eq('id', projectId)
    .single()
  if (pErr) throw pErr

  const typeCode = project.project_types?.type_code || null
  const rules = await getGovernanceRules(project.organisation_id, typeCode)
  const now = new Date().toISOString()

  for (const rule of rules) {
    const status = await evaluateRule(projectId, rule, project)
    const { error: upErr } = await platformDb.from('plan_governance_findings').upsert(
      {
        project_id: projectId,
        rule_id: rule.id,
        status,
        last_checked_at: now,
      },
      { onConflict: 'project_id,rule_id' }
    )
    if (upErr) throw upErr
  }

  return getGovernanceFindings(projectId)
}

export async function getGovernanceFindings(projectId) {
  const { data, error } = await platformDb
    .from('plan_governance_findings')
    .select(
      `
      *,
      rule:rule_id (*)
    `
    )
    .eq('project_id', projectId)
    .order('last_checked_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function waiveGate(findingId, reason, waivedByProfileId) {
  const { data, error } = await platformDb
    .from('plan_governance_findings')
    .update({
      status: 'waived',
      waiver_reason: reason,
      waived_by: waivedByProfileId,
      waived_at: new Date().toISOString(),
    })
    .eq('id', findingId)
    .select()
    .single()
  if (error) throw error
  return data
}
