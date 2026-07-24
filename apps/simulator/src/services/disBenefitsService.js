/**
 * Dis-Benefits Service
 * Provides CRUD operations for dis-benefits (negative impacts)
 */

import { platformDb, supabase } from './supabaseClient';

/**
 * Get all dis-benefits with filters
 */
export async function getDisBenefits(filters = {}) {
  let query = platformDb
    .from('dis_benefits')
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
      review_plan:review_plan_id (
        id,
        plan_title,
        document_ref
      ),
      mitigation_owner:mitigation_owner_user_id (id, email, full_name)
    `)
    .eq('is_deleted', false);

  if (filters.project_id) {
    query = query.eq('project_id', filters.project_id);
  }

  if (filters.programme_id) {
    query = query.eq('programme_id', filters.programme_id);
  }

  if (filters.review_plan_id) {
    query = query.eq('review_plan_id', filters.review_plan_id);
  }

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.dis_benefit_category) {
    query = query.eq('dis_benefit_category', filters.dis_benefit_category);
  }

  if (filters.impact_severity) {
    query = query.eq('impact_severity', filters.impact_severity);
  }

  if (filters.search) {
    query = query.or(`dis_benefit_name.ilike.%${filters.search}%,dis_benefit_code.ilike.%${filters.search}%,dis_benefit_description.ilike.%${filters.search}%`);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get a single dis-benefit by ID
 */
export async function getDisBenefit(disBenefitId) {
  const { data, error } = await platformDb
    .from('dis_benefits')
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
      review_plan:review_plan_id (
        id,
        plan_title,
        document_ref
      ),
      mitigation_owner:mitigation_owner_user_id (id, email, full_name)
    `)
    .eq('id', disBenefitId)
    .eq('is_deleted', false)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create or update a dis-benefit
 */
export async function saveDisBenefit(disBenefitData, disBenefitId = null) {
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
    ...disBenefitData,
    updated_by: userRecord.id,
  };

  if (disBenefitId) {
    const { data, error } = await platformDb
      .from('dis_benefits')
      .update(updateData)
      .eq('id', disBenefitId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    updateData.created_by = userRecord.id;
    
    const { data, error } = await platformDb
      .from('dis_benefits')
      .insert(updateData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

/**
 * Delete a dis-benefit (soft delete)
 */
export async function deleteDisBenefit(disBenefitId) {
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
    .from('dis_benefits')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: userRecord.id,
      updated_by: userRecord.id,
    })
    .eq('id', disBenefitId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update mitigation status
 */
export async function updateMitigationStatus(disBenefitId, status, notes = '') {
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
    mitigation_status: status,
    notes: notes || null,
    updated_by: userRecord.id,
  };

  // If mitigated, update status
  if (status === 'mitigated') {
    updateData.status = 'mitigated';
  }

  const { data, error } = await platformDb
    .from('dis_benefits')
    .update(updateData)
    .eq('id', disBenefitId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get dis-benefits for a review plan
 */
export async function getDisBenefitsForPlan(planId) {
  const { data, error } = await platformDb
    .from('dis_benefits')
    .select(`
      *,
      mitigation_owner:mitigation_owner_user_id (id, email, full_name)
    `)
    .eq('review_plan_id', planId)
    .eq('is_deleted', false)
    .order('impact_severity', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get active dis-benefits for a project
 */
export async function getActiveDisBenefits(projectId) {
  const { data, error } = await platformDb
    .from('dis_benefits')
    .select(`
      *,
      mitigation_owner:mitigation_owner_user_id (id, email, full_name)
    `)
    .eq('project_id', projectId)
    .eq('status', 'active')
    .eq('is_deleted', false)
    .order('impact_severity', { ascending: false });

  if (error) throw error;
  return data || [];
}
