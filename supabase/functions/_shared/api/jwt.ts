/**
 * v1356 — short-lived JWT for a service-account auth user so RLS applies (D2, D3).
 * Signs with SUPABASE_JWT_SECRET (same secret Auth uses).
 */
const encoder = new TextEncoder()

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let s = ''
  for (const b of u8) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlJson(obj: unknown): string {
  return b64url(encoder.encode(JSON.stringify(obj)))
}

async function hmacSign(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
  return b64url(sig)
}

export async function mintServiceJwt(opts: {
  authUserId: string
  email?: string | null
  role?: string
  expiresInSeconds?: number
  jwtSecret?: string
}): Promise<string> {
  const secret = opts.jwtSecret || Deno.env.get('SUPABASE_JWT_SECRET') || ''
  if (!secret) throw new Error('SUPABASE_JWT_SECRET is not set')
  const now = Math.floor(Date.now() / 1000)
  const exp = now + (opts.expiresInSeconds ?? 300)
  const header = { alg: 'HS256', typ: 'JWT' }
  const payload = {
    sub: opts.authUserId,
    role: opts.role || 'authenticated',
    aud: 'authenticated',
    email: opts.email || undefined,
    iat: now,
    exp,
    is_service_account: true,
  }
  const unsigned = `${b64urlJson(header)}.${b64urlJson(payload)}`
  const sig = await hmacSign(secret, unsigned)
  return `${unsigned}.${sig}`
}
