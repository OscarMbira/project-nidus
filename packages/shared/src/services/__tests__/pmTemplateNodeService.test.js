import { describe, it, expect, vi } from 'vitest'
import { createTierDocumentTemplateNode, updateTemplateNode, archiveTemplateNode, getTemplateNode } from '../pmTemplateNodeService.js'

describe('getTemplateNode', () => {
  it('resolves by id when given a UUID', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: '11111111-1111-1111-1111-111111111111' }, error: null })
    const eq = vi.fn(() => ({ maybeSingle }))
    const select = vi.fn(() => ({ eq }))
    const db = { from: vi.fn(() => ({ select })) }

    await getTemplateNode(db, '11111111-1111-1111-1111-111111111111')
    expect(eq).toHaveBeenCalledWith('id', '11111111-1111-1111-1111-111111111111')
  })

  it('resolves by template_reference when given a non-UUID display ID (CLAUDE.md rule 16.1)', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'n1', template_reference: 'TPL-0001' }, error: null })
    const eq = vi.fn(() => ({ maybeSingle }))
    const select = vi.fn(() => ({ eq }))
    const db = { from: vi.fn(() => ({ select })) }

    await getTemplateNode(db, 'TPL-0001')
    expect(eq).toHaveBeenCalledWith('template_reference', 'TPL-0001')
  })

  it('returns null without querying when db or nodeId is missing', async () => {
    expect(await getTemplateNode(null, 'x')).toBeNull()
    expect(await getTemplateNode({}, null)).toBeNull()
  })
})

describe('createTierDocumentTemplateNode', () => {
  it('requires domain', async () => {
    await expect(
      createTierDocumentTemplateNode({}, {
        accountId: 'a',
        tier: 'portfolio',
        scopeEntityType: 'portfolio',
        scopeEntityId: 'p',
        name: 'x',
      }),
    ).rejects.toThrow('domain is required')
  })

  it('inserts industry_plan node with domain_ref_id', async () => {
    const single = vi.fn().mockResolvedValue({
      data: { id: 'n1', domain: 'industry_plan', domain_ref_id: 't1' },
      error: null,
    })
    const select = vi.fn(() => ({ single }))
    const insert = vi.fn(() => ({ select }))
    const db = { from: vi.fn(() => ({ insert })) }

    const row = await createTierDocumentTemplateNode(db, {
      accountId: 'acc',
      tier: 'programme',
      domain: 'industry_plan',
      scopeEntityType: 'programme',
      scopeEntityId: 'prog-1',
      name: 'Forked plan',
      domainRefId: 't1',
      parentNodeId: 'parent-n',
      userId: 'u1',
    })

    expect(db.from).toHaveBeenCalledWith('pm_template_nodes')
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      account_id: 'acc',
      tier: 'programme',
      domain: 'industry_plan',
      domain_ref_id: 't1',
      parent_node_id: 'parent-n',
      scope_entity_type: 'programme',
      scope_entity_id: 'prog-1',
      name: 'Forked plan',
      status: 'published',
      is_system_synced: false,
      created_by: 'u1',
    }))
    expect(row.id).toBe('n1')
  })
})

describe('updateTemplateNode', () => {
  it('only patches provided fields, scoped to non-system-synced rows', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'n1', name: 'New name' }, error: null })
    const select = vi.fn(() => ({ maybeSingle }))
    const eqSynced = vi.fn(() => ({ select }))
    const eqId = vi.fn(() => ({ eq: eqSynced }))
    const update = vi.fn(() => ({ eq: eqId }))
    const db = { from: vi.fn(() => ({ update })) }

    const row = await updateTemplateNode(db, 'n1', { name: 'New name' })

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ name: 'New name' }))
    expect(update.mock.calls[0][0]).not.toHaveProperty('description')
    expect(eqId).toHaveBeenCalledWith('id', 'n1')
    expect(eqSynced).toHaveBeenCalledWith('is_system_synced', false)
    expect(row.name).toBe('New name')
  })
})

describe('archiveTemplateNode', () => {
  it('sets is_current=false (no is_deleted column exists on pm_template_nodes)', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'n1', is_current: false }, error: null })
    const select = vi.fn(() => ({ maybeSingle }))
    const eqSynced = vi.fn(() => ({ select }))
    const eqId = vi.fn(() => ({ eq: eqSynced }))
    const update = vi.fn(() => ({ eq: eqId }))
    const db = { from: vi.fn(() => ({ update })) }

    const row = await archiveTemplateNode(db, 'n1')

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ is_current: false }))
    expect(row.is_current).toBe(false)
  })
})
