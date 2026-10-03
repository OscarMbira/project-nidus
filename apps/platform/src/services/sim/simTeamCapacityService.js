/**
 * Capacity Planning — Simulator (v1109). Mirrors apps/platform/src/services/teamCapacityService.js
 * against sim.workload_capacity_settings (SQL/v1130).
 */
import { simDb } from '../supabase/supabaseClient'
import { listPracticeProjectTeamMembers } from './simTeamSkillsService'

export async function listPracticeProjectCapacity(practiceProjectId) {
  const membersRes = await listPracticeProjectTeamMembers(practiceProjectId)
  if (!membersRes.success) return { success: false, data: [], error: membersRes.error }
  const authIds = membersRes.data.map((m) => m.authUserId)
  if (authIds.length === 0) return { success: true, data: [] }

  try {
    const { data, error } = await simDb
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
    console.error('listPracticeProjectCapacity:', error)
    return { success: false, data: [], error: error.message }
  }
}

export async function upsertCapacitySetting({
  id, accountId, practiceProjectId, authUserId, hoursPerDay, hoursPerWeek, effectiveFrom, effectiveTo,
}) {
  try {
    const payload = {
      account_id: accountId,
      practice_project_id: practiceProjectId,
      user_id: authUserId,
      hours_per_day: hoursPerDay,
      hours_per_week: hoursPerWeek,
      effective_from: effectiveFrom,
      effective_to: effectiveTo || null,
      updated_at: new Date().toISOString(),
    }
    const query = id
      ? simDb.from('workload_capacity_settings').update(payload).eq('id', id)
      : simDb.from('workload_capacity_settings').insert(payload)
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
    const { error } = await simDb.from('workload_capacity_settings').update({ is_deleted: true }).eq('id', id)
    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('deleteCapacitySetting:', error)
    return { success: false, error: error.message }
  }
}

export default { listPracticeProjectCapacity, upsertCapacitySetting, deleteCapacitySetting }
