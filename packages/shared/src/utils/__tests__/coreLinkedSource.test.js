import { describe, it, expect } from 'vitest'
import {
  buildCoreRequirementBlocks,
  coreLinkedSourceConfig,
  isCoreLinkedSource,
  requirementsTable,
} from '../coreLinkedSource'
import { linkedBlocksForField, linkedBlockText } from '../registerDocumentModel'
import { buildRegisterRecordExport } from '../registerRecordExport'

const field = (option) => ({ field_key: 'f', field_type: 'linked_records', dropdown_options: [option] })

const rows = [
  { id: '2', requirement_code: 'REQ-002', name: 'Show balances', category: 'functional', priority: 'must', status: 'approved', acceptance_criteria: 'Balance matches ledger\nShown in under 1 second' },
  { id: '1', requirement_code: 'REQ-001', name: 'Sign in', category: 'functional', priority: 'should', status: 'draft' },
  { id: '3', requirement_code: 'NFR-001', name: '600 searches a minute', category: 'non_functional', nfr_area_key: 'performance', priority: 'must', status: 'draft', owner_name: 'Ravi Pillai', verification_method: 'test' },
  { id: '4', requirement_code: 'NFR-002', name: '4.8 million customers', category: 'non_functional', nfr_area_key: 'volumes', priority: 'must', status: 'draft' },
  { id: '5', requirement_code: 'NFR-003', name: 'No area yet', category: 'non_functional', priority: 'could', status: 'draft' },
  { id: '6', requirement_code: 'REG-001', name: 'Keep records 7 years', category: 'regulatory', priority: 'must', status: 'approved' },
]
const areas = [{ value: 'volumes', label: 'Volumes' }, { value: 'performance', label: 'Performance' }]

describe('core linked-records source (v1338 D3)', () => {
  it('recognises a core source and reads its settings', () => {
    expect(isCoreLinkedSource('core:requirements')).toBe(true)
    expect(isCoreLinkedSource('ict_use_cases')).toBe(false)
    expect(coreLinkedSourceConfig(field({ value: 'core:requirements', category: 'functional' })))
      .toMatchObject({ source: 'core:requirements', categories: ['functional'], category: 'functional', groupBy: null })
    expect(coreLinkedSourceConfig(field({ value: 'core:requirements', category: 'technical, regulatory,other' })))
      .toMatchObject({ categories: ['technical', 'regulatory', 'other'], category: null })
    expect(coreLinkedSourceConfig(field({ value: 'ict_use_cases' }))).toBeNull()
  })

  it('builds one requirements table for a category, sorted by code, leaving out empty columns', () => {
    const [block] = buildCoreRequirementBlocks(rows, { categories: ['functional'] })
    expect(block.title).toBe('Functional requirements')
    const table = block.groups[0]
    expect(table.headers).toEqual(['Code', 'Requirement', 'Priority', 'Status', 'Acceptance Criteria'])
    expect(table.rows.map((r) => r[0])).toEqual(['REQ-001', 'REQ-002'])
    expect(table.rows[1][4]).toBe('Balance matches ledger\nShown in under 1 second')
    expect(block.lines[0]).toBe('REQ-001 – Sign in – Should – Draft')
  })

  it('groups non-functional requirements by area in the areas order, then those without an area', () => {
    const blocks = buildCoreRequirementBlocks(rows, { categories: ['non_functional'], groupBy: 'nfr_area_key' }, { areas })
    expect(blocks.map((b) => b.title)).toEqual(['Volumes', 'Performance', 'Other non-functional requirements'])
    expect(blocks[1].groups[0].headers).toEqual(['Code', 'Requirement', 'Priority', 'Status', 'Owner', 'Verification'])
  })

  it('gives one table per category for several categories, and nothing when there are no rows', () => {
    const blocks = buildCoreRequirementBlocks(rows, { categories: ['technical', 'regulatory', 'other'] })
    expect(blocks.map((b) => b.title)).toEqual(['Regulatory requirements'])
    expect(buildCoreRequirementBlocks([], { categories: ['business'] })).toEqual([])
    expect(requirementsTable([]).headers).toEqual(['Code', 'Requirement'])
  })

  it('passes prebuilt blocks through to the record exports as real tables', () => {
    const blocks = buildCoreRequirementBlocks(rows, { categories: ['functional'] })
    const linkedData = { register: { label: 'Requirements register' }, records: rows, blocks }
    const specField = { field_key: 'functional_requirements', field_label: 'Functional Requirements', field_type: 'linked_records', field_group: 'Functional Requirements',
      dropdown_options: [{ value: 'core:requirements', category: 'functional' }] }
    expect(linkedBlocksForField(specField, linkedData, {}, new Map())).toBe(blocks)
    expect(linkedBlockText(blocks[0])).toContain('REQ-002 – Show balances – Must – Approved')

    const out = buildRegisterRecordExport({
      register: { register_key: 'ict_requirements_specification', status_workflow: [], fields: [specField] },
      record: { id: 'r', display_id: 'LREG-1', title: 'Spec', status: 'draft', field_values: {} },
      linked: { functional_requirements: linkedData },
    })
    const section = out.sections.find((s) => s.title === 'Functional Requirements')
    expect(section.fields[0].label).toBe('Functional requirements')
    expect(section.fields[0].blocks).toEqual([
      { type: 'table', caption: 'Requirements', headers: blocks[0].groups[0].headers, rows: blocks[0].groups[0].rows },
    ])
  })
})
