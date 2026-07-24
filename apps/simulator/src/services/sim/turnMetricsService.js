/**
 * Turn KPI metrics (v734).
 */
import { simDb } from '../supabase/supabaseClient';

const ROLE_METRIC_SETS = {
  project_manager: ['spi', 'cpi', 'open_risks', 'open_issues', 'milestone_rag'],
  programme_manager: ['dependency_health', 'benefits_realised_pct', 'tranche_progress', 'cross_project_risks'],
  portfolio_manager: ['portfolio_alignment', 'investment_utilisation', 'portfolio_rag', 'strategic_fit'],
  pmo_analyst: ['compliance_score', 'audit_findings', 'reporting_accuracy', 'methodology_adherence'],
  project_coordinator: ['action_completion_rate', 'document_currency', 'schedule_variance', 'meeting_backlog'],
};

function trendFromDelta(delta) {
  if (delta > 0.5) return 'improving';
  if (delta < -0.5) return 'declining';
  return 'stable';
}

export async function calculateTurnMetrics(runId, turnNumber, { roleId, projectState = {}, previousMetrics = [] } = {}) {
  const metricNames = ROLE_METRIC_SETS[roleId] || ROLE_METRIC_SETS.project_manager;
  const { data: turn } = await simDb
    .from('simulation_turns')
    .select('id')
    .eq('run_id', runId)
    .eq('turn_number', turnNumber)
    .maybeSingle();

  const rows = metricNames.map((name) => {
    const prev = previousMetrics.find((m) => m.metric_name === name);
    const base = prev?.metric_value ?? 50;
    const delta = (projectState[name] ?? 0) - (prev?.metric_value ?? 50);
    const value = Math.max(0, Math.min(100, base + delta));
    const category = name.includes('risk') || name.includes('issue') ? 'risk'
      : name.includes('schedule') || name.includes('spi') ? 'schedule'
      : name.includes('budget') || name.includes('cpi') || name.includes('investment') ? 'budget'
      : name.includes('stakeholder') || name.includes('alignment') ? 'stakeholder'
      : name.includes('quality') || name.includes('compliance') ? 'quality'
      : 'team';
    return {
      run_id: runId,
      turn_id: turn?.id || null,
      turn_number: turnNumber,
      metric_category: category,
      metric_name: name,
      metric_value: value,
      trend: trendFromDelta(value - base),
    };
  });

  if (!rows.length) return [];
  const { data, error } = await simDb.from('turn_metrics').insert(rows).select();
  if (error) throw error;

  if (turn?.id) {
    const snapshot = Object.fromEntries(rows.map((r) => [r.metric_name, r.metric_value]));
    await simDb.from('simulation_turns').update({ metrics_snapshot: snapshot }).eq('id', turn.id);
  }

  return data;
}

export async function getMetricsTrend(runId, metricName) {
  const { data, error } = await simDb
    .from('turn_metrics')
    .select('turn_number, metric_value, trend')
    .eq('run_id', runId)
    .eq('metric_name', metricName)
    .order('turn_number', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getProjectHealthScore(runId, turnNumber) {
  const { data, error } = await simDb
    .from('turn_metrics')
    .select('metric_value')
    .eq('run_id', runId)
    .eq('turn_number', turnNumber);
  if (error) throw error;
  if (!data?.length) return { score: 0, rag: 'red' };
  const avg = data.reduce((s, r) => s + Number(r.metric_value || 0), 0) / data.length;
  const rag = avg >= 75 ? 'green' : avg >= 50 ? 'amber' : 'red';
  return { score: Math.round(avg), rag };
}
