/**
 * Dashboard Service
 *
 * Provides dashboard analytics, KPIs, and aggregated data for Platform
 * Uses platformDb for real project data
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * Get executive summary for organization dashboard
 * @param {string} organizationId - Organization ID
 * @returns {Promise<Object>} Executive summary data
 */
export async function getExecutiveSummary(organizationId) {
  try {
    // Get projects for this account first (without joins to avoid RLS issues)
    const { data: projects, error: projectsError } = await platformDb
      .from('projects')
      .select('id, status_id')
      .eq('account_id', organizationId)
      .eq('is_deleted', false);

    if (projectsError) throw projectsError;

    const projectIds = projects?.map(p => p.id) || [];
    const statusIds = [...new Set(projects?.map(p => p.status_id).filter(Boolean))] || [];

    // Fetch statuses separately to avoid RLS join issues
    let statusMap = {};
    if (statusIds.length > 0) {
      const { data: statuses, error: statusError } = await platformDb
        .from('project_statuses')
        .select('id, status_name')
        .in('id', statusIds);
      
      if (!statusError && statuses) {
        statusMap = statuses.reduce((acc, status) => {
          acc[status.id] = status.status_name;
          return acc;
        }, {});
      }
    }

    // Get tasks and teams through projects
    const [tasksData, teamsData] = await Promise.all([
      projectIds.length > 0 ? platformDb
        .from('tasks')
        .select('id, status_id', { count: 'exact' })
        .in('project_id', projectIds)
        .eq('is_deleted', false) : { data: [], count: 0, error: null },

      projectIds.length > 0 ? platformDb
        .from('teams')
        .select('id', { count: 'exact' })
        .in('project_id', projectIds)
        .eq('is_deleted', false) : { data: [], count: 0, error: null }
    ]);

    // Get task statuses separately
    const taskStatusIds = [...new Set((tasksData.data || []).map(t => t.status_id).filter(Boolean))] || [];
    let taskStatusMap = {};
    if (taskStatusIds.length > 0) {
      const { data: taskStatuses, error: taskStatusError } = await platformDb
        .from('task_statuses')
        .select('id, status_name')
        .in('id', taskStatusIds);
      
      if (!taskStatusError && taskStatuses) {
        taskStatusMap = taskStatuses.reduce((acc, status) => {
          acc[status.id] = status.status_name;
          return acc;
        }, {});
      }
    }

    // Calculate status breakdowns
    const projectsList = projects || [];
    const tasks = tasksData.data || [];

    const summary = {
      projects: {
        total: projectsList.length,
        active: projectsList.filter(p => {
          const statusName = statusMap[p.status_id]?.toLowerCase();
          return statusName === 'active' || statusName === 'in progress' || statusName === 'in_progress';
        }).length,
        completed: projectsList.filter(p => {
          const statusName = statusMap[p.status_id]?.toLowerCase();
          return statusName === 'completed' || statusName === 'done';
        }).length,
        onHold: projectsList.filter(p => {
          const statusName = statusMap[p.status_id]?.toLowerCase();
          return statusName === 'on hold' || statusName === 'paused';
        }).length,
        planned: projectsList.filter(p => {
          const statusName = statusMap[p.status_id]?.toLowerCase();
          return statusName === 'planned' || statusName === 'not started';
        }).length,
      },
      tasks: {
        total: tasksData.count || 0,
        todo: tasks.filter(t => {
          const statusName = taskStatusMap[t.status_id]?.toLowerCase();
          return statusName === 'todo' || statusName === 'to do' || statusName === 'not started';
        }).length,
        inProgress: tasks.filter(t => {
          const statusName = taskStatusMap[t.status_id]?.toLowerCase();
          return statusName === 'in progress' || statusName === 'in_progress' || statusName === 'in-progress';
        }).length,
        completed: tasks.filter(t => {
          const statusName = taskStatusMap[t.status_id]?.toLowerCase();
          return statusName === 'completed' || statusName === 'done';
        }).length,
        blocked: tasks.filter(t => {
          const statusName = taskStatusMap[t.status_id]?.toLowerCase();
          return statusName === 'blocked';
        }).length,
      },
      teams: {
        total: teamsData.count || 0,
      },
    };

    return { success: true, data: summary };
  } catch (error) {
    console.error('Error getting executive summary:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get recent activity feed for organization
 * @param {string} organizationId - Organization ID
 * @param {number} limit - Number of activities to return (default 20)
 * @returns {Promise<Object>} Recent activities
 */
export async function getRecentActivity(organizationId, limit = 20) {
  try {
    // Get recent project activities
    // Note: project_activity_log doesn't have account_id, so we filter through projects
    // First get project IDs for this account
    const { data: accountProjects, error: projectsError } = await platformDb
      .from('projects')
      .select('id')
      .eq('account_id', organizationId)
      .eq('is_deleted', false);
    
    if (projectsError) throw projectsError;
    
    if (!accountProjects || accountProjects.length === 0) {
      return { success: true, data: [] };
    }
    
    const projectIds = accountProjects.map(p => p.id);
    
    // Now get activities for these projects
    const { data: projectActivities, error: projectError } = await platformDb
      .from('project_activity_log')
      .select(`
        id,
        action,
        entity_type,
        entity_id,
        description,
        created_at,
        user_id,
        project_id
      `)
      .in('project_id', projectIds)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (projectError) throw projectError;

    if (!projectActivities || projectActivities.length === 0) {
      return { success: true, data: [] };
    }

    // Get unique user IDs
    const userIds = [...new Set(projectActivities.map(a => a.user_id).filter(Boolean))];
    
    // Fetch user details separately
    let usersMap = {};
    if (userIds.length > 0) {
      const { data: users, error: usersError } = await platformDb
        .from('users')
        .select('id, full_name, email')
        .in('id', userIds);
      
      if (!usersError && users) {
        usersMap = users.reduce((acc, user) => {
          acc[user.id] = user;
          return acc;
        }, {});
      }
    }

    // Transform to match expected format
    const activities = projectActivities.map(activity => ({
      id: activity.id,
      action: activity.action,
      entity_type: activity.entity_type,
      entity_id: activity.entity_id,
      description: activity.description,
      created_at: activity.created_at,
      user: activity.user_id && usersMap[activity.user_id] ? {
        id: usersMap[activity.user_id].id,
        full_name: usersMap[activity.user_id].full_name,
        email: usersMap[activity.user_id].email
      } : null
    }));

    return { success: true, data: activities };
  } catch (error) {
    console.error('Error getting recent activity:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get Key Performance Indicators (KPIs) for organization
 * @param {string} organizationId - Organization ID
 * @returns {Promise<Object>} KPI data
 */
export async function getKPIs(organizationId) {
  try {
    // Get project health metrics
    // Note: organizationId is actually account_id
    const { data: projects, error: projectError } = await platformDb
      .from('projects')
      .select(`
        id,
        status_id,
        health_status,
        planned_start_date,
        planned_end_date,
        actual_start_date,
        actual_end_date,
        budget_amount,
        actual_cost,
        is_deleted
      `)
      .eq('account_id', organizationId)
      .eq('is_deleted', false);

    if (projectError) throw projectError;

    // Fetch statuses separately to avoid RLS join issues
    const statusIds = [...new Set(projects?.map(p => p.status_id).filter(Boolean))] || [];
    let statusMap = {};
    if (statusIds.length > 0) {
      const { data: statuses, error: statusError } = await platformDb
        .from('project_statuses')
        .select('id, status_name')
        .in('id', statusIds);
      
      if (!statusError && statuses) {
        statusMap = statuses.reduce((acc, status) => {
          acc[status.id] = status.status_name;
          return acc;
        }, {});
      }
    }

    // Filter active projects (status is 'active' or 'in progress')
    const activeProjects = projects?.filter(p => {
      const statusName = statusMap[p.status_id]?.toLowerCase();
      return statusName === 'active' || statusName === 'in progress' || statusName === 'in_progress';
    }) || [];

    // Calculate KPIs
    const kpis = {
      projectHealth: {
        healthy: activeProjects.filter(p => p.health_status === 'green' || p.health_status === 'Green').length,
        atRisk: activeProjects.filter(p => p.health_status === 'yellow' || p.health_status === 'amber' || p.health_status === 'Amber').length,
        critical: activeProjects.filter(p => p.health_status === 'red' || p.health_status === 'Red').length,
        score: calculateHealthScore(activeProjects),
      },
      onTimeDelivery: {
        percentage: calculateOnTimeDeliveryRate(projects, statusMap),
        count: projects?.filter(p => {
          const statusName = statusMap[p.status_id]?.toLowerCase();
          return (statusName === 'completed' || statusName === 'done') && isOnTime(p);
        }).length || 0,
        total: projects?.filter(p => {
          const statusName = statusMap[p.status_id]?.toLowerCase();
          return statusName === 'completed' || statusName === 'done';
        }).length || 0,
      },
      budgetVariance: {
        percentage: calculateBudgetVariance(projects),
        totalBudget: projects?.reduce((sum, p) => sum + (p.budget_amount || 0), 0) || 0,
        totalSpent: projects?.reduce((sum, p) => sum + (p.actual_cost || 0), 0) || 0,
      },
      resourceEfficiency: {
        percentage: 0, // Placeholder - will be calculated from time logs
        allocated: 0,
        utilized: 0,
      },
    };

    return { success: true, data: kpis };
  } catch (error) {
    console.error('Error getting KPIs:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get project health data for charts
 * @param {string} organizationId - Organization ID
 * @returns {Promise<Object>} Project health chart data
 */
export async function getProjectHealthData(organizationId) {
  try {
    const { data: projects, error } = await platformDb
      .from('projects')
      .select(`
        id,
        project_name,
        status_id,
        health_status,
        percentage_complete
      `)
      .eq('account_id', organizationId)
      .eq('is_deleted', false);

    if (error) throw error;

    // Fetch statuses separately to avoid RLS join issues
    const statusIds = [...new Set(projects?.map(p => p.status_id).filter(Boolean))] || [];
    let statusMap = {};
    if (statusIds.length > 0) {
      const { data: statuses, error: statusError } = await platformDb
        .from('project_statuses')
        .select('id, status_name')
        .in('id', statusIds);
      
      if (!statusError && statuses) {
        statusMap = statuses.reduce((acc, status) => {
          acc[status.id] = status.status_name;
          return acc;
        }, {});
      }
    }

    // Filter active projects
    const activeProjects = projects?.filter(p => {
      const statusName = statusMap[p.status_id]?.toLowerCase();
      return statusName === 'active' || statusName === 'in progress' || statusName === 'in_progress';
    }) || [];

    const healthData = {
      distribution: {
        healthy: activeProjects.filter(p => p.health_status === 'green' || p.health_status === 'Green').length || 0,
        atRisk: activeProjects.filter(p => p.health_status === 'yellow' || p.health_status === 'amber' || p.health_status === 'Amber').length || 0,
        critical: activeProjects.filter(p => p.health_status === 'red' || p.health_status === 'Red').length || 0,
      },
      projects: activeProjects.map(p => ({
        id: p.id,
        name: p.project_name,
        health: p.health_status,
        progress: p.percentage_complete || 0,
      })),
    };

    return { success: true, data: healthData };
  } catch (error) {
    console.error('Error getting project health data:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get budget burn rate data for charts
 * @param {string} organizationId - Organization ID
 * @param {string} projectId - Optional project ID for project-specific data
 * @returns {Promise<Object>} Budget burn rate data
 */
export async function getBudgetBurnRate(organizationId, projectId = null) {
  try {
    let query = platformDb
      .from('projects')
      .select('id, project_name, budget_amount, actual_cost, planned_start_date, planned_end_date')
      .eq('account_id', organizationId)
      .eq('is_deleted', false);

    if (projectId) {
      query = query.eq('id', projectId);
    }

    const { data: projects, error } = await query;

    if (error) throw error;

    const burnRateData = projects?.map(project => {
      const daysElapsed = calculateDaysElapsed(project.planned_start_date);
      const totalDays = calculateTotalDays(project.planned_start_date, project.planned_end_date);
      const budgetPerDay = (project.budget_amount || 0) / totalDays;
      const plannedSpend = budgetPerDay * daysElapsed;

      return {
        id: project.id,
        name: project.project_name,
        budget: project.budget_amount || 0,
        actualSpend: project.actual_cost || 0,
        plannedSpend: plannedSpend || 0,
        variance: (project.actual_cost || 0) - (plannedSpend || 0),
        burnRate: daysElapsed > 0 ? (project.actual_cost || 0) / daysElapsed : 0,
      };
    }) || [];

    return { success: true, data: burnRateData };
  } catch (error) {
    console.error('Error getting budget burn rate:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get risk heat map data
 * @param {string} organizationId - Organization ID
 * @returns {Promise<Object>} Risk heat map data
 */
export async function getRiskHeatMapData(organizationId) {
  try {
    // Get risks through projects (risks are project-specific)
    const { data: projects, error: projectsError } = await platformDb
      .from('projects')
      .select(`
        id,
        project_name,
        account_id
      `)
      .eq('account_id', organizationId)
      .eq('is_deleted', false);

    if (projectsError) throw projectsError;

    const projectIds = projects?.map(p => p.id) || [];
    
    if (projectIds.length === 0) {
      return { success: true, data: { risks: [], summary: { high: 0, medium: 0, low: 0 } } };
    }

    const { data: risks, error } = await platformDb
      .from('risks')
      .select(`
        id,
        risk_title,
        probability,
        impact,
        status,
        project_id,
        projects(id, project_name)
      `)
      .in('project_id', projectIds)
      .not('status', 'in', '(closed,realized)')
      .eq('is_deleted', false);

    if (error) throw error;

    const heatMapData = risks?.map((risk) => ({
      id: risk.id,
      name: risk.risk_title,
      probability: riskFactorToLevel(risk.probability),
      impact: riskFactorToLevel(risk.impact),
      riskScore: calculateRiskScore(risk.probability, risk.impact),
      projectName: risk.projects?.project_name || 'Unknown',
    })) || [];

    // Group by risk score
    const summary = {
      high: heatMapData.filter(r => r.riskScore >= 15).length,
      medium: heatMapData.filter(r => r.riskScore >= 8 && r.riskScore < 15).length,
      low: heatMapData.filter(r => r.riskScore < 8).length,
    };

    return { success: true, data: { risks: heatMapData, summary } };
  } catch (error) {
    console.error('Error getting risk heat map data:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get resource allocation data for charts
 * @param {string} organizationId - Organization ID
 * @returns {Promise<Object>} Resource allocation data
 */
export async function getResourceAllocationData(organizationId) {
  try {
    // Get projects for this account first
    const { data: projects, error: projectsError } = await platformDb
      .from('projects')
      .select('id, project_name')
      .eq('account_id', organizationId)
      .eq('is_deleted', false);

    if (projectsError) throw projectsError;

    const projectIds = projects?.map(p => p.id) || [];
    
    if (projectIds.length === 0) {
      return { success: true, data: [] };
    }

    // resource_allocations may not exist in all envs; avoid PostgREST embeds unless FKs are registered.
    try {
      const { data: allocations, error } = await platformDb
        .from('resource_allocations')
        .select('id, allocation_percentage, user_id, project_id')
        .in('project_id', projectIds);

      if (error) throw error;

      if (!allocations?.length) {
        return { success: true, data: [] };
      }

      const userIds = [...new Set(allocations.map((a) => a.user_id).filter(Boolean))];
      const projIds = [...new Set(allocations.map((a) => a.project_id).filter(Boolean))];

      const [usersRes, projsRes] = await Promise.all([
        userIds.length
          ? platformDb.from('users').select('id, full_name').in('id', userIds)
          : Promise.resolve({ data: [], error: null }),
        projIds.length
          ? platformDb.from('projects').select('id, project_name').in('id', projIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (usersRes.error) throw usersRes.error;
      if (projsRes.error) throw projsRes.error;

      const userMap = Object.fromEntries((usersRes.data || []).map((u) => [u.id, u]));
      const projMap = Object.fromEntries((projsRes.data || []).map((p) => [p.id, p]));

      const allocationByUser = {};
      allocations.forEach((allocation) => {
        const uid = allocation.user_id;
        if (!uid) return;

        const proj = projMap[allocation.project_id];
        if (!allocationByUser[uid]) {
          allocationByUser[uid] = {
            userId: uid,
            name: userMap[uid]?.full_name || 'Unknown',
            totalAllocation: 0,
            projects: [],
          };
        }

        allocationByUser[uid].totalAllocation += allocation.allocation_percentage || 0;
        allocationByUser[uid].projects.push({
          projectId: allocation.project_id,
          projectName: proj?.project_name || 'Unknown',
          allocation: allocation.allocation_percentage || 0,
        });
      });

      return { success: true, data: Object.values(allocationByUser) };
    } catch (allocError) {
      const msg = allocError?.message || '';
      const code = allocError?.code || '';
      const missingRelation =
        code === 'PGRST200' ||
        msg.includes('schema cache') ||
        msg.includes('Could not find a relationship');
      const missingTable =
        code === '42P01' ||
        code === 'PGRST205' ||
        /does not exist/i.test(msg) ||
        /Could not find the table/i.test(msg);
      if (missingRelation || missingTable) {
        return { success: true, data: [] };
      }
      throw allocError;
    }
  } catch (error) {
    console.error('Error getting resource allocation data:', error);
    return { success: false, error: error.message };
  }
}

// ====================================
// Helper Functions
// ====================================

/**
 * Calculate overall health score
 */
function calculateHealthScore(projects) {
  if (!projects || projects.length === 0) return 100;

  const scores = {
    green: 100,
    yellow: 60,
    red: 30,
  };

  const totalScore = projects.reduce((sum, p) => sum + (scores[p.health_status] || 60), 0);
  return Math.round(totalScore / projects.length);
}

/**
 * Calculate on-time delivery rate
 */
function calculateOnTimeDeliveryRate(projects, statusMap = {}) {
  const completed = projects?.filter(p => {
    const statusName = statusMap[p.status_id]?.toLowerCase();
    return statusName === 'completed' || statusName === 'done';
  }) || [];
  if (completed.length === 0) return 100;

  const onTime = completed.filter(p => isOnTime(p));
  return Math.round((onTime.length / completed.length) * 100);
}

/**
 * Check if project was completed on time
 */
function isOnTime(project) {
  if (!project.planned_end_date || !project.actual_end_date) return true;
  return new Date(project.actual_end_date) <= new Date(project.planned_end_date);
}

/**
 * Calculate budget variance percentage
 */
function calculateBudgetVariance(projects) {
  const totalBudget = projects?.reduce((sum, p) => sum + (p.budget_amount || 0), 0) || 0;
  const totalSpent = projects?.reduce((sum, p) => sum + (p.actual_cost || 0), 0) || 0;

  if (totalBudget === 0) return 0;
  return Math.round(((totalSpent - totalBudget) / totalBudget) * 100);
}

/**
 * Calculate days elapsed since start date
 */
function calculateDaysElapsed(startDate) {
  if (!startDate) return 0;
  const start = new Date(startDate);
  const now = new Date();
  const diff = now - start;
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Calculate total days between start and end date
 */
function calculateTotalDays(startDate, endDate) {
  if (!startDate || !endDate) return 1;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = end - start;
  return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

/** Map 1–5 scale (or legacy text) to heat-map bucket used by RiskHeatMap.jsx */
function riskFactorToLevel(value) {
  const n =
    typeof value === 'number' && !Number.isNaN(value)
      ? value
      : typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))
        ? Number(value)
        : null;
  if (n != null) {
    if (n <= 2) return 'low';
    if (n >= 4) return 'high';
    return 'medium';
  }
  const key = String(value || '').toLowerCase();
  if (key === 'low' || key === 'very low') return 'low';
  if (key === 'high' || key === 'very high') return 'high';
  return 'medium';
}

/**
 * Calculate risk score from probability and impact
 */
function calculateRiskScore(probability, impact) {
  const toScore = (v, fallback = 3) => {
    if (typeof v === 'number' && !Number.isNaN(v)) {
      return Math.max(1, Math.min(5, Math.round(v)));
    }
    if (typeof v === 'string' && v.trim() !== '') {
      const n = Number(v);
      if (!Number.isNaN(n)) {
        return Math.max(1, Math.min(5, Math.round(n)));
      }
      const map = { low: 1, medium: 3, high: 5, verylow: 1, veryhigh: 5 };
      const key = v.toLowerCase().replace(/\s+/g, '');
      if (map[key] != null) return map[key];
    }
    return fallback;
  };

  return toScore(probability, 3) * toScore(impact, 3);
}

export default {
  getExecutiveSummary,
  getRecentActivity,
  getKPIs,
  getProjectHealthData,
  getBudgetBurnRate,
  getRiskHeatMapData,
  getResourceAllocationData,
};
