import { supabase } from './supabaseClient';

/**
 * Analytics Service
 * Handles analytics snapshots, dashboard configurations, and analytics data aggregation
 */

/**
 * Get analytics snapshot by ID
 */
export async function getAnalyticsSnapshot(snapshotId) {
  const { data, error } = await supabase
    .from('analytics_snapshots')
    .select(`
      *,
      project:projects(id, project_name, project_code),
      created_by_user:users!created_by(id, email, full_name)
    `)
    .eq('id', snapshotId)
    .eq('is_deleted', false)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get analytics snapshots with filters
 */
export async function getAnalyticsSnapshots(filters = {}) {
  let query = supabase
    .from('analytics_snapshots')
    .select(`
      *,
      project:projects(id, project_name, project_code),
      created_by_user:users!created_by(id, email, full_name)
    `)
    .eq('is_deleted', false);

  if (filters.project_id) {
    query = query.eq('project_id', filters.project_id);
  }
  if (filters.snapshot_date) {
    query = query.eq('snapshot_date', filters.snapshot_date);
  }
  if (filters.snapshot_type) {
    query = query.eq('snapshot_type', filters.snapshot_type);
  }
  if (filters.search) {
    query = query.or(`snapshot_name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }

  query = query.order('snapshot_date', { ascending: false });
  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Save analytics snapshot
 */
export async function saveAnalyticsSnapshot(snapshotData, snapshotId = null) {
  if (snapshotId) {
    const { data, error } = await supabase
      .from('analytics_snapshots')
      .update({
        ...snapshotData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', snapshotId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('analytics_snapshots')
      .insert({
        ...snapshotData,
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
 * Delete analytics snapshot
 */
export async function deleteAnalyticsSnapshot(snapshotId) {
  const { data, error } = await supabase
    .from('analytics_snapshots')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', snapshotId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get dashboard configuration for a user
 */
export async function getDashboardConfiguration(userId, dashboardType = 'default') {
  const { data, error } = await supabase
    .from('dashboard_configurations')
    .select(`
      *,
      widgets:dashboard_widgets(*)
    `)
    .eq('user_id', userId)
    .eq('dashboard_type', dashboardType)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
  return data || null;
}

/**
 * Save dashboard configuration
 */
export async function saveDashboardConfiguration(configData, configId = null) {
  if (configId) {
    const { data, error } = await supabase
      .from('dashboard_configurations')
      .update({
        ...configData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', configId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('dashboard_configurations')
      .insert({
        ...configData,
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
 * Get dashboard widgets for a dashboard
 */
export async function getDashboardWidgets(dashboardId) {
  const { data, error } = await supabase
    .from('dashboard_widgets')
    .select('*')
    .eq('dashboard_id', dashboardId)
    .eq('is_deleted', false)
    .order('display_order', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Save dashboard widget
 */
export async function saveDashboardWidget(widgetData, widgetId = null) {
  if (widgetId) {
    const { data, error } = await supabase
      .from('dashboard_widgets')
      .update({
        ...widgetData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', widgetId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('dashboard_widgets')
      .insert({
        ...widgetData,
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
 * Delete dashboard widget
 */
export async function deleteDashboardWidget(widgetId) {
  const { data, error } = await supabase
    .from('dashboard_widgets')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', widgetId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get analytics statistics
 */
export async function getAnalyticsStats(filters = {}) {
  try {
    // This is a placeholder - implement actual aggregation logic based on your analytics tables
    const stats = {
      totalSnapshots: 0,
      totalDashboards: 0,
      totalWidgets: 0,
    };

    const [snapshots, dashboards, widgets] = await Promise.all([
      supabase
        .from('analytics_snapshots')
        .select('id', { count: 'exact', head: true })
        .eq('is_deleted', false),
      supabase
        .from('dashboard_configurations')
        .select('id', { count: 'exact', head: true })
        .eq('is_deleted', false),
      supabase
        .from('dashboard_widgets')
        .select('id', { count: 'exact', head: true })
        .eq('is_deleted', false),
    ]);

    if (snapshots.count !== null) stats.totalSnapshots = snapshots.count;
    if (dashboards.count !== null) stats.totalDashboards = dashboards.count;
    if (widgets.count !== null) stats.totalWidgets = widgets.count;

    return stats;
  } catch (error) {
    console.error('Error fetching analytics stats:', error);
    throw error;
  }
}

/**
 * Get project analytics summary
 */
export async function getProjectAnalyticsSummary(projectId) {
  try {
    // This is a placeholder - implement actual calculation logic
    // You might want to aggregate data from tasks, milestones, risks, etc.
    const summary = {
      project_id: projectId,
      completion_percentage: 0,
      budget_utilization: 0,
      schedule_performance: 0,
      quality_score: 0,
      risk_score: 0,
      last_updated: new Date().toISOString(),
    };

    // Add actual calculations here based on your project data
    return summary;
  } catch (error) {
    console.error('Error fetching project analytics summary:', error);
    throw error;
  }
}

