import { describe, it, expect } from 'vitest'
import { buildBusinessCaseExportRecord, businessCaseExportFilename } from '../businessCaseExportSections'

describe('businessCaseExportSections', () => {
  it('flattens joined project and option summaries', () => {
    const record = buildBusinessCaseExportRecord({
      case_reference: 'SEED636-BC-003',
      case_title: 'Data Warehouse Migration',
      recommended_option: 'do_something',
      projects: { project_name: 'Analytics Programme' },
      options: [
        { option_number: 1, option_title: 'Full Migration', option_type: 'do_something', is_recommended: true },
      ],
      benefits: [{ benefit_description: 'Reduce reporting effort', benefit_type: 'operational', target_value: '30%' }],
    })

    expect(record.project_name).toBe('Analytics Programme')
    expect(record.recommended_option_label).toBe('Do Something')
    expect(record.options_summary).toContain('Full Migration')
    expect(record.benefits_summary).toContain('Reduce reporting effort')
  })

  it('builds safe export filename', () => {
    expect(businessCaseExportFilename({ case_reference: 'SEED636-BC-003' })).toBe('BusinessCase_SEED636-BC-003')
  })
})
