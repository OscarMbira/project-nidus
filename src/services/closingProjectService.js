import { supabase } from './supabaseClient';

/**
 * Closing a Project (CP) Service - API functions for Project Closure
 */

// ===========================
// PROJECT CLOSURES
// ===========================

/**
 * Fetch project closure for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Project closure record
 */
export async function fetchProjectClosure(projectId) {
  try {
    const { data, error } = await supabase
      .from('project_closures')
      .select(`
        *,
        project:projects(id, project_name, project_code),
        board:project_boards(id, board_name),
        prepared_by_user:users!project_closures_prepared_by_fkey(full_name, email),
        approved_by_user:users!project_closures_approved_by_fkey(full_name, email)
      `)
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;

    return data;
  } catch (error) {
    console.error('Error fetching project closure:', error);
    throw error;
  }
}

/**
 * Create a project closure
 * @param {Object} closureData - Closure data
 * @returns {Promise<Object>} Created closure
 */
export async function createProjectClosure(closureData) {
  try {
    const { data, error } = await supabase
      .from('project_closures')
      .insert(closureData)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error creating project closure:', error);
    throw error;
  }
}

/**
 * Update a project closure
 * @param {string} closureId - Closure ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated closure
 */
export async function updateProjectClosure(closureId, updates) {
  try {
    const { data, error } = await supabase
      .from('project_closures')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', closureId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error updating project closure:', error);
    throw error;
  }
}

// ===========================
// END PROJECT REPORTS
// ===========================

/**
 * Fetch end project report for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} End project report
 */
export async function fetchEndProjectReport(projectId) {
  try {
    const { data, error } = await supabase
      .from('end_project_reports')
      .select(`
        *,
        project:projects(id, project_name, project_code),
        project_closure:project_closures(id, closure_status),
        prepared_by_user:users!end_project_reports_prepared_by_fkey(full_name, email),
        approved_by_user:users!end_project_reports_approved_by_fkey(full_name, email)
      `)
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;

    return data;
  } catch (error) {
    console.error('Error fetching end project report:', error);
    throw error;
  }
}

/**
 * Create an end project report
 * @param {Object} reportData - Report data
 * @returns {Promise<Object>} Created report
 */
export async function createEndProjectReport(reportData) {
  try {
    const { data, error } = await supabase
      .from('end_project_reports')
      .insert(reportData)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error creating end project report:', error);
    throw error;
  }
}

/**
 * Update an end project report
 * @param {string} reportId - Report ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated report
 */
export async function updateEndProjectReport(reportId, updates) {
  try {
    const { data, error} = await supabase
      .from('end_project_reports')
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
    console.error('Error updating end project report:', error);
    throw error;
  }
}

// ===========================
// LESSONS LEARNED
// ===========================

/**
 * Fetch lessons learned for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Array>} Array of lessons learned
 */
export async function fetchLessonsLearned(projectId) {
  try {
    const { data, error } = await supabase
      .from('lessons_learned')
      .select(`
        *,
        project:projects(id, project_name),
        category_lookup:lookups!lessons_learned_category_id_fkey(id, lookup_value, lookup_description),
        created_by_user:users!lessons_learned_created_by_fkey(full_name, email)
      `)
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching lessons learned:', error);
    throw error;
  }
}

/**
 * Create a lesson learned
 * @param {Object} lessonData - Lesson data
 * @returns {Promise<Object>} Created lesson
 */
export async function createLessonLearned(lessonData) {
  try {
    const { data, error } = await supabase
      .from('lessons_learned')
      .insert(lessonData)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error creating lesson learned:', error);
    throw error;
  }
}

/**
 * Update a lesson learned
 * @param {string} lessonId - Lesson ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated lesson
 */
export async function updateLessonLearned(lessonId, updates) {
  try {
    const { data, error } = await supabase
      .from('lessons_learned')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', lessonId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error updating lesson learned:', error);
    throw error;
  }
}

/**
 * Delete a lesson learned (soft delete)
 * @param {string} lessonId - Lesson ID
 * @returns {Promise<void>}
 */
export async function deleteLessonLearned(lessonId) {
  try {
    const { error } = await supabase
      .from('lessons_learned')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString()
      })
      .eq('id', lessonId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting lesson learned:', error);
    throw error;
  }
}

// ===========================
// FOLLOW-ON ACTIONS
// ===========================

/**
 * Fetch follow-on actions for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Array>} Array of follow-on actions
 */
