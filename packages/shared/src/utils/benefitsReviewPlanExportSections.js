/**
 * Benefits Review Plan — record export sections (rule 38.1) for the shared Export / View buttons.
 * Single values form Detail | Value tables; scope items with owners, measurement timing, benefits
 * coverage, resources, the review schedule and dis-benefits are real tables.
 * Flat exports read buildBenefitsReviewPlanExportRecord().
 */

import { compactTable, humanizeToken, tableLines, withFieldExtras, yesNo } from './recordExportHelpers'
import { parseScopeItemsWithOwners, formatScopeItemsWithOwnersForDisplay } from './scopeItemsWithOwnersUtils.js'
import { parseMeasurementTimingLinks, formatMeasurementTimingLinksForDisplay } from './measurementTimingUtils.js'

export const BRP_EXPORT_SECTIONS = [
  { title: 'Plan', fields: [
    { key: 'document_ref', label: 'Reference', fact: true },
    { key: 'plan_title', label: 'Title', fact: true },
    { key: 'version_number', label: 'Version', fact: true },
    { key: 'release', label: 'Release', fact: true },
    { key: 'status', label: 'Status', fact: true },
    { key: 'plan_date', label: 'Plan Date', fact: true },
    { key: 'project_label', label: 'Project', fact: true },
    { key: 'author_label', label: 'Author', fact: true },
    { key: 'owner_label', label: 'Owner', fact: true },
    { key: 'client', label: 'Client', fact: true },
  ]},
  { title: 'Scope', fields: [
    { key: 'scope_description', label: 'Scope' },
    { key: 'benefits_coverage_notes', label: 'Benefits Coverage Notes' },
    { key: 'coverage_summary', label: 'Benefits Coverage' },
  ]},
  { title: 'Accountability', fields: [{ key: 'accountability_description', label: 'Accountability' }] },
  { title: 'Benefits Measurement', fields: [
    { key: 'measurement_approach', label: 'Measurement Approach' },
    { key: 'measurement_timing_rationale', label: 'Measurement Timing' },
  ]},
  { title: 'Resources', fields: [
    { key: 'estimated_review_effort_hours', label: 'Estimated Review Effort (hours)', fact: true },
    { key: 'estimated_review_cost_label', label: 'Estimated Review Cost', fact: true },
    { key: 'resources_description', label: 'Resources' },
    { key: 'resources_summary', label: 'Resource Details' },
  ]},
  { title: 'Baseline Measures', fields: [
    { key: 'baseline_recording_date', label: 'Recording Date', fact: true },
    { key: 'baseline_source', label: 'Source', fact: true },
    { key: 'baseline_measures_description', label: 'Baseline Measures' },
  ]},
  { title: 'Performance Review', fields: [
    { key: 'performance_review_frequency_label', label: 'Review Frequency', fact: true },
    { key: 'performance_review_approach', label: 'Review Approach' },
    { key: 'performance_review_criteria', label: 'Review Criteria' },
    { key: 'reviews_summary', label: 'Review Schedule' },
  ]},
  { title: 'Dis-benefits', fields: [
    { key: 'dis_benefits_included_label', label: 'Dis-benefits Captured', fact: true },
    { key: 'dis_benefits_description', label: 'Dis-benefits' },
    { key: 'dis_benefits_summary', label: 'Dis-benefit Details' },
  ]},
]

const userLabel = (u) => u?.full_name || u?.email || ''
const benefitLabel = (b) => [b?.benefit_code, b?.benefit_name].filter(Boolean).join(' – ')
const money = (amount, currency) => {
  if (amount == null || amount === '') return ''
  const n = Number(amount)
  const text = Number.isNaN(n) ? String(amount) : n.toLocaleString()
  return currency ? `${currency} ${text}` : text
}

