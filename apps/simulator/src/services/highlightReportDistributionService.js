import { supabase } from './supabaseClient'

/**
 * Highlight Report Distribution Service
 * Handles distribution list and tracking
 */

export async function getDistributionList(reportId) {
  const { data, error } = await supabase
    .from('highlight_report_distribution')
    .select('*')
    .eq('highlight_report_id', reportId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function addDistributionRecipient(reportId, recipientData) {
  const { data, error } = await supabase
    .from('highlight_report_distribution')
    .insert({ ...recipientData, highlight_report_id: reportId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function removeDistributionRecipient(distributionId) {
  const { error } = await supabase
    .from('highlight_report_distribution')
    .delete()
    .eq('id', distributionId)
  if (error) throw error
}

export async function trackDistributionStatus(distributionId, status) {
  const updates = { distribution_status: status }
  if (status === 'read') updates.read_at = new Date().toISOString()
  if (status === 'acknowledged') updates.acknowledged_at = new Date().toISOString()
  const { data, error } = await supabase
    .from('highlight_report_distribution')
    .update(updates)
    .eq('id', distributionId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function acknowledgeReceipt(distributionId) {
  return trackDistributionStatus(distributionId, 'acknowledged')
}
