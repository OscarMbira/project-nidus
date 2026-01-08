/**
 * Stage Gate Service
 *
 * Handles stage/phase gate management for PMO oversight
 */

import { platformDb } from './supabase/supabaseClient';
import { logAction } from './pmoAuditService';

/**
 * Get all stage gates with filters
 * @param {string} accountId - Account ID
 * @param {object} filters - Optional filters
 * @returns {Promise<Object>} List of stage gates
 */
export async function getStageGates(accountId, filters = {}) {
  try {
    // Get projects for this account
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

    // Query stage gates
    let query = platformDb
      .from('stage_gates')
      .select(`
        *,
        project:project_id(id, project_name, health_status),
        gate_owner:gate_owner_user_id(id, full_name, email),
        approved_by_user:approved_by(id, full_name, email)
      `)
      .in('project_id', projectIds)
      .eq('is_deleted', false)
      .order('gate_date', { ascending: true });

    // Apply filters
    if (filters.status) {
      query = query.eq('gate_status', filters.status);
    }

    if (filters.is_overdue !== undefined) {
      query = query.eq('is_overdue', filters.is_overdue);
    }

    if (filters.projectId) {
      query = query.eq('project_id', filters.projectId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error getting stage gates:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get overdue gates
 * @param {string} accountId - Account ID
 * @returns {Promise<Object>} Overdue gates
 */
export async function getOverdueGates(accountId) {
  try {
    const result = await getStageGates(accountId, { is_overdue: true });
    return result;
  } catch (error) {
    console.error('Error getting overdue gates:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create stage gate
 * @param {object} gateData - Gate data
 * @param {string} actorUserId - User creating the gate
 * @returns {Promise<Object>} Created gate
 */
export async function createStageGate(gateData, actorUserId) {
  try {
    const { data, error } = await platformDb
      .from('stage_gates')
      .insert([{
        ...gateData,
        gate_status: gateData.gate_status || 'PENDING',
        created_by: actorUserId
      }])
      .select()
      .single();

    if (error) throw error;

    // Log action
    await logAction(actorUserId, 'CREATE_STAGE_GATE', 'STAGE_GATE', data.id,
      `Created stage gate: ${data.stage_name}`, {
      gate_id: data.id,
      project_id: gateData.project_id,
      stage_name: data.stage_name
    });

    return { success: true, data };
  } catch (error) {
    console.error('Error creating stage gate:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update stage gate
 * @param {string} gateId - Gate ID
 * @param {object} updates - Gate updates
 * @param {string} actorUserId - User updating the gate
 * @returns {Promise<Object>} Updated gate
 */
export async function updateStageGate(gateId, updates, actorUserId) {
  try {
    const { data, error } = await platformDb
      .from('stage_gates')
      .update({
        ...updates,
        updated_by: actorUserId,
        updated_at: new Date().toISOString()
      })
      .eq('id', gateId)
      .eq('is_deleted', false)
      .select()
      .single();

    if (error) throw error;

    // Log action
    await logAction(actorUserId, 'UPDATE_STAGE_GATE', 'STAGE_GATE', gateId,
      `Updated stage gate: ${data.stage_name}`, {
      gate_id: gateId,
      updates: Object.keys(updates)
    });

    return { success: true, data };
  } catch (error) {
    console.error('Error updating stage gate:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Approve stage gate
 * @param {string} gateId - Gate ID
 * @param {string} actorUserId - User approving the gate
 * @param {string} notes - Approval notes
 * @returns {Promise<Object>} Updated gate
 */
export async function approveStageGate(gateId, actorUserId, notes = null) {
  try {
    const { data, error } = await platformDb
      .from('stage_gates')
      .update({
        gate_status: 'APPROVED',
        approved_by: actorUserId,
        approved_at: new Date().toISOString(),
        is_overdue: false,
        updated_by: actorUserId,
        updated_at: new Date().toISOString()
      })
      .eq('id', gateId)
      .eq('is_deleted', false)
      .select()
      .single();

    if (error) throw error;

    // Log action
    await logAction(actorUserId, 'APPROVE_STAGE_GATE', 'STAGE_GATE', gateId,
      `Approved stage gate: ${data.stage_name}`, {
      gate_id: gateId,
      stage_name: data.stage_name,
      notes: notes
    });

    return { success: true, data };
  } catch (error) {
    console.error('Error approving stage gate:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Reject stage gate
 * @param {string} gateId - Gate ID
 * @param {string} actorUserId - User rejecting the gate
 * @param {string} reason - Rejection reason
 * @returns {Promise<Object>} Updated gate
 */
export async function rejectStageGate(gateId, actorUserId, reason) {
  try {
    const { data, error } = await platformDb
      .from('stage_gates')
      .update({
        gate_status: 'REJECTED',
        rejected_by: actorUserId,
        rejected_at: new Date().toISOString(),
        rejection_reason: reason,
        updated_by: actorUserId,
        updated_at: new Date().toISOString()
      })
      .eq('id', gateId)
      .eq('is_deleted', false)
      .select()
      .single();

    if (error) throw error;

    // Log action
    await logAction(actorUserId, 'REJECT_STAGE_GATE', 'STAGE_GATE', gateId,
      `Rejected stage gate: ${data.stage_name}`, {
      gate_id: gateId,
      stage_name: data.stage_name,
      rejection_reason: reason
    });

    return { success: true, data };
  } catch (error) {
    console.error('Error rejecting stage gate:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Flag gate as overdue
 * @param {string} gateId - Gate ID
 * @param {string} actorUserId - User flagging the gate
 * @returns {Promise<Object>} Updated gate
 */
export async function flagOverdueGate(gateId, actorUserId) {
  try {
    const { data, error } = await platformDb
      .from('stage_gates')
      .update({
        is_overdue: true,
        gate_status: 'OVERDUE',
        updated_by: actorUserId,
        updated_at: new Date().toISOString()
      })
      .eq('id', gateId)
      .eq('is_deleted', false)
      .select()
      .single();

    if (error) throw error;

    // Log action
    await logAction(actorUserId, 'FLAG_OVERDUE_GATE', 'STAGE_GATE', gateId,
      `Flagged stage gate as overdue: ${data.stage_name}`, {
      gate_id: gateId,
      stage_name: data.stage_name
    });

    return { success: true, data };
  } catch (error) {
    console.error('Error flagging overdue gate:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Escalate gate
 * @param {string} gateId - Gate ID
 * @param {string} actorUserId - User escalating the gate
 * @param {string} escalationNotes - Escalation notes
 * @returns {Promise<Object>} Updated gate
 */
export async function escalateGate(gateId, actorUserId, escalationNotes) {
  try {
    const { data, error } = await platformDb
      .from('stage_gates')
      .update({
        gate_status: 'ESCALATED',
        updated_by: actorUserId,
        updated_at: new Date().toISOString()
      })
      .eq('id', gateId)
      .eq('is_deleted', false)
      .select()
      .single();

    if (error) throw error;

    // Log action
    await logAction(actorUserId, 'ESCALATE_STAGE_GATE', 'STAGE_GATE', gateId,
      `Escalated stage gate: ${data.stage_name}`, {
      gate_id: gateId,
      stage_name: data.stage_name,
      escalation_notes: escalationNotes
    });

    return { success: true, data };
  } catch (error) {
    console.error('Error escalating gate:', error);
    return { success: false, error: error.message };
  }
}

export default {
  getStageGates,
  getOverdueGates,
  createStageGate,
  updateStageGate,
  approveStageGate,
  rejectStageGate,
  flagOverdueGate,
  escalateGate
};
