/**
 * Risk Management Strategy Service
 * API functions for RMS management
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * Create a new Risk Management Strategy
 * @param {string} projectId - Project ID
 * @param {Object} rmsData - RMS data
 * @returns {Promise<Object>} Created RMS
 */
export async function createRMS(projectId, rmsData) {
  try {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: userData, error: userError } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (userError || !userData) {
      return { success: false, error: 'User not found' };
    }

    const insertData = {
      ...rmsData,
      project_id: projectId,
      created_by: userData.id,
      updated_by: userData.id,
      status: rmsData.status || 'draft'
    };

    const { data, error } = await platformDb
      .from('risk_management_strategies')
      .insert(insertData)
      .select(`
        *,
        author:author_id(id, full_name, email),
        owner:owner_id(id, full_name, email),
        client:client_id(id, full_name, email),
        project:project_id(id, project_name, project_code),
        approved_by_user:approved_by(id, full_name, email)
      `)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error creating RMS:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create RMS from template
 * @param {string} projectId - Project ID
 * @param {string} templateId - Template ID
 * @returns {Promise<Object>} Created RMS
 */
export async function createRMSFromTemplate(projectId, templateId) {
  try {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: userData, error: userError } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (userError || !userData) {
      return { success: false, error: 'User not found' };
    }

    // Call database function
    const { data: rmsId, error } = await platformDb.rpc('create_rms_from_template', {
      p_project_id: projectId,
      p_template_id: templateId,
      p_user_id: userData.id
    });

    if (error) throw error;

    // Fetch the created RMS
    return await getRMSByProject(projectId);
  } catch (error) {
    console.error('Error creating RMS from template:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create RMS for Project (with defaults)
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Created RMS
 */
export async function createRMSForProject(projectId) {
  try {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: userData, error: userError } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (userError || !userData) {
      return { success: false, error: 'User not found' };
    }

    // Call database function
    const { data: rmsId, error } = await platformDb.rpc('create_rms_for_project', {
      p_project_id: projectId,
      p_user_id: userData.id
    });

    if (error) throw error;

    // Fetch the created RMS
    return await getRMSById(rmsId);
  } catch (error) {
    console.error('Error creating RMS for project:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get RMS by ID
 * @param {string} rmsId - RMS ID
 * @returns {Promise<Object>} RMS object
 */
export async function getRMSById(rmsId) {
  try {
    const { data, error } = await platformDb
      .from('risk_management_strategies')
      .select(`
        *,
        author:author_id(id, full_name, email),
        owner:owner_id(id, full_name, email),
        client:client_id(id, full_name, email),
        project:project_id(id, project_name, project_code),
        approved_by_user:approved_by(id, full_name, email)
      `)
      .eq('id', rmsId)
      .eq('is_deleted', false)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: true, data: null };
      }
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching RMS:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get RMS by Project ID
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} RMS object or null
 */
export async function getRMSByProject(projectId) {
  try {
    const { data, error } = await platformDb
      .from('risk_management_strategies')
      .select(`
        *,
        author:author_id(id, full_name, email),
        owner:owner_id(id, full_name, email),
        client:client_id(id, full_name, email),
        project:project_id(id, project_name, project_code),
        approved_by_user:approved_by(id, full_name, email)
      `)
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching RMS by project:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update RMS
 * @param {string} rmsId - RMS ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated RMS
 */
export async function updateRMS(rmsId, updates) {
  try {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: userData, error: userError } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (userError || !userData) {
      return { success: false, error: 'User not found' };
    }

    const updateData = {
      ...updates,
      updated_by: userData.id,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await platformDb
      .from('risk_management_strategies')
      .update(updateData)
      .eq('id', rmsId)
      .select(`
        *,
        author:author_id(id, full_name, email),
        owner:owner_id(id, full_name, email),
        client:client_id(id, full_name, email),
        project:project_id(id, project_name, project_code),
        approved_by_user:approved_by(id, full_name, email)
      `)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating RMS:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete RMS (soft delete, only if draft)
 * @param {string} rmsId - RMS ID
 * @returns {Promise<Object>} Success result
 */
export async function deleteRMS(rmsId) {
  try {
    // Check if draft
    const result = await getRMSById(rmsId);
    if (!result.success || !result.data) {
      return { success: false, error: 'RMS not found' };
    }

    if (result.data.status !== 'draft') {
      return { success: false, error: 'Can only delete RMS in draft status' };
    }

    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: userData, error: userError } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (userError || !userData) {
      return { success: false, error: 'User not found' };
    }

    const { error } = await platformDb
      .from('risk_management_strategies')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userData.id
      })
      .eq('id', rmsId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting RMS:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Submit RMS for approval
 * @param {string} rmsId - RMS ID
 * @param {Array<string>} approverIds - Array of approver user IDs
 * @returns {Promise<Object>} Updated RMS
 */
export async function submitForApproval(rmsId, approverIds = []) {
  try {
    // Update status
    const updated = await updateRMS(rmsId, {
      status: 'under_review'
    });

    if (!updated.success) {
      return updated;
    }

    // Create approval records for each approver
    if (approverIds.length > 0) {
      const { data: { user } } = await platformDb.auth.getUser();
      
      const { data: userData } = await platformDb
        .from('users')
        .select('id, full_name')
        .eq('auth_user_id', user.id)
        .eq('is_deleted', false)
        .single();

      // Fetch approver names
      const { data: approvers } = await platformDb
        .from('users')
        .select('id, full_name')
        .in('id', approverIds)
        .eq('is_deleted', false);

      const approvals = approverIds.map((approverId) => {
        const approver = approvers?.find(a => a.id === approverId);
        return {
          rms_id: rmsId,
          approver_id: approverId,
          approver_name: approver?.full_name || '',
          approval_status: 'pending',
          version_approved: updated.data.version_number,
          created_at: new Date().toISOString()
        };
      });

      const { error } = await platformDb
        .from('rms_approvals')
        .insert(approvals);

      if (error) throw error;
    }

    return updated;
  } catch (error) {
    console.error('Error submitting RMS for approval:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Approve RMS
 * @param {string} approvalId - Approval record ID
 * @param {string} approverId - Approver user ID
 * @param {string} comments - Approval comments
 * @returns {Promise<Object>} Updated RMS
 */
export async function approveRMS(approvalId, approverId, comments = null) {
  try {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: userData, error: userError } = await platformDb
      .from('users')
      .select('id, full_name')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (userError || !userData) {
      return { success: false, error: 'User not found' };
    }

    // Update approval record
    const { data: approval, error: approvalError } = await platformDb
      .from('rms_approvals')
      .update({
        approval_status: 'approved',
        approval_date: new Date().toISOString().split('T')[0],
        comments: comments,
        updated_at: new Date().toISOString()
      })
      .eq('id', approvalId)
      .select('rms_id, version_approved')
      .single();

    if (approvalError) throw approvalError;

    // Check if all approvals are complete
    const { data: allApprovals } = await platformDb
      .from('rms_approvals')
      .select('approval_status')
      .eq('rms_id', approval.rms_id)
      .eq('is_deleted', false);

    const allApproved = allApprovals?.every(a => a.approval_status === 'approved') || false;

    // If all approved, update RMS status
    if (allApproved) {
      return await updateRMS(approval.rms_id, {
        status: 'approved',
        approved_date: new Date().toISOString().split('T')[0],
        approved_by: userData.id
      });
    }

    return await getRMSById(approval.rms_id);
  } catch (error) {
    console.error('Error approving RMS:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Validate RMS completeness
 * @param {string} rmsId - RMS ID
 * @returns {Promise<Object>} Validation results
 */
export async function validateCompleteness(rmsId) {
  try {
    const { data, error } = await platformDb.rpc('validate_rms_completeness', {
      p_rms_id: rmsId
    });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error validating RMS completeness:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check RMS conformance
 * @param {string} rmsId - RMS ID
 * @returns {Promise<Object>} Conformance results
 */
export async function checkConformance(rmsId) {
  try {
    const { data, error } = await platformDb.rpc('check_rms_conformance', {
      p_rms_id: rmsId
    });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error checking RMS conformance:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Apply RMS configuration to Risk Register
 * @param {string} rmsId - RMS ID
 * @param {string} riskRegisterId - Risk Register ID
 * @returns {Promise<Object>} Success result
 */
export async function applyToRiskRegister(rmsId, riskRegisterId) {
  try {
    const { error } = await platformDb.rpc('apply_rms_to_risk_register', {
      p_rms_id: rmsId,
      p_risk_register_id: riskRegisterId
    });

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error applying RMS to Risk Register:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get revision history for RMS
 * @param {string} rmsId - RMS ID
 * @returns {Promise<Object>} Revision history
 */
export async function getRevisionHistory(rmsId) {
  try {
    const { data, error } = await platformDb
      .from('rms_revision_history')
      .select(`
        *,
        revised_by_user:revised_by(id, full_name, email)
      `)
      .eq('rms_id', rmsId)
      .order('revision_date', { ascending: false });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching revision history:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Add revision to RMS
 * @param {string} rmsId - RMS ID
 * @param {string} summaryOfChanges - Summary of changes
 * @param {string} changesMarked - Tracked changes
 * @param {string} changeRequestId - Change request ID (optional)
 * @returns {Promise<Object>} Created revision
 */
export async function addRevision(rmsId, summaryOfChanges, changesMarked = null, changeRequestId = null) {
  try {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: userData, error: userError } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (userError || !userData) {
      return { success: false, error: 'User not found' };
    }

    // Get previous revision date
    const { data: previousRevision } = await platformDb
      .from('rms_revision_history')
      .select('revision_date')
      .eq('rms_id', rmsId)
      .order('revision_date', { ascending: false })
      .limit(1)
      .single();

    const { data, error } = await platformDb
      .from('rms_revision_history')
      .insert({
        rms_id: rmsId,
        revision_date: new Date().toISOString().split('T')[0],
        previous_revision_date: previousRevision?.revision_date || null,
        summary_of_changes: summaryOfChanges,
        changes_marked: changesMarked,
        revised_by: userData.id,
        change_request_id: changeRequestId
      })
      .select(`
        *,
        revised_by_user:revised_by(id, full_name, email)
      `)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error adding revision:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get scheduled risk activities for a project
 * @param {string} projectId - Project ID
 * @param {Date} dateFrom - Start date (optional)
 * @param {Date} dateTo - End date (optional)
 * @returns {Promise<Object>} Scheduled activities
 */
export async function getScheduledRiskActivities(projectId, dateFrom = null, dateTo = null) {
  try {
    const { data, error } = await platformDb.rpc('get_scheduled_risk_activities', {
      p_project_id: projectId,
      p_date_from: dateFrom ? dateFrom.toISOString().split('T')[0] : null,
      p_date_to: dateTo ? dateTo.toISOString().split('T')[0] : null
    });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching scheduled risk activities:', error);
    return { success: false, error: error.message };
  }
}
