/**
 * Turn event management (v734).
 */
import { simDb } from '../supabase/supabaseClient';
import { generateEventsForTurn, calculateConsequences } from './eventGeneratorService';

export async function getEventsForTurn(turnId, userRole) {
  let query = simDb.from('turn_events').select('*').eq('turn_id', turnId);
  if (userRole) {
    query = query.or(`target_role.is.null,target_role.eq.${userRole}`);
  }
  const { data, error } = await query.order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function submitDecision(eventId, decisionOptionId, projectState = {}) {
  const { data: event, error } = await simDb.from('turn_events').select('*').eq('id', eventId).single();
  if (error) throw error;

  const outcome = calculateConsequences(event, decisionOptionId, projectState);
  const { data, error: updateErr } = await simDb
    .from('turn_events')
    .update({ user_decision: decisionOptionId, outcome })
    .eq('id', eventId)
    .select()
    .single();
  if (updateErr) throw updateErr;

  const turn = event.turn_id
    ? (await simDb.from('simulation_turns').select('decisions_made').eq('id', event.turn_id).single()).data
    : null;
  if (turn) {
    const decisions = [...(turn.decisions_made || []), { eventId, decisionOptionId, outcome }];
    await simDb.from('simulation_turns').update({ decisions_made: decisions }).eq('id', event.turn_id);
  }

  return data;
}

/**
 * Collaborative Team mode (v736 Phase D) — escalate an event one level up
 * the session's role hierarchy (PM -> Programme -> Portfolio). Caller must
 * own the event's run. Server-side RPC handles the role-chain logic and
 * authorization (see escalate_turn_event in v744).
 */
export async function escalateTurnEvent(eventId, reason = null) {
  const { data, error } = await simDb.rpc('escalate_turn_event', {
    p_event_id: eventId,
    p_reason: reason,
  })
  if (error) return { success: false, error: error.message }
  return data
}

/**
 * Resolve an event that was escalated TO the current user's role — a
 * different user than whoever owns the event's run, which is why this goes
 * through resolve_escalated_event() (SECURITY DEFINER) rather than a plain
 * client-side update like submitDecision(). Outcome is computed the same
 * way as a solo decision (calculateConsequences), then passed through.
 */
export async function resolveEscalatedEvent(eventId, decisionOptionId, projectState = {}, notes = null) {
  const { data: event, error: fetchErr } = await simDb.from('turn_events').select('*').eq('id', eventId).single()
  if (fetchErr) return { success: false, error: fetchErr.message }

  const outcome = calculateConsequences(event, decisionOptionId, projectState)

  const { data, error } = await simDb.rpc('resolve_escalated_event', {
    p_event_id: eventId,
    p_decision_option_id: decisionOptionId,
    p_outcome: outcome,
    p_notes: notes,
  })
  if (error) return { success: false, error: error.message }
  return data
}

/** Escalations currently pending against the caller's role in a collaborative session (Phase D.2 "waiting on me"). */
export async function getPendingEscalations(sessionId, myRole) {
  const { data, error } = await simDb
    .from('collaborative_pending_escalations')
    .select('*')
    .eq('collaborative_session_id', sessionId)
    .eq('escalated_to_role', myRole)
    .order('escalated_at', { ascending: true })
  if (error) return { success: false, error: error.message, data: [] }
  return { success: true, data: data || [] }
}

export async function generateTurnEvents(runId, turnNumber, userRole, context = {}) {
  const events = generateEventsForTurn(context.scenario, turnNumber, context.projectState || {}, context.previousDecisions || [], userRole);
  if (!events.length) return [];

  const { data: turn } = await simDb
    .from('simulation_turns')
    .select('id')
    .eq('run_id', runId)
    .eq('turn_number', turnNumber)
    .maybeSingle();

  const rows = events.map((ev) => ({
    run_id: runId,
    turn_id: turn?.id || null,
    event_type: ev.event_type,
    severity: ev.severity,
    title: ev.title,
    description: ev.description,
    requires_decision: ev.requires_decision !== false,
    decision_options: ev.decision_options || [],
    target_role: ev.target_role || userRole,
    npc_source: ev.npc_source || null,
  }));

  const { data, error } = await simDb.from('turn_events').insert(rows).select();
  if (error) throw error;
  return data;
}
