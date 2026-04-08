/**
 * Fetches Agora RTC token from Supabase Edge Function `agora-token`.
 */
import { platformDb } from '../supabase/supabaseClient'

export async function fetchAgoraRtcToken({ channelName, uid = 0 }) {
  const { data, error } = await platformDb.functions.invoke('agora-token', {
    body: { channelName, uid },
  })
  if (error) return { token: null, error }
  const token = data?.token ?? data?.rtcToken
  if (!token) return { token: null, error: new Error(data?.error || 'No token in response') }
  return { token, error: null, appId: data?.appId }
}
