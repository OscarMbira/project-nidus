/**
 * Unit tests for the Local Register Engine's generic record CRUD service (Simulator, v938).
 * Every record — system-defined or member-created register — lives in
 * sim.local_register_records; no record-lifecycle wiring here (see service header comment).
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

vi.mock('../supabaseClient', () => ({
  simDb: { from: (...args) => mockFrom(...args) },
}))

import {
  listRecords,
  getRecord,
  createRecord,
  updateRecord,
  deleteRecord,
} from '../localRegisterRecordService'

describe('localRegisterRecordService (Simulator, v938)', () => {
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
      isSystemRegister: true,
    })
    expect(result.success).toBe(true)
    expect(insertCalls[0].payload.display_id).toBe('')
    expect(insertCalls[0].payload.register_id).toBe('reg-1')
    expect(insertCalls[0].payload.is_system_register).toBe(true)
    expect(insertCalls[0].payload.field_values.permit_number).toBe('P-2024-01')
  })

  it('createRecord defaults is_system_register to false for a member-created register', async () => {
    queueResult('local_register_records', { data: { id: 'r-new' }, error: null })
    await createRecord('reg-local-1', { title: 'Client Checklist A', status: 'open' })
    expect(insertCalls[0].payload.is_system_register).toBe(false)
  })

  it('createRecord passes practice-hierarchy scope ids through', async () => {
    queueResult('local_register_records', { data: { id: 'r-new' }, error: null })
    await createRecord('reg-1', {
      title: 'Permit A',
      status: 'applied',
      recordProjectId: 'practice-proj-1',
      isSystemRegister: true,
    })
    expect(insertCalls[0].payload.record_project_id).toBe('practice-proj-1')
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
