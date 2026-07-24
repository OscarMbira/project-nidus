/**
 * Communication Management Strategy Service
 * Provides CRUD and workflow functions for Communication Management Strategy
 */

import { platformDb, supabase } from './supabaseClient';

// ================================================
// MAIN CMS DOCUMENT OPERATIONS
// ================================================

/**
 * Get CMS by Project ID
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} CMS object or null
 */
export async function getCMSByProject(projectId) {
  try {
    const { data, error } = await platformDb
      .from('communication_management_strategies')
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
    console.error('Error fetching CMS by project:', error);
    throw error;
  }
}

/**
 * Get CMS by ID
 * @param {string} cmsId - CMS ID
 * @returns {Promise<Object>} CMS object
 */
export async function getCMSById(cmsId) {
  try {
    const { data, error } = await platformDb
      .from('communication_management_strategies')
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
      .eq('id', cmsId)
      .eq('is_deleted', false)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching CMS by ID:', error);
    throw error;
  }
}

/**
 * Get CMS by project, or create one if none exists
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} CMS object
 */
export async function getOrCreateCMS(projectId) {
  const existing = await getCMSByProject(projectId);
  if (existing) return existing;
  return await createCMSForProject(projectId);
}

/**
 * Create CMS for Project (using database function)
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Created CMS
 */
export async function createCMSForProject(projectId) {
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
    const { data: cmsId, error } = await platformDb.rpc('create_cms_for_project', {
      p_project_id: projectId,
      p_user_id: userRecord.id
    });

    if (error) throw error;

    // Fetch the created CMS
    return await getCMSById(cmsId);
  } catch (error) {
    console.error('Error creating CMS for project:', error);
    throw error;
  }
}

/**
 * Create CMS (manual)
 * @param {string} projectId - Project ID
 * @param {Object} cmsData - CMS data
 * @returns {Promise<Object>} Created CMS
 */
export async function createCMS(projectId, cmsData) {
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
      ...cmsData,
      project_id: projectId,
      created_by: userRecord.id,
      updated_by: userRecord.id,
      status: cmsData.status || 'draft'
    };

    const { data, error } = await platformDb
      .from('communication_management_strategies')
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
    console.error('Error creating CMS:', error);
    throw error;
  }
}

/**
 * Update CMS
 * @param {string} cmsId - CMS ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated CMS
 */
export async function updateCMS(cmsId, updates) {
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
      .from('communication_management_strategies')
      .update(updateData)
      .eq('id', cmsId)
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
    console.error('Error updating CMS:', error);
    throw error;
  }
}

/**
 * Delete CMS (soft delete - only drafts)
 * @param {string} cmsId - CMS ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteCMS(cmsId) {
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

    // Check if CMS is draft (only drafts can be deleted)
    const { data: cms } = await platformDb
      .from('communication_management_strategies')
      .select('status')
      .eq('id', cmsId)
      .single();

    if (cms?.status !== 'draft') {
      throw new Error('Only draft CMS documents can be deleted');
    }

    const { error } = await platformDb
      .from('communication_management_strategies')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userRecord.id
      })
      .eq('id', cmsId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting CMS:', error);
    throw error;
  }
}

/**
 * Submit CMS for Approval
 * @param {string} cmsId - CMS ID
 * @returns {Promise<Object>} Updated CMS
 */
export async function submitForApproval(cmsId) {
  try {
    return await updateCMS(cmsId, { status: 'under_review' });
  } catch (error) {
    console.error('Error submitting CMS for approval:', error);
    throw error;
  }
}

/**
 * Approve CMS
 * @param {string} cmsId - CMS ID
 * @param {string} approverId - Approver user ID
 * @param {string} comments - Approval comments (optional)
 * @returns {Promise<Object>} Updated CMS
 */
export async function approveCMS(cmsId, approverId, comments = null) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Create approval record
    const { error: approvalError } = await platformDb
      .from('cms_approvals')
      .insert({
        cms_id: cmsId,
        approver_id: approverId,
        approval_date: new Date().toISOString().split('T')[0],
        approval_status: 'approved',
        comments: comments,
        version_approved: '1.0' // This should come from CMS version_number
      });

    if (approvalError) throw approvalError;

    // Update CMS status
    return await updateCMS(cmsId, {
      status: 'approved',
      approved_by: approverId,
      approved_date: new Date().toISOString().split('T')[0]
    });
  } catch (error) {
    console.error('Error approving CMS:', error);
    throw error;
  }
}

/**
 * Reject CMS
 * @param {string} cmsId - CMS ID
 * @param {string} approverId - Approver user ID
 * @param {string} reason - Rejection reason
 * @returns {Promise<Object>} Updated CMS
 */
