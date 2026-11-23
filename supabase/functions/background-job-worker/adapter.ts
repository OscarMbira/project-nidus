/**
 * v1352 D2 — the host adapter for background jobs. The ONLY module in background-job-worker that imports
 * @supabase/supabase-js or reads host secrets; handlers and the worker core get a plain `ctx`:
 *
 *   ctx.rpc(fn, args)                          → { data, error }   database function (service role)
 *   ctx.invokeFunction(name, body, { headers }) → { ok, status, data }   another edge function / HTTP endpoint
 *   ctx.env(name)                              → string | undefined   server-only setting
 *   ctx.log(message)
 *
 * After a host move only this file changes (e.g. a pg client and a plain HTTP base URL).
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

export interface JobContext {
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>
  invokeFunction: (
    name: string,
    body?: unknown,
    options?: { headers?: Record<string, string> },
  ) => Promise<{ ok: boolean; status: number; data: any }>
  env: (name: string) => string | undefined
  log: (message: string) => void
}

export function createJobContext(): JobContext {
  const url = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!url || !serviceKey) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

  return {
    rpc: async (fn, args = {}) => {
      const { data, error } = await db.rpc(fn, args)
      return { data, error: error ? { message: error.message } : null }
    },
    invokeFunction: async (name, body = {}, options = {}) => {
      const res = await fetch(`${url.replace(/\/$/, '')}/functions/v1/${name}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
          ...(options.headers || {}),
        },
        body: JSON.stringify(body ?? {}),
      })
      const text = await res.text()
      let data: unknown = null
      try { data = text ? JSON.parse(text) : null } catch { data = { error: text.slice(0, 500) } }
      return { ok: res.ok, status: res.status, data }
    },
    env: (name) => Deno.env.get(name) ?? undefined,
    log: (message) => console.log(message),
  }
}
