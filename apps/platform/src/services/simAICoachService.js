/**
 * simAICoachService.js (Phase 7)
 * Simulator AI coaching: real-time hints (Edge Function ai-simulator-hint / Gemini)
 * and post-run debriefs (Edge Function ai-simulator-debrief / Claude).
 * All simulator data stays on your server; only aggregated/hint payloads go to APIs.
 */

import { simDb } from './supabase/supabaseClient'

/**
 * Get a real-time coaching hint via Edge Function ai-simulator-hint (Gemini Flash).
 * @param {string} runId
 * @param {string} userId
 * @param {string} moduleId - Name of the current simulation module
 * @param {string} triggerReason - One of: stage_entry, score_low, blank_field, idle, bad_decision
 * @param {number} currentScore - 0-100
 * @param {string} [stage] - Optional stage name
 * @returns {Promise<string>} hint text
 */
export async function getRealtimeHint(runId, userId, moduleId, triggerReason, currentScore = 0, stage = null) {
  let hintText = ''
  try {
    const { data, error } = await simDb.functions.invoke('ai-simulator-hint', {
      body: { stage: stage || undefined, moduleId, score: currentScore, triggerReason },
    })
    if (!error && data?.hint) hintText = String(data.hint).trim()
  } catch {
    // Fallback: no hint
  }

  if (hintText) {
    await logCoachEvent(runId, userId, moduleId, triggerReason, hintText)
  }
  return hintText
}

/** Log a coaching hint event to the DB */
export async function logCoachEvent(runId, userId, moduleId, triggerReason, hintText) {
  try {
    await simDb
      .from('ai_coach_events')
      .insert({ run_id: runId, user_id: userId, module_id: moduleId, trigger_reason: triggerReason, hint_text: hintText })
  } catch {
    // Non-critical
  }
}

/** Mark a coaching hint as dismissed */
export async function dismissHint(eventId) {
  try {
    await simDb.from('ai_coach_events').update({ dismissed: true }).eq('id', eventId)
  } catch {}
}

/**
 * Build run summary string for debrief (no PII).
 * @param {Object} runData - { moduleScores, totalScore, decisions, elapsed }
 */
function buildRunSummary(runData = {}) {
  const { moduleScores = {}, totalScore = 0, decisions = [] } = runData
  const scoreLines = Object.entries(moduleScores)
    .map(([mod, score]) => `${mod}: ${score}%`)
    .join(', ')
  return `Total score: ${totalScore}%. Module scores: ${scoreLines || 'N/A'}. Key decisions: ${(decisions.slice(0, 5).join(', ') || 'N/A')}.`
}

/**
 * Generate a post-simulation AI debrief via Edge Function ai-simulator-debrief (Claude).
 * @param {string} runId
 * @param {string} userId
 * @param {Object} runData - { moduleScores, totalScore, decisions, elapsed }
 * @returns {Promise<Object>} structured debrief { summary, strengths, improvements, topTip, moduleCommentary? }
 */
export async function generateDebrief(runId, userId, runData = {}) {
  const runSummary = buildRunSummary(runData)
  const totalScore = runData.totalScore ?? 0
  let debrief = null
  try {
    const { data, error } = await simDb.functions.invoke('ai-simulator-debrief', {
      body: { runSummary },
    })
    if (!error && data?.debrief) debrief = data.debrief
  } catch {}
  if (!debrief) debrief = getDefaultDebrief(totalScore)
  const insertedId = await saveDebrief(runId, userId, debrief)
  return { ...debrief, _insertedId: insertedId }
}

function getDefaultDebrief(score) {
  return {
    summary: `You completed the simulation with a score of ${score}%.`,
    strengths: ['Completed the simulation', 'Engaged with the modules'],
    improvements: ['Review risk management practices', 'Focus on stakeholder engagement'],
    topTip: 'Revisit the areas where your score was below 60% and try again.',
  }
}

/** Save debrief to sim.ai_debriefs. Returns inserted row with id. */
export async function saveDebrief(runId, userId, content) {
  try {
    const { data } = await simDb
      .from('ai_debriefs')
      .insert({ run_id: runId, user_id: userId, content })
      .select('id')
      .single()
    return data?.id ?? null
  } catch {
    return null
  }
}

/** Load all past debriefs for a user */
export async function getPastDebriefs(userId) {
  try {
    const { data } = await simDb
      .from('ai_debriefs')
      .select('id, run_id, content, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    return data || []
  } catch {
    return []
  }
}

/** Load a single debrief by id */
export async function getDebriefById(debriefId) {
  try {
    const { data } = await simDb
      .from('ai_debriefs')
      .select('id, run_id, user_id, content, created_at')
      .eq('id', debriefId)
      .maybeSingle()
    return data
  } catch {
    return null
  }
}

/** Get module scores for a simulation run (for SimAIWorkspaceScores) */
export async function getModuleScoresForRun(runId) {
  if (!runId) return []
  try {
    const { data } = await simDb
      .from('module_scores')
      .select('id, module_name, module_type, score, max_score, percentage, feedback')
      .eq('run_id', runId)
      .order('module_name')
    return data || []
  } catch {
    return []
  }
}

/** Get simulation run summary (total_score, scenario) for a run */
export async function getRunSummary(runId) {
  if (!runId) return null
  try {
    const { data } = await simDb
      .from('simulation_runs')
      .select('id, total_score, max_possible_score, status, completed_at, scenario_id, scenario:scenario_id(name)')
      .eq('id', runId)
      .maybeSingle()
    return data
  } catch {
    return null
  }
}

/** Whether coaching hints are enabled for the org (Phase 7.5). Default true if no row. */
export async function getSimCoachHintsEnabled(orgId) {
  if (!orgId) return true
  try {
    const { data } = await simDb
      .from('ai_settings')
      .select('coach_hints_enabled')
      .eq('organisation_id', orgId)
      .maybeSingle()
    return data?.coach_hints_enabled !== false
  } catch {
    return true
  }
}
