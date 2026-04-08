import { supabase } from './supabaseClient'

/**
 * Highlight Report Issues Service
 * Handles key issues tracking for Highlight Reports
 */

export async function getIssues(reportId) {
  const { data, error } = await supabase
    .from('highlight_report_issues')
    .select('*')
    .eq('highlight_report_id', reportId)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function getKeyIssues(reportId) {
  return getIssues(reportId)
}

export async function addIssue(reportId, issueData) {
  const { data: existing } = await supabase
    .from('highlight_report_issues')
    .select('display_order')
    .eq('highlight_report_id', reportId)
    .order('display_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const insert = {
    ...issueData,
    highlight_report_id: reportId,
    display_order: issueData.display_order ?? (existing?.display_order ?? 0) + 1,
  }
  const { data, error } = await supabase
    .from('highlight_report_issues')
    .insert(insert)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateIssue(issueId, updates) {
  const { data, error } = await supabase
    .from('highlight_report_issues')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', issueId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteIssue(issueId) {
  const { error } = await supabase
    .from('highlight_report_issues')
    .delete()
    .eq('id', issueId)
  if (error) throw error
}