export async function rejectCMS(cmsId, approverId, reason) {
  try {
    // Create approval record
    const { error: approvalError } = await platformDb
      .from('cms_approvals')
      .insert({
        cms_id: cmsId,
        approver_id: approverId,
        approval_date: new Date().toISOString().split('T')[0],
        approval_status: 'rejected',
        comments: reason
      });

    if (approvalError) throw approvalError;

    // Return to draft status
    return await updateCMS(cmsId, { status: 'draft' });
  } catch (error) {
    console.error('Error rejecting CMS:', error);
    throw error;
  }
}

/**
 * Validate CMS Completeness
 * @param {string} cmsId - CMS ID
 * @returns {Promise<Array>} Validation results
 */
export async function validateCompleteness(cmsId) {
  try {
    const { data, error } = await platformDb.rpc('validate_cms_completeness', {
      p_cms_id: cmsId
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error validating CMS completeness:', error);
    throw error;
  }
}

/**
 * Check CMS Conformance
 * @param {string} cmsId - CMS ID
 * @returns {Promise<Array>} Conformance results
 */
export async function checkConformance(cmsId) {
  try {
    const { data, error } = await platformDb.rpc('check_cms_conformance', {
      p_cms_id: cmsId
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error checking CMS conformance:', error);
    throw error;
  }
}

/**
 * Get Scheduled Communication Activities
 * @param {string} projectId - Project ID
 * @param {Date} dateFrom - Start date (optional)
 * @param {Date} dateTo - End date (optional)
 * @returns {Promise<Array>} Scheduled activities
 */
export async function getScheduledActivities(projectId, dateFrom = null, dateTo = null) {
  try {
    const { data, error } = await platformDb.rpc('get_scheduled_communication_activities', {
      p_project_id: projectId,
      p_date_from: dateFrom ? dateFrom.toISOString().split('T')[0] : null,
      p_date_to: dateTo ? dateTo.toISOString().split('T')[0] : null
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching scheduled activities:', error);
    throw error;
  }
}

/**
 * Get Revision History
 * @param {string} cmsId - CMS ID
 * @returns {Promise<Array>} Revision history
 */
export async function getRevisionHistory(cmsId) {
  try {
    const { data, error } = await platformDb
      .from('cms_revision_history')
      .select(`
        *,
        revised_by_user:revised_by(id, full_name, email)
      `)
      .eq('cms_id', cmsId)
      .order('revision_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching revision history:', error);
    throw error;
  }
}

/**
 * Add Revision to CMS
 * @param {string} cmsId - CMS ID
 * @param {Object} revisionData - Revision data
 * @returns {Promise<Object>} Created revision
 */
export async function addRevision(cmsId, revisionData) {
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
      cms_id: cmsId,
      revised_by: userRecord.id,
      revision_date: revisionData.revision_date || new Date().toISOString().split('T')[0]
    };

    const { data, error } = await platformDb
      .from('cms_revision_history')
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
 * Get Approvals for CMS
 * @param {string} cmsId - CMS ID
 * @returns {Promise<Array>} Approval records
 */
export async function getApprovals(cmsId) {
  try {
    const { data, error } = await platformDb
      .from('cms_approvals')
      .select(`
        *,
        approver:approver_id(id, full_name, email)
      `)
      .eq('cms_id', cmsId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching approvals:', error);
    throw error;
  }
}

/**
 * Get Distribution List for CMS
 * @param {string} cmsId - CMS ID
 * @returns {Promise<Array>} Distribution records
 */
export async function getDistribution(cmsId) {
  try {
    const { data, error } = await platformDb
      .from('cms_distribution')
      .select(`
        *,
        recipient:recipient_id(id, full_name, email)
      `)
      .eq('cms_id', cmsId)
      .order('date_of_issue', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching distribution list:', error);
    throw error;
  }
}

/**
 * Link Communication Plan to CMS
 * @param {string} cmsId - CMS ID
 * @param {string} planId - Communication Plan ID
 * @returns {Promise<Object>} Updated communication plan
 */
export async function linkCommunicationPlan(cmsId, planId) {
  try {
    const { data, error } = await platformDb
      .from('communication_plans')
      .update({ cms_id: cmsId })
      .eq('id', planId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error linking communication plan:', error);
    throw error;
  }
}

/**
 * Link Stakeholder Communication to CMS
 * @param {string} cmsId - CMS ID
 * @param {string} communicationId - Stakeholder Communication ID
 * @returns {Promise<Object>} Updated communication
 */
export async function linkStakeholderCommunication(cmsId, communicationId) {
  try {
    const { data, error } = await platformDb
      .from('stakeholder_communications')
      .update({ cms_id: cmsId })
      .eq('id', communicationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error linking stakeholder communication:', error);
    throw error;
  }
}
