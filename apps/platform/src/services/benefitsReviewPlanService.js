/**
 * Benefits Review Plan Service
 * Provides CRUD and workflow functions for Benefits Review Plans
 */

import { platformDb, supabase } from './supabaseClient';
import { notifyApprovalRequested, notifyApprovalDecision, notifyDistribution } from './benefitsReviewPlanNotificationService';
import { autoLinkBusinessCase, findBusinessCaseDocument, linkBusinessCase, getLinkedBusinessCase, syncBenefitsFromBusinessCase } from './benefitsReviewPlanBusinessCaseService';

// ================================================
// BENEFITS REVIEW PLANS (Main Document)
// ================================================

/**
 * Get all benefits review plans with filters
 */
export async function getBenefitsReviewPlans(filters = {}) {
  let query = platformDb
    .from('benefits_review_plans')
    .select(`
      *,
      project:project_id (
        id,
        project_name,
        project_code
      ),
      programme:programme_id (
        id,
        programme_name,
        programme_code
      ),
      author:author_user_id (id, email, full_name),
      owner:owner_user_id (id, email, full_name)
    `)
    .eq('is_deleted', false);

  if (filters.project_id) {
    query = query.eq('project_id', filters.project_id);
  }

  if (filters.programme_id) {
    query = query.eq('programme_id', filters.programme_id);
  }

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.search) {
    query = query.or(`plan_title.ilike.%${filters.search}%,document_ref.ilike.%${filters.search}%`);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get a single benefits review plan by ID
 */
export async function getBenefitsReviewPlan(planId) {
  const { data, error } = await platformDb
    .from('benefits_review_plans')
    .select(`
      *,
      project:project_id (
        id,
        project_name,
        project_code
      ),
      programme:programme_id (
        id,
        programme_name,
        programme_code
      ),
      author:author_user_id (id, email, full_name),
      owner:owner_user_id (id, email, full_name)
    `)
    .eq('id', planId)
    .eq('is_deleted', false)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create or update a benefits review plan
 */
export async function saveBenefitsReviewPlan(planData, planId = null) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Get user ID from users table
  const { data: userRecord } = await platformDb
    .from('users')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('is_deleted', false)
    .single();

  if (!userRecord) {
    throw new Error('User record not found');
  }

  const updateData = {
    ...planData,
    updated_by: userRecord.id,
  };

  if (planId) {
    const { data, error } = await platformDb
      .from('benefits_review_plans')
      .update(updateData)
      .eq('id', planId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    updateData.created_by = userRecord.id;
    if (!updateData.author_user_id) {
      updateData.author_user_id = userRecord.id;
    }
    
    const { data, error } = await platformDb
      .from('benefits_review_plans')
      .insert(updateData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

/**
 * Delete a benefits review plan (soft delete)
 */
export async function deleteBenefitsReviewPlan(planId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data: userRecord } = await platformDb
    .from('users')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('is_deleted', false)
    .single();

  if (!userRecord) {
    throw new Error('User record not found');
  }

  const { data, error } = await platformDb
    .from('benefits_review_plans')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: userRecord.id,
      updated_by: userRecord.id,
    })
    .eq('id', planId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get or create a review plan for a project
 */
export async function getOrCreatePlanForProject(projectId) {
  // Try to find existing plan
  const { data: existing } = await platformDb
    .from('benefits_review_plans')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .single();

  if (existing) {
    return existing;
  }

  // Create new plan
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data: userRecord } = await platformDb
    .from('users')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('is_deleted', false)
    .single();

  if (!userRecord) {
    throw new Error('User record not found');
  }

  // Get project info
  const { data: project } = await platformDb
    .from('projects')
    .select('project_name')
    .eq('id', projectId)
    .single();

  const newPlanData = {
    project_id: projectId,
    plan_title: `Benefits Review Plan - ${project?.project_name || 'Project'}`,
    plan_date: new Date().toISOString().split('T')[0],
    author_user_id: userRecord.id,
    owner_user_id: userRecord.id,
    status: 'draft',
    version_number: '1.0',
    created_by: userRecord.id,
  };

  const { data, error } = await platformDb
    .from('benefits_review_plans')
    .insert(newPlanData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ================================================
// REVISION HISTORY
// ================================================

/**
 * Get revision history for a review plan
 */
export async function getRevisionHistory(planId) {
  const { data, error } = await platformDb
    .from('benefits_review_plan_revisions')
    .select(`
      *,
      revised_by:revised_by_user_id (id, email, full_name)
    `)
    .eq('review_plan_id', planId)
    .order('revision_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Add a revision to a review plan
 */
export async function addRevision(planId, revisionData) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data: userRecord } = await platformDb
    .from('users')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('is_deleted', false)
    .single();

  if (!userRecord) {
    throw new Error('User record not found');
  }

  // Get current version number
  const { data: plan } = await platformDb
    .from('benefits_review_plans')
    .select('version_number')
    .eq('id', planId)
    .single();

  const revisionNumber = revisionData.revision_number || incrementVersion(plan?.version_number || '1.0');

  const insertData = {
    review_plan_id: planId,
    revision_date: revisionData.revision_date || new Date().toISOString().split('T')[0],
    revision_number: revisionNumber,
    summary_of_changes: revisionData.summary_of_changes,
    changes_marked: revisionData.changes_marked || false,
    revised_by_user_id: userRecord.id,
    created_by: userRecord.id,
  };

  // Update plan version
  await platformDb
    .from('benefits_review_plans')
    .update({ version_number: revisionNumber })
    .eq('id', planId);

  const { data, error } = await platformDb
    .from('benefits_review_plan_revisions')
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

function incrementVersion(version) {
  const parts = version.split('.');
  const minor = parseInt(parts[1] || '0') + 1;
  return `${parts[0]}.${minor}`;
}

// ================================================
// APPROVALS
// ================================================

/**
 * Get approvals for a review plan
 */
export async function getApprovals(planId) {
  const { data, error } = await platformDb
    .from('benefits_review_plan_approvals')
    .select(`
      *,
      approver:approver_user_id (id, email, full_name)
    `)
    .eq('review_plan_id', planId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Request approval for a review plan
 */
export async function requestApproval(planId, approverIds) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data: userRecord } = await platformDb
    .from('users')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('is_deleted', false)
    .single();

  if (!userRecord) {
    throw new Error('User record not found');
  }

  // Get plan version
  const { data: plan } = await platformDb
    .from('benefits_review_plans')
    .select('version_number')
    .eq('id', planId)
    .single();

  // Create approval requests for each approver
  const approvals = await Promise.all(
    approverIds.map(async (approverId) => {
      const { data: approver } = await platformDb
        .from('users')
        .select('id, email, full_name')
        .eq('id', approverId)
        .single();

      const { data, error } = await platformDb
        .from('benefits_review_plan_approvals')
        .insert({
          review_plan_id: planId,
          approver_user_id: approverId,
          approver_name: approver?.full_name || approver?.email,
          approval_status: 'pending',
          version_approved: plan?.version_number,
          created_by: userRecord.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    })
  );

  // Update plan status
  await platformDb
    .from('benefits_review_plans')
    .update({ status: 'pending_approval' })
    .eq('id', planId);

  return approvals;
}

/**
 * Record approval decision
 */
export async function recordApproval(approvalId, status, comments = '') {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data: userRecord } = await platformDb
    .from('users')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('is_deleted', false)
    .single();

  if (!userRecord) {
    throw new Error('User record not found');
  }

  const updateData = {
    approval_status: status,
    comments: comments,
    updated_by: userRecord.id,
  };

  if (status === 'approved') {
    updateData.approval_date = new Date().toISOString().split('T')[0];
  }

  const { data, error } = await platformDb
    .from('benefits_review_plan_approvals')
    .update(updateData)
    .eq('id', approvalId)
    .select()
    .single();

  if (error) throw error;

  // Check if all approvals are now approved
  const { data: approval } = await platformDb
    .from('benefits_review_plan_approvals')
    .select('review_plan_id')
    .eq('id', approvalId)
    .single();

  if (approval) {
    const { data: allApprovals } = await platformDb
      .from('benefits_review_plan_approvals')
      .select('approval_status')
      .eq('review_plan_id', approval.review_plan_id)
      .in('approval_status', ['pending', 'requested_changes']);

    if (!allApprovals || allApprovals.length === 0) {
      // All approvals completed, mark plan as approved
      await platformDb
        .from('benefits_review_plans')
        .update({ status: 'approved' })
        .eq('id', approval.review_plan_id);
    }

    // Send notification about approval decision
    try {
      await notifyApprovalDecision(approval.review_plan_id, approvalId, status, comments);
    } catch (error) {
      console.error('Error sending approval notification:', error);
      // Don't fail the approval if notification fails
    }
  }

  return data;
}

/**
 * Get pending approvals for a user
 */
export async function getMyPendingApprovals(userId) {
  const { data, error } = await platformDb
    .from('benefits_review_plan_approvals')
    .select(`
      *,
      review_plan:benefits_review_plans!inner (
        id,
        plan_title,
        document_ref,
        version_number,
        status,
        project:project_id (
          id,
          project_name,
          project_code
        )
      )
    `)
    .eq('approver_user_id', userId)
    .eq('approval_status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// ================================================
// DISTRIBUTION
// ================================================

/**
 * Get distribution list for a review plan
 */
export async function getDistributionList(planId) {
  const { data, error } = await platformDb
    .from('benefits_review_plan_distribution')
    .select(`
      *,
      recipient:recipient_user_id (id, email, full_name)
    `)
    .eq('review_plan_id', planId)
    .order('date_of_issue', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Add recipient to distribution list
 */
export async function addRecipient(planId, recipientData) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data: userRecord } = await platformDb
    .from('users')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('is_deleted', false)
    .single();

  if (!userRecord) {
    throw new Error('User record not found');
  }

  // Get plan version
  const { data: plan } = await platformDb
    .from('benefits_review_plans')
    .select('version_number')
    .eq('id', planId)
    .single();

  // Get recipient info if user_id provided
  let recipientInfo = {};
  if (recipientData.recipient_user_id) {
    const { data: recipient } = await platformDb
      .from('users')
      .select('id, email, full_name')
      .eq('id', recipientData.recipient_user_id)
      .single();

    recipientInfo = {
      recipient_name: recipient?.full_name || '',
      recipient_email: recipient?.email || '',
    };
  }

  const { data: inserted, error } = await platformDb
    .from('benefits_review_plan_distribution')
    .insert({
      review_plan_id: planId,
      recipient_user_id: recipientData.recipient_user_id || null,
      recipient_name: recipientData.recipient_name || recipientInfo.recipient_name,
      recipient_email: recipientData.recipient_email || recipientInfo.recipient_email,
      recipient_title: recipientData.recipient_title || null,
      distribution_method: recipientData.distribution_method || 'portal',
      version_issued: plan?.version_number,
      date_of_issue: new Date().toISOString().split('T')[0],
      acknowledged: false,
      created_by: userRecord.id,
    })
    .select()
    .single();

  if (error) throw error;

  // Send distribution notification
  try {
    await notifyDistribution(planId, [inserted.id]);
  } catch (error) {
    console.error('Error sending distribution notification:', error);
    // Don't fail the add recipient if notification fails
  }

  return inserted;
}

/**
 * Remove recipient from distribution list
 */
export async function removeRecipient(distributionId) {
  const { error } = await platformDb
    .from('benefits_review_plan_distribution')
    .delete()
    .eq('id', distributionId);

  if (error) throw error;
}

/**
 * Record acknowledgement from recipient
 */
export async function recordAcknowledgement(distributionId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data: userRecord } = await platformDb
    .from('users')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('is_deleted', false)
    .single();

  if (!userRecord) {
    throw new Error('User record not found');
  }

  const { data, error } = await platformDb
    .from('benefits_review_plan_distribution')
    .update({
      acknowledged: true,
      acknowledged_date: new Date().toISOString().split('T')[0],
    })
    .eq('id', distributionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ================================================
// BENEFITS COVERAGE
// ================================================

/**
 * Get benefits covered in a review plan
 */
export async function getPlanBenefits(planId) {
  const { data, error } = await platformDb
    .from('benefits_review_plan_benefits')
    .select(`
      *,
      benefit:benefit_id (
        id,
        benefit_code,
        benefit_name,
        benefit_description,
        benefit_category,
        benefit_type,
        measurement_unit,
        baseline_value,
        target_value,
        benefit_owner:benefit_owner_user_id (id, email, full_name)
      ),
      accountable:accountable_user_id (id, email, full_name)
    `)
    .eq('review_plan_id', planId)
    .eq('is_deleted', false)
    .order('priority', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Add benefit to review plan scope
 */
export async function addBenefitToPlan(planId, benefitId, coverageData = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data: userRecord } = await platformDb
    .from('users')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('is_deleted', false)
    .single();

  if (!userRecord) {
    throw new Error('User record not found');
  }

  const insertData = {
    review_plan_id: planId,
    benefit_id: benefitId,
    included_in_scope: coverageData.included_in_scope !== false,
    exclusion_reason: coverageData.exclusion_reason || null,
    measurement_start_date: coverageData.measurement_start_date || null,
    measurement_end_date: coverageData.measurement_end_date || null,
    measurement_frequency: coverageData.measurement_frequency || null,
    measurement_timing_reason: coverageData.measurement_timing_reason || null,
    accountable_user_id: coverageData.accountable_user_id || null,
    accountability_notes: coverageData.accountability_notes || null,
    next_review_date: coverageData.next_review_date || null,
    priority: coverageData.priority || 'medium',
    notes: coverageData.notes || null,
    created_by: userRecord.id,
  };

  const { data, error } = await platformDb
    .from('benefits_review_plan_benefits')
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update benefit coverage details
 */
export async function updateBenefitCoverage(coverageId, data) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data: userRecord } = await platformDb
    .from('users')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('is_deleted', false)
    .single();

  if (!userRecord) {
    throw new Error('User record not found');
  }

  const updateData = {
    ...data,
    updated_by: userRecord.id,
  };

  const { data: result, error } = await platformDb
    .from('benefits_review_plan_benefits')
    .update(updateData)
    .eq('id', coverageId)
    .select()
    .single();

  if (error) throw error;
  return result;
}

/**
 * Remove benefit from plan (soft delete)
 */
export async function removeBenefitFromPlan(coverageId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data: userRecord } = await platformDb
    .from('users')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('is_deleted', false)
    .single();

  if (!userRecord) {
    throw new Error('User record not found');
  }

  const { data, error } = await platformDb
    .from('benefits_review_plan_benefits')
    .update({
      is_deleted: true,
      updated_by: userRecord.id,
    })
    .eq('id', coverageId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get benefits not yet mapped to a review plan
 */
export async function getUnmappedBenefits(projectId, planId) {
  // Get all benefits for the project
  const { data: allBenefits } = await platformDb
    .from('benefits')
    .select('id')
    .eq('project_id', projectId)
    .eq('is_deleted', false);

  if (!allBenefits || allBenefits.length === 0) {
    return [];
  }

  // Get benefits already in the plan
  const { data: mappedBenefits } = await platformDb
    .from('benefits_review_plan_benefits')
    .select('benefit_id')
    .eq('review_plan_id', planId)
    .eq('is_deleted', false);

  const mappedIds = (mappedBenefits || []).map(b => b.benefit_id);
  const unmappedIds = allBenefits
    .map(b => b.id)
    .filter(id => !mappedIds.includes(id));

  if (unmappedIds.length === 0) {
    return [];
  }

  const { data, error } = await platformDb
    .from('benefits')
    .select(`
      *,
      benefit_owner:benefit_owner_user_id (id, email, full_name)
    `)
    .in('id', unmappedIds)
    .eq('is_deleted', false)
    .order('benefit_name', { ascending: true });

  if (error) throw error;
  return data || [];
}

// ================================================
// RESOURCES
// ================================================

/**
 * Get resources for a review plan
 */
export async function getPlanResources(planId) {
  const { data, error } = await platformDb
    .from('benefits_review_plan_resources')
    .select(`
      *,
      assigned:assigned_user_id (id, email, full_name)
    `)
    .eq('review_plan_id', planId)
    .eq('is_deleted', false)
    .order('resource_type', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Add resource to review plan
 */
export async function addResource(planId, resourceData) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data: userRecord } = await platformDb
    .from('users')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('is_deleted', false)
    .single();

  if (!userRecord) {
    throw new Error('User record not found');
  }

  const insertData = {
    review_plan_id: planId,
    resource_type: resourceData.resource_type,
    resource_name: resourceData.resource_name,
    resource_description: resourceData.resource_description || null,
    assigned_user_id: resourceData.assigned_user_id || null,
    skill_required: resourceData.skill_required || null,
    skill_level: resourceData.skill_level || null,
    estimated_effort_hours: resourceData.estimated_effort_hours || null,
    estimated_cost: resourceData.estimated_cost || null,
    cost_currency: resourceData.cost_currency || 'USD',
    required_from_date: resourceData.required_from_date || null,
    required_to_date: resourceData.required_to_date || null,
    availability_confirmed: resourceData.availability_confirmed || false,
    notes: resourceData.notes || null,
    created_by: userRecord.id,
  };

  const { data, error } = await platformDb
    .from('benefits_review_plan_resources')
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update resource
 */
export async function updateResource(resourceId, data) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data: userRecord } = await platformDb
    .from('users')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('is_deleted', false)
    .single();

  if (!userRecord) {
    throw new Error('User record not found');
  }

  const updateData = {
    ...data,
    updated_by: userRecord.id,
  };

  const { data: result, error } = await platformDb
    .from('benefits_review_plan_resources')
    .update(updateData)
    .eq('id', resourceId)
    .select()
    .single();

  if (error) throw error;
  return result;
}

/**
 * Remove resource (soft delete)
 */
export async function removeResource(resourceId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data: userRecord } = await platformDb
    .from('users')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('is_deleted', false)
    .single();

  if (!userRecord) {
    throw new Error('User record not found');
  }

  const { data, error } = await platformDb
    .from('benefits_review_plan_resources')
    .update({
      is_deleted: true,
      updated_by: userRecord.id,
    })
    .eq('id', resourceId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Calculate total resource cost for a plan
 */
export async function calculateTotalResourceCost(planId) {
  const { data: resources } = await getPlanResources(planId);

  const totalCost = (resources || []).reduce((sum, resource) => {
    return sum + (parseFloat(resource.estimated_cost) || 0);
  }, 0);

  const totalEffort = (resources || []).reduce((sum, resource) => {
    return sum + (parseFloat(resource.estimated_effort_hours) || 0);
  }, 0);

  return {
    total_cost: totalCost,
    total_effort_hours: totalEffort,
    resource_count: resources?.length || 0,
  };
}

// ================================================
// REVIEW SCHEDULE
// ================================================

/**
 * Get review schedule for a plan
 */
export async function getReviewSchedule(planId) {
  const { data, error } = await platformDb
    .from('benefits_review_schedule')
    .select(`
      *,
      benefit:benefit_id (
        id,
        benefit_code,
        benefit_name
      ),
      reviewer:reviewer_user_id (id, email, full_name)
    `)
    .eq('review_plan_id', planId)
    .eq('is_deleted', false)
    .order('planned_date', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Schedule a review
 */
export async function scheduleReview(planId, reviewData) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data: userRecord } = await platformDb
    .from('users')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('is_deleted', false)
    .single();

  if (!userRecord) {
    throw new Error('User record not found');
  }

  const insertData = {
    review_plan_id: planId,
    benefit_id: reviewData.benefit_id || null,
    review_name: reviewData.review_name,
    review_description: reviewData.review_description || null,
    review_type: reviewData.review_type,
    planned_date: reviewData.planned_date,
    forecast_date: reviewData.forecast_date || null,
    review_duration_hours: reviewData.review_duration_hours || null,
    review_location: reviewData.review_location || null,
    is_virtual: reviewData.is_virtual !== false,
    meeting_link: reviewData.meeting_link || null,
    reviewer_user_id: reviewData.reviewer_user_id || null,
    attendees: reviewData.attendees || [],
    status: 'scheduled',
    notes: reviewData.notes || null,
    created_by: userRecord.id,
  };

  const { data, error } = await platformDb
    .from('benefits_review_schedule')
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update review
 */
export async function updateReview(reviewId, data) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data: userRecord } = await platformDb
    .from('users')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('is_deleted', false)
    .single();

  if (!userRecord) {
    throw new Error('User record not found');
  }

  const updateData = {
    ...data,
    updated_by: userRecord.id,
  };

  const { data: result, error } = await platformDb
    .from('benefits_review_schedule')
    .update(updateData)
    .eq('id', reviewId)
    .select()
    .single();

  if (error) throw error;
  return result;
}

/**
 * Complete a review with outcome
 */
export async function completeReview(reviewId, outcomeData) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data: userRecord } = await platformDb
    .from('users')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('is_deleted', false)
    .single();

  if (!userRecord) {
    throw new Error('User record not found');
  }

  const updateData = {
    status: 'completed',
    actual_date: new Date().toISOString().split('T')[0],
    outcome_summary: outcomeData.outcome_summary || null,
    findings: outcomeData.findings || null,
    recommendations: outcomeData.recommendations || null,
    action_items: outcomeData.action_items || null,
    review_report_url: outcomeData.review_report_url || null,
    supporting_documents: outcomeData.supporting_documents || [],
    updated_by: userRecord.id,
  };

  const { data, error } = await platformDb
    .from('benefits_review_schedule')
    .update(updateData)
    .eq('id', reviewId)
    .select()
    .single();

  if (error) throw error;

  // Update last_review_date on benefit coverage if benefit_id exists
  if (data.benefit_id) {
    await platformDb
      .from('benefits_review_plan_benefits')
      .update({
        last_review_date: updateData.actual_date,
        review_completed: true,
        updated_by: userRecord.id,
      })
      .eq('review_plan_id', data.review_plan_id)
      .eq('benefit_id', data.benefit_id);
  }

  return data;
}

/**
 * Get upcoming reviews for a project
 */
export async function getUpcomingReviews(projectId, daysAhead = 30) {
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + daysAhead);

  const { data, error } = await platformDb
    .from('benefits_review_schedule')
    .select(`
      *,
      review_plan:benefits_review_plans!inner (
        id,
        plan_title,
        project:project_id!inner (
          id
        )
      ),
      benefit:benefit_id (
        id,
        benefit_code,
        benefit_name
      ),
      reviewer:reviewer_user_id (id, email, full_name)
    `)
    .eq('review_plan.project_id', projectId)
    .eq('status', 'scheduled')
    .eq('is_deleted', false)
    .gte('planned_date', today.toISOString().split('T')[0])
    .lte('planned_date', futureDate.toISOString().split('T')[0])
    .order('planned_date', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get overdue reviews for a project
 */
export async function getOverdueReviews(projectId) {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await platformDb
    .from('benefits_review_schedule')
    .select(`
      *,
      review_plan:benefits_review_plans!inner (
        id,
        plan_title,
        project:project_id!inner (
          id
        )
      ),
      benefit:benefit_id (
        id,
        benefit_code,
        benefit_name
      ),
      reviewer:reviewer_user_id (id, email, full_name)
    `)
    .eq('review_plan.project_id', projectId)
    .eq('status', 'scheduled')
    .eq('is_deleted', false)
    .lt('planned_date', today)
    .order('planned_date', { ascending: true });

  if (error) throw error;
  return data || [];
}
