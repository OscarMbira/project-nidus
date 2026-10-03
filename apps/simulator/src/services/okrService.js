/**
 * OKR service (GAP-03, v963 Phase 8) — Simulator mirror of apps/platform/src/services/
 * okrService.js. Always targets the `sim` schema (via simDb) — this app must never read/write
 * `public` schema data (CLAUDE.md Simulator domain-separation rules). Reuses the pmis-gaps
 * gapDataService generic helpers for plain single-table CRUD, same as the Platform version.
 */
import { simDb } from '@nidus/supabase'
import {
  listGapRecords,
  getGapRecord,
  createGapRecord,
  updateGapRecord,
} from '../modules/pmis-gaps/services/gapDataService'

const SIM = { sim: true }

// ── Cycles ─────────────────────────────────────────────────────────────────

export async function listCycles() {
  const rows = await listGapRecords('okr_cycles', { ...SIM, orderBy: 'start_date', ascending: false })
  return (rows || []).filter((r) => !r.is_deleted)
}

export async function getCycle(id) {
  return getGapRecord('okr_cycles', id, SIM)
}

export async function createCycle(payload) {
  return createGapRecord('okr_cycles', payload, SIM)
}

export async function updateCycle(id, payload) {
  return updateGapRecord('okr_cycles', id, payload, SIM)
}

export async function deleteCycle(id) {
  return updateGapRecord('okr_cycles', id, { is_deleted: true }, SIM)
}

// ── Objectives ───────────────────────────────────────────────────────────────

export async function listObjectives({ cycleId } = {}) {
  let q = simDb.from('objectives').select('*').eq('is_deleted', false).order('created_at', { ascending: false })
  if (cycleId) q = q.eq('cycle_id', cycleId)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function getObjective(id) {
  return getGapRecord('objectives', id, SIM)
}

export async function createObjective(payload) {
  return createGapRecord('objectives', payload, SIM)
}

export async function updateObjective(id, payload) {
  return updateGapRecord('objectives', id, payload, SIM)
}

export async function deleteObjective(id) {
  return updateGapRecord('objectives', id, { is_deleted: true }, SIM)
}

// ── Key Results ──────────────────────────────────────────────────────────────

export async function listKeyResults(objectiveId) {
  if (!objectiveId) return []
  const { data, error } = await simDb
    .from('key_results')
    .select('*')
    .eq('objective_id', objectiveId)
    .eq('is_deleted', false)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data || []
}

export async function createKeyResult(payload) {
  return createGapRecord('key_results', payload, SIM)
}

export async function updateKeyResult(id, payload) {
  return updateGapRecord('key_results', id, payload, SIM)
}

export async function deleteKeyResult(id) {
  return updateGapRecord('key_results', id, { is_deleted: true }, SIM)
}

// ── Dashboard helper ─────────────────────────────────────────────────────────

export async function listObjectivesWithCycleNames() {
  const [objectives, cycles] = await Promise.all([listObjectives(), listCycles()])
  const cycleMap = Object.fromEntries((cycles || []).map((c) => [c.id, c.cycle_name]))
  return (objectives || []).map((o) => ({ ...o, cycle_name: cycleMap[o.cycle_id] || '—' }))
}
