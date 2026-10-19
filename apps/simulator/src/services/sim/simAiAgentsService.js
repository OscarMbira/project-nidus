/**
 * v1272 Phase 3 — Simulator AI: AI stakeholders, adaptive difficulty and the AI Assessor
 * (PRD D14, D15, D27). Calls the sim-ai-npc / sim-ai-assess edge functions and reads the
 * learner's own AI records. AI calls never block the run: when AI is off or fails, the run
 * continues with its rule-based behaviour.
 */
import { simDb } from '../supabase/supabaseClient'
import { getSimAuthUserId } from './simAuth'
import {
  nextDifficultyLevel,
  performanceBand,
  startingLevel,
  templateControls,
} from '@nidus/shared/utils/simAdaptiveDifficulty'

async function invoke(fn, body) {
  const { data, error } = await simDb.functions.invoke(fn, { body })
  if (error) {
    let message = error.message
    let code = null
    try {
      const b = await error.context?.json?.()
      if (b?.error) message = b.error
      code = b?.code || b?.reason || null
    } catch {
      /* keep the generic message */
    }
    const err = new Error(message || 'AI is not available right now.')
    err.code = code
    throw err
  }
  return data
}

// ── AI stakeholders ─────────────────────────────────────────────────────────

export async function loadNpcMemory(runId) {
  const { data } = await simDb.from('npc_run_memory').select('npc_character_id, trust_score, summary, interactions').eq('run_id', runId)
  return Object.fromEntries((data || []).map((m) => [m.npc_character_id, m]))
}

export const requestNpcReply = (runId, messageId) => invoke('sim-ai-npc', { mode: 'reply', run_id: runId, message_id: messageId })

/** Rule-based trust change after an NPC event is resolved. Best effort. */
export function recordEventOutcome(runId, eventId) {
  return invoke('sim-ai-npc', { mode: 'event_outcome', run_id: runId, event_id: eventId }).catch(() => null)
}

/** Re-word a new event around the learner's project. Best effort, never blocks the run. */
export function personaliseEvent(runId, eventId) {
  return invoke('sim-ai-npc', { mode: 'personalise_event', run_id: runId, event_id: eventId }).catch(() => null)
}

export function trustLabel(trust) {
  const t = Number(trust) || 0
  if (t < -30) return { label: 'Low trust', tone: 'low' }
  if (t > 30) return { label: 'High trust', tone: 'high' }
  return { label: 'Neutral', tone: 'neutral' }
}

// ── AI Assessor ─────────────────────────────────────────────────────────────

/** Assess one decision. Returns null when the scenario has no rubric or AI is unavailable. */
export async function assessDecision(runId, eventId) {
  try {
    return (await invoke('sim-ai-assess', { run_id: runId, event_id: eventId }))?.assessment || null
  } catch {
    return null
  }
}

/** Assess the whole run. Throws with a readable message (no rubric, AI off, credits). */
export async function assessRun(runId) {
  return (await invoke('sim-ai-assess', { run_id: runId }))?.assessment || null
}

export async function listAssessments(runId) {
  const { data } = await simDb.from('ai_assessments').select('*').eq('run_id', runId).order('created_at')
  return data || []
}

export async function listMyFlags(runId) {
  const assessments = await listAssessments(runId)
  if (!assessments.length) return []
  const { data } = await simDb.from('ai_assessment_flags').select('*').in('assessment_id', assessments.map((a) => a.id))
  return data || []
}

export async function flagAssessment(assessmentId, criterionKey, reason) {
  const userId = await getSimAuthUserId()
  const { data, error } = await simDb.from('ai_assessment_flags')
    .insert({ assessment_id: assessmentId, user_id: userId, criterion_key: criterionKey || null, reason: String(reason || '').trim() })
    .select('*').single()
  if (error) throw error
  return data
}

export async function getRunScore(runId) {
  const { data } = await simDb.rpc('ai_run_score', { p_run_id: runId })
  return data || null
}

// ── Adaptive difficulty (rule-based, D27) ───────────────────────────────────

export async function listDifficultyLog(runId) {
  const { data } = await simDb.from('run_difficulty_log').select('*').eq('run_id', runId).order('created_at')
  return data || []
}

/**
 * Work out today's difficulty for a run and log any change with its reason.
 * @returns {Promise<{ level: number, controls: object, band: string }>}
 */
export async function applyAdaptiveDifficulty(run) {
  const [{ data: scenario }, { data: events }, { data: modules }, memory, { data: assessments }] = await Promise.all([
    simDb.from('scenarios').select('id, adaptive_enabled, min_difficulty, max_difficulty').eq('id', run.scenario_id).maybeSingle(),
    simDb.from('ai_events').select('response_score').eq('run_id', run.id).eq('is_resolved', true).order('resolved_at', { ascending: false }).limit(5),
    simDb.from('module_scores').select('percentage').eq('run_id', run.id),
    loadNpcMemory(run.id),
    simDb.from('ai_assessments').select('overall_score').eq('run_id', run.id).order('created_at', { ascending: false }).limit(3),
  ])
  const current = run.difficulty_level || startingLevel(scenario)
  const result = performanceBand({
    health: run.project_health || {},
    eventScores: (events || []).map((e) => e.response_score),
    moduleScores: (modules || []).map((m) => Number(m.percentage)),
    trust: Object.values(memory).map((m) => m.trust_score),
    assessor: (assessments || []).map((a) => a.overall_score),
  })
  const level = nextDifficultyLevel(current, result.band, scenario)
  const controls = templateControls(level)
  if (level !== run.difficulty_level) {
    await simDb.from('simulation_runs').update({ difficulty_level: level }).eq('id', run.id)
    await simDb.from('run_difficulty_log').insert({
      run_id: run.id, sim_day: run.sim_day, band: result.band, previous_level: run.difficulty_level ?? null,
      difficulty_level: level, reason: { index: result.index, ...result.parts }, adjustments: controls,
    })
  }
  return { level, controls, band: result.band }
}
