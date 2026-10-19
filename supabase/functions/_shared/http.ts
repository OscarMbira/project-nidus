/**
 * v1272 — shared HTTP helpers for AI edge functions.
 *
 * CORS: set the ALLOWED_ORIGINS secret (comma-separated, e.g. https://app.example.com,https://sim.example.com)
 * to restrict browsers to the apps. Without it any origin is accepted — every AI function still
 * requires a signed-in user's JWT (see auth.ts), which is the real control.
 */

const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || ''
  const allow = allowedOrigins.length === 0 ? '*' : allowedOrigins.includes(origin) ? origin : allowedOrigins[0]
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

export function preflight(req: Request): Response | null {
  return req.method === 'OPTIONS' ? new Response('ok', { headers: corsHeaders(req) }) : null
}

export function json(req: Request, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  })
}

export class HttpError extends Error {
  status: number
  code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export function errorResponse(req: Request, err: unknown): Response {
  if (err instanceof HttpError) return json(req, err.status, { error: err.message, code: err.code })
  console.error('[ai] unexpected error', err)
  return json(req, 500, { error: 'Something went wrong while answering. Please try again.', code: 'internal' })
}
