/**
 * Project Mandate — record export sections (rule 38.1).
 * Short facts → Detail | Value; opted-in lists → `# | Item`; long prose → heading + paragraph;
 * constraints / documents / stakeholders / dependencies / deliverables → real tables.
 */

import { cellText, compactTable, listText, tableLines, withFieldExtras, humanizeToken } from './recordExportHelpers'

export const MANDATE_EXPORT_SECTIONS = [
  { title: 'Basic Information', fields: [
    { key: 'mandate_reference', label: 'Reference', fact: true },
    { key: 'mandate_title', label: 'Title', fact: true },
    { key: 'version_number', label: 'Version', fact: true },
    { key: 'created_date', label: 'Created Date', fact: true },
    { key: 'document_status', label: 'Status', fact: true },
    { key: 'project_created_date', label: 'Project Created Date', fact: true },
  ]},
  { title: '1. Purpose', fields: [{ key: 'purpose', label: 'Purpose' }] },
  { title: '2. Authority', fields: [{ key: 'authority_responsible', label: 'Authority Responsible', itemColumnLabel: 'Authority' }] },
  { title: '3. Background', fields: [{ key: 'background', label: 'Background' }] },
  { title: '4. Project Objectives', fields: [{ key: 'project_objectives', label: 'Objectives', itemColumnLabel: 'Objective' }] },
  { title: '5. Scope', fields: [
    { key: 'scope', label: 'In-Scope', itemColumnLabel: 'In scope' },
    { key: 'scope_exclusions', label: 'Out-of-Scope Exclusions', itemColumnLabel: 'Exclusion' },
  ]},
  { title: '6. Constraints', fields: [{ key: 'constraints_summary', label: 'Constraints' }] },
  { title: '7. Interfaces', fields: [{ key: 'interfaces', label: 'Interfaces', itemColumnLabel: 'Interface' }] },
  { title: '8. Quality Expectations', fields: [
    { key: 'quality_priority_label', label: 'Quality Priority', fact: true },
    { key: 'quality_expectations', label: 'Quality Expectations', itemColumnLabel: 'Expectation' },
  ]},
  { title: '9. Outline Business Case', fields: [{ key: 'outline_business_case', label: 'Outline Business Case' }] },
  { title: '10. Associated Documents', fields: [{ key: 'associated_documents_summary', label: 'Associated Documents' }] },
  { title: '11. Proposed Roles', fields: [
    { key: 'proposed_executive_name', label: 'Proposed Executive', fact: true },
    { key: 'proposed_pm_name', label: 'Proposed Project Manager', fact: true },
  ]},
  { title: '12. Customers, Users and Stakeholders', fields: [{ key: 'stakeholders_summary', label: 'Customers, Users and Stakeholders' }] },
  { title: '13. Dependencies', fields: [{ key: 'dependencies_summary', label: 'Dependencies' }] },
  { title: '14. Assumptions', fields: [{ key: 'assumptions', label: 'Assumptions', itemColumnLabel: 'Assumption' }] },
  { title: '15. Known Risks and Issues', fields: [{ key: 'outline_risks', label: 'Known Risks and Issues', itemColumnLabel: 'Risk / issue' }] },
  { title: '16. Key Deliverables', fields: [{ key: 'deliverables_summary', label: 'Key Deliverables' }] },
]

const OPERAND_SYMBOLS = { '=': '=', '<': '<', '<=': '≤', '>': '>', '>=': '≥' }

/** Display value of a typed mandate constraint (same rules as ConstraintListItem). */
export function mandateConstraintValue(c = {}) {
  const type = c.constraint_category?.value_type
  const unit = c.unit || ''
  if (type === 'numeric') {
    if (c.operand === 'between') return `${unit} ${c.value_min ?? 0} – ${c.value_max ?? 0}`.trim()
    return `${OPERAND_SYMBOLS[c.operand] || ''} ${unit}${c.value_numeric ?? 0}`.trim()
  }
  if (type === 'date') return cellText(c.value_date)
  return cellText(c.value_text)
}

