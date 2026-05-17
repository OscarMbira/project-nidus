/**
 * v505 Simulation run state — health, EVM snapshot math, phase gate checks.
 */
import { simDb } from '../supabase/supabaseClient'

const DEFAULT_HEALTH = {
  budget_pct: 100,
  schedule_variance_days: 0,
  quality_score: 100,
  team_morale: 100,
  stakeholder_satisfaction: 100,
}

/** @param {Record<string, number>} impact */
export function applyHealthImpactMerge(currentHealth, impact) {
  const base = { ...DEFAULT_HEALTH, ...currentHealth }
  const next = { ...base }
  for (const [k, v] of Object.entries(impact || {})) {
    if (typeof v !== 'number' || Number.isNaN(v)) continue
    if (k === 'schedule_variance_days') {
      next[k] = (next[k] || 0) + v
    } else {
      const cur = typeof next[k] === 'number' ? next[k] : DEFAULT_HEALTH[k] ?? 0
      next[k] = Math.min(100, Math.max(0, cur + v))
    }
  }
  return next
}

/** Plan-facing alias — same as {@link applyHealthImpactMerge}. */
export const applyHealthImpact = applyHealthImpactMerge

/**
 * PV from BCWS curve at sim_day (linear interpolate).
 * curve: [{ sim_day, pv }]
 */
export function interpolatePvAtDay(curve, simDay) {
  const pts = Array.isArray(curve) ? [...curve].sort((a, b) => a.sim_day - b.sim_day) : []
  if (pts.length === 0) return 0
  if (simDay <= pts[0].sim_day) return Number(pts[0].pv || 0)
  if (simDay >= pts[pts.length - 1].sim_day) return Number(pts[pts.length - 1].pv || 0)
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]
    const b = pts[i + 1]
    if (simDay >= a.sim_day && simDay <= b.sim_day) {
      const t = (simDay - a.sim_day) / Math.max(1, b.sim_day - a.sim_day)
      return Number(a.pv || 0) + t * (Number(b.pv || 0) - Number(a.pv || 0))
    }
  }
  return 0
}

export function computeEvmMetrics({ pv, ev, ac, bac }) {
  const cpi = ac > 0 ? ev / ac : 1
  const spi = pv > 0 ? ev / pv : 1
  const eac = cpi > 0 ? bac / cpi : bac
  const tcpiDenom = bac - ac
  const tcpi = tcpiDenom !== 0 ? (bac - ev) / tcpiDenom : 1
  return {
    pv,
    ev,
    ac,
    cpi: Number(cpi.toFixed(4)),
    spi: Number(spi.toFixed(4)),
    eac: Number(eac.toFixed(2)),
    tcpi: Number(tcpi.toFixed(4)),
  }
}

async function fetchPracticeProjectRows(practiceProjectId, table) {
  const { data, error } = await simDb.from(table).select('*').eq('practice_project_id', practiceProjectId)
  if (error) throw error
  return data || []
}

/**
 * @returns {Promise<{ canAdvance: boolean, missing: Array<{ description: string, is_mandatory: boolean }> }>}
 */
export async function checkPhaseGateCompliance(runId, fromPhase, toPhase, methodology = 'traditional') {
  const { data: run, error: runErr } = await simDb
    .from('simulation_runs')
    .select('practice_project_id, methodology')
    .eq('id', runId)
    .single()
  if (runErr || !run?.practice_project_id) {
    return { canAdvance: false, missing: [{ description: 'Run has no practice project', is_mandatory: true }] }
  }
  const meth = methodology || run.methodology || 'traditional'
  const { data: reqs, error } = await simDb
    .from('phase_gate_requirements')
    .select('*')
    .eq('from_phase', fromPhase)
    .eq('to_phase', toPhase)

  if (error) return { canAdvance: false, missing: [{ description: error.message, is_mandatory: true }] }

  const filteredReqs = (reqs || []).filter((r) => r.methodology === meth || r.methodology === 'traditional')

  const missing = []
  const pid = run.practice_project_id

  for (const r of filteredReqs) {
    if (r.requirement_type !== 'artefact') continue
    const table = r.artefact_table
    if (!table) continue
    let ok = true
    try {
      const rows = await fetchPracticeProjectRows(pid, table)
      if (rows.length === 0) ok = false
      else if (r.artefact_status_required === 'has_entries') ok = rows.length > 0
      else if (r.artefact_status_required === 'exists') ok = rows.some((x) => !x.is_deleted)
      else if (r.artefact_status_required === 'all_completed') {
        ok = rows.every((x) => !x.is_deleted && (x.status === 'completed' || x.status === 'closed'))
      } else if (r.artefact_status_field) {
        ok = rows.some((row) => {
          const v = row[r.artefact_status_field]
          const req = r.artefact_status_required
          if (req === 'true') return v === true || v === 'true'
          if (req === 'false') return v === false
          return String(v) === String(req)
        })
      }
    } catch {
      ok = false
    }
    if (!ok) missing.push({ description: r.description, is_mandatory: !!r.is_mandatory })
  }

  const blocking = missing.filter((m) => m.is_mandatory)
  return { canAdvance: blocking.length === 0, missing }
}

