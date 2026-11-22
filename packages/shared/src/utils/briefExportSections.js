/**
 * Project Brief / Project Charter — record export sections (rule 38.1).
 *
 * Layout rules (logical use — do not stack tables for every field):
 * - Short single values → Detail | Value (`fact: true`), grouped at the top of a section
 * - One-statement-per-line lists → `# | Item` tables only when `itemColumnLabel` is set
 * - Long narrative prose → numbered heading + paragraph (not forced into tables)
 * - Child records (tolerances, products, roles, milestones, references) → real multi-column tables
 *
 * Flat exports read buildBriefExportRecord().
 */

import {
  compactTable,
  humanizeToken,
  labelValueRows,
  listText,
  tableLines,
  withFieldExtras,
  yesNo,
} from './recordExportHelpers'

export const BRIEF_EXPORT_SECTIONS = [
  { title: 'Document Metadata', fields: [
    { key: 'brief_reference', label: 'Reference', fact: true },
    { key: 'document_ref', label: 'Document Ref', fact: true },
    { key: 'version_number', label: 'Version', fact: true },
    { key: 'release', label: 'Release', fact: true },
    { key: 'document_status', label: 'Status', fact: true },
    { key: 'created_date', label: 'Created', fact: true },
    { key: 'author_name', label: 'Author', fact: true },
    { key: 'owner_name', label: 'Owner', fact: true },
    { key: 'client_name', label: 'Client', fact: true },
    { key: 'approved_date', label: 'Approved Date', fact: true },
  ]},
  { title: 'Project Definition', fields: [
    { key: 'background', label: 'Background' },
    { key: 'project_objectives', label: 'Project Objectives', itemColumnLabel: 'Objective' },
    { key: 'desired_outcomes', label: 'Desired Outcomes', itemColumnLabel: 'Outcome' },
    { key: 'constraints', label: 'Constraints', itemColumnLabel: 'Constraint' },
    { key: 'assumptions', label: 'Assumptions', itemColumnLabel: 'Assumption' },
  ]},
  { title: 'Scope', fields: [
    { key: 'project_scope', label: 'Project Scope', itemColumnLabel: 'In scope' },
    { key: 'scope_exclusions', label: 'Scope Exclusions', itemColumnLabel: 'Exclusion' },
  ]},
  { title: 'Project Tolerances', fields: [{ key: 'project_tolerances', label: 'Tolerances' }] },
  { title: 'Interested Parties', fields: [
    { key: 'users_and_interested_parties', label: 'Users and Interested Parties', itemColumnLabel: 'Party' },
  ]},
  { title: 'Interfaces', fields: [
    { key: 'interfaces', label: 'Interfaces', itemColumnLabel: 'Interface' },
  ]},
  { title: 'Business Case', fields: [
    { key: 'business_option_selected', label: 'Business Option Selected', fact: true },
    { key: 'dis_benefits_included_label', label: 'Dis-benefits Captured', fact: true },
    // Summary stays in the same Detail | Value table as the short facts above (one table, not stacked).
    { key: 'outline_business_case_summary', label: 'Outline Business Case Summary', fact: true },
    { key: 'dis_benefits_description', label: 'Dis-benefits' },
  ]},
  { title: 'Product Description', fields: [
    { key: 'product_description', label: 'Project Product' },
    { key: 'products_summary', label: 'Products' },
    { key: 'customer_quality_expectations', label: 'Customer Quality Expectations', itemColumnLabel: 'Expectation' },
    { key: 'user_acceptance_criteria', label: 'Acceptance Criteria', itemColumnLabel: 'Criterion' },
    { key: 'operations_maintenance_criteria', label: 'Operations and Maintenance Criteria', itemColumnLabel: 'Criterion' },
  ]},
  { title: 'Project Approach', fields: [
    { key: 'solution_type_label', label: 'Solution Type', fact: true },
    { key: 'delivery_approach_label', label: 'Delivery Approach', fact: true },
    { key: 'development_approach_label', label: 'Development Approach', fact: true },
    { key: 'project_approach_description', label: 'Approach' },
    { key: 'operational_environment', label: 'Operational Environment' },
    { key: 'approach_justification', label: 'Justification' },
  ]},
  { title: 'Team Structure', fields: [
    { key: 'team_structure_description', label: 'Team Structure' },
  ]},
  { title: 'Role Descriptions', fields: [{ key: 'roles_summary', label: 'Role Descriptions' }] },
  { title: 'Milestones', fields: [{ key: 'milestones_summary', label: 'Milestones' }] },
  { title: 'References', fields: [
    { key: 'lessons_learned_reviewed_label', label: 'Lessons Reviewed', fact: true },
    { key: 'lessons_review_summary', label: 'Lessons Review Summary' },
    { key: 'references_summary', label: 'References' },
  ]},
]

