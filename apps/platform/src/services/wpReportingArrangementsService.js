/**
 * Work Package Reporting Arrangements — fetch by work package (see SQL v216 wp_reporting_arrangements).
 */
import { supabase } from './supabaseClient'

export async function getReportingArrangements(wpId) {
  try {
    const { data, error } = await supabase
      .from('wp_reporting_arrangements')
      .select('*')
      .eq('work_package_id', wpId)
      .eq('is_deleted', false)
      .order('display_order', { ascending: true })

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching wp reporting arrangements:', error)
    return { success: false, error: error.message, data: [] }
  }
}

export async function addReportingArrangement(wpId, row) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const { data: userRow } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single()
    if (!userRow) throw new Error('User not found')

    const insert = {
      work_package_id: wpId,
      report_type: row.report_type ?? 'checkpoint_report',
      report_frequency: row.report_frequency || null,
      report_recipients: row.report_recipients || null,
      report_format: row.report_format ?? 'written',
      report_template: row.report_template || null,
      report_owner: row.report_owner || null,
      report_description: row.report_description || null,
      display_order: row.display_order ?? 0,
      created_by: userRow.id,
      updated_by: userRow.id,
    }

    const { data, error } = await supabase.from('wp_reporting_arrangements').insert(insert).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('addReportingArrangement', error)
    return { success: false, error: error.message }
  }
}

export async function updateReportingArrangement(arrangementId, row) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const { data: userRow } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single()
    if (!userRow) throw new Error('User not found')

    const updates = {
      report_type: row.report_type ?? 'checkpoint_report',
      report_frequency: row.report_frequency || null,
      report_recipients: row.report_recipients || null,
      report_format: row.report_format ?? 'written',
      report_template: row.report_template || null,
      report_owner: row.report_owner || null,
      report_description: row.report_description || null,
      display_order: row.display_order ?? 0,
      updated_by: userRow.id,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('wp_reporting_arrangements')
      .update(updates)
      .eq('id', arrangementId)
      .select()
      .single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('updateReportingArrangement', error)
    return { success: false, error: error.message }
  }
}

export async function deleteReportingArrangement(arrangementId) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const { data: userRow } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single()

    const { error } = await supabase
      .from('wp_reporting_arrangements')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userRow?.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', arrangementId)
    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('deleteReportingArrangement', error)
    return { success: false, error: error.message }
  }
}
