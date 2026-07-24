import { supabase } from './supabaseClient';

/**
 * Issue Analytics Service - API functions for Issue analytics and reporting
 * Provides summary statistics, trends, and analysis
 */

/**
 * Get issue summary for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Summary statistics
 */
export async function getIssueSummary(projectId) {
  try {
    const { data, error } = await supabase.rpc('get_issue_summary', {
      p_project_id: projectId
    });

    if (error) throw error;

    return data && data.length > 0 ? data[0] : {
      total_issues: 0,
      open_issues: 0,
      rfcs_count: 0,
      off_specs_count: 0,
      problems_count: 0,
      critical_issues: 0,
      overdue_actions: 0,
      issues_by_status: {}
    };
  } catch (error) {
    console.error('Error fetching issue summary:', error);
    throw error;
  }
}

/**
 * Get issues by type for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Counts by type
 */
export async function getIssuesByType(projectId) {
  try {
    // Get issue register for project
    const { data: register } = await supabase
      .from('issue_registers')
      .select('id')
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .single();

    if (!register) {
      return {
        request_for_change: 0,
        off_specification: 0,
        problem_concern: 0
      };
    }

    const { data, error } = await supabase
      .from('issues')
      .select('issue_type')
      .eq('issue_register_id', register.id)
      .eq('is_deleted', false);

    if (error) throw error;

    const counts = {
      request_for_change: 0,
      off_specification: 0,
      problem_concern: 0
    };

    (data || []).forEach(issue => {
      if (counts.hasOwnProperty(issue.issue_type)) {
        counts[issue.issue_type]++;
      }
    });

    return counts;
  } catch (error) {
    console.error('Error fetching issues by type:', error);
    throw error;
  }
}

/**
 * Get issues by priority for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Counts by priority
 */
export async function getIssuesByPriority(projectId) {
  try {
    // Get issue register for project
    const { data: register } = await supabase
      .from('issue_registers')
      .select('id')
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .single();

    if (!register) {
      return {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      };
    }

    const { data, error } = await supabase
      .from('issues')
      .select('priority')
      .eq('issue_register_id', register.id)
      .eq('is_deleted', false);

    if (error) throw error;

    const counts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    (data || []).forEach(issue => {
      if (counts.hasOwnProperty(issue.priority)) {
        counts[issue.priority]++;
      }
    });

    return counts;
  } catch (error) {
    console.error('Error fetching issues by priority:', error);
    throw error;
  }
}

/**
 * Get issues by severity for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Counts by severity
 */
export async function getIssuesBySeverity(projectId) {
  try {
    // Get issue register for project
    const { data: register } = await supabase
      .from('issue_registers')
      .select('id')
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .single();

    if (!register) {
      return {
        critical: 0,
        major: 0,
        moderate: 0,
        minor: 0
      };
    }

    const { data, error } = await supabase
      .from('issues')
      .select('severity')
      .eq('issue_register_id', register.id)
      .eq('is_deleted', false);

    if (error) throw error;

    const counts = {
      critical: 0,
      major: 0,
      moderate: 0,
      minor: 0
    };

    (data || []).forEach(issue => {
      if (counts.hasOwnProperty(issue.severity)) {
        counts[issue.severity]++;
      }
    });

    return counts;
  } catch (error) {
    console.error('Error fetching issues by severity:', error);
    throw error;
  }
}

/**
 * Get issue trends over time
 * @param {string} projectId - Project ID
 * @param {Object} dateRange - Date range { startDate, endDate }
 * @returns {Promise<Array>} Array of trend data points
 */
export async function getIssueTrends(projectId, dateRange = {}) {
  try {
    // Get issue register for project
    const { data: register } = await supabase
      .from('issue_registers')
      .select('id')
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .single();

    if (!register) return [];

    let query = supabase
      .from('issues')
      .select('date_raised, status, issue_type')
      .eq('issue_register_id', register.id)
      .eq('is_deleted', false);

    if (dateRange.startDate) {
      query = query.gte('date_raised', dateRange.startDate);
    }
    if (dateRange.endDate) {
      query = query.lte('date_raised', dateRange.endDate);
    }

    const { data, error } = await query.order('date_raised', { ascending: true });

    if (error) throw error;

    // Group by date
    const trends = {};
    (data || []).forEach(issue => {
      const date = issue.date_raised || issue.created_at?.split('T')[0];
      if (!date) return;

      if (!trends[date]) {
        trends[date] = {
          date,
          total: 0,
          raised: 0,
          resolved: 0,
          closed: 0
        };
      }

      trends[date].total++;
      if (issue.status === 'raised' || issue.status === 'draft') {
        trends[date].raised++;
      } else if (issue.status === 'resolved') {
        trends[date].resolved++;
      } else if (issue.status === 'closed') {
        trends[date].closed++;
      }
    });

    return Object.values(trends).sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error('Error fetching issue trends:', error);
    throw error;
  }
}

/**
 * Get resolution trends
 * @param {string} projectId - Project ID
 * @param {Object} dateRange - Date range { startDate, endDate }
 * @returns {Promise<Array>} Array of resolution trend data points
 */
