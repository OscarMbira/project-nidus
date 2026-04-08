import { supabase } from './supabaseClient';

/**
 * Issue Decision Service - API functions for Issue Decisions
 * Handles decisions made on issues
 */

/**
 * Record a decision on an issue
 * @param {string} issueId - Issue ID
 * @param {Object} decisionData - Decision data
 * @returns {Promise<Object>} Created decision
 */
export async function recordDecision(issueId, decisionData) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get user details for decision_maker_name
    const { data: userData } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    const insertData = {
      ...decisionData,
      issue_id: issueId,
      decision_maker_id: user.id,
      decision_maker_name: decisionData.decision_maker_name || userData?.full_name || userData?.email || 'Unknown',
      decision_date: decisionData.decision_date || new Date().toISOString().split('T')[0]
    };

    const { data, error } = await supabase
      .from('issue_decisions')
      .insert(insertData)
      .select(`
        *,
        decision_maker:decision_maker_id(id, full_name, email)
      `)
      .single();

    if (error) throw error;

    // Update issue status based on decision type
    if (decisionData.decision_type === 'approve') {
      await supabase
        .from('issues')
        .update({ status: 'approved' })
        .eq('id', issueId);
    } else if (decisionData.decision_type === 'reject') {
      await supabase
        .from('issues')
        .update({ status: 'rejected' })
        .eq('id', issueId);
    } else if (decisionData.decision_type === 'defer') {
      await supabase
        .from('issues')
        .update({ status: 'deferred' })
        .eq('id', issueId);
    }

    return data;
  } catch (error) {
    console.error('Error recording decision:', error);
    throw error;
  }
}

/**
 * Update a decision
 * @param {string} decisionId - Decision ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated decision
 */
export async function updateDecision(decisionId, updates) {
  try {
    const { data, error } = await supabase
      .from('issue_decisions')
      .update(updates)
      .eq('id', decisionId)
      .select(`
        *,
        decision_maker:decision_maker_id(id, full_name, email)
      `)
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error updating decision:', error);
    throw error;
  }
}

/**
 * Get all decisions for an issue
 * @param {string} issueId - Issue ID
 * @returns {Promise<Array>} Array of decisions
 */
export async function getDecisions(issueId) {
  try {
    const { data, error } = await supabase
      .from('issue_decisions')
      .select(`
        *,
        decision_maker:decision_maker_id(id, full_name, email)
      `)
      .eq('issue_id', issueId)
      .order('decision_date', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching decisions:', error);
    throw error;
  }
}

/**
 * Get pending decisions for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Array>} Array of issues awaiting decisions
 */
export async function getPendingDecisions(projectId) {
  try {
    // Get issue register for project
    const { data: register } = await supabase
      .from('issue_registers')
      .select('id')
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .single();

    if (!register) return [];

    const { data, error } = await supabase
      .from('issues')
      .select(`
        *,
        raised_by:raised_by_id(id, full_name, email),
        owner:owner_id(id, full_name, email)
      `)
      .eq('issue_register_id', register.id)
      .eq('status', 'awaiting_decision')
      .eq('is_deleted', false)
      .order('date_raised', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching pending decisions:', error);
    throw error;
  }
}

/**
 * Get decisions by decision maker
 * @param {string} projectId - Project ID
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of decisions
 */
export async function getDecisionsByMaker(projectId, userId) {
  try {
    // Get issue register for project
    const { data: register } = await supabase
      .from('issue_registers')
      .select('id')
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .single();

    if (!register) return [];

    const { data: issues } = await supabase
      .from('issues')
      .select('id')
      .eq('issue_register_id', register.id)
      .eq('is_deleted', false);

    if (!issues || issues.length === 0) return [];

    const issueIds = issues.map(i => i.id);

    const { data, error } = await supabase
      .from('issue_decisions')
      .select(`
        *,
        issue:issues(id, issue_identifier, issue_title),
        decision_maker:decision_maker_id(id, full_name, email)
      `)
      .in('issue_id', issueIds)
      .eq('decision_maker_id', userId)
      .order('decision_date', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching decisions by maker:', error);
    throw error;
  }
}

/**
 * Get decision history for an issue
 * @param {string} issueId - Issue ID
 * @returns {Promise<Array>} Array of decisions (same as getDecisions, but with more context)
 */
export async function getDecisionHistory(issueId) {
  return getDecisions(issueId);
}

export default {
  recordDecision,
  updateDecision,
  getDecisions,
  getPendingDecisions,
  getDecisionsByMaker,
  getDecisionHistory
};
