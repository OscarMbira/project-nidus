/**
 * Platform Business Case — export section definitions and record flattening.
 * Layout exports (PDF / Word / PowerPoint / Print) use buildBusinessCaseExportSections(), which adds
 * Detail | Value tables and real tables for options, benefits, dis-benefits, budget categories and
 * key milestones (rule 38.1). Flat exports keep one value per field from buildBusinessCaseExportRecord().
 */

import { parseTableValue } from './registerTableField'

const OPTION_LABELS = {
  do_nothing: 'Do Nothing',
  do_minimum: 'Do Minimum',
  do_something: 'Do Something',
  other: 'Other',
}

export const BUSINESS_CASE_EXPORT_SECTIONS = [
  {
    title: 'Document Information',
    fields: [
      { key: 'case_reference', label: 'Reference', fact: true },
      { key: 'case_title', label: 'Title', fact: true },
      { key: 'document_status', label: 'Status', fact: true },
      { key: 'version_number', label: 'Version', fact: true },
      { key: 'created_date', label: 'Created Date', fact: true },
      { key: 'project_name', label: 'Project', fact: true },
      { key: 'programme_name', label: 'Programme', fact: true },
    ],
  },
  {
    title: 'Executive Summary',
    fields: [
      { key: 'executive_summary', label: 'Executive Summary' },
      { key: 'strategic_alignment', label: 'Strategic Alignment' },
    ],
  },
  {
    title: 'Reasons for the Project',
    fields: [
      { key: 'reasons_for_project', label: 'Reasons' },
      { key: 'problem_statement', label: 'Problem Statement' },
    ],
  },
  {
    title: 'Business Options',
    fields: [
      { key: 'recommended_option_label', label: 'Recommended Option', fact: true },
      { key: 'option_justification', label: 'Option Justification' },
      { key: 'options_summary', label: 'Options Comparison' },
    ],
  },
  {
    title: 'Expected Benefits',
    fields: [{ key: 'benefits_summary', label: 'Benefits' }],
  },
  {
    title: 'Dis-benefits',
    fields: [
      { key: 'dis_benefits_included_label', label: 'Capturing Dis-benefits', fact: true },
      { key: 'dis_benefits_summary', label: 'Dis-benefits' },
    ],
  },
  {
    title: 'Timescale',
    fields: [
      { key: 'start_date', label: 'Planned Start Date', fact: true },
      { key: 'end_date', label: 'Planned End Date', fact: true },
      { key: 'timescale_description', label: 'Timescale Description' },
      { key: 'key_milestones', label: 'Key Milestones' },
    ],
  },
  {
    title: 'Costs & Investment',
    fields: [
      { key: 'budget_currency', label: 'Currency', fact: true },
      { key: 'budget_type', label: 'Budget Type', fact: true },
      { key: 'budget_approval_status', label: 'Budget Approval Status', fact: true },
      { key: 'estimated_development_cost', label: 'Estimated Development Cost', fact: true },
      { key: 'estimated_ongoing_cost', label: 'Estimated Ongoing Cost', fact: true },
      { key: 'funding_source', label: 'Funding Source', fact: true },
      { key: 'npv', label: 'NPV', fact: true },
      { key: 'roi_percentage', label: 'ROI (%)', fact: true },
      { key: 'payback_period_months', label: 'Payback Period (months)', fact: true },
      { key: 'discount_rate', label: 'Discount Rate', fact: true },
      { key: 'budget_categories_summary', label: 'Budget Categories' },
      { key: 'cost_assumptions', label: 'Cost Assumptions' },
      { key: 'investment_appraisal_notes', label: 'Investment Appraisal Notes' },
    ],
  },
  {
    title: 'Major Risks',
    fields: [
      { key: 'overall_risk_rating', label: 'Overall Risk Rating', fact: true },
      { key: 'major_risks', label: 'Major Risks Summary' },
    ],
  },
]

