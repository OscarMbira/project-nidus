#!/usr/bin/env node
/**
 * Generates v633/v634 process template master seed SQL files.
 * Run: node scripts/generate-v633-process-templates-seed.mjs
 */
import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const MASTERS = [
  { table: 'project_charters', ref: 'PCH', slug: 'project-charter', group: 'initiating', title: 'Project Charter Master Template', description: 'Standard PMBOK project charter for authorising a new project or phase.', sections: ['Purpose', 'High-Level Requirements', 'Project Objectives', 'Success Criteria', 'High-Level Risks', 'Summary Milestone Schedule', 'Summary Budget', 'Project Approval Requirements'] },
  { table: 'assumption_logs', ref: 'ASM', slug: 'assumption-log', group: 'initiating', title: 'Assumption Log Master Template', description: 'Register assumptions, constraints, and their impact throughout the project lifecycle.', sections: ['Assumption ID', 'Description', 'Category', 'Impact if Invalid', 'Owner', 'Status', 'Review Date'] },
  { table: 'project_management_plans', ref: 'PMP', slug: 'project-management-plan', group: 'planning', title: 'Project Management Plan Master Template', description: 'Integrates subsidiary management plans and baselines for the project.', sections: ['Introduction', 'Subordinate Plans', 'Baselines', 'Configuration Management', 'Change Control', 'Performance Measurement'] },
  { table: 'requirements_management_plans', ref: 'RMP', slug: 'requirements-management-plan', group: 'planning', title: 'Requirements Management Plan Master Template', description: 'Defines how requirements will be analysed, documented, and managed.', sections: ['Scope', 'Roles', 'Traceability Approach', 'Workflow', 'Configuration', 'Metrics'] },
  { table: 'requirements_documentation', ref: 'RDOC', slug: 'requirements-documentation', group: 'planning', title: 'Requirements Documentation Master Template', description: 'Structured capture of business, stakeholder, solution, and transition requirements.', sections: ['Business Requirements', 'Stakeholder Requirements', 'Solution Requirements', 'Functional Requirements', 'Non-Functional Requirements', 'Transition Requirements'] },
  { table: 'wbs_dictionary_entries', ref: 'WBS-D', slug: 'wbs-dictionary', group: 'planning', title: 'WBS Dictionary Master Template', description: 'Template for describing WBS elements including work, deliverables, and acceptance criteria.', sections: ['WBS Code', 'Description', 'Assumptions', 'Constraints', 'Responsible Organisation', 'Milestones', 'Deliverables', 'Acceptance Criteria'] },
  { table: 'activity_attributes', ref: 'AA', slug: 'activity-attributes', group: 'planning', title: 'Activity Attributes Master Template', description: 'Standard attributes to document for schedule activities.', sections: ['Activity ID', 'Activity Name', 'Activity Type', 'Predecessors', 'Successors', 'Logical Relationships', 'Leads and Lags', 'Resource Requirements'] },
  { table: 'activity_resource_requirements', ref: 'ARR', slug: 'activity-resource-requirements', group: 'planning', title: 'Activity Resource Requirements Master Template', description: 'Documents types and quantities of resources required for activities.', sections: ['Activity Reference', 'Resource Type', 'Skill Level', 'Quantity', 'Location', 'Duration', 'Notes'] },
  { table: 'resource_breakdown_structure', ref: 'RBS', slug: 'resource-breakdown-structure', group: 'planning', title: 'Resource Breakdown Structure Master Template', description: 'Hierarchical representation of project resources by category.', sections: ['RBS Code', 'Resource Category', 'Description', 'Organisational Unit', 'Availability', 'Cost Rate'] },
  { table: 'activity_duration_estimates', ref: 'ADE', slug: 'activity-duration-estimates', group: 'planning', title: 'Activity Duration Estimates Master Template', description: 'Template for documenting duration estimates and supporting rationale.', sections: ['Activity Reference', 'Estimate Type', 'Optimistic', 'Most Likely', 'Pessimistic', 'Expected Duration', 'Assumptions', 'Constraints'] },
  { table: 'cost_management_plans', ref: 'CMP', slug: 'cost-management-plan', group: 'planning', title: 'Cost Management Plan Master Template', description: 'Defines how project costs will be planned, structured, and controlled.', sections: ['Units of Measure', 'Precision', 'Organisational Procedures', 'Reporting', 'Variance Thresholds', 'Performance Measurement'] },
  { table: 'activity_cost_estimates', ref: 'ACE', slug: 'activity-cost-estimates', group: 'planning', title: 'Activity Cost Estimates Master Template', description: 'Template for quantifying cost of scheduled activities.', sections: ['Activity Reference', 'Resource Costs', 'Material Costs', 'Other Direct Costs', 'Contingency', 'Total Estimate', 'Basis of Estimate'] },
  { table: 'cost_baselines', ref: 'CBL', slug: 'cost-baseline', group: 'planning', title: 'Cost Baseline Master Template', description: 'Approved time-phased budget used as basis for comparison.', sections: ['Baseline Version', 'Funding Requirements', 'Control Accounts', 'Work Package Budgets', 'Management Reserve', 'Approval Record'] },
  { table: 'resource_management_plans', ref: 'RMP2', slug: 'resource-management-plan', group: 'planning', title: 'Resource Management Plan Master Template', description: 'Defines how physical and team resources will be estimated, acquired, and managed.', sections: ['Identification', 'Acquisition', 'Roles and Responsibilities', 'Training', 'Release Criteria', 'Performance Control'] },
  { table: 'procurement_management_plans', ref: 'PRCMP', slug: 'procurement-management-plan', group: 'planning', title: 'Procurement Management Plan Master Template', description: 'Documents procurement decisions, approach, and contract types.', sections: ['Make-or-Buy Decisions', 'Contract Types', 'Procurement Documents', 'Source Selection', 'Contract Change Control', 'Performance Monitoring'] },
  { table: 'stakeholder_engagement_plans', ref: 'SEP', slug: 'stakeholder-engagement-plan', group: 'planning', title: 'Stakeholder Engagement Plan Master Template', description: 'Strategy for engaging stakeholders throughout the project.', sections: ['Stakeholder Register Reference', 'Engagement Levels', 'Engagement Actions', 'Communication Requirements', 'Monitoring Approach'] },
  { table: 'quality_checklists', ref: 'QCL', slug: 'quality-checklists', group: 'executing', title: 'Quality Checklist Master Template', description: 'Standard quality verification checklist for deliverables and work packages.', sections: ['Deliverable Reference', 'Quality Standards', 'Inspection Steps', 'Acceptance Criteria', 'Sign-off'], hasItems: true, items: ['Deliverable meets documented acceptance criteria', 'Quality standards and metrics verified', 'Inspection or review completed', 'Non-conformances identified and resolved', 'Required approvals and sign-off obtained'] },
  { table: 'team_performance_assessments', ref: 'TPA', slug: 'team-performance-assessment', group: 'executing', title: 'Team Performance Assessment Master Template', description: 'Template for evaluating team performance against project objectives.', sections: ['Assessment Period', 'Team Objectives', 'Performance Indicators', 'Observations', 'Improvement Actions', 'Acknowledgement'] },
  { table: 'make_or_buy_decisions', ref: 'MOB', slug: 'make-or-buy-decision', group: 'executing', title: 'Make-or-Buy Decision Log Master Template', description: 'Records make-or-buy analysis and decisions for project deliverables.', sections: ['Item or Deliverable', 'Make Option Analysis', 'Buy Option Analysis', 'Decision', 'Rationale', 'Decision Date', 'Approver'] },
  { table: 'variance_analysis_reports', ref: 'VAR', slug: 'variance-analysis-report', group: 'monitoring-controlling', title: 'Variance Analysis Report Master Template', description: 'Template for reporting schedule, cost, and scope variances.', sections: ['Reporting Period', 'Baseline Reference', 'Schedule Variance', 'Cost Variance', 'Scope Variance', 'Root Causes', 'Corrective Actions'] },
  { table: 'evm_status_reports', ref: 'EVM', slug: 'evm-status-report', group: 'monitoring-controlling', title: 'Earned Value Status Report Master Template', description: 'Standard EVM performance report (PV, EV, AC, CPI, SPI, EAC, ETC).', sections: ['Control Account', 'Planned Value (PV)', 'Earned Value (EV)', 'Actual Cost (AC)', 'CPI / SPI', 'EAC / ETC', 'Variance Narrative'] },
  { table: 'scope_acceptance_forms', ref: 'SAF', slug: 'scope-acceptance-form', group: 'monitoring-controlling', title: 'Scope Validation / Deliverable Acceptance Master Template', description: 'Formal acceptance of completed deliverables against scope baseline.', sections: ['Deliverable ID', 'Description', 'Acceptance Criteria', 'Verification Method', 'Acceptance Decision', 'Accepted By', 'Acceptance Date'] },
  { table: 'project_closure_checklists', ref: 'PCL', slug: 'project-closure-checklist', group: 'closing', title: 'Project Closure Checklist Master Template', description: 'Checklist for completing all closing activities before formal project closure.', sections: ['Deliverable Acceptance', 'Financial Closure', 'Procurement Closure', 'Lessons Learned', 'Resource Release', 'Archive'], hasItems: true, items: ['All deliverables formally accepted', 'Final invoices and payments processed', 'Contracts and procurements closed', 'Lessons learned captured and shared', 'Project resources released', 'Project records archived', 'Formal closure approval obtained'] },
  { table: 'contract_closure_documents', ref: 'CCD', slug: 'contract-closure-document', group: 'closing', title: 'Contract Closure Document Master Template', description: 'Documents completion of contractual obligations and final settlement.', sections: ['Contract Reference', 'Vendor / Supplier', 'Deliverables Status', 'Final Payments', 'Open Issues', 'Release of Claims', 'Closure Approval'] },
]

