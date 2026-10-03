/**
 * governanceActionService unit tests (v966 Phase 12 — Unified Governance Action Register)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getGovernanceActions,
  buildActionViewPath,
  getActionTypeLabel,
  GOVERNANCE_ACTION_TYPES,
  GOVERNANCE_ACTION_STATUSES,
} from '../governanceActionService'
import { platformDb } from '@nidus/supabase'

function makeActionsQueryBuilder(result) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => Promise.resolve(result)),
    then: (resolve) => Promise.resolve(result).then(resolve),
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
    action_type: 'quality',
    action_id: 'qa-1',
    parent_id: 'review-1',
    project_id: 'project-1',
    record_label: 'Design Review — Fix defect X',
    status: 'pending',
    raw_status: 'open',
    priority: 'high',
    assigned_to: 'user-1',
    due_date: '2026-09-01',
    created_at: '2026-08-01T00:00:00Z',
    created_by: 'user-2',
  },
  {
    action_type: 'issue',
    action_id: 'ia-1',
    parent_id: 'issue-1',
    project_id: 'project-1',
    record_label: 'Vendor delay — Escalate to procurement',
    status: 'resolved',
    raw_status: 'completed',
    priority: null,
    assigned_to: 'user-2',
    due_date: '2026-08-15',
    created_at: '2026-07-01T00:00:00Z',
    created_by: 'user-1',
  },
  {
    action_type: 'lesson',
    action_id: 'la-1',
    parent_id: 'lesson-1',
    project_id: 'project-2',
    record_label: 'Retro finding — Improve handover checklist',
    status: 'pending',
    raw_status: 'pending',
    priority: null,
    assigned_to: null,
    due_date: null,
    created_at: '2026-07-15T00:00:00Z',
    created_by: null,
  },
]

const USERS = [
  { id: 'user-1', full_name: 'Alice Assignee', email: 'alice@example.com' },
  { id: 'user-2', full_name: 'Bob Creator', email: 'bob@example.com' },
]

describe('getGovernanceActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    platformDb.from.mockImplementation((table) => {
      if (table === 'users') return makeUsersQueryBuilder({ data: USERS, error: null })
      return makeActionsQueryBuilder({ data: ROWS, error: null })
    })
  })

  it('queries the unified_governance_actions_v view', async () => {
    await getGovernanceActions()
    expect(platformDb.from).toHaveBeenCalledWith('unified_governance_actions_v')
  })

  it('returns all rows annotated with action type label, resolved names, and a view path', async () => {
    const rows = await getGovernanceActions()
    expect(rows).toHaveLength(3)

    const qualityRow = rows.find((r) => r.action_type === 'quality')
    expect(qualityRow.action_type_label).toBe('Quality')
    expect(qualityRow.assigned_to_name).toBe('Alice Assignee')
    expect(qualityRow.created_by_name).toBe('Bob Creator')
    expect(qualityRow.view_path).toBe('/platform/my-quality-actions')

    const issueRow = rows.find((r) => r.action_type === 'issue')
    expect(issueRow.view_path).toBe('/platform/issues/my-actions')

    const lessonRow = rows.find((r) => r.action_type === 'lesson')
    expect(lessonRow.assigned_to_name).toBeNull()
    expect(lessonRow.view_path).toBe('/platform/lessons/my-actions')
  })

  it('applies actionType, status, and projectId filters to the query', async () => {
    let actionsBuilder
    platformDb.from.mockImplementation((table) => {
      if (table === 'users') return makeUsersQueryBuilder({ data: [], error: null })
      actionsBuilder = makeActionsQueryBuilder({ data: ROWS, error: null })
      return actionsBuilder
    })

    await getGovernanceActions({ actionType: 'issue', status: 'pending', projectId: 'project-1' })

    expect(actionsBuilder.eq).toHaveBeenCalledWith('action_type', 'issue')
    expect(actionsBuilder.eq).toHaveBeenCalledWith('status', 'pending')
    expect(actionsBuilder.eq).toHaveBeenCalledWith('project_id', 'project-1')
  })

  it('applies a limit when provided', async () => {
    let actionsBuilder
    platformDb.from.mockImplementation((table) => {
      if (table === 'users') return makeUsersQueryBuilder({ data: [], error: null })
      actionsBuilder = makeActionsQueryBuilder({ data: ROWS, error: null })
      return actionsBuilder
    })

    await getGovernanceActions({ limit: 5 })
    expect(actionsBuilder.limit).toHaveBeenCalledWith(5)
  })

  it('filters client-side by search text against record_label', async () => {
    const rows = await getGovernanceActions({ search: 'handover checklist' })
    expect(rows).toHaveLength(1)
    expect(rows[0].action_type).toBe('lesson')
  })

  it('throws when the underlying query errors', async () => {
    platformDb.from.mockImplementation(() =>
      makeActionsQueryBuilder({ data: null, error: new Error('boom') })
    )
    await expect(getGovernanceActions()).rejects.toThrow('boom')
  })

  it('degrades gracefully when name resolution fails', async () => {
    platformDb.from.mockImplementation((table) => {
      if (table === 'users') return makeUsersQueryBuilder({ data: null, error: new Error('nope') })
      return makeActionsQueryBuilder({ data: ROWS, error: null })
    })
    const rows = await getGovernanceActions()
    expect(rows).toHaveLength(3)
    expect(rows[0].assigned_to_name).toBeNull()
  })
})

describe('buildActionViewPath', () => {
  it('returns null for an unknown action type', () => {
    expect(buildActionViewPath({ action_type: 'unknown' })).toBeNull()
  })

  it('returns null for a null row', () => {
    expect(buildActionViewPath(null)).toBeNull()
  })

  it('maps each known action type to its own domain page', () => {
    expect(buildActionViewPath({ action_type: 'quality' })).toBe('/platform/my-quality-actions')
    expect(buildActionViewPath({ action_type: 'issue' })).toBe('/platform/issues/my-actions')
    expect(buildActionViewPath({ action_type: 'lesson' })).toBe('/platform/lessons/my-actions')
  })
})

describe('getActionTypeLabel', () => {
  it('returns a known label', () => {
    expect(getActionTypeLabel('issue')).toBe('Issue')
  })

  it('falls back to the raw value for an unknown type', () => {
    expect(getActionTypeLabel('mystery')).toBe('mystery')
  })
})

describe('constants', () => {
  it('exposes the three action types and three statuses', () => {
    expect(GOVERNANCE_ACTION_TYPES).toEqual(['quality', 'issue', 'lesson'])
    expect(GOVERNANCE_ACTION_STATUSES).toEqual(['pending', 'resolved', 'cancelled'])
  })
})
