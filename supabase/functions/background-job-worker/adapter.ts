/**
 * v1352 D2 — the host adapter for background jobs. The ONLY module in background-job-worker that imports
 * @supabase/supabase-js or reads host secrets; handlers and the worker core get a plain `ctx`:
 *
 *   ctx.rpc(fn, args)                          → { data, error }   database function (service role)
 *   ctx.invokeFunction(name, body, { headers, form }) → { ok, status, data }   another edge function (JSON
 *                                              body, or a url-encoded `form` string such as a Paynow message)
 *   ctx.httpGet(url)                           → { ok, status, text }   an outside HTTPS address (v1352 Slice 2)
 *   ctx.storageRemove(bucket, paths)           → { removed, error }   delete Storage files (v1352 Slice 3)
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
    options?: { headers?: Record<string, string>; form?: string },
  ) => Promise<{ ok: boolean; status: number; data: any }>
  httpGet: (url: string) => Promise<{ ok: boolean; status: number; text: string }>
  storageRemove: (bucket: string, paths: string[]) => Promise<{ removed: number; error: { message: string } | null }>
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
          'Content-Type': typeof options.form === 'string' ? 'application/x-www-form-urlencoded' : 'application/json',
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
          ...(options.headers || {}),
        },
        body: typeof options.form === 'string' ? options.form : JSON.stringify(body ?? {}),
      })
      const text = await res.text()
      let data: unknown = null
      try { data = text ? JSON.parse(text) : null } catch { data = { error: text.slice(0, 500) } }
      return { ok: res.ok, status: res.status, data }
    },
    httpGet: async (target) => {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 20_000)
      try {
        const res = await fetch(target, { method: 'GET', signal: controller.signal })
        return { ok: res.ok, status: res.status, text: (await res.text()).slice(0, 20_000) }
      } finally {
        clearTimeout(timer)
      }
    },
    storageRemove: async (bucket, paths) => {
      const { data, error } = await db.storage.from(bucket).remove(paths)
      return { removed: Array.isArray(data) ? data.length : 0, error: error ? { message: error.message } : null }
    },
    env: (name) => Deno.env.get(name) ?? undefined,
    log: (message) => console.log(message),
  }
}
