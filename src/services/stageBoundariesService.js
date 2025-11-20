import { supabase } from './supabaseClient';

/**
 * Stage Boundaries (SB) Service - API functions for Managing Stage Boundaries
 */

// ===========================
// END STAGE REPORTS
// ===========================

/**
 * Fetch end stage reports for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Array>} Array of end stage reports
 */
export async function fetchEndStageReports(projectId) {
  try {
    const { data, error } = await supabase
      .from('end_stage_reports')
      .select(`
        *,
        project:projects(id, project_name),
        stage_boundary:stage_boundaries(id, stage_name, stage_number),
        board:project_boards(id, board_name),
        prepared_by_user:users!end_stage_reports_prepared_by_fkey(full_name, email),
        approved_by_user:users!end_stage_reports_approved_by_fkey(full_name, email)
      `)
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .order('report_date', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching end stage reports:', error);
    throw error;
  }
}

/**
 * Fetch a single end stage report by ID
 * @param {string} reportId - Report ID
 * @returns {Promise<Object>} End stage report
 */
export async function fetchEndStageReport(reportId) {
  try {
    const { data, error } = await supabase
      .from('end_stage_reports')
      .select(`
        *,
        project:projects(id, project_name, project_code),
        stage_boundary:stage_boundaries(id, stage_name, stage_number),
        board:project_boards(id, board_name),
        prepared_by_user:users!end_stage_reports_prepared_by_fkey(full_name, email),
        reviewed_by_user:users!end_stage_reports_reviewed_by_fkey(full_name, email),
        approved_by_user:users!end_stage_reports_approved_by_fkey(full_name, email)
      `)
      .eq('id', reportId)
      .eq('is_deleted', false)
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error fetching end stage report:', error);
    throw error;
  }
}

/**
 * Create an end stage report
 * @param {Object} reportData - Report data
 * @returns {Promise<Object>} Created report
 */
export async function createEndStageReport(reportData) {
  try {
    const { data, error } = await supabase
      .from('end_stage_reports')
      .insert(reportData)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error creating end stage report:', error);
    throw error;
  }
}

/**
 * Update an end stage report
 * @param {string} reportId - Report ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated report
 */
export async function updateEndStageReport(reportId, updates) {
  try {
    const { data, error } = await supabase
      .from('end_stage_reports')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', reportId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error updating end stage report:', error);
    throw error;
  }
}

/**
 * Delete an end stage report (soft delete)
 * @param {string} reportId - Report ID
 * @returns {Promise<void>}
 */
export async function deleteEndStageReport(reportId) {
  try {
    const { error } = await supabase
      .from('end_stage_reports')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString()
      })
      .eq('id', reportId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting end stage report:', error);
    throw error;
  }
}

// ===========================
// EXCEPTION PLANS
// ===========================

/**
 * Fetch exception plans for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Array>} Array of exception plans
 */
export async function fetchExceptionPlans(projectId) {
  try {
    const { data, error } = await supabase
      .from('exception_plans')
      .select(`
        *,
        project:projects(id, project_name),
        stage_boundary:stage_boundaries(id, stage_name, stage_number),
        board:project_boards(id, board_name),
        prepared_by_user:users!exception_plans_prepared_by_fkey(full_name, email),
        approved_by_user:users!exception_plans_approved_by_fkey(full_name, email)
      `)
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .order('plan_date', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching exception plans:', error);
    throw error;
  }
}

/**
 * Fetch a single exception plan by ID
 * @param {string} planId - Plan ID
 * @returns {Promise<Object>} Exception plan
 */
export async function fetchExceptionPlan(planId) {
  try {
    const { data, error } = await supabase
      .from('exception_plans')
      .select(`
        *,
        project:projects(id, project_name, project_code),
        stage_boundary:stage_boundaries(id, stage_name, stage_number),
        board:project_boards(id, board_name),
        authorization:project_authorizations(id, authorization_type, authorization_status),
        prepared_by_user:users!exception_plans_prepared_by_fkey(full_name, email),
        reviewed_by_user:users!exception_plans_reviewed_by_fkey(full_name, email),
        approved_by_user:users!exception_plans_approved_by_fkey(full_name, email)
      `)
      .eq('id', planId)
      .eq('is_deleted', false)
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error fetching exception plan:', error);
    throw error;
  }
}

/**
 * Create an exception plan
 * @param {Object} planData - Plan data
 * @returns {Promise<Object>} Created plan
 */
export async function createExceptionPlan(planData) {
  try {
    const { data, error } = await supabase
      .from('exception_plans')
      .insert(planData)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error creating exception plan:', error);
    throw error;
  }
}

/**
 * Update an exception plan
 * @param {string} planId - Plan ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated plan
 */
export async function updateExceptionPlan(planId, updates) {
  try {
    const { data, error } = await supabase
      .from('exception_plans')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', planId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error updating exception plan:', error);
    throw error;
  }
}

/**
 * Delete an exception plan (soft delete)
 * @param {string} planId - Plan ID
 * @returns {Promise<void>}
 */
export async function deleteExceptionPlan(planId) {
  try {
    const { error } = await supabase
      .from('exception_plans')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString()
      })
      .eq('id', planId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting exception plan:', error);
    throw error;
  }
}

// ===========================
// NEXT STAGE PLANS
// ===========================

/**
 * Fetch next stage plans for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Array>} Array of next stage plans
 */
