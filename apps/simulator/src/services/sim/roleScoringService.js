/**
 * Role-weighted competency scoring (v734).
 */
import { simDb } from '../supabase/supabaseClient';

export async function getRoleCompetencies(roleId) {
  const { data, error } = await simDb
    .from('role_competencies')
    .select('*')
    .eq('role_id', roleId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data || [];
}

export function calculateWeightedScore(competencyScores = [], competencies = []) {
  if (!competencies.length) {
    const values = Object.values(competencyScores);
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  }

  let totalWeight = 0;
  let weighted = 0;
  for (const comp of competencies) {
    const score = competencyScores[comp.competency_key] ?? 0;
    const weight = Number(comp.weight) || 1;
    weighted += score * weight;
    totalWeight += weight;
  }
  return totalWeight ? weighted / totalWeight : 0;
}

export async function saveCompetencyScores(runId, roleId, competencyScores) {
  const competencies = await getRoleCompetencies(roleId);
  const entries = Object.entries(competencyScores).map(([key, score]) => {
    const comp = competencies.find((c) => c.competency_key === key);
    return {
      run_id: runId,
      module_name: comp?.competency_label || key,
      module_type: 'competency',
      competency_key: key,
      score: Math.round(score),
      max_score: 100,
      metrics: { role_id: roleId },
    };
  });

  if (!entries.length) return [];
  const { data, error } = await simDb.from('module_scores').insert(entries).select();
  if (error) throw error;
  return data;
}

export async function getRoleScoreSummary(userId, roleId) {
  const { data: runs, error: runsErr } = await simDb
    .from('simulation_runs')
    .select('id')
    .eq('user_id', userId)
    .eq('selected_role', roleId)
    .eq('status', 'completed');
  if (runsErr) throw runsErr;
  if (!runs?.length) return { competencies: {}, overall: 0 };

  const runIds = runs.map((r) => r.id);
  const { data: scores, error } = await simDb
    .from('module_scores')
    .select('competency_key, score, max_score')
    .in('run_id', runIds)
    .not('competency_key', 'is', null);
  if (error) throw error;

  const agg = {};
  for (const row of scores || []) {
    if (!row.competency_key) continue;
    if (!agg[row.competency_key]) agg[row.competency_key] = [];
    agg[row.competency_key].push((row.score / (row.max_score || 100)) * 100);
  }

  const competencyScores = Object.fromEntries(
    Object.entries(agg).map(([k, vals]) => [k, vals.reduce((a, b) => a + b, 0) / vals.length]),
  );

  const competencies = await getRoleCompetencies(roleId);
  return {
    competencies: competencyScores,
    overall: calculateWeightedScore(competencyScores, competencies),
  };
}