function docJson(m) {
  return JSON.stringify({
    seed_marker: 'SEED633',
    template_slug: m.slug,
    pmbok_group: m.group,
    sections: m.sections,
    notes: `PMO master template scaffold for ${m.title}. Copy to a project workspace and customise.`,
  })
}

function platformSeed() {
  const lines = []
  lines.push(`-- =============================================================================
-- v633_process_templates_master_seed_data.sql
-- PMO organisation master templates for all 24 v629 process template tables.
-- Prerequisites: v629_process_templates_new_tables.sql, v632_process_templates_nullable_project_for_masters.sql
-- Idempotent: reference_code LIKE 'SEED633-%' — deleted and re-inserted on each run.
-- PostgreSQL 15+ / Supabase public schema
-- =============================================================================

DO $$
DECLARE
  v_account_id   UUID;
  v_created_by   UUID;
  v_qcl_id       UUID;
  v_pcl_id       UUID;
BEGIN
  SELECT a.id INTO v_account_id
  FROM public.accounts a
  WHERE COALESCE(a.is_deleted, FALSE) = FALSE
  ORDER BY a.created_at ASC NULLS LAST
  LIMIT 1;

  SELECT u.auth_user_id INTO v_created_by
  FROM public.users u
  INNER JOIN auth.users au ON au.id = u.auth_user_id
  WHERE COALESCE(u.is_deleted, FALSE) = FALSE
  ORDER BY u.created_at ASC NULLS LAST
  LIMIT 1;

  IF v_created_by IS NULL THEN
    SELECT au.id INTO v_created_by
    FROM auth.users au
    ORDER BY au.created_at ASC NULLS LAST
    LIMIT 1;
  END IF;

  IF v_account_id IS NULL OR v_created_by IS NULL THEN
    RAISE NOTICE 'v633: No account or valid auth.users row — skip process template master seed.';
    RETURN;
  END IF;

  -- Remove prior seed rows (child items first)
  DELETE FROM public.quality_checklist_items
  WHERE checklist_id IN (SELECT id FROM public.quality_checklists WHERE reference_code LIKE 'SEED633-%');

  DELETE FROM public.project_closure_checklist_items
  WHERE checklist_id IN (SELECT id FROM public.project_closure_checklists WHERE reference_code LIKE 'SEED633-%');
`)

  for (const m of MASTERS) {
    lines.push(`  DELETE FROM public.${m.table} WHERE reference_code LIKE 'SEED633-%';`)
  }

  lines.push('')
  for (const m of MASTERS) {
    const refCode = `SEED633-${m.ref}-001`
    const extraCols = m.table === 'wbs_dictionary_entries' ? ', wbs_node_id' : ''
    const extraVals = m.table === 'wbs_dictionary_entries' ? ', NULL' : ''
    const linkCol = ['activity_attributes', 'activity_resource_requirements', 'activity_duration_estimates', 'activity_cost_estimates'].includes(m.table)
    const extraCols2 = linkCol ? ', activity_id' : ''
    const extraVals2 = linkCol ? ', NULL' : ''

    if (m.hasItems) {
      const varName = m.table === 'quality_checklists' ? 'v_qcl_id' : 'v_pcl_id'
      lines.push(`  INSERT INTO public.${m.table} (
    account_id, reference_code, title, description, document_data,
    status, is_master, project_id, created_by
  ) VALUES (
    v_account_id, '${refCode}', '${m.title.replace(/'/g, "''")}',
    '${m.description.replace(/'/g, "''")}',
    '${docJson(m).replace(/'/g, "''")}'::jsonb,
    'active', TRUE, NULL, v_created_by
  ) RETURNING id INTO ${varName};`)
      const itemsTable = m.table === 'quality_checklists' ? 'quality_checklist_items' : 'project_closure_checklist_items'
      m.items.forEach((text, i) => {
        lines.push(`  INSERT INTO public.${itemsTable} (checklist_id, item_order, item_text) VALUES (${varName}, ${i + 1}, '${text.replace(/'/g, "''")}');`)
      })
      lines.push('')
    } else {
      lines.push(`  INSERT INTO public.${m.table} (
    account_id, reference_code, title, description, document_data,
    status, is_master, project_id, created_by${extraCols}${extraCols2}
  ) VALUES (
    v_account_id, '${refCode}', '${m.title.replace(/'/g, "''")}',
    '${m.description.replace(/'/g, "''")}',
    '${docJson(m).replace(/'/g, "''")}'::jsonb,
    'active', TRUE, NULL, v_created_by${extraVals}${extraVals2}
  );`)
      lines.push('')
    }
  }

  lines.push(`  RAISE NOTICE 'v633: Seeded % process template masters.', ${MASTERS.length};`)
  lines.push(`END $$;`)
  lines.push('')
  return lines.join('\n')
}

