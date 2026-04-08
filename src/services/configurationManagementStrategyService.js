/**
 * Configuration Management Strategy Service
 * Provides CRUD and workflow functions for Configuration Management Strategy
 */

import { platformDb, supabase } from './supabaseClient';

// ================================================
// MAIN Configuration MS DOCUMENT OPERATIONS
// ================================================

/**
 * Get Configuration MS by Project ID
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Configuration MS object or null
 */
export async function getConfigurationMSByProject(projectId) {
  try {
    const { data, error } = await platformDb
      .from('configuration_management_strategies')
      .select(`
        *,
        author:author_id(id, full_name, email),
        owner:owner_id(id, full_name, email),
        client:client_id(id, full_name, email),
        project:project_id(id, project_name, project_code),
        approved_by_user:approved_by(id, full_name, email),
        created_by_user:created_by(id, full_name, email),
        updated_by_user:updated_by(id, full_name, email)
      `)
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching Configuration MS by project:', error);
    throw error;
  }
}

/**
 * Get Configuration MS by ID
 * @param {string} cfgMsId - Configuration MS ID
 * @returns {Promise<Object>} Configuration MS object
 */
export async function getConfigurationMSById(cfgMsId) {
  try {
    const { data, error } = await platformDb
      .from('configuration_management_strategies')
      .select(`
        *,
        author:author_id(id, full_name, email),
        owner:owner_id(id, full_name, email),
        client:client_id(id, full_name, email),
        project:project_id(id, project_name, project_code),
        approved_by_user:approved_by(id, full_name, email),
        created_by_user:created_by(id, full_name, email),
        updated_by_user:updated_by(id, full_name, email)
      `)
      .eq('id', cfgMsId)
      .eq('is_deleted', false)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching Configuration MS by ID:', error);
    throw error;
  }
}

/**
 * Create Configuration MS for Project (using database function)
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Created Configuration MS
 */
export async function createConfigurationMSForProject(projectId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: userRecord } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (!userRecord) throw new Error('User record not found');

    // Call database function
    const { data: cfgMsId, error } = await platformDb.rpc('create_cfg_ms_for_project', {
      p_project_id: projectId,
      p_user_id: userRecord.id
    });

    if (error) throw error;

    // Fetch the created Configuration MS
    return await getConfigurationMSById(cfgMsId);
  } catch (error) {
    console.error('Error creating Configuration MS for project:', error);
    throw error;
  }
}

/**
 * Create Configuration MS from Template
 * @param {string} projectId - Project ID
 * @param {string} templateId - Template Configuration MS ID
 * @returns {Promise<Object>} Created Configuration MS
 */
export async function createConfigurationMSFromTemplate(projectId, templateId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: userRecord } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (!userRecord) throw new Error('User record not found');

    // Call database function
    const { data: cfgMsId, error } = await platformDb.rpc('create_cfg_ms_from_template', {
      p_project_id: projectId,
      p_template_id: templateId,
      p_user_id: userRecord.id
    });

    if (error) throw error;

    // Fetch the created Configuration MS
    return await getConfigurationMSById(cfgMsId);
  } catch (error) {
    console.error('Error creating Configuration MS from template:', error);
    throw error;
  }
}

/**
 * Create Configuration MS (manual)
 * @param {string} projectId - Project ID
 * @param {Object} cfgMsData - Configuration MS data
 * @returns {Promise<Object>} Created Configuration MS
 */
