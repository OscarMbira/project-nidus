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
