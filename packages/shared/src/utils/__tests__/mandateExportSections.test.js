import { describe, it, expect } from 'vitest'
import { buildMandateExportSections, buildMandateExportRecord } from '../mandateExportSections'

const deps = [
  { dependency_description: 'Network upgrade', dependency_type: 'external', impact_during_project: true, impact_after_implementation: false, dependency_status: 'identified' },
]

describe('mandate export — dependencies (v1447)', () => {
  it('adds a 13. Dependencies section drawn as a real table', () => {
    const sections = buildMandateExportSections({}, { dependencies: deps })
    const section = sections.find((s) => s.title === '13. Dependencies')
    expect(section).toBeTruthy()
    const field = section.fields.find((f) => f.key === 'dependencies_summary')
    expect(field.table.headers).toEqual(['Dependency', 'Type', 'During project', 'After implementation', 'Status'])
    expect(field.table.rows[0]).toEqual(['Network upgrade', 'External', 'Yes', 'No', 'Identified'])
  })

  it('keeps flat exports to one line per dependency', () => {
    const record = buildMandateExportRecord({}, { dependencies: deps })
    expect(record.dependencies_summary).toBe('Network upgrade – External – Yes – No – Identified')
  })

  it('leaves the field empty when there are no dependencies', () => {
    const record = buildMandateExportRecord({}, {})
    expect(record.dependencies_summary).toBe('')
  })
})

describe('mandate export — v1344 fields', () => {
  it('exports assumptions, known risks and key deliverables', async () => {
    const { buildMandateExportRecord, buildMandateExportSections } = await import('../mandateExportSections')
    const rec = buildMandateExportRecord(
      { assumptions: '["A1","A2"]', outline_risks: '["R1"]' },
      { deliverables: [{ deliverable_name: 'Portal', estimated_completion: 'Q2', is_in_scope: true, is_major_deliverable: false }] },
    )
    expect(rec.assumptions).toContain('A1')
    expect(rec.outline_risks).toContain('R1')
    expect(rec.deliverables_summary).toContain('Portal')
    const sections = buildMandateExportSections({}, { deliverables: [{ deliverable_name: 'Portal' }] })
    expect(sections.map((s) => s.title)).toEqual(expect.arrayContaining(['14. Assumptions', '15. Known Risks and Issues', '16. Key Deliverables']))
  })
})
