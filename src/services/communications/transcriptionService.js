/**
 * Whisper transcription via Edge Function `whisper-transcribe`.
 */
import { platformDb } from '../supabase/supabaseClient'

/** @param {Blob|File} audio */
export async function transcribeAudioBlob(audio, { mimeType = 'audio/webm' } = {}) {
  const buf = await audio.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  const audioBase64 = btoa(binary)

  const { data, error } = await platformDb.functions.invoke('whisper-transcribe', {
    body: { audioBase64, mimeType },
  })
  if (error) return { text: null, error }
  return { text: data?.text || '', error: null }
}