export async function createConfigurationMS(projectId, cfgMsData) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: userRecord } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (!userRecord) throw new Error('User record not found');

    const insertData = {
      ...cfgMsData,
      project_id: projectId,
      created_by: userRecord.id,
      updated_by: userRecord.id,
      status: cfgMsData.status || 'draft'
    };

    const { data, error } = await platformDb
      .from('configuration_management_strategies')
      .insert(insertData)
      .select(`
        *,
        author:author_id(id, full_name, email),
        owner:owner_id(id, full_name, email),
        client:client_id(id, full_name, email),
        project:project_id(id, project_name, project_code),
        created_by_user:created_by(id, full_name, email),
        updated_by_user:updated_by(id, full_name, email)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating Configuration MS:', error);
    throw error;
  }
}

/**
 * Update Configuration MS
 * @param {string} cfgMsId - Configuration MS ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated Configuration MS
 */
export async function updateConfigurationMS(cfgMsId, updates) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: userRecord } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (!userRecord) throw new Error('User record not found');

    const updateData = {
      ...updates,
      updated_by: userRecord.id
    };

    const { data, error } = await platformDb
      .from('configuration_management_strategies')
      .update(updateData)
      .eq('id', cfgMsId)
      .select(`
        *,
        author:author_id(id, full_name, email),
        owner:owner_id(id, full_name, email),
        client:client_id(id, full_name, email),
        project:project_id(id, project_name, project_code),
        approved_by_user:approved_by(id, full_name, email),
        created_by_user:created_by(id, full_name, email),
        updated_by_user:updated_by(id, full_name, email)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating Configuration MS:', error);
    throw error;
  }
}

/**
 * Delete Configuration MS (soft delete - only drafts)
 * @param {string} cfgMsId - Configuration MS ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteConfigurationMS(cfgMsId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: userRecord } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (!userRecord) throw new Error('User record not found');

    // Check if Configuration MS is draft (only drafts can be deleted)
    const { data: cfgMs } = await platformDb
      .from('configuration_management_strategies')
      .select('status')
      .eq('id', cfgMsId)
      .single();

    if (cfgMs?.status !== 'draft') {
      throw new Error('Only draft Configuration Management Strategy documents can be deleted');
    }

    const { error } = await platformDb
      .from('configuration_management_strategies')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userRecord.id
      })
      .eq('id', cfgMsId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting Configuration MS:', error);
    throw error;
  }
}

/**
 * Submit Configuration MS for Approval
 * @param {string} cfgMsId - Configuration MS ID
 * @returns {Promise<Object>} Updated Configuration MS
 */
export async function submitForApproval(cfgMsId) {
  try {
    return await updateConfigurationMS(cfgMsId, { status: 'under_review' });
  } catch (error) {
    console.error('Error submitting Configuration MS for approval:', error);
    throw error;
  }
}

/**
 * Approve Configuration MS
 * @param {string} cfgMsId - Configuration MS ID
 * @param {string} approverId - Approver user ID
 * @param {string} comments - Approval comments (optional)
 * @returns {Promise<Object>} Updated Configuration MS
 */
export async function approveConfigurationMS(cfgMsId, approverId, comments = null) {
  try {
    // Get version to approve
    const { data: cfgMs } = await getConfigurationMSById(cfgMsId);

    // Create approval record
    const { error: approvalError } = await platformDb
      .from('cfg_approvals')
      .insert({
        cfg_ms_id: cfgMsId,
        approver_id: approverId,
        approval_date: new Date().toISOString().split('T')[0],
        approval_status: 'approved',
        comments: comments,
        version_approved: cfgMs.version_number || '1.0'
      });

    if (approvalError) throw approvalError;

    // Update Configuration MS status
    return await updateConfigurationMS(cfgMsId, {
      status: 'approved',
      approved_by: approverId,
      approved_date: new Date().toISOString().split('T')[0]
    });
  } catch (error) {
    console.error('Error approving Configuration MS:', error);
    throw error;
  }
}

/**
 * Reject Configuration MS
 * @param {string} cfgMsId - Configuration MS ID
 * @param {string} approverId - Approver user ID
 * @param {string} reason - Rejection reason
 * @returns {Promise<Object>} Updated Configuration MS
 */
export async function rejectConfigurationMS(cfgMsId, approverId, reason) {
  try {
    // Get version
    const { data: cfgMs } = await getConfigurationMSById(cfgMsId);

    // Create approval record
    const { error: approvalError } = await platformDb
      .from('cfg_approvals')
      .insert({
        cfg_ms_id: cfgMsId,
        approver_id: approverId,
        approval_date: new Date().toISOString().split('T')[0],
        approval_status: 'rejected',
        comments: reason,
        version_approved: cfgMs.version_number || '1.0'
      });

    if (approvalError) throw approvalError;

    // Return to draft status
    return await updateConfigurationMS(cfgMsId, { status: 'draft' });
  } catch (error) {
    console.error('Error rejecting Configuration MS:', error);
    throw error;
  }
}

