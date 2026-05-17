/** v505 Stage gate reviews */
import { simDb } from '../supabase/supabaseClient'
import { checkPhaseGateCompliance, advancePhase } from './simRunStateService'

export async function createStageGateReview(runId, stageName, reviewType = 'end_stage') {
  const { data, error } = await simDb
    .from('stage_gate_reviews')
    .insert({ run_id: runId, stage_name: stageName, review_type: reviewType, status: 'pending' })
    .select()
    .single()
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function submitStageGateReview(reviewId, payload = {}) {
  const { score, board_response } = payload
  const patch = {
    status: 'submitted',
    submitted_at: new Date().toISOString(),
  }
  if (score != null) patch.score = score
  if (board_response != null) patch.board_response = board_response

  const { error } = await simDb.from('stage_gate_reviews').update(patch).eq('id', reviewId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function recordBoardDecision(reviewId, decision, score = null, feedbackJson = {}) {
  const { data: rev, error: fetchErr } = await simDb.from('stage_gate_reviews').select('*').eq('id', reviewId).single()
  if (fetchErr || !rev) return { success: false, error: fetchErr?.message || 'Review not found' }

  const runId = rev.run_id
  await simDb
    .from('stage_gate_reviews')
    .update({
      board_decision: decision,
      score,
      status: decision === 'authorized' ? 'approved' : 'submitted',
      decided_at: new Date().toISOString(),
      board_response: feedbackJson,
    })
    .eq('id', reviewId)

  if (decision === 'authorized') {
    const next =
      rev.stage_name === 'initiation' ? 'planning' : rev.stage_name === 'planning' ? 'execution' : 'closure'
    await advancePhase(runId, next)
  }

  return { success: true }
}

export async function loadCompliance(runId, fromPhase, toPhase, methodology) {
  return checkPhaseGateCompliance(runId, fromPhase, toPhase, methodology)
}
