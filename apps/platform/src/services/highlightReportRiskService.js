import { supabase } from './supabaseClient'

/**
 * Highlight Report Risks Service
 * Handles key risks tracking for Highlight Reports
 */

export async function getRisks(reportId) {
  const { data, error } = await supabase
    .from('highlight_report_risks')
    .select('*')
    .eq('highlight_report_id', reportId)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function getKeyRisks(reportId) {
  return getRisks(reportId)
}

export async function addRisk(reportId, riskData) {
  const { data: existing } = await supabase
    .from('highlight_report_risks')
    .select('display_order')
    .eq('highlight_report_id', reportId)
    .order('display_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const insert = {
    ...riskData,
    highlight_report_id: reportId,
    display_order: riskData.display_order ?? (existing?.display_order ?? 0) + 1,
  }
  const { data, error } = await supabase
    .from('highlight_report_risks')
    .insert(insert)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateRisk(riskId, updates) {
  const { data, error } = await supabase
    .from('highlight_report_risks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', riskId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteRisk(riskId) {
  const { error } = await supabase
    .from('highlight_report_risks')
    .delete()
    .eq('id', riskId)
  if (error) throw error
}
