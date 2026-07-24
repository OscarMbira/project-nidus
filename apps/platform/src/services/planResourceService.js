/**
 * Plan Resource Service
 * API functions for managing plan resources (both Project Plan and Stage Plan)
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * Add Resource
 * @param {string} planId - Plan ID
 * @param {string} planType - 'project_plan' or 'stage_plan'
 * @param {Object} resourceData - Resource data
 * @returns {Promise<Object>} Created resource
 */
export async function addResource(planId, planType, resourceData) {
  try {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const tableName = planType === 'project_plan' 
      ? 'project_plan_resources' 
      : 'stage_plan_resources';

    const planIdField = planType === 'project_plan' 
      ? 'project_plan_id' 
      : 'stage_plan_id';

    // Get next display order
    const { data: existing } = await platformDb
      .from(tableName)
      .select('display_order')
      .eq(planIdField, planId)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0
      ? existing[0].display_order + 1
      : 0;

    const insertData = {
      ...resourceData,
      [planIdField]: planId,
      display_order: resourceData.display_order ?? nextOrder
    };

    const { data, error } = await platformDb
      .from(tableName)
      .insert(insertData)
      .select('*')
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error adding resource:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update Resource
 * @param {string} resourceId - Resource ID
 * @param {string} planType - 'project_plan' or 'stage_plan'
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated resource
 */
export async function updateResource(resourceId, planType, updates) {
  try {
    const tableName = planType === 'project_plan' 
      ? 'project_plan_resources' 
      : 'stage_plan_resources';

    const { data, error } = await platformDb
      .from(tableName)
      .update(updates)
      .eq('id', resourceId)
      .select('*')
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating resource:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete Resource
 * @param {string} resourceId - Resource ID
 * @param {string} planType - 'project_plan' or 'stage_plan'
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteResource(resourceId, planType) {
  try {
    const tableName = planType === 'project_plan' 
      ? 'project_plan_resources' 
      : 'stage_plan_resources';

    const { error } = await platformDb
      .from(tableName)
      .delete()
      .eq('id', resourceId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting resource:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get Resources
 * @param {string} planId - Plan ID
 * @param {string} planType - 'project_plan' or 'stage_plan'
 * @returns {Promise<Object>} Resources
 */
export async function getResources(planId, planType) {
  try {
    const tableName = planType === 'project_plan' 
      ? 'project_plan_resources' 
      : 'stage_plan_resources';

    const planIdField = planType === 'project_plan' 
      ? 'project_plan_id' 
      : 'stage_plan_id';

    const { data, error } = await platformDb
      .from(tableName)
      .select('*')
      .eq(planIdField, planId)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error getting resources:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Calculate Resource Costs
 * @param {string} planId - Plan ID
 * @param {string} planType - 'project_plan' or 'stage_plan'
 * @returns {Promise<Object>} Cost summary
 */
export async function calculateResourceCosts(planId, planType) {
  try {
    const resourcesResult = await getResources(planId, planType);
    if (!resourcesResult.success) {
      return resourcesResult;
    }

    const resources = resourcesResult.data || [];
    
    const summary = {
      total_resources: resources.length,
      total_cost: 0,
      cost_by_type: {},
      cost_by_resource: []
    };

    resources.forEach(resource => {
      const cost = parseFloat(resource.total_cost || 0);
      summary.total_cost += cost;
      
      const type = resource.resource_type || 'other';
      summary.cost_by_type[type] = (summary.cost_by_type[type] || 0) + cost;
      
      summary.cost_by_resource.push({
        id: resource.id,
        name: resource.resource_name,
        type: type,
        cost: cost
      });
    });

    return { success: true, data: summary };
  } catch (error) {
    console.error('Error calculating resource costs:', error);
    return { success: false, error: error.message };
  }
}