function simSeed() {
  const lines = []
  lines.push(`-- =============================================================================
-- v634_sim_process_templates_master_seed_data.sql
-- Simulator (sim schema) parity — master templates for all 24 v629 process template tables.
-- Prerequisites: v629_process_templates_new_tables.sql, v632_process_templates_nullable_project_for_masters.sql
-- Idempotent: reference_code LIKE 'SEED634-%'
-- =============================================================================

DO $$
DECLARE
  v_created_by   UUID;
  v_qcl_id       UUID;
  v_pcl_id       UUID;
BEGIN
  SELECT pp.user_id INTO v_created_by
  FROM sim.practice_projects pp
  INNER JOIN auth.users au ON au.id = pp.user_id
  WHERE pp.user_id IS NOT NULL
  ORDER BY pp.created_at ASC NULLS LAST
  LIMIT 1;

  IF v_created_by IS NULL THEN
    SELECT u.auth_user_id INTO v_created_by
    FROM public.users u
    INNER JOIN auth.users au ON au.id = u.auth_user_id
    WHERE COALESCE(u.is_deleted, FALSE) = FALSE
    ORDER BY u.created_at ASC NULLS LAST
    LIMIT 1;
  END IF;

  IF v_created_by IS NULL THEN
    SELECT au.id INTO v_created_by
    FROM auth.users au
    ORDER BY au.created_at ASC NULLS LAST
    LIMIT 1;
  END IF;

  IF v_created_by IS NULL THEN
    RAISE NOTICE 'v634: No valid auth.users row — skip sim process template master seed.';
    RETURN;
  END IF;

  DELETE FROM sim.quality_checklist_items
  WHERE checklist_id IN (SELECT id FROM sim.quality_checklists WHERE reference_code LIKE 'SEED634-%');

  DELETE FROM sim.project_closure_checklist_items
  WHERE checklist_id IN (SELECT id FROM sim.project_closure_checklists WHERE reference_code LIKE 'SEED634-%');
`)

  for (const m of MASTERS) {
    lines.push(`  DELETE FROM sim.${m.table} WHERE reference_code LIKE 'SEED634-%';`)
  }

  lines.push('')
  for (const m of MASTERS) {
    const refCode = `SEED634-${m.ref}-001`
    const doc = docJson(m).replace(/SEED633/g, 'SEED634')
    const extraCols = m.table === 'wbs_dictionary_entries' ? ', wbs_node_id' : ''
    const extraVals = m.table === 'wbs_dictionary_entries' ? ', NULL' : ''
    const linkCol = ['activity_attributes', 'activity_resource_requirements', 'activity_duration_estimates', 'activity_cost_estimates'].includes(m.table)
    const extraCols2 = linkCol ? ', activity_id' : ''
    const extraVals2 = linkCol ? ', NULL' : ''

    if (m.hasItems) {
      const varName = m.table === 'quality_checklists' ? 'v_qcl_id' : 'v_pcl_id'
      lines.push(`  INSERT INTO sim.${m.table} (
    reference_code, title, description, document_data,
    status, is_master, practice_project_id, created_by
  ) VALUES (
    '${refCode}', '${m.title.replace(/'/g, "''")}',
    '${m.description.replace(/'/g, "''")}',
    '${doc.replace(/'/g, "''")}'::jsonb,
    'active', TRUE, NULL, v_created_by
  ) RETURNING id INTO ${varName};`)
      const itemsTable = m.table === 'quality_checklists' ? 'quality_checklist_items' : 'project_closure_checklist_items'
      m.items.forEach((text, i) => {
        lines.push(`  INSERT INTO sim.${itemsTable} (checklist_id, item_order, item_text) VALUES (${varName}, ${i + 1}, '${text.replace(/'/g, "''")}');`)
      })
      lines.push('')
    } else {
      lines.push(`  INSERT INTO sim.${m.table} (
    reference_code, title, description, document_data,
    status, is_master, practice_project_id, created_by${extraCols}${extraCols2}
  ) VALUES (
    '${refCode}', '${m.title.replace(/'/g, "''")}',
    '${m.description.replace(/'/g, "''")}',
    '${doc.replace(/'/g, "''")}'::jsonb,
    'active', TRUE, NULL, v_created_by${extraVals}${extraVals2}
  );`)
      lines.push('')
    }
  }

  lines.push(`  RAISE NOTICE 'v634: Seeded % sim process template masters.', ${MASTERS.length};`)
  lines.push(`END $$;`)
  lines.push('')
  return lines.join('\n')
}