/**
 * Validate Configuration MS Completeness
 * @param {string} cfgMsId - Configuration MS ID
 * @returns {Promise<Array>} Validation results
 */
export async function validateCompleteness(cfgMsId) {
  try {
    const { data, error } = await platformDb.rpc('validate_cfg_ms_completeness', {
      p_cfg_ms_id: cfgMsId
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error validating Configuration MS completeness:', error);
    throw error;
  }
}

/**
 * Check Configuration MS Conformance
 * @param {string} cfgMsId - Configuration MS ID
 * @returns {Promise<Object>} Conformance results with is_conformant flag
 */
export async function checkConformance(cfgMsId) {
  try {
    const { data, error } = await platformDb.rpc('check_cfg_ms_conformance', {
      p_cfg_ms_id: cfgMsId
    });

    if (error) throw error;
    
    const results = data || [];
    const isConformant = results.every(r => r.conformance_status === 'conformant');
    const nonConformances = results
      .filter(r => r.conformance_status !== 'conformant')
      .flatMap(r => r.gaps || []);

    return {
      is_conformant: isConformant,
      results: results,
      non_conformances: nonConformances
    };
  } catch (error) {
    console.error('Error checking Configuration MS conformance:', error);
    throw error;
  }
}

/**
 * Get Scheduled Configuration Activities
 * @param {string} projectId - Project ID
 * @param {Date} dateFrom - Start date (optional)
 * @param {Date} dateTo - End date (optional)
 * @returns {Promise<Array>} Scheduled activities
 */
export async function getScheduledActivities(projectId, dateFrom = null, dateTo = null) {
  try {
    const { data, error } = await platformDb.rpc('get_scheduled_configuration_activities', {
      p_project_id: projectId,
      p_date_from: dateFrom ? dateFrom.toISOString().split('T')[0] : null,
      p_date_to: dateTo ? dateTo.toISOString().split('T')[0] : null
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching scheduled configuration activities:', error);
    throw error;
  }
}

/**
 * Get Revision History
 * @param {string} cfgMsId - Configuration MS ID
 * @returns {Promise<Array>} Revision history
 */
export async function getRevisionHistory(cfgMsId) {
  try {
    const { data, error } = await platformDb
      .from('cfg_revision_history')
      .select(`
        *,
        revised_by_user:revised_by(id, full_name, email)
      `)
      .eq('cfg_ms_id', cfgMsId)
      .order('revision_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching revision history:', error);
    throw error;
  }
}

/**
 * Add Revision to Configuration MS
 * @param {string} cfgMsId - Configuration MS ID
 * @param {Object} revisionData - Revision data
 * @returns {Promise<Object>} Created revision
 */
export async function addRevision(cfgMsId, revisionData) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: userRecord } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (!userRecord) throw new Error('User record not found');

    const insertData = {
      ...revisionData,
      cfg_ms_id: cfgMsId,
      revised_by: userRecord.id,
      revision_date: revisionData.revision_date || new Date().toISOString().split('T')[0]
    };

    const { data, error } = await platformDb
      .from('cfg_revision_history')
      .insert(insertData)
      .select(`
        *,
        revised_by_user:revised_by(id, full_name, email)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding revision:', error);
    throw error;
  }
}

/**
 * Get Approvals for Configuration MS
 * @param {string} cfgMsId - Configuration MS ID
 * @returns {Promise<Array>} Approval records
 */
export async function getApprovals(cfgMsId) {
  try {
    const { data, error } = await platformDb
      .from('cfg_approvals')
      .select(`
        *,
        approver:approver_id(id, full_name, email)
      `)
      .eq('cfg_ms_id', cfgMsId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching approvals:', error);
    throw error;
  }
}

/**
 * Get Distribution List for Configuration MS
 * @param {string} cfgMsId - Configuration MS ID
 * @returns {Promise<Array>} Distribution records
 */
export async function getDistribution(cfgMsId) {
  try {
    const { data, error } = await platformDb
      .from('cfg_distribution')
      .select(`
        *,
        recipient:recipient_id(id, full_name, email)
      `)
      .eq('cfg_ms_id', cfgMsId)
      .order('date_of_issue', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching distribution list:', error);
    throw error;
  }
}
