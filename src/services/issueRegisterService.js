import { supabase } from './supabaseClient';

/**
 * Issue Register Service - API functions for Issue Register module
 * Handles Issue Register header operations (one register per project)
 */

/**
 * Create issue register for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Created issue register
 */
export async function createIssueRegister(projectId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Call database function to create register
    const { data, error } = await supabase.rpc('create_issue_register_for_project', {
      p_project_id: projectId,
      p_user_id: user.id
    });

    if (error) throw error;

    // Fetch the created register
    const { data: register, error: fetchError } = await supabase
      .from('issue_registers')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .single();

    if (fetchError) throw fetchError;

    return register;
  } catch (error) {
    console.error('Error creating issue register:', error);
    throw error;
  }
}

/**
 * Get issue register by project ID
 * @param {string} projectId - Project ID
 * @returns {Promise<Object|null>} Issue register or null if not found
 */
export async function getIssueRegisterByProject(projectId) {
  try {
    const { data, error } = await supabase
      .from('issue_registers')
      .select(`
        *,
        project:projects(id, project_name, project_code)
      `)
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned

    return data || null;
  } catch (error) {
    console.error('Error fetching issue register:', error);
    throw error;
  }
}

/**
 * Get issue register by ID
 * @param {string} registerId - Register ID
 * @returns {Promise<Object>} Issue register
 */
export async function getIssueRegisterById(registerId) {
  try {
    const { data, error } = await supabase
      .from('issue_registers')
      .select(`
        *,
        project:projects(id, project_name, project_code)
      `)
      .eq('id', registerId)
      .eq('is_deleted', false)
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error fetching issue register:', error);
    throw error;
  }
}

/**
 * Update issue register
 * @param {string} registerId - Register ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated issue register
 */
export async function updateIssueRegister(registerId, updates) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('issue_registers')
      .update({
        ...updates,
        updated_by: user.id
      })
      .eq('id', registerId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error updating issue register:', error);
    throw error;
  }
}

/**
 * Configure priority and severity scales for a register
 * @param {string} registerId - Register ID
 * @param {Object} scales - Scales configuration { priority_scale, severity_scale }
 * @returns {Promise<Object>} Updated issue register
 */
export async function configureScales(registerId, scales) {
  try {
    return await updateIssueRegister(registerId, {
      priority_scale: scales.priority_scale,
      severity_scale: scales.severity_scale
    });
  } catch (error) {
    console.error('Error configuring scales:', error);
    throw error;
  }
}

/**
 * Archive issue register
 * @param {string} registerId - Register ID
 * @returns {Promise<Object>} Archived issue register
 */
export async function archiveIssueRegister(registerId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('issue_registers')
      .update({
        is_active: false,
        updated_by: user.id
      })
      .eq('id', registerId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error archiving issue register:', error);
    throw error;
  }
}

/**
 * Get or create issue register for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Issue register
 */
export async function getOrCreateIssueRegister(projectId) {
  try {
    let register = await getIssueRegisterByProject(projectId);
    
    if (!register) {
      register = await createIssueRegister(projectId);
    }
    
    return register;
  } catch (error) {
    console.error('Error getting or creating issue register:', error);
    throw error;
  }
}

export default {
  createIssueRegister,
  getIssueRegisterByProject,
  getIssueRegisterById,
  updateIssueRegister,
  configureScales,
  archiveIssueRegister,
  getOrCreateIssueRegister
};
