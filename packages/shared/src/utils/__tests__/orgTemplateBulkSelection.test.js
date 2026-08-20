import { describe, it, expect } from 'vitest'
import {
  isAlreadyProjectOwnTemplate,
  canCopyDownOrgTemplate,
  canRetireOrgTemplate,
  toggleIdInSelection,
  toggleSelectAllFiltered,
  pruneSelectionToFiltered,
  partitionSelectedTemplateRows,
  formatBulkActionSummary,
} from '../orgTemplateBulkSelection.js'

const projectId = 'proj-1'
const orgRow = { id: 'a', tier: 'pmo', scope_entity_id: null }
const ownRow = { id: 'b', tier: 'project', scope_entity_id: projectId }
const otherProjectRow = { id: 'c', tier: 'project', scope_entity_id: 'other' }

describe('eligibility', () => {
  it('detects project-own rows', () => {
    expect(isAlreadyProjectOwnTemplate(ownRow, projectId)).toBe(true)
    expect(isAlreadyProjectOwnTemplate(orgRow, projectId)).toBe(false)
    expect(isAlreadyProjectOwnTemplate(otherProjectRow, projectId)).toBe(false)
  })

  it('copy-down only when project-scoped and not already own', () => {
    const ctx = { isProjectScoped: true, entityId: projectId }
    expect(canCopyDownOrgTemplate(orgRow, ctx)).toBe(true)
    expect(canCopyDownOrgTemplate(ownRow, ctx)).toBe(false)
    expect(canCopyDownOrgTemplate(orgRow, { isProjectScoped: false, entityId: projectId })).toBe(false)
  })

  it('retire on flat list for all; project-scoped only for own', () => {
    expect(canRetireOrgTemplate(orgRow, { isProjectScoped: false, entityId: null })).toBe(true)
    expect(canRetireOrgTemplate(ownRow, { isProjectScoped: true, entityId: projectId })).toBe(true)
    expect(canRetireOrgTemplate(orgRow, { isProjectScoped: true, entityId: projectId })).toBe(false)
  })
})

describe('selection set helpers', () => {
  it('toggles an id in and out', () => {
    const once = toggleIdInSelection(new Set(), 'a')
    expect([...once]).toEqual(['a'])
    expect([...toggleIdInSelection(once, 'a')]).toEqual([])
  })

  it('select all filtered / deselect when all selected', () => {
    const ids = ['a', 'b', 'c']
    const all = toggleSelectAllFiltered(new Set(), ids)
    expect([...all].sort()).toEqual(ids)
    expect([...toggleSelectAllFiltered(all, ids)]).toEqual([])
  })

  it('prunes selection to filtered ids', () => {
    const selected = new Set(['a', 'b', 'gone'])
    expect([...pruneSelectionToFiltered(selected, ['a', 'c'])].sort()).toEqual(['a'])
  })
})

describe('partition + summary', () => {
  it('splits selected rows by eligibility', () => {
    const rows = [orgRow, ownRow, otherProjectRow]
    const selected = new Set(['a', 'b', 'c'])
    const part = partitionSelectedTemplateRows(rows, selected, {
      isProjectScoped: true,
      entityId: projectId,
    })
    expect(part.copyEligible.map((r) => r.id)).toEqual(['a', 'c'])
    expect(part.retireEligible.map((r) => r.id)).toEqual(['b'])
  })

  it('formats bulk toast summary', () => {
    expect(formatBulkActionSummary('Copied', { ok: 3 })).toBe('Copied 3')
    expect(formatBulkActionSummary('Retired', { ok: 2, skipped: 1, failed: 1 })).toBe(
      'Retired 2; skipped 1; failed 1',
    )
  })
})
