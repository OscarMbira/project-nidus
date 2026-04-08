/**
 * Risk Service
 * Provides risk management functionality
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * Get risks for a project
 * @param {string} projectId - Project ID
 * @param {Object} filters - Optional filters
 * @returns {Promise<Object>} Risks data
 */
export async function getRisksByProject(projectId, filters = {}) {
  try {
    // First get the risk register
    const { data: register } = await platformDb
      .from('risk_registers')
      .select('id')
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .single();

    if (!register) {
      return { success: true, data: [] };
    }

    let query = platformDb
      .from('risks')
      .select(`
        *,
        risk_register:risk_register_id(id, register_reference),
        project:project_id(id, project_name, project_code),
        created_by_user:created_by(id, full_name, email),
        updated_by_user:updated_by(id, full_name, email),
        risk_author:risk_author_id(id, full_name, email),
        risk_owner:risk_owner_id(id, full_name, email),
        risk_actionee:risk_actionee_id(id, full_name, email)
      `)
      .eq('risk_register_id', register.id)
      .eq('is_deleted', false);

    // Apply filters
    if (filters.status) {
      query = query.eq('status_enum', filters.status);
    }
    if (filters.risk_type) {
      query = query.eq('risk_type', filters.risk_type);
    }
    if (filters.risk_category) {
      query = query.eq('risk_category', filters.risk_category);
    }
    if (filters.risk_level) {
      query = query.eq('pre_risk_score', filters.risk_level);
    }
    if (filters.proximity) {
      query = query.eq('proximity', filters.proximity);
    }
    if (filters.risk_owner_id) {
      query = query.eq('risk_owner_id', filters.risk_owner_id);
    }
    if (filters.search) {
      query = query.or(`risk_title.ilike.%${filters.search}%,risk_description.ilike.%${filters.search}%,cause_description.ilike.%${filters.search}%,event_description.ilike.%${filters.search}%`);
    }

    // Ordering
    const orderBy = filters.orderBy || 'pre_expected_value';
    const ascending = filters.ascending !== undefined ? filters.ascending : false;
    query = query.order(orderBy, { ascending });

    const { data, error } = await query;

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching risks:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get risk by ID
 * @param {string} riskId - Risk ID
 * @returns {Promise<Object>} Risk data
 */
export async function getRiskById(riskId) {
  try {
    const { data, error } = await platformDb
      .from('risks')
      .select(`
        *,
        risk_register:risk_register_id(id, register_reference),
        project:project_id(id, project_name, project_code),
        created_by_user:created_by(id, full_name, email),
        updated_by_user:updated_by(id, full_name, email),
        risk_author:risk_author_id(id, full_name, email),
        risk_owner:risk_owner_id(id, full_name, email),
        risk_actionee:risk_actionee_id(id, full_name, email)
      `)
      .eq('id', riskId)
      .eq('is_deleted', false)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching risk:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create a risk
 * @param {Object} riskData - Risk data
 * @returns {Promise<Object>} Created risk
 */
export async function createRisk(riskData) {
  try {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: userRecord } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (!userRecord) {
      return { success: false, error: 'User record not found' };
    }

    // Ensure risk_register_id exists
    if (!riskData.risk_register_id && riskData.project_id) {
      const logResult = await platformDb.rpc('create_risk_register_for_project', {
        p_project_id: riskData.project_id,
        p_user_id: userRecord.id
      });
      if (logResult.error) throw logResult.error;
      
      const { data: register } = await platformDb
        .from('risk_registers')
        .select('id')
        .eq('project_id', riskData.project_id)
        .eq('is_deleted', false)
        .single();
      
      riskData.risk_register_id = register.id;
    }

    // Map fields from new structure to existing structure
    const insertData = {
      ...riskData,
      project_id: riskData.project_id,
      risk_title: riskData.risk_title,
      risk_description: riskData.event_description || riskData.risk_description || '',
      risk_code: riskData.risk_identifier,
      risk_category: riskData.risk_category,
      risk_type: riskData.risk_type || 'threat',
      probability: riskData.pre_probability || riskData.probability || 3,
      impact: riskData.pre_impact || riskData.impact || 3,
      identified_by_user_id: riskData.risk_author_id || userRecord.id,
      risk_owner_user_id: riskData.risk_owner_id,
      response_strategy: riskData.response_category || riskData.response_strategy,
      identified_date: riskData.date_registered || riskData.identified_date || new Date().toISOString().split('T')[0],
      created_by: userRecord.id
    };

    const { data, error } = await platformDb
      .from('risks')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error creating risk:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update a risk
 * @param {string} riskId - Risk ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated risk
 */
export async function updateRisk(riskId, updates) {
  try {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: userRecord } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (!userRecord) {
      return { success: false, error: 'User record not found' };
    }

    // Map new fields to existing structure
    const updateData = {
      ...updates,
      updated_by: userRecord.id,
      updated_at: new Date().toISOString()
    };

    // Map probability/impact if provided
    if (updates.pre_probability !== undefined) {
      updateData.probability = updates.pre_probability;
    }
    if (updates.pre_impact !== undefined) {
      updateData.impact = updates.pre_impact;
    }
    if (updates.risk_owner_id !== undefined) {
      updateData.risk_owner_user_id = updates.risk_owner_id;
    }
    if (updates.response_category !== undefined) {
      updateData.response_strategy = updates.response_category;
    }

    const { data, error } = await platformDb
      .from('risks')
      .update(updateData)
      .eq('id', riskId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating risk:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a risk (soft delete)
 * @param {string} riskId - Risk ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteRisk(riskId) {
  try {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: userRecord } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (!userRecord) {
      return { success: false, error: 'User record not found' };
    }

    const { error } = await platformDb
      .from('risks')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userRecord.id
      })
      .eq('id', riskId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting risk:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Close a risk
 * @param {string} riskId - Risk ID
 * @param {string} reason - Closure reason
 * @param {string} notes - Closure notes
 * @returns {Promise<Object>} Update result
 */
export async function closeRisk(riskId, reason, notes = null) {
  try {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: userRecord } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (!userRecord) {
      return { success: false, error: 'User record not found' };
    }

    const { data, error } = await platformDb
      .from('risks')
      .update({
        status_enum: 'closed',
        status: 'closed',
        closure_reason: reason,
        closure_notes: notes,
        closure_date: new Date().toISOString().split('T')[0],
        closed_date: new Date().toISOString().split('T')[0],
        updated_by: userRecord.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', riskId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error closing risk:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get risks summary for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Summary statistics
 */
export async function getRiskSummary(projectId) {
  try {
    const { data, error } = await platformDb.rpc('get_risk_summary', {
      p_project_id: projectId
    });

    if (error) throw error;

    return { success: true, data: data?.[0] || null };
  } catch (error) {
    console.error('Error fetching risk summary:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get top risks for a project
 * @param {string} projectId - Project ID
 * @param {number} limit - Number of risks to return
 * @returns {Promise<Object>} Top risks
 */
export async function getTopRisks(projectId, limit = 10) {
  try {
    const { data, error } = await platformDb.rpc('get_top_risks', {
      p_project_id: projectId,
      p_limit: limit
    });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching top risks:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get risks by proximity
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Risks grouped by proximity
 */
export async function getRisksByProximity(projectId) {
  try {
    const { data, error } = await platformDb.rpc('get_risks_by_proximity', {
      p_project_id: projectId
    });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching risks by proximity:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Escalate risk to issue
 * @param {string} riskId - Risk ID
 * @returns {Promise<Object>} Created issue ID
 */
export async function escalateRiskToIssue(riskId) {
  try {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: userRecord } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (!userRecord) {
      return { success: false, error: 'User record not found' };
    }

    const { data, error } = await platformDb.rpc('escalate_risk_to_issue', {
      p_risk_id: riskId,
      p_user_id: userRecord.id
    });

    if (error) throw error;

    return { success: true, data: { issue_id: data } };
  } catch (error) {
    console.error('Error escalating risk to issue:', error);
    return { success: false, error: error.message };
  }
}
