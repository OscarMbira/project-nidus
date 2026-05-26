/**
 * Generate SQL/v629_process_templates_new_tables.sql
 * Run: node scripts/generate-v629-sql.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const TABLES = [
  { name: 'project_charters', ref: 'PCH', desc: 'PMBOK Project Charter templates', extra: '' },
  { name: 'assumption_logs', ref: 'ASM', desc: 'Assumption log templates', extra: '' },
  { name: 'project_management_plans', ref: 'PMP', desc: 'Project Management Plan templates', extra: '' },
  { name: 'requirements_management_plans', ref: 'RMP', desc: 'Requirements Management Plan templates', extra: '' },
  { name: 'requirements_documentation', ref: 'RDOC', desc: 'Requirements documentation templates', extra: '' },
  { name: 'wbs_dictionary_entries', ref: 'WBS-D', desc: 'WBS dictionary entries linked to WBS nodes', extra: 'wbs_node_id uuid' },
  { name: 'activity_attributes', ref: 'AA', desc: 'Activity attributes linked to activity list', extra: 'activity_id uuid' },
  { name: 'activity_resource_requirements', ref: 'ARR', desc: 'Activity resource requirements', extra: 'activity_id uuid' },
  { name: 'resource_breakdown_structure', ref: 'RBS', desc: 'Resource Breakdown Structure templates', extra: '' },
  { name: 'activity_duration_estimates', ref: 'ADE', desc: 'Activity duration estimates', extra: 'activity_id uuid' },
  { name: 'cost_management_plans', ref: 'CMP', desc: 'Cost Management Plan templates', extra: '' },
  { name: 'activity_cost_estimates', ref: 'ACE', desc: 'Activity cost estimates', extra: 'activity_id uuid' },
  { name: 'cost_baselines', ref: 'CBL', desc: 'Cost baseline templates', extra: '' },
  { name: 'resource_management_plans', ref: 'RMP2', desc: 'Resource Management Plan templates', extra: '' },
  { name: 'stakeholder_engagement_plans', ref: 'SEP', desc: 'Stakeholder Engagement Plan templates', extra: '' },
  { name: 'procurement_management_plans', ref: 'PRCMP', desc: 'Procurement Management Plan templates', extra: '' },
  { name: 'quality_checklists', ref: 'QCL', desc: 'Quality checklist headers', extra: '' },
  { name: 'team_performance_assessments', ref: 'TPA', desc: 'Team performance assessment templates', extra: '' },
  { name: 'make_or_buy_decisions', ref: 'MOB', desc: 'Make-or-buy decision log entries', extra: '' },
  { name: 'variance_analysis_reports', ref: 'VAR', desc: 'Variance analysis report templates', extra: '' },
  { name: 'evm_status_reports', ref: 'EVM', desc: 'Earned value status report templates', extra: '' },
  { name: 'scope_acceptance_forms', ref: 'SAF', desc: 'Scope validation and deliverable acceptance forms', extra: '' },
  { name: 'project_closure_checklists', ref: 'PCL', desc: 'Project closure checklist headers', extra: '' },
  { name: 'contract_closure_documents', ref: 'CCD', desc: 'Contract closure document templates', extra: '' },
]

const ITEM_TABLES = [
  { name: 'quality_checklist_items', parent: 'quality_checklists', desc: 'Line items for quality checklists' },
  { name: 'project_closure_checklist_items', parent: 'project_closure_checklist_items', desc: 'Line items for project closure checklists' },
]

// fix parent for closure items
ITEM_TABLES[1].parent = 'project_closure_checklists'

function tableDDL(schema, table, ref, extra, projectCol, projectRef) {
  const fq = `${schema}.${table.name}`
  const extraCols = extra ? `\n  ${extra.trim()}` : ''
  return `
-- ${table.desc}
CREATE TABLE IF NOT EXISTS ${fq} (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ${projectCol} uuid NOT NULL REFERENCES ${projectRef} ON DELETE CASCADE,
  account_id uuid,
  reference_code text,
  title text NOT NULL DEFAULT 'Untitled',
  description text,
  document_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'on_hold')),
  is_master boolean NOT NULL DEFAULT false,
  master_id uuid,
  copied_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false${extraCols ? ',' + extraCols : ''}
);

CREATE INDEX IF NOT EXISTS idx_${table.name}_project ON ${fq}(${projectCol}) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_${table.name}_status ON ${fq}(status) WHERE is_deleted = false;

ALTER TABLE ${fq} ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "${table.name}_select" ON ${fq};
CREATE POLICY "${table.name}_select" ON ${fq} FOR SELECT USING (
  ${schema === 'public'
    ? `EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = ${fq}.${projectCol} AND up.user_id = auth.uid() AND up.is_deleted = false)`
    : `${fq}.created_by = auth.uid() OR ${fq}.${projectCol} IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())`}
);

DROP POLICY IF EXISTS "${table.name}_insert" ON ${fq};
CREATE POLICY "${table.name}_insert" ON ${fq} FOR INSERT WITH CHECK (
  ${schema === 'public'
    ? `EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = ${fq}.${projectCol} AND up.user_id = auth.uid() AND up.is_deleted = false)`
    : `${fq}.${projectCol} IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())`}
);

DROP POLICY IF EXISTS "${table.name}_update" ON ${fq};
CREATE POLICY "${table.name}_update" ON ${fq} FOR UPDATE USING (
  ${schema === 'public'
    ? `created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.user_projects up WHERE up.project_id = ${fq}.${projectCol} AND up.user_id = auth.uid() AND up.is_deleted = false)`
    : `created_by = auth.uid() OR ${fq}.${projectCol} IN (SELECT id FROM sim.practice_projects WHERE user_id = auth.uid())`}
);

DROP POLICY IF EXISTS "${table.name}_delete" ON ${fq};
CREATE POLICY "${table.name}_delete" ON ${fq} FOR DELETE USING (created_by = auth.uid());
`
}

function itemTableDDL(schema, item, projectCol) {
  const fq = `${schema}.${item.name}`
  const parentFq = `${schema}.${item.parent}`
  return `
CREATE TABLE IF NOT EXISTS ${fq} (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid NOT NULL REFERENCES ${parentFq}(id) ON DELETE CASCADE,
  item_order integer NOT NULL DEFAULT 1,
  item_text text NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_deleted boolean NOT NULL DEFAULT false
);

ALTER TABLE ${fq} ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "${item.name}_all" ON ${fq};
CREATE POLICY "${item.name}_all" ON ${fq} FOR ALL USING (
  EXISTS (SELECT 1 FROM ${parentFq} p WHERE p.id = ${fq}.checklist_id)
);
`
}

let sql = `-- v629: Process Templates — new PMBOK template tables (Platform public + Simulator sim)
-- Date: 2026-05-26
-- Registers all tables in database_tables registry

`

sql += `-- ── Platform (public schema) ───────────────────────────────────────────────\n`
for (const t of TABLES) {
  sql += tableDDL('public', t, t.ref, t.extra, 'project_id', 'public.projects(id)')
}
for (const it of ITEM_TABLES) {
  sql += itemTableDDL('public', it)
}

sql += `\n-- ── Simulator (sim schema) ───────────────────────────────────────────────\n`
for (const t of TABLES) {
  sql += tableDDL('sim', t, t.ref, t.extra.replace('activity_id', 'activity_id').replace('wbs_node_id', 'wbs_node_id'), 'practice_project_id', 'sim.practice_projects(id)')
}
for (const it of ITEM_TABLES) {
  sql += itemTableDDL('sim', it, 'practice_project_id')
}

sql += `\n-- ── database_tables registry ─────────────────────────────────────────────\n`
const registry = [
  ...TABLES.map((t) => `('${t.name}', '${t.desc.replace(/'/g, "''")}', false, true)`),
  ...ITEM_TABLES.map((t) => `('${t.name}', '${t.desc.replace(/'/g, "''")}', false, true)`),
]
sql += `INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES\n  ${registry.join(',\n  ')}
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();
`

const out = path.join(__dirname, '..', 'SQL', 'v629_process_templates_new_tables.sql')
fs.writeFileSync(out, sql, 'utf8')
console.log('Wrote', out)
