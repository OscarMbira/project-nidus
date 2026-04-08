/**
 * Project Service
 * Provides project management functionality
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * Strip characters that break or widen PostgREST `ilike` filters.
 * @param {string} raw
 * @returns {string}
 */
export function sanitizeProjectSearchTerm(raw) {
  if (raw == null || typeof raw !== 'string') return '';
  return raw.trim().replace(/%/g, '').replace(/\\/g, '').replace(/_/g, ' ').replace(/,/g, ' ');
}

/**
 * Get user's projects (projects they're assigned to)
 * Single round-trip via user_projects → projects embed (no N+1).
 * @param {string} userId - User ID
 * @param {Object} filters - Filter options (status_id; search is applied client-side when set)
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<Object>} Projects data
 */
export async function getMyProjects(userId, filters = {}, options = {}) {
  try {
    let query = platformDb
      .from('user_projects')
      .select(`
        projects!inner (
          id,
          project_name,
          project_code,
          project_description,
          status_id,
          project_statuses (status_name, status_color),
          planned_start_date,
          planned_end_date,
          actual_start_date,
          actual_end_date,
          health_status,
          percentage_complete,
          created_at,
          is_deleted
        )
      `)
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .eq('projects.is_deleted', false);

    if (options.signal) {
      query = query.abortSignal(options.signal);
    }

    const { data: rows, error } = await query;

    if (error) throw error;

    const seen = new Map();
    for (const row of rows || []) {
      const p = row.projects;
      if (p?.id && !seen.has(p.id)) {
        seen.set(p.id, p);
      }
    }

    let projects = Array.from(seen.values());
    projects.sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    });

    if (filters.status_id) {
      projects = projects.filter((p) => p.status_id === filters.status_id);
    }

    if (filters.search) {
      const t = sanitizeProjectSearchTerm(filters.search).toLowerCase();
      if (t) {
        projects = projects.filter(
          (p) =>
            p.project_name?.toLowerCase().includes(t) ||
            p.project_description?.toLowerCase().includes(t) ||
            p.project_code?.toLowerCase().includes(t)
        );
      }
    }

    return { success: true, data: projects };
  } catch (error) {
    if (error?.name === 'AbortError') {
      return { success: false, aborted: true, error: error.message };
    }
    console.error('Error getting my projects:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all projects for an organization
 * @param {string} organizationId - Account ID
 * @param {Object} filters - Filter options
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<Object>} Projects data
 */
export async function getAllProjects(organizationId, filters = {}, options = {}) {
  try {
    let query = platformDb
      .from('projects')
      .select(`
        id,
        project_name,
        project_code,
        project_description,
        status_id,
        project_statuses(status_name, status_color),
        planned_start_date,
        planned_end_date,
        actual_start_date,
        actual_end_date,
        health_status,
        percentage_complete,
        owner_user_id,
        created_at
      `)
      .eq('account_id', organizationId)
      .eq('is_deleted', false);

    if (filters.status_id) {
      query = query.eq('status_id', filters.status_id);
    }

    if (filters.search) {
      const term = sanitizeProjectSearchTerm(filters.search);
      if (term.length > 0) {
        query = query.or(
          `project_name.ilike.%${term}%,project_description.ilike.%${term}%,project_code.ilike.%${term}%`
        );
      }
    }

    if (filters.sortColumn) {
      query = query.order(filters.sortColumn, {
        ascending: filters.sortAscending !== false,
      });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    if (options.signal) {
      query = query.abortSignal(options.signal);
    }

    const { data: projects, error } = await query;

    if (error) throw error;

    return { success: true, data: projects || [] };
  } catch (error) {
    if (error?.name === 'AbortError') {
      return { success: false, aborted: true, error: error.message };
    }
    console.error('Error getting all projects:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get project detail
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Project detail
 */
export async function getProjectDetail(projectId) {
  try {
    const { data: project, error } = await platformDb
      .from('projects')
      .select(`
        *,
        project_statuses(status_name, status_color),
        project_types(type_name),
        owner_user:owner_user_id(id, full_name, email)
      `)
      .eq('id', projectId)
      .eq('is_deleted', false)
      .single();

    if (error) throw error;

    return { success: true, data: project };
  } catch (error) {
    console.error('Error getting project detail:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create a new project
 * @param {Object} projectData - Project data
 * @returns {Promise<Object>} Created project
 */
export async function createProject(projectData) {
  try {
    const { data, error } = await platformDb
      .from('projects')
      .insert({
        project_name: projectData.project_name,
        project_code: projectData.project_code,
        project_description: projectData.project_description,
        account_id: projectData.account_id,
        owner_user_id: projectData.owner_user_id,
        status_id: projectData.status_id,
        project_type_id: projectData.project_type_id,
        planned_start_date: projectData.planned_start_date,
        planned_end_date: projectData.planned_end_date,
        budget_amount: projectData.budget_amount,
        is_active: true,
        // Phase 1: Intake lifecycle fields
        intake_status: projectData.intake_status || 'draft',
        created_by_user_id: projectData.created_by_user_id
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error creating project:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update project
 * @param {string} projectId - Project ID
 * @param {Object} projectData - Updated project data
 * @returns {Promise<Object>} Updated project
 */
export async function updateProject(projectId, projectData) {
  try {
    const { data, error } = await platformDb
      .from('projects')
      .update({
        ...projectData,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating project:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete project (soft delete)
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Result
 */
export async function deleteProject(projectId) {
  try {
    const { error } = await platformDb
      .from('projects')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString()
      })
      .eq('id', projectId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting project:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Archive project
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Result
 */
export async function archiveProject(projectId) {
  try {
    // This would move project to project_archives table
    // For now, just mark as archived
    const { error } = await platformDb
      .from('projects')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error archiving project:', error);
    return { success: false, error: error.message };
  }
}

