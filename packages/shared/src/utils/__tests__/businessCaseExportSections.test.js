import { describe, it, expect } from 'vitest'
import {
  buildBusinessCaseExportRecord,
  buildBusinessCaseExportSections,
  businessCaseExportFilename,
} from '../businessCaseExportSections'

const fieldOf = (sections, key) => sections.flatMap((s) => s.fields).find((f) => f.key === key)

const SAMPLE = {
  case_reference: 'BC-0001',
  key_milestones: 'Interfaces live – 13 March 2026\nPilot start\t6 April 2026',
  options: [
    { option_number: 1, option_title: 'Keep manual planning', option_type: 'do_nothing', estimated_cost: 0, advantages: 'No spend' },
    { option_number: 2, option_title: 'Pilot', option_type: 'do_something', estimated_cost: 420000, is_recommended: true },
  ],
  benefits: [
    {
      benefit_description: 'Lower fuel cost per delivery',
      benefit_type: 'financial',
      target_value: '10% lower',
      target_date: '2026-06-30',
      benefit_owner: 'Fleet Operations Lead',
      measurement_method: 'Fuel card spend per delivery',
      realization_timing: 'During the pilot',
    },
  ],
  dis_benefits: [{ dis_benefit_description: 'Lower overtime income', severity: 'medium', mitigation: 'Briefings' }],
  dis_benefits_description: 'Some drivers lose overtime.',
  budget_categories: [{ category_name: 'Licences', amount: 120000 }],
}

describe('buildBusinessCaseExportSections', () => {
  it('turns benefits into a table with the target in its own column', () => {
    const benefits = fieldOf(buildBusinessCaseExportSections(SAMPLE), 'benefits_summary')
    expect(benefits.blocks[0].headers).toEqual(['Benefit', 'Type', 'Target', 'Target Date', 'Owner'])
    expect(benefits.blocks[0].rows[0]).toEqual(['Lower fuel cost per delivery', 'Financial', '10% lower', '2026-06-30', 'Fleet Operations Lead'])
    expect(benefits.blocks[1].rows[0]).toEqual(['Lower fuel cost per delivery', 'Fuel card spend per delivery', 'During the pilot'])
  })

  it('turns options into a comparison table plus a pros/cons table', () => {
    const options = fieldOf(buildBusinessCaseExportSections(SAMPLE), 'options_summary')
    expect(options.blocks[0].rows).toEqual([
      ['Keep manual planning', 'Do Nothing', '0', '', 'No'],
      ['Pilot', 'Do Something', '420,000', '', 'Yes'],
    ])
    expect(options.blocks[1].headers).toEqual(['Option', 'Advantages', 'Disadvantages', 'Risks'])
    expect(options.blocks).toHaveLength(2)
  })

  it('shows dis-benefits as intro text and a table', () => {
    const dis = fieldOf(buildBusinessCaseExportSections(SAMPLE), 'dis_benefits_summary')
    expect(dis.blocks[0]).toEqual({ type: 'text', text: 'Some drivers lose overtime.' })
    expect(dis.blocks[1].rows[0]).toEqual(['Lower overtime income', 'Medium', '', '', 'Briefings'])
  })

  it('splits key milestones (dash or tab) into Milestone | Target Date', () => {
    const milestones = fieldOf(buildBusinessCaseExportSections(SAMPLE), 'key_milestones')
    expect(milestones.table.rows).toEqual([
      ['Interfaces live', '13 March 2026'],
      ['Pilot start', '6 April 2026'],
    ])
    expect(buildBusinessCaseExportRecord(SAMPLE).key_milestones).toBe('Interfaces live – 13 March 2026\nPilot start – 6 April 2026')
  })

  it('keeps milestone text as-is when a line has no date part', () => {
    const sections = buildBusinessCaseExportSections({ key_milestones: 'Go live\nHandover – May' })
    expect(fieldOf(sections, 'key_milestones').table).toBeUndefined()
  })

  it('omits the funding column when no category has one', () => {
    const budget = fieldOf(buildBusinessCaseExportSections(SAMPLE), 'budget_categories_summary')
    expect(budget.table).toEqual({ headers: ['Category', 'Amount'], rows: [['Licences', '120,000']] })
  })

  it('marks single-value fields as facts and leaves empty child lists as text', () => {
    const sections = buildBusinessCaseExportSections({ dis_benefits_included: false })
    expect(fieldOf(sections, 'case_reference').fact).toBe(true)
    expect(fieldOf(sections, 'npv').fact).toBe(true)
    expect(fieldOf(sections, 'benefits_summary').blocks).toBeUndefined()
    expect(fieldOf(sections, 'dis_benefits_summary').blocks).toBeUndefined()
  })
})

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
