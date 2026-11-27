/**
 * v1356 — in-memory helpers for rate-limit decisions. Counters live in api_rate_counters (D6).
 */
export type RateLimits = {
  perMinute: number
  perDay: number
  scimPerMinute: number
}

export const DEFAULT_RATE_LIMITS: RateLimits = {
  perMinute: 120,
  perDay: 50_000,
  scimPerMinute: 60,
}

export type RateBucket = {
  minuteCount: number
  dayCount: number
  minuteLimit: number
  dayLimit: number
}

export type RateDecision =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number; reason: 'minute' | 'day' }

export function decideRate(bucket: RateBucket): RateDecision {
  if (bucket.minuteCount >= bucket.minuteLimit) {
    return { ok: false, retryAfterSeconds: 60, reason: 'minute' }
  }
  if (bucket.dayCount >= bucket.dayLimit) {
    const now = new Date()
    const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((end - now.getTime()) / 1000)), reason: 'day' }
  }
  return { ok: true }
}

export function minuteKey(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}T${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
}

export function dayKey(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}
