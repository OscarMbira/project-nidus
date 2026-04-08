/**
 * Risk Analytics Service
 * Provides risk analytics and visualization functionality
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * Get risk matrix for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Risk matrix data
 */
export async function getRiskMatrix(projectIdOrRegisterId) {
  try {
    // Check if it's a UUID that matches a register
    let registerId = projectIdOrRegisterId;
    
    // Try to find if it's a project_id first
    const { data: register } = await platformDb
      .from('risk_registers')
      .select('id')
      .eq('project_id', projectIdOrRegisterId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (register) {
      registerId = register.id;
    } else {
      // Assume it's already a register_id
      // Verify it exists
      const { data: registerCheck } = await platformDb
        .from('risk_registers')
        .select('id')
        .eq('id', projectIdOrRegisterId)
        .eq('is_deleted', false)
        .maybeSingle();
      
      if (!registerCheck) {
        return { success: true, data: [] };
      }
      registerId = projectIdOrRegisterId;
    }

    const { data, error } = await platformDb.rpc('get_risk_matrix', {
      p_risk_register_id: registerId
    });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching risk matrix:', error);
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
 * Get risk exposure (total expected value)
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Risk exposure
 */
export async function getRiskExposure(projectId) {
  try {
    const { data: register } = await platformDb
      .from('risk_registers')
      .select('id')
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .single();

    if (!register) {
      return { success: true, data: { total_exposure: 0, threats_exposure: 0, opportunities_exposure: 0 } };
    }

    const { data: risks } = await platformDb
      .from('risks')
      .select('pre_expected_value, risk_type')
      .eq('risk_register_id', register.id)
      .eq('is_deleted', false)
      .in('status_enum', ['identified', 'assessing', 'responding', 'monitoring']);

    const totalExposure = risks?.reduce((sum, r) => sum + (parseFloat(r.pre_expected_value) || 0), 0) || 0;
    const threatsExposure = risks?.filter(r => r.risk_type === 'threat').reduce((sum, r) => sum + (parseFloat(r.pre_expected_value) || 0), 0) || 0;
    const opportunitiesExposure = risks?.filter(r => r.risk_type === 'opportunity').reduce((sum, r) => sum + (parseFloat(r.pre_expected_value) || 0), 0) || 0;

    return {
      success: true,
      data: {
        total_exposure: totalExposure,
        threats_exposure: threatsExposure,
        opportunities_exposure: opportunitiesExposure
      }
    };
  } catch (error) {
    console.error('Error calculating risk exposure:', error);
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
 * Get risks by category
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Risks grouped by category
 */
export async function getRisksByCategory(projectId) {
  try {
    const { data: register } = await platformDb
      .from('risk_registers')
      .select('id')
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .single();

    if (!register) {
      return { success: true, data: [] };
    }

    const { data: risks } = await platformDb
      .from('risks')
      .select('risk_category, pre_expected_value')
      .eq('risk_register_id', register.id)
      .eq('is_deleted', false)
      .in('status_enum', ['identified', 'assessing', 'responding', 'monitoring']);

    const grouped = risks?.reduce((acc, risk) => {
      const category = risk.risk_category || 'uncategorized';
      if (!acc[category]) {
        acc[category] = { category, count: 0, total_exposure: 0 };
      }
      acc[category].count++;
      acc[category].total_exposure += parseFloat(risk.pre_expected_value) || 0;
      return acc;
    }, {});

    return { success: true, data: Object.values(grouped || {}) };
  } catch (error) {
    console.error('Error fetching risks by category:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get response effectiveness statistics
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Effectiveness stats
 */
export async function getResponseEffectiveness(projectId) {
  try {
    const { data: register } = await platformDb
      .from('risk_registers')
      .select('id')
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .single();

    if (!register) {
      return { success: true, data: null };
    }

    // Get risks for this register
    const { data: risks } = await platformDb
      .from('risks')
      .select('id')
      .eq('risk_register_id', register.id)
      .eq('is_deleted', false);

    if (!risks || risks.length === 0) {
      return { success: true, data: null };
    }

    const riskIds = risks.map(r => r.id);

    const { data: responses } = await platformDb
      .from('risk_responses')
      .select('effectiveness_rating')
      .in('risk_id', riskIds)
      .not('effectiveness_rating', 'is', null);

    const stats = {
      total_assessed: responses?.length || 0,
      highly_effective: responses?.filter(r => r.effectiveness_rating === 'highly_effective').length || 0,
      effective: responses?.filter(r => r.effectiveness_rating === 'effective').length || 0,
      partially_effective: responses?.filter(r => r.effectiveness_rating === 'partially_effective').length || 0,
      ineffective: responses?.filter(r => r.effectiveness_rating === 'ineffective').length || 0
    };

    return { success: true, data: stats };
  } catch (error) {
    console.error('Error fetching response effectiveness:', error);
    return { success: false, error: error.message };
  }
}
