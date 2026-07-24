import { describe, expect, it, vi, beforeEach } from 'vitest'
import { copyTemplateNodeForAccount } from '../pmTemplateCopyService.js'

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
} from '../pmTemplateNodeService.js'

describe('pmTemplateCopyService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('copies a system-synced fields node and clones field links', async () => {
    const db = {
      from: vi.fn(() => ({
        update: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })),
      })),
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
      from: vi.fn(() => ({
        update: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })),
      })),
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

  function mockFormTemplateDb({ sourceRow, existingCodes = [], currentVersionSchema = { title: 'Original' } }) {
    const insertedTemplateRows = []
    const insertedVersionRows = []
    const updatedTemplateRows = []
    const db = {
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'auth-user-1' } } })) },
      from: vi.fn((table) => {
        if (table === 'form_templates') {
          return {
            select: (cols) => {
              // suggestNextTemplateCode-style lookup: awaited directly, no .eq()
              if (cols === 'template_code') return Promise.resolve({ data: existingCodes, error: null })
              return { eq: () => ({ maybeSingle: async () => ({ data: sourceRow, error: null }) }) }
            },
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
        return { update: () => ({ eq: vi.fn(async () => ({ error: null })) }) }
      }),
    }
    return { db, insertedTemplateRows, insertedVersionRows, updatedTemplateRows }
  }

  it('form_template copy creates an account-owned row with a fresh template_code and clones the current schema', async () => {
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
      existingCodes: [{ template_code: 'F007' }, { template_code: 'F012' }],
      currentVersionSchema: { title: 'Benefits Review Plan', sections: [] },
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
      template_code: 'F013',
      name: 'Benefits Review Plan (custom)',
      account_id: 'my-account-1',
      created_by: 'auth-user-1',
      pm_template_node_id: null,
    })
    expect(insertedVersionRows[0]).toMatchObject({
      template_id: 'ft-new-1',
      schema: { title: 'Benefits Review Plan', sections: [] },
      is_current: true,
    })
    expect(updatedTemplateRows[0]).toMatchObject({ pm_template_node_id: 'node-1' })
  })

  function mockProcessTemplateDb(sourceRow) {
    const insertedRows = []
    const db = {
      from: vi.fn((table) => {
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
