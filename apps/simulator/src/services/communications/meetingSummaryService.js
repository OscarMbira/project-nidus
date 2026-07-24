/**
 * AI meeting summary — Edge Function `meeting-ai-extract` (Gemini structured JSON).
 */
import { platformDb } from '../supabase/supabaseClient'

export async function runMeetingAiExtraction(transcriptText) {
  const { data, error } = await platformDb.functions.invoke('meeting-ai-extract', {
    body: { transcript: transcriptText },
  })
  if (error) return { data: null, error }
  return { data, error: null }
}

export async function saveMeetingSummary(meetingId, row) {
  const { data, error } = await platformDb
    .from('comm_meeting_summaries')
    .upsert(
      {
        meeting_id: meetingId,
        summary_text: row.summary_text ?? row.summary ?? null,
        key_decisions: row.key_decisions || [],
        action_items: row.action_items || [],
        topics_discussed: row.topics_discussed || [],
        sentiment: row.sentiment || null,
        ai_model_used: row.ai_model_used || 'gemini',
        generated_at: new Date().toISOString(),
      },
      { onConflict: 'meeting_id' }
    )
    .select()
    .single()
  return { data, error }
}
