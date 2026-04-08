import { supabase } from './supabaseClient';
import { validateStatusTransition } from '../utils/issueValidation';

/**
 * Issue Service - API functions for Issue management
 * Handles CRUD operations and filtering for issues
 */

/**
 * Create a new issue
 * @param {string} registerId - Issue Register ID
 * @param {Object} issueData - Issue data
 * @returns {Promise<Object>} Created issue
 */
export async function createIssue(registerId, issueData) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get project_id from register
    const { data: register } = await supabase
      .from('issue_registers')
      .select('project_id')
      .eq('id', registerId)
      .single();

    if (!register) throw new Error('Issue register not found');

    const insertData = {
      ...issueData,
      issue_register_id: registerId,
      project_id: register.project_id,
      created_by: user.id,
      updated_by: user.id,
      reported_by_user_id: issueData.raised_by_id || user.id,
      raised_by_id: issueData.raised_by_id || user.id,
      author_id: issueData.author_id || user.id,
      owner_id: issueData.owner_id || issueData.assigned_to_user_id,
      assigned_to_user_id: issueData.owner_id || issueData.assigned_to_user_id,
      date_raised: issueData.date_raised || new Date().toISOString().split('T')[0],
      status: issueData.status || 'draft'
    };

    const { data, error } = await supabase
      .from('issues')
      .insert(insertData)
      .select(`
        *,
        raised_by:raised_by_id(id, full_name, email),
        author:author_id(id, full_name, email),
        owner:owner_id(id, full_name, email),
        assigned_to:assigned_to_user_id(id, full_name, email),
        reported_by:reported_by_user_id(id, full_name, email)
      `)
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error creating issue:', error);
    throw error;
  }
}

/**
 * Update an issue
 * @param {string} issueId - Issue ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated issue
 */
export async function updateIssue(issueId, updates) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const updateData = {
      ...updates,
      updated_by: user.id
    };

    // Map owner_id to assigned_to_user_id if needed
    if (updates.owner_id !== undefined) {
      updateData.assigned_to_user_id = updates.owner_id;
    }

    const { data, error } = await supabase
      .from('issues')
      .update(updateData)
      .eq('id', issueId)
      .select(`
        *,
        raised_by:raised_by_id(id, full_name, email),
        author:author_id(id, full_name, email),
        owner:owner_id(id, full_name, email),
        assigned_to:assigned_to_user_id(id, full_name, email),
        reported_by:reported_by_user_id(id, full_name, email)
      `)
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error updating issue:', error);
    throw error;
  }
}

/**
 * Delete an issue (soft delete)
 * @param {string} issueId - Issue ID
 * @returns {Promise<void>}
 */
export async function deleteIssue(issueId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('issues')
      .update({
        is_deleted: true,
        deleted_by: user.id,
        deleted_at: new Date().toISOString(),
        updated_by: user.id
      })
      .eq('id', issueId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting issue:', error);
    throw error;
  }
}

/**
 * Get issues for a register with filters
 * @param {string} registerId - Issue Register ID
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} Array of issues
 */
export async function getIssues(registerId, filters = {}) {
  try {
    let query = supabase
      .from('issues')
      .select(`
        *,
        raised_by:raised_by_id(id, full_name, email),
        author:author_id(id, full_name, email),
        owner:owner_id(id, full_name, email),
        assigned_to:assigned_to_user_id(id, full_name, email),
        reported_by:reported_by_user_id(id, full_name, email),
        related_product:related_product_id(id, product_name, product_code)
      `)
      .eq('issue_register_id', registerId)
      .eq('is_deleted', false);

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.issue_type) {
      query = query.eq('issue_type', filters.issue_type);
    }
    if (filters.priority) {
      query = query.eq('priority', filters.priority);
    }
    if (filters.severity) {
      query = query.eq('severity', filters.severity);
    }
    if (filters.owner_id) {
      query = query.eq('owner_id', filters.owner_id);
    }
    if (filters.search) {
      query = query.or(`issue_title.ilike.%${filters.search}%,issue_description.ilike.%${filters.search}%`);
    }

    // Ordering
    const orderBy = filters.orderBy || 'date_raised';
    const orderAsc = filters.orderAsc !== false;
    query = query.order(orderBy, { ascending: orderAsc });

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching issues:', error);
    throw error;
  }
}

/**
 * Get issue by ID
 * @param {string} issueId - Issue ID
 * @returns {Promise<Object>} Issue
 */
export async function getIssueById(issueId) {
  try {
    const { data, error } = await supabase
      .from('issues')
      .select(`
        *,
        raised_by:raised_by_id(id, full_name, email),
        author:author_id(id, full_name, email),
        owner:owner_id(id, full_name, email),
        assigned_to:assigned_to_user_id(id, full_name, email),
        reported_by:reported_by_user_id(id, full_name, email),
        related_product:related_product_id(id, product_name, product_code),
        change_request:change_request_id(id, change_title),
        transferred_to_risk:transferred_to_risk_id(id, risk_title),
        escalated_from_risk:escalated_from_risk_id(id, risk_title)
      `)
      .eq('id', issueId)
      .eq('is_deleted', false)
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error fetching issue:', error);
    throw error;
  }
}

/**
 * Get issues by type
 * @param {string} registerId - Issue Register ID
 * @param {string} type - Issue type (request_for_change, off_specification, problem_concern)
 * @returns {Promise<Array>} Array of issues
 */
export async function getIssuesByType(registerId, type) {
  try {
    const { data, error } = await supabase.rpc('get_issues_by_type', {
      p_issue_register_id: registerId,
      p_type: type
    });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching issues by type:', error);
    throw error;
  }
}

