/**
 * unifiedApprovalsService unit tests (Phase 5 of v963 — Unified Approvals register)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getUnifiedApprovals,
  buildApprovalViewPath,
  getEntityTypeLabel,
  APPROVAL_ENTITY_TYPES,
  APPROVAL_STATUSES,
} from '../unifiedApprovalsService'
import { platformDb } from '@nidus/supabase'

function makeApprovalsQueryBuilder(result) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => Promise.resolve(result)),
  }
  return builder
}

function makeUsersQueryBuilder(result) {
  const builder = {
    select: vi.fn(() => builder),
    in: vi.fn(() => Promise.resolve(result)),
  }
  return builder
}

vi.mock('@nidus/supabase', () => ({
  platformDb: { from: vi.fn() },
  simDb: { from: vi.fn() },
}))

const ROWS = [
  {
    entity_type: 'mandate',
    entity_id: 'ma-1',
    record_id: 'mandate-1',
    record_label: 'MAN-2026-001 — New Data Centre',
    project_id: null,
    status: 'pending',
    raw_status: 'pending',
    requested_by: 'user-1',
    requested_at: '2026-01-01T00:00:00Z',
    decided_by: null,
    decided_at: null,
    comments: null,
  },
  {
    entity_type: 'change_request',
    entity_id: 'cr-1',
    record_id: 'cr-1',
    record_label: 'CR-001 — Scope extension',
    project_id: 'project-1',
    status: 'approved',
    raw_status: 'approved',
    requested_by: 'user-2',
    requested_at: '2026-01-02T00:00:00Z',
    decided_by: 'user-3',
    decided_at: '2026-01-03T00:00:00Z',
    comments: 'Looks good',
  },
  {
    entity_type: 'benefits_review_plan',
    entity_id: 'bpa-1',
    record_id: 'brp-1',
    record_label: 'Benefits Review Plan v1',
    project_id: 'project-2',
    status: 'rejected',
    raw_status: 'rejected',
    requested_by: 'user-1',
    requested_at: '2026-01-04T00:00:00Z',
    decided_by: 'user-3',
    decided_at: '2026-01-05T00:00:00Z',
    comments: 'Needs rework',
  },
]

const USERS = [
  { id: 'user-1', full_name: 'Alice Requester', email: 'alice@example.com' },
  { id: 'user-2', full_name: 'Bob Requester', email: 'bob@example.com' },
  { id: 'user-3', full_name: 'Carol Decider', email: 'carol@example.com' },
]

describe('getUnifiedApprovals', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    platformDb.from.mockImplementation((table) => {
      if (table === 'users') return makeUsersQueryBuilder({ data: USERS, error: null })
      return makeApprovalsQueryBuilder({ data: ROWS, error: null })
    })
  })

  it('queries the unified_approvals_v view', async () => {
    await getUnifiedApprovals()
    expect(platformDb.from).toHaveBeenCalledWith('unified_approvals_v')
  })

  it('returns all rows annotated with entity type label, resolved names, and a view path', async () => {
    const rows = await getUnifiedApprovals()
    expect(rows).toHaveLength(3)

    const mandateRow = rows.find((r) => r.entity_type === 'mandate')
    expect(mandateRow.entity_type_label).toBe('Mandate')
    expect(mandateRow.requested_by_name).toBe('Alice Requester')
    expect(mandateRow.decided_by_name).toBeNull()
    expect(mandateRow.view_path).toBe('/pmo/mandates/mandate-1/view')

    const changeRow = rows.find((r) => r.entity_type === 'change_request')
    expect(changeRow.entity_type_label).toBe('Change Request')
    expect(changeRow.decided_by_name).toBe('Carol Decider')
    expect(changeRow.view_path).toBe('/pmo/registers/changes')

    const benefitsRow = rows.find((r) => r.entity_type === 'benefits_review_plan')
    expect(benefitsRow.view_path).toBe('/platform/projects/project-2/benefits/review-plan')
  })

  it('applies entityType and status filters to the query', async () => {
    let approvalsBuilder
    platformDb.from.mockImplementation((table) => {
      if (table === 'users') return makeUsersQueryBuilder({ data: [], error: null })
      approvalsBuilder = makeApprovalsQueryBuilder({ data: ROWS, error: null })
      return approvalsBuilder
    })

    await getUnifiedApprovals({ entityType: 'mandate', status: 'pending' })

    expect(approvalsBuilder.eq).toHaveBeenCalledWith('entity_type', 'mandate')
    expect(approvalsBuilder.eq).toHaveBeenCalledWith('status', 'pending')
  })

  it('filters client-side by search text against record_label', async () => {
    const rows = await getUnifiedApprovals({ search: 'scope extension' })
    expect(rows).toHaveLength(1)
    expect(rows[0].entity_type).toBe('change_request')
  })

  it('throws when the underlying query errors', async () => {
    platformDb.from.mockImplementation(() =>
      makeApprovalsQueryBuilder({ data: null, error: new Error('boom') })
    )
    await expect(getUnifiedApprovals()).rejects.toThrow('boom')
  })

  it('degrades gracefully when name resolution fails', async () => {
    platformDb.from.mockImplementation((table) => {
      if (table === 'users') return makeUsersQueryBuilder({ data: null, error: new Error('nope') })
      return makeApprovalsQueryBuilder({ data: ROWS, error: null })
    })
    const rows = await getUnifiedApprovals()
    expect(rows).toHaveLength(3)
    expect(rows[0].requested_by_name).toBeNull()
  })
})

describe('buildApprovalViewPath', () => {
  it('returns null for an unknown entity type', () => {
    expect(buildApprovalViewPath({ entity_type: 'unknown' })).toBeNull()
  })

  it('returns null for a null row', () => {
    expect(buildApprovalViewPath(null)).toBeNull()
  })

  it('falls back to the mandate approvals dashboard when record_id is missing', () => {
    expect(buildApprovalViewPath({ entity_type: 'mandate' })).toBe('/pmo/mandates/approvals')
  })

  it('falls back to the change register when a benefits review plan has no project_id', () => {
    expect(buildApprovalViewPath({ entity_type: 'benefits_review_plan', record_id: 'x' })).toBe(
      '/pmo/registers/changes'
    )
  })
})

describe('getEntityTypeLabel', () => {
  it('returns a known label', () => {
    expect(getEntityTypeLabel('change_request')).toBe('Change Request')
  })

  it('falls back to the raw value for an unknown type', () => {
    expect(getEntityTypeLabel('mystery')).toBe('mystery')
  })
})

describe('constants', () => {
  it('exposes the three entity types and three statuses', () => {
    expect(APPROVAL_ENTITY_TYPES).toEqual(['mandate', 'change_request', 'benefits_review_plan'])
    expect(APPROVAL_STATUSES).toEqual(['pending', 'approved', 'rejected'])
  })
})
