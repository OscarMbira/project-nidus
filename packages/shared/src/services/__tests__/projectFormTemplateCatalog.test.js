import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  listProjectCopiedFormTemplates,
  listNearestFormTemplatesForProject,
} from '../projectFormTemplateCatalog.js'

vi.mock('../pmTemplateLibraryService.js', () => ({
  listTemplateLibraryNodes: vi.fn(),
}))

vi.mock('../pmTemplateInheritanceService.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    resolveProjectTierAncestry: vi.fn(async () => ({ programmeId: 'prog-1', portfolioId: 'port-1' })),
  }
})

import { listTemplateLibraryNodes } from '../pmTemplateLibraryService.js'

describe('listProjectCopiedFormTemplates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns only form_templates linked to this project\'s Project Templates copies', async () => {
    listTemplateLibraryNodes.mockResolvedValue([
      {
        id: 'n1',
        tier: 'project',
        scope_entity_id: 'proj-1',
        domain: 'form_template',
        domain_ref_id: 'ft-qr',
        name: 'Quality Register (Structured) (custom)',
      },
      {
        id: 'n2',
        tier: 'pmo',
        scope_entity_id: null,
        domain: 'form_template',
        domain_ref_id: 'ft-sched',
        name: 'Project Schedule',
      },
      {
        id: 'n3',
        tier: 'project',
        scope_entity_id: 'other-proj',
        domain: 'form_template',
        domain_ref_id: 'ft-other',
        name: 'Other project copy',
      },
    ])

    const db = {
      from: () => ({
        select: () => ({
          in: () => ({
            order: async () => ({
              data: [
                { id: 'ft-qr', name: 'Quality Register', template_code: 'F101' },
              ],
              error: null,
            }),
          }),
        }),
      }),
    }

    const list = await listProjectCopiedFormTemplates(db, {
      accountId: 'acct-1',
      projectId: 'proj-1',
    })

    expect(listTemplateLibraryNodes).toHaveBeenCalledWith(db, 'acct-1', {
      domains: ['form_template'],
      isSystemSynced: false,
    })
    expect(list).toEqual([
      {
        id: 'ft-qr',
        template_code: 'F101',
        name: 'Quality Register (Structured) (custom)',
      },
    ])
  })

  it('returns [] when the project has no form_template copies', async () => {
    listTemplateLibraryNodes.mockResolvedValue([
      { id: 'n1', tier: 'pmo', domain: 'form_template', domain_ref_id: 'ft-1', scope_entity_id: null },
    ])
    const db = { from: vi.fn() }
    const list = await listProjectCopiedFormTemplates(db, {
      accountId: 'acct-1',
      projectId: 'proj-1',
    })
    expect(list).toEqual([])
    expect(db.from).not.toHaveBeenCalled()
  })

  it('listNearestFormTemplatesForProject dedupes: project local wins over portfolio; keeps unrelated globals', async () => {
    listTemplateLibraryNodes.mockResolvedValue([
      {
        id: 'n-port',
        tier: 'portfolio',
        scope_entity_id: 'port-1',
        domain: 'form_template',
        domain_ref_id: 'ft-port',
        parent_node_id: 'global-node-1',
        name: 'Status (portfolio)',
      },
      {
        id: 'n-proj',
        tier: 'project',
        scope_entity_id: 'proj-1',
        domain: 'form_template',
        domain_ref_id: 'ft-proj',
        parent_node_id: 'n-port',
        name: 'Status (project)',
      },
      {
        id: 'n-blank',
        tier: 'project',
        scope_entity_id: 'proj-1',
        domain: 'form_template',
        domain_ref_id: 'ft-blank',
        parent_node_id: null,
        name: 'Weekly Local',
      },
    ])

    const db = {
      from: vi.fn((table) => {
        if (table === 'pm_template_nodes') {
          return {
            select: () => ({
              in: async () => ({
                data: [{ id: 'global-node-1', domain_ref_id: 'ft-global-status' }],
                error: null,
              }),
            }),
          }
        }
        if (table === 'form_templates') {
          return {
            select: () => ({
              is: () => ({
                eq: () => ({
                  order: async () => ({
                    data: [
                      { id: 'ft-global-status', name: 'Status Master', template_code: 'F001', account_id: null, is_active: true },
                      { id: 'ft-other-global', name: 'Other Master', template_code: 'F002', account_id: null, is_active: true },
                    ],
                    error: null,
                  }),
                }),
              }),
              in: async (_col, ids) => ({
                data: [
                  { id: 'ft-proj', name: 'Status', template_code: 'FRM-0001', account_id: 'acct-1' },
                  { id: 'ft-blank', name: 'Weekly Local', template_code: 'FRM-0002', account_id: 'acct-1' },
                ].filter((r) => ids.includes(r.id)),
                error: null,
              }),
            }),
          }
        }
        return {}
      }),
    }

    const list = await listNearestFormTemplatesForProject(db, {
      accountId: 'acct-1',
      projectId: 'proj-1',
      programmeId: 'prog-1',
      portfolioId: 'port-1',
    })

    const codes = list.map((t) => t.template_code).sort()
    expect(codes).toEqual(['F002', 'FRM-0001', 'FRM-0002'])
    expect(list.find((t) => t.id === 'ft-proj')?.name).toBe('Status (project)')
    expect(list.some((t) => t.id === 'ft-global-status')).toBe(false)
    expect(list.some((t) => t.id === 'ft-port')).toBe(false)
  })
})
