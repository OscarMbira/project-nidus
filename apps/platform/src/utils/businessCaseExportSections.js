/**
 * Platform Business Case — export section definitions and record flattening.
 */

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
      { key: 'case_reference', label: 'Reference' },
      { key: 'case_title', label: 'Title' },
      { key: 'document_status', label: 'Status' },
      { key: 'version_number', label: 'Version' },
      { key: 'created_date', label: 'Created Date' },
      { key: 'project_name', label: 'Project' },
      { key: 'programme_name', label: 'Programme' },
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
      { key: 'recommended_option_label', label: 'Recommended Option' },
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
      { key: 'dis_benefits_included_label', label: 'Capturing Dis-benefits' },
      { key: 'dis_benefits_summary', label: 'Dis-benefits' },
    ],
  },
  {
    title: 'Timescale',
    fields: [
      { key: 'start_date', label: 'Planned Start Date' },
      { key: 'end_date', label: 'Planned End Date' },
      { key: 'timescale_description', label: 'Timescale Description' },
      { key: 'key_milestones', label: 'Key Milestones' },
    ],
  },
  {
    title: 'Costs & Investment',
    fields: [
      { key: 'budget_currency', label: 'Currency' },
      { key: 'budget_type', label: 'Budget Type' },
      { key: 'budget_approval_status', label: 'Budget Approval Status' },
      { key: 'budget_categories_summary', label: 'Budget Categories' },
      { key: 'estimated_development_cost', label: 'Estimated Development Cost' },
      { key: 'estimated_ongoing_cost', label: 'Estimated Ongoing Cost' },
      { key: 'funding_source', label: 'Funding Source' },
      { key: 'cost_assumptions', label: 'Cost Assumptions' },
      { key: 'npv', label: 'NPV' },
      { key: 'roi_percentage', label: 'ROI (%)' },
      { key: 'payback_period_months', label: 'Payback Period (months)' },
      { key: 'discount_rate', label: 'Discount Rate' },
      { key: 'investment_appraisal_notes', label: 'Investment Appraisal Notes' },
    ],
  },
  {
    title: 'Major Risks',
    fields: [
      { key: 'overall_risk_rating', label: 'Overall Risk Rating' },
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

/**
 * Flatten business case + child rows for export utilities.
 * @param {object} businessCase
 * @returns {object}
 */
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

export function buildBusinessCaseExportRecord(businessCase = {}) {
  return {
    ...businessCase,
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
