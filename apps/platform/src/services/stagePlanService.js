/**
 * Stage Plan Service
 * API functions for Stage Plan management
 * Handles CRUD operations for Stage Plans
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * Create a new Stage Plan
 * @param {string} projectId - Project ID
 * @param {number} stageNumber - Stage number
 * @param {Object} planData - Plan data
 * @returns {Promise<Object>} Created plan
 */
export async function createStagePlan(projectId, stageNumber, planData) {
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

    // Check if plan already exists for this stage
    const { data: existingPlan } = await platformDb
      .from('stage_plans')
      .select('id')
      .eq('project_id', projectId)
      .eq('stage_number', stageNumber)
      .eq('is_deleted', false)
      .single();

    if (existingPlan) {
      return { success: false, error: `A Stage Plan already exists for Stage ${stageNumber}` };
    }

    // Ensure project_plan_id is provided
    if (!planData.project_plan_id) {
      return { success: false, error: 'Project Plan ID is required' };
    }

    const insertData = {
      ...planData,
      project_id: projectId,
      stage_number: stageNumber,
      author_id: planData.author_id || userData.id,
      owner_id: planData.owner_id || userData.id,
      created_by: userData.id,
      updated_by: userData.id,
      status: planData.status || 'draft',
      version_number: planData.version_number || '1.0'
    };

    const { data, error } = await platformDb
      .from('stage_plans')
      .insert(insertData)
      .select(`
        *,
        author:author_id(id, full_name, email),
        owner:owner_id(id, full_name, email),
        approved_by_user:approved_by(id, full_name, email),
        project:project_id(id, project_name, project_code),
        project_plan:project_plan_id(id, plan_reference),
        stage_boundary:stage_boundary_id(id, stage_name),
        project_phase:project_phase_id(id, phase_name)
      `)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error creating stage plan:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create Stage Plan from Project Plan
 * @param {string} projectPlanId - Project Plan ID
 * @param {number} stageNumber - Stage number
 * @param {string} stageName - Stage name
 * @returns {Promise<Object>} Created plan
 */
export async function createStagePlanFromProjectPlan(projectPlanId, stageNumber, stageName) {
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

    // Use database function to create stage plan
    const { data: stagePlanId, error } = await platformDb.rpc(
      'create_stage_plan_from_project_plan',
      {
        p_project_plan_id: projectPlanId,
        p_stage_number: stageNumber,
        p_stage_name: stageName
      }
    );

    if (error) throw error;

    // Get the created plan
    return await getStagePlanById(stagePlanId);
  } catch (error) {
    console.error('Error creating stage plan from project plan:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get Stage Plan by ID
 * @param {string} planId - Plan ID
 * @returns {Promise<Object>} Stage Plan
 */
export async function getStagePlanById(planId) {
  try {
    const { data, error } = await platformDb
      .from('stage_plans')
      .select(`
        *,
        author:author_id(id, full_name, email),
        owner:owner_id(id, full_name, email),
        approved_by_user:approved_by(id, full_name, email),
        project:project_id(id, project_name, project_code),
        project_plan:project_plan_id(id, plan_reference),
        stage_boundary:stage_boundary_id(id, stage_name),
        project_phase:project_phase_id(id, phase_name)
      `)
      .eq('id', planId)
      .eq('is_deleted', false)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error getting stage plan:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get Stage Plans by Project
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Stage Plans
 */
export async function getStagePlansByProject(projectId) {
  try {
    const { data, error } = await platformDb
      .from('stage_plans')
      .select(`
        *,
        author:author_id(id, full_name, email),
        owner:owner_id(id, full_name, email),
        project:project_id(id, project_name, project_code),
        project_plan:project_plan_id(id, plan_reference),
        stage_boundary:stage_boundary_id(id, stage_name)
      `)
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .order('stage_number', { ascending: true });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error getting stage plans by project:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get Stage Plan by Stage Boundary
 * @param {string} stageBoundaryId - Stage Boundary ID
 * @returns {Promise<Object>} Stage Plan
 */
export async function getStagePlanByStage(stageBoundaryId) {
  try {
    const { data, error } = await platformDb
      .from('stage_plans')
      .select(`
        *,
        author:author_id(id, full_name, email),
        owner:owner_id(id, full_name, email),
        project:project_id(id, project_name, project_code),
        project_plan:project_plan_id(id, plan_reference),
        stage_boundary:stage_boundary_id(id, stage_name)
      `)
      .eq('stage_boundary_id', stageBoundaryId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error getting stage plan by stage:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update Stage Plan
 * @param {string} planId - Plan ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated plan
 */
export async function updateStagePlan(planId, updates) {
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
      .from('stage_plans')
      .update(updateData)
      .eq('id', planId)
      .eq('is_deleted', false)
      .select(`
        *,
        author:author_id(id, full_name, email),
        owner:owner_id(id, full_name, email),
        project:project_id(id, project_name, project_code)
      `)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating stage plan:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete Stage Plan (soft delete - only drafts)
 * @param {string} planId - Plan ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteStagePlan(planId) {
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
      .from('stage_plans')
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
      .from('stage_plans')
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
    console.error('Error deleting stage plan:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Submit Stage Plan for Approval
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
      .from('stage_plans')
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
        plan_type: 'stage_plan',
        plan_id: planId,
        approver_id: approverId,
        approver_name: '',
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
    console.error('Error submitting stage plan for approval:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Approve Stage Plan
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
        .from('stage_plans')
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
    console.error('Error approving stage plan:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Set Stage Plan as Baseline
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
      .from('stage_plans')
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
      .from('stage_plans')
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
    console.error('Error setting stage plan as baseline:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Validate Stage Plan Completeness
 * @param {string} planId - Plan ID
 * @returns {Promise<Object>} Validation result
 */
export async function validateCompleteness(planId) {
  try {
    const { data, error } = await platformDb.rpc(
      'validate_plan_completeness',
      {
        p_plan_id: planId,
        p_plan_type: 'stage_plan'
      }
    );

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error validating stage plan completeness:', error);
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
        p_plan_type: 'stage_plan'
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
 * Calculate Variance (planned vs actual)
 * @param {string} planId - Plan ID
 * @returns {Promise<Object>} Variance analysis
 */
export async function calculateVariance(planId) {
  try {
    const { data, error } = await platformDb.rpc(
      'calculate_plan_variance',
      {
        p_stage_plan_id: planId
      }
    );

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error calculating variance:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get Variance Report
 * @param {string} planId - Plan ID
 * @returns {Promise<Object>} Variance report
 */
export async function getVarianceReport(planId) {
  try {
    // Get plan details
    const planResult = await getStagePlanById(planId);
    if (!planResult.success) {
      return planResult;
    }

    const plan = planResult.data;

    // Only calculate if stage is completed
    if (plan.status !== 'completed' || !plan.actual_start_date || !plan.actual_end_date) {
      return { success: true, data: null, message: 'Stage plan must be completed to calculate variance' };
    }

    // Calculate variance
    const varianceResult = await calculateVariance(planId);
    if (!varianceResult.success) {
      return varianceResult;
    }

    return {
      success: true,
      data: {
        plan: plan,
        variance: varianceResult.data
      }
    };
  } catch (error) {
    console.error('Error getting variance report:', error);
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
      .eq('plan_type', 'stage_plan')
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
      .from('stage_plans')
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
      .eq('plan_type', 'stage_plan')
      .eq('plan_id', planId)
      .order('revision_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Calculate new version
    const currentVersion = plan.version_number || '1.0';
    const versionParts = currentVersion.split('.');
    const newVersion = `${versionParts[0]}.${parseInt(versionParts[1] || 0) + 1}`;

    const revisionData = {
      plan_type: 'stage_plan',
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
      .from('stage_plans')
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
