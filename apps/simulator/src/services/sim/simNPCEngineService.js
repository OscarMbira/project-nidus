/**
 * v505 NPC engine — events, clock tick, escalation, autonomous actions (lightweight MVP hooks).
 */
import { simDb } from '../supabase/supabaseClient'
import {
  applyHealthImpactMerge,
  persistProjectHealth,
  handleToleranceBreach,
  updateEVMSnapshot,
} from './simRunStateService'
import { applyAdaptiveDifficulty, loadNpcMemory, personaliseEvent } from './simAiAgentsService'
import { responseDeadlineDays, selectTemplates, templateControls } from '@nidus/shared/utils/simAdaptiveDifficulty'

export async function getPendingEvents(runId) {
  const { data, error } = await simDb
    .from('ai_events')
    .select('*')
    .eq('run_id', runId)
    .eq('is_resolved', false)
    .order('triggered_at', { ascending: false })
  if (error) return { success: false, data: [], error: error.message }
  return { success: true, data: data || [], error: null }
}

export async function generateNextEvents(runId, maxEvents = 2) {
  const { data: run, error: runErr } = await simDb
    .from('simulation_runs')
    .select('id, sim_day, methodology, active_stage, scenario_id, practice_project_id, phase_events_fired, user_role, project_health, difficulty_level')
    .eq('id', runId)
    .single()
  if (runErr || !run) return { success: false, inserted: 0, error: runErr?.message || 'Run not found' }

  const methodology = run.methodology || 'traditional'
  const stage = run.active_stage || 'initiation'
  const fired = typeof run.phase_events_fired === 'object' && run.phase_events_fired ? run.phase_events_fired : {}

  const { data: templates, error: te } = await simDb
    .from('npc_event_templates')
    .select('*')
    .eq('is_active', true)
    .limit(80)

  if (te) return { success: false, inserted: 0, error: te.message }

  const candidates = (templates || []).filter((t) => {
    if (t.methodology !== 'any' && t.methodology !== methodology) return false
    if (t.phase_trigger && t.phase_trigger !== 'any' && t.phase_trigger !== stage) return false
    if (t.emitting_role === run.user_role) return false
    return true
  })

  // v1272 Phase 3 (D27): the run's difficulty level tunes severity cap, cooldowns, weights and
  // response time; selection is rule-based and deterministic (no AI).
  const controls = templateControls(run.difficulty_level || 3)
  let inserted = 0
  const pick = selectTemplates(candidates, controls, { simDay: run.sim_day || 0, fired, max: Math.max(maxEvents, controls.maxEvents) })
  const memory = await loadNpcMemory(runId).catch(() => ({}))

  const { data: assignments } = await simDb
    .from('npc_run_assignments')
    .select('role_name, npc_character_id')
    .eq('run_id', runId)

  const roleToNpc = Object.fromEntries((assignments || []).map((a) => [a.role_name, a.npc_character_id]))

  for (const tmpl of pick) {
    const npcId = roleToNpc[tmpl.emitting_role] || null
    // Low stakeholder trust (D15) shortens the response time, so escalations come sooner.
    const days = responseDeadlineDays(controls, memory[npcId]?.trust_score ?? 0)
    const deadline = new Date(Date.now() + days * 86400000).toISOString()
    const { data: insertedRow, error: insErr } = await simDb.from('ai_events').insert({
      run_id: runId,
      event_type: 'npc_template',
      event_category: tmpl.category,
      event_name: tmpl.title,
      event_description: tmpl.description,
      severity: tmpl.severity,
      triggered_at: new Date().toISOString(),
      response_deadline: deadline,
      event_data: { template_code: tmpl.template_code, difficulty_level: controls.level },
      npc_character_id: npcId,
      npc_event_template_id: tmpl.id,
      response_options: tmpl.options,
      max_score: 100,
    }).select('id').single()
    if (!insErr) {
      inserted += 1
      fired[tmpl.template_code] = run.sim_day
      // AI re-words the event around the learner's project in the background (options unchanged).
      if (insertedRow?.id) personaliseEvent(runId, insertedRow.id)
    }
  }

  await simDb
    .from('simulation_runs')
    .update({ phase_events_fired: fired, updated_at: new Date().toISOString(), last_activity_at: new Date().toISOString() })
    .eq('id', runId)

  return { success: true, inserted, error: null }
}

export const resolveEvent = (eventId, selectedOptionIndex) => scoreEventResponse(eventId, selectedOptionIndex)

