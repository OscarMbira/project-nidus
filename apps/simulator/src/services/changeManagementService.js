/**
 * Simulator Change Management Service — sim.practice_change_* via simDb.
 * Phase 0 of v792 plan: replaces public-schema clone that violated schema separation.
 * API mirrors Platform changeManagementService; maps project_id ↔ practice_project_id.
 */
import { simDb } from '@nidus/supabase'

/** @returns {{ authUserId: string, simUserId: string }} */
async function getCurrentUserIds() {
  const { data: { user: authUser } } = await simDb.auth.getUser()
  if (!authUser) throw new Error('User not authenticated')
  const { data: userData, error } = await simDb
    .from('users')
    .select('id')
    .eq('auth_user_id', authUser.id)
    .single()
  if (error || !userData) throw new Error('User not found')
  return { authUserId: authUser.id, simUserId: userData.id }
}

function toSimPayload(data = {}) {
  const row = { ...data }
  if (Object.prototype.hasOwnProperty.call(row, 'project_id')) {
    row.practice_project_id = row.project_id
    delete row.project_id
  }
  // Board members: Platform uses user_id for the member; sim uses member_user_id
  if (Object.prototype.hasOwnProperty.call(row, 'user_id') && !row.member_user_id) {
    // Only remap when this looks like a member payload (has board_id)
    if (row.board_id) {
      row.member_user_id = row.user_id
      delete row.user_id
    }
  }
  return row
}

function fromSimRow(row) {
  if (!row) return row
  const out = { ...row, project_id: row.practice_project_id }
  if (row.member_user_id != null && out.user_id == null) {
    out.user_id = row.member_user_id
  }
  return out
}

function fromSimRows(rows) {
  return (rows || []).map(fromSimRow)
}

// ===========================
// CHANGE BOARDS
// ===========================

export async function fetchChangeBoards(projectId = null) {
  let query = simDb
    .from('practice_change_board')
    .select('*')
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
  if (projectId) query = query.eq('practice_project_id', projectId)
  const { data, error } = await query
  if (error) throw error
  return fromSimRows(data)
}

export async function fetchChangeBoard(boardId) {
  const { data, error } = await simDb
    .from('practice_change_board')
    .select('*')
    .eq('id', boardId)
    .eq('is_deleted', false)
    .single()
  if (error) throw error
  return fromSimRow(data)
}

export async function createChangeBoard(boardData) {
  const { authUserId, simUserId } = await getCurrentUserIds()
  const { data, error } = await simDb
    .from('practice_change_board')
    .insert({
      ...toSimPayload(boardData),
      user_id: simUserId,
      created_by: authUserId,
      updated_by: authUserId,
    })
    .select()
    .single()
  if (error) throw error
  return fromSimRow(data)
}

export async function updateChangeBoard(boardId, updates) {
  const { authUserId } = await getCurrentUserIds()
  const { data, error } = await simDb
    .from('practice_change_board')
    .update({ ...toSimPayload(updates), updated_by: authUserId, updated_at: new Date().toISOString() })
    .eq('id', boardId)
    .select()
    .single()
  if (error) throw error
  return fromSimRow(data)
}

// ===========================
// CHANGE BOARD MEMBERS
// ===========================