function tables(plan = {}, children = {}) {
  const scopeRows = parseScopeItemsWithOwners(plan.scope_description)
  const timingRows = parseMeasurementTimingLinks(plan.measurement_timing_rationale)
  return {
    scope: scopeRows.some((r) => r.owner_name)
      ? compactTable(['Scope Item', 'Benefit Owner'], scopeRows.map((r) => [r.item, r.owner_name]))
      : null,
    timing: timingRows.some((r) => r.point)
      ? compactTable(['Measurement Point', 'Measurement Timing'], timingRows.map((r) => [r.point, r.timing]))
      : null,
    coverage: compactTable(
      ['Benefit', 'In Scope', 'Frequency', 'Accountable', 'Measurement Start', 'Measurement End', 'Next Review'],
      (children.coverage || []).map((c) => [
        benefitLabel(c.benefit) || 'Benefit',
        yesNo(c.included_in_scope),
        humanizeToken(c.measurement_frequency),
        userLabel(c.accountable),
        c.measurement_start_date,
        c.measurement_end_date,
        c.next_review_date,
      ]),
    ),
    resources: compactTable(
      ['Resource', 'Type', 'Skill', 'Effort (hrs)', 'Cost', 'From', 'To'],
      (children.resources || []).map((r) => [
        r.resource_name || 'Resource',
        humanizeToken(r.resource_type),
        r.skill_required,
        r.estimated_effort_hours,
        money(r.estimated_cost, r.cost_currency),
        r.required_from_date,
        r.required_to_date,
      ]),
    ),
    reviews: compactTable(
      ['Review', 'Benefit', 'Type', 'Planned', 'Actual', 'Reviewer', 'Status'],
      (children.reviews || []).map((r) => [
        r.review_name || 'Review',
        benefitLabel(r.benefit),
        humanizeToken(r.review_type),
        r.planned_date,
        r.actual_date,
        userLabel(r.reviewer),
        humanizeToken(r.status),
      ]),
    ),
    disBenefits: compactTable(
      ['Dis-benefit', 'Severity', 'Mitigation Status'],
      (children.disBenefits || []).map((d) => [
        [d.dis_benefit_code, d.dis_benefit_name].filter(Boolean).join(' – ') || 'Dis-benefit',
        humanizeToken(d.impact_severity),
        humanizeToken(d.mitigation_status),
      ]),
    ),
  }
}

/**
 * @param {object} plan
 * @param {{ coverage?, resources?, reviews?, disBenefits? }} [children]
 */
export function buildBenefitsReviewPlanExportSections(plan = {}, children = {}) {
  const t = tables(plan, children)
  return withFieldExtras(BRP_EXPORT_SECTIONS, {
    scope_description: { table: t.scope },
    measurement_timing_rationale: { table: t.timing },
    coverage_summary: { table: t.coverage },
    resources_summary: { table: t.resources },
    reviews_summary: { table: t.reviews },
    dis_benefits_summary: { table: t.disBenefits },
  })
}

export function buildBenefitsReviewPlanExportRecord(plan = {}, children = {}) {
  const t = tables(plan, children)
  return {
    ...plan,
    project_label: plan.project?.project_name || plan.project?.project_code || '',
    author_label: userLabel(plan.author),
    owner_label: userLabel(plan.owner),
    scope_description: formatScopeItemsWithOwnersForDisplay(plan.scope_description) || plan.scope_description || '',
    measurement_timing_rationale:
      formatMeasurementTimingLinksForDisplay(plan.measurement_timing_rationale) || plan.measurement_timing_rationale || '',
    estimated_review_cost_label: money(plan.estimated_review_cost, plan.review_cost_currency),
    performance_review_frequency_label: humanizeToken(plan.performance_review_frequency),
    dis_benefits_included_label: yesNo(plan.dis_benefits_included),
    coverage_summary: tableLines(t.coverage),
    resources_summary: tableLines(t.resources),
    reviews_summary: tableLines(t.reviews),
    dis_benefits_summary: tableLines(t.disBenefits),
  }
}
