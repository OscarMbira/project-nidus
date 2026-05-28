import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getLifecycleConfig,
  submitForAuthorisation,
  processDecision,
  queryRecords,
} from '../recordLifecycleService'

const mockRpc = vi.fn()
const mockFrom = vi.fn()
const mockGetUser = vi.fn()

vi.mock('../supabase/supabaseClient', () => ({
  platformDb: {
    auth: { getUser: () => mockGetUser() },
    rpc: (...args) => mockRpc(...args),
    from: (...args) => mockFrom(...args),
  },
}))

vi.mock('../../config/recordLifecycleRegistry', () => ({
  getLifecycleTableConfig: (name) => {
    if (name === 'risks') {
      return {
        tableName: 'risks',
        category: 'A',
        liveTable: 'risks',
        historyTable: 'risks_history',
        archiveTable: 'risks_archive',
        allView: 'risks_all',
      }
    }
    return null
  },
  LIFECYCLE_STATUSES: ['live', 'unauthorised', 'history', 'archived'],
}))

describe('recordLifecycleService', () => {
  beforeEach(() => {
    mockRpc.mockReset()
    mockFrom.mockReset()
    mockGetUser.mockReset()
  })

  it('getLifecycleConfig calls RPC with account and table', async () => {
    mockRpc.mockResolvedValue({ data: { approvalEnabled: true }, error: null })
    const result = await getLifecycleConfig('acc-1', 'proj-1', 'risks')
    expect(mockRpc).toHaveBeenCalledWith('get_lifecycle_config', {
      p_account_id: 'acc-1',
      p_project_id: 'proj-1',
      p_table_name: 'risks',
    })
    expect(result.approvalEnabled).toBe(true)
  })

  it('submitForAuthorisation requires authenticated user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    await expect(submitForAuthorisation('risks', 'r1', 'root-1', 'notes')).rejects.toThrow('Not authenticated')
  })

  it('submitForAuthorisation calls submit_for_authorisation RPC', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    mockRpc.mockResolvedValue({ data: 'batch-1', error: null })
    const batch = await submitForAuthorisation('risks', 'r1', 'root-1', 'please approve')
    expect(batch).toBe('batch-1')
    expect(mockRpc).toHaveBeenCalledWith('submit_for_authorisation', expect.objectContaining({
      p_table_name: 'risks',
      p_record_id: 'r1',
      p_root_record_id: 'root-1',
      p_submitted_by: 'u1',
    }))
  })

  it('processDecision calls process_authoriser_decision RPC', async () => {
    mockRpc.mockResolvedValue({ data: { success: true, status: 'approved' }, error: null })
    const result = await processDecision('req-1', 'approve', 'ok')
    expect(result.success).toBe(true)
    expect(mockRpc).toHaveBeenCalledWith('process_authoriser_decision', {
      p_request_id: 'req-1',
      p_decision: 'approve',
      p_notes: 'ok',
    })
  })

  it('queryRecords defaults to live status on risks live table', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [{ id: '1' }], error: null, count: 1 }),
    }
    mockFrom.mockReturnValue(chain)
    const result = await queryRecords('risks', { statusFilter: ['live'], projectId: 'p1' })
    expect(mockFrom).toHaveBeenCalledWith('risks')
    expect(chain.in).toHaveBeenCalledWith('record_status', ['live'])
    expect(result.data).toHaveLength(1)
  })
})
