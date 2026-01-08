/**
 * PMO Audit Service
 *
 * Handles PMO-specific audit logging to pmo_audit_log table
 * Separate from general audit_events logging
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * Log PMO action to audit trail
 * @param {string} actorUserId - User performing the action
 * @param {string} action - Action type (e.g., CREATE_PROJECT, ASSIGN_PM)
 * @param {string} entityType - Entity type (PROJECT, PROGRAMME, STAGE_GATE, etc.)
 * @param {string} entityId - Entity ID
 * @param {string} actionDescription - Human-readable description
 * @param {object} payload - Additional action details (JSON)
 * @returns {Promise<string>} Log ID
 */
export async function logAction(actorUserId, action, entityType, entityId, actionDescription = null, payload = null) {
  try {
    // Call database function (uses platformDb client)
    const { data, error } = await platformDb.rpc('log_pmo_action', {
      p_actor_user_id: actorUserId,
      p_action: action,
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_action_description: actionDescription,
      p_payload: payload
    });

    if (error) throw error;

    return data; // Returns log_id
  } catch (error) {
    console.error('Error logging PMO action:', error);
    // Don't throw - audit logging should not break the main operation
    return null;
  }
}

/**
 * Get PMO audit log with filters
 * @param {object} filters - Filter options
 * @returns {Promise<Object>} Audit log entries
 */
export async function getAuditLog(filters = {}) {
  try {
    let query = platformDb
      .from('pmo_audit_log')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.actorUserId) {
      query = query.eq('actor_user_id', filters.actorUserId);
    }

    if (filters.action) {
      query = query.eq('action', filters.action);
    }

    if (filters.actionCategory) {
      query = query.eq('action_category', filters.actionCategory);
    }

    if (filters.entityType) {
      query = query.eq('entity_type', filters.entityType);
    }

    if (filters.entityId) {
      query = query.eq('entity_id', filters.entityId);
    }

    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate);
    }

    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    } else {
      query = query.limit(100); // Default limit
    }

    const { data, error } = await query;

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error getting audit log:', error);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * Get actions by user
 * @param {string} userId - User ID
 * @param {number} limit - Number of actions to return
 * @returns {Promise<Object>} User actions
 */
export async function getActionsByUser(userId, limit = 50) {
  try {
    const { data, error } = await platformDb
      .from('pmo_audit_log')
      .select('*')
      .eq('actor_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error getting actions by user:', error);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * Get actions for an entity
 * @param {string} entityType - Entity type
 * @param {string} entityId - Entity ID
 * @returns {Promise<Object>} Entity actions
 */
export async function getActionsByEntity(entityType, entityId) {
  try {
    const { data, error } = await platformDb
      .from('pmo_audit_log')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error getting actions by entity:', error);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * Get recent PMO actions (for dashboard activity feed)
 * @param {number} limit - Number of actions to return
 * @returns {Promise<Object>} Recent actions
 */
export async function getRecentActions(limit = 20) {
  try {
    const { data, error } = await platformDb
      .from('pmo_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error getting recent actions:', error);
    return { success: false, error: error.message, data: [] };
  }
}

export default {
  logAction,
  getAuditLog,
  getActionsByUser,
  getActionsByEntity,
  getRecentActions
};
