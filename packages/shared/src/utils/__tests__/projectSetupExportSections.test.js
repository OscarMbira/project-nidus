import { describe, it, expect } from 'vitest'
import { compactTable, labelValueRows, listText, withFieldExtras } from '../recordExportHelpers'
import { buildMandateExportSections, buildMandateExportRecord } from '../mandateExportSections'
import { buildBriefExportSections, buildBriefExportRecord } from '../briefExportSections'
import { buildPidExportSections, buildPidExportRecord } from '../pidExportSections'
import {
  buildBenefitsReviewPlanExportSections,
  buildBenefitsReviewPlanExportRecord,
} from '../benefitsReviewPlanExportSections'
import { buildRegionalFormatExport } from '../regionalFormatExportSections'

const fieldOf = (sections, key) => sections.flatMap((s) => s.fields).find((f) => f.key === key)

describe('recordExportHelpers', () => {
  it('reads lists saved as JSON arrays or text', () => {
    expect(listText('["A","B"]')).toBe('A\nB')
    expect(listText(['A', ' ', 'B'])).toBe('A\nB')
    expect(listText('A\nB')).toBe('A\nB')
  })

  it('drops columns that are empty in every row but keeps the first', () => {
    expect(compactTable(['Name', 'Type', 'Notes'], [['X', 'a', ''], ['', 'b', null]])).toEqual({
      headers: ['Name', 'Type'],
      rows: [['X', 'a'], ['', 'b']],
    })
    expect(compactTable(['Name'], [])).toBeNull()
  })

  it('splits "Label: value" lines only when every line has both parts', () => {
    expect(labelValueRows('Time: plus or minus 2 weeks\nCost: plus or minus 10%')).toEqual([
      ['Time', 'plus or minus 2 weeks'],
      ['Cost', 'plus or minus 10%'],
    ])
    expect(labelValueRows('Time: 2 weeks\nNo label here')).toEqual([])
  })

  it('skips null tables so the field keeps its flat value', () => {
    const [section] = withFieldExtras([{ title: 'S', fields: [{ key: 'a' }] }], { a: { table: null } })
    expect(section.fields[0].table).toBeUndefined()
  })
})

describe('mandate export', () => {
  const mandate = {
    mandate_reference: 'PMB-1',
    quality_priority: 'balanced',
    project_objectives: 'Cut fuel cost\nRaise on-time deliveries',
    constraints: 'Budget of 420,000\nFinish by 30 June 2026',
  }
  const children = {
    constraints: [
      { constraint_category: { code: 'C01', name: 'Budget', value_type: 'numeric' }, operand: '<=', unit: '$', value_numeric: 420000, notes: 'Capital' },
    ],
    documents: [{ document_title: 'Strategy 2026', document_type: 'strategy', reference_number: 'STR-01' }],
    stakeholders: [{ stakeholder_name: 'Depot supervisors', stakeholder_type: 'user', is_primary: true }],
  }

  it('builds constraint, document and stakeholder tables', () => {
    const sections = buildMandateExportSections(mandate, children)
    expect(fieldOf(sections, 'constraints_summary').table).toEqual({
      headers: ['Constraint', 'Value', 'Notes'],
      rows: [['C01 Budget', '≤ $420000', 'Capital']],
    })
    expect(fieldOf(sections, 'associated_documents_summary').table.headers).toEqual(['Document', 'Type', 'Reference'])
    expect(fieldOf(sections, 'stakeholders_summary').table.rows).toEqual([['Depot supervisors', 'User', 'Yes']])
    expect(fieldOf(sections, 'mandate_reference').fact).toBe(true)
  })

  it('falls back to the constraints text list when there are no typed constraints', () => {
    const record = buildMandateExportRecord(mandate)
    expect(record.constraints_summary).toBe('Budget of 420,000\nFinish by 30 June 2026')
    expect(record.quality_priority_label).toBe('Balanced')
    expect(fieldOf(buildMandateExportSections(mandate), 'constraints_summary').table).toBeUndefined()
  })
})

