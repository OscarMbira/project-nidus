/**
 * Plan Milestone Service
 * API functions for managing plan milestones (both Project Plan and Stage Plan)
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * Add Milestone
 * @param {string} planId - Plan ID
 * @param {string} planType - 'project_plan' or 'stage_plan'
 * @param {Object} milestoneData - Milestone data
 * @returns {Promise<Object>} Created milestone
 */
export async function addMilestone(planId, planType, milestoneData) {
  try {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const tableName = planType === 'project_plan' 
      ? 'project_plan_milestones' 
      : 'stage_plan_milestones';

    const planIdField = planType === 'project_plan' 
      ? 'project_plan_id' 
      : 'stage_plan_id';

    // Get next milestone number
    const { data: existing } = await platformDb
      .from(tableName)
      .select('milestone_number')
      .eq(planIdField, planId)
      .order('milestone_number', { ascending: false })
      .limit(1);

    const nextNumber = existing && existing.length > 0
      ? existing[0].milestone_number + 1
      : 1;

    // Get next display order
    const { data: existingOrder } = await platformDb
      .from(tableName)
      .select('display_order')
      .eq(planIdField, planId)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = existingOrder && existingOrder.length > 0
      ? existingOrder[0].display_order + 1
      : 0;

    const insertData = {
      ...milestoneData,
      [planIdField]: planId,
      milestone_number: milestoneData.milestone_number ?? nextNumber,
      display_order: milestoneData.display_order ?? nextOrder
    };

    const { data, error } = await platformDb
      .from(tableName)
      .insert(insertData)
      .select('*')
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error adding milestone:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update Milestone
 * @param {string} milestoneId - Milestone ID
 * @param {string} planType - 'project_plan' or 'stage_plan'
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated milestone
 */
export async function updateMilestone(milestoneId, planType, updates) {
  try {
    const tableName = planType === 'project_plan' 
      ? 'project_plan_milestones' 
      : 'stage_plan_milestones';

    const { data, error } = await platformDb
      .from(tableName)
      .update(updates)
      .eq('id', milestoneId)
      .select('*')
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating milestone:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete Milestone
 * @param {string} milestoneId - Milestone ID
 * @param {string} planType - 'project_plan' or 'stage_plan'
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteMilestone(milestoneId, planType) {
  try {
    const tableName = planType === 'project_plan' 
      ? 'project_plan_milestones' 
      : 'stage_plan_milestones';

    const { error } = await platformDb
      .from(tableName)
      .delete()
      .eq('id', milestoneId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting milestone:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get Milestones
 * @param {string} planId - Plan ID
 * @param {string} planType - 'project_plan' or 'stage_plan'
 * @returns {Promise<Object>} Milestones
 */
export async function getMilestones(planId, planType) {
  try {
    const tableName = planType === 'project_plan' 
      ? 'project_plan_milestones' 
      : 'stage_plan_milestones';

    const planIdField = planType === 'project_plan' 
      ? 'project_plan_id' 
      : 'stage_plan_id';

    const { data, error } = await platformDb
      .from(tableName)
      .select('*')
      .eq(planIdField, planId)
      .order('display_order', { ascending: true })
      .order('milestone_date', { ascending: true });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error getting milestones:', error);
    return { success: false, error: error.message };
  }
}