function formatMoney(val) {
  if (val == null || val === '') return ''
  const n = Number(val)
  if (Number.isNaN(n)) return String(val)
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function formatOptionsSummary(options = []) {
  if (!options.length) return ''
  return options
    .map((opt) => {
      const title = opt.option_title || `Option ${opt.option_number}`
      const type = OPTION_LABELS[opt.option_type] || opt.option_type || ''
      const cost = opt.estimated_cost != null ? ` — Cost: ${formatMoney(opt.estimated_cost)}` : ''
      const rec = opt.is_recommended ? ' [Recommended]' : ''
      return `${title} (${type})${cost}${rec}${opt.description ? `\n  ${opt.description}` : ''}`
    })
    .join('\n')
}

function formatBenefitsSummary(benefits = []) {
  if (!benefits.length) return ''
  return benefits
    .map((b) => {
      const target = b.target_value ? ` — Target: ${b.target_value}` : ''
      return `${b.benefit_description || 'Benefit'} (${b.benefit_type || 'general'})${target}`
    })
    .join('\n')
}

function formatDisBenefitsSummary(businessCase = {}) {
  if (businessCase.dis_benefits_included === false) {
    return 'Not captured for this business case'
  }
  const fromDescription = (businessCase.dis_benefits_description || '').trim()
  const rows = businessCase.dis_benefits || []
  const fromRows = rows.length
    ? rows
        .map((d) => {
          const sev = d.severity ? ` [${d.severity}]` : ''
          return `${d.dis_benefit_description || 'Dis-benefit'}${sev}${d.impact_description ? `\n  Impact: ${d.impact_description}` : ''}`
        })
        .join('\n')
    : ''
  if (fromDescription && fromRows) return `${fromDescription}\n${fromRows}`
  return fromDescription || fromRows || ''
}

function formatBudgetCategoriesSummary(categories = []) {
  if (!Array.isArray(categories) || !categories.length) return ''
  return categories
    .map((row) => {
      const name = row.category_name || 'Category'
      const amount = formatMoney(row.amount)
      return `${name}: ${amount}${row.funding_source_id ? ` (funding ${row.funding_source_id})` : ''}`
    })
    .join('\n')
}

/** Key milestone rows ([milestone, date]) — only when every line has both parts. */
function milestoneRows(value) {
  const rows = parseTableValue(value, 2)
  return rows.length && rows.every((r) => r[0] && r[1]) ? rows : []
}

function formatKeyMilestones(value) {
  if (!value) return value ?? ''
  const rows = milestoneRows(value)
  return rows.length ? rows.map((r) => r.join(' – ')).join('\n') : String(value)
}

const BENEFIT_TYPE_LABELS = {
  financial: 'Financial',
  non_financial: 'Non-financial',
  strategic: 'Strategic',
  operational: 'Operational',
  reputational: 'Reputational',
}

const SEVERITY_LABELS = { low: 'Low', medium: 'Medium', high: 'High' }

const text = (v) => (v == null ? '' : String(v).trim())

function hasAny(rows) {
  return rows.some((row) => row.slice(1).some(Boolean))
}

function optionBlocks(options = []) {
  if (!options.length) return null
  const title = (o) => o.option_title || `Option ${o.option_number}`
  const blocks = [
    {
      type: 'table',
      headers: ['Option', 'Type', 'Estimated Cost', 'Estimated Benefits', 'Recommended'],
      rows: options.map((o) => [
        title(o),
        OPTION_LABELS[o.option_type] || text(o.option_type),
        formatMoney(o.estimated_cost),
        text(o.estimated_benefits),
        o.is_recommended ? 'Yes' : 'No',
      ]),
    },
  ]
  const qualitative = options.map((o) => [title(o), text(o.advantages), text(o.disadvantages), text(o.risks_summary)])
  if (hasAny(qualitative)) {
    blocks.push({
      type: 'table',
      caption: 'Advantages, disadvantages and risks',
      headers: ['Option', 'Advantages', 'Disadvantages', 'Risks'],
      rows: qualitative,
    })
  }
  const described = options.map((o) => [title(o), text(o.description)])
  if (hasAny(described)) {
    blocks.push({ type: 'table', caption: 'Option descriptions', headers: ['Option', 'Description'], rows: described })
  }
  return blocks
}

function benefitBlocks(benefits = []) {
  if (!benefits.length) return null
  const name = (b) => b.benefit_description || 'Benefit'
  const blocks = [
    {
      type: 'table',
      headers: ['Benefit', 'Type', 'Target', 'Target Date', 'Owner'],
      rows: benefits.map((b) => [
        name(b),
        BENEFIT_TYPE_LABELS[b.benefit_type] || text(b.benefit_type),
        text(b.target_value),
        text(b.target_date),
        text(b.benefit_owner),
      ]),
    },
  ]
  const measured = benefits.map((b) => [name(b), text(b.measurement_method), text(b.realization_timing)])
  if (hasAny(measured)) {
    blocks.push({
      type: 'table',
      caption: 'Measurement and timing',
      headers: ['Benefit', 'How It Is Measured', 'When Realised'],
      rows: measured,
    })
  }
  return blocks
}

function disBenefitBlocks(businessCase = {}) {
  const rows = businessCase.dis_benefits || []
  if (businessCase.dis_benefits_included === false || !rows.length) return null
  const blocks = []
  const intro = text(businessCase.dis_benefits_description)
  if (intro) blocks.push({ type: 'text', text: intro })
  blocks.push({
    type: 'table',
    headers: ['Dis-benefit', 'Severity', 'Impact', 'Affected Stakeholders', 'Mitigation'],
    rows: rows.map((d) => [
      d.dis_benefit_description || 'Dis-benefit',
      SEVERITY_LABELS[d.severity] || text(d.severity),
      text(d.impact_description),
      text(d.affected_stakeholders),
      text(d.mitigation),
    ]),
  })
  return blocks
}

function budgetCategoryTable(categories = []) {
  if (!Array.isArray(categories) || !categories.length) return null
  const rows = categories.map((c) => [c.category_name || 'Category', formatMoney(c.amount), text(c.funding_source_id)])
  const withFunding = rows.some((r) => r[2])
  return {
    headers: withFunding ? ['Category', 'Amount', 'Funding Source'] : ['Category', 'Amount'],
    rows: withFunding ? rows : rows.map((r) => r.slice(0, 2)),
  }
}

/**
 * Sections for layout exports: BUSINESS_CASE_EXPORT_SECTIONS plus the tables built from this
 * business case's child rows. Fields without rows fall back to their flat text value.
 */
export function buildBusinessCaseExportSections(businessCase = {}) {
  const milestones = milestoneRows(businessCase.key_milestones)
  const extras = {
    options_summary: { blocks: optionBlocks(businessCase.options) },
    benefits_summary: { blocks: benefitBlocks(businessCase.benefits) },
    dis_benefits_summary: { blocks: disBenefitBlocks(businessCase) },
    budget_categories_summary: { table: budgetCategoryTable(businessCase.budget_categories) },
    key_milestones: { table: milestones.length ? { headers: ['Milestone', 'Target Date'], rows: milestones } : null },
  }
  return BUSINESS_CASE_EXPORT_SECTIONS.map((section) => ({
    ...section,
    fields: section.fields.map((field) => {
      const extra = extras[field.key]
      if (!extra) return field
      const out = { ...field }
      if (extra.blocks) out.blocks = extra.blocks
      if (extra.table) out.table = extra.table
      return out
    }),
  }))
}

/**
 * Flatten business case + child rows for export utilities.
 * @param {object} businessCase
 * @returns {object}
 */
export function buildBusinessCaseExportRecord(businessCase = {}) {
  return {
    ...businessCase,
    key_milestones: formatKeyMilestones(businessCase.key_milestones),
    project_name: businessCase.projects?.project_name || businessCase.project_name || '',
    programme_name: businessCase.programmes?.programme_name || businessCase.programme_name || '',
    recommended_option_label:
      OPTION_LABELS[businessCase.recommended_option] || businessCase.recommended_option || '',
    options_summary: formatOptionsSummary(businessCase.options),
    benefits_summary: formatBenefitsSummary(businessCase.benefits),
    dis_benefits_included_label: businessCase.dis_benefits_included === false ? 'No' : 'Yes',
    dis_benefits_summary: formatDisBenefitsSummary(businessCase),
    budget_categories_summary: formatBudgetCategoriesSummary(businessCase.budget_categories),
    estimated_development_cost: formatMoney(businessCase.estimated_development_cost),
    estimated_ongoing_cost: formatMoney(businessCase.estimated_ongoing_cost),
    npv: formatMoney(businessCase.npv),
  }
}

export function businessCaseExportFilename(businessCase = {}) {
  const ref = businessCase.case_reference || businessCase.id || 'BusinessCase'
  return `BusinessCase_${ref}`.replace(/[^\w.-]+/g, '_')
}
