/**
 * Exception Service
 *
 * Handles project exception management for PMO oversight
 */

import { platformDb } from './supabase/supabaseClient';
import { logAction } from './pmoAuditService';

/**
 * Get all exceptions with filters
 * @param {string} accountId - Organization/Account ID
 * @param {object} filters - Optional filters
 * @returns {Promise<Object>} List of exceptions
 */
export async function getAllExceptions(accountId, filters = {}) {
  try {
    // First get projects for this account
    const { data: projects, error: projError } = await platformDb
      .from('projects')
      .select('id')
      .eq('account_id', accountId)
      .eq('is_deleted', false);

    if (projError) throw projError;

    if (!projects || projects.length === 0) {
      return { success: true, data: [] };
    }

    const projectIds = projects.map(p => p.id);

    // Query exceptions for these projects
    let query = platformDb
      .from('exceptions')
      .select(`
        *,
        project:project_id(id, project_name, health_status),
        raised_by_user:raised_by(id, full_name, email),
        escalated_to_user:escalated_to(id, full_name, email)
      `)
      .in('project_id', projectIds)
      .eq('is_deleted', false)
      .order('raised_at', { ascending: false });

    // Apply filters
    if (filters.status) {
      query = query.eq('exception_status', filters.status);
    }

    if (filters.level) {
      query = query.eq('exception_level', filters.level);
    }

    if (filters.category) {
      query = query.eq('exception_category', filters.category);
    }

    if (filters.projectId) {
      query = query.eq('project_id', filters.projectId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error getting exceptions:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get exception by ID
 * @param {string} exceptionId - Exception ID
 * @returns {Promise<Object>} Exception details
 */
export async function getExceptionById(exceptionId) {
  try {
    const { data, error } = await platformDb
      .from('exceptions')
      .select(`
        *,
        project:project_id(id, project_name, health_status),
        raised_by_user:raised_by(id, full_name, email),
        escalated_to_user:escalated_to(id, full_name, email),
        resolved_by_user:resolved_by(id, full_name, email)
      `)
      .eq('id', exceptionId)
      .eq('is_deleted', false)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error getting exception:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Raise new exception
 * @param {object} exceptionData - Exception data
 * @param {string} actorUserId - User raising the exception
 * @returns {Promise<Object>} Created exception
 */
export async function raiseException(exceptionData, actorUserId) {
  try {
    const { data, error } = await platformDb
      .from('exceptions')
      .insert([{
        project_id: exceptionData.project_id,
        exception_title: exceptionData.exception_title,
        exception_reason: exceptionData.exception_reason,
        exception_description: exceptionData.exception_description,
        exception_level: exceptionData.exception_level,
        exception_category: exceptionData.exception_category,
        exception_status: 'OPEN',
        raised_by: actorUserId,
        impact_on_schedule: exceptionData.impact_on_schedule || false,
        impact_on_budget: exceptionData.impact_on_budget || false,
        impact_on_scope: exceptionData.impact_on_scope || false,
        impact_on_quality: exceptionData.impact_on_quality || false,
        estimated_delay_days: exceptionData.estimated_delay_days,
        estimated_cost_impact: exceptionData.estimated_cost_impact,
        created_by: actorUserId
      }])
      .select()
      .single();

    if (error) throw error;

    // Get project name for audit log
    const { data: project } = await platformDb
      .from('projects')
      .select('project_name')
      .eq('id', exceptionData.project_id)
      .single();

    // Log action
    await logAction(actorUserId, 'RAISE_EXCEPTION', 'EXCEPTION', data.id,
      `Raised ${exceptionData.exception_level} exception on project "${project?.project_name}": ${exceptionData.exception_title}`, {
      exception_id: data.id,
      project_id: exceptionData.project_id,
      project_name: project?.project_name,
      exception_level: exceptionData.exception_level,
      exception_title: exceptionData.exception_title
    });

    return { success: true, data };
  } catch (error) {
    console.error('Error raising exception:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Escalate exception
 * @param {string} exceptionId - Exception ID
 * @param {object} escalationData - Escalation data
 * @param {string} actorUserId - User escalating the exception
 * @returns {Promise<Object>} Updated exception
 */
export async function escalateException(exceptionId, escalationData, actorUserId) {
  try {
    const { data, error } = await platformDb
      .from('exceptions')
      .update({
        exception_status: 'ESCALATED',
        escalated_to: escalationData.escalated_to,
        escalated_at: new Date().toISOString(),
        escalation_notes: escalationData.escalation_notes,
        updated_by: actorUserId,
        updated_at: new Date().toISOString()
      })
      .eq('id', exceptionId)
      .eq('is_deleted', false)
      .select()
      .single();

    if (error) throw error;

    // Get user name for audit log
    const { data: escalatedTo } = await platformDb
      .from('users')
      .select('full_name')
      .eq('id', escalationData.escalated_to)
      .single();

    // Log action
    await logAction(actorUserId, 'ESCALATE_EXCEPTION', 'EXCEPTION', exceptionId,
      `Escalated exception to ${escalatedTo?.full_name}`, {
      exception_id: exceptionId,
      escalated_to_user_id: escalationData.escalated_to,
      escalated_to_name: escalatedTo?.full_name,
      escalation_notes: escalationData.escalation_notes
    });

    return { success: true, data };
  } catch (error) {
    console.error('Error escalating exception:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Resolve exception
 * @param {string} exceptionId - Exception ID
 * @param {object} resolutionData - Resolution data
 * @param {string} actorUserId - User resolving the exception
 * @returns {Promise<Object>} Updated exception
 */
export async function resolveException(exceptionId, resolutionData, actorUserId) {
  try {
    const { data, error } = await platformDb
      .from('exceptions')
      .update({
        exception_status: 'RESOLVED',
        resolved_by: actorUserId,
        resolved_at: new Date().toISOString(),
        resolution_notes: resolutionData.resolution_notes,
        updated_by: actorUserId,
        updated_at: new Date().toISOString()
      })
      .eq('id', exceptionId)
      .eq('is_deleted', false)
      .select()
      .single();

    if (error) throw error;

    // Log action
    await logAction(actorUserId, 'RESOLVE_EXCEPTION', 'EXCEPTION', exceptionId,
      `Resolved exception`, {
      exception_id: exceptionId,
      resolution_notes: resolutionData.resolution_notes
    });

    return { success: true, data };
  } catch (error) {
    console.error('Error resolving exception:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Close exception
 * @param {string} exceptionId - Exception ID
 * @param {string} actorUserId - User closing the exception
 * @returns {Promise<Object>} Updated exception
 */
export async function closeException(exceptionId, actorUserId) {
  try {
    const { data, error} = await platformDb
      .from('exceptions')
      .update({
        exception_status: 'CLOSED',
        closed_by: actorUserId,
        closed_at: new Date().toISOString(),
        updated_by: actorUserId,
        updated_at: new Date().toISOString()
      })
      .eq('id', exceptionId)
      .eq('is_deleted', false)
      .select()
      .single();

    if (error) throw error;

    // Log action
    await logAction(actorUserId, 'CLOSE_EXCEPTION', 'EXCEPTION', exceptionId,
      `Closed exception`, {
      exception_id: exceptionId
    });

    return { success: true, data };
  } catch (error) {
    console.error('Error closing exception:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get projects in exception
 * @param {string} accountId - Account ID
 * @returns {Promise<Object>} Projects with open exceptions
 */
export async function getProjectsInException(accountId) {
  try {
    // Get projects for this account
    const { data: projects, error: projError } = await platformDb
      .from('projects')
      .select('id, project_name, health_status')
      .eq('account_id', accountId)
      .eq('is_deleted', false);

    if (projError) throw projError;

    if (!projects || projects.length === 0) {
      return { success: true, data: [] };
    }

    const projectIds = projects.map(p => p.id);

    // Get exceptions for these projects
    const { data: exceptions, error: excError } = await platformDb
      .from('exceptions')
      .select('project_id, exception_level, exception_status')
      .in('project_id', projectIds)
      .in('exception_status', ['OPEN', 'ESCALATED', 'UNDER_REVIEW'])
      .eq('is_deleted', false);

    if (excError) throw excError;

    // Count exceptions per project
    const exceptionCounts = {};
    exceptions?.forEach(exc => {
      if (!exceptionCounts[exc.project_id]) {
        exceptionCounts[exc.project_id] = { total: 0, critical: 0, high: 0 };
      }
      exceptionCounts[exc.project_id].total++;
      if (exc.exception_level === 'CRITICAL') {
        exceptionCounts[exc.project_id].critical++;
      } else if (exc.exception_level === 'HIGH') {
        exceptionCounts[exc.project_id].high++;
      }
    });

    // Filter projects with exceptions
    const projectsWithExceptions = projects
      .filter(p => exceptionCounts[p.id])
      .map(p => ({
        ...p,
        exception_count: exceptionCounts[p.id].total,
        critical_exception_count: exceptionCounts[p.id].critical,
        high_exception_count: exceptionCounts[p.id].high
      }));

    return { success: true, data: projectsWithExceptions };
  } catch (error) {
    console.error('Error getting projects in exception:', error);
    return { success: false, error: error.message };
  }
}

export default {
  getAllExceptions,
  getExceptionById,
  raiseException,
  escalateException,
  resolveException,
  closeException,
  getProjectsInException
};
