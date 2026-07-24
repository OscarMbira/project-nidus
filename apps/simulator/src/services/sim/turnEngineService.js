/**
 * Turn-based time compression engine (v734).
 */
import { simDb } from '../supabase/supabaseClient';
import { ROLE_TIME_PROFILES } from '@nidus/shared/constants/simulatorRoles';

function addPeriod(startDate, granularity, index) {
  const d = new Date(startDate);
  if (granularity === 'weekly') {
    d.setDate(d.getDate() + index * 7);
    const end = new Date(d);
    end.setDate(end.getDate() + 6);
    return { start: d, end };
  }
  if (granularity === 'quarterly') {
    d.setMonth(d.getMonth() + index * 3);
    const end = new Date(d);
    end.setMonth(end.getMonth() + 3);
    end.setDate(end.getDate() - 1);
    return { start: d, end };
  }
  d.setMonth(d.getMonth() + index);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { start: d, end };
}

function toDateString(date) {
  return date.toISOString().slice(0, 10);
}

export async function initializeTurns(runId, { projectDurationMonths, granularity, roleId } = {}) {
  const profile = ROLE_TIME_PROFILES[roleId] || ROLE_TIME_PROFILES.project_manager;
  const gran = granularity || profile.granularity;
  const totalTurns = projectDurationMonths
    ? (gran === 'weekly' ? projectDurationMonths * 4 : gran === 'quarterly' ? Math.ceil(projectDurationMonths / 3) : projectDurationMonths)
    : profile.defaultTurns;

  const startDate = new Date();
  const rows = [];
  for (let i = 0; i < totalTurns; i += 1) {
    const { start, end } = addPeriod(startDate, gran, i);
    rows.push({
      run_id: runId,
      turn_number: i + 1,
      sim_date_start: toDateString(start),
      sim_date_end: toDateString(end),
      time_granularity: gran,
      status: i === 0 ? 'review' : 'pending',
      started_at: i === 0 ? new Date().toISOString() : null,
    });
  }

  const { data, error } = await simDb.from('simulation_turns').insert(rows).select();
  if (error) throw error;
  return data;
}

export async function getCurrentTurn(runId) {
  const { data, error } = await simDb
    .from('simulation_turns')
    .select('*')
    .eq('run_id', runId)
    .in('status', ['review', 'deciding'])
    .order('turn_number', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (data) return data;

  const { data: pending, error: pendingErr } = await simDb
    .from('simulation_turns')
    .select('*')
    .eq('run_id', runId)
    .eq('status', 'pending')
    .order('turn_number', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (pendingErr) throw pendingErr;
  return pending;
}

export async function advanceTurn(runId) {
  const current = await getCurrentTurn(runId);
  if (!current) throw new Error('No active turn to advance');

  const now = new Date().toISOString();
  await simDb
    .from('simulation_turns')
    .update({ status: 'completed', completed_at: now })
    .eq('id', current.id);

  const { data: next } = await simDb
    .from('simulation_turns')
    .select('*')
    .eq('run_id', runId)
    .eq('status', 'pending')
    .order('turn_number', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (next) {
    await simDb
      .from('simulation_turns')
      .update({ status: 'review', started_at: now })
      .eq('id', next.id);
    return next;
  }

  await simDb.from('simulation_runs').update({ status: 'completed', completed_at: now }).eq('id', runId);
  return null;
}

export async function skipTurn(runId) {
  const current = await getCurrentTurn(runId);
  if (!current) throw new Error('No active turn to skip');
  const now = new Date().toISOString();
  await simDb
    .from('simulation_turns')
    .update({ status: 'skipped', completed_at: now })
    .eq('id', current.id);
  return advanceTurn(runId);
}

export async function getTurnHistory(runId) {
  const { data, error } = await simDb
    .from('simulation_turns')
    .select('*')
    .eq('run_id', runId)
    .order('turn_number', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getTurnMetrics(runId) {
  const { data, error } = await simDb
    .from('turn_metrics')
    .select('*')
    .eq('run_id', runId)
    .order('turn_number', { ascending: true });
  if (error) throw error;
  return data || [];
}
