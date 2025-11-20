import { supabase } from './supabaseClient';

/**
 * Gantt Service - API functions for Gantt chart data
 */

/**
 * Fetch Gantt data for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Array>} Array of tasks with dependencies
 */
export async function fetchGanttData(projectId) {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        id,
        task_name,
        start_date,
        due_date,
        progress_percentage,
        is_milestone,
        is_critical_path,
        baseline_start_date,
        baseline_end_date,
        assigned_to,
        task_dependencies!task_dependencies_target_task_id_fkey(
          source_task_id,
          dependency_type,
          lag_days
        )
      `)
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .order('start_date', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching Gantt data:', error);
    throw error;
  }
}

/**
 * Update task dates from Gantt drag operation
 * @param {string} taskId - Task ID
 * @param {string} startDate - New start date (YYYY-MM-DD)
 * @param {string} endDate - New end date (YYYY-MM-DD)
 * @returns {Promise<Object>} Updated task
 */
export async function updateTaskDates(taskId, startDate, endDate) {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .update({
        start_date: startDate,
        due_date: endDate,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error updating task dates:', error);
    throw error;
  }
}

/**
 * Create a task dependency
 * @param {string} sourceTaskId - Source task ID
 * @param {string} targetTaskId - Target task ID
 * @param {string} dependencyType - Type: 'FS', 'SS', 'FF', 'SF'
 * @param {number} lagDays - Lag in days (optional)
 * @returns {Promise<Object>} Created dependency
 */
export async function createDependency(sourceTaskId, targetTaskId, dependencyType = 'FS', lagDays = 0) {
  try {
    const { data, error } = await supabase
      .from('task_dependencies')
      .insert({
        source_task_id: sourceTaskId,
        target_task_id: targetTaskId,
        dependency_type: dependencyType,
        lag_days: lagDays
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error creating dependency:', error);
    throw error;
  }
}

/**
 * Update a task dependency
 * @param {string} dependencyId - Dependency ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated dependency
 */
export async function updateDependency(dependencyId, updates) {
  try {
    const { data, error } = await supabase
      .from('task_dependencies')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', dependencyId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error updating dependency:', error);
    throw error;
  }
}

/**
 * Delete a task dependency
 * @param {string} dependencyId - Dependency ID
 * @returns {Promise<void>}
 */
export async function deleteDependency(dependencyId) {
  try {
    const { error } = await supabase
      .from('task_dependencies')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString()
      })
      .eq('id', dependencyId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting dependency:', error);
    throw error;
  }
}

/**
 * Fetch all dependencies for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Array>} Array of dependencies
 */
export async function fetchProjectDependencies(projectId) {
  try {
    const { data, error } = await supabase
      .from('task_dependencies')
      .select(`
        id,
        source_task_id,
        target_task_id,
        dependency_type,
        lag_days,
        description,
        created_at,
        updated_at,
        source:tasks!task_dependencies_source_task_id_fkey(id, task_name),
        target:tasks!task_dependencies_target_task_id_fkey(id, task_name, project_id)
      `)
      .eq('target.project_id', projectId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching project dependencies:', error);
    throw error;
  }
}

/**
 * Calculate critical path for a project using PostgreSQL CPM function
 * @param {string} projectId - Project ID
 * @param {boolean} updateTasks - Whether to update tasks table with CPM results
 * @returns {Promise<Array>} Array of CPM results
 */
export async function calculateCriticalPath(projectId, updateTasks = false) {
  try {
    // Call PostgreSQL CPM function
    const { data, error } = await supabase
      .rpc('calculate_critical_path', {
        p_project_id: projectId,
        p_update_tasks: updateTasks
      });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error calculating critical path:', error);
    throw error;
  }
}

/**
 * Calculate and update critical path for a project (Legacy - calls calculateCriticalPath)
 * @param {string} projectId - Project ID
 * @returns {Promise<Array>} Array of task IDs on critical path
 */
export async function updateCriticalPath(projectId) {
  try {
    const cpmResults = await calculateCriticalPath(projectId, true);
    const criticalTaskIds = cpmResults
      .filter(result => result.is_critical)
      .map(result => result.task_id);

    return criticalTaskIds;
  } catch (error) {
    console.error('Error updating critical path:', error);
    throw error;
  }
}

/**
 * Get only critical path tasks
 * @param {string} projectId - Project ID
 * @returns {Promise<Array>} Array of critical path tasks
 */
export async function getCriticalPathTasks(projectId) {
  try {
    const { data, error } = await supabase
      .rpc('get_critical_path_tasks', {
        p_project_id: projectId
      });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting critical path tasks:', error);
    throw error;
  }
}

/**
 * Calculate project duration based on CPM
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Project duration info
 */
export async function calculateProjectDuration(projectId) {
  try {
    const { data, error } = await supabase
      .rpc('calculate_project_duration', {
        p_project_id: projectId
      });

    if (error) throw error;

    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('Error calculating project duration:', error);
    throw error;
  }
}

/**
 * Check if a dependency would create a circular reference
 * @param {string} sourceTaskId - Source task ID
 * @param {string} targetTaskId - Target task ID
 * @returns {Promise<boolean>} True if circular dependency exists
 */
export async function hasCircularDependency(sourceTaskId, targetTaskId) {
  try {
    const { data, error } = await supabase
      .rpc('has_circular_dependency', {
        p_source_task_id: sourceTaskId,
        p_target_task_id: targetTaskId
      });

    if (error) throw error;

    return data || false;
  } catch (error) {
    console.error('Error checking circular dependency:', error);
    throw error;
  }
}

/**
 * Set baseline dates for a task
 * @param {string} taskId - Task ID
 * @returns {Promise<Object>} Updated task
 */
export async function setTaskBaseline(taskId) {
  try {
    // First, get current task dates
    const { data: task, error: fetchError } = await supabase
      .from('tasks')
      .select('start_date, due_date')
      .eq('id', taskId)
      .single();

    if (fetchError) throw fetchError;

    // Set baseline to current dates
    const { data, error } = await supabase
      .from('tasks')
      .update({
        baseline_start_date: task.start_date,
        baseline_end_date: task.due_date,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error setting task baseline:', error);
    throw error;
  }
}

/**
 * Set baseline dates for all tasks in a project
 * @param {string} projectId - Project ID
 * @returns {Promise<number>} Number of tasks updated
 */
export async function setProjectBaseline(projectId) {
  try {
    // Get all tasks for the project
    const { data: tasks, error: fetchError } = await supabase
      .from('tasks')
      .select('id, start_date, due_date')
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .not('start_date', 'is', null)
      .not('due_date', 'is', null);

    if (fetchError) throw fetchError;

    // Update each task's baseline
    const updates = tasks.map(task =>
      supabase
        .from('tasks')
        .update({
          baseline_start_date: task.start_date,
          baseline_end_date: task.due_date,
          updated_at: new Date().toISOString()
        })
        .eq('id', task.id)
    );

    await Promise.all(updates);

    return tasks.length;
  } catch (error) {
    console.error('Error setting project baseline:', error);
    throw error;
  }
}

/**
 * Save Gantt settings for a user/project
 * @param {string} userId - User ID
 * @param {string} projectId - Project ID (null for global settings)
 * @param {Object} settings - Settings object
 * @returns {Promise<Object>} Saved settings
 */
export async function saveGanttSettings(userId, projectId, settings) {
  try {
    const { data, error } = await supabase
      .from('gantt_settings')
      .upsert({
        user_id: userId,
        project_id: projectId,
        ...settings,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,project_id'
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error saving Gantt settings:', error);
    throw error;
  }
}

/**
 * Load Gantt settings for a user/project
 * @param {string} userId - User ID
 * @param {string} projectId - Project ID (null for global settings)
 * @returns {Promise<Object>} Settings object
 */
export async function loadGanttSettings(userId, projectId) {
  try {
    const { data, error } = await supabase
      .from('gantt_settings')
      .select('*')
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }

    // Return default settings if none found
    return data || {
      default_view_mode: 'Week',
      show_critical_path: true,
      show_baselines: false,
      show_progress: true,
      show_resources: true,
      show_dependencies: true,
      show_milestones: true
    };
  } catch (error) {
    console.error('Error loading Gantt settings:', error);
    throw error;
  }
}

/**
 * Fetch project milestones
 * @param {string} projectId - Project ID
 * @returns {Promise<Array>} Array of milestones
 */
export async function fetchProjectMilestones(projectId) {
  try {
    const { data, error } = await supabase
      .from('project_milestones')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .order('milestone_date', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching project milestones:', error);
    throw error;
  }
}

/**
 * Create a project milestone
 * @param {Object} milestone - Milestone data
 * @returns {Promise<Object>} Created milestone
 */
export async function createProjectMilestone(milestone) {
  try {
    const { data, error } = await supabase
      .from('project_milestones')
      .insert(milestone)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error creating project milestone:', error);
    throw error;
  }
}

/**
 * Update a project milestone
 * @param {string} milestoneId - Milestone ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated milestone
 */
export async function updateProjectMilestone(milestoneId, updates) {
  try {
    const { data, error } = await supabase
      .from('project_milestones')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', milestoneId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error updating project milestone:', error);
    throw error;
  }
}

/**
 * Delete a project milestone (soft delete)
 * @param {string} milestoneId - Milestone ID
 * @returns {Promise<void>}
 */
export async function deleteProjectMilestone(milestoneId) {
  try {
    const { error } = await supabase
      .from('project_milestones')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString()
      })
      .eq('id', milestoneId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting project milestone:', error);
    throw error;
  }
}

export default {
  fetchGanttData,
  updateTaskDates,
  createDependency,
  updateDependency,
  deleteDependency,
  fetchProjectDependencies,
  calculateCriticalPath,
  updateCriticalPath,
  getCriticalPathTasks,
  calculateProjectDuration,
  hasCircularDependency,
  setTaskBaseline,
  setProjectBaseline,
  saveGanttSettings,
  loadGanttSettings,
  fetchProjectMilestones,
  createProjectMilestone,
  updateProjectMilestone,
  deleteProjectMilestone
};