export async function fetchFollowOnActions(projectId) {
  try {
    const { data, error } = await supabase
      .from('follow_on_actions')
      .select(`
        *,
        project:projects(id, project_name),
        assigned_to_user:users!follow_on_actions_assigned_to_fkey(full_name, email),
        created_by_user:users!follow_on_actions_created_by_fkey(full_name, email)
      `)
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .order('priority_order', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching follow-on actions:', error);
    throw error;
  }
}

/**
 * Create a follow-on action
 * @param {Object} actionData - Action data
 * @returns {Promise<Object>} Created action
 */
export async function createFollowOnAction(actionData) {
  try {
    const { data, error } = await supabase
      .from('follow_on_actions')
      .insert(actionData)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error creating follow-on action:', error);
    throw error;
  }
}

/**
 * Update a follow-on action
 * @param {string} actionId - Action ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated action
 */
export async function updateFollowOnAction(actionId, updates) {
  try {
    const { data, error } = await supabase
      .from('follow_on_actions')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', actionId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error updating follow-on action:', error);
    throw error;
  }
}

/**
 * Delete a follow-on action (soft delete)
 * @param {string} actionId - Action ID
 * @returns {Promise<void>}
 */
export async function deleteFollowOnAction(actionId) {
  try {
    const { error } = await supabase
      .from('follow_on_actions')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString()
      })
      .eq('id', actionId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting follow-on action:', error);
    throw error;
  }
}

// ===========================
// PROJECT HANDOVER
// ===========================

/**
 * Fetch project handover for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Project handover record
 */
export async function fetchProjectHandover(projectId) {
  try {
    const { data, error } = await supabase
      .from('project_handover')
      .select(`
        *,
        project:projects(id, project_name),
        handover_from_user:users!project_handover_handover_from_fkey(full_name, email),
        handover_to_user:users!project_handover_handover_to_fkey(full_name, email)
      `)
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;

    return data;
  } catch (error) {
    console.error('Error fetching project handover:', error);
    throw error;
  }
}

/**
 * Create a project handover
 * @param {Object} handoverData - Handover data
 * @returns {Promise<Object>} Created handover
 */
export async function createProjectHandover(handoverData) {
  try {
    const { data, error } = await supabase
      .from('project_handover')
      .insert(handoverData)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error creating project handover:', error);
    throw error;
  }
}

/**
 * Update a project handover
 * @param {string} handoverId - Handover ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated handover
 */
export async function updateProjectHandover(handoverId, updates) {
  try {
    const { data, error } = await supabase
      .from('project_handover')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', handoverId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error updating project handover:', error);
    throw error;
  }
}

// ===========================
// DASHBOARD & ANALYTICS
// ===========================

/**
 * Get project closure dashboard statistics
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Dashboard statistics
 */
export async function getClosureDashboardStats(projectId) {
  try {
    // Fetch all relevant data
    const [
      closureResult,
      lessonsResult,
      actionsResult,
      handoverResult
    ] = await Promise.all([
      supabase
        .from('project_closures')
        .select('id, closure_status, closure_phase, checklist_completion_percentage')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .maybeSingle(),
      supabase
        .from('lessons_learned')
        .select('id, lesson_type')
        .eq('project_id', projectId)
        .eq('is_deleted', false),
      supabase
        .from('follow_on_actions')
        .select('id, action_status')
        .eq('project_id', projectId)
        .eq('is_deleted', false),
      supabase
        .from('project_handover')
        .select('id, handover_status')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .maybeSingle()
    ]);

    if (closureResult.error && closureResult.error.code !== 'PGRST116') throw closureResult.error;
    if (lessonsResult.error) throw lessonsResult.error;
    if (actionsResult.error) throw actionsResult.error;
    if (handoverResult.error && handoverResult.error.code !== 'PGRST116') throw handoverResult.error;

    const closure = closureResult.data;
    const lessons = lessonsResult.data || [];
    const actions = actionsResult.data || [];
    const handover = handoverResult.data;

    return {
      closureExists: !!closure,
      closureStatus: closure?.closure_status || 'not-started',
      closurePhase: closure?.closure_phase || 'preparation',
      checklistCompletion: closure?.checklist_completion_percentage || 0,
      totalLessons: lessons.length,
      positiveLessons: lessons.filter(l => l.lesson_type === 'positive').length,
      totalActions: actions.length,
      completedActions: actions.filter(a => a.action_status === 'completed').length,
      handoverExists: !!handover,
      handoverStatus: handover?.handover_status || 'not-started'
    };
  } catch (error) {
    console.error('Error fetching closure dashboard stats:', error);
    throw error;
  }
}

export default {
  // Project Closures
  fetchProjectClosure,
  createProjectClosure,
  updateProjectClosure,

  // End Project Reports
  fetchEndProjectReport,
  createEndProjectReport,
  updateEndProjectReport,

  // Lessons Learned
  fetchLessonsLearned,
  createLessonLearned,
  updateLessonLearned,
  deleteLessonLearned,

  // Follow-on Actions
  fetchFollowOnActions,
  createFollowOnAction,
  updateFollowOnAction,
  deleteFollowOnAction,

  // Project Handover
  fetchProjectHandover,
  createProjectHandover,
  updateProjectHandover,

  // Dashboard
  getClosureDashboardStats
};