export async function fetchChangeBoardMembers(boardId) {
  const { data, error } = await simDb
    .from('practice_change_board_members')
    .select('*')
    .eq('board_id', boardId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
  if (error) throw error
  return fromSimRows(data)
}

export async function addChangeBoardMember(memberData) {
  const { authUserId, simUserId } = await getCurrentUserIds()
  const { data, error } = await simDb
    .from('practice_change_board_members')
    .insert({
      ...toSimPayload(memberData),
      user_id: simUserId,
      created_by: authUserId,
      updated_by: authUserId,
    })
    .select()
    .single()
  if (error) throw error
  return fromSimRow(data)
}

export async function removeChangeBoardMember(memberId) {
  const { error } = await simDb
    .from('practice_change_board_members')
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq('id', memberId)
  if (error) throw error
}

// ===========================
// CHANGE REQUESTS
// ===========================

export async function fetchChangeRequests(projectIdOrFilters) {
  const filters =
    projectIdOrFilters != null && typeof projectIdOrFilters === 'object'
      ? projectIdOrFilters
      : { project_id: projectIdOrFilters }

  let query = simDb
    .from('practice_change_requests')
    .select('*')
    .eq('is_deleted', false)
    .order('submission_date', { ascending: false })

  if (filters.project_id) query = query.eq('practice_project_id', filters.project_id)
  const boardId = filters.board_id ?? filters.change_board_id
  if (boardId) query = query.eq('change_board_id', boardId)
  if (filters.status) query = query.eq('status', filters.status)
  const category = filters.category ?? filters.change_category
  if (category) query = query.eq('change_category', category)
  if (filters.priority) query = query.eq('priority', filters.priority)
  const search = typeof filters.search === 'string' ? filters.search.trim().replace(/,/g, ' ') : ''
  if (search) {
    const pat = `%${search}%`
    query = query.or(`change_title.ilike.${pat},change_reference.ilike.${pat}`)
  }

  const { data, error } = await query
  if (error) throw error
  return fromSimRows(data)
}

export async function fetchChangeRequest(requestId) {
  const { data, error } = await simDb
    .from('practice_change_requests')
    .select('*')
    .eq('id', requestId)
    .eq('is_deleted', false)
    .single()
  if (error) throw error
  return fromSimRow(data)
}

export async function createChangeRequest(requestData) {
  const { authUserId, simUserId } = await getCurrentUserIds()
  const { data, error } = await simDb
    .from('practice_change_requests')
    .insert({
      ...toSimPayload(requestData),
      user_id: simUserId,
      created_by: requestData.created_by || authUserId,
      updated_by: authUserId,
      submitted_by: requestData.submitted_by || authUserId,
    })
    .select()
    .single()
  if (error) throw error
  return fromSimRow(data)
}

export async function updateChangeRequest(requestId, updates) {
  const { authUserId } = await getCurrentUserIds()
  const { data, error } = await simDb
    .from('practice_change_requests')
    .update({ ...toSimPayload(updates), updated_by: authUserId, updated_at: new Date().toISOString() })
    .eq('id', requestId)
    .select()
    .single()
  if (error) throw error
  return fromSimRow(data)
}

export async function deleteChangeRequest(requestId) {
  const { authUserId } = await getCurrentUserIds()
  const { error } = await simDb
    .from('practice_change_requests')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: authUserId,
    })
    .eq('id', requestId)
  if (error) throw error
}

// ===========================
// CHANGE ASSESSMENTS
// ===========================

export async function fetchChangeAssessment(requestId) {
  const { data, error } = await simDb
    .from('practice_change_assessments')
    .select('*')
    .eq('change_request_id', requestId)
    .eq('is_deleted', false)
    .order('assessment_date', { ascending: false })
    .maybeSingle()
  if (error) throw error
  return fromSimRow(data)
}

export async function createChangeAssessment(assessmentData) {
  const { authUserId, simUserId } = await getCurrentUserIds()
  const { data, error } = await simDb
    .from('practice_change_assessments')
    .insert({
      ...toSimPayload(assessmentData),
      user_id: simUserId,
      created_by: assessmentData.created_by || authUserId,
      updated_by: authUserId,
      assessed_by: assessmentData.assessed_by || authUserId,
    })
    .select()
    .single()
  if (error) throw error
  return fromSimRow(data)
}

export async function updateChangeAssessment(assessmentId, updates) {
  const { authUserId } = await getCurrentUserIds()
  const { data, error } = await simDb
    .from('practice_change_assessments')
    .update({ ...toSimPayload(updates), updated_by: authUserId, updated_at: new Date().toISOString() })
    .eq('id', assessmentId)
    .select()
    .single()
  if (error) throw error
  return fromSimRow(data)
}

// ===========================
// CHANGE APPROVALS
// ===========================

export async function fetchChangeApprovals(requestId) {
  const { data, error } = await simDb
    .from('practice_change_approvals')
    .select('*')
    .eq('change_request_id', requestId)
    .eq('is_deleted', false)
    .order('requested_date', { ascending: false })
  if (error) throw error
  return fromSimRows(data)
}

export async function createChangeApproval(approvalData) {
  const { authUserId, simUserId } = await getCurrentUserIds()
  const { data, error } = await simDb
    .from('practice_change_approvals')
    .insert({
      ...toSimPayload(approvalData),
      user_id: simUserId,
      created_by: authUserId,
      updated_by: authUserId,
    })
    .select()
    .single()
  if (error) throw error
  return fromSimRow(data)
}

export async function updateChangeApproval(approvalId, updates) {
  const { authUserId } = await getCurrentUserIds()
  const { data, error } = await simDb
    .from('practice_change_approvals')
    .update({ ...toSimPayload(updates), updated_by: authUserId, updated_at: new Date().toISOString() })
    .eq('id', approvalId)
    .select()
    .single()
  if (error) throw error
  return fromSimRow(data)
}