export async function persistProjectHealth(runId, health) {
  const { error } = await simDb.from('simulation_runs').update({ project_health: health, updated_at: new Date().toISOString() }).eq('id', runId)
  if (error) throw error
}

export async function persistEvmSnapshot(runId, snapshot) {
  const { error } = await simDb.from('simulation_runs').update({ evm_snapshot: snapshot, updated_at: new Date().toISOString() }).eq('id', runId)
  if (error) throw error
}

/** Recomputes EVM from scenario seed curves + period actuals and persists run + optional practice_project snapshot row. */
export async function updateEVMSnapshot(runId) {
  const { data: run } = await simDb
    .from('simulation_runs')
    .select('sim_day, practice_project_id, scenario_id, evm_snapshot')
    .eq('id', runId)
    .single()
  if (!run?.scenario_id) return { success: false }

  const { data: seeds } = await simDb
    .from('scenario_seed_data')
    .select('seed_type, seed_payload')
    .eq('scenario_id', run.scenario_id)

  let curve = []
  let actuals = []
  for (const s of seeds || []) {
    if (s.seed_type === 'evm_baseline') curve = s.seed_payload?.curve || []
    if (s.seed_type === 'period_actuals') actuals = s.seed_payload?.points || []
  }

  const simDay = run.sim_day || 1
  const pv = interpolatePvAtDay(curve, simDay)
  let ac = 0
  for (const p of actuals) {
    if (p.sim_day <= simDay) ac = Number(p.ac || 0)
  }
  const scenarioRow = await simDb.from('scenarios').select('project_budget_baseline').eq('id', run.scenario_id).maybeSingle()
  const bac = Number(scenarioRow.data?.project_budget_baseline || pv || 1)
  const ev = pv * 0.92

  const metrics = computeEvmMetrics({ pv, ev, ac, bac })
  const snapshot = {
    ...metrics,
    period_actuals: actuals,
    sim_day: simDay,
  }

  await persistEvmSnapshot(runId, snapshot)

  if (run.practice_project_id) {
    await simDb.from('project_evm_snapshots').upsert(
      {
        practice_project_id: run.practice_project_id,
        period_date: new Date().toISOString().slice(0, 10),
        planned_value: pv,
        earned_value: ev,
        actual_cost: ac,
        notes: `v505 tick sim_day=${simDay}`,
      },
      { onConflict: 'practice_project_id,period_date' },
    )
  }

  return { success: true, snapshot }
}

export async function handleToleranceBreach(runId, breached = true) {
  const { error } = await simDb
    .from('simulation_runs')
    .update({ tolerance_breached: breached, updated_at: new Date().toISOString() })
    .eq('id', runId)
  if (error) throw error
}

export async function advancePhase(runId, newPhase) {
  const { error } = await simDb
    .from('simulation_runs')
    .update({ active_stage: newPhase, updated_at: new Date().toISOString(), last_activity_at: new Date().toISOString() })
    .eq('id', runId)
  if (error) throw error
}

export async function completeRun(runId) {
  const { error } = await simDb
    .from('simulation_runs')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', runId)
  if (error) throw error
}
