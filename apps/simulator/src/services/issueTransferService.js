import { supabase } from './supabaseClient';

/**
 * Issue Transfer Service - API functions for transferring issues
 * Handles transfers between Issue Register and Risk Register, and Change Requests
 */

/**
 * Transfer an issue to Risk Register
 * @param {string} issueId - Issue ID
 * @param {Object} riskData - Optional additional risk data
 * @returns {Promise<Object>} Created risk
 */
export async function transferToRisk(issueId, riskData = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Call database function to transfer issue to risk
    const { data: riskId, error } = await supabase.rpc('transfer_issue_to_risk', {
      p_issue_id: issueId,
      p_user_id: user.id
    });

    if (error) throw error;

    // If additional risk data provided, update the risk
    if (Object.keys(riskData).length > 0) {
      await supabase
        .from('risks')
        .update(riskData)
        .eq('id', riskId);
    }

    // Fetch the created risk
    const { data: risk, error: fetchError } = await supabase
      .from('risks')
      .select('*')
      .eq('id', riskId)
      .single();

    if (fetchError) throw fetchError;

    return risk;
  } catch (error) {
    console.error('Error transferring issue to risk:', error);
    throw error;
  }
}

/**
 * Create an issue from a materialized risk
 * @param {string} riskId - Risk ID
 * @returns {Promise<Object>} Created issue
 */
export async function createFromRisk(riskId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Call database function to create issue from risk
    const { data: issueId, error } = await supabase.rpc('create_issue_from_risk', {
      p_risk_id: riskId,
      p_user_id: user.id
    });

    if (error) throw error;

    // Fetch the created issue
    const { data: issue, error: fetchError } = await supabase
      .from('issues')
      .select('*')
      .eq('id', issueId)
      .single();

    if (fetchError) throw fetchError;

    return issue;
  } catch (error) {
    console.error('Error creating issue from risk:', error);
    throw error;
  }
}

/**
 * Create a Change Request from an RFC issue
 * @param {string} issueId - Issue ID (must be a Request for Change)
 * @returns {Promise<Object>} Created change request
 */
export async function createChangeRequest(issueId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Verify issue is an RFC
    const { data: issue } = await supabase
      .from('issues')
      .select('issue_type')
      .eq('id', issueId)
      .single();

    if (!issue || issue.issue_type !== 'request_for_change') {
      throw new Error('Issue must be a Request for Change to create a Change Request');
    }

    // Call database function to create change request from RFC
    const { data: changeRequestId, error } = await supabase.rpc('create_change_request_from_rfc', {
      p_issue_id: issueId,
      p_user_id: user.id
    });

    if (error) throw error;

    // Fetch the created change request
    const { data: changeRequest, error: fetchError } = await supabase
      .from('change_requests')
      .select('*')
      .eq('id', changeRequestId)
      .single();

    if (fetchError) throw fetchError;

    return changeRequest;
  } catch (error) {
    console.error('Error creating change request from RFC:', error);
    throw error;
  }
}

/**
 * Link an issue to an existing Change Request
 * @param {string} issueId - Issue ID
 * @param {string} changeRequestId - Change Request ID
 * @returns {Promise<Object>} Updated issue
 */
export async function linkToChangeRequest(issueId, changeRequestId) {
  try {
    const { data, error } = await supabase
      .from('issues')
      .update({ change_request_id: changeRequestId })
      .eq('id', issueId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error linking issue to change request:', error);
    throw error;
  }
}

/**
 * Link an issue to a risk
 * @param {string} issueId - Issue ID
 * @param {string} riskId - Risk ID
 * @returns {Promise<Object>} Updated issue
 */
export async function linkToRisk(issueId, riskId) {
  try {
    const { data, error } = await supabase
      .from('issues')
      .update({ escalated_from_risk_id: riskId })
      .eq('id', issueId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error linking issue to risk:', error);
    throw error;
  }
}

export default {
  transferToRisk,
  createFromRisk,
  createChangeRequest,
  linkToChangeRequest,
  linkToRisk
};
