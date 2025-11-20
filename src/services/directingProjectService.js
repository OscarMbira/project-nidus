import { supabase } from './supabaseClient';

/**
 * Directing a Project (DP) Service - API functions for Project Board governance
 */

// ===========================
// PROJECT BOARDS
// ===========================

/**
 * Fetch all project boards with members count
 * @param {string} projectId - Project ID (optional)
 * @returns {Promise<Array>} Array of project boards
 */
export async function fetchProjectBoards(projectId = null) {
  try {
    let query = supabase
      .from('project_boards')
      .select(`
        *,
        project:projects(id, project_name),
        board_members(count)
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
    console.error('Error fetching project boards:', error);
    throw error;
  }
}

/**
 * Fetch a single project board by ID
 * @param {string} boardId - Board ID
 * @returns {Promise<Object>} Project board
 */
export async function fetchProjectBoard(boardId) {
  try {
    const { data, error } = await supabase
      .from('project_boards')
      .select(`
        *,
        project:projects(id, project_name, project_code),
        board_members(
          id,
          user_id,
          role_on_board,
          appointment_date,
          is_active,
          users(full_name, email)
        )
      `)
      .eq('id', boardId)
      .eq('is_deleted', false)
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error fetching project board:', error);
    throw error;
  }
}

/**
 * Create a new project board
 * @param {Object} boardData - Board data
 * @returns {Promise<Object>} Created board
 */
export async function createProjectBoard(boardData) {
  try {
    const { data, error } = await supabase
      .from('project_boards')
      .insert(boardData)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error creating project board:', error);
    throw error;
  }
}

/**
 * Update a project board
 * @param {string} boardId - Board ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated board
 */
export async function updateProjectBoard(boardId, updates) {
  try {
    const { data, error } = await supabase
      .from('project_boards')
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
    console.error('Error updating project board:', error);
    throw error;
  }
}

/**
 * Delete a project board (soft delete)
 * @param {string} boardId - Board ID
 * @returns {Promise<void>}
 */
export async function deleteProjectBoard(boardId) {
  try {
    const { error } = await supabase
      .from('project_boards')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString()
      })
      .eq('id', boardId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting project board:', error);
    throw error;
  }
}

// ===========================
// BOARD MEMBERS
// ===========================

/**
 * Fetch board members for a project board
 * @param {string} boardId - Board ID
 * @returns {Promise<Array>} Array of board members
 */
export async function fetchBoardMembers(boardId) {
  try {
    const { data, error } = await supabase
      .from('board_members')
      .select(`
        *,
        user:users(id, full_name, email, phone),
        board:project_boards(id, board_name)
      `)
      .eq('board_id', boardId)
      .eq('is_deleted', false)
      .order('appointment_date', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching board members:', error);
    throw error;
  }
}

/**
 * Add a board member
 * @param {Object} memberData - Member data
 * @returns {Promise<Object>} Created member
 */
export async function addBoardMember(memberData) {
  try {
    const { data, error } = await supabase
      .from('board_members')
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
 * Update a board member
 * @param {string} memberId - Member ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated member
 */
export async function updateBoardMember(memberId, updates) {
  try {
    const { data, error } = await supabase
      .from('board_members')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', memberId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error updating board member:', error);
    throw error;
  }
}

/**
 * Remove a board member (soft delete)
 * @param {string} memberId - Member ID
 * @returns {Promise<void>}
 */
export async function removeBoardMember(memberId) {
  try {
    const { error } = await supabase
      .from('board_members')
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
// BOARD MEETINGS
// ===========================

/**
 * Fetch board meetings
 * @param {string} boardId - Board ID
 * @returns {Promise<Array>} Array of board meetings
 */
export async function fetchBoardMeetings(boardId) {
  try {
    const { data, error } = await supabase
      .from('board_meetings')
      .select(`
        *,
        board:project_boards(id, board_name),
        attendees:board_meeting_attendees(
          id,
          board_member_id,
          attendance_status,
          board_member:board_members(
            id,
            user:users(full_name, email)
          )
        )
      `)
      .eq('board_id', boardId)
      .eq('is_deleted', false)
      .order('meeting_date', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching board meetings:', error);
    throw error;
  }
}

/**
 * Fetch a single board meeting by ID
 * @param {string} meetingId - Meeting ID
 * @returns {Promise<Object>} Board meeting
 */
export async function fetchBoardMeeting(meetingId) {
  try {
    const { data, error } = await supabase
      .from('board_meetings')
      .select(`
        *,
        board:project_boards(id, board_name, project_id),
        attendees:board_meeting_attendees(
          id,
          board_member_id,
          attendance_status,
          apologies_reason,
          board_member:board_members(
            id,
            role_on_board,
            user:users(full_name, email)
          )
        ),
        decisions:board_decisions(
          id,
          decision_title,
          decision_type,
          decision_status
        )
      `)
      .eq('id', meetingId)
      .eq('is_deleted', false)
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error fetching board meeting:', error);
    throw error;
  }
}

/**
 * Create a board meeting
 * @param {Object} meetingData - Meeting data
 * @returns {Promise<Object>} Created meeting
 */
export async function createBoardMeeting(meetingData) {
  try {
    const { data, error } = await supabase
      .from('board_meetings')
      .insert(meetingData)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error creating board meeting:', error);
    throw error;
  }
}

/**
 * Update a board meeting
 * @param {string} meetingId - Meeting ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated meeting
 */
export async function updateBoardMeeting(meetingId, updates) {
  try {
    const { data, error } = await supabase
      .from('board_meetings')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', meetingId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error updating board meeting:', error);
    throw error;
  }
}

/**
 * Delete a board meeting (soft delete)
 * @param {string} meetingId - Meeting ID
 * @returns {Promise<void>}
 */
export async function deleteBoardMeeting(meetingId) {
  try {
    const { error } = await supabase
      .from('board_meetings')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString()
      })
      .eq('id', meetingId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting board meeting:', error);
    throw error;
  }
}

// ===========================
// MEETING ATTENDEES
// ===========================

/**
 * Record meeting attendance
 * @param {Object} attendanceData - Attendance data
 * @returns {Promise<Object>} Created attendance record
 */
export async function recordMeetingAttendance(attendanceData) {
  try {
    const { data, error } = await supabase
      .from('board_meeting_attendees')
      .insert(attendanceData)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error recording meeting attendance:', error);
    throw error;
  }
}

/**
 * Update meeting attendance
 * @param {string} attendanceId - Attendance ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated attendance record
 */
export async function updateMeetingAttendance(attendanceId, updates) {
  try {
    const { data, error } = await supabase
      .from('board_meeting_attendees')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', attendanceId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error updating meeting attendance:', error);
    throw error;
  }
}

// ===========================
// PROJECT AUTHORIZATIONS
// ===========================

/**
 * Fetch project authorizations
 * @param {string} projectId - Project ID
 * @returns {Promise<Array>} Array of authorizations
 */
export async function fetchProjectAuthorizations(projectId) {
  try {
    const { data, error } = await supabase
      .from('project_authorizations')
      .select(`
        *,
        project:projects(id, project_name),
        board_meeting:board_meetings(id, meeting_date, meeting_type)
      `)
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .order('authorization_date', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching project authorizations:', error);
    throw error;
  }
}

/**
 * Create a project authorization
 * @param {Object} authData - Authorization data
 * @returns {Promise<Object>} Created authorization
 */
export async function createProjectAuthorization(authData) {
  try {
    const { data, error } = await supabase
      .from('project_authorizations')
      .insert(authData)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error creating project authorization:', error);
    throw error;
  }
}

/**
 * Update a project authorization
 * @param {string} authId - Authorization ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated authorization
 */
export async function updateProjectAuthorization(authId, updates) {
  try {
    const { data, error } = await supabase
      .from('project_authorizations')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', authId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error updating project authorization:', error);
    throw error;
  }
}

// ===========================
// AD HOC DIRECTION
// ===========================

/**
 * Fetch ad hoc directions
 * @param {string} projectId - Project ID
 * @returns {Promise<Array>} Array of ad hoc directions
 */
export async function fetchAdHocDirections(projectId) {
  try {
    const { data, error } = await supabase
      .from('ad_hoc_direction')
      .select(`
        *,
        project:projects(id, project_name),
        requested_by_user:users!ad_hoc_direction_requested_by_fkey(full_name, email)
      `)
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .order('request_date', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching ad hoc directions:', error);
    throw error;
  }
}

/**
 * Create an ad hoc direction request
 * @param {Object} directionData - Direction data
 * @returns {Promise<Object>} Created direction
 */
export async function createAdHocDirection(directionData) {
  try {
    const { data, error } = await supabase
      .from('ad_hoc_direction')
      .insert(directionData)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error creating ad hoc direction:', error);
    throw error;
  }
}

/**
 * Update an ad hoc direction
 * @param {string} directionId - Direction ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated direction
 */
export async function updateAdHocDirection(directionId, updates) {
  try {
    const { data, error } = await supabase
      .from('ad_hoc_direction')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', directionId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error updating ad hoc direction:', error);
    throw error;
  }
}

// ===========================
// BOARD DECISIONS
// ===========================

/**
 * Fetch board decisions
 * @param {string} meetingId - Meeting ID (optional)
 * @param {string} projectId - Project ID (optional)
 * @returns {Promise<Array>} Array of board decisions
 */
export async function fetchBoardDecisions(meetingId = null, projectId = null) {
  try {
    let query = supabase
      .from('board_decisions')
      .select(`
        *,
        board_meeting:board_meetings(
          id,
          meeting_date,
          meeting_type,
          board:project_boards(id, board_name, project_id)
        )
      `)
      .eq('is_deleted', false)
      .order('decision_date', { ascending: false });

    if (meetingId) {
      query = query.eq('board_meeting_id', meetingId);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Filter by project_id if provided
    if (projectId && data) {
      return data.filter(decision =>
        decision.board_meeting?.board?.project_id === projectId
      );
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching board decisions:', error);
    throw error;
  }
}

/**
 * Create a board decision
 * @param {Object} decisionData - Decision data
 * @returns {Promise<Object>} Created decision
 */
export async function createBoardDecision(decisionData) {
  try {
    const { data, error } = await supabase
      .from('board_decisions')
      .insert(decisionData)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error creating board decision:', error);
    throw error;
  }
}

/**
 * Update a board decision
 * @param {string} decisionId - Decision ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated decision
 */
export async function updateBoardDecision(decisionId, updates) {
  try {
    const { data, error } = await supabase
      .from('board_decisions')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', decisionId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error updating board decision:', error);
    throw error;
  }
}

/**
 * Delete a board decision (soft delete)
 * @param {string} decisionId - Decision ID
 * @returns {Promise<void>}
 */
export async function deleteBoardDecision(decisionId) {
  try {
    const { error } = await supabase
      .from('board_decisions')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString()
      })
      .eq('id', decisionId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting board decision:', error);
    throw error;
  }
}

// ===========================
// DASHBOARD & ANALYTICS
// ===========================

/**
 * Get board dashboard statistics
 * @param {string} boardId - Board ID
 * @returns {Promise<Object>} Dashboard statistics
 */
export async function getBoardDashboardStats(boardId) {
  try {
    // Fetch all relevant data in parallel
    const [
      membersResult,
      meetingsResult,
      decisionsResult,
      authorizationsResult
    ] = await Promise.all([
      supabase
        .from('board_members')
        .select('id, is_active')
        .eq('board_id', boardId)
        .eq('is_deleted', false),
      supabase
        .from('board_meetings')
        .select('id, meeting_status')
        .eq('board_id', boardId)
        .eq('is_deleted', false),
      supabase
        .from('board_decisions')
        .select('id, decision_status, board_meeting:board_meetings!inner(board_id)')
        .eq('board_meeting.board_id', boardId)
        .eq('is_deleted', false),
      supabase
        .from('project_authorizations')
        .select('id, authorization_status, board_meeting:board_meetings!inner(board_id)')
        .eq('board_meeting.board_id', boardId)
        .eq('is_deleted', false)
    ]);

    if (membersResult.error) throw membersResult.error;
    if (meetingsResult.error) throw meetingsResult.error;
    if (decisionsResult.error) throw decisionsResult.error;
    if (authorizationsResult.error) throw authorizationsResult.error;

    const members = membersResult.data || [];
    const meetings = meetingsResult.data || [];
    const decisions = decisionsResult.data || [];
    const authorizations = authorizationsResult.data || [];

    return {
      totalMembers: members.length,
      activeMembers: members.filter(m => m.is_active).length,
      totalMeetings: meetings.length,
      upcomingMeetings: meetings.filter(m => m.meeting_status === 'Scheduled').length,
      totalDecisions: decisions.length,
      pendingDecisions: decisions.filter(d => d.decision_status === 'Pending').length,
      totalAuthorizations: authorizations.length,
      activeAuthorizations: authorizations.filter(a => a.authorization_status === 'Active').length
    };
  } catch (error) {
    console.error('Error fetching board dashboard stats:', error);
    throw error;
  }
}

export default {
  // Project Boards
  fetchProjectBoards,
  fetchProjectBoard,
  createProjectBoard,
  updateProjectBoard,
  deleteProjectBoard,

  // Board Members
  fetchBoardMembers,
  addBoardMember,
  updateBoardMember,
  removeBoardMember,

  // Board Meetings
  fetchBoardMeetings,
  fetchBoardMeeting,
  createBoardMeeting,
  updateBoardMeeting,
  deleteBoardMeeting,

  // Meeting Attendees
  recordMeetingAttendance,
  updateMeetingAttendance,

  // Project Authorizations
  fetchProjectAuthorizations,
  createProjectAuthorization,
  updateProjectAuthorization,

  // Ad Hoc Direction
  fetchAdHocDirections,
  createAdHocDirection,
  updateAdHocDirection,

  // Board Decisions
  fetchBoardDecisions,
  createBoardDecision,
  updateBoardDecision,
  deleteBoardDecision,

  // Dashboard
  getBoardDashboardStats
};
