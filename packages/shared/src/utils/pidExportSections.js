/**
 * Project Initiation Document — record export sections (rule 38.1), in the order of the PID tabs.
 * Single values form Detail | Value tables; objectives, interfaces, dependencies, team, tolerances
 * and reporting arrangements are real tables. Flat exports read buildPidExportRecord().
 */

import { compactTable, humanizeToken, listText, tableLines, withFieldExtras } from './recordExportHelpers'

export const PID_EXPORT_SECTIONS = [
  { title: 'Basic Information', fields: [
    { key: 'pid_reference', label: 'Reference', fact: true },
    { key: 'pid_title', label: 'Title', fact: true },
    { key: 'version_number', label: 'Version', fact: true },
    { key: 'release', label: 'Release', fact: true },
    { key: 'status', label: 'Status', fact: true },
    { key: 'author_name', label: 'Author', fact: true },
    { key: 'owner_name', label: 'Owner', fact: true },
    { key: 'approved_date', label: 'Approved Date', fact: true },
  ]},
  { title: 'Overview', fields: [
    { key: 'pid_description', label: 'Description' },
    { key: 'project_background', label: 'Background' },
    { key: 'project_justification', label: 'Justification' },
  ]},
  { title: 'Project Definition', fields: [
    { key: 'project_definition', label: 'Project Definition' },
    { key: 'project_scope', label: 'Project Scope' },
    { key: 'exclusions', label: 'Exclusions' },
    { key: 'success_criteria', label: 'Success Criteria' },
    { key: 'project_outcomes', label: 'Outcomes' },
    { key: 'expected_benefits', label: 'Expected Benefits' },
  ]},
  { title: 'Objectives', fields: [
    { key: 'project_objectives', label: 'Objectives' },
    { key: 'objectives_summary', label: 'Objective Details' },
  ]},
  { title: 'Interfaces', fields: [
    { key: 'interfaces', label: 'Interfaces' },
    { key: 'interfaces_summary', label: 'Interface Details' },
  ]},
  { title: 'Dependencies', fields: [
    { key: 'dependencies', label: 'Dependencies' },
    { key: 'dependencies_summary', label: 'Dependency Details' },
  ]},
  { title: 'Approach', fields: [
    { key: 'project_approach', label: 'Project Approach' },
    { key: 'development_approach', label: 'Development Approach' },
    { key: 'quality_approach', label: 'Quality Approach' },
    { key: 'risk_approach', label: 'Risk Approach' },
    { key: 'configuration_management_approach', label: 'Configuration Management Approach' },
    { key: 'communication_approach', label: 'Communication Approach' },
    { key: 'change_control_approach', label: 'Change Control Approach' },
    { key: 'procurement_approach', label: 'Procurement Approach' },
  ]},
  { title: 'Team Structure', fields: [{ key: 'team_summary', label: 'Team' }] },
  { title: 'Tolerances', fields: [
    { key: 'tolerance_levels', label: 'Tolerance Levels' },
    { key: 'tolerances_summary', label: 'Tolerance Details' },
  ]},
  { title: 'Reporting', fields: [
    { key: 'reporting_arrangements', label: 'Reporting Arrangements' },
    { key: 'reporting_summary', label: 'Reports' },
  ]},
  { title: 'Controls', fields: [
    { key: 'monitoring_and_control', label: 'Monitoring and Control' },
    { key: 'control_mechanisms', label: 'Control Mechanisms' },
    { key: 'stage_boundary_reviews', label: 'Stage Boundary Reviews' },
  ]},
  { title: 'Plans', fields: [
    { key: 'project_plan_summary', label: 'Project Plan Summary' },
    { key: 'stage_plan_summary', label: 'Stage Plan Summary' },
    { key: 'timeline_summary', label: 'Timeline Summary' },
    { key: 'budget_summary', label: 'Budget Summary' },
  ]},
]

const LIST_KEYS = ['project_objectives', 'success_criteria', 'tolerance_levels', 'reporting_arrangements']

function childTables(children = {}) {
  return {
    objectives: compactTable(
      ['Objective', 'Category', 'Priority', 'Target', 'Success Criteria', 'Measurement'],
      (children.objectives || []).map((o) => [
        [o.objective_reference, o.objective_title].filter(Boolean).join(' ') || o.objective_description || 'Objective',
        humanizeToken(o.objective_category),
        humanizeToken(o.priority),
        o.target_value,
        o.success_criteria,
        o.measurement_method,
      ]),
    ),
    interfaces: compactTable(
      ['Interface', 'Type', 'Contact', 'Impact', 'How It Is Managed'],
      (children.interfaces || []).map((i) => [
        i.interface_name || 'Interface',
        humanizeToken(i.interface_type),
        i.interface_contact,
        i.interface_impact,
        i.management_arrangement,
      ]),
    ),
    dependencies: compactTable(
      ['Dependency', 'Type', 'Owner', 'Status', 'Expected Date', 'Impact', 'Mitigation'],
      (children.dependencies || []).map((d) => [
        d.dependency_name || d.dependency_description || 'Dependency',
        humanizeToken(d.dependency_type),
        d.dependency_owner,
        humanizeToken(d.dependency_status),
        d.expected_date,
        d.dependency_impact,
        d.mitigation_plan,
      ]),
    ),
    team: compactTable(
      ['Role', 'Assigned To', 'Role Type', 'Responsibilities', 'Authority'],
      (children.teamMembers || []).map((m) => [
        m.role_name || 'Role',
        m.assigned_user_name,
        humanizeToken(m.role_type),
        m.responsibilities || m.role_description,
        m.authority_level,
      ]),
    ),
    tolerances: compactTable(
      ['Tolerance', 'Level', 'Description', 'Measurement', 'Exception Process'],
      (children.tolerances || []).map((t) => [
        humanizeToken(t.tolerance_type) || 'Tolerance',
        t.tolerance_level,
        t.tolerance_description,
        t.measurement_method,
        t.exception_process,
      ]),
    ),
    reporting: compactTable(
      ['Report', 'Frequency', 'Owner', 'Recipients', 'Format'],
      (children.reportingArrangements || []).map((r) => [
        humanizeToken(r.report_type) || 'Report',
        humanizeToken(r.report_frequency),
        r.report_owner,
        listText(r.report_recipients),
        r.report_format,
      ]),
    ),
  }
}

/**
 * @param {object} pid
 * @param {{ objectives?, interfaces?, dependencies?, teamMembers?, tolerances?, reportingArrangements? }} [children]
 */
export function buildPidExportSections(_pid = {}, children = {}) {
  const t = childTables(children)
  return withFieldExtras(PID_EXPORT_SECTIONS, {
    objectives_summary: { table: t.objectives },
    interfaces_summary: { table: t.interfaces },
    dependencies_summary: { table: t.dependencies },
    team_summary: { table: t.team },
    tolerances_summary: { table: t.tolerances },
    reporting_summary: { table: t.reporting },
  })
}

export function buildPidExportRecord(pid = {}, children = {}) {
  const t = childTables(children)
  const record = { ...pid, title: pid.pid_title }
  for (const key of LIST_KEYS) record[key] = listText(pid[key])
  return {
    ...record,
    objectives_summary: tableLines(t.objectives),
    interfaces_summary: tableLines(t.interfaces),
    dependencies_summary: tableLines(t.dependencies),
    team_summary: tableLines(t.team),
    tolerances_summary: tableLines(t.tolerances),
    reporting_summary: tableLines(t.reporting),
  }
}
