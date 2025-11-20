import { supabase } from './supabaseClient';

/**
 * Change Management Service - API functions for Change Management module
 */

// ===========================
// CHANGE BOARDS
// ===========================

/**
 * Fetch change boards for a project or organization
 * @param {string} projectId - Project ID (optional if fetching org-level boards)
 * @returns {Promise<Array>} Array of change boards
 */
export async function fetchChangeBoards(projectId = null) {
  try {
    let query = supabase
      .from('change_board')
      .select(`
        *,
        project:projects(id, project_name, project_code)
      `)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching change boards:', error);
    throw error;
  }
}

/**
 * Fetch a single change board by ID
 * @param {string} boardId - Board ID
 * @returns {Promise<Object>} Change board
 */
export async function fetchChangeBoard(boardId) {
  try {
    const { data, error } = await supabase
      .from('change_board')
      .select(`
        *,
        project:projects(id, project_name, project_code)
      `)
      .eq('id', boardId)
      .eq('is_deleted', false)
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error fetching change board:', error);
    throw error;
  }
}

/**
 * Create a change board
 * @param {Object} boardData - Board data
 * @returns {Promise<Object>} Created board
 */
export async function createChangeBoard(boardData) {
  try {
    const { data, error } = await supabase
      .from('change_board')
      .insert(boardData)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error creating change board:', error);
    throw error;
  }
}

/**
 * Update a change board
 * @param {string} boardId - Board ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated board
 */
export async function updateChangeBoard(boardId, updates) {
  try {
    const { data, error } = await supabase
      .from('change_board')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', boardId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error updating change board:', error);
    throw error;
  }
}

// ===========================
// CHANGE BOARD MEMBERS
// ===========================

/**
 * Fetch change board members
 * @param {string} boardId - Board ID
 * @returns {Promise<Array>} Array of board members
 */
export async function fetchChangeBoardMembers(boardId) {
  try {
    const { data, error } = await supabase
      .from('change_board_members')
      .select(`
        *,
        user:users(id, full_name, email),
        board:change_board(id, board_name)
      `)
      .eq('board_id', boardId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching board members:', error);
    throw error;
  }
}

/**
 * Add a member to change board
 * @param {Object} memberData - Member data
 * @returns {Promise<Object>} Created member
 */
export async function addChangeBoardMember(memberData) {
  try {
    const { data, error } = await supabase
      .from('change_board_members')
      .insert(memberData)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error adding board member:', error);
    throw error;
  }
}

/**
 * Remove a member from change board (soft delete)
 * @param {string} memberId - Member ID
 * @returns {Promise<void>}
 */
export async function removeChangeBoardMember(memberId) {
  try {
    const { error } = await supabase
      .from('change_board_members')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString()
      })
      .eq('id', memberId);

    if (error) throw error;
  } catch (error) {
    console.error('Error removing board member:', error);
    throw error;
  }
}

// ===========================
// CHANGE REQUESTS
// ===========================

/**
 * Fetch change requests for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Array>} Array of change requests
 */