/**
 * Get RFCs (Requests for Change)
 * @param {string} registerId - Issue Register ID
 * @returns {Promise<Array>} Array of RFC issues
 */
export async function getRFCs(registerId) {
  return getIssuesByType(registerId, 'request_for_change');
}

/**
 * Get Off-Specifications
 * @param {string} registerId - Issue Register ID
 * @returns {Promise<Array>} Array of off-spec issues
 */
export async function getOffSpecifications(registerId) {
  return getIssuesByType(registerId, 'off_specification');
}

/**
 * Get Problems and Concerns
 * @param {string} registerId - Issue Register ID
 * @returns {Promise<Array>} Array of problem/concern issues
 */
export async function getProblemsAndConcerns(registerId) {
  return getIssuesByType(registerId, 'problem_concern');
}

/**
 * Get issues by status
 * @param {string} registerId - Issue Register ID
 * @param {string} status - Issue status
 * @returns {Promise<Array>} Array of issues
 */
export async function getIssuesByStatus(registerId, status) {
  return getIssues(registerId, { status });
}

/**
 * Get issues by owner
 * @param {string} registerId - Issue Register ID
 * @param {string} ownerId - Owner user ID
 * @returns {Promise<Array>} Array of issues
 */
export async function getIssuesByOwner(registerId, ownerId) {
  return getIssues(registerId, { owner_id: ownerId });
}

/**
 * Get open issues (not closed or cancelled)
 * @param {string} registerId - Issue Register ID
 * @returns {Promise<Array>} Array of open issues
 */
export async function getOpenIssues(registerId) {
  try {
    const { data, error } = await supabase
      .from('issues')
      .select('*')
      .eq('issue_register_id', registerId)
      .eq('is_deleted', false)
      .not('status', 'in', '(closed,cancelled)')
      .order('date_raised', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching open issues:', error);
    throw error;
  }
}

/**
 * Get critical issues
 * @param {string} registerId - Issue Register ID
 * @returns {Promise<Array>} Array of critical issues
 */
export async function getCriticalIssues(registerId) {
  try {
    const { data, error } = await supabase
      .from('issues')
      .select('*')
      .eq('issue_register_id', registerId)
      .eq('is_deleted', false)
      .or('priority.eq.critical,severity.eq.critical')
      .order('date_raised', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching critical issues:', error);
    throw error;
  }
}

/**
 * Search issues
 * @param {string} registerId - Issue Register ID
 * @param {string} searchTerm - Search term
 * @returns {Promise<Array>} Array of matching issues
 */
export async function searchIssues(registerId, searchTerm) {
  return getIssues(registerId, { search: searchTerm });
}

/**
 * Update issue status
 * @param {string} issueId - Issue ID
 * @param {string} status - New status
 * @param {string} notes - Optional notes
 * @returns {Promise<Object>} Updated issue
 */
export async function updateStatus(issueId, status, notes = null) {
  try {
    // Get current issue to validate transition
    const currentIssue = await getIssueById(issueId);
    
    // Validate status transition
    const transitionValidation = validateStatusTransition(currentIssue.status, status);
    if (!transitionValidation.valid) {
      throw new Error(transitionValidation.message);
    }

    const updates = { status };
    
    if (status === 'closed') {
      updates.closure_date = new Date().toISOString().split('T')[0];
      if (notes) updates.closure_reason = notes;
    }
    if (status === 'resolved') {
      updates.resolution_date = new Date().toISOString().split('T')[0];
      if (notes) updates.resolution_description = notes;
    }

    return await updateIssue(issueId, updates);
  } catch (error) {
    console.error('Error updating issue status:', error);
    throw error;
  }
}

/**
 * Close an issue
 * @param {string} issueId - Issue ID
 * @param {string} resolution - Resolution description
 * @param {string} notes - Optional notes
 * @returns {Promise<Object>} Closed issue
 */
export async function closeIssue(issueId, resolution, notes = null) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    return await updateIssue(issueId, {
      status: 'closed',
      closure_date: new Date().toISOString().split('T')[0],
      closure_reason: notes || resolution,
      resolution_description: resolution,
      resolved_by_id: user.id
    });
  } catch (error) {
    console.error('Error closing issue:', error);
    throw error;
  }
}

/**
 * Reopen an issue
 * @param {string} issueId - Issue ID
 * @param {string} reason - Reason for reopening
 * @returns {Promise<Object>} Reopened issue
 */
export async function reopenIssue(issueId, reason) {
  return await updateIssue(issueId, {
    status: 'raised',
    closure_reason: null,
    closure_date: null
  });
}

/**
 * Get status history for an issue
 * @param {string} issueId - Issue ID
 * @returns {Promise<Array>} Array of status history entries
 */
export async function getStatusHistory(issueId) {
  try {
    const { data, error } = await supabase
      .from('issue_status_history')
      .select(`
        *,
        changed_by_user:changed_by(id, full_name, email)
      `)
      .eq('issue_id', issueId)
      .order('changed_date', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching status history:', error);
    throw error;
  }
}

export default {
  createIssue,
  updateIssue,
  deleteIssue,
  getIssues,
  getIssueById,
  getIssuesByType,
  getRFCs,
  getOffSpecifications,
  getProblemsAndConcerns,
  getIssuesByStatus,
  getIssuesByOwner,
  getOpenIssues,
  getCriticalIssues,
  searchIssues,
  updateStatus,
  closeIssue,
  reopenIssue,
  getStatusHistory
};
