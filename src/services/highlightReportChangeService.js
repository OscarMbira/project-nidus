import { supabase } from './supabaseClient'

/**
 * Highlight Report Change Requests Service
 * Handles change request references for Highlight Reports
 */

export async function getChangeRequests(reportId) {
  const { data, error } = await supabase
    .from('highlight_report_change_requests')
    .select('*')
    .eq('highlight_report_id', reportId)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function getChangeRequestsByStatus(reportId, status) {
  const { data, error } = await supabase
    .from('highlight_report_change_requests')
    .select('*')
    .eq('highlight_report_id', reportId)
    .eq('change_status', status)
    .order('display_order', { ascending: true })
  if (error) throw error
  return data || []
}

export async function addChangeRequest(reportId, changeData) {
  const { data: existing } = await supabase
    .from('highlight_report_change_requests')
    .select('display_order')
    .eq('highlight_report_id', reportId)
    .order('display_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const insert = {
    ...changeData,
    highlight_report_id: reportId,
    display_order: changeData.display_order ?? (existing?.display_order ?? 0) + 1,
  }
  const { data, error } = await supabase
    .from('highlight_report_change_requests')
    .insert(insert)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateChangeRequest(changeId, updates) {
  const { data, error } = await supabase
    .from('highlight_report_change_requests')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', changeId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteChangeRequest(changeId) {
  const { error } = await supabase
    .from('highlight_report_change_requests')
    .delete()
    .eq('id', changeId)
  if (error) throw error
}
