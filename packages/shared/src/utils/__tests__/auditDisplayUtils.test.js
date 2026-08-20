import { describe, it, expect, vi } from 'vitest'
import {
  formatAuditDate,
  formatAuditTime,
  humanizeAuditToken,
  resolveScopeReferenceLabel,
  resolveAuditUserLabels,
} from '../auditDisplayUtils.js'

describe('formatAuditDate', () => {
  it('returns em dash for empty', () => {
    expect(formatAuditDate(null)).toBe('—')
    expect(formatAuditDate('')).toBe('—')
  })

  it('formats a valid ISO date as date-only', () => {
    const out = formatAuditDate('2026-08-12T18:10:26.000Z')
    expect(out).not.toBe('—')
    expect(out).not.toMatch(/AM|PM|\d{1,2}:\d{2}/i)
    expect(out.length).toBeGreaterThan(4)
  })
})

describe('formatAuditTime', () => {
  it('returns em dash for empty', () => {
    expect(formatAuditTime(null)).toBe('—')
  })

  it('formats a valid ISO value as time-only', () => {
    const out = formatAuditTime('2026-08-12T18:10:26.000Z')
    expect(out).not.toBe('—')
    expect(out).toMatch(/\d{1,2}:\d{2}/)
  })
})

describe('humanizeAuditToken', () => {
  it('title-cases snake_case tokens', () => {
    expect(humanizeAuditToken('process_template')).toBe('Process Template')
  })

  it('returns em dash for blank', () => {
    expect(humanizeAuditToken('')).toBe('—')
  })
})

describe('resolveScopeReferenceLabel', () => {
  it('returns null when scopeId is blank', async () => {
    expect(await resolveScopeReferenceLabel({}, { scopeType: 'project', scopeId: '' })).toBeNull()
  })

  it('returns project_code for project scope', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { project_code: 'SEED334-PRJ-07', project_name: 'Cedar' },
    })
    const db = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle })),
        })),
      })),
    }
    const label = await resolveScopeReferenceLabel(db, {
      scopeType: 'project',
      scopeId: '42a1e47a-e1bf-4ea3-a78c-ed278270458d',
    })
    expect(label).toBe('SEED334-PRJ-07')
  })

  it('falls back to raw id when lookup misses', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null })
    const db = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle })),
        })),
      })),
    }
    const id = '42a1e47a-e1bf-4ea3-a78c-ed278270458d'
    expect(await resolveScopeReferenceLabel(db, { scopeType: 'project', scopeId: id })).toBe(id)
  })
})

describe('resolveAuditUserLabels', () => {
  it('returns empty map when no ids', async () => {
    expect(await resolveAuditUserLabels({}, [])).toEqual({})
  })

  it('maps both users.id and auth_user_id to the same label', async () => {
    const db = {
      from: vi.fn(() => ({
        select: () => ({
          in: (col, ids) => {
            if (col === 'id') {
              return Promise.resolve({
                data: [{ id: 'user-row-1', auth_user_id: 'auth-1', full_name: 'Ada Admin', email: 'a@x.com' }],
              })
            }
            return Promise.resolve({
              data: [{ id: 'user-row-1', auth_user_id: 'auth-1', full_name: 'Ada Admin', email: 'a@x.com' }],
            })
          },
        }),
      })),
    }
    const map = await resolveAuditUserLabels(db, ['user-row-1', 'auth-1'])
    expect(map['user-row-1']).toBe('Ada Admin')
    expect(map['auth-1']).toBe('Ada Admin')
  })
})
