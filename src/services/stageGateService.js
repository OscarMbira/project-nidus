/**
 * Stage Gate Service
 *
 * Handles stage/phase gate management for PMO oversight
 * Includes document governance compliance checks
 */

import { platformDb } from './supabase/supabaseClient';
import { logAction } from './pmoAuditService';
import { checkStageGateRequirements } from './documentGovernanceService';

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
 * Check stage gate document compliance
 * Calls database function to validate if gate can be approved
 * @param {string} gateId - Stage gate/boundary ID
 * @returns {Promise<Object>} Compliance result with blocking status
 */
export async function checkGateDocumentCompliance(gateId) {
  try {
    const complianceResult = await checkStageGateRequirements(gateId);

    if (!complianceResult) {
      return {
        success: true,
        can_approve: true,
        blocking_reason: null,
        missing_documents_count: 0,
        unapproved_documents_count: 0,
        missing_documents: [],
        unapproved_documents: []
      };
    }

    return {
      success: true,
      can_approve: complianceResult.can_approve,
      blocking_reason: complianceResult.blocking_reason,
      missing_documents_count: complianceResult.missing_documents_count,
      unapproved_documents_count: complianceResult.unapproved_documents_count,
      missing_documents: complianceResult.missing_documents || [],
      unapproved_documents: complianceResult.unapproved_documents || []
    };
  } catch (error) {
    console.error('Error checking gate document compliance:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Approve stage gate (with document compliance check)
 * @param {string} gateId - Gate ID
 * @param {string} actorUserId - User approving the gate
 * @param {string} notes - Approval notes
 * @param {boolean} bypassCompliance - Set to true to bypass document compliance (PMO Admin only)
 * @returns {Promise<Object>} Updated gate
 */
export async function approveStageGate(gateId, actorUserId, notes = null, bypassCompliance = false) {
  try {
    // Check document compliance before approving
    if (!bypassCompliance) {
      const complianceCheck = await checkGateDocumentCompliance(gateId);

      if (!complianceCheck.success) {
        return {
          success: false,
          error: 'Failed to check document compliance'
        };
      }

      if (!complianceCheck.can_approve) {
        return {
          success: false,
          error: 'Stage gate cannot be approved due to document compliance issues',
          compliance_blocked: true,
          blocking_reason: complianceCheck.blocking_reason,
          missing_documents: complianceCheck.missing_documents,
          unapproved_documents: complianceCheck.unapproved_documents
        };
      }
    }

    // Proceed with approval
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
      `Approved stage gate: ${data.stage_name}${bypassCompliance ? ' (compliance bypassed)' : ''}`, {
      gate_id: gateId,
      stage_name: data.stage_name,
      notes: notes,
      bypassed_compliance: bypassCompliance
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

/**
 * Block stage gate due to document compliance issues
 * @param {string} gateId - Gate ID
 * @param {string} reason - Blocking reason
 * @param {string} actorUserId - User blocking the gate
 * @returns {Promise<Object>} Updated gate
 */
export async function blockStageGate(gateId, reason, actorUserId) {
  try {
    const { data, error } = await platformDb
      .from('stage_gates')
      .update({
        gate_status: 'BLOCKED',
        is_blocked: true,
        blocked_reason: reason,
        updated_by: actorUserId,
        updated_at: new Date().toISOString()
      })
      .eq('id', gateId)
      .eq('is_deleted', false)
      .select()
      .single();

    if (error) throw error;

    // Log action
    await logAction(actorUserId, 'BLOCK_STAGE_GATE', 'STAGE_GATE', gateId,
      `Blocked stage gate due to document compliance: ${data.stage_name}`, {
      gate_id: gateId,
      stage_name: data.stage_name,
      blocking_reason: reason
    });

    return { success: true, data };
  } catch (error) {
    console.error('Error blocking stage gate:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Raise document compliance exception
 * @param {string} projectId - Project ID
 * @param {object} details - Exception details
 * @param {string} actorUserId - User raising the exception
 * @returns {Promise<Object>} Created exception
 */
export async function raiseDocumentComplianceException(projectId, details, actorUserId) {
  try {
    // Import exception service dynamically
    const { createException } = await import('./exceptionService');

    const exceptionData = {
      project_id: projectId,
      exception_type: 'DOCUMENT_COMPLIANCE',
      title: details.title || 'Document Compliance Issue',
      description: details.description || 'Mandatory documents are missing or not approved',
      severity: details.severity || 'HIGH',
      status: 'OPEN',
      details: {
        missing_documents: details.missing_documents || [],
        unapproved_documents: details.unapproved_documents || [],
        stage_code: details.stage_code,
        stage_name: details.stage_name
      },
      raised_by: actorUserId
    };

    const result = await createException(exceptionData, actorUserId);

    // Log action
    await logAction(actorUserId, 'RAISE_DOCUMENT_COMPLIANCE_EXCEPTION', 'EXCEPTION', result.data?.id,
      `Raised document compliance exception for project`, {
      project_id: projectId,
      exception_id: result.data?.id,
      details: exceptionData.details
    });

    return result;
  } catch (error) {
    console.error('Error raising document compliance exception:', error);
    return { success: false, error: error.message };
  }
}

export default {
  getStageGates,
  getOverdueGates,
  createStageGate,
  updateStageGate,
  checkGateDocumentCompliance,
  approveStageGate,
  rejectStageGate,
  flagOverdueGate,
  escalateGate,
  blockStageGate,
  raiseDocumentComplianceException
};
