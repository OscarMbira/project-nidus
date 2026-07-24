import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  buildProposedLifecycleChanges,
  tryGovernedLifecycleUpdate,
  LIFECYCLE_UPDATE_BLOCKED_COLUMNS,
} from '../lifecycleGovernedUpdate.js'

describe('lifecycleGovernedUpdate', () => {
  it('excludes lifecycle metadata columns from proposed changes', () => {
    const current = { risk_title: 'Old', record_status: 'live', id: 'abc' }
    const updates = { risk_title: 'New', record_status: 'unauthorised', id: 'xyz' }
    const proposed = buildProposedLifecycleChanges(current, updates)
    expect(proposed).toEqual({ risk_title: 'New' })
    expect(LIFECYCLE_UPDATE_BLOCKED_COLUMNS.has('record_status')).toBe(true)
  })

  it('returns deferred false when governance is inactive', async () => {
    const rpc = vi.fn()
    const from = vi.fn()
    const db = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'auth-1' } } }) },
      rpc,
      from,
    }

    rpc.mockImplementation((name) => {
      if (name === 'get_lifecycle_config') {
        return Promise.resolve({ data: { approvalEnabled: true }, error: null })
      }
      if (name === 'get_authoriser_count') {
        return Promise.resolve({ data: 0, error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })

    from.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: { account_id: 'acc-1' }, error: null }),
        }),
      }),
    })

    const result = await tryGovernedLifecycleUpdate({
      db,
      tableName: 'risks',
      recordId: 'risk-1',
      currentRow: { record_status: 'live', project_id: 'p1', risk_title: 'A' },
      updates: { risk_title: 'B' },
    })

    expect(result.deferred).toBe(false)
    expect(rpc).not.toHaveBeenCalledWith('submit_for_authorisation', expect.anything())
  })

  it('submits proposed changes when governance is active', async () => {
    const rpc = vi.fn()
    const db = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'auth-1' } } }) },
      rpc,
      from: vi.fn().mockReturnValue({
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: { account_id: 'acc-1' }, error: null }),
            single: () => Promise.resolve({
              data: { id: 'risk-1', record_status: 'unauthorised', risk_title: 'A' },
              error: null,
            }),
          }),
        }),
      }),
    }

    rpc.mockImplementation((name) => {
      if (name === 'get_lifecycle_config') {
        return Promise.resolve({ data: { approvalEnabled: true }, error: null })
      }
      if (name === 'get_authoriser_count') {
        return Promise.resolve({ data: 2, error: null })
      }
      if (name === 'submit_for_authorisation') {
        return Promise.resolve({ data: 'batch-1', error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })

    const result = await tryGovernedLifecycleUpdate({
      db,
      tableName: 'risks',
      recordId: 'risk-1',
      currentRow: { record_status: 'live', project_id: 'p1', risk_title: 'A' },
      updates: { risk_title: 'B' },
    })

    expect(result.deferred).toBe(true)
    expect(result.proposedChanges).toEqual({ risk_title: 'B' })
    expect(rpc).toHaveBeenCalledWith('submit_for_authorisation', expect.objectContaining({
      p_proposed_changes: { risk_title: 'B' },
    }))
  })
})
