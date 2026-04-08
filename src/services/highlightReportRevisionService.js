import { supabase } from './supabaseClient'

export async function getRevisionHistory(reportId) {
  const { data, error } = await supabase
    .from('highlight_report_revision_history')
    .select('*')
    .eq('highlight_report_id', reportId)
    .order('revision_date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function addRevision(reportId, payload) {
  const { data, error } = await supabase
    .from('highlight_report_revision_history')
    .insert({
      highlight_report_id: reportId,
      revision_date: payload.revision_date || new Date().toISOString().split('T')[0],
      version_number: payload.version_number || '1.0',
      previous_version_number: payload.previous_version_number || null,
      summary_of_changes: payload.summary_of_changes || null,
      changes_marked: payload.changes_marked || null,
      revised_by: payload.revised_by || null,
    })
    .select()
    .single()
  if (error) throw error
  return data
}
