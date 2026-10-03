/**
 * Unit tests for the Local Register Engine's register-definition service (v931).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const tableResults = new Map()
function queueResult(table, result) {
  if (!tableResults.has(table)) tableResults.set(table, [])
  tableResults.get(table).push(result)
}

const insertCalls = []
const updateCalls = []
const deleteCalls = []

function makeChain(table) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    in: () => chain,
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
    delete: () => {
      deleteCalls.push({ table })
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
  supabase: { from: (...args) => mockFrom(...args) },
}))

import {
  getRegisterDefinition,
  listRegistersForScope,
  listAllRegistersForAccount,
  createRegisterDefinition,
  updateRegisterDefinition,
  addField,
  reorderFields,
  removeField,
} from '../localRegisterService'

describe('localRegisterService (v931)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    tableResults.clear()
    insertCalls.length = 0
    updateCalls.length = 0
    deleteCalls.length = 0
  })

  it('getRegisterDefinition returns null when no id given', async () => {
    const result = await getRegisterDefinition(null)
    expect(result).toEqual({ success: true, data: null, error: null })
  })

  it('getRegisterDefinition combines the register row with its ordered fields', async () => {
    queueResult('local_registers', { data: { id: 'reg-1', label: 'Permits' }, error: null })
    queueResult('local_register_fields', {
      data: [{ id: 'f1', field_key: 'permit_type' }],
      error: null,
    })
    const result = await getRegisterDefinition('reg-1')
    expect(result.success).toBe(true)
    expect(result.data.label).toBe('Permits')
    expect(result.data.fields).toHaveLength(1)
  })

  it('listRegistersForScope returns empty when accountId/scopeLevel missing', async () => {
    const result = await listRegistersForScope({ scopeLevel: null, accountId: 'acct-1' })
    expect(result).toEqual({ success: true, data: [], error: null })
  })

  it('listRegistersForScope returns matching registers', async () => {
    queueResult('local_registers', {
      data: [{ id: 'reg-1', label: 'Permits', scope_level: 'project' }],
      error: null,
    })
    const result = await listRegistersForScope({
      scopeLevel: 'project',
      scopeEntityId: 'proj-1',
      accountId: 'acct-1',
    })
    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(1)
  })

  it('listRegistersForScope combines member-created registers with system-defined ones matching an enabled industry pack (v932)', async () => {
    // getEnabledIndustryPackIds() internals, in call order:
    queueResult('account_industries', { data: [{ industry_category_id: 'construction-id' }], error: null })
    queueResult('industry_categories', { data: { id: 'cross-industry-id' }, error: null })
    queueResult('industry_packs', { data: [{ id: 'construction-pack-id' }, { id: 'cross-industry-pack-id' }], error: null })
    // The two parallel local_registers queries, in call order (local-scoped, then system-defined):
    queueResult('local_registers', { data: [{ id: 'reg-local-1', label: 'Client Checklist' }], error: null })
    queueResult('local_registers', { data: [{ id: 'reg-permits', label: 'Permits' }], error: null })

    const result = await listRegistersForScope({ scopeLevel: 'project', scopeEntityId: 'proj-1', accountId: 'acct-1' })
    expect(result.success).toBe(true)
    expect(result.data.map((r) => r.id).sort()).toEqual(['reg-local-1', 'reg-permits'])
  })

  it('listRegistersForScope dedupes if the same register id appears in both branches', async () => {
    queueResult('account_industries', { data: [], error: null })
    queueResult('industry_categories', { data: { id: 'cross-industry-id' }, error: null })
    queueResult('industry_packs', { data: [{ id: 'cross-industry-pack-id' }], error: null })
    queueResult('local_registers', { data: [{ id: 'reg-dup', label: 'Dup' }], error: null })
    queueResult('local_registers', { data: [{ id: 'reg-dup', label: 'Dup' }], error: null })

    const result = await listRegistersForScope({ scopeLevel: 'project', scopeEntityId: 'proj-1', accountId: 'acct-1' })
    expect(result.data).toHaveLength(1)
  })

  it('listAllRegistersForAccount returns empty when no accountId given', async () => {
    const result = await listAllRegistersForAccount(null)
    expect(result).toEqual({ success: true, data: [], error: null })
  })

  it('listAllRegistersForAccount combines the account\'s own registers with system-defined ones matching its enabled packs', async () => {
    queueResult('account_industries', { data: [{ industry_category_id: 'construction-id' }], error: null })
    queueResult('industry_categories', { data: { id: 'cross-industry-id' }, error: null })
    queueResult('industry_packs', { data: [{ id: 'construction-pack-id' }], error: null })
    queueResult('local_registers', { data: [{ id: 'reg-custom', label: 'Custom', is_system_defined: false }], error: null })
    queueResult('local_registers', { data: [{ id: 'reg-permits', label: 'Permits', is_system_defined: true }], error: null })

    const result = await listAllRegistersForAccount('acct-1')
    expect(result.success).toBe(true)
    expect(result.data.map((r) => r.id).sort()).toEqual(['reg-custom', 'reg-permits'])
  })

  it('createRegisterDefinition inserts the register then its fields', async () => {
    queueResult('local_registers', { data: { id: 'reg-new' }, error: null })
    queueResult('local_register_fields', { data: null, error: null })

    const result = await createRegisterDefinition({
      registerKey: 'client_onboarding',
      label: 'Client Onboarding',
      scopeLevel: 'project',
      scopeProjectId: 'proj-1',
      accountId: 'acct-1',
      statusWorkflow: [{ key: 'open', label: 'Open' }],
      fields: [{ fieldKey: 'client_name', fieldLabel: 'Client Name', fieldType: 'text' }],
    })

    expect(result.success).toBe(true)
    expect(insertCalls[0].table).toBe('local_registers')
    expect(insertCalls[0].payload.is_system_defined).toBe(false)
    expect(insertCalls[1].table).toBe('local_register_fields')
    expect(insertCalls[1].payload[0].register_id).toBe('reg-new')
  })

  it('updateRegisterDefinition refuses to edit a system-defined register', async () => {
    const result = await updateRegisterDefinition('reg-1', { label: 'New Label' }, { isSystemDefined: true })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/cannot be edited/i)
    expect(updateCalls).toHaveLength(0)
  })

  it('updateRegisterDefinition updates a member-created register', async () => {
    queueResult('local_registers', { data: null, error: null })
    const result = await updateRegisterDefinition('reg-1', { label: 'New Label' }, { isSystemDefined: false })
    expect(result.success).toBe(true)
    expect(updateCalls[0].payload.label).toBe('New Label')
  })

  it('addField inserts a new field row', async () => {
    queueResult('local_register_fields', { data: { id: 'f-new' }, error: null })
    const result = await addField('reg-1', { fieldKey: 'notes', fieldLabel: 'Notes', fieldType: 'text' })
    expect(result.success).toBe(true)
    expect(insertCalls[0].payload.field_key).toBe('notes')
  })

  it('reorderFields issues one update per field and surfaces the first error', async () => {
    queueResult('local_register_fields', { data: null, error: null })
    queueResult('local_register_fields', { data: null, error: { message: 'boom' } })
    const result = await reorderFields([
      { id: 'f1', displayOrder: 0 },
      { id: 'f2', displayOrder: 1 },
    ])
    expect(result.success).toBe(false)
    expect(result.error).toBe('boom')
  })

  it('removeField deletes the field row', async () => {
    queueResult('local_register_fields', { data: null, error: null })
    const result = await removeField('f1')
    expect(result.success).toBe(true)
    expect(deleteCalls[0].table).toBe('local_register_fields')
  })
})
