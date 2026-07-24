/** v505 User → NPC messaging */
import { simDb } from '../supabase/supabaseClient'
import { getSimAuthUserId } from './simAuth'

export async function sendMessageToNPC(runId, npcCharacterId, messageType, subject, body, linkedArtefact = {}) {
  try {
    const authUserId = await getSimAuthUserId()
    const row = {
      run_id: runId,
      from_user_id: authUserId,
      to_npc_character_id: npcCharacterId,
      message_type: messageType,
      subject: subject || null,
      body,
      linked_artefact_type: linkedArtefact.type || null,
      linked_artefact_id: linkedArtefact.id || null,
      npc_response:
        "Thanks — I've logged your note and will reflect progress on the next status pulse.",
      npc_responded_at: new Date().toISOString(),
      npc_response_score: null,
    }
    const { data, error } = await simDb.from('npc_user_messages').insert(row).select().single()
    if (error) return { success: false, error: error.message }
    return { success: true, data }
  } catch (e) {
    return { success: false, error: e.message }
  }
}

export function scoreHighlightReportSubmission(simDay, lastReportSimDay, frequencyDays = 14) {
  const due = (lastReportSimDay || 0) + frequencyDays
  const timeliness = simDay <= due ? 90 : Math.max(0, 90 - (simDay - due) * 5)
  const completeness = 75
  const score = Math.round(timeliness * 0.5 + completeness * 0.5)
  return { score, timeliness, completeness }
}

export async function getOverdueHighlightReports(runId, frequencyDays = 14) {
  const { data: run } = await simDb.from('simulation_runs').select('sim_day').eq('id', runId).single()
  if (!run) return []
  return []
}