// ===========================
// CHANGE IMPLEMENTATIONS
// ===========================

export async function fetchChangeImplementation(requestId) {
  const { data, error } = await simDb
    .from('practice_change_implementations')
    .select('*')
    .eq('change_request_id', requestId)
    .eq('is_deleted', false)
    .maybeSingle()
  if (error) throw error
  return fromSimRow(data)
}

export async function createChangeImplementation(implementationData) {
  const { authUserId, simUserId } = await getCurrentUserIds()
  const { data, error } = await simDb
    .from('practice_change_implementations')
    .insert({
      ...toSimPayload(implementationData),
      user_id: simUserId,
      created_by: authUserId,
      updated_by: authUserId,
    })
    .select()
    .single()
  if (error) throw error
  return fromSimRow(data)
}

export async function updateChangeImplementation(implementationId, updates) {
  const { authUserId } = await getCurrentUserIds()
  const { data, error } = await simDb
    .from('practice_change_implementations')
    .update({ ...toSimPayload(updates), updated_by: authUserId, updated_at: new Date().toISOString() })
    .eq('id', implementationId)
    .select()
    .single()
  if (error) throw error
  return fromSimRow(data)
}

// ===========================
// CHANGE LOG
// ===========================

export async function fetchChangeLog(requestId) {
  const { data, error } = await simDb
    .from('practice_change_log')
    .select('*')
    .eq('change_request_id', requestId)
    .order('log_date', { ascending: false })
  if (error) throw error
  return fromSimRows(data)
}

export async function addChangeLogEntry(logData) {
  const { authUserId, simUserId } = await getCurrentUserIds()
  const { data, error } = await simDb
    .from('practice_change_log')
    .insert({
      ...toSimPayload(logData),
      user_id: simUserId,
      created_by: authUserId,
      performed_by: logData.performed_by || authUserId,
    })
    .select()
    .single()
  if (error) throw error
  return fromSimRow(data)
}

// ===========================
// DASHBOARD
// ===========================

export async function getChangeManagementStats(projectId) {
  const [requestsResult, boardResult] = await Promise.all([
    simDb
      .from('practice_change_requests')
      .select('id, status, priority, change_category, submission_date')
      .eq('practice_project_id', projectId)
      .eq('is_deleted', false),
    simDb
      .from('practice_change_board')
      .select('id, board_name, status')
      .eq('practice_project_id', projectId)
      .eq('is_deleted', false)
      .maybeSingle(),
  ])

  if (requestsResult.error) throw requestsResult.error
  if (boardResult.error && boardResult.error.code !== 'PGRST116') throw boardResult.error

  const requests = requestsResult.data || []
  const board = boardResult.data

  return {
    totalRequests: requests.length,
    submittedRequests: requests.filter((r) => r.status === 'submitted').length,
    underAssessment: requests.filter((r) => r.status === 'under-assessment').length,
    pendingApproval: requests.filter((r) => r.status === 'pending-approval').length,
    approvedRequests: requests.filter((r) => r.status === 'approved').length,
    rejectedRequests: requests.filter((r) => r.status === 'rejected').length,
    implementedRequests: requests.filter((r) => r.status === 'implemented').length,
    criticalPriority: requests.filter((r) => r.priority === 'critical' || r.priority === 'urgent').length,
    byCategory: {
      scope: requests.filter((r) => r.change_category === 'scope').length,
      schedule: requests.filter((r) => r.change_category === 'schedule').length,
      budget: requests.filter((r) => r.change_category === 'budget').length,
      quality: requests.filter((r) => r.change_category === 'quality').length,
      resource: requests.filter((r) => r.change_category === 'resource').length,
      technical: requests.filter((r) => r.change_category === 'technical').length,
    },
    boardExists: !!board,
    boardName: board?.board_name || 'Not configured',
    boardStatus: board?.status || 'N/A',
  }
}

export default {
  fetchChangeBoards,
  fetchChangeBoard,
  createChangeBoard,
  updateChangeBoard,
  fetchChangeBoardMembers,
  addChangeBoardMember,
  removeChangeBoardMember,
  fetchChangeRequests,
  fetchChangeRequest,
  createChangeRequest,
  updateChangeRequest,
  deleteChangeRequest,
  fetchChangeAssessment,
  createChangeAssessment,
  updateChangeAssessment,
  fetchChangeApprovals,
  createChangeApproval,
  updateChangeApproval,
  fetchChangeImplementation,
  createChangeImplementation,
  updateChangeImplementation,
  fetchChangeLog,
  addChangeLogEntry,
  getChangeManagementStats,
}
