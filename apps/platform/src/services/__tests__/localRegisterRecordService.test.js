/**
 * Unit tests for the Local Register Engine's generic record CRUD service (v931).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const tableResults = new Map()
function queueResult(table, result) {
  if (!tableResults.has(table)) tableResults.set(table, [])
  tableResults.get(table).push(result)
}

const insertCalls = []
const updateCalls = []

function makeChain(table) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    single: () => chain,
    maybeSingle: () => chain,
    insert: (payload) => {
      insertCalls.push({ table, payload })
      return chain
    },
    update: (payload) => {
      updateCalls.push({ table, payload })
      return chain
    },
    then: (resolve) => {
      const queue = tableResults.get(table) || []
      const result = queue.shift() || { data: null, error: null }
      return Promise.resolve(result).then(resolve)
    },
  }
  return chain
}

const mockFrom = vi.fn((table) => makeChain(table))
const mockSubmitForAuthorisation = vi.fn()
const mockGetApprovalChain = vi.fn()

vi.mock('../supabaseClient', () => ({
  supabase: { from: (...args) => mockFrom(...args) },
}))

vi.mock('../recordLifecycleService', () => ({
  submitForAuthorisation: (...args) => mockSubmitForAuthorisation(...args),
  getApprovalChain: (...args) => mockGetApprovalChain(...args),
}))

import {
  listRecords,
  getRecord,
  createRecord,
  updateRecord,
  deleteRecord,
  getRecordApprovalChain,
  submitRecordForAuthorisation,
} from '../localRegisterRecordService'

describe('localRegisterRecordService (v931)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    tableResults.clear()
    insertCalls.length = 0
    updateCalls.length = 0
  })

  it('listRecords returns empty when no registerId given', async () => {
    const result = await listRecords(null)
    expect(result).toEqual({ success: true, data: [], error: null })
  })

  it('listRecords returns records for a register', async () => {
    queueResult('local_register_records', { data: [{ id: 'r1', title: 'Permit A' }], error: null })
    const result = await listRecords('reg-1')
    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(1)
  })

  it('getRecord returns a single record', async () => {
    queueResult('local_register_records', { data: { id: 'r1', title: 'Permit A' }, error: null })
    const result = await getRecord('r1')
    expect(result.success).toBe(true)
    expect(result.data.title).toBe('Permit A')
  })

  it('createRecord inserts with a blank display_id for the Admin ID Generation trigger', async () => {
    queueResult('local_register_records', { data: { id: 'r-new' }, error: null })
    const result = await createRecord('reg-1', {
      title: 'Permit A',
      status: 'applied',
      fieldValues: { permit_number: 'P-2024-01' },
    })
    expect(result.success).toBe(true)
    expect(insertCalls[0].payload.display_id).toBe('')
    expect(insertCalls[0].payload.register_id).toBe('reg-1')
    expect(insertCalls[0].payload.field_values.permit_number).toBe('P-2024-01')
  })

  it('createRecord always inserts without an explicit record_status — every register starts live, submitRecordForAuthorisation is the real transition (v937 fix)', async () => {
    queueResult('local_register_records', { data: { id: 'r-new' }, error: null })
    await createRecord('reg-6', { title: 'Product Config A', status: 'draft' })
    expect(insertCalls[0].payload.record_status).toBeUndefined()
  })

  it('createRecord passes accountId/recordProjectId through to account_id/project_id (v937 — required by submit_for_authorisation)', async () => {
    queueResult('local_register_records', { data: { id: 'r-new' }, error: null })
    await createRecord('reg-1', { title: 'Permit A', status: 'applied', accountId: 'acct-1', recordProjectId: 'proj-1' })
    expect(insertCalls[0].payload.account_id).toBe('acct-1')
    expect(insertCalls[0].payload.project_id).toBe('proj-1')
  })

  it('getRecordApprovalChain passes local_register_records as the fixed table name', async () => {
    mockGetApprovalChain.mockResolvedValue([{ approval_level: 1, role_label: 'PMO Admin' }])
    const result = await getRecordApprovalChain('acct-1', 'proj-1')
    expect(mockGetApprovalChain).toHaveBeenCalledWith('acct-1', 'proj-1', 'local_register_records')
    expect(result).toEqual({ success: true, data: [{ approval_level: 1, role_label: 'PMO Admin' }], error: null })
  })

  it('submitRecordForAuthorisation delegates to recordLifecycleService with local_register_records as the table name', async () => {
    mockSubmitForAuthorisation.mockResolvedValue('batch-123')
    const result = await submitRecordForAuthorisation('r1', 'please review')
    expect(mockSubmitForAuthorisation).toHaveBeenCalledWith('local_register_records', 'r1', 'r1', 'please review')
    expect(result).toEqual({ success: true, submissionBatchId: 'batch-123', error: null })
  })

  it('submitRecordForAuthorisation never throws — returns a failure result instead', async () => {
    mockSubmitForAuthorisation.mockRejectedValue(new Error('no authorisers configured'))
    const result = await submitRecordForAuthorisation('r1')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/no authorisers configured/)
  })

  it('updateRecord only patches provided fields', async () => {
    queueResult('local_register_records', { data: null, error: null })
    const result = await updateRecord('r1', { status: 'approved' })
    expect(result.success).toBe(true)
    expect(updateCalls[0].payload.status).toBe('approved')
    expect(updateCalls[0].payload.title).toBeUndefined()
  })

  it('deleteRecord soft-deletes via is_deleted, not a real DELETE', async () => {
    queueResult('local_register_records', { data: null, error: null })
    const result = await deleteRecord('r1')
    expect(result.success).toBe(true)
    expect(updateCalls[0].payload.is_deleted).toBe(true)
  })

  it('surfaces errors without throwing', async () => {
    queueResult('local_register_records', { data: null, error: { message: 'boom' } })
    const result = await getRecord('r1')
    expect(result.success).toBe(false)
    expect(result.error).toBe('boom')
  })
})
