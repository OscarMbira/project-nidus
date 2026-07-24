import { supabase } from './supabaseClient'
import { calculateToleranceStatus } from './controllingStageService'

/**
 * Highlight Report Tolerances Service
 * Handles tolerance snapshot per Highlight Report
 */

export async function getTolerances(reportId) {
  const { data, error } = await supabase
    .from('highlight_report_tolerances')
    .select('*')
    .eq('highlight_report_id', reportId)
  if (error) throw error
  return data || []
}

export async function getToleranceBreaches(reportId) {
  const rows = await getTolerances(reportId)
  return rows.filter((r) =>
    ['exceeded_tolerance', 'exception'].includes(String(r.status))
  )
}

export async function addToleranceStatus(reportId, toleranceData) {
  const { data, error } = await supabase
    .from('highlight_report_tolerances')
    .insert({ ...toleranceData, highlight_report_id: reportId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateToleranceStatus(toleranceId, updates) {
  const { data, error } = await supabase
    .from('highlight_report_tolerances')
    .update(updates)
    .eq('id', toleranceId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function calculateAllTolerances(reportId) {
  return calculateToleranceStatus(reportId)
}
