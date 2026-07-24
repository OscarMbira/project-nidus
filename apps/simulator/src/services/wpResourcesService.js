/**
 * Work Package Resources — fetch by work package (see SQL v216 wp_resources).
 */
import { supabase } from './supabaseClient'

export async function getResources(wpId) {
  try {
    const { data, error } = await supabase
      .from('wp_resources')
      .select('*')
      .eq('work_package_id', wpId)
      .eq('is_deleted', false)
      .order('display_order', { ascending: true })

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching wp resources:', error)
    return { success: false, error: error.message, data: [] }
  }
}

function num(v) {
  if (v === '' || v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export async function addResource(wpId, row) {
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
      resource_type: row.resource_type ?? 'person',
      resource_name: row.resource_name,
      resource_description: row.resource_description ?? null,
      quantity_required: num(row.quantity_required),
      unit_of_measure: row.unit_of_measure || null,
      cost_estimate: num(row.cost_estimate),
      cost_actual: num(row.cost_actual),
      allocated: !!row.allocated,
      allocation_date: row.allocation_date || null,
      display_order: row.display_order ?? 0,
      created_by: userRow.id,
      updated_by: userRow.id,
    }

    const { data, error } = await supabase.from('wp_resources').insert(insert).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('addResource', error)
    return { success: false, error: error.message }
  }
}

export async function updateResource(resourceId, row) {
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
      resource_type: row.resource_type ?? 'person',
      resource_name: row.resource_name,
      resource_description: row.resource_description ?? null,
      quantity_required: num(row.quantity_required),
      unit_of_measure: row.unit_of_measure || null,
      cost_estimate: num(row.cost_estimate),
      cost_actual: num(row.cost_actual),
      allocated: !!row.allocated,
      allocation_date: row.allocation_date || null,
      display_order: row.display_order ?? 0,
      updated_by: userRow.id,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('wp_resources')
      .update(updates)
      .eq('id', resourceId)
      .select()
      .single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('updateResource', error)
    return { success: false, error: error.message }
  }
}

export async function deleteResource(resourceId) {
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
      .from('wp_resources')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userRow?.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', resourceId)
    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('deleteResource', error)
    return { success: false, error: error.message }
  }
}
