/**
 * v787 — Platform/Simulator process-template masters from Admin v189c + v191e.
 * Plan follow-up to v786 (forms already seeded).
 *
 * Run: node scripts/generate-v787-platform-sim-process-seeds.js
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createHash } from 'crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const adminSqlDir = process.env.ADMIN_SQL_DIR
  || path.join(root, '..', 'project-nidus-admin', 'SQL')
const outFile = path.join(root, 'SQL', 'v787_structured_agile_process_template_seeds.sql')

const SOURCE_FILES = [
  'v189c_structured_process_docs_strategies.sql',
  'v191e_agile_process_docs_approaches.sql',
]

const ALLOWED = new Set([
  'project_charters', 'assumption_logs', 'project_management_plans',
  'requirements_management_plans', 'requirements_documentation', 'wbs_dictionary_entries',
  'activity_attributes', 'activity_resource_requirements', 'resource_breakdown_structure',
  'activity_duration_estimates', 'cost_management_plans', 'activity_cost_estimates',
  'cost_baselines', 'resource_management_plans', 'stakeholder_engagement_plans',
  'procurement_management_plans', 'quality_checklists', 'team_performance_assessments',
  'make_or_buy_decisions', 'variance_analysis_reports', 'evm_status_reports',
  'scope_acceptance_forms', 'project_closure_checklists', 'contract_closure_documents',
])

function unescapeSqlString(s) {
  return String(s || '').replace(/''/g, "'")
}

/** Deterministic UUID from seed_key (hex-only style for seed stability). */
function uuidFromSeedKey(seedKey) {
  const h = createHash('sha256').update(`v787:${seedKey}`).digest('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`
}

function extractProcessRows(sqlText) {
  const rows = []
  const re = /\(\s*'([^']+)'::uuid,\s*'process_template',\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*'(structured|agile)',\s*'((?:[^']|'')*)'::jsonb/g
  let m
  while ((m = re.exec(sqlText)) !== null) {
    const gtlId = m[1]
    const name = unescapeSqlString(m[2])
    const description = unescapeSqlString(m[3])
    const category = unescapeSqlString(m[4])
    const methodology = m[5]
    let payload
    try {
      payload = JSON.parse(unescapeSqlString(m[6]))
    } catch (err) {
      console.warn('Skip (bad JSON):', name, err.message)
      continue
    }
    const documentType = String(payload.document_type || '').trim()
    if (!ALLOWED.has(documentType)) {
      console.warn('Skip (invalid document_type):', name, documentType)
      continue
    }
    const seedKey = String(payload.seed_key || gtlId).trim()
    const ref = `SEED787-${seedKey}`.slice(0, 64)
    rows.push({
      id: uuidFromSeedKey(seedKey),
      ref,
      seedKey,
      title: payload.title || name,
      description: payload.description || description,
      category,
      methodology,
      documentType,
      status: payload.status || 'active',
      documentData: payload.document_data || {},
    })
  }
  return rows
}

function sqlQuote(s) {
  return `'${String(s ?? '').replace(/'/g, "''")}'`
}

function upsertBlock(schema, row, { withAccount }) {
  const dataJson = JSON.stringify(row.documentData).replace(/'/g, "''")
  const acctCol = withAccount ? 'account_id, ' : ''
  const acctVal = withAccount ? 'v_account_id, ' : ''
  const projectCol = schema === 'sim' ? 'practice_project_id' : 'project_id'
  return `
  -- ${row.title} → ${schema}.${row.documentType}
  SELECT id INTO v_id FROM ${schema}.${row.documentType}
  WHERE reference_code = ${sqlQuote(row.ref)} AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO ${schema}.${row.documentType} (
      id, ${acctCol}reference_code, title, description, document_data,
      status, is_master, ${projectCol}, created_by, is_deleted
    ) VALUES (
      '${row.id}'::uuid, ${acctVal}${sqlQuote(row.ref)}, ${sqlQuote(row.title)}, ${sqlQuote(row.description)},
      '${dataJson}'::jsonb, ${sqlQuote(row.status)}, TRUE, NULL, v_created_by, FALSE
    );
  ELSE
    UPDATE ${schema}.${row.documentType} SET
      title = ${sqlQuote(row.title)},
      description = ${sqlQuote(row.description)},
      document_data = '${dataJson}'::jsonb,
      status = ${sqlQuote(row.status)},
      is_master = TRUE,
      updated_at = NOW()
    WHERE id = v_id;
  END IF;
`
}

const allRows = []
const seen = new Set()
for (const file of SOURCE_FILES) {
  const fp = path.join(adminSqlDir, file)
  if (!fs.existsSync(fp)) {
    console.error('Missing:', fp)
    process.exit(1)
  }
  const extracted = extractProcessRows(fs.readFileSync(fp, 'utf8'))
  for (const row of extracted) {
    if (seen.has(row.ref)) continue
    seen.add(row.ref)
    allRows.push(row)
  }
  console.log(file, '→', extracted.length, 'process rows')
}

if (!allRows.length) {
  console.error('No process rows')
  process.exit(1)
}

const publicUpserts = allRows.map((r) => upsertBlock('public', r, { withAccount: true })).join('\n')
const simUpserts = allRows.map((r) => upsertBlock('sim', r, { withAccount: false })).join('\n')

const body = `-- =============================================================================
-- v787: Platform + Simulator Structured/Agile process-template masters
-- Companion to v786 (forms). Sources: Admin v189c + v191e
-- Plan: projectplan/v786_platform_sim_methodology_form_seed_parity_plan.md (follow-up)
-- Idempotent: reference_code SEED787-* upsert by reference_code
-- Prerequisites: process document tables (v629/v632), accounts, auth.users
-- =============================================================================

DO $$
DECLARE
  v_account_id UUID;
  v_created_by UUID;
  v_id UUID;
BEGIN
  SELECT a.id INTO v_account_id
  FROM public.accounts a
  WHERE COALESCE(a.is_deleted, FALSE) = FALSE
  ORDER BY a.created_at NULLS LAST, a.id
  LIMIT 1;

  IF v_account_id IS NULL THEN
    RAISE EXCEPTION 'v787: no active public.accounts row — cannot seed process masters';
  END IF;

  SELECT u.id INTO v_created_by FROM auth.users u ORDER BY u.created_at NULLS LAST LIMIT 1;
  -- created_by may be NULL on some environments; columns often allow NULL

${publicUpserts}

  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'sim') THEN
${simUpserts}
  END IF;

  RAISE NOTICE 'v787_structured_agile_process_template_seeds.sql applied (% masters)', ${allRows.length};
END $$;
`

fs.writeFileSync(outFile, body)
console.log('Wrote', outFile, `(${allRows.length} masters, ${body.length} bytes)`)
console.log(allRows.map((r) => `${r.methodology}/${r.documentType}: ${r.title}`).join('\n'))
