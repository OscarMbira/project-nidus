/**
 * Dashboard Service
 *
 * Provides dashboard analytics, KPIs, and aggregated data for Platform
 * Uses platformDb for real project data
 */

import { platformDb } from './supabase/supabaseClient';
import { computeEvmMetrics } from './evmService';
import { executiveAlertRagFromRow } from '../utils/pmoOverviewMetricRag';

/**
 * Map project lookup row to executive summary buckets (aligned with seeded status_code values).
 * Ensures Draft / Planning / etc. contribute to Planned, not zero when total > 0.
 */
export function bucketProjectExecutiveKey(meta) {
  if (!meta) return 'planned'
  const code = String(meta.status_code || '')
    .toLowerCase()
    .trim()
  const name = String(meta.status_name || '')
    .toLowerCase()
    .trim()
  if (code === 'active' || code === 'at_risk') return 'active'
  if (code === 'completed' || code === 'closed' || code === 'cancelled') return 'completed'
  if (code === 'on_hold' || name === 'on hold') return 'onHold'
  if (
    code === 'planning' ||
    code === 'draft' ||
    code === 'under_review'
  ) {
    return 'planned'
  }
  if (name.includes('at risk')) return 'active'
  if (name.includes('complete') || name.includes('closed') || name.includes('cancel')) return 'completed'
  if (name.includes('hold') || name.includes('pause')) return 'onHold'
  if (name.includes('plan') || name.includes('draft') || name.includes('review')) return 'planned'
  return 'planned'
}

/** Same filters as getPortfolios({}) / getProgrammesForList({}) — is_deleted = false only. */
async function fetchPortfolioProgrammeSummaryRows() {
  const [portRes, progRes] = await Promise.all([
    platformDb.from('portfolios').select('id, portfolio_status').eq('is_deleted', false),
    platformDb.from('programmes').select('id, programme_status, portfolio_id').eq('is_deleted', false),
  ])
  if (portRes.error) {
    console.warn('[dashboard] portfolios executive summary:', portRes.error.message || portRes.error)
  }
  if (progRes.error) {
    console.warn('[dashboard] programmes executive summary:', progRes.error.message || progRes.error)
  }
  return {
    portfolioRows: portRes.error ? [] : (portRes.data || []),
    programmeRows: progRes.error ? [] : (progRes.data || []),
  }
}

/**
 * Map executive alert severity to PMO RAG (Red / Amber / Green).
 * @param {'danger'|'warning'|'ok'|string} severity
 * @returns {'red'|'amber'|'green'}
 */
export function mapSeverityToRag(severity) {
  const s = String(severity || '').toLowerCase();
  if (s === 'danger') return 'red';
  if (s === 'warning') return 'amber';
  return 'green';
}

/**
 * Worst RAG among alert rows with a non-zero count (red beats amber beats green).
 * @param {Array<{ count?: number, rag?: string }>} items
 * @returns {'red'|'amber'|'green'}
 */
export function worstRagFromAlertItems(items) {
  const active = (items || []).filter((i) => Number(i.count) > 0);
  if (!active.length) return 'green';
  if (active.some((i) => String(i.rag || '').toLowerCase() === 'red')) return 'red';
  if (active.some((i) => {
    const r = String(i.rag || '').toLowerCase();
    return r === 'amber' || r === 'yellow';
  })) return 'amber';
  return 'green';
}

/** Map portfolio/programme lifecycle status strings to summary buckets */
export function bucketPmLifecycle(statusRaw) {
  const s = String(statusRaw || '')
    .toLowerCase()
    .trim()
    .replace(/_/g, '-')
  if (s === 'active') return 'active'
  if (s === 'completed') return 'completed'
  if (s === 'on-hold' || s === 'on hold' || s === 'paused') return 'onHold'
  if (s === 'planning' || s === 'planned') return 'planning'
  if (s === 'cancelled' || s === 'canceled') return 'cancelled'
  return 'planning'
}

/** Normalized embedded row from PostgREST (object or single-element array). */
function getEmbeddedTaskStatus(taskRow) {
  if (!taskRow || typeof taskRow !== 'object') return null
  let ts = taskRow.task_statuses
  if (Array.isArray(ts)) ts = ts[0]
  if (ts && typeof ts === 'object') return ts
  return null
}

/**
 * Map a task + task_statuses row to Executive Summary task card buckets.
 * Prefer status_code (seeded in v06: todo, in_progress, in_review, blocked, completed, cancelled).
 * @returns {'todo'|'inProgress'|'completed'|'blocked'}
 */
