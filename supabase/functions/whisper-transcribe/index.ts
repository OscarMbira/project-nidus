/**
 * Proxy audio to OpenAI Whisper (API key server-side).
 * Body: JSON { audioBase64, mimeType, app? } or raw bytes with Content-Type.
 * v1272: signed-in users only and the AI gate applies (kill switch, organisation consent), because
 * meeting audio leaves our infrastructure. Whisper stays the one non-Anthropic provider (PRD D1);
 * transcription is recorded in agent_runs but does not use AI credits.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { errorResponse, json, preflight } from '../_shared/http.ts'
import { normaliseApp } from '../_shared/auth.ts'
import { startAiRun } from '../_shared/aiRun.ts'

serve(async (req) => {
  const pre = preflight(req)
  if (pre) return pre

  const key = Deno.env.get('OPENAI_API_KEY') || ''
  if (!key) return json(req, 503, { error: 'Transcription is not configured on the server yet.' })

  try {
    let blob: Blob
    let app: unknown = null
    const ct = req.headers.get('content-type') || ''
    if (ct.includes('application/json')) {
      const j = await req.json()
      const b64 = j?.audioBase64 || j?.audio
      const mime = j?.mimeType || 'audio/webm'
      app = j?.app
      if (!b64) return json(req, 400, { error: 'audioBase64 required' })
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
      blob = new Blob([bytes], { type: mime })
    } else {
      blob = await req.blob()
    }

    const run = await startAiRun(req, { app: normaliseApp(app), agent: 'transcribe' })
    if (run.blocked) return json(req, 403, run.blocked)

    const form = new FormData()
    form.append('file', blob, 'audio.webm')
    form.append('model', 'whisper-1')

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    })
    const data = await res.json()
    if (!res.ok) {
      await run.finish({ error: data?.error?.message || res.statusText, status: 'failed' })
      return json(req, 502, { error: 'Transcription failed. Please try again.' })
    }
    await run.finish({ answer: null })
    return json(req, 200, { text: data.text || '' })
  } catch (err) {
    return errorResponse(req, err)
  }
})
