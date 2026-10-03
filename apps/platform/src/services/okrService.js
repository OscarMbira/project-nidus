/**
 * OKR service (GAP-03, v963 Phase 8) — Cycles / Objectives / Key Results CRUD.
 * Reuses the generic pmis-gaps gapDataService helpers for plain single-table CRUD (rule: don't
 * duplicate boilerplate) and adds thin filtered-list queries where a simple .eq() filter is
 * needed (objectives by cycle, key results by objective) since the generic list helper doesn't
 * support filters. Soft-delete only (is_deleted flag) — every table here carries one.
 */
import { platformDb, simDb } from '@nidus/supabase'
import {
  listGapRecords,
  getGapRecord,
  createGapRecord,
  updateGapRecord,
} from '../modules/pmis-gaps/services/gapDataService'

function client(sim) {
  return sim ? simDb : platformDb
}

// ── Cycles ─────────────────────────────────────────────────────────────────

export async function listCycles({ sim = false } = {}) {
  const rows = await listGapRecords('okr_cycles', { sim, orderBy: 'start_date', ascending: false })
  return (rows || []).filter((r) => !r.is_deleted)
}

export async function getCycle(id, { sim = false } = {}) {
  return getGapRecord('okr_cycles', id, { sim })
}

export async function createCycle(payload, opts = {}) {
  const { sim = false } = opts
  return createGapRecord('okr_cycles', payload, { sim })
}

export async function updateCycle(id, payload, opts = {}) {
  const { sim = false } = opts
  return updateGapRecord('okr_cycles', id, payload, { sim })
}

export async function deleteCycle(id, { sim = false } = {}) {
  return updateGapRecord('okr_cycles', id, { is_deleted: true }, { sim })
}

// ── Objectives ───────────────────────────────────────────────────────────────

export async function listObjectives({ cycleId, sim = false } = {}) {
  const db = client(sim)
  let q = db.from('objectives').select('*').eq('is_deleted', false).order('created_at', { ascending: false })
  if (cycleId) q = q.eq('cycle_id', cycleId)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function getObjective(id, { sim = false } = {}) {
  return getGapRecord('objectives', id, { sim })
}

export async function createObjective(payload, opts = {}) {
  const { sim = false } = opts
  return createGapRecord('objectives', payload, { sim })
}

export async function updateObjective(id, payload, opts = {}) {
  const { sim = false } = opts
  return updateGapRecord('objectives', id, payload, { sim })
}

export async function deleteObjective(id, { sim = false } = {}) {
  return updateGapRecord('objectives', id, { is_deleted: true }, { sim })
}

// ── Key Results ──────────────────────────────────────────────────────────────

export async function listKeyResults(objectiveId, { sim = false } = {}) {
  if (!objectiveId) return []
  const db = client(sim)
  const { data, error } = await db
    .from('key_results')
    .select('*')
    .eq('objective_id', objectiveId)
    .eq('is_deleted', false)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data || []
}

export async function createKeyResult(payload, opts = {}) {
  const { sim = false } = opts
  return createGapRecord('key_results', payload, { sim })
}

export async function updateKeyResult(id, payload, opts = {}) {
  const { sim = false } = opts
  return updateGapRecord('key_results', id, payload, { sim })
}

export async function deleteKeyResult(id, { sim = false } = {}) {
  return updateGapRecord('key_results', id, { is_deleted: true }, { sim })
}

// ── Dashboard helper ─────────────────────────────────────────────────────────

/** Objectives joined with their cycle's name, newest first — used by the OKR dashboard. */
export async function listObjectivesWithCycleNames({ sim = false } = {}) {
  const [objectives, cycles] = await Promise.all([
    listObjectives({ sim }),
    listCycles({ sim }),
  ])
  const cycleMap = Object.fromEntries((cycles || []).map((c) => [c.id, c.cycle_name]))
  return (objectives || []).map((o) => ({ ...o, cycle_name: cycleMap[o.cycle_id] || '—' }))
}
