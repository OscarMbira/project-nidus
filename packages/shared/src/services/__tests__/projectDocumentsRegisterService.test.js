import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  captureOrRestoreProjectDocument,
  excludeCapturedProcessDocumentFamilies,
  retireProjectDocument,
} from '../projectDocumentsRegisterService.js'

vi.mock('../pmTemplateCopyService.js', () => ({
  copyTemplateNodeForAccount: vi.fn(async () => ({
    node: { id: 'new-node', name: 'Captured Doc', template_reference: 'DOC-0001' },
  })),
}))

vi.mock('../pmTemplateNodeService.js', () => ({
  restoreArchivedProjectProcessTemplate: vi.fn(async (db, archived) => ({
    ...archived,
    is_current: true,
  })),
  archiveProcessTemplateNodeAndContent: vi.fn(async (db, node) => ({
    ...node,
    is_current: false,
  })),
  listArchivedProjectProcessTemplateCopies: vi.fn(async () => []),
  matchArchivedCopyForCandidate: vi.fn(() => null),
  findArchivedProjectProcessTemplateCopy: vi.fn(),
}))

import { copyTemplateNodeForAccount } from '../pmTemplateCopyService.js'
import {
  restoreArchivedProjectProcessTemplate,
  archiveProcessTemplateNodeAndContent,
} from '../pmTemplateNodeService.js'

describe('captureOrRestoreProjectDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('restores when an archivedNode is provided', async () => {
    const archived = { id: 'arch-1', name: 'Old copy', is_current: false }
    const result = await captureOrRestoreProjectDocument({}, {
      accountId: 'acc',
      projectId: 'proj',
      sourceNode: { id: 'cand-1', name: 'Charter' },
      archivedNode: archived,
    })
    expect(result.mode).toBe('restore')
    expect(restoreArchivedProjectProcessTemplate).toHaveBeenCalledWith({}, archived)
    expect(copyTemplateNodeForAccount).not.toHaveBeenCalled()
  })

  it('captures via copyTemplateNodeForAccount when no archived node', async () => {
    const result = await captureOrRestoreProjectDocument({}, {
      accountId: 'acc',
      projectId: 'proj',
      sourceNode: { id: 'cand-1', name: 'Charter' },
    })
    expect(result.mode).toBe('capture')
    expect(copyTemplateNodeForAccount).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        accountId: 'acc',
        sourceNodeId: 'cand-1',
        tier: 'project',
        scopeEntityType: 'project',
        scopeEntityId: 'proj',
      }),
    )
  })
})

describe('retireProjectDocument', () => {
  it('delegates to archiveProcessTemplateNodeAndContent', async () => {
    const node = { id: 'n1', domain: 'process_template' }
    await retireProjectDocument({}, node)
    expect(archiveProcessTemplateNodeAndContent).toHaveBeenCalledWith({}, node)
  })
})

describe('excludeCapturedProcessDocumentFamilies', () => {
  const pmo = {
    id: 'pmo-1',
    parent_node_id: 'global-1',
    tier: 'pmo',
    name: 'Impediment Log (Agile)',
  }
  const otherPmo = {
    id: 'pmo-2',
    parent_node_id: 'global-2',
    tier: 'pmo',
    name: 'Project Charter',
  }
  const projectCopy = {
    id: 'proj-1',
    parent_node_id: 'pmo-1',
    tier: 'project',
    scope_entity_id: 'project-X',
    name: 'Impediment Log (Agile)',
  }

  it('removes the PMO source once the project has captured that family', () => {
    const result = excludeCapturedProcessDocumentFamilies(
      [pmo, otherPmo],
      [projectCopy],
      [pmo, otherPmo, projectCopy],
    )
    expect(result.map((r) => r.id)).toEqual(['pmo-2'])
  })

  it('matches families that only share an external (Global) parent id', () => {
    const projectFromGlobal = {
      ...projectCopy,
      parent_node_id: 'global-1',
    }
    const result = excludeCapturedProcessDocumentFamilies(
      [pmo, otherPmo],
      [projectFromGlobal],
      [pmo, otherPmo, projectFromGlobal],
    )
    expect(result.map((r) => r.id)).toEqual(['pmo-2'])
  })

  it('returns all candidates when nothing is captured', () => {
    expect(
      excludeCapturedProcessDocumentFamilies([pmo, otherPmo], [], [pmo, otherPmo]),
    ).toEqual([pmo, otherPmo])
  })
})
