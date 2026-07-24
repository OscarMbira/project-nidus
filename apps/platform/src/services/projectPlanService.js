/**
 * Project Plan Service
 * API functions for Project Plan management
 * Handles CRUD operations for Project Plans
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * Create a new Project Plan
 * @param {string} projectId - Project ID
 * @param {Object} planData - Plan data
 * @returns {Promise<Object>} Created plan
 */
export async function createProjectPlan(projectId, planData) {
  try {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: userData, error: userError } = await platformDb
      .from('users')
      .select('id, full_name, email')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (userError || !userData) {
      return { success: false, error: 'User not found' };
    }

    // Check if plan already exists for this project
    const { data: existingPlan } = await platformDb
      .from('project_plans')
      .select('id')
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .single();

    if (existingPlan) {
      return { success: false, error: 'A Project Plan already exists for this project' };
    }

    const insertData = {
      ...planData,
      project_id: projectId,
      author_id: planData.author_id || userData.id,
      owner_id: planData.owner_id || userData.id,
      created_by: userData.id,
      updated_by: userData.id,
      status: planData.status || 'draft',
      version_number: planData.version_number || '1.0'
    };

    const { data, error } = await platformDb
      .from('project_plans')
      .insert(insertData)
      .select(`
        *,
        author:author_id(id, full_name, email),
        owner:owner_id(id, full_name, email),
        approved_by_user:approved_by(id, full_name, email),
        project:project_id(id, project_name, project_code),
        pid:pid_id(id, pid_reference),
        business_case:business_case_id(id, bc_reference),
        ppd:project_product_description_id(id, ppd_reference)
      `)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error creating project plan:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create Project Plan from PID
 * @param {string} pidId - PID ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Created plan
 */
export async function createProjectPlanFromPID(pidId, userId) {
  try {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Get PID details
    const { data: pid, error: pidError } = await platformDb
      .from('project_initiation_documents')
      .select('*')
      .eq('id', pidId)
      .eq('is_deleted', false)
      .single();

    if (pidError || !pid) {
      return { success: false, error: 'PID not found' };
    }

    // Check if plan already exists
    const { data: existingPlan } = await platformDb
      .from('project_plans')
      .select('id')
      .eq('project_id', pid.project_id)
      .eq('is_deleted', false)
      .single();

    if (existingPlan) {
      return { success: false, error: 'A Project Plan already exists for this project' };
    }

    // Create plan from PID with defaults
    const planData = {
      project_id: pid.project_id,
      pid_id: pidId,
      business_case_id: pid.business_case_id,
      project_product_description_id: pid.project_product_description_id,
      quality_management_strategy_id: pid.quality_management_strategy_id,
      risk_management_strategy_id: pid.risk_management_strategy_id,
      configuration_management_strategy_id: pid.configuration_management_strategy_id,
      communication_management_strategy_id: pid.communication_management_strategy_id,
      plan_title: `Project Plan: ${pid.pid_title || 'Untitled Project'}`,
      plan_description: `Project Plan created from PID: ${pid.pid_reference || ''}`,
      plan_purpose: pid.project_definition || 'To deliver the project objectives',
      plan_scope: pid.project_scope || 'Full project scope as defined in PID',
      planning_approach: pid.project_approach,
      planned_start_date: pid.project_start_date || new Date().toISOString().split('T')[0],
      planned_end_date: pid.project_end_date || new Date().toISOString().split('T')[0],
      author_id: pid.author_id || userId,
      owner_id: pid.project_manager_user_id || userId,
      status: 'draft'
    };

    return await createProjectPlan(pid.project_id, planData);
  } catch (error) {
    console.error('Error creating project plan from PID:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get Project Plan by ID
 * @param {string} planId - Plan ID
 * @returns {Promise<Object>} Project Plan
 */
export async function getProjectPlanById(planId) {
  try {
    const { data, error } = await platformDb
      .from('project_plans')
      .select(`
        *,
        author:author_id(id, full_name, email),
        owner:owner_id(id, full_name, email),
        approved_by_user:approved_by(id, full_name, email),
        project:project_id(id, project_name, project_code),
        pid:pid_id(id, pid_reference),
        business_case:business_case_id(id, bc_reference),
        ppd:project_product_description_id(id, ppd_reference),
        qms:quality_management_strategy_id(id, qms_reference),
        rms:risk_management_strategy_id(id, rms_reference),
        cms:configuration_management_strategy_id(id, cms_reference),
        cms_com:communication_management_strategy_id(id, cms_com_reference)
      `)
      .eq('id', planId)
      .eq('is_deleted', false)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error getting project plan:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get Project Plan by Project
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Project Plan
 */
export async function getProjectPlanByProject(projectId) {
  try {
    const { data, error } = await platformDb
      .from('project_plans')
      .select(`
        *,
        author:author_id(id, full_name, email),
        owner:owner_id(id, full_name, email),
        approved_by_user:approved_by(id, full_name, email),
        project:project_id(id, project_name, project_code),
        pid:pid_id(id, pid_reference),
        business_case:business_case_id(id, bc_reference),
        ppd:project_product_description_id(id, ppd_reference)
      `)
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error getting project plan by project:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update Project Plan
 * @param {string} planId - Plan ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated plan
 */
export async function updateProjectPlan(planId, updates) {
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
      .from('project_plans')
      .update(updateData)
      .eq('id', planId)
      .eq('is_deleted', false)
      .select(`
        *,
        author:author_id(id, full_name, email),
        owner:owner_id(id, full_name, email),
        approved_by_user:approved_by(id, full_name, email),
        project:project_id(id, project_name, project_code)
      `)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating project plan:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete Project Plan (soft delete - only drafts)
 * @param {string} planId - Plan ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteProjectPlan(planId) {
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

    // Check if plan is draft
    const { data: plan } = await platformDb
      .from('project_plans')
      .select('status, is_baseline')
      .eq('id', planId)
      .eq('is_deleted', false)
      .single();

    if (!plan) {
      return { success: false, error: 'Plan not found' };
    }

    if (plan.status !== 'draft' || plan.is_baseline) {
      return { success: false, error: 'Only draft plans that are not baseline can be deleted' };
    }

    const { error } = await platformDb
      .from('project_plans')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userData.id,
        updated_by: userData.id
      })
      .eq('id', planId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting project plan:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Submit Project Plan for Approval
 * @param {string} planId - Plan ID
 * @param {Array<string>} approverIds - Array of approver user IDs
 * @returns {Promise<Object>} Submission result
 */
export async function submitForApproval(planId, approverIds) {
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

    // Update plan status
    const { error: updateError } = await platformDb
      .from('project_plans')
      .update({
        status: 'under_review',
        updated_by: userData.id
      })
      .eq('id', planId)
      .eq('is_deleted', false);

    if (updateError) throw updateError;

    // Create approval records
    if (approverIds && approverIds.length > 0) {
      const approvals = approverIds.map(approverId => ({
        plan_type: 'project_plan',
        plan_id: planId,
        approver_id: approverId,
        approver_name: '', // Will be populated from user data
        approval_status: 'pending',
        version_approved: '1.0',
        created_at: new Date().toISOString()
      }));

      // Get approver names
      const { data: approvers } = await platformDb
        .from('users')
        .select('id, full_name')
        .in('id', approverIds);

      approvals.forEach(approval => {
        const approver = approvers?.find(a => a.id === approval.approver_id);
        if (approver) {
          approval.approver_name = approver.full_name || '';
        }
      });

      const { error: approvalError } = await platformDb
        .from('plan_approvals')
        .insert(approvals);

      if (approvalError) throw approvalError;
    }

    return { success: true };
  } catch (error) {
    console.error('Error submitting plan for approval:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Approve Project Plan
 * @param {string} approvalId - Approval ID
 * @param {string} approverId - Approver user ID
 * @param {string} comments - Approval comments
 * @returns {Promise<Object>} Approval result
 */
export async function approvePlan(approvalId, approverId, comments) {
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

    // Update approval
    const { data: approval, error: approvalError } = await platformDb
      .from('plan_approvals')
      .update({
        approval_status: 'approved',
        approval_date: new Date().toISOString().split('T')[0],
        comments: comments || null
      })
      .eq('id', approvalId)
      .eq('approver_id', approverId)
      .select('plan_type, plan_id')
      .single();

    if (approvalError) throw approvalError;

    // Check if all approvals received
    const { data: approvalStatus } = await platformDb.rpc(
      'check_plan_approval_status',
      {
        p_plan_id: approval.plan_id,
        p_plan_type: approval.plan_type
      }
    );

    if (approvalStatus && approvalStatus.length > 0 && approvalStatus[0].is_approved) {
      // Update plan status to approved
      await platformDb
        .from('project_plans')
        .update({
          status: 'approved',
          approved_date: new Date().toISOString().split('T')[0],
          approved_by: userData.id,
          updated_by: userData.id
        })
        .eq('id', approval.plan_id);
    }

    return { success: true };
  } catch (error) {
    console.error('Error approving plan:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Set Project Plan as Baseline
 * @param {string} planId - Plan ID
 * @returns {Promise<Object>} Baseline result
 */
export async function setAsBaseline(planId) {
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

    // Check if plan is approved
    const { data: plan } = await platformDb
      .from('project_plans')
      .select('status')
      .eq('id', planId)
      .eq('is_deleted', false)
      .single();

    if (!plan) {
      return { success: false, error: 'Plan not found' };
    }

    if (plan.status !== 'approved') {
      return { success: false, error: 'Plan must be approved before setting as baseline' };
    }

    const { error } = await platformDb
      .from('project_plans')
      .update({
        is_baseline: true,
        baseline_date: new Date().toISOString().split('T')[0],
        status: 'baseline',
        updated_by: userData.id
      })
      .eq('id', planId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error setting plan as baseline:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Validate Plan Completeness
 * @param {string} planId - Plan ID
 * @returns {Promise<Object>} Validation result
 */
export async function validateCompleteness(planId) {
  try {
    const { data, error } = await platformDb.rpc(
      'validate_plan_completeness',
      {
        p_plan_id: planId,
        p_plan_type: 'project_plan'
      }
    );

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error validating plan completeness:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check Approval Status
 * @param {string} planId - Plan ID
 * @returns {Promise<Object>} Approval status
 */
export async function checkApprovalStatus(planId) {
  try {
    const { data, error } = await platformDb.rpc(
      'check_plan_approval_status',
      {
        p_plan_id: planId,
        p_plan_type: 'project_plan'
      }
    );

    if (error) throw error;

    return { success: true, data: data?.[0] || null };
  } catch (error) {
    console.error('Error checking approval status:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get Revision History
 * @param {string} planId - Plan ID
 * @returns {Promise<Object>} Revision history
 */
export async function getRevisionHistory(planId) {
  try {
    const { data, error } = await platformDb
      .from('plan_revision_history')
      .select(`
        *,
        revised_by_user:revised_by(id, full_name, email)
      `)
      .eq('plan_type', 'project_plan')
      .eq('plan_id', planId)
      .order('revision_date', { ascending: false });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error getting revision history:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Add Revision
 * @param {string} planId - Plan ID
 * @param {Object} changes - Changes made
 * @param {string} changeRequestId - Change request ID (optional)
 * @returns {Promise<Object>} Revision result
 */
export async function addRevision(planId, changes, changeRequestId = null) {
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

    // Get current plan version
    const { data: plan } = await platformDb
      .from('project_plans')
      .select('version_number')
      .eq('id', planId)
      .eq('is_deleted', false)
      .single();

    if (!plan) {
      return { success: false, error: 'Plan not found' };
    }

    // Get previous revision
    const { data: previousRevision } = await platformDb
      .from('plan_revision_history')
      .select('version_number, revision_date')
      .eq('plan_type', 'project_plan')
      .eq('plan_id', planId)
      .order('revision_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Calculate new version
    const currentVersion = plan.version_number || '1.0';
    const versionParts = currentVersion.split('.');
    const newVersion = `${versionParts[0]}.${parseInt(versionParts[1] || 0) + 1}`;

    const revisionData = {
      plan_type: 'project_plan',
      plan_id: planId,
      revision_date: new Date().toISOString().split('T')[0],
      previous_revision_date: previousRevision?.revision_date || null,
      version_number: newVersion,
      previous_version_number: previousRevision?.version_number || currentVersion,
      summary_of_changes: changes.summary || 'Plan updated',
      changes_marked: changes.marked || null,
      change_reason: changes.reason || null,
      change_request_id: changeRequestId,
      revised_by: userData.id
    };

    const { data, error } = await platformDb
      .from('plan_revision_history')
      .insert(revisionData)
      .select('*')
      .single();

    if (error) throw error;

    // Update plan version
    await platformDb
      .from('project_plans')
      .update({
        version_number: newVersion,
        updated_by: userData.id
      })
      .eq('id', planId);

    return { success: true, data };
  } catch (error) {
    console.error('Error adding revision:', error);
    return { success: false, error: error.message };
  }
}