export async function fetchChangeRequests(projectId) {
  try {
    const { data, error } = await supabase
      .from('change_requests')
      .select(`
        *,
        project:projects(id, project_name, project_code),
        change_board:change_board(id, board_name),
        submitted_by_user:users!change_requests_submitted_by_fkey(full_name, email),
        current_approver:users!change_requests_current_approver_user_id_fkey(full_name, email)
      `)
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .order('submission_date', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching change requests:', error);
    throw error;
  }
}

/**
 * Fetch a single change request by ID
 * @param {string} requestId - Request ID
 * @returns {Promise<Object>} Change request
 */
export async function fetchChangeRequest(requestId) {
  try {
    const { data, error } = await supabase
      .from('change_requests')
      .select(`
        *,
        project:projects(id, project_name, project_code),
        change_board:change_board(id, board_name),
        submitted_by_user:users!change_requests_submitted_by_fkey(full_name, email)
      `)
      .eq('id', requestId)
      .eq('is_deleted', false)
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error fetching change request:', error);
    throw error;
  }
}

/**
 * Create a change request
 * @param {Object} requestData - Request data
 * @returns {Promise<Object>} Created request
 */
export async function createChangeRequest(requestData) {
  try {
    const { data, error } = await supabase
      .from('change_requests')
      .insert(requestData)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error creating change request:', error);
    throw error;
  }
}

/**
 * Update a change request
 * @param {string} requestId - Request ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated request
 */
export async function updateChangeRequest(requestId, updates) {
  try {
    const { data, error } = await supabase
      .from('change_requests')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error updating change request:', error);
    throw error;
  }
}

/**
 * Delete a change request (soft delete)
 * @param {string} requestId - Request ID
 * @returns {Promise<void>}
 */
export async function deleteChangeRequest(requestId) {
  try {
    const { error } = await supabase
      .from('change_requests')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting change request:', error);
    throw error;
  }
}

// ===========================
// CHANGE ASSESSMENTS
// ===========================

/**
 * Fetch assessment for a change request
 * @param {string} requestId - Request ID
 * @returns {Promise<Object>} Change assessment
 */
export async function fetchChangeAssessment(requestId) {
  try {
    const { data, error } = await supabase
      .from('change_assessments')
      .select(`
        *,
        change_request:change_requests(id, change_title, change_reference),
        project:projects(id, project_name),
        assessed_by_user:users!change_assessments_assessed_by_fkey(full_name, email)
      `)
      .eq('change_request_id', requestId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;

    return data;
  } catch (error) {
    console.error('Error fetching change assessment:', error);
    throw error;
  }
}

/**
 * Create a change assessment
 * @param {Object} assessmentData - Assessment data
 * @returns {Promise<Object>} Created assessment
 */
export async function createChangeAssessment(assessmentData) {
  try {
    const { data, error } = await supabase
      .from('change_assessments')
      .insert(assessmentData)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error creating change assessment:', error);
    throw error;
  }
}

/**
 * Update a change assessment
 * @param {string} assessmentId - Assessment ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated assessment
 */
export async function updateChangeAssessment(assessmentId, updates) {
  try {
    const { data, error } = await supabase
      .from('change_assessments')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', assessmentId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error updating change assessment:', error);
    throw error;
  }
}

// ===========================
// CHANGE APPROVALS
// ===========================

/**
 * Fetch approvals for a change request
 * @param {string} requestId - Request ID
 * @returns {Promise<Array>} Array of approvals
 */
export async function fetchChangeApprovals(requestId) {
  try {
    const { data, error } = await supabase
      .from('change_approvals')
      .select(`
        *,
        change_request:change_requests(id, change_title, change_reference),
        approver:users!change_approvals_approver_user_id_fkey(full_name, email),
        delegated_from:users!change_approvals_delegated_from_user_id_fkey(full_name, email)
      `)
      .eq('change_request_id', requestId)
      .eq('is_deleted', false)
      .order('requested_date', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching change approvals:', error);
    throw error;
  }
}

/**
 * Create a change approval request
 * @param {Object} approvalData - Approval data
 * @returns {Promise<Object>} Created approval
 */
export async function createChangeApproval(approvalData) {
  try {
    const { data, error } = await supabase
      .from('change_approvals')
      .insert(approvalData)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error creating change approval:', error);
    throw error;
  }
}

/**
 * Update a change approval (record decision)
 * @param {string} approvalId - Approval ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated approval
 */
export async function updateChangeApproval(approvalId, updates) {
  try {
    const { data, error } = await supabase
      .from('change_approvals')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', approvalId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error updating change approval:', error);
    throw error;
  }
}

// ===========================
// CHANGE IMPLEMENTATIONS
// ===========================

/**
 * Fetch implementation for a change request
 * @param {string} requestId - Request ID
 * @returns {Promise<Object>} Change implementation
 */
export async function fetchChangeImplementation(requestId) {
  try {
    const { data, error } = await supabase
      .from('change_implementations')
      .select(`
        *,
        change_request:change_requests(id, change_title, change_reference),
        project:projects(id, project_name),
        implementation_owner:users!change_implementations_implementation_owner_user_id_fkey(full_name, email),
        verified_by_user:users!change_implementations_verified_by_fkey(full_name, email)
      `)
      .eq('change_request_id', requestId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;

    return data;
  } catch (error) {
    console.error('Error fetching change implementation:', error);
    throw error;
  }
}

/**
 * Create a change implementation
 * @param {Object} implementationData - Implementation data
 * @returns {Promise<Object>} Created implementation
 */
export async function createChangeImplementation(implementationData) {
  try {
    const { data, error } = await supabase
      .from('change_implementations')
      .insert(implementationData)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error creating change implementation:', error);
    throw error;
  }
}

/**
 * Update a change implementation
 * @param {string} implementationId - Implementation ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated implementation
 */
export async function updateChangeImplementation(implementationId, updates) {
  try {
    const { data, error } = await supabase
      .from('change_implementations')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', implementationId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error updating change implementation:', error);
    throw error;
  }
}

// ===========================
// CHANGE LOG
// ===========================

/**
 * Fetch change log entries for a request
 * @param {string} requestId - Request ID
 * @returns {Promise<Array>} Array of log entries
 */
export async function fetchChangeLog(requestId) {
  try {
    const { data, error } = await supabase
      .from('change_log')
      .select(`
        *,
        change_request:change_requests(id, change_title, change_reference),
        performed_by_user:users!change_log_performed_by_fkey(full_name, email)
      `)
      .eq('change_request_id', requestId)
      .order('log_date', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching change log:', error);
    throw error;
  }
}

/**
 * Add a change log entry
 * @param {Object} logData - Log entry data
 * @returns {Promise<Object>} Created log entry
 */
export async function addChangeLogEntry(logData) {
  try {
    const { data, error } = await supabase
      .from('change_log')
      .insert(logData)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error adding change log entry:', error);
    throw error;
  }
}

// ===========================
// DASHBOARD & ANALYTICS
// ===========================

/**
 * Get change management dashboard statistics
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Dashboard statistics
 */
export async function getChangeManagementStats(projectId) {
  try {
    const [requestsResult, boardResult] = await Promise.all([
      supabase
        .from('change_requests')
        .select('id, status, priority, change_category, submission_date')
        .eq('project_id', projectId)
        .eq('is_deleted', false),
      supabase
        .from('change_board')
        .select('id, board_name, status')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .maybeSingle()
    ]);

    if (requestsResult.error) throw requestsResult.error;
    if (boardResult.error && boardResult.error.code !== 'PGRST116') throw boardResult.error;

    const requests = requestsResult.data || [];
    const board = boardResult.data;

    return {
      totalRequests: requests.length,
      submittedRequests: requests.filter(r => r.status === 'submitted').length,
      underAssessment: requests.filter(r => r.status === 'under-assessment').length,
      pendingApproval: requests.filter(r => r.status === 'pending-approval').length,
      approvedRequests: requests.filter(r => r.status === 'approved').length,
      rejectedRequests: requests.filter(r => r.status === 'rejected').length,
      implementedRequests: requests.filter(r => r.status === 'implemented').length,
      criticalPriority: requests.filter(r => r.priority === 'critical' || r.priority === 'urgent').length,
      byCategory: {
        scope: requests.filter(r => r.change_category === 'scope').length,
        schedule: requests.filter(r => r.change_category === 'schedule').length,
        budget: requests.filter(r => r.change_category === 'budget').length,
        quality: requests.filter(r => r.change_category === 'quality').length,
        resource: requests.filter(r => r.change_category === 'resource').length,
        technical: requests.filter(r => r.change_category === 'technical').length
      },
      boardExists: !!board,
      boardName: board?.board_name || 'Not configured',
      boardStatus: board?.status || 'N/A'
    };
  } catch (error) {
    console.error('Error fetching change management stats:', error);
    throw error;
  }
}

export default {
  // Change Boards
  fetchChangeBoards,
  fetchChangeBoard,
  createChangeBoard,
  updateChangeBoard,

  // Change Board Members
  fetchChangeBoardMembers,
  addChangeBoardMember,
  removeChangeBoardMember,

  // Change Requests
  fetchChangeRequests,
  fetchChangeRequest,
  createChangeRequest,
  updateChangeRequest,
  deleteChangeRequest,

  // Change Assessments
  fetchChangeAssessment,
  createChangeAssessment,
  updateChangeAssessment,

  // Change Approvals
  fetchChangeApprovals,
  createChangeApproval,
  updateChangeApproval,

  // Change Implementations
  fetchChangeImplementation,
  createChangeImplementation,
  updateChangeImplementation,

  // Change Log
  fetchChangeLog,
  addChangeLogEntry,

  // Dashboard
  getChangeManagementStats
};
