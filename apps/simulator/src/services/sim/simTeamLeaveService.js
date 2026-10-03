/**
 * Leave Calendar — Simulator (v1109). Mirrors apps/platform/src/services/teamLeaveService.js
 * against sim.workload_leave_calendar (SQL/v1130).
 */
import { simDb } from '../supabase/supabaseClient'
import { listPracticeProjectTeamMembers } from './simTeamSkillsService'

export const LEAVE_TYPES = ['annual_leave', 'public_holiday', 'sick_leave', 'training', 'other']

export async function listPracticeProjectLeave(practiceProjectId) {
  const membersRes = await listPracticeProjectTeamMembers(practiceProjectId)
  if (!membersRes.success) return { success: false, data: [], error: membersRes.error }
  const authIds = membersRes.data.map((m) => m.authUserId)
  if (authIds.length === 0) return { success: true, data: [] }

  try {
    const { data, error } = await simDb
      .from('workload_leave_calendar')
      .select('*')
      .in('user_id', authIds)
      .eq('is_deleted', false)
      .order('start_date', { ascending: true })
    if (error) throw error

    const byAuthId = new Map(membersRes.data.map((m) => [m.authUserId, m]))
    return {
      success: true,
      data: (data || []).map((row) => ({ ...row, member: byAuthId.get(row.user_id) || null })),
    }
  } catch (error) {
    console.error('listPracticeProjectLeave:', error)
    return { success: false, data: [], error: error.message }
  }
}

export async function addLeaveEntry({ accountId, authUserId, leaveType, startDate, endDate, notes }) {
  try {
    const { data: { user } } = await simDb.auth.getUser()
    const { data, error } = await simDb
      .from('workload_leave_calendar')
      .insert({
        account_id: accountId,
        user_id: authUserId,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        notes: notes || null,
        created_by: user?.id || null,
      })
      .select()
      .single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('addLeaveEntry:', error)
    return { success: false, error: error.message }
  }
}

export async function updateLeaveEntry(id, { leaveType, startDate, endDate, notes }) {
  try {
    const patch = { updated_at: new Date().toISOString() }
    if (leaveType !== undefined) patch.leave_type = leaveType
    if (startDate !== undefined) patch.start_date = startDate
    if (endDate !== undefined) patch.end_date = endDate
    if (notes !== undefined) patch.notes = notes

    const { data, error } = await simDb
      .from('workload_leave_calendar')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('updateLeaveEntry:', error)
    return { success: false, error: error.message }
  }
}

export async function deleteLeaveEntry(id) {
  try {
    const { error } = await simDb.from('workload_leave_calendar').update({ is_deleted: true }).eq('id', id)
    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('deleteLeaveEntry:', error)
    return { success: false, error: error.message }
  }
}

export default { listPracticeProjectLeave, addLeaveEntry, updateLeaveEntry, deleteLeaveEntry, LEAVE_TYPES }