const LIST_KEYS = [
  'project_objectives',
  'desired_outcomes',
  'constraints',
  'assumptions',
  'project_scope',
  'scope_exclusions',
  'user_acceptance_criteria',
  'operations_maintenance_criteria',
  'users_and_interested_parties',
  'interfaces',
  'customer_quality_expectations',
]

/** Tolerance rows: the brief's tolerance records, else "Area: limit" lines of the tolerances text. */
function tolerancesTable(brief = {}, tolerances = []) {
  if (tolerances.length) {
    return compactTable(
      ['Tolerance', 'Description', 'Lower Limit', 'Upper Limit', 'Absolute Value', 'Escalation Required', 'Notes'],
      tolerances.map((t) => [
        humanizeToken(t.tolerance_type) || 'Tolerance',
        t.tolerance_description,
        t.lower_limit,
        t.upper_limit,
        t.absolute_value,
        yesNo(t.escalation_required),
        t.notes,
      ]),
    )
  }
  const rows = labelValueRows(brief.project_tolerances)
  return rows.length ? { headers: ['Tolerance', 'Limit'], rows } : null
}

function productsTable(products = []) {
  return compactTable(
    ['Product', 'Purpose', 'Composition', 'Quality Criteria', 'Main Product'],
    products.map((p) => [
      p.product_name || 'Product',
      p.purpose || p.product_description,
      p.composition,
      p.quality_criteria,
      p.is_main_product ? 'Yes' : '',
    ]),
  )
}

function rolesTable(roles = []) {
  return compactTable(
    ['Role', 'Assigned To', 'Reports To', 'Key Responsibilities', 'Time Commitment', 'Mandatory'],
    roles.map((r) => [
      r.role_name || 'Role',
      r.assigned_to_name || r.assigned_user?.full_name || r.assigned_user?.email,
      r.reporting_to,
      listText(r.key_responsibilities) || r.role_description,
      r.time_commitment,
      r.is_mandatory ? 'Yes' : '',
    ]),
  )
}

function referencesTable(references = []) {
  return compactTable(
    ['Reference', 'Type', 'Description', 'Link'],
    references.map((r) => [r.reference_title || 'Reference', humanizeToken(r.reference_type), r.reference_description, r.reference_url]),
  )
}

/** v1344: the project's Milestones register rows (the brief's Milestones tab). */
function milestonesTable(milestones = []) {
  return compactTable(
    ['Milestone', 'Target Date', 'Forecast Date', 'Status'],
    milestones.map((m) => [m.milestone_name || 'Milestone', m.target_date, m.forecast_date, humanizeToken(m.status)]),
  )
}

function childTables(brief, children = {}) {
  return {
    tolerances: tolerancesTable(brief, children.tolerances || []),
    products: productsTable(children.products),
    roles: rolesTable(children.roles),
    references: referencesTable(children.references),
    milestones: milestonesTable(children.milestones),
  }
}

/**
 * @param {object} brief
 * @param {{ tolerances?: object[], products?: object[], roles?: object[], references?: object[] }} [children]
 */
export function buildBriefExportSections(brief = {}, children = {}) {
  const t = childTables(brief, children)
  return withFieldExtras(BRIEF_EXPORT_SECTIONS, {
    project_tolerances: { table: t.tolerances },
    products_summary: { table: t.products },
    roles_summary: { table: t.roles },
    references_summary: { table: t.references },
    milestones_summary: { table: t.milestones },
  })
}

export function buildBriefExportRecord(brief = {}, children = {}) {
  const t = childTables(brief, children)
  const record = { ...brief }
  for (const key of LIST_KEYS) record[key] = listText(brief[key])
  return {
    ...record,
    project_tolerances: children.tolerances?.length ? tableLines(t.tolerances) : listText(brief.project_tolerances),
    dis_benefits_included_label: yesNo(brief.dis_benefits_included),
    solution_type_label: humanizeToken(brief.solution_type),
    delivery_approach_label: humanizeToken(brief.delivery_approach),
    development_approach_label: humanizeToken(brief.development_approach),
    lessons_learned_reviewed_label: yesNo(brief.lessons_learned_reviewed),
    products_summary: tableLines(t.products),
    roles_summary: tableLines(t.roles),
    milestones_summary: tableLines(t.milestones),
    references_summary: tableLines(t.references),
  }
}
