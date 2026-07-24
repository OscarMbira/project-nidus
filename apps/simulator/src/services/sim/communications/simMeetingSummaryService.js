import { platformDb } from '../../supabase/supabaseClient'

export async function runMeetingAiExtraction(transcriptText) {
  const { data, error } = await platformDb.functions.invoke('meeting-ai-extract', {
    body: { transcript: transcriptText },
  })
  if (error) return { data: null, error }
  return { data, error: null }
}
