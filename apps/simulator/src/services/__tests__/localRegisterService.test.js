/**
 * Unit tests for the Local Register Engine's register-definition service (Simulator, v938).
 * Member-created registers route through simDb (sim.local_registers); system-defined ones
 * through supabase (public.local_registers, shared, not duplicated per app).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const simResults = new Map()
const publicResults = new Map()
function queueSim(table, result) {
  if (!simResults.has(table)) simResults.set(table, [])
  simResults.get(table).push(result)
}
function queuePublic(table, result) {
  if (!publicResults.has(table)) publicResults.set(table, [])
  publicResults.get(table).push(result)
}

const simInsertCalls = []
const simUpdateCalls = []
const simDeleteCalls = []

function makeChain(resultsMap, table, { trackWrites } = {}) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    in: () => chain,
    order: () => chain,
    single: () => chain,
    maybeSingle: () => chain,
    insert: (payload) => {
      if (trackWrites) simInsertCalls.push({ table, payload })
      return chain
    },
    update: (payload) => {
      if (trackWrites) simUpdateCalls.push({ table, payload })
      return chain
    },
    delete: () => {
      if (trackWrites) simDeleteCalls.push({ table })
      return chain
    },
    then: (resolve) => {
      const queue = resultsMap.get(table) || []
      const result = queue.shift() || { data: null, error: null }
      return Promise.resolve(result).then(resolve)
    },
  }
  return chain
}

vi.mock('../supabaseClient', () => ({
  supabase: { from: (table) => makeChain(publicResults, table) },
  simDb: { from: (table) => makeChain(simResults, table, { trackWrites: true }) },
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

describe('localRegisterService (Simulator, v938)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    simResults.clear()
    publicResults.clear()
    simInsertCalls.length = 0
    simUpdateCalls.length = 0
    simDeleteCalls.length = 0
  })

  it('getRegisterDefinition returns null when no id given', async () => {
    const result = await getRegisterDefinition(null)
    expect(result).toEqual({ success: true, data: null, error: null })
  })

  it('getRegisterDefinition finds a member-created register in sim.local_registers first', async () => {
    queueSim('local_registers', { data: { id: 'reg-1', label: 'Client Checklist' }, error: null })
    queueSim('local_register_fields', { data: [{ id: 'f1', field_key: 'client_name' }], error: null })
    const result = await getRegisterDefinition('reg-1')
    expect(result.success).toBe(true)
    expect(result.data.label).toBe('Client Checklist')
    expect(result.data.is_system_defined).toBe(false)
    expect(result.data.fields).toHaveLength(1)
  })

  it('getRegisterDefinition falls back to public.local_registers for a system-defined register', async () => {
    queueSim('local_registers', { data: null, error: null })
    queueSim('local_register_fields', { data: [], error: null })
    queuePublic('local_registers', { data: { id: 'reg-permits', label: 'Permits', is_system_defined: true }, error: null })
    queuePublic('local_register_fields', { data: [{ id: 'f1', field_key: 'permit_type' }], error: null })

    const result = await getRegisterDefinition('reg-permits')
    expect(result.success).toBe(true)
    expect(result.data.label).toBe('Permits')
    expect(result.data.fields).toHaveLength(1)
  })

  it('listRegistersForScope returns empty when accountId/scopeLevel missing', async () => {
    const result = await listRegistersForScope({ scopeLevel: null, accountId: 'acct-1' })
    expect(result).toEqual({ success: true, data: [], error: null })
  })

  it('listRegistersForScope combines sim member-created registers with system-defined ones matching an enabled industry pack', async () => {
    queuePublic('account_industries', { data: [{ industry_category_id: 'construction-id' }], error: null })
    queuePublic('industry_categories', { data: { id: 'cross-industry-id' }, error: null })
    queuePublic('industry_packs', { data: [{ id: 'construction-pack-id' }, { id: 'cross-industry-pack-id' }], error: null })
    queueSim('local_registers', { data: [{ id: 'reg-local-1', label: 'Client Checklist' }], error: null })
    queuePublic('local_registers', { data: [{ id: 'reg-permits', label: 'Permits' }], error: null })

    const result = await listRegistersForScope({ scopeLevel: 'project', scopeEntityId: 'proj-1', accountId: 'acct-1' })
    expect(result.success).toBe(true)
    expect(result.data.map((r) => r.id).sort()).toEqual(['reg-local-1', 'reg-permits'])
  })

  it('listAllRegistersForAccount returns empty when no accountId given', async () => {
    const result = await listAllRegistersForAccount(null)
    expect(result).toEqual({ success: true, data: [], error: null })
  })

  it('listAllRegistersForAccount combines the account\'s sim registers with system-defined ones matching its enabled packs', async () => {
    queuePublic('account_industries', { data: [{ industry_category_id: 'construction-id' }], error: null })
    queuePublic('industry_categories', { data: { id: 'cross-industry-id' }, error: null })
    queuePublic('industry_packs', { data: [{ id: 'construction-pack-id' }], error: null })
    queueSim('local_registers', { data: [{ id: 'reg-custom', label: 'Custom' }], error: null })
    queuePublic('local_registers', { data: [{ id: 'reg-permits', label: 'Permits', is_system_defined: true }], error: null })

    const result = await listAllRegistersForAccount('acct-1')
    expect(result.success).toBe(true)
    expect(result.data.map((r) => r.id).sort()).toEqual(['reg-custom', 'reg-permits'])
  })

  it('createRegisterDefinition always inserts into sim.local_registers (member-created only)', async () => {
    queueSim('local_registers', { data: { id: 'reg-new' }, error: null })
    queueSim('local_register_fields', { data: null, error: null })

    const result = await createRegisterDefinition({
      registerKey: 'client_onboarding',
      label: 'Client Onboarding',
      scopeLevel: 'project',
      scopeProjectId: 'practice-proj-1',
      accountId: 'acct-1',
      statusWorkflow: [{ key: 'open', label: 'Open' }],
      fields: [{ fieldKey: 'client_name', fieldLabel: 'Client Name', fieldType: 'text' }],
    })

    expect(result.success).toBe(true)
    expect(result.data.is_system_defined).toBe(false)
    expect(simInsertCalls[0].table).toBe('local_registers')
    expect(simInsertCalls[0].payload.account_id).toBe('acct-1')
    expect(simInsertCalls[1].table).toBe('local_register_fields')
    expect(simInsertCalls[1].payload[0].register_id).toBe('reg-new')
  })

  it('updateRegisterDefinition refuses to edit a system-defined register', async () => {
    const result = await updateRegisterDefinition('reg-1', { label: 'New Label' }, { isSystemDefined: true })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/cannot be edited/i)
    expect(simUpdateCalls).toHaveLength(0)
  })

  it('updateRegisterDefinition updates a member-created register in sim.local_registers', async () => {
    queueSim('local_registers', { data: null, error: null })
    const result = await updateRegisterDefinition('reg-1', { label: 'New Label' }, { isSystemDefined: false })
    expect(result.success).toBe(true)
    expect(simUpdateCalls[0].table).toBe('local_registers')
    expect(simUpdateCalls[0].payload.label).toBe('New Label')
  })

  it('addField inserts a new field row into sim.local_register_fields', async () => {
    queueSim('local_register_fields', { data: { id: 'f-new' }, error: null })
    const result = await addField('reg-1', { fieldKey: 'notes', fieldLabel: 'Notes', fieldType: 'text' })
    expect(result.success).toBe(true)
    expect(simInsertCalls[0].table).toBe('local_register_fields')
    expect(simInsertCalls[0].payload.field_key).toBe('notes')
  })

  it('reorderFields issues one update per field and surfaces the first error', async () => {
    queueSim('local_register_fields', { data: null, error: null })
    queueSim('local_register_fields', { data: null, error: { message: 'boom' } })
    const result = await reorderFields([
      { id: 'f1', displayOrder: 0 },
      { id: 'f2', displayOrder: 1 },
    ])
    expect(result.success).toBe(false)
    expect(result.error).toBe('boom')
  })

  it('removeField deletes the field row from sim.local_register_fields', async () => {
    queueSim('local_register_fields', { data: null, error: null })
    const result = await removeField('f1')
    expect(result.success).toBe(true)
    expect(simDeleteCalls[0].table).toBe('local_register_fields')
  })
})