function simMenuSeed() {
  return `-- =============================================================================
-- v635_sim_process_templates_sidebar_menu.sql
-- Simulator PMO + PM Process Templates sidebar menu_items (DB parity with Platform v629)
-- Run after v629_process_templates_new_tables.sql
-- =============================================================================

DO $$
DECLARE
  v_sim_pmo_parent UUID;
  v_sim_pm_parent UUID;
  v_role_id UUID;
BEGIN
  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES (
    'sim_pmo_process_templates_section',
    'Process Templates',
    'Simulator PMO — PMBOK process templates hub',
    NULL, 1, 75,
    NULL, 'layers', TRUE, TRUE
  )
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    menu_description = EXCLUDED.menu_description,
    sort_order = EXCLUDED.sort_order,
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  SELECT id INTO v_sim_pmo_parent FROM public.menu_items WHERE menu_code = 'sim_pmo_process_templates_section' LIMIT 1;

  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES
    ('sim_pmo_pt_hub',   'Hub Overview',         NULL, v_sim_pmo_parent, 2, 1, '/simulator/pmo/process-templates',                        'layers',       TRUE, TRUE),
    ('sim_pmo_pt_pre',   'Pre-Project',          NULL, v_sim_pmo_parent, 2, 2, '/simulator/pmo/process-templates/pre-project',            'file-text',    TRUE, TRUE),
    ('sim_pmo_pt_init',  'Initiating',           NULL, v_sim_pmo_parent, 2, 3, '/simulator/pmo/process-templates/initiating',             'play-circle',  TRUE, TRUE),
    ('sim_pmo_pt_plan',  'Planning',             NULL, v_sim_pmo_parent, 2, 4, '/simulator/pmo/process-templates/planning',               'map',          TRUE, TRUE),
    ('sim_pmo_pt_exec',  'Executing',            NULL, v_sim_pmo_parent, 2, 5, '/simulator/pmo/process-templates/executing',                'zap',          TRUE, TRUE),
    ('sim_pmo_pt_mon',   'Monitoring & Control', NULL, v_sim_pmo_parent, 2, 6, '/simulator/pmo/process-templates/monitoring-controlling',   'activity',     TRUE, TRUE),
    ('sim_pmo_pt_close', 'Closing',              NULL, v_sim_pmo_parent, 2, 7, '/simulator/pmo/process-templates/closing',                  'check-circle', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET
    parent_menu_id = EXCLUDED.parent_menu_id,
    route_path = EXCLUDED.route_path,
    sort_order = EXCLUDED.sort_order,
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES (
    'sim_pm_process_templates_section',
    'Process Templates',
    'Simulator PM — view masters and copy to practice workspace',
    NULL, 1, 145,
    NULL, 'layers', TRUE, TRUE
  )
  ON CONFLICT (menu_code) DO UPDATE SET
    menu_label = EXCLUDED.menu_label,
    sort_order = EXCLUDED.sort_order,
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  SELECT id INTO v_sim_pm_parent FROM public.menu_items WHERE menu_code = 'sim_pm_process_templates_section' LIMIT 1;

  INSERT INTO public.menu_items (
    menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order,
    route_path, menu_icon, is_visible, is_active
  ) VALUES
    ('sim_pm_pt_hub',   'Hub Overview',         NULL, v_sim_pm_parent, 2, 1, '/simulator/pm/process-templates',                        'layers',       TRUE, TRUE),
    ('sim_pm_pt_pre',   'Pre-Project',          NULL, v_sim_pm_parent, 2, 2, '/simulator/pm/process-templates/pre-project',            'file-text',    TRUE, TRUE),
    ('sim_pm_pt_init',  'Initiating',           NULL, v_sim_pm_parent, 2, 3, '/simulator/pm/process-templates/initiating',             'play-circle',  TRUE, TRUE),
    ('sim_pm_pt_plan',  'Planning',             NULL, v_sim_pm_parent, 2, 4, '/simulator/pm/process-templates/planning',               'map',          TRUE, TRUE),
    ('sim_pm_pt_exec',  'Executing',            NULL, v_sim_pm_parent, 2, 5, '/simulator/pm/process-templates/executing',                'zap',          TRUE, TRUE),
    ('sim_pm_pt_mon',   'Monitoring & Control', NULL, v_sim_pm_parent, 2, 6, '/simulator/pm/process-templates/monitoring-controlling',   'activity',     TRUE, TRUE),
    ('sim_pm_pt_close', 'Closing',              NULL, v_sim_pm_parent, 2, 7, '/simulator/pm/process-templates/closing',                  'check-circle', TRUE, TRUE)
  ON CONFLICT (menu_code) DO UPDATE SET
    parent_menu_id = EXCLUDED.parent_menu_id,
    route_path = EXCLUDED.route_path,
    sort_order = EXCLUDED.sort_order,
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  FOR v_role_id IN
    SELECT id FROM public.roles
    WHERE role_name IN ('pmo_admin', 'PMO Admin', 'system_admin', 'System Admin')
      AND COALESCE(is_active, TRUE) = TRUE
  LOOP
    INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code IN (
      'sim_pmo_process_templates_section',
      'sim_pmo_pt_hub', 'sim_pmo_pt_pre', 'sim_pmo_pt_init', 'sim_pmo_pt_plan',
      'sim_pmo_pt_exec', 'sim_pmo_pt_mon', 'sim_pmo_pt_close'
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  FOR v_role_id IN
    SELECT id FROM public.roles
    WHERE role_name IN ('project_manager', 'Project Manager')
      AND COALESCE(is_active, TRUE) = TRUE
  LOOP
    INSERT INTO public.role_menu_items (role_id, menu_item_id, can_view, can_use, is_active, is_deleted)
    SELECT v_role_id, mi.id, TRUE, TRUE, TRUE, FALSE
    FROM public.menu_items mi
    WHERE mi.menu_code IN (
      'sim_pm_process_templates_section',
      'sim_pm_pt_hub', 'sim_pm_pt_pre', 'sim_pm_pt_init', 'sim_pm_pt_plan',
      'sim_pm_pt_exec', 'sim_pm_pt_mon', 'sim_pm_pt_close'
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

END $$;
`
}

writeFileSync(join(root, 'SQL', 'v633_process_templates_master_seed_data.sql'), platformSeed(), 'utf8')
writeFileSync(join(root, 'SQL', 'v634_sim_process_templates_master_seed_data.sql'), simSeed(), 'utf8')
writeFileSync(join(root, 'SQL', 'v635_sim_process_templates_sidebar_menu.sql'), simMenuSeed(), 'utf8')

console.log('Generated:')
console.log('  SQL/v633_process_templates_master_seed_data.sql')
console.log('  SQL/v634_sim_process_templates_master_seed_data.sql')
console.log('  SQL/v635_sim_process_templates_sidebar_menu.sql')