export function bucketTaskExecutiveKey(taskRow, statusLookupById = null) {
  const embedded = getEmbeddedTaskStatus(taskRow)
  const fromLookup =
    taskRow?.status_id && statusLookupById && statusLookupById[taskRow.status_id]
      ? statusLookupById[taskRow.status_id]
      : null
  const ts = embedded || fromLookup
  const code = String(ts?.status_code ?? '')
    .toLowerCase()
    .trim()
  if (code === 'todo') return 'todo'
  if (code === 'in_progress' || code === 'in_review') return 'inProgress'
  if (code === 'completed' || code === 'cancelled') return 'completed'
  if (code === 'blocked') return 'blocked'
  const name = String(ts?.status_name ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
  if (name === 'to do' || name === 'todo' || name === 'not started') return 'todo'
  if (name.includes('progress') || name.includes('review')) return 'inProgress'
  if (name.includes('complete') || name.includes('done') || name.includes('cancel')) return 'completed'
  if (name.includes('block')) return 'blocked'
  if (!taskRow?.status_id) return 'todo'
  return 'todo'
}

/**
 * Get executive summary for organization dashboard
 * @param {string} organizationId - Organization ID
 * @returns {Promise<Object>} Executive summary data
 */
export async function getExecutiveSummary(organizationId) {
  try {
    // Wave 1 — parallel: org projects + status lookup + portfolio/programme lists (no waterfall)
    const [projectsRes, psRes, pmScope] = await Promise.all([
      platformDb
        .from('projects')
        .select('id, status_id')
        .eq('account_id', organizationId)
        .eq('is_deleted', false),
      platformDb
        .from('project_statuses')
        .select('id, status_name, status_code')
        .eq('is_deleted', false),
      fetchPortfolioProgrammeSummaryRows(),
    ])

    if (projectsRes.error) throw projectsRes.error

    const projects = projectsRes.data || []
    const projectIds = projects.map((p) => p.id)

    let projectStatusById = {}
    if (psRes.error) {
      console.warn('[dashboard] project_statuses lookup:', psRes.error.message || psRes.error)
    } else if (psRes.data) {
      projectStatusById = psRes.data.reduce((acc, row) => {
        acc[row.id] = { status_name: row.status_name, status_code: row.status_code }
        return acc
      }, {})
    }
    const portfolioRows = pmScope.portfolioRows
    const programmeRows = pmScope.programmeRows

    // Tasks, teams, and project link counts (programme_projects / portfolio_projects)
    const [tasksData, teamsData, progProjLinks, portProjLinks] = await Promise.all([
      projectIds.length > 0 ? platformDb
        .from('tasks')
        .select('status_id, task_statuses(status_code, status_name)', { count: 'exact' })
        .in('project_id', projectIds)
        .eq('is_deleted', false)
        .limit(10000) : { data: [], count: 0, error: null },

      projectIds.length > 0 ? platformDb
        .from('teams')
        .select('id', { count: 'exact' })
        .in('project_id', projectIds)
        .eq('is_deleted', false) : { data: [], count: 0, error: null },

      projectIds.length > 0 ? platformDb
        .from('programme_projects')
        .select('project_id')
        .in('project_id', projectIds)
        .eq('is_deleted', false) : { data: [], error: null },

      projectIds.length > 0 ? platformDb
        .from('portfolio_projects')
        .select('project_id')
        .in('project_id', projectIds)
        .eq('is_deleted', false) : { data: [], error: null },
    ]);

    if (progProjLinks.error) {
      console.warn('[dashboard] programme_projects link counts:', progProjLinks.error.message || progProjLinks.error)
    }
    if (portProjLinks.error) {
      console.warn('[dashboard] portfolio_projects link counts:', portProjLinks.error.message || portProjLinks.error)
    }

    const linkedProjectIdsToProgrammes = new Set(
      progProjLinks.error ? [] : (progProjLinks.data || []).map((r) => r.project_id).filter(Boolean)
    )
    const linkedProjectIdsToPortfolios = new Set(
      portProjLinks.error ? [] : (portProjLinks.data || []).map((r) => r.project_id).filter(Boolean)
    )

    /** Overlap / exclusivity — same total size for each dimension can still differ in composition */
    let linkedToBothProgrammeAndPortfolio = 0
    let linkedToProgrammesOnly = 0
    let linkedToPortfoliosOnly = 0
    for (const id of linkedProjectIdsToProgrammes) {
      if (linkedProjectIdsToPortfolios.has(id)) linkedToBothProgrammeAndPortfolio += 1
      else linkedToProgrammesOnly += 1
    }
    for (const id of linkedProjectIdsToPortfolios) {
      if (!linkedProjectIdsToProgrammes.has(id)) linkedToPortfoliosOnly += 1
    }

    const linkedToProgrammeOrPortfolio = new Set([
      ...linkedProjectIdsToProgrammes,
      ...linkedProjectIdsToPortfolios,
    ])
    const unlinkedNoProgrammeOrPortfolio = projects.filter(
      (p) => !linkedToProgrammeOrPortfolio.has(p.id)
    ).length

    if (tasksData.error) {
      console.warn('[dashboard] tasks summary query:', tasksData.error.message || tasksData.error)
    }
    if (teamsData.error) {
      console.warn('[dashboard] teams summary query:', teamsData.error.message || teamsData.error)
    }

    let taskRows = tasksData.error ? [] : (tasksData.data || [])
    let taskCount = tasksData.error ? 0 : (tasksData.count ?? taskRows.length)

    // PostgREST can return count with an empty body in some cases; re-fetch rows for breakdown.
    if (!tasksData.error && taskCount > 0 && taskRows.length === 0 && projectIds.length > 0) {
      const retry = await platformDb
        .from('tasks')
        .select('status_id, task_statuses(status_code, status_name)')
        .in('project_id', projectIds)
        .eq('is_deleted', false)
        .limit(10000)
      if (!retry.error && retry.data?.length) {
        taskRows = retry.data
      }
    }

    // Fallback when embed is null (e.g. RLS) but status_id is set — single batch by id.
    const missingStatusIds = [
      ...new Set(
        taskRows
          .filter((t) => t?.status_id && !getEmbeddedTaskStatus(t))
          .map((t) => t.status_id)
      ),
    ]
    let statusLookupById = {}
    if (missingStatusIds.length > 0) {
      const { data: stRows, error: stErr } = await platformDb
        .from('task_statuses')
        .select('id, status_code, status_name')
        .in('id', missingStatusIds)
      if (!stErr && stRows) {
        statusLookupById = stRows.reduce((acc, row) => {
          acc[row.id] = row
          return acc
        }, {})
      }
    }

    // Calculate status breakdowns
    const projectsList = projects || [];
    const tasks = taskRows

    const portfoliosSummary = {
      total: portfolioRows.length,
      active: portfolioRows.filter(p => bucketPmLifecycle(p.portfolio_status) === 'active').length,
      completed: portfolioRows.filter(p => bucketPmLifecycle(p.portfolio_status) === 'completed').length,
      onHold: portfolioRows.filter(p => bucketPmLifecycle(p.portfolio_status) === 'onHold').length,
      planning: portfolioRows.filter(p => bucketPmLifecycle(p.portfolio_status) === 'planning').length,
      cancelled: portfolioRows.filter(p => bucketPmLifecycle(p.portfolio_status) === 'cancelled').length,
    }

    const programmesSummary = {
      total: programmeRows.length,
      active: programmeRows.filter(p => bucketPmLifecycle(p.programme_status) === 'active').length,
      completed: programmeRows.filter(p => bucketPmLifecycle(p.programme_status) === 'completed').length,
      onHold: programmeRows.filter(p => bucketPmLifecycle(p.programme_status) === 'onHold').length,
      planning: programmeRows.filter(p => bucketPmLifecycle(p.programme_status) === 'planning').length,
      cancelled: programmeRows.filter(p => bucketPmLifecycle(p.programme_status) === 'cancelled').length,
      /** Programmes with a parent portfolio_id (hierarchy link, not project assignment) */
      linkedToPortfolios: programmeRows.filter((p) => Boolean(p.portfolio_id)).length,
      /** No portfolio_id (not placed under a portfolio) */
      unlinkedNoPortfolio: programmeRows.filter((p) => !p.portfolio_id).length,
    }

    const projectsKpi = { total: projectsList.length, active: 0, completed: 0, onHold: 0, planned: 0 }
    for (const p of projectsList) {
      const meta = p.status_id ? projectStatusById[p.status_id] : null
      const bucket = bucketProjectExecutiveKey(meta)
      if (bucket === 'active') projectsKpi.active += 1
      else if (bucket === 'completed') projectsKpi.completed += 1
      else if (bucket === 'onHold') projectsKpi.onHold += 1
      else projectsKpi.planned += 1
    }

    const summary = {
      portfolios: portfoliosSummary,
      programmes: programmesSummary,
      projects: {
        ...projectsKpi,
        /** Distinct org projects with ≥1 programme_projects row */
        linkedToProgrammes: linkedProjectIdsToProgrammes.size,
        /** Distinct org projects with ≥1 portfolio_projects row */
        linkedToPortfolios: linkedProjectIdsToPortfolios.size,
        /** Distinct projects present in both junction tables */
        linkedToBothProgrammeAndPortfolio,
        /** programme_projects only (no portfolio_projects row for that project) */
        linkedToProgrammesOnly,
        /** portfolio_projects only (no programme_projects row for that project) */
        linkedToPortfoliosOnly,
        /** No row in programme_projects nor portfolio_projects for this org project */
        unlinkedNoProgrammeOrPortfolio,
      },
      tasks: (() => {
        let todo = 0
        let inProgress = 0
        let completed = 0
        let blocked = 0
        for (const t of tasks) {
          const bucket = bucketTaskExecutiveKey(t, statusLookupById)
          if (bucket === 'todo') todo += 1
          else if (bucket === 'inProgress') inProgress += 1
          else if (bucket === 'completed') completed += 1
          else if (bucket === 'blocked') blocked += 1
        }
        return {
          total: taskCount,
          todo,
          inProgress,
          completed,
          blocked,
        }
      })(),
      teams: {
        total: teamsData.error ? 0 : (teamsData.count ?? (teamsData.data || []).length),
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
 * @param {{ projectIds?: string[] }} [options] - When set, only activities for these projects (must belong to the org)
 * @returns {Promise<Object>} Recent activities
 */
export async function getRecentActivity(organizationId, limit = 20, options = {}) {
  try {
    const filterSet =
      Array.isArray(options.projectIds) && options.projectIds.length
        ? new Set(options.projectIds)
        : null;

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
    
    let projectIds = accountProjects.map(p => p.id);
    if (filterSet) {
      projectIds = projectIds.filter((id) => filterSet.has(id));
    }
    if (projectIds.length === 0) {
      return { success: true, data: [] };
    }
    
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
    /** status_name-only maps break when DB uses status_code (e.g. active vs "In delivery"). Align with bucketProjectExecutiveKey. */
    let statusMetaById = {};
    if (statusIds.length > 0) {
      const { data: statuses, error: statusError } = await platformDb
        .from('project_statuses')
        .select('id, status_name, status_code')
        .in('id', statusIds);

      if (!statusError && statuses) {
        statusMap = statuses.reduce((acc, status) => {
          acc[status.id] = status.status_name;
          return acc;
        }, {});
        statusMetaById = statuses.reduce((acc, row) => {
          acc[row.id] = { status_name: row.status_name, status_code: row.status_code };
          return acc;
        }, {});
      }
    }

    const bucketForProject = (p) =>
      bucketProjectExecutiveKey(p.status_id ? statusMetaById[p.status_id] : null);

    // In-flight delivery (same bucket as executive summary "active")
    const activeProjects =
      projects?.filter((p) => bucketForProject(p) === 'active') || [];

    // Calculate KPIs
    const kpis = {
      projectHealth: {
        healthy: activeProjects.filter(p => p.health_status === 'green' || p.health_status === 'Green').length,
        atRisk: activeProjects.filter(p => p.health_status === 'yellow' || p.health_status === 'amber' || p.health_status === 'Amber').length,
        critical: activeProjects.filter(p => p.health_status === 'red' || p.health_status === 'Red').length,
        score: calculateHealthScore(activeProjects),
      },
      onTimeDelivery: {
        percentage: calculateOnTimeDeliveryRate(projects, statusMetaById),
        count: projects?.filter(p => {
          return bucketForProject(p) === 'completed' && isOnTime(p);
        }).length || 0,
        total: projects?.filter(p => bucketForProject(p) === 'completed').length || 0,
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
 * Build PMO scope overview metrics (Portfolio / Programmes / Projects) from executive summary + KPI payloads.
 * Used by the Platform dashboard overview bands; exported for unit tests.
 *
 * @param {object} summary - Data shape from getExecutiveSummary().data
 * @param {object} kpis - Data shape from getKPIs().data
 * @returns {{ portfolio: object, programmes: object, projects: object }}
 */
export function buildPmoOverviewMetricsFromSummaries(summary, kpis, extended) {
  if (!summary) {
    return {
      portfolio: {},
      programmes: {},
      projects: {},
    };
  }

  const p = summary.portfolios || {};
  const g = summary.programmes || {};
  const j = summary.projects || {};
  const k = kpis || {};
  const ph = k.projectHealth || {};
  const ot = k.onTimeDelivery || {};
  const bv = k.budgetVariance || {};
  const x = extended || {};

  const progTotal = g.total ?? 0;
  const linkedToPort = g.linkedToPortfolios ?? 0;
  const coveragePercent =
    progTotal > 0 ? Math.round((linkedToPort / progTotal) * 100) : null;

  const xp = x.portfolio || {};
  const xg = x.programmes || {};
  const xj = x.projects || {};

  return {
    portfolio: {
      total: p.total ?? 0,
      active: p.active ?? 0,
      planning: p.planning ?? 0,
      onHold: p.onHold ?? 0,
      programmesWithPortfolioParent: linkedToPort,
      programmesWithoutPortfolio: g.unlinkedNoPortfolio ?? 0,
      coveragePercent,
      budgetUtilizationPct: xp.budgetUtilizationPct ?? null,
      healthIndex: xp.healthIndex ?? null,
      governanceCompliancePct: xp.governanceCompliancePct ?? null,
      benefitsRealizationPct: xp.benefitsRealizationPct ?? null,
      evm: x.evm?.portfolio ?? null,
    },
    programmes: {
      total: g.total ?? 0,
      active: g.active ?? 0,
      planning: g.planning ?? 0,
      onHold: g.onHold ?? 0,
      linkedToPortfolio: linkedToPort,
      unlinkedNoPortfolio: g.unlinkedNoPortfolio ?? 0,
      distinctProjectsOnProgrammes: j.linkedToProgrammes ?? 0,
      healthIndex: xg.healthIndex ?? null,
      deliveryProgressPct: xg.deliveryProgressPct ?? null,
      scheduleVarianceCount: xg.scheduleVarianceCount ?? null,
      budgetUtilizationPct: xg.budgetUtilizationPct ?? null,
      benefitsProgressPct: xg.benefitsProgressPct ?? null,
      blockedDependencies: xg.blockedDependencies ?? null,
      milestoneAchievementPct: xg.milestoneAchievementPct ?? null,
      resourceConflictCount: xg.resourceConflictCount ?? null,
      evm: x.evm?.programmes ?? null,
    },
    projects: {
      total: j.total ?? 0,
      active: j.active ?? 0,
      planned: j.planned ?? 0,
      completed: j.completed ?? 0,
      onHold: j.onHold ?? 0,
      healthScore: ph.score ?? null,
      healthy: ph.healthy ?? 0,
      atRisk: ph.atRisk ?? 0,
      critical: ph.critical ?? 0,
      onTimeDeliveryPct: ot.percentage ?? 0,
      onTimeCount: ot.count ?? 0,
      onTimeTotal: ot.total ?? 0,
      budgetVariancePct: bv.percentage ?? 0,
      totalBudget: bv.totalBudget ?? 0,
      totalSpent: bv.totalSpent ?? 0,
      unlinkedNoProgrammeOrPortfolio: j.unlinkedNoProgrammeOrPortfolio ?? 0,
      linkedToBothProgrammeAndPortfolio: j.linkedToBothProgrammeAndPortfolio ?? 0,
      scheduleRag: xj.scheduleRag ?? null,
      openRisksHighCritical: xj.openRisksHighCritical ?? null,
      openIssues: xj.openIssues ?? null,
      overdueTasks: xj.overdueTasks ?? null,
      changeRequestsPending: xj.changeRequestsPending ?? null,
      documentCompliancePct: xj.documentCompliancePct ?? null,
      avgTaskCompletionPct: xj.avgTaskCompletionPct ?? null,
      evm: x.evm?.projectsRollup ?? null,
      criticalPath: x.criticalPath ?? null,
      riskBand: x.riskIssue?.risks ?? null,
      issueBand: x.riskIssue?.issues ?? null,
      changeBand: x.riskIssue?.changeRequests ?? null,
    },
  };
}

// --- v475 PMO executive metrics (alerts, EVM, critical path, risk/issue/CR aggregates) ---

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

function riskIsOpen(row) {
  if (row.status_enum) {
    return !['closed', 'expired'].includes(String(row.status_enum));
  }
  const s = String(row.status || '')
    .toLowerCase()
    .trim();
  return !['closed', 'realized'].includes(s);
}

function issueIsOpen(row) {
  const s = String(row.status || '')
    .toLowerCase()
    .trim();
  return !['closed', 'cancelled'].includes(s);
}

function isCriticalRiskScore(row) {
  const prs = String(row.pre_risk_score || '').toLowerCase();
  const rl = String(row.risk_level || '').toLowerCase();
  return prs === 'very_high' || prs === 'high' || rl === 'critical';
}

/**
 * Latest EVM snapshot per project + org-level rollups (v475).
 */
export async function getAggregatedEvmMetrics(organizationId) {
  const empty = {
    portfolio: {
      bac: 0,
      ev: 0,
      pv: 0,
      ac: 0,
      cv: 0,
      sv: 0,
      cpi: null,
      spi: null,
      eac: null,
      vac: null,
      projectsCpiLt085: 0,
      projectsSpiLt085: 0,
      projectsNoEvm: 0,
      projectsCpiLt1: 0,
      projectsSpiLt1: 0,
    },
    programmes: { programmeRollups: [], programmesCpiLt1: 0, programmesSpiLt1: 0 },
    projectsRollup: {
      bac: 0,
      ev: 0,
      pv: 0,
      ac: 0,
      cv: 0,
      sv: 0,
      cpi: null,
      spi: null,
      eac: null,
      vac: null,
      projectsCpiLt085: 0,
      projectsSpiLt085: 0,
      projectsNoEvm: 0,
      projectsCpiLt1: 0,
      projectsSpiLt1: 0,
    },
    byProjectId: {},
  };

  try {
    const { data: projects, error: pe } = await platformDb
      .from('projects')
      .select('id, budget_amount, actual_cost')
      .eq('account_id', organizationId)
      .eq('is_deleted', false);
    if (pe) throw pe;
    const plist = projects || [];
    const projectIds = plist.map((p) => p.id);
    const bacByProject = Object.fromEntries(
      plist.map((p) => [p.id, Number(p.budget_amount) || 0])
    );
    if (!projectIds.length) {
      return { success: true, data: empty };
    }

    const { data: snaps, error: se } = await platformDb
      .from('project_evm_snapshots')
      .select('project_id, period_date, planned_value, earned_value, actual_cost')
      .in('project_id', projectIds);
    if (se) throw se;

    const latestByProject = {};
    (snaps || []).forEach((row) => {
      const pid = row.project_id;
      const pd = row.period_date;
      const prev = latestByProject[pid];
      if (!prev || String(pd) > String(prev.period_date)) {
        latestByProject[pid] = row;
      }
    });

    let bac = 0;
    let ev = 0;
    let pv = 0;
    let ac = 0;
    let projectsNoEvm = 0;
    let projectsCpiLt085 = 0;
    let projectsSpiLt085 = 0;
    let projectsCpiLt1 = 0;
    let projectsSpiLt1 = 0;
    const byProjectId = {};

    projectIds.forEach((pid) => {
      const bacN = bacByProject[pid] || 0;
      bac += bacN;
      const snap = latestByProject[pid];
      if (!snap) {
        projectsNoEvm += 1;
        byProjectId[pid] = { hasEvm: false, cpi: null, spi: null };
        return;
      }
      const m = computeEvmMetrics(snap, bacN);
      const cpi = m.cpi;
      const spi = m.spi;
      ev += Number(snap.earned_value) || 0;
      pv += Number(snap.planned_value) || 0;
      ac += Number(snap.actual_cost) || 0;
      byProjectId[pid] = { hasEvm: true, cpi, spi, snapshot: snap };
      if (cpi != null && cpi < 0.85) projectsCpiLt085 += 1;
      if (spi != null && spi < 0.85) projectsSpiLt085 += 1;
      if (cpi != null && cpi < 1) projectsCpiLt1 += 1;
      if (spi != null && spi < 1) projectsSpiLt1 += 1;
    });

    const roll = (sumEv, sumPv, sumAc, sumBac) => {
      const cv = sumEv - sumAc;
      const sv = sumEv - sumPv;
      const cpi = sumAc !== 0 ? sumEv / sumAc : null;
      const spi = sumPv !== 0 ? sumEv / sumPv : null;
      const eac = cpi && cpi !== 0 ? sumBac / cpi : null;
      const vac = eac != null ? sumBac - eac : null;
      return { cv, sv, cpi, spi, eac, vac };
    };

    const pr = roll(ev, pv, ac, bac);

    const { data: progLinks, error: le } = await platformDb
      .from('programme_projects')
      .select('programme_id, project_id')
      .in('project_id', projectIds)
      .eq('is_deleted', false);
    if (le) throw le;

    const programmeToProjects = {};
    (progLinks || []).forEach((r) => {
      if (!r.programme_id || !r.project_id) return;
      if (!programmeToProjects[r.programme_id]) programmeToProjects[r.programme_id] = [];
      programmeToProjects[r.programme_id].push(r.project_id);
    });

    let programmesCpiLt1 = 0;
    let programmesSpiLt1 = 0;
    const programmeRollups = Object.keys(programmeToProjects).map((progId) => {
      const pids = programmeToProjects[progId];
      let b = 0;
      let e = 0;
      let p = 0;
      let a = 0;
      pids.forEach((pid) => {
        b += bacByProject[pid] || 0;
        const sn = latestByProject[pid];
        if (sn) {
          e += Number(sn.earned_value) || 0;
          p += Number(sn.planned_value) || 0;
          a += Number(sn.actual_cost) || 0;
        }
      });
      const r = roll(e, p, a, b);
      if (r.cpi != null && r.cpi < 1) programmesCpiLt1 += 1;
      if (r.spi != null && r.spi < 1) programmesSpiLt1 += 1;
      return {
        programmeId: progId,
        bac: b,
        ev: e,
        pv: p,
        ac: a,
        ...r,
      };
    });

    const data = {
      portfolio: {
        bac,
        ev,
        pv,
        ac,
        cv: pr.cv,
        sv: pr.sv,
        cpi: pr.cpi,
        spi: pr.spi,
        eac: pr.eac,
        vac: pr.vac,
        projectsCpiLt085,
        projectsSpiLt085,
        projectsNoEvm,
        projectsCpiLt1,
        projectsSpiLt1,
      },
      programmes: { programmeRollups, programmesCpiLt1, programmesSpiLt1 },
      projectsRollup: {
        bac,
        ev,
        pv,
        ac,
        cv: pr.cv,
        sv: pr.sv,
        cpi: pr.cpi,
        spi: pr.spi,
        eac: pr.eac,
        vac: pr.vac,
        projectsCpiLt085,
        projectsSpiLt085,
        projectsNoEvm,
        projectsCpiLt1,
        projectsSpiLt1,
      },
      byProjectId,
    };
    return { success: true, data };
  } catch (error) {
    console.error('[dashboard] getAggregatedEvmMetrics:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Lightweight critical-path proxy (v475): tasks flagged is_critical_path + dependencies.
 */
export async function getCriticalPathSummary(organizationId) {
  const zero = {
    cpTasksTotal: 0,
    cpTasksOverdue: 0,
    cpTasksBlocked: 0,
    projectsWithCpDelay: 0,
    avgCpDelayDays: null,
    cpMilestonesAtRisk: 0,
  };
  try {
    const { data: projects, error: pe } = await platformDb
      .from('projects')
      .select('id')
      .eq('account_id', organizationId)
      .eq('is_deleted', false);
    if (pe) throw pe;
    const projectIds = (projects || []).map((p) => p.id);
    if (!projectIds.length) return { success: true, data: zero };

    const { data: tasks, error: te } = await platformDb
      .from('tasks')
      .select(
        'id, project_id, planned_end_date, due_date, percentage_complete, is_blocked, is_milestone, is_critical_path'
      )
      .in('project_id', projectIds)
      .eq('is_deleted', false);
    if (te) throw te;
    const taskRows = tasks || [];
    const cpTasks = taskRows.filter((t) => t.is_critical_path === true);
    const cpIds = new Set(cpTasks.map((t) => t.id));
    const taskById = Object.fromEntries(taskRows.map((t) => [t.id, t]));

    const today = todayISODate();
    const isIncomplete = (t) => Number(t.percentage_complete) < 100;

    let cpTasksOverdue = 0;
    let delaySum = 0;
    let delayN = 0;
    const overdueProjectIds = new Set();

    cpTasks.forEach((t) => {
      if (!isIncomplete(t)) return;
      const end = t.planned_end_date || t.due_date;
      if (end && String(end) < today) {
        cpTasksOverdue += 1;
        overdueProjectIds.add(t.project_id);
        const d0 = new Date(`${end}T12:00:00`);
        const d1 = new Date(`${today}T12:00:00`);
        const days = Math.max(0, Math.round((d1 - d0) / (86400 * 1000)));
        delaySum += days;
        delayN += 1;
      }
    });

    const succIds = cpTasks.map((t) => t.id).filter(Boolean);
    const blockedTaskIds = new Set();
    if (succIds.length) {
      const { data: deps, error: de } = await platformDb
        .from('task_dependencies')
        .select('predecessor_task_id, successor_task_id')
        .in('successor_task_id', succIds)
        .eq('is_deleted', false);
      if (!de && deps) {
        deps.forEach((d) => {
          if (!cpIds.has(d.successor_task_id)) return;
          const pred = taskById[d.predecessor_task_id];
          if (pred && Number(pred.percentage_complete) < 100) {
            blockedTaskIds.add(d.successor_task_id);
          }
        });
      }
    }

    cpTasks.forEach((t) => {
      if (t.is_blocked && isIncomplete(t)) blockedTaskIds.add(t.id);
    });
    const cpTasksBlocked = blockedTaskIds.size;

    let cpMilestonesAtRisk = 0;
    cpTasks.forEach((t) => {
      if (!t.is_milestone || !isIncomplete(t)) return;
      const end = t.planned_end_date || t.due_date;
      if (end && String(end) < today) cpMilestonesAtRisk += 1;
    });

    const data = {
      cpTasksTotal: cpTasks.length,
      cpTasksOverdue,
      cpTasksBlocked,
      projectsWithCpDelay: overdueProjectIds.size,
      avgCpDelayDays: delayN > 0 ? Math.round(delaySum / delayN) : null,
      cpMilestonesAtRisk,
    };
    return { success: true, data };
  } catch (error) {
    console.error('[dashboard] getCriticalPathSummary:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Risk, issue, and change-request aggregates for dashboard (v475).
 */
export async function getRiskIssueSummary(organizationId) {
  const blank = {
    risks: {
      openTotal: 0,
      criticalOpen: 0,
      imminent: 0,
      overdueReviews: 0,
      unmitigatedCritical: 0,
      escalatedToIssue: 0,
      noOwner: 0,
      rag: 'green',
    },
    issues: {
      openTotal: 0,
      criticalOpen: 0,
      overdueActions: 0,
      rfc: 0,
      offSpec: 0,
      problemConcern: 0,
      highAgeOpen: 0,
      noOwner: 0,
      escalatedFromRisk: 0,
    },
    changeRequests: {
      pendingApproval: 0,
      underAssessment: 0,
      criticalUrgent: 0,
      totalOpen: 0,
      pendingApprovalOver7d: 0,
    },
  };
  try {
    const { data: projects, error: pe } = await platformDb
      .from('projects')
      .select('id')
      .eq('account_id', organizationId)
      .eq('is_deleted', false);
    if (pe) throw pe;
    const projectIds = (projects || []).map((p) => p.id);
    if (!projectIds.length) return { success: true, data: blank };

    const [risksRes, issuesRes, crsRes, responsesRes] = await Promise.all([
      platformDb
        .from('risks')
        .select(
          'id, project_id, status, status_enum, pre_risk_score, risk_level, proximity, next_review_date, risk_owner_id, escalated_to_issue_id'
        )
        .in('project_id', projectIds)
        .eq('is_deleted', false),
      platformDb
        .from('issues')
        .select(
          'id, project_id, status, priority, severity, issue_type, owner_id, escalated_from_risk_id, date_raised, created_at'
        )
        .in('project_id', projectIds)
        .eq('is_deleted', false),
      platformDb
        .from('change_requests')
        .select('id, project_id, status, priority, submission_date')
        .in('project_id', projectIds)
        .eq('is_deleted', false),
      platformDb.from('risk_responses').select('id, risk_id, status'),
    ]);

    if (risksRes.error) throw risksRes.error;
    if (issuesRes.error) throw issuesRes.error;
    if (crsRes.error) throw crsRes.error;
    if (responsesRes.error) throw responsesRes.error;

    const risks = risksRes.data || [];
    const issues = issuesRes.data || [];
    const crs = crsRes.data || [];
    const responses = responsesRes.data || [];

    const issueIdList = issues.map((i) => i.id);
    let actions = [];
    if (issueIdList.length) {
      const { data: actRows, error: actErr } = await platformDb
        .from('issue_actions')
        .select('id, issue_id, target_date, status')
        .in('issue_id', issueIdList)
        .in('status', ['planned', 'in_progress', 'blocked']);
      if (actErr) throw actErr;
      actions = actRows || [];
    }

    const issueIds = new Set(issues.map((i) => i.id));
    const responsesByRisk = {};
    responses.forEach((r) => {
      if (!r.risk_id) return;
      if (!responsesByRisk[r.risk_id]) responsesByRisk[r.risk_id] = [];
      responsesByRisk[r.risk_id].push(r);
    });

    const openRisks = risks.filter(riskIsOpen);
    let criticalOpen = 0;
    let imminent = 0;
    let overdueReviews = 0;
    let unmitigatedCritical = 0;
    let escalatedToIssue = 0;
    let noOwner = 0;
    const today = todayISODate();

    openRisks.forEach((r) => {
      if (isCriticalRiskScore(r)) criticalOpen += 1;
      if (String(r.proximity || '').toLowerCase() === 'imminent') imminent += 1;
      if (r.next_review_date && String(r.next_review_date) < today) overdueReviews += 1;
      if (r.escalated_to_issue_id) escalatedToIssue += 1;
      if (!r.risk_owner_id) noOwner += 1;
      if (isCriticalRiskScore(r)) {
        const rs = responsesByRisk[r.id] || [];
        if (rs.length === 0) unmitigatedCritical += 1;
      }
    });

    let rag = 'green';
    if (criticalOpen >= 4) rag = 'red';
    else if (criticalOpen >= 1) rag = 'amber';

    const openIssues = issues.filter(issueIsOpen);
    let criticalIss = 0;
    let highAge = 0;
    let noIssOwner = 0;
    let escFromRisk = 0;
    let rfc = 0;
    let offSpec = 0;
    let prob = 0;
    const thirtyAgo = new Date();
    thirtyAgo.setDate(thirtyAgo.getDate() - 30);

    openIssues.forEach((i) => {
      const pr = String(i.priority || '').toLowerCase();
      const sev = String(i.severity || '').toLowerCase();
      if (pr === 'critical' || sev === 'critical') criticalIss += 1;
      if (!i.owner_id) noIssOwner += 1;
      if (i.escalated_from_risk_id) escFromRisk += 1;
      const it = String(i.issue_type || '').toLowerCase();
      if (it === 'request_for_change') rfc += 1;
      if (it === 'off_specification') offSpec += 1;
      if (it === 'problem_concern') prob += 1;
      const dr = i.date_raised ? new Date(i.date_raised) : new Date(i.created_at);
      if (dr < thirtyAgo && String(i.status || '').toLowerCase() === 'open') highAge += 1;
    });

    const actionIssueIds = [...new Set(actions.map((a) => a.issue_id))];
    let overdueActions = 0;
    actionIssueIds.forEach((iid) => {
      if (!issueIds.has(iid)) return;
      const iss = issues.find((x) => x.id === iid);
      if (!iss || !issueIsOpen(iss)) return;
      const acts = actions.filter((a) => a.issue_id === iid);
      acts.forEach((a) => {
        if (['completed', 'cancelled'].includes(String(a.status || '').toLowerCase())) return;
        if (a.target_date && String(a.target_date) < today) overdueActions += 1;
      });
    });

    const crOpen = (st) => {
      const x = String(st || '').toLowerCase();
      return !['implemented', 'rejected', 'cancelled'].includes(x);
    };

    let pendingApproval = 0;
    let underAssessment = 0;
    let criticalUrgent = 0;
    let totalOpen = 0;
    let pendingApprovalOver7d = 0;
    const sevenAgo = new Date();
    sevenAgo.setDate(sevenAgo.getDate() - 7);

    crs.forEach((c) => {
      if (!crOpen(c.status)) return;
      totalOpen += 1;
      const st = String(c.status || '').toLowerCase();
      if (st === 'pending-approval') {
        pendingApproval += 1;
        const sd = c.submission_date ? new Date(c.submission_date) : null;
        if (sd && sd < sevenAgo) pendingApprovalOver7d += 1;
      }
      if (st === 'under-assessment') underAssessment += 1;
      const pr = String(c.priority || '').toLowerCase();
      if (pr === 'critical' || pr === 'urgent') criticalUrgent += 1;
    });

    const data = {
      risks: {
        openTotal: openRisks.length,
        criticalOpen,
        imminent,
        overdueReviews,
        unmitigatedCritical,
        escalatedToIssue,
        noOwner,
        rag,
      },
      issues: {
        openTotal: openIssues.length,
        criticalOpen: criticalIss,
        overdueActions,
        rfc,
        offSpec,
        problemConcern: prob,
        highAgeOpen: highAge,
        noOwner: noIssOwner,
        escalatedFromRisk: escFromRisk,
      },
      changeRequests: {
        pendingApproval,
        underAssessment,
        criticalUrgent,
        totalOpen,
        pendingApprovalOver7d,
      },
    };
    return { success: true, data };
  } catch (error) {
    console.error('[dashboard] getRiskIssueSummary:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Executive alert counts for PMO dashboard (v475).
 */
export async function getExecutiveAlerts(organizationId) {
  try {
    const ext = await getPmoExtendedMetrics(organizationId);
    if (!ext.success) return ext;
    return { success: true, data: ext.data.alerts };
  } catch (error) {
    console.error('[dashboard] getExecutiveAlerts:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Full extended payload for PMO dashboard tiles + alert panel.
 */
export async function getPmoExtendedMetrics(organizationId) {
  try {
    const [
      evmRes,
      cpRes,
      riRes,
    ] = await Promise.all([
      getAggregatedEvmMetrics(organizationId),
      getCriticalPathSummary(organizationId),
      getRiskIssueSummary(organizationId),
    ]);

    if (!evmRes.success) return evmRes;
    if (!cpRes.success) return cpRes;
    if (!riRes.success) return riRes;

    const evm = evmRes.data;
    const criticalPath = cpRes.data;
    const riskIssue = riRes.data;

    const { data: projRows, error: perr } = await platformDb
      .from('projects')
      .select(
        'id, status_id, planned_end_date, budget_amount, actual_cost, updated_at, health_status, percentage_complete'
      )
      .eq('account_id', organizationId)
      .eq('is_deleted', false);
    if (perr) throw perr;

    const projectList = projRows || [];
    const projectIds = projectList.map((p) => p.id);

    const statusIds = [...new Set(projectList.map((p) => p.status_id).filter(Boolean))];

    const today = todayISODate();
    let behindSchedule = 0;
    let budgetOver = 0;
    let staleProjects = 0;
    const fourteenAgo = new Date();
    fourteenAgo.setDate(fourteenAgo.getDate() - 14);

    let statusMap = {};
    let baselineMissing = 0;
    let progLinks = [];
    let portLinks = [];
    let govDocsMissing = 0;
    let govPct = null;
    let orgProgrammes = [];
    let staleProgrammes = 0;
    let programmeIds = [];
    let benefitsPct = null;
    let milestoneAch = null;
    let avgTaskPct = null;
    let overdueTasks = 0;
    let blockedDeps = 0;
    let resourceConflicts = 0;

    if (projectIds.length) {
      const fetchAllocationsSafe = async () => {
        try {
          const r = await platformDb
            .from('cross_project_resource_allocations')
            .select('resource_id, allocation_percentage')
            .in('project_id', projectIds)
            .eq('is_deleted', false);
          if (r.error) return [];
          return r.data || [];
        } catch {
          return [];
        }
      };

      const [
        stRes,
        blRes,
        progRes,
        portRes,
        compRes,
        taskRes,
        allocData,
      ] = await Promise.all([
        statusIds.length
          ? platformDb
              .from('project_statuses')
              .select('id, status_name, status_code')
              .in('id', statusIds)
          : Promise.resolve({ data: [], error: null }),
        platformDb
          .from('project_plans')
          .select('project_id')
          .in('project_id', projectIds)
          .eq('is_baseline', true)
          .eq('is_deleted', false),
        platformDb
          .from('programme_projects')
          .select('programme_id, project_id')
          .in('project_id', projectIds)
          .eq('is_deleted', false),
        platformDb
          .from('portfolio_projects')
          .select('project_id')
          .in('project_id', projectIds)
          .eq('is_deleted', false),
        platformDb
          .from('pmo_document_compliance_view')
          .select('project_id, missing_mandatory_docs, compliance_percentage')
          .in('project_id', projectIds),
        platformDb
          .from('tasks')
          .select('percentage_complete, planned_end_date, due_date, is_milestone')
          .in('project_id', projectIds)
          .eq('is_deleted', false)
          .limit(50000),
        fetchAllocationsSafe(),
      ]);

      if (stRes.error) throw stRes.error;
      if (blRes.error) throw blRes.error;
      if (progRes.error) throw progRes.error;
      if (portRes.error) throw portRes.error;
      if (compRes.error) throw compRes.error;
      if (taskRes.error) throw taskRes.error;

      statusMap = Object.fromEntries((stRes.data || []).map((s) => [s.id, s]));

      const hasBl = new Set((blRes.data || []).map((b) => b.project_id));
      projectIds.forEach((pid) => {
        if (!hasBl.has(pid)) baselineMissing += 1;
      });

      progLinks = progRes.data || [];
      portLinks = portRes.data || [];

      const compRows = compRes.data || [];
      compRows.forEach((row) => {
        if (Number(row.missing_mandatory_docs) > 0) govDocsMissing += 1;
      });
      const compVals = compRows.map((r) => Number(r.compliance_percentage)).filter((n) => !Number.isNaN(n));
      if (compVals.length) {
        govPct = Math.round((compVals.reduce((a, b) => a + b, 0) / compVals.length) * 10) / 10;
      }

      const tr = taskRes.data || [];
      const milestones = tr.filter((t) => t.is_milestone);
      if (milestones.length) {
        const done = milestones.filter((t) => Number(t.percentage_complete) >= 100).length;
        milestoneAch = Math.round((done / milestones.length) * 1000) / 10;
      }
      const pcts = tr.map((t) => Number(t.percentage_complete)).filter((n) => !Number.isNaN(n));
      if (pcts.length) avgTaskPct = Math.round((pcts.reduce((a, b) => a + b, 0) / pcts.length) * 10) / 10;
      tr.forEach((t) => {
        if (Number(t.percentage_complete) >= 100) return;
        const end = t.planned_end_date || t.due_date;
        if (end && String(end) < today) overdueTasks += 1;
      });

      const byRes = {};
      (allocData || []).forEach((a) => {
        const rid = a.resource_id;
        if (!rid) return;
        byRes[rid] = (byRes[rid] || 0) + (Number(a.allocation_percentage) || 0);
      });
      resourceConflicts = Object.values(byRes).filter((sum) => sum > 100).length;

      programmeIds = [...new Set(progLinks.map((r) => r.programme_id).filter(Boolean))];

      if (programmeIds.length) {
        const [progsRes, benRes, depRes] = await Promise.all([
          platformDb
            .from('programmes')
            .select('id, updated_at, overall_health_score, portfolio_id')
            .in('id', programmeIds)
            .eq('is_deleted', false),
          platformDb
            .from('programme_benefits')
            .select('target_value, realized_value')
            .in('programme_id', programmeIds)
            .eq('is_deleted', false),
          platformDb
            .from('programme_dependencies')
            .select('id, dependency_status, risk_level')
            .in('programme_id', programmeIds)
            .eq('is_deleted', false),
        ]);
        if (progsRes.error) throw progsRes.error;
        if (benRes.error) throw benRes.error;
        if (depRes.error) throw depRes.error;

        orgProgrammes = progsRes.data || [];
        orgProgrammes.forEach((pr) => {
          if (pr.updated_at && new Date(pr.updated_at) < fourteenAgo) staleProgrammes += 1;
        });

        let t = 0;
        let r = 0;
        (benRes.data || []).forEach((b) => {
          t += Math.abs(Number(b.target_value) || 0);
          r += Math.abs(Number(b.realized_value) || 0);
        });
        if (t > 0) benefitsPct = Math.round((r / t) * 1000) / 10;

        const stOk = ['identified', 'confirmed', 'active'];
        blockedDeps = (depRes.data || []).filter((d) => {
          const st = String(d.dependency_status || '').toLowerCase();
          const rl = String(d.risk_level || '').toLowerCase();
          return stOk.includes(st) && (rl === 'high' || rl === 'critical');
        }).length;
      }
    }

    projectList.forEach((p) => {
      const meta = p.status_id ? statusMap[p.status_id] : null;
      const bucket = bucketProjectExecutiveKey(meta);
      if (p.planned_end_date && String(p.planned_end_date) < today && bucket !== 'completed') {
        behindSchedule += 1;
      }
      const bud = Number(p.budget_amount) || 0;
      const spent = Number(p.actual_cost) || 0;
      if (bud > 0 && spent > bud) budgetOver += 1;
      if (bucket === 'active' && p.updated_at) {
        const u = new Date(p.updated_at);
        if (u < fourteenAgo) staleProjects += 1;
      }
    });

    const unlinkedProgrammes = orgProgrammes.filter((x) => !x.portfolio_id).length;

    const linkedToProg = new Set((progLinks || []).map((r) => r.project_id).filter(Boolean));
    const linkedToPort = new Set((portLinks || []).map((r) => r.project_id));
    const unlinkedProjects = projectList.filter(
      (p) => !linkedToProg.has(p.id) && !linkedToPort.has(p.id)
    ).length;

    const risks = riskIssue.risks || {};

    const alertItemsBase = [
      { id: 'behind_schedule', label: 'Projects behind schedule', count: behindSchedule, severity: behindSchedule > 0 ? 'warning' : 'ok' },
      { id: 'critical_risks', label: 'Critical / high open risks', count: risks.criticalOpen ?? 0, severity: (risks.criticalOpen ?? 0) > 0 ? 'danger' : 'ok' },
      { id: 'budget_over', label: 'Projects over budget', count: budgetOver, severity: budgetOver > 0 ? 'danger' : 'ok' },
      { id: 'no_baseline', label: 'Projects without baseline plan', count: baselineMissing, severity: baselineMissing > 0 ? 'warning' : 'ok' },
      { id: 'stale_projects', label: 'Active projects — no update in 14 days', count: staleProjects, severity: staleProjects > 0 ? 'warning' : 'ok' },
      { id: 'stale_programmes', label: 'Programmes — no update in 14 days', count: staleProgrammes, severity: staleProgrammes > 0 ? 'warning' : 'ok' },
      { id: 'unlinked_programmes', label: 'Programmes with no portfolio', count: unlinkedProgrammes, severity: unlinkedProgrammes > 0 ? 'warning' : 'ok' },
      { id: 'unlinked_projects', label: 'Projects with no programme or portfolio', count: unlinkedProjects, severity: unlinkedProjects > 0 ? 'warning' : 'ok' },
      { id: 'gov_missing', label: 'Projects with missing mandatory documents', count: govDocsMissing, severity: govDocsMissing > 0 ? 'warning' : 'ok' },
      { id: 'evm_cpi', label: 'Projects with CPI < 0.85', count: evm.portfolio.projectsCpiLt085 ?? 0, severity: (evm.portfolio.projectsCpiLt085 ?? 0) > 0 ? 'danger' : 'ok' },
      { id: 'evm_spi', label: 'Projects with SPI < 0.85', count: evm.portfolio.projectsSpiLt085 ?? 0, severity: (evm.portfolio.projectsSpiLt085 ?? 0) > 0 ? 'danger' : 'ok' },
      { id: 'evm_none', label: 'Projects with no EVM data', count: evm.portfolio.projectsNoEvm ?? 0, severity: (evm.portfolio.projectsNoEvm ?? 0) > 0 ? 'warning' : 'ok' },
      { id: 'cp_overdue', label: 'Projects with overdue critical-path tasks', count: criticalPath.projectsWithCpDelay ?? 0, severity: (criticalPath.projectsWithCpDelay ?? 0) > 0 ? 'danger' : 'ok' },
      { id: 'cp_blocked', label: 'Blocked critical-path tasks', count: criticalPath.cpTasksBlocked ?? 0, severity: (criticalPath.cpTasksBlocked ?? 0) > 0 ? 'warning' : 'ok' },
      { id: 'cp_milestone', label: 'Overdue CP milestones', count: criticalPath.cpMilestonesAtRisk ?? 0, severity: (criticalPath.cpMilestonesAtRisk ?? 0) > 0 ? 'danger' : 'ok' },
      { id: 'risk_unmitigated', label: 'Unmitigated critical risks', count: risks.unmitigatedCritical ?? 0, severity: (risks.unmitigatedCritical ?? 0) > 0 ? 'danger' : 'ok' },
      { id: 'issue_actions', label: 'Overdue issue actions', count: riskIssue.issues?.overdueActions ?? 0, severity: (riskIssue.issues?.overdueActions ?? 0) > 0 ? 'warning' : 'ok' },
      { id: 'issue_stale', label: 'Open issues older than 30 days', count: riskIssue.issues?.highAgeOpen ?? 0, severity: (riskIssue.issues?.highAgeOpen ?? 0) > 0 ? 'warning' : 'ok' },
      { id: 'cr_pending', label: 'Change requests pending approval > 7 days', count: riskIssue.changeRequests?.pendingApprovalOver7d ?? 0, severity: (riskIssue.changeRequests?.pendingApprovalOver7d ?? 0) > 0 ? 'warning' : 'ok' },
    ];

    const alertRagContext = {
      totalProjects: projectIds.length,
      totalProgrammes: orgProgrammes.length,
    };

    const alertItems = alertItemsBase.map((row) => ({
      ...row,
      rag: executiveAlertRagFromRow(row, alertRagContext),
    }));
    const alertsOverallRag = worstRagFromAlertItems(alertItems);

    const totalBudget = projectList.reduce((s, p) => s + (Number(p.budget_amount) || 0), 0);
    const totalSpent = projectList.reduce((s, p) => s + (Number(p.actual_cost) || 0), 0);
    const budgetUtilPortfolio =
      totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 1000) / 10 : null;

    const healthNums = projectList.map((p) => {
      const h = String(p.health_status || '').toLowerCase();
      if (h === 'green') return 100;
      if (h === 'amber' || h === 'yellow') return 60;
      if (h === 'red') return 30;
      return null;
    }).filter((n) => n != null);
    const portfolioHealthIdx =
      healthNums.length > 0 ? Math.round(healthNums.reduce((a, b) => a + b, 0) / healthNums.length) : null;

    let deliveryProgress = null;
    const pcs = projectList.map((p) => Number(p.percentage_complete)).filter((n) => !Number.isNaN(n));
    if (pcs.length) {
      deliveryProgress = Math.round((pcs.reduce((a, b) => a + b, 0) / pcs.length) * 10) / 10;
    }

    let schedVarProg = 0;
    projectList.forEach((p) => {
      const meta = p.status_id ? statusMap[p.status_id] : null;
      const bucket = bucketProjectExecutiveKey(meta);
      if (bucket !== 'completed' && p.planned_end_date && String(p.planned_end_date) < today) {
        schedVarProg += 1;
      }
    });

    const progBudgetUtil =
      totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 1000) / 10 : null;

    const scheduleRag = { onTrack: 0, delayed: 0, critical: 0 };
    projectList.forEach((p) => {
      const h = String(p.health_status || '').toLowerCase();
      if (h === 'red') scheduleRag.critical += 1;
      else if (h === 'amber' || h === 'yellow') scheduleRag.delayed += 1;
      else scheduleRag.onTrack += 1;
    });

    const openRisksHC = risks.criticalOpen ?? 0;

    let changePending = riskIssue.changeRequests?.pendingApproval ?? 0;

    const portfolio = {
      budgetUtilizationPct: budgetUtilPortfolio,
      healthIndex: portfolioHealthIdx,
      governanceCompliancePct: govPct,
      benefitsRealizationPct: benefitsPct,
    };

    const healthScores = orgProgrammes
      .map((g) => Number(g.overall_health_score))
      .filter((n) => !Number.isNaN(n));
    const progHealthIdx =
      healthScores.length > 0
        ? Math.round((healthScores.reduce((a, b) => a + b, 0) / healthScores.length) * 10) / 10
        : null;

    const programmes = {
      healthIndex: progHealthIdx != null ? progHealthIdx : null,
      deliveryProgressPct: deliveryProgress,
      scheduleVarianceCount: schedVarProg,
      budgetUtilizationPct: progBudgetUtil,
      benefitsProgressPct: benefitsPct,
      blockedDependencies: blockedDeps,
      milestoneAchievementPct: milestoneAch,
      resourceConflictCount: resourceConflicts,
    };

    const projects = {
      scheduleRag,
      openRisksHighCritical: openRisksHC,
      openIssues: riskIssue.issues?.openTotal ?? 0,
      overdueTasks,
      changeRequestsPending: changePending,
      documentCompliancePct: govPct,
      avgTaskCompletionPct: avgTaskPct,
    };

    const data = {
      alerts: { items: alertItems, overallRag: alertsOverallRag, evm, criticalPath, riskIssue },
      evm,
      criticalPath,
      riskIssue,
      portfolio,
      programmes,
      projects,
    };

    return { success: true, data };
  } catch (error) {
    console.error('[dashboard] getPmoExtendedMetrics:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Portfolio / Programme / Project overview metrics for the Platform dashboard (single round-trip to combined logic).
 * @param {string} organizationId - Account / organisation id
 */
export async function getPmoOverviewMetrics(organizationId) {
  try {
    const [exec, kpi, ext] = await Promise.all([
      getExecutiveSummary(organizationId),
      getKPIs(organizationId),
      getPmoExtendedMetrics(organizationId),
    ]);
    if (!exec.success) {
      return { success: false, error: exec.error };
    }
    if (!kpi.success) {
      return { success: false, error: kpi.error };
    }
    const extended = ext && ext.success ? ext.data : null;
    if (ext && !ext.success) {
      console.warn('[dashboard] getPmoExtendedMetrics failed; overview metrics partial:', ext.error);
    }
    return {
      success: true,
      data: buildPmoOverviewMetricsFromSummaries(exec.data, kpi.data, extended),
    };
  } catch (error) {
    console.error('Error getting PMO overview metrics:', error);
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
 * @param {{ projectIds?: string[] }} [options] - When set, only these projects (must belong to the org)
 * @returns {Promise<Object>} Risk heat map data
 */
export async function getRiskHeatMapData(organizationId, options = {}) {
  try {
    const filterSet =
      Array.isArray(options.projectIds) && options.projectIds.length
        ? new Set(options.projectIds)
        : null;

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

    let projectIds = projects?.map(p => p.id) || [];
    if (filterSet) {
      projectIds = projectIds.filter((id) => filterSet.has(id));
    }
    
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
 * @param {{ projectIds?: string[] }} [options] - When set, only these projects (must belong to the org)
 * @returns {Promise<Object>} Resource allocation data
 */
export async function getResourceAllocationData(organizationId, options = {}) {
  try {
    const filterSet =
      Array.isArray(options.projectIds) && options.projectIds.length
        ? new Set(options.projectIds)
        : null;

    // Get projects for this account first
    const { data: projects, error: projectsError } = await platformDb
      .from('projects')
      .select('id, project_name')
      .eq('account_id', organizationId)
      .eq('is_deleted', false);

    if (projectsError) throw projectsError;

    let projectIds = projects?.map(p => p.id) || [];
    if (filterSet) {
      projectIds = projectIds.filter((id) => filterSet.has(id));
    }
    
    if (projectIds.length === 0) {
      return { success: true, data: [] };
    }

    // Prefer cross_project_resource_allocations (+ resources.user_id); resource_allocations is not created in core migrations.
    try {
      const { data: allocations, error } = await platformDb
        .from('cross_project_resource_allocations')
        .select('id, allocation_percentage, project_id, resource_id')
        .in('project_id', projectIds)
        .eq('is_deleted', false);

      if (error) throw error;

      if (!allocations?.length) {
        return { success: true, data: [] };
      }

      const resourceIds = [...new Set(allocations.map((a) => a.resource_id).filter(Boolean))];
      const { data: resourceRows, error: resErr } = resourceIds.length
        ? await platformDb
            .from('resources')
            .select('id, user_id')
            .in('id', resourceIds)
            .eq('is_deleted', false)
        : { data: [], error: null };

      if (resErr) throw resErr;

      const resourceToUser = Object.fromEntries((resourceRows || []).map((r) => [r.id, r.user_id]));

      const userIds = [...new Set(
        allocations.map((a) => resourceToUser[a.resource_id]).filter(Boolean)
      )];
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
        const uid = resourceToUser[allocation.resource_id];
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
        allocError?.status === 404 ||
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
  if (!projects || projects.length === 0) return null;

  const scores = {
    green: 100,
    yellow: 60,
    red: 30,
  };

  const ragKey = (raw) => {
    const s = String(raw || '').toLowerCase();
    if (s === 'green') return 'green';
    if (s === 'amber' || s === 'yellow') return 'yellow';
    if (s === 'red') return 'red';
    return null;
  };

  const totalScore = projects.reduce((sum, p) => {
    const k = ragKey(p.health_status);
    return sum + (k ? scores[k] : 60);
  }, 0);
  return Math.round(totalScore / projects.length);
}

/**
 * Calculate on-time delivery rate
 */
function calculateOnTimeDeliveryRate(projects, statusMetaById = {}) {
  const completed =
    projects?.filter((p) =>
      bucketProjectExecutiveKey(p.status_id ? statusMetaById[p.status_id] : null) === 'completed'
    ) || [];
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
  getPmoOverviewMetrics,
  buildPmoOverviewMetricsFromSummaries,
  getPmoExtendedMetrics,
  getExecutiveAlerts,
  getAggregatedEvmMetrics,
  getCriticalPathSummary,
  getRiskIssueSummary,
  mapSeverityToRag,
  worstRagFromAlertItems,
};
