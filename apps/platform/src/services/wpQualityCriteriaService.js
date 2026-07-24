/**
 * Work Package Quality Criteria — fetch by work package (see SQL v216 wp_quality_criteria).
 */
import { supabase } from './supabaseClient'

export async function getQualityCriteria(wpId) {
  try {
    const { data, error } = await supabase
      .from('wp_quality_criteria')
      .select('*')
      .eq('work_package_id', wpId)
      .eq('is_deleted', false)
      .order('display_order', { ascending: true })

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching wp quality criteria:', error)
    return { success: false, error: error.message, data: [] }
  }
}

async function nextCriteriaNumber(wpId) {
  const { data, error } = await supabase
    .from('wp_quality_criteria')
    .select('criteria_number')
    .eq('work_package_id', wpId)
    .eq('is_deleted', false)
    .order('criteria_number', { ascending: false })
    .limit(1)
  if (error) throw error
  const max = data?.[0]?.criteria_number
  return typeof max === 'number' ? max + 1 : 1
}

export async function addQualityCriterion(wpId, row) {
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

    const criteria_number = await nextCriteriaNumber(wpId)
    const criteria_reference = `QC-${String(criteria_number).padStart(3, '0')}`

    const insert = {
      work_package_id: wpId,
      criteria_number,
      criteria_reference,
      criteria_title: row.criteria_title,
      criteria_description: row.criteria_description,
      criteria_type: row.criteria_type ?? 'quality',
      quality_method: row.quality_method || null,
      quality_responsible: row.quality_responsible || null,
      quality_status: row.quality_status ?? 'pending',
      quality_date: row.quality_date || null,
      quality_result: row.quality_result || null,
      display_order: row.display_order ?? 0,
      created_by: userRow.id,
      updated_by: userRow.id,
    }

    const { data, error } = await supabase.from('wp_quality_criteria').insert(insert).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('addQualityCriterion', error)
    return { success: false, error: error.message }
  }
}

export async function updateQualityCriterion(criterionId, row) {
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
      criteria_title: row.criteria_title,
      criteria_description: row.criteria_description,
      criteria_type: row.criteria_type ?? 'quality',
      quality_method: row.quality_method || null,
      quality_responsible: row.quality_responsible || null,
      quality_status: row.quality_status ?? 'pending',
      quality_date: row.quality_date || null,
      quality_result: row.quality_result || null,
      display_order: row.display_order ?? 0,
      updated_by: userRow.id,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('wp_quality_criteria')
      .update(updates)
      .eq('id', criterionId)
      .select()
      .single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('updateQualityCriterion', error)
    return { success: false, error: error.message }
  }
}

export async function deleteQualityCriterion(criterionId) {
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
      .from('wp_quality_criteria')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userRow?.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', criterionId)
    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('deleteQualityCriterion', error)
    return { success: false, error: error.message }
  }
}
