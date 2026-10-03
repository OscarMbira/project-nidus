/**
 * Capacity Planning (v1109). Wires Teams.jsx's Capacity Planning tab to
 * workload_capacity_settings (SQL/v643, RLS broadened in SQL/v1129). user_id references
 * auth.users(id) directly — matches supabase.auth.getUser().id as-is.
 */
import { platformDb as supabase } from './supabaseClient'
import { listProjectTeamMembers } from './teamSkillsService'

/** All capacity settings for the given project's active team members. */
export async function listProjectCapacity(projectId) {
  const membersRes = await listProjectTeamMembers(projectId)
  if (!membersRes.success) return { success: false, data: [], error: membersRes.error }
  const authIds = membersRes.data.map((m) => m.authUserId)
  if (authIds.length === 0) return { success: true, data: [] }

  try {
    const { data, error } = await supabase
      .from('workload_capacity_settings')
      .select('*')
      .in('user_id', authIds)
      .eq('is_deleted', false)
      .order('effective_from', { ascending: false })
    if (error) throw error

    const byAuthId = new Map(membersRes.data.map((m) => [m.authUserId, m]))
    return {
      success: true,
      data: (data || []).map((row) => ({ ...row, member: byAuthId.get(row.user_id) || null })),
    }
  } catch (error) {
    console.error('listProjectCapacity:', error)
    return { success: false, data: [], error: error.message }
  }
}

export async function upsertCapacitySetting({
  id, accountId, projectId, authUserId, hoursPerDay, hoursPerWeek, effectiveFrom, effectiveTo,
}) {
  try {
    const payload = {
      account_id: accountId,
      project_id: projectId,
      user_id: authUserId,
      hours_per_day: hoursPerDay,
      hours_per_week: hoursPerWeek,
      effective_from: effectiveFrom,
      effective_to: effectiveTo || null,
      updated_at: new Date().toISOString(),
    }
    const query = id
      ? supabase.from('workload_capacity_settings').update(payload).eq('id', id)
      : supabase.from('workload_capacity_settings').insert(payload)
    const { data, error } = await query.select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('upsertCapacitySetting:', error)
    return { success: false, error: error.message }
  }
}

export async function deleteCapacitySetting(id) {
  try {
    const { error } = await supabase.from('workload_capacity_settings').update({ is_deleted: true }).eq('id', id)
    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('deleteCapacitySetting:', error)
    return { success: false, error: error.message }
  }
}

export default { listProjectCapacity, upsertCapacitySetting, deleteCapacitySetting }
