import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../pmTemplateInheritanceService.js', () => ({
  resolveEffectiveDocumentMaster: vi.fn(),
}))

vi.mock('../pmTemplateNodeService.js', () => ({
  createTierDocumentTemplateNode: vi.fn(),
  getOrCreateEntityAssignment: vi.fn(),
}))

import { resolveEffectiveDocumentMaster } from '../pmTemplateInheritanceService.js'
import {
  createTierDocumentTemplateNode,
  getOrCreateEntityAssignment,
} from '../pmTemplateNodeService.js'
import { forkIndustryTemplateForEntity } from '../industryTemplateTierService.js'

describe('forkIndustryTemplateForEntity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws when no industry plan master is resolved', async () => {
    resolveEffectiveDocumentMaster.mockResolvedValue(null)
    await expect(
      forkIndustryTemplateForEntity({}, {
        accountId: 'acc-1',
        entityType: 'portfolio',
        entityId: 'pf-1',
        tier: 'portfolio',
        duplicateTemplateFn: vi.fn(),
      }),
    ).rejects.toThrow('No industry plan master to fork')
  })

  it('duplicates master, creates tier node, links template and assignment', async () => {
    resolveEffectiveDocumentMaster.mockResolvedValue({
      id: 'node-master',
      domain_ref_id: 'tmpl-src',
      name: 'Software',
    })
    const duplicateTemplateFn = vi.fn().mockResolvedValue({
      id: 'tmpl-copy',
      industry_name: 'Software (Copy)',
      industry_code: 'software_development_copy',
      description: 'desc',
    })
    createTierDocumentTemplateNode.mockResolvedValue({ id: 'node-fork' })
    getOrCreateEntityAssignment.mockResolvedValue({ id: 'asg-1', node_id: 'node-fork' })

    const updateEq = vi.fn().mockResolvedValue({ error: null })
    const update = vi.fn(() => ({ eq: updateEq }))
    const db = { from: vi.fn(() => ({ update })) }

    const result = await forkIndustryTemplateForEntity(db, {
      accountId: 'acc-1',
      entityType: 'portfolio',
      entityId: 'pf-1',
      tier: 'portfolio',
      entityName: 'Growth',
      userId: 'user-1',
      duplicateTemplateFn,
      catalogDb: db,
    })

    expect(duplicateTemplateFn).toHaveBeenCalledWith('tmpl-src')
    expect(createTierDocumentTemplateNode).toHaveBeenCalledWith(db, expect.objectContaining({
      accountId: 'acc-1',
      tier: 'portfolio',
      domain: 'industry_plan',
      domainRefId: 'tmpl-copy',
      parentNodeId: 'node-master',
      scopeEntityId: 'pf-1',
    }))
    expect(db.from).toHaveBeenCalledWith('pmo_industry_templates')
    expect(updateEq).toHaveBeenCalledWith('id', 'tmpl-copy')
    expect(getOrCreateEntityAssignment).toHaveBeenCalledWith(db, expect.objectContaining({
      domain: 'industry_plan',
      nodeId: 'node-fork',
    }))
    expect(result.template.id).toBe('tmpl-copy')
    expect(result.node.id).toBe('node-fork')
  })
})
