import { supabase } from './supabaseClient'

/**
 * Highlight Report Decisions Service
 * Handles decisions required from board
 */

export async function getDecisions(reportId) {
  const { data, error } = await supabase
    .from('highlight_report_decisions')
    .select('*')
    .eq('highlight_report_id', reportId)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function getPendingDecisions(projectId) {
  const { data: reports } = await supabase
    .from('highlight_reports')
    .select('id')
    .eq('project_id', projectId)
    .eq('is_deleted', false)
  const reportIds = (reports || []).map((r) => r.id)
  if (reportIds.length === 0) return []
  const { data, error } = await supabase
    .from('highlight_report_decisions')
    .select('*')
    .in('highlight_report_id', reportIds)
    .in('status', ['pending', 'acknowledged'])
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function addDecision(reportId, decisionData) {
  const { data: existing } = await supabase
    .from('highlight_report_decisions')
    .select('display_order')
    .eq('highlight_report_id', reportId)
    .order('display_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const insert = {
    ...decisionData,
    highlight_report_id: reportId,
    display_order: decisionData.display_order ?? (existing?.display_order ?? 0) + 1,
  }
  const { data, error } = await supabase
    .from('highlight_report_decisions')
    .insert(insert)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateDecision(decisionId, updates) {
  const { data, error } = await supabase
    .from('highlight_report_decisions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', decisionId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteDecision(decisionId) {
  const { error } = await supabase
    .from('highlight_report_decisions')
    .delete()
    .eq('id', decisionId)
  if (error) throw error
}

export async function markDecisionDecided(decisionId, decisionData) {
  return updateDecision(decisionId, {
    ...decisionData,
    status: 'decided',
    decision_date: decisionData.decision_date || new Date().toISOString().split('T')[0],
  })
}