export async function fetchNextStagePlans(projectId) {
  try {
    const { data, error } = await supabase
      .from('next_stage_plans')
      .select(`
        *,
        project:projects(id, project_name),
        current_stage:stage_boundaries!next_stage_plans_current_stage_boundary_id_fkey(id, stage_name, stage_number),
        next_stage:stage_boundaries!next_stage_plans_next_stage_boundary_id_fkey(id, stage_name, stage_number),
        prepared_by_user:users!next_stage_plans_prepared_by_fkey(full_name, email),
        approved_by_user:users!next_stage_plans_approved_by_fkey(full_name, email)
      `)
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .order('plan_date', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching next stage plans:', error);
    throw error;
  }
}

/**
 * Fetch a single next stage plan by ID
 * @param {string} planId - Plan ID
 * @returns {Promise<Object>} Next stage plan
 */
export async function fetchNextStagePlan(planId) {
  try {
    const { data, error } = await supabase
      .from('next_stage_plans')
      .select(`
        *,
        project:projects(id, project_name, project_code),
        current_stage:stage_boundaries!next_stage_plans_current_stage_boundary_id_fkey(id, stage_name, stage_number),
        next_stage:stage_boundaries!next_stage_plans_next_stage_boundary_id_fkey(id, stage_name, stage_number),
        prepared_by_user:users!next_stage_plans_prepared_by_fkey(full_name, email),
        reviewed_by_user:users!next_stage_plans_reviewed_by_fkey(full_name, email),
        approved_by_user:users!next_stage_plans_approved_by_fkey(full_name, email)
      `)
      .eq('id', planId)
      .eq('is_deleted', false)
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error fetching next stage plan:', error);
    throw error;
  }
}

/**
 * Create a next stage plan
 * @param {Object} planData - Plan data
 * @returns {Promise<Object>} Created plan
 */
export async function createNextStagePlan(planData) {
  try {
    const { data, error } = await supabase
      .from('next_stage_plans')
      .insert(planData)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error creating next stage plan:', error);
    throw error;
  }
}

/**
 * Update a next stage plan
 * @param {string} planId - Plan ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated plan
 */
export async function updateNextStagePlan(planId, updates) {
  try {
    const { data, error } = await supabase
      .from('next_stage_plans')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', planId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error updating next stage plan:', error);
    throw error;
  }
}

/**
 * Delete a next stage plan (soft delete)
 * @param {string} planId - Plan ID
 * @returns {Promise<void>}
 */
export async function deleteNextStagePlan(planId) {
  try {
    const { error } = await supabase
      .from('next_stage_plans')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString()
      })
      .eq('id', planId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting next stage plan:', error);
    throw error;
  }
}

// ===========================
// STAGE BOUNDARIES (from v10)
// ===========================

/**
 * Fetch stage boundaries for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Array>} Array of stage boundaries
 */
export async function fetchStageBoundaries(projectId) {
  try {
    const { data, error } = await supabase
      .from('stage_boundaries')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .order('stage_number', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching stage boundaries:', error);
    throw error;
  }
}

// ===========================
// DASHBOARD & ANALYTICS
// ===========================

/**
 * Get stage boundaries dashboard statistics
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Dashboard statistics
 */
export async function getStageBoundariesStats(projectId) {
  try {
    // Fetch all relevant data in parallel
    const [
      stagesResult,
      endStageReportsResult,
      exceptionPlansResult,
      nextStagePlansResult
    ] = await Promise.all([
      supabase
        .from('stage_boundaries')
        .select('id, stage_status')
        .eq('project_id', projectId)
        .eq('is_deleted', false),
      supabase
        .from('end_stage_reports')
        .select('id, approval_status')
        .eq('project_id', projectId)
        .eq('is_deleted', false),
      supabase
        .from('exception_plans')
        .select('id, approval_status, implementation_status')
        .eq('project_id', projectId)
        .eq('is_deleted', false),
      supabase
        .from('next_stage_plans')
        .select('id, approval_status')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
    ]);

    if (stagesResult.error) throw stagesResult.error;
    if (endStageReportsResult.error) throw endStageReportsResult.error;
    if (exceptionPlansResult.error) throw exceptionPlansResult.error;
    if (nextStagePlansResult.error) throw nextStagePlansResult.error;

    const stages = stagesResult.data || [];
    const endStageReports = endStageReportsResult.data || [];
    const exceptionPlans = exceptionPlansResult.data || [];
    const nextStagePlans = nextStagePlansResult.data || [];

    return {
      totalStages: stages.length,
      completedStages: stages.filter(s => s.stage_status === 'completed').length,
      activeStages: stages.filter(s => s.stage_status === 'in-progress').length,
      totalEndStageReports: endStageReports.length,
      approvedReports: endStageReports.filter(r => r.approval_status === 'approved').length,
      totalExceptionPlans: exceptionPlans.length,
      activeExceptions: exceptionPlans.filter(e => e.implementation_status === 'in-progress').length,
      totalNextStagePlans: nextStagePlans.length,
      approvedNextStagePlans: nextStagePlans.filter(p => p.approval_status === 'approved').length
    };
  } catch (error) {
    console.error('Error fetching stage boundaries stats:', error);
    throw error;
  }
}

export default {
  // End Stage Reports
  fetchEndStageReports,
  fetchEndStageReport,
  createEndStageReport,
  updateEndStageReport,
  deleteEndStageReport,

  // Exception Plans
  fetchExceptionPlans,
  fetchExceptionPlan,
  createExceptionPlan,
  updateExceptionPlan,
  deleteExceptionPlan,

  // Next Stage Plans
  fetchNextStagePlans,
  fetchNextStagePlan,
  createNextStagePlan,
  updateNextStagePlan,
  deleteNextStagePlan,

  // Stage Boundaries
  fetchStageBoundaries,

  // Dashboard
  getStageBoundariesStats
};