describe('brief export', () => {
  const brief = {
    brief_reference: 'PBG-1',
    project_tolerances: 'Time: plus or minus 2 weeks\nCost: plus or minus 10%',
    solution_type: 'hybrid',
    lessons_learned_reviewed: true,
    dis_benefits_included: true,
  }

  it('turns "Area: limit" tolerance lines into a table', () => {
    const tolerances = fieldOf(buildBriefExportSections(brief), 'project_tolerances')
    expect(tolerances.table).toEqual({
      headers: ['Tolerance', 'Limit'],
      rows: [['Time', 'plus or minus 2 weeks'], ['Cost', 'plus or minus 10%']],
    })
  })

  it('prefers tolerance records and adds role and reference tables', () => {
    const sections = buildBriefExportSections(brief, {
      tolerances: [{ tolerance_type: 'cost', tolerance_description: 'Budget', upper_limit: '10%', escalation_required: true }],
      roles: [{ role_name: 'Executive', assigned_user: { full_name: 'Lindiwe Moyo' }, is_mandatory: true }],
      references: [{ reference_title: 'Lessons log', reference_type: 'lesson' }],
    })
    expect(fieldOf(sections, 'project_tolerances').table.rows).toEqual([['Cost', 'Budget', '10%', 'Yes']])
    expect(fieldOf(sections, 'roles_summary').table).toEqual({
      headers: ['Role', 'Assigned To', 'Mandatory'],
      rows: [['Executive', 'Lindiwe Moyo', 'Yes']],
    })
    expect(fieldOf(sections, 'references_summary').table.rows).toEqual([['Lessons log', 'Lesson']])
  })

  it('labels approach and yes/no facts for flat exports', () => {
    const record = buildBriefExportRecord(brief)
    expect(record.solution_type_label).toBe('Hybrid')
    expect(record.lessons_learned_reviewed_label).toBe('Yes')
    expect(fieldOf(buildBriefExportSections(brief), 'solution_type_label').fact).toBe(true)
  })
})

describe('PID export', () => {
  it('reads JSON objectives and builds child tables', () => {
    const pid = { pid_title: 'PID', project_objectives: '["Deliver on time","Meet quality"]' }
    const children = {
      objectives: [{ objective_reference: 'OBJ-1', objective_title: 'Cut fuel', priority: 'high', target_value: '10%' }],
      teamMembers: [{ role_name: 'Project Manager', assigned_user_name: 'Lindiwe Moyo', role_type: 'project_management' }],
    }
    const sections = buildPidExportSections(pid, children)
    expect(fieldOf(sections, 'objectives_summary').table).toEqual({
      headers: ['Objective', 'Priority', 'Target'],
      rows: [['OBJ-1 Cut fuel', 'High', '10%']],
    })
    expect(fieldOf(sections, 'team_summary').table.rows[0]).toEqual(['Project Manager', 'Lindiwe Moyo', 'Project management'])
    expect(fieldOf(sections, 'interfaces_summary').table).toBeUndefined()
    const record = buildPidExportRecord(pid, children)
    expect(record.project_objectives).toBe('Deliver on time\nMeet quality')
    expect(record.title).toBe('PID')
  })
})

describe('benefits review plan export', () => {
  it('builds coverage and scope-owner tables and labels people', () => {
    const plan = {
      document_ref: 'BRP-1',
      scope_description: JSON.stringify([{ item: 'Fuel saving', owner_name: 'Fleet Lead' }]),
      performance_review_frequency: 'quarterly',
      author: { full_name: 'Lindiwe Moyo' },
    }
    const children = {
      coverage: [{ benefit: { benefit_code: 'BEN-1', benefit_name: 'Lower fuel cost' }, measurement_frequency: 'monthly', included_in_scope: true }],
    }
    const sections = buildBenefitsReviewPlanExportSections(plan, children)
    expect(fieldOf(sections, 'scope_description').table).toEqual({ headers: ['Scope Item', 'Benefit Owner'], rows: [['Fuel saving', 'Fleet Lead']] })
    expect(fieldOf(sections, 'coverage_summary').table).toEqual({
      headers: ['Benefit', 'In Scope', 'Frequency'],
      rows: [['BEN-1 – Lower fuel cost', 'Yes', 'Monthly']],
    })
    const record = buildBenefitsReviewPlanExportRecord(plan, children)
    expect(record.author_label).toBe('Lindiwe Moyo')
    expect(record.performance_review_frequency_label).toBe('Quarterly')
    expect(record.scope_description).toBe('Fuel saving (Owner: Fleet Lead)')
  })

  it('keeps plain scope text as text', () => {
    const sections = buildBenefitsReviewPlanExportSections({ scope_description: 'Covers all benefits.' })
    expect(fieldOf(sections, 'scope_description').table).toBeUndefined()
  })
})

describe('regional format export', () => {
  it('builds one Setting | Value | Project Override table', () => {
    const { sections, record } = buildRegionalFormatExport(
      [{ key: 'currency', label: 'Currency' }, { key: 'date_format', label: 'Date format' }],
      { currency: 'USD', date_format: 'DD/MM/YYYY' },
      { currency: true },
    )
    expect(sections[0].fields[0].table.rows).toEqual([
      ['Currency', 'USD', 'Yes'],
      ['Date format', 'DD/MM/YYYY', 'No'],
    ])
    expect(record.settings_table).toBe('Currency – USD – Yes\nDate format – DD/MM/YYYY – No')
  })
})
