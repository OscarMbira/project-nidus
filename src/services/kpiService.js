import { supabase } from './supabaseClient';

/**
 * KPI Service
 * Handles KPI definitions, targets, actuals, and alerts
 */

/**
 * Get KPI definition by ID
 */
export async function getKPIDefinition(kpiId) {
  const { data, error } = await supabase
    .from('kpi_definitions')
    .select(`
      *,
      owner:users!owner_user_id(id, email, full_name)
    `)
    .eq('id', kpiId)
    .eq('is_deleted', false)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get KPI definitions with filters
 */
export async function getKPIDefinitions(filters = {}) {
  let query = supabase
    .from('kpi_definitions')
    .select(`
      *,
      owner:users!owner_user_id(id, email, full_name)
    `)
    .eq('is_deleted', false);

  if (filters.project_id) {
    query = query.eq('project_id', filters.project_id);
  }
  if (filters.kpi_category) {
    query = query.eq('kpi_category', filters.kpi_category);
  }
  if (filters.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active);
  }
  if (filters.is_system_kpi !== undefined) {
    query = query.eq('is_system_kpi', filters.is_system_kpi);
  }
  if (filters.methodology) {
    query = query.eq('methodology', filters.methodology).or('methodology.is.null,methodology.eq.all');
  }
  if (filters.search) {
    query = query.or(`kpi_name.ilike.%${filters.search}%,kpi_code.ilike.%${filters.search}%,kpi_description.ilike.%${filters.search}%`);
  }

  query = query.order('kpi_name', { ascending: true });

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Save KPI definition
 */
export async function saveKPIDefinition(kpiData, kpiId = null) {
  if (kpiId) {
    const { data, error } = await supabase
      .from('kpi_definitions')
      .update({
        ...kpiData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', kpiId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('kpi_definitions')
      .insert({
        ...kpiData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

/**
 * Delete KPI definition
 */
export async function deleteKPIDefinition(kpiId) {
  const { data, error } = await supabase
    .from('kpi_definitions')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: false, // Also deactivate
    })
    .eq('id', kpiId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get KPI targets
 */
export async function getKPITargets(filters = {}) {
  let query = supabase
    .from('kpi_targets')
    .select(`
      *,
      kpi:kpi_definition_id(id, kpi_code, kpi_name, kpi_category, measurement_unit),
      project:project_id(id, project_name, project_code)
    `)
    .eq('is_deleted', false);

  if (filters.kpi_id || filters.kpi_definition_id) {
    query = query.eq('kpi_definition_id', filters.kpi_id || filters.kpi_definition_id);
  }
  if (filters.project_id) {
    query = query.eq('project_id', filters.project_id);
  }
  if (filters.target_period_start || filters.period_start_date) {
    query = query.gte('period_end_date', filters.target_period_start || filters.period_start_date);
  }
  if (filters.target_period_end || filters.period_end_date) {
    query = query.lte('period_start_date', filters.target_period_end || filters.period_end_date);
  }

  query = query.order('period_start_date', { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Save KPI target
 */
export async function saveKPITarget(targetData, targetId = null) {
  if (targetId) {
    const { data, error } = await supabase
      .from('kpi_targets')
      .update({
        ...targetData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('kpi_targets')
      .insert({
        ...targetData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

/**
 * Get KPI actuals
 */
export async function getKPIActuals(filters = {}) {
  let query = supabase
    .from('kpi_actuals')
    .select(`
      *,
      kpi:kpi_definition_id(id, kpi_code, kpi_name, kpi_category, measurement_unit, display_format, decimal_places, prefix, suffix),
      project:project_id(id, project_name, project_code),
      recorded_by_user:created_by(id, email, full_name)
    `)
    .eq('is_deleted', false);

  if (filters.kpi_id || filters.kpi_definition_id) {
    query = query.eq('kpi_definition_id', filters.kpi_id || filters.kpi_definition_id);
  }
  if (filters.project_id) {
    query = query.eq('project_id', filters.project_id);
  }
  if (filters.measurement_date_start) {
    query = query.gte('measurement_date', filters.measurement_date_start);
  }
  if (filters.measurement_date_end) {
    query = query.lte('measurement_date', filters.measurement_date_end);
  }

  query = query.order('measurement_date', { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Save KPI actual
 */
export async function saveKPIActual(actualData, actualId = null) {
  if (actualId) {
    const { data, error } = await supabase
      .from('kpi_actuals')
      .update({
        ...actualData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', actualId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('kpi_actuals')
      .insert({
        ...actualData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

/**
 * Delete KPI actual
 */
export async function deleteKPIActual(actualId) {
  const { data, error } = await supabase
    .from('kpi_actuals')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', actualId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get KPI alerts
 */
export async function getKPIAlerts(filters = {}) {
  let query = supabase
    .from('kpi_alerts')
    .select(`
      *,
      kpi:kpi_definition_id(id, kpi_code, kpi_name, kpi_category),
      project:project_id(id, project_name, project_code),
      triggered_by_user:triggered_by(id, email, full_name)
    `)
    .eq('is_deleted', false);

  if (filters.kpi_id || filters.kpi_definition_id) {
    query = query.eq('kpi_definition_id', filters.kpi_id || filters.kpi_definition_id);
  }
  if (filters.project_id) {
    query = query.eq('project_id', filters.project_id);
  }
  if (filters.alert_status) {
    query = query.eq('alert_status', filters.alert_status);
  }
  if (filters.alert_severity) {
    query = query.eq('alert_severity', filters.alert_severity);
  }
  if (filters.is_acknowledged !== undefined) {
    query = query.eq('is_acknowledged', filters.is_acknowledged);
  }

  query = query.order('alert_triggered_at', { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Save KPI alert
 */
export async function saveKPIAlert(alertData, alertId = null) {
  if (alertId) {
    const { data, error } = await supabase
      .from('kpi_alerts')
      .update({
        ...alertData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', alertId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('kpi_alerts')
      .insert({
        ...alertData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        alert_triggered_at: alertData.alert_triggered_at || new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

/**
 * Acknowledge KPI alert
 */
export async function acknowledgeKPIAlert(alertId, acknowledgedBy) {
  const { data, error } = await supabase
    .from('kpi_alerts')
    .update({
      is_acknowledged: true,
      acknowledged_at: new Date().toISOString(),
      acknowledged_by_user_id: acknowledgedBy,
      updated_at: new Date().toISOString(),
    })
    .eq('id', alertId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get KPI performance summary
 * This should use the view kpi_performance_summary if it exists
 */
export async function getKPIPerformanceSummary(filters = {}) {
  try {
    // Try to use the view first
    let query = supabase.from('kpi_performance_summary').select('*');

    if (filters.project_id) {
      query = query.eq('project_id', filters.project_id);
    }
  if (filters.kpi_id || filters.kpi_definition_id) {
    query = query.eq('kpi_definition_id', filters.kpi_id || filters.kpi_definition_id);
  }

    const { data, error } = await query;

    // If view doesn't exist, fallback to manual calculation
    if (error && error.code === '42P01') {
      // 42P01 = relation does not exist
      return await calculateKPIPerformanceSummary(filters);
    }

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching KPI performance summary:', error);
    // Fallback to manual calculation
    return await calculateKPIPerformanceSummary(filters);
  }
}

/**
 * Calculate KPI performance summary manually
 */
async function calculateKPIPerformanceSummary(filters = {}) {
  try {
    // Get KPIs with their targets and actuals
    const kpis = await getKPIDefinitions(filters);
    const summaries = [];

    for (const kpi of kpis) {
      const [targets, actuals] = await Promise.all([
        getKPITargets({ kpi_definition_id: kpi.id, ...filters }),
        getKPIActuals({ kpi_definition_id: kpi.id, ...filters }),
      ]);

      const latestActual = actuals[0]; // Most recent
      const currentTarget = targets.find(t => {
        const now = new Date();
        const start = new Date(t.period_start_date || t.target_period_start);
        const end = new Date(t.period_end_date || t.target_period_end);
        return start <= now && end >= now;
      }) || targets[0];

      let performance_status = 'unknown';
      let variance = null;
      let variance_percentage = null;

      if (latestActual && currentTarget) {
        variance = latestActual.actual_value - currentTarget.target_value;
        if (currentTarget && currentTarget.target_value !== 0) {
          variance_percentage = (variance / currentTarget.target_value) * 100;
        }

        // Determine status based on thresholds
        if (latestActual && currentTarget) {
          if (kpi.target_direction === 'higher-is-better') {
            if (latestActual.actual_value >= (currentTarget.target_value * 0.9)) {
              performance_status = 'on-target';
            } else if (latestActual.actual_value >= (currentTarget.target_value * 0.75)) {
              performance_status = 'below-target';
            } else {
              performance_status = 'critical';
            }
          } else if (kpi.target_direction === 'lower-is-better') {
            if (latestActual.actual_value <= (currentTarget.target_value * 1.1)) {
              performance_status = 'on-target';
            } else if (latestActual.actual_value <= (currentTarget.target_value * 1.25)) {
              performance_status = 'below-target';
            } else {
              performance_status = 'critical';
            }
          }
        }
      }

      summaries.push({
        kpi_id: kpi.id,
        kpi_code: kpi.kpi_code,
        kpi_name: kpi.kpi_name,
        kpi_category: kpi.kpi_category,
        current_target: currentTarget?.target_value || null,
        latest_actual: latestActual?.actual_value || null,
        variance,
        variance_percentage,
        performance_status,
        last_measured: latestActual?.measurement_date || null,
        target_period_start: currentTarget?.period_start_date || currentTarget?.target_period_start || null,
        target_period_end: currentTarget?.period_end_date || currentTarget?.target_period_end || null,
      });
    }

    return summaries;
  } catch (error) {
    console.error('Error calculating KPI performance summary:', error);
    throw error;
  }
}

/**
 * Get KPI statistics
 */
export async function getKPIStats(filters = {}) {
  try {
    const stats = {
      totalKPIs: 0,
      activeKPIs: 0,
      systemKPIs: 0,
      onTarget: 0,
      belowTarget: 0,
      critical: 0,
    };

    const kpis = await getKPIDefinitions({ ...filters, is_active: true });
    stats.totalKPIs = kpis.length;
    stats.activeKPIs = kpis.filter(k => k.is_active).length;
    stats.systemKPIs = kpis.filter(k => k.is_system_kpi).length;

    const summary = await getKPIPerformanceSummary(filters);
    stats.onTarget = summary.filter(s => s.performance_status === 'on-target').length;
    stats.belowTarget = summary.filter(s => s.performance_status === 'below-target').length;
    stats.critical = summary.filter(s => s.performance_status === 'critical').length;

    return stats;
  } catch (error) {
    console.error('Error fetching KPI stats:', error);
    throw error;
  }
}

