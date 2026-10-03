/**
 * governanceActionService unit tests (Simulator, v966 Phase 12). Mirrors
 * apps/platform/src/services/__tests__/governanceActionService.test.js against
 * sim.unified_governance_actions_v.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getGovernanceActions,
  buildActionViewPath,
  getActionTypeLabel,
  GOVERNANCE_ACTION_TYPES,
  GOVERNANCE_ACTION_STATUSES,
} from '../governanceActionService'
import { simDb } from '@nidus/supabase'

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
    action_type: 'issue',
    action_id: 'ia-1',
    parent_id: 'issue-1',
    project_id: 'project-1',
    record_label: 'Vendor delay — Escalate to procurement',
    status: 'pending',
    raw_status: 'in_progress',
    priority: null,
    assigned_to: 'user-1',
    due_date: '2026-09-01',
    created_at: '2026-08-01T00:00:00Z',
    created_by: 'user-2',
  },
  {
    action_type: 'lesson',
    action_id: 'la-1',
    parent_id: 'lesson-1',
    project_id: 'project-2',
    record_label: 'Retro finding — Improve handover checklist',
    status: 'resolved',
    raw_status: 'action_taken',
    priority: 'high',
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

describe('getGovernanceActions (simulator)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    simDb.from.mockImplementation((table) => {
      if (table === 'users') return makeUsersQueryBuilder({ data: USERS, error: null })
      return makeActionsQueryBuilder({ data: ROWS, error: null })
    })
  })

  it('queries the unified_governance_actions_v view', async () => {
    await getGovernanceActions()
    expect(simDb.from).toHaveBeenCalledWith('unified_governance_actions_v')
  })

  it('returns all rows annotated with action type label, resolved names, and a view path', async () => {
    const rows = await getGovernanceActions()
    expect(rows).toHaveLength(2)

    const issueRow = rows.find((r) => r.action_type === 'issue')
    expect(issueRow.action_type_label).toBe('Issue')
    expect(issueRow.assigned_to_name).toBe('Alice Assignee')
    expect(issueRow.view_path).toBe('/simulator/practice-issue-register/issue-1')

    const lessonRow = rows.find((r) => r.action_type === 'lesson')
    expect(lessonRow.assigned_to_name).toBeNull()
    expect(lessonRow.view_path).toBe('/simulator/practice-lessons-log/lesson-1')
  })

  it('applies actionType, status, and projectId filters to the query', async () => {
    let actionsBuilder
    simDb.from.mockImplementation((table) => {
      if (table === 'users') return makeUsersQueryBuilder({ data: [], error: null })
      actionsBuilder = makeActionsQueryBuilder({ data: ROWS, error: null })
      return actionsBuilder
    })

    await getGovernanceActions({ actionType: 'issue', status: 'pending', projectId: 'project-1' })

    expect(actionsBuilder.eq).toHaveBeenCalledWith('action_type', 'issue')
    expect(actionsBuilder.eq).toHaveBeenCalledWith('status', 'pending')
    expect(actionsBuilder.eq).toHaveBeenCalledWith('project_id', 'project-1')
  })

  it('throws when the underlying query errors', async () => {
    simDb.from.mockImplementation(() =>
      makeActionsQueryBuilder({ data: null, error: new Error('boom') })
    )
    await expect(getGovernanceActions()).rejects.toThrow('boom')
  })
})

describe('buildActionViewPath (simulator)', () => {
  it('returns null for an unknown action type', () => {
    expect(buildActionViewPath({ action_type: 'unknown' })).toBeNull()
  })

  it('falls back to the register list when parent_id is missing', () => {
    expect(buildActionViewPath({ action_type: 'issue' })).toBe('/simulator/practice-issue-register')
    expect(buildActionViewPath({ action_type: 'lesson' })).toBe('/simulator/practice-lessons-log')
  })
})

describe('constants (simulator)', () => {
  it('exposes two action types (no quality equivalent in sim schema)', () => {
    expect(GOVERNANCE_ACTION_TYPES).toEqual(['issue', 'lesson'])
    expect(GOVERNANCE_ACTION_STATUSES).toEqual(['pending', 'resolved', 'cancelled'])
  })
})