export async function scoreEventResponse(eventId, selectedOptionIndex) {
  const { data: ev, error } = await simDb.from('ai_events').select('*').eq('id', eventId).single()
  if (error || !ev) return { success: false, error: error?.message || 'Event not found' }

  const opts = Array.isArray(ev.response_options) ? ev.response_options : []
  const opt = opts[selectedOptionIndex]
  const score = typeof opt?.score === 'number' ? opt.score : 50
  const feedback = opt?.feedback || ''

  let healthPatch = {}
  if (opt?.impact && typeof opt.impact === 'object') {
    healthPatch = opt.impact
  }

  const { data: run } = await simDb.from('simulation_runs').select('project_health').eq('id', ev.run_id).single()
  const newHealth = applyHealthImpactMerge(run?.project_health || {}, healthPatch)

  await simDb
    .from('ai_events')
    .update({
      is_resolved: true,
      resolved_at: new Date().toISOString(),
      selected_option_index: selectedOptionIndex,
      user_response: opt || {},
      response_score: score,
      feedback,
    })
    .eq('id', eventId)

  await persistProjectHealth(ev.run_id, newHealth)

  const metricHit = Object.entries(newHealth).some(([k, v]) => {
    if (typeof v !== 'number') return false
    if (k === 'schedule_variance_days') return false
    return v < 50
  })
  if (metricHit) await handleToleranceBreach(ev.run_id, true)

  return { success: true, score, feedback }
}

export async function autoEscalateOverdueEvents(runId) {
  const { data: run } = await simDb.from('simulation_runs').select('sim_day, project_health').eq('id', runId).single()
  if (!run) return { success: false }

  const { data: events } = await simDb.from('ai_events').select('*').eq('run_id', runId).eq('is_resolved', false)

  let health = run.project_health || {}
  for (const ev of events || []) {
    const deadline = ev.response_deadline ? new Date(ev.response_deadline).getTime() : null
    if (!deadline || Date.now() < deadline) continue

    let tmpl = null
    if (ev.npc_event_template_id) {
      const { data } = await simDb.from('npc_event_templates').select('*').eq('id', ev.npc_event_template_id).maybeSingle()
      tmpl = data
    }

    const det = tmpl?.deterioration || {}
    health = applyHealthImpactMerge(health, typeof det === 'object' ? det : {})

    await simDb
      .from('ai_events')
      .update({ auto_deteriorated: true })
      .eq('id', ev.id)

    const escCode = tmpl?.escalation_template_code
    if (escCode) {
      const { data: tmpl } = await simDb.from('npc_event_templates').select('*').eq('template_code', escCode).maybeSingle()
      if (tmpl) {
        await simDb.from('ai_events').insert({
          run_id: runId,
          event_type: 'npc_escalation',
          event_category: tmpl.category,
          event_name: tmpl.title,
          event_description: tmpl.description,
          severity: tmpl.severity,
          triggered_at: new Date().toISOString(),
          response_deadline: new Date(Date.now() + 2 * 86400000).toISOString(),
          npc_event_template_id: tmpl.id,
          response_options: tmpl.options,
          escalated_from_event_id: ev.id,
        })
        await simDb.from('ai_events').update({ escalated: true }).eq('id', ev.id)
      }
    }
  }

  await persistProjectHealth(runId, health)
  return { success: true }
}

export async function applyNPCAutonomousActions(runId) {
  const { data: run } = await simDb.from('simulation_runs').select('sim_day').eq('id', runId).single()
  if (!run) return { success: false }
  const { data: assigns } = await simDb.from('npc_run_assignments').select('npc_character_id').eq('run_id', runId)
  const npcId = assigns?.[0]?.npc_character_id
  if (!npcId) return { success: true, logged: 0 }

  if (run.sim_day % 3 === 0) {
    await simDb.from('npc_autonomous_actions').insert({
      run_id: runId,
      npc_character_id: npcId,
      action_type: 'work_package_update',
      action_description: 'NPC team progressed work packages based on plan.',
      sim_day: run.sim_day,
    })
    return { success: true, logged: 1 }
  }
  return { success: true, logged: 0 }
}

export async function tickSimulationClock(runId) {
  const { data: run, error } = await simDb.from('simulation_runs').select('*').eq('id', runId).single()
  if (error || !run) return { success: false, error: error?.message }

  const nextDay = (run.sim_day || 1) + 1
  const anchorStr = run.sim_start_date || new Date().toISOString().slice(0, 10)
  const anchor = new Date(anchorStr + 'T12:00:00Z')
  const simDate = new Date(anchor)
  simDate.setUTCDate(anchor.getUTCDate() + nextDay - 1)

  await simDb.from('sim_clock_ticks').insert({
    run_id: runId,
    sim_day: nextDay,
    sim_date: simDate.toISOString().slice(0, 10),
    events_generated: 0,
    evm_updated: true,
  })

  await simDb
    .from('simulation_runs')
    .update({
      sim_day: nextDay,
      sim_start_date: run.sim_start_date || anchorStr,
      updated_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
    })
    .eq('id', runId)

  await applyAdaptiveDifficulty({ ...run, sim_day: nextDay }).catch(() => null)
  await generateNextEvents(runId, 2)
  await updateEVMSnapshot(runId)
  await applyNPCAutonomousActions(runId)
  await autoEscalateOverdueEvents(runId)

  return { success: true, sim_day: nextDay }
}
