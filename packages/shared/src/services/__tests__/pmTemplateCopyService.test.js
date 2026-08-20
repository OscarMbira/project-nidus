import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  copyTemplateNodeForAccount,
  createBlankFormTemplateNode,
} from '../pmTemplateCopyService.js'

vi.mock('../pmTemplateNodeService.js', () => ({
  getTemplateNode: vi.fn(),
  createPmoFieldTemplateNode: vi.fn(),
  createTierDocumentTemplateNode: vi.fn(),
  listFieldLinksForNode: vi.fn(),
  upsertFieldLink: vi.fn(),
  getOrCreateEntityAssignment: vi.fn(),
}))

import {
  getTemplateNode,
  createPmoFieldTemplateNode,
  createTierDocumentTemplateNode,
  listFieldLinksForNode,
  upsertFieldLink,
  getOrCreateEntityAssignment,
} from '../pmTemplateNodeService.js'

/** Chainable stub for pm_template_nodes (v822 existing-copy guard + methodology update). */
function existingCopyQueryStub(existing = null) {
  const node = {
    select: () => node,
    eq: () => node,
    is: () => node,
    maybeSingle: async () => ({ data: existing, error: null }),
    update: () => ({ eq: async () => ({ error: null }) }),
  }
  return node
}

describe('pmTemplateCopyService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('copies a system-synced fields node and clones field links', async () => {
    const db = {
      from: vi.fn((table) => {
        if (table === 'pm_template_nodes') return existingCopyQueryStub()
        return {
          update: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })),
        }
      }),
    }
    getTemplateNode.mockResolvedValue({
      id: 'src-1',
      name: 'Global Fields',
      domain: 'fields',
      is_system_synced: true,
      methodology: 'standards_based',
      description: 'd',
      category: 'c',
    })
    createPmoFieldTemplateNode.mockResolvedValue({
      id: 'new-1',
      name: 'Global Fields (custom)',
      domain: 'fields',
    })
    listFieldLinksForNode.mockResolvedValue([
      { custom_field_definition_id: 'f1', display_order: 1, is_required: true },
    ])
    upsertFieldLink.mockResolvedValue({})

    const { node } = await copyTemplateNodeForAccount(db, {
      accountId: 'acct-1',
      sourceNodeId: 'src-1',
    })

    expect(node.id).toBe('new-1')
    expect(createPmoFieldTemplateNode).toHaveBeenCalled()
    expect(upsertFieldLink).toHaveBeenCalledWith(
      db,
      expect.objectContaining({
        node_id: 'new-1',
        custom_field_definition_id: 'f1',
        is_local: true,
      }),
    )
  })

  it('rejects non-system-synced sources belonging to a different account', async () => {
    getTemplateNode.mockResolvedValue({
      id: 'src-1',
      domain: 'fields',
      is_system_synced: false,
      account_id: 'someone-elses-account',
    })
    await expect(
      copyTemplateNodeForAccount({}, { accountId: 'a', sourceNodeId: 'src-1' }),
    ).rejects.toThrow(/system-synced/)
  })

  it('allows forking your own organisational template into a narrower scope (v805 Phase 4)', async () => {
    const db = {
      from: vi.fn((table) => {
        if (table === 'pm_template_nodes') return existingCopyQueryStub()
        return {
          update: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })),
        }
      }),
    }
    getTemplateNode.mockResolvedValue({
      id: 'org-copy-1',
      name: 'Org Fields Copy',
      domain: 'fields',
      is_system_synced: false,
      account_id: 'my-account-1',
    })
    createPmoFieldTemplateNode.mockResolvedValue({ id: 'project-copy-1', domain: 'fields' })
    listFieldLinksForNode.mockResolvedValue([])

    const { node } = await copyTemplateNodeForAccount(db, {
      accountId: 'my-account-1',
      sourceNodeId: 'org-copy-1',
    })
    expect(node.id).toBe('project-copy-1')
  })

  function mockFormTemplateDb({ sourceRow, currentVersionSchema = { title: 'Original' }, assignedCode = 'FRM-0001' }) {
    const insertedTemplateRows = []
    const insertedVersionRows = []
    const updatedTemplateRows = []
    const db = {
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'auth-user-1' } } })) },
      from: vi.fn((table) => {
        if (table === 'form_templates') {
          return {
            select: () => ({
              eq: (col, val) => ({
                maybeSingle: async () => {
                  // source lookup by id OR post-insert refetch for assigned Admin code
                  if (col === 'id' && val === 'ft-new-1') {
                    return {
                      data: {
                        ...insertedTemplateRows[0],
                        id: 'ft-new-1',
                        template_code: assignedCode,
                      },
                      error: null,
                    }
                  }
                  return { data: sourceRow, error: null }
                },
              }),
            }),
            insert: (row) => {
              insertedTemplateRows.push(row)
              return { select: () => ({ single: async () => ({ data: { ...row, id: 'ft-new-1' } }) }) }
            },
            update: (payload) => {
              updatedTemplateRows.push(payload)
              return { eq: vi.fn(async () => ({ error: null })) }
            },
          }
        }
        if (table === 'form_template_versions') {
          return {
            select: () => ({
              eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { schema: currentVersionSchema } }) }) }),
            }),
            insert: (row) => {
              insertedVersionRows.push(row)
              return Promise.resolve({ error: null })
            },
          }
        }
        if (table === 'pm_template_nodes') return existingCopyQueryStub()
        return { update: () => ({ eq: vi.fn(async () => ({ error: null })) }) }
      }),
    }
    return { db, insertedTemplateRows, insertedVersionRows, updatedTemplateRows }
  }

  it('form_template copy inserts blank template_code (Admin trigger assigns) and clones the current schema', async () => {
    const { db, insertedTemplateRows, insertedVersionRows, updatedTemplateRows } = mockFormTemplateDb({
      sourceRow: {
        id: 'ft-src-1',
        template_code: 'F007',
        name: 'Benefits Review Plan',
        process_group: 'planning',
        is_active: true,
        account_id: null,
        created_by: null,
      },
      currentVersionSchema: { title: 'Benefits Review Plan', sections: [] },
      assignedCode: 'FRM-0042',
    })
    getTemplateNode.mockResolvedValue({
      id: 'src-1',
      name: 'Benefits Review Plan',
      domain: 'form_template',
      is_system_synced: true,
      domain_ref_id: 'ft-src-1',
    })
    createTierDocumentTemplateNode.mockResolvedValue({ id: 'node-1', domain: 'form_template' })

    const { node } = await copyTemplateNodeForAccount(db, { accountId: 'my-account-1', sourceNodeId: 'src-1' })

    expect(node.id).toBe('node-1')
    expect(insertedTemplateRows[0]).toMatchObject({
      template_code: '',
      name: 'Benefits Review Plan (custom)',
      account_id: 'my-account-1',
      created_by: 'auth-user-1',
      updated_by: 'auth-user-1',
      pm_template_node_id: null,
    })
    expect(insertedVersionRows[0]).toMatchObject({
      template_id: 'ft-new-1',
      schema: { title: 'Benefits Review Plan', sections: [] },
      is_current: true,
    })
    expect(updatedTemplateRows[0]).toMatchObject({ pm_template_node_id: 'node-1' })
  })

  it('createBlankFormTemplateNode creates empty schema, null parent, and entity assignment', async () => {
    const { db, insertedTemplateRows, insertedVersionRows, updatedTemplateRows } = mockFormTemplateDb({
      sourceRow: null,
      assignedCode: 'FRM-0007',
    })
    createTierDocumentTemplateNode.mockResolvedValue({
      id: 'blank-node-1',
      domain: 'form_template',
      parent_node_id: null,
      tier: 'project',
    })
    getOrCreateEntityAssignment.mockResolvedValue({ id: 'assign-1' })

    const { node, formTemplate } = await createBlankFormTemplateNode(db, {
      accountId: 'acct-1',
      tier: 'project',
      scopeEntityType: 'project',
      scopeEntityId: 'proj-1',
      name: 'Weekly Status',
    })

    expect(insertedTemplateRows[0]).toMatchObject({
      template_code: '',
      name: 'Weekly Status',
      process_group: 'planning',
      account_id: 'acct-1',
      created_by: 'auth-user-1',
      updated_by: 'auth-user-1',
    })
    expect(insertedVersionRows[0]).toMatchObject({
      template_id: 'ft-new-1',
      version_number: 1,
      schema: { sections: [] },
      is_current: true,
    })
    expect(createTierDocumentTemplateNode).toHaveBeenCalledWith(
      db,
      expect.objectContaining({
        accountId: 'acct-1',
        tier: 'project',
        domain: 'form_template',
        scopeEntityType: 'project',
        scopeEntityId: 'proj-1',
        name: 'Weekly Status',
        parentNodeId: null,
        domainRefId: 'ft-new-1',
      }),
    )
    expect(getOrCreateEntityAssignment).toHaveBeenCalledWith(
      db,
      expect.objectContaining({
        accountId: 'acct-1',
        entityType: 'project',
        entityId: 'proj-1',
        domain: 'form_template',
        nodeId: 'blank-node-1',
      }),
    )
    expect(node.parent_node_id).toBeNull()
    expect(formTemplate.template_code).toBe('FRM-0007')
    expect(updatedTemplateRows[0]).toMatchObject({ pm_template_node_id: 'blank-node-1' })
  })

  it('createBlankFormTemplateNode rejects missing name and missing project scope', async () => {
    const db = {
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'auth-user-1' } } })) },
    }
    await expect(
      createBlankFormTemplateNode(db, { accountId: 'a', scopeEntityId: 'p', name: '  ' }),
    ).rejects.toThrow(/name is required/)
    await expect(
      createBlankFormTemplateNode(db, { accountId: 'a', tier: 'project', name: 'X' }),
    ).rejects.toThrow(/scopeEntityId/)
  })

  function mockProcessTemplateDb(sourceRow) {
    const insertedRows = []
    const db = {
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'auth-user-1' } } })) },
      from: vi.fn((table) => {
        if (table === 'pm_template_nodes') return existingCopyQueryStub()
        if (table === 'process_template_node_links') {
          return {
            select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
            insert: async () => ({ error: null }),
          }
        }
        if (table === 'team_performance_assessments') {
          return {
            select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: sourceRow }) }) }),
            insert: (row) => {
              insertedRows.push(row)
              return { select: () => ({ single: async () => ({ data: { ...row, id: 'pt-new-1' } }) }) }
            },
          }
        }
        // every other candidate table in the probe fallback: no match
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }
      }),
    }
    return { db, insertedRows }
  }

  it('process_template copy defaults to an account-level PMO customisation (no project needed)', async () => {
    const { db, insertedRows } = mockProcessTemplateDb({
      id: 'pt-src-1',
      title: 'Backlog Management Approach',
      is_master: true,
      project_id: null,
      account_id: 'staff-account-id',
    })
    getTemplateNode.mockResolvedValue({
      id: 'src-1',
      name: 'Backlog Management Approach',
      domain: 'process_template',
      is_system_synced: true,
      domain_ref_id: 'pt-src-1',
    })
    createTierDocumentTemplateNode.mockResolvedValue({ id: 'node-1', domain: 'process_template' })

    await copyTemplateNodeForAccount(db, { accountId: 'my-account-1', sourceNodeId: 'src-1' })

    expect(insertedRows[0]).toMatchObject({
      is_master: false,
      project_id: null,
      account_id: 'my-account-1',
      created_by: 'auth-user-1',
      updated_by: 'auth-user-1',
    })
  })

  it('process_template copy sets project_id when opened from inside a project', async () => {
    const { db, insertedRows } = mockProcessTemplateDb({
      id: 'pt-src-1',
      title: 'Backlog Management Approach',
      is_master: true,
      project_id: null,
      account_id: 'staff-account-id',
    })
    getTemplateNode.mockResolvedValue({
      id: 'src-1',
      name: 'Backlog Management Approach',
      domain: 'process_template',
      is_system_synced: true,
      domain_ref_id: 'pt-src-1',
    })
    createTierDocumentTemplateNode.mockResolvedValue({ id: 'node-1', domain: 'process_template' })

    await copyTemplateNodeForAccount(db, {
      accountId: 'my-account-1',
      sourceNodeId: 'src-1',
      scopeEntityType: 'project',
      scopeEntityId: 'proj-1',
    })

    expect(insertedRows[0]).toMatchObject({
      is_master: false,
      project_id: 'proj-1',
      account_id: 'my-account-1',
    })
    expect(insertedRows[0].practice_project_id).toBeUndefined()
  })

  it('process_template copy on sim schema sets practice_project_id (not project_id)', async () => {
    const { db, insertedRows } = mockProcessTemplateDb({
      id: 'pt-src-1',
      title: 'Backlog Management Approach',
      is_master: true,
      practice_project_id: null,
      account_id: 'staff-account-id',
    })
    getTemplateNode.mockResolvedValue({
      id: 'src-1',
      name: 'Backlog Management Approach',
      domain: 'process_template',
      is_system_synced: true,
      domain_ref_id: 'pt-src-1',
    })
    createTierDocumentTemplateNode.mockResolvedValue({ id: 'node-1', domain: 'process_template' })

    await copyTemplateNodeForAccount(db, {
      accountId: 'my-account-1',
      sourceNodeId: 'src-1',
      scopeEntityType: 'project',
      scopeEntityId: 'practice-proj-1',
    })

    expect(insertedRows[0]).toMatchObject({
      is_master: false,
      practice_project_id: 'practice-proj-1',
      account_id: 'my-account-1',
    })
    expect(insertedRows[0].project_id).toBeUndefined()
  })

  it('opa copy sets created_by/organisation_id to the copying user/account, not the source master', async () => {
    const insertedRows = []
    const db = {
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'auth-user-1' } } })) },
      from: vi.fn((table) => {
        if (table === 'organisational_process_assets') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: 'opa-src-1',
                    name: 'Global OPA',
                    created_by: 'staff-author-id',
                    organisation_id: 'staff-account-id',
                  },
                }),
              }),
            }),
            insert: (row) => {
              insertedRows.push(row)
              return { select: () => ({ single: async () => ({ data: { ...row, id: 'opa-new-1' } }) }) }
            },
            update: () => ({ eq: vi.fn(async () => ({ error: null })) }),
          }
        }
        if (table === 'pm_template_nodes') return existingCopyQueryStub()
        return { update: () => ({ eq: vi.fn(async () => ({ error: null })) }) }
      }),
    }
    getTemplateNode.mockResolvedValue({
      id: 'src-1',
      name: 'Global OPA',
      domain: 'opa',
      is_system_synced: true,
      domain_ref_id: 'opa-src-1',
    })
    createPmoFieldTemplateNode.mockResolvedValue({ id: 'new-1' })
    createTierDocumentTemplateNode.mockResolvedValue({ id: 'node-1', domain: 'opa' })

    await copyTemplateNodeForAccount(db, { accountId: 'my-account-1', sourceNodeId: 'src-1' })

    expect(insertedRows[0]).toMatchObject({
      created_by: 'auth-user-1',
      organisation_id: 'my-account-1',
    })
  })
})