function constraintsTable(constraints = []) {
  return compactTable(
    ['Constraint', 'Value', 'Notes'],
    constraints.map((c) => [
      [c.constraint_category?.code, c.constraint_category?.name].filter(Boolean).join(' ') || 'Constraint',
      mandateConstraintValue(c),
      c.notes,
    ]),
  )
}

function documentsTable(documents = []) {
  return compactTable(
    ['Document', 'Type', 'Reference', 'Link'],
    documents.map((d) => [d.document_title || 'Document', d.document_type, d.reference_number, d.document_url]),
  )
}

function stakeholdersTable(stakeholders = []) {
  return compactTable(
    ['Name', 'Type', 'Organisation', 'Role', 'Email', 'Primary'],
    stakeholders.map((s) => [
      s.stakeholder_name || 'Stakeholder',
      humanizeToken(s.stakeholder_type),
      s.stakeholder_organisation,
      s.stakeholder_role,
      s.contact_email,
      s.is_primary ? 'Yes' : '',
    ]),
  )
}

function dependenciesTable(dependencies = []) {
  return compactTable(
    ['Dependency', 'Type', 'During project', 'After implementation', 'Status'],
    dependencies.map((d) => [
      d.dependency_description || 'Dependency',
      humanizeToken(d.dependency_type),
      d.impact_during_project ? 'Yes' : 'No',
      d.impact_after_implementation ? 'Yes' : 'No',
      humanizeToken(d.dependency_status),
    ]),
  )
}

function deliverablesTable(deliverables = []) {
  return compactTable(
    ['Deliverable', 'Timeframe', 'In scope', 'Major'],
    deliverables.map((d) => [
      d.deliverable_name || 'Deliverable',
      d.estimated_completion,
      d.is_in_scope === false ? 'No' : 'Yes',
      d.is_major_deliverable === false ? 'No' : 'Yes',
    ]),
  )
}

function childTables(children = {}) {
  return {
    constraints: constraintsTable(children.constraints),
    documents: documentsTable(children.documents),
    stakeholders: stakeholdersTable(children.stakeholders),
    dependencies: dependenciesTable(children.dependencies),
    deliverables: deliverablesTable(children.deliverables),
  }
}

/**
 * @param {object} mandate
 * @param {{ constraints?: object[], documents?: object[], stakeholders?: object[], dependencies?: object[], deliverables?: object[] }} [children]
 */
export function buildMandateExportSections(_mandate = {}, children = {}) {
  const t = childTables(children)
  return withFieldExtras(MANDATE_EXPORT_SECTIONS, {
    constraints_summary: { table: t.constraints },
    associated_documents_summary: { table: t.documents },
    stakeholders_summary: { table: t.stakeholders },
    dependencies_summary: { table: t.dependencies },
    deliverables_summary: { table: t.deliverables },
  })
}

/** Mandate flattened for exports: lists as one item per line, child rows as "cell – cell" lines. */
export function buildMandateExportRecord(mandate = {}, children = {}) {
  const t = childTables(children)
  return {
    ...mandate,
    authority_responsible: listText(mandate.authority_responsible),
    project_objectives: listText(mandate.project_objectives),
    scope: listText(mandate.scope),
    scope_exclusions: listText(mandate.scope_exclusions),
    interfaces: listText(mandate.interfaces),
    quality_expectations: listText(mandate.quality_expectations),
    quality_priority_label: humanizeToken(mandate.quality_priority),
    constraints_summary: t.constraints ? tableLines(t.constraints) : listText(mandate.constraints),
    associated_documents_summary: tableLines(t.documents),
    stakeholders_summary: tableLines(t.stakeholders),
    dependencies_summary: tableLines(t.dependencies),
    assumptions: listText(mandate.assumptions),
    outline_risks: listText(mandate.outline_risks),
    deliverables_summary: tableLines(t.deliverables),
  }
}
