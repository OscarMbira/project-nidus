import { describe, it, expect, vi, beforeEach } from 'vitest'

function buildDbMock() {
  const resolveSelect = vi.fn(async () => ({ data: [], error: null }))
  const chain = {
    select: vi.fn(async (...args) => {
      if (args.length === 1 && typeof args[0] === 'string' && !args[1]) {
        return resolveSelect()
      }
      return chain
    }),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    single: vi.fn(async () => ({ data: null, error: null })),
    maybeSingle: vi.fn(async () => ({ data: null, error: null })),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    upsert: vi.fn(async () => ({ error: null })),
    delete: vi.fn(() => chain),
  }
  return { chain, resolveSelect }
}

let platformDbMock

vi.mock('../supabase/supabaseClient', () => ({
  get platformDb() {
    return platformDbMock
  },
  simDb: { from: vi.fn(), storage: { from: vi.fn(() => ({ upload: vi.fn() })) } },
}))

describe('formEngineService template builder helpers', () => {
  beforeEach(() => {
    vi.resetModules()
    const platform = buildDbMock()
    platformDbMock = { from: vi.fn(() => platform.chain), storage: { from: vi.fn(() => ({ upload: vi.fn() })) } }
    platformDbMock._helpers = platform
  })

  it('parseTemplateCodeNumber and formatTemplateCode work', async () => {
    const { parseTemplateCodeNumber, formatTemplateCode } = await import('../formEngineService')
    expect(parseTemplateCodeNumber('F068')).toBe(68)
    expect(parseTemplateCodeNumber('f001')).toBe(1)
    expect(parseTemplateCodeNumber('BAD')).toBeNull()
    expect(formatTemplateCode(69)).toBe('F069')
  })

  it('suggestNextTemplateCode returns next code', async () => {
    platformDbMock._helpers.resolveSelect.mockResolvedValueOnce({
      data: [{ template_code: 'F068' }, { template_code: 'F010' }],
      error: null,
    })
    const { suggestNextTemplateCode } = await import('../formEngineService')
    const result = await suggestNextTemplateCode('platform')
    expect(result.success).toBe(true)
    expect(result.data).toBe('F069')
  })

  it('upsertFormTemplate validates required fields', async () => {
    const { upsertFormTemplate } = await import('../formEngineService')
    const result = await upsertFormTemplate({ templateCode: '', name: '', processGroup: '' })
    expect(result.success).toBe(false)
    expect(result.message).toMatch(/required/i)
  })

  it('publishFormTemplateVersion validates template id', async () => {
    const { publishFormTemplateVersion } = await import('../formEngineService')
    const result = await publishFormTemplateVersion(null, { sections: [] })
    expect(result.success).toBe(false)
    expect(result.message).toMatch(/template id/i)
  })

  it('getFieldOverridesForOrg validates required ids', async () => {
    const { getFieldOverridesForOrg } = await import('../formEngineService')
    const result = await getFieldOverridesForOrg(null, null)
    expect(result.success).toBe(false)
    expect(result.message).toMatch(/required/i)
  })

  describe('resolveEntityPolicyChain', () => {
    // buildDbMock's shared `chain` makes `select()` itself async (returns a Promise), which
    // suits the module's other `.select('*').single()`-style calls but can't be chained
    // synchronously into `.eq().maybeSingle()` — so this block uses its own minimal `from` mock.
    function mockTableResults(resultsByTable) {
      platformDbMock.from = vi.fn((table) => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => resultsByTable[table] ?? { data: null, error: null },
          }),
        }),
      }))
    }

    it('validates required args', async () => {
      const { resolveEntityPolicyChain } = await import('../formEngineService')
      const result = await resolveEntityPolicyChain(null, null)
      expect(result.success).toBe(false)
      expect(result.message).toMatch(/required/i)
    })

    it('rejects an unsupported entity type', async () => {
      const { resolveEntityPolicyChain } = await import('../formEngineService')
      const result = await resolveEntityPolicyChain('programme_of_work', 'x-1')
      expect(result.success).toBe(false)
      expect(result.message).toMatch(/unsupported/i)
    })

    it('a project linked to both a portfolio and a programme resolves Portfolio before Programme, then itself', async () => {
      mockTableResults({
        portfolio_projects: { data: { portfolio_id: 'pf-1' }, error: null },
        programme_projects: { data: { programme_id: 'pg-1' }, error: null },
      })
      const { resolveEntityPolicyChain } = await import('../formEngineService')
      const result = await resolveEntityPolicyChain('project', 'proj-1')
      expect(result.success).toBe(true)
      expect(result.data).toEqual([
        { entityType: 'portfolio', entityId: 'pf-1' },
        { entityType: 'programme', entityId: 'pg-1' },
        { entityType: 'project', entityId: 'proj-1' },
      ])
    })

    it('a project linked to neither portfolio nor programme resolves to just itself', async () => {
      mockTableResults({})
      const { resolveEntityPolicyChain } = await import('../formEngineService')
      const result = await resolveEntityPolicyChain('project', 'proj-2')
      expect(result.success).toBe(true)
      expect(result.data).toEqual([{ entityType: 'project', entityId: 'proj-2' }])
    })

    it('an orphan programme (no portfolio_id) resolves to just itself', async () => {
      mockTableResults({ programmes: { data: { portfolio_id: null }, error: null } })
      const { resolveEntityPolicyChain } = await import('../formEngineService')
      const result = await resolveEntityPolicyChain('programme', 'pg-orphan')
      expect(result.success).toBe(true)
      expect(result.data).toEqual([{ entityType: 'programme', entityId: 'pg-orphan' }])
    })

    it('a programme linked to a portfolio resolves Portfolio then itself', async () => {
      mockTableResults({ programmes: { data: { portfolio_id: 'pf-2' }, error: null } })
      const { resolveEntityPolicyChain } = await import('../formEngineService')
      const result = await resolveEntityPolicyChain('programme', 'pg-1')
      expect(result.success).toBe(true)
      expect(result.data).toEqual([
        { entityType: 'portfolio', entityId: 'pf-2' },
        { entityType: 'programme', entityId: 'pg-1' },
      ])
    })

    it('a portfolio is a leaf — resolves to just itself', async () => {
      const { resolveEntityPolicyChain } = await import('../formEngineService')
      const result = await resolveEntityPolicyChain('portfolio', 'pf-3')
      expect(result.success).toBe(true)
      expect(result.data).toEqual([{ entityType: 'portfolio', entityId: 'pf-3' }])
    })
  })

  describe('completed example instances (Phase 7)', () => {
    it('listInstanceTemplatesForChain validates required ids', async () => {
      const { listInstanceTemplatesForChain } = await import('../formEngineService')
      const result = await listInstanceTemplatesForChain(null, null)
      expect(result.success).toBe(false)
      expect(result.message).toMatch(/required/i)
    })

    it('createInstanceTemplate validates required fields', async () => {
      const { createInstanceTemplate } = await import('../formEngineService')
      const result = await createInstanceTemplate({ organisationId: 'org-1', templateId: 't-1', name: '  ' })
      expect(result.success).toBe(false)
      expect(result.message).toMatch(/required/i)
    })

    it('deleteInstanceTemplate validates required id', async () => {
      const { deleteInstanceTemplate } = await import('../formEngineService')
      const result = await deleteInstanceTemplate(null)
      expect(result.success).toBe(false)
      expect(result.message).toMatch(/required/i)
    })

    it('listInstanceTemplatesForScope validates required ids', async () => {
      const { listInstanceTemplatesForScope } = await import('../formEngineService')
      const result = await listInstanceTemplatesForScope(null, null)
      expect(result.success).toBe(false)
      expect(result.message).toMatch(/required/i)
    })

    it('listInstanceTemplatesForScope filters to only the given scope, not the whole chain', async () => {
      platformDbMock.from = vi.fn((table) => {
        expect(table).toBe('form_instance_templates')
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({ order: async () => ({ data: [{ id: 'e-portfolio-own' }], error: null }) }),
                }),
              }),
            }),
          }),
        }
      })
      const { listInstanceTemplatesForScope } = await import('../formEngineService')
      const result = await listInstanceTemplatesForScope('org-1', 't-1', 'portfolio', 'pf-1')
      expect(result.success).toBe(true)
      expect(result.data).toEqual([{ id: 'e-portfolio-own' }])
    })

    it('listInstanceTemplatesForChain filters to org-wide plus the resolved ancestor scopes only', async () => {
      const rows = [
        { id: 'e-org', scope_entity_type: null, scope_entity_id: null },
        { id: 'e-portfolio', scope_entity_type: 'portfolio', scope_entity_id: 'pf-1' },
        { id: 'e-other-portfolio', scope_entity_type: 'portfolio', scope_entity_id: 'pf-OTHER' },
        { id: 'e-project', scope_entity_type: 'project', scope_entity_id: 'proj-1' },
      ]
      platformDbMock.from = vi.fn((table) => {
        if (table === 'form_instance_templates') {
          return { select: () => ({ eq: () => ({ eq: () => ({ order: async () => ({ data: rows, error: null }) }) }) }) }
        }
        // resolveEntityPolicyChain's own lookups for this project: no portfolio/programme link
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }
      })
      const { listInstanceTemplatesForChain } = await import('../formEngineService')
      const result = await listInstanceTemplatesForChain('org-1', 't-1', 'project', 'proj-1')
      expect(result.success).toBe(true)
      expect(result.data.map((r) => r.id).sort()).toEqual(['e-org', 'e-project'])
    })
  })

  it('setFieldEnabledForOrg validates required fields', async () => {
    const { setFieldEnabledForOrg } = await import('../formEngineService')
    const result = await setFieldEnabledForOrg({})
    expect(result.success).toBe(false)
    expect(result.message).toMatch(/required/i)
  })

  it('setFieldRequiredForOrg validates required fields', async () => {
    const { setFieldRequiredForOrg } = await import('../formEngineService')
    const result = await setFieldRequiredForOrg({})
    expect(result.success).toBe(false)
    expect(result.message).toMatch(/required/i)
  })

  describe('addFieldForOrg / deleteFieldAdditionForOrg (Phase 1b field-key collision guard)', () => {
    it('addFieldForOrg validates required fields', async () => {
      const { addFieldForOrg } = await import('../formEngineService')
      const result = await addFieldForOrg({})
      expect(result.success).toBe(false)
      expect(result.message).toMatch(/required/i)
    })

    it('rejects a field_key already used by another local addition on this template (any scope/tier)', async () => {
      platformDbMock.from = vi.fn((table) => {
        expect(table).toBe('form_template_field_additions')
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  limit: async () => ({ data: [{ id: 'existing-1' }], error: null }),
                }),
              }),
            }),
          }),
        }
      })
      const { addFieldForOrg } = await import('../formEngineService')
      const result = await addFieldForOrg({
        organisationId: 'org-1',
        templateId: 't-1',
        sectionKey: 'section-a',
        fieldDefinition: { key: 'custom_field', label: 'Custom', type: 'text' },
      })
      expect(result.success).toBe(false)
      expect(result.message).toMatch(/already used/i)
    })

    it('inserts when the field_key is not used anywhere else on this template', async () => {
      let insertedPayload = null
      platformDbMock.from = vi.fn((table) => {
        expect(table).toBe('form_template_field_additions')
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  limit: async () => ({ data: [], error: null }),
                }),
              }),
            }),
          }),
          insert: (payload) => {
            insertedPayload = payload
            return { select: () => ({ single: async () => ({ data: { id: 'new-1', ...payload }, error: null }) }) }
          },
        }
      })
      const { addFieldForOrg } = await import('../formEngineService')
      const result = await addFieldForOrg({
        organisationId: 'org-1',
        templateId: 't-1',
        sectionKey: 'section-a',
        fieldDefinition: { key: 'custom_field_2', label: 'Custom 2', type: 'text' },
      })
      expect(result.success).toBe(true)
      expect(insertedPayload.field_key).toBe('custom_field_2')
    })

    it('deleteFieldAdditionForOrg validates required fields', async () => {
      const { deleteFieldAdditionForOrg } = await import('../formEngineService')
      const result = await deleteFieldAdditionForOrg({})
      expect(result.success).toBe(false)
      expect(result.message).toMatch(/required/i)
    })

    it('deleteFieldAdditionForOrg refuses when the field already has submitted data', async () => {
      platformDbMock.from = vi.fn((table) => {
        if (table === 'form_instance_values') {
          return { select: () => ({ eq: async () => ({ data: [{ field_key: 'custom_field', field_value: 'yes' }], error: null }) }) }
        }
        if (table === 'form_instance_rows') {
          return { select: () => ({ eq: async () => ({ data: [], error: null }) }) }
        }
        throw new Error(`unexpected table ${table}`)
      })
      const { deleteFieldAdditionForOrg } = await import('../formEngineService')
      const result = await deleteFieldAdditionForOrg({
        organisationId: 'org-1',
        templateId: 't-1',
        sectionKey: 'section-a',
        fieldKey: 'custom_field',
      })
      expect(result.success).toBe(false)
      expect(result.message).toMatch(/cannot be deleted/i)
    })
  })

  it('getFieldDefaultsForOrg validates required ids', async () => {
    const { getFieldDefaultsForOrg } = await import('../formEngineService')
    const result = await getFieldDefaultsForOrg(null, null)
    expect(result.success).toBe(false)
    expect(result.message).toMatch(/required/i)
  })

  it('setFieldDefaultForOrg validates required fields', async () => {
    const { setFieldDefaultForOrg } = await import('../formEngineService')
    const result = await setFieldDefaultForOrg({})
    expect(result.success).toBe(false)
    expect(result.message).toMatch(/required/i)
  })

  it('clearFieldDefaultForOrg validates required fields', async () => {
    const { clearFieldDefaultForOrg } = await import('../formEngineService')
    const result = await clearFieldDefaultForOrg({})
    expect(result.success).toBe(false)
    expect(result.message).toMatch(/required/i)
  })
})
