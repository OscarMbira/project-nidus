/**
 * v1356 — portable API core tests (crypto, scopes, rate, pagination, etag).
 * Run from supabase/functions: npx vitest run
 */
import { describe, expect, it } from 'vitest'
import { hashMatches, keyPrefix, mintApiKey, sha256Hex, timingSafeEqual } from '../crypto.ts'
import { expandScopes, hasScope, isKnownScope } from '../scopes.ts'
import { dayKey, decideRate, minuteKey } from '../rate.ts'
import { decodeCursor, encodeCursor, parsePagination, MAX_LIMIT } from '../pagination.ts'
import { etagFromUpdatedAt, ifMatchOk } from '../etag.ts'
import { problem } from '../problem.ts'
import { buildOpenApi } from '../openapi.ts'
import { RESOURCES } from '../resources/catalog.ts'

describe('crypto', () => {
  it('hashes stably and compares in constant time', async () => {
    const a = await sha256Hex('nds_live_abc')
    const b = await sha256Hex('nds_live_abc')
    expect(a).toBe(b)
    expect(await hashMatches('nds_live_abc', a)).toBe(true)
    expect(await hashMatches('nds_live_abd', a)).toBe(false)
    expect(timingSafeEqual(a, b)).toBe(true)
    expect(timingSafeEqual('aa', 'ab')).toBe(false)
  })

  it('mints a key with a visible prefix', () => {
    const { plain, prefix } = mintApiKey()
    expect(plain.startsWith('nds_live_')).toBe(true)
    expect(prefix).toBe(keyPrefix(plain, 16))
  })
})

describe('scopes', () => {
  it('expands write into read and rejects unknown scopes', () => {
    expect(isKnownScope('projects:write')).toBe(true)
    expect(isKnownScope('secrets:read')).toBe(false)
    const set = expandScopes(['projects:write', 'secrets:read'])
    expect(hasScope(set, 'projects:write')).toBe(true)
    expect(hasScope(set, 'projects:read')).toBe(true)
    expect(hasScope(set, 'secrets:read')).toBe(false)
  })
})

describe('rate', () => {
  it('returns 429 when the minute or day bucket is full', () => {
    expect(decideRate({ minuteCount: 120, dayCount: 1, minuteLimit: 120, dayLimit: 50000 }).ok).toBe(false)
    expect(decideRate({ minuteCount: 1, dayCount: 50000, minuteLimit: 120, dayLimit: 50000 }).reason).toBe('day')
    expect(decideRate({ minuteCount: 1, dayCount: 1, minuteLimit: 120, dayLimit: 50000 }).ok).toBe(true)
    expect(minuteKey().includes('T')).toBe(true)
    expect(dayKey().length).toBe(10)
  })
})

describe('pagination and etag', () => {
  it('caps limit at 200 and round-trips cursors', () => {
    const url = new URL('https://api.example.com/v1/projects?limit=999')
    expect(parsePagination(url).limit).toBe(MAX_LIMIT)
    const cur = encodeCursor({ updated_at: '2026-01-01T00:00:00.000Z', id: 'a' })
    expect(decodeCursor(cur)).toEqual({ updated_at: '2026-01-01T00:00:00.000Z', id: 'a' })
  })

  it('checks If-Match against the updated_at tag', () => {
    const tag = etagFromUpdatedAt('2026-01-01T00:00:00.000Z')
    expect(ifMatchOk(tag, '2026-01-01T00:00:00.000Z')).toBe(true)
    expect(ifMatchOk('"stale"', '2026-01-01T00:00:00.000Z')).toBe(false)
  })
})

describe('openapi', () => {
  it('lists D4 resources and problem details', () => {
    const doc = buildOpenApi(RESOURCES)
    expect(doc.openapi).toBe('3.0.3')
    expect(doc.paths['/v1/ping']).toBeTruthy()
    expect(doc.paths['/v1/projects']).toBeTruthy()
    expect(problem(401, 'Unauthorized').status).toBe(401)
    expect(RESOURCES.some((r) => r.name === 'projects')).toBe(true)
    expect(RESOURCES.find((r) => r.name === 'users')?.readOnly).toBe(true)
  })
})
