/**
 * v1356 — portable key hashing and timing-safe compare (Node / Deno).
 * Keys are shown once; only the hash and a short prefix are stored.
 */
const encoder = new TextEncoder()

export function randomToken(bytes = 32): string {
  const buf = new Uint8Array(bytes)
  crypto.getRandomValues(buf)
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Visible prefix, e.g. nds_live_a1b2c3d4 — never enough to authenticate alone. */
export function keyPrefix(plain: string, length = 12): string {
  return plain.slice(0, Math.min(length, plain.length))
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function hashMatches(plain: string, storedHash: string): Promise<boolean> {
  const hash = await sha256Hex(plain)
  return timingSafeEqual(hash, storedHash)
}

/** Organisation API keys: nds_live_<64 hex>. SCIM tokens: nds_scim_<64 hex>. */
export function mintApiKey(): { plain: string; prefix: string } {
  const plain = `nds_live_${randomToken(32)}`
  return { plain, prefix: keyPrefix(plain, 16) }
}

export function mintScimToken(): { plain: string; prefix: string } {
  const plain = `nds_scim_${randomToken(32)}`
  return { plain, prefix: keyPrefix(plain, 16) }
}

export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('')
}
