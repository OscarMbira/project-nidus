import { simDb } from '../supabase/supabaseClient'

export async function getGovernanceRules() {
  const { data, error } = await simDb.from('plan_governance_rules').select('*').eq('is_active', true)
  if (error) throw error
  return data || []
}

export async function evaluateGates(practiceProjectId) {
  const rules = await getGovernanceRules()
  const now = new Date().toISOString()
  for (const rule of rules) {
    const status = 'pending'
    await simDb.from('plan_governance_findings').upsert(
      {
        practice_project_id: practiceProjectId,
        rule_id: rule.id,
        status,
        last_checked_at: now,
      },
      { onConflict: 'practice_project_id,rule_id' }
    )
  }
  return getGovernanceFindings(practiceProjectId)
}

export async function getGovernanceFindings(practiceProjectId) {
  const { data, error } = await simDb
    .from('plan_governance_findings')
    .select('*, rule:rule_id(*)')
    .eq('practice_project_id', practiceProjectId)
  if (error) throw error
  return data || []
}