export async function getResolutionTrends(projectId, dateRange = {}) {
  try {
    // Get issue register for project
    const { data: register } = await supabase
      .from('issue_registers')
      .select('id')
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .single();

    if (!register) return [];

    let query = supabase
      .from('issues')
      .select('resolution_date, closure_date, status')
      .eq('issue_register_id', register.id)
      .eq('is_deleted', false)
      .in('status', ['resolved', 'closed']);

    if (dateRange.startDate) {
      query = query.gte('resolution_date', dateRange.startDate);
    }
    if (dateRange.endDate) {
      query = query.lte('resolution_date', dateRange.endDate);
    }

    const { data, error } = await query.order('resolution_date', { ascending: true });

    if (error) throw error;

    // Group by date
    const trends = {};
    (data || []).forEach(issue => {
      const date = issue.resolution_date || issue.closure_date;
      if (!date) return;

      if (!trends[date]) {
        trends[date] = {
          date,
          resolved: 0,
          closed: 0
        };
      }

      if (issue.status === 'resolved') {
        trends[date].resolved++;
      } else if (issue.status === 'closed') {
        trends[date].closed++;
      }
    });

    return Object.values(trends).sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error('Error fetching resolution trends:', error);
    throw error;
  }
}

/**
 * Get issue aging analysis
 * @param {string} projectId - Project ID
 * @returns {Promise<Array>} Array of aging data
 */
export async function getIssueAging(projectId) {
  try {
    const { data, error } = await supabase.rpc('get_issue_aging', {
      p_project_id: projectId
    });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching issue aging:', error);
    throw error;
  }
}

/**
 * Get resolution metrics
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Resolution metrics
 */
export async function getResolutionMetrics(projectId) {
  try {
    // Get issue register for project
    const { data: register } = await supabase
      .from('issue_registers')
      .select('id')
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .single();

    if (!register) {
      return {
        total_resolved: 0,
        total_closed: 0,
        average_resolution_days: 0,
        resolution_rate: 0
      };
    }

    const { data, error } = await supabase
      .from('issues')
      .select('date_raised, resolution_date, closure_date, status')
      .eq('issue_register_id', register.id)
      .eq('is_deleted', false);

    if (error) throw error;

    const resolved = (data || []).filter(i => i.status === 'resolved' || i.status === 'closed');
    const total = data?.length || 0;

    let totalDays = 0;
    let resolvedCount = 0;

    resolved.forEach(issue => {
      const raised = new Date(issue.date_raised || issue.created_at);
      const resolved = new Date(issue.resolution_date || issue.closure_date);
      if (!isNaN(resolved.getTime()) && !isNaN(raised.getTime())) {
        const days = Math.floor((resolved - raised) / (1000 * 60 * 60 * 24));
        totalDays += days;
        resolvedCount++;
      }
    });

    return {
      total_resolved: resolved.length,
      total_closed: (data || []).filter(i => i.status === 'closed').length,
      average_resolution_days: resolvedCount > 0 ? Math.round(totalDays / resolvedCount) : 0,
      resolution_rate: total > 0 ? (resolved.length / total) * 100 : 0
    };
  } catch (error) {
    console.error('Error fetching resolution metrics:', error);
    throw error;
  }
}

/**
 * Get average resolution time
 * @param {string} projectId - Project ID
 * @returns {Promise<number>} Average resolution time in days
 */
export async function getAverageResolutionTime(projectId) {
  try {
    const metrics = await getResolutionMetrics(projectId);
    return metrics.average_resolution_days;
  } catch (error) {
    console.error('Error fetching average resolution time:', error);
    throw error;
  }
}

/**
 * Get action effectiveness
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Action effectiveness metrics
 */
export async function getActionEffectiveness(projectId) {
  try {
    // Get issue register for project
    const { data: register } = await supabase
      .from('issue_registers')
      .select('id')
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .single();

    if (!register) {
      return {
        total_actions: 0,
        completed_actions: 0,
        overdue_actions: 0,
        completion_rate: 0
      };
    }

    const { data: issues } = await supabase
      .from('issues')
      .select('id')
      .eq('issue_register_id', register.id)
      .eq('is_deleted', false);

    if (!issues || issues.length === 0) {
      return {
        total_actions: 0,
        completed_actions: 0,
        overdue_actions: 0,
        completion_rate: 0
      };
    }

    const issueIds = issues.map(i => i.id);

    const { data: actions, error } = await supabase
      .from('issue_actions')
      .select('status, target_date')
      .in('issue_id', issueIds);

    if (error) throw error;

    const total = actions?.length || 0;
    const completed = (actions || []).filter(a => a.status === 'completed').length;
    const overdue = (actions || []).filter(a => 
      a.status !== 'completed' && 
      a.target_date && 
      new Date(a.target_date) < new Date()
    ).length;

    return {
      total_actions: total,
      completed_actions: completed,
      overdue_actions: overdue,
      completion_rate: total > 0 ? (completed / total) * 100 : 0
    };
  } catch (error) {
    console.error('Error fetching action effectiveness:', error);
    throw error;
  }
}

export default {
  getIssueSummary,
  getIssuesByType,
  getIssuesByPriority,
  getIssuesBySeverity,
  getIssueTrends,
  getResolutionTrends,
  getIssueAging,
  getResolutionMetrics,
  getAverageResolutionTime,
  getActionEffectiveness
};
