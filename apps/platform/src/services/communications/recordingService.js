/**
 * Meeting recording metadata — upload binary to Supabase Storage bucket `comm-recordings`.
 */
import { platformDb } from '../supabase/supabaseClient'

const BUCKET = 'comm-recordings'

export async function uploadRecording({ path, file }) {
  const { data, error } = await platformDb.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || 'video/webm',
  })
  if (error) return { path: null, error }
  return { path: data?.path || path, error: null }
}

export function recordingPublicUrl(path) {
  const { data } = platformDb.storage.from(BUCKET).getPublicUrl(path)
  return data?.publicUrl || null
}
