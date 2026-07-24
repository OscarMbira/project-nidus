/**
 * v786 — Generate Platform/Simulator form_template seeds from Admin GTL SQL (v189/v191).
 * Plan: projectplan/v786_platform_sim_methodology_form_seed_parity_plan.md
 *
 * Run from monorepo root:
 *   node scripts/generate-v786-platform-sim-form-seeds.js
 *
 * Reads Admin SQL under ../project-nidus-admin/SQL (or ADMIN_SQL_DIR).
 * Writes SQL/v786_structured_agile_form_template_seeds.sql (public + sim).
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const adminSqlDir = process.env.ADMIN_SQL_DIR
  || path.join(root, '..', 'project-nidus-admin', 'SQL')
const outFile = path.join(root, 'SQL', 'v786_structured_agile_form_template_seeds.sql')

const SOURCE_FILES = [
  'v189_structured_forms_starting_up_directing.sql',
  'v189b_structured_forms_initiating.sql',
  'v189d_structured_forms_controlling_stage.sql',
  'v189e_structured_forms_delivery_and_closure.sql',
  'v191_agile_forms_backlog.sql',
  'v191b_agile_forms_sprint_planning.sql',
  'v191c_agile_forms_sprint_execution.sql',
  'v191d_agile_forms_review_retro_release.sql',
]

/** Map Admin GTL category → Platform form_templates.process_group (ceremony filters). */
const CATEGORY_TO_PROCESS_GROUP = {
  'Starting Up': 'starting_up',
  Directing: 'directing',
  Initiating: 'initiating',
  'Controlling a Stage': 'controlling_a_stage',
  'Managing Product Delivery': 'managing_product_delivery',
  'Managing a Stage Boundary': 'managing_a_stage_boundary',
  Closing: 'closing',
  Backlog: 'backlog',
  'Sprint Planning': 'sprint_planning',
  'Sprint Execution': 'sprint_execution',
  'Review & Retrospective': 'review_retrospective',
  Release: 'release',
}

function unescapeSqlString(s) {
  return String(s || '').replace(/''/g, "'")
}

function extractFormRows(sqlText) {
  const rows = []
  const re = /\(\s*'[^']+'::uuid,\s*'form_template',\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*'(structured|agile)',\s*'((?:[^']|'')*)'::jsonb/g
  let m
  while ((m = re.exec(sqlText)) !== null) {
    const name = unescapeSqlString(m[1])
    const description = unescapeSqlString(m[2])
    const category = unescapeSqlString(m[3])
    const methodology = m[4]
    let payload
    try {
      payload = JSON.parse(unescapeSqlString(m[5]))
    } catch (err) {
      console.warn('Skip row (bad JSON):', name, err.message)
      continue
    }
    const templateCode = String(payload.template_code || '').trim()
    if (!templateCode) continue
    const processGroup = CATEGORY_TO_PROCESS_GROUP[category]
      || String(payload.process_group || 'planning').trim()
      || 'planning'
    rows.push({
      templateCode,
      name: payload.name || name,
      description,
      category,
      methodology,
      processGroup,
      isActive: payload.is_active !== false,
      schema: payload.schema || { title: name, sections: [] },
    })
  }
  return rows
}

function sqlQuote(s) {
  return `'${String(s).replace(/'/g, "''")}'`
}

function schemaUpsertBlock(schemaName, rows) {
  const lines = []
  lines.push(`-- ${schemaName}.form_templates + versions`)
  for (const r of rows) {
    const schemaJson = JSON.stringify(r.schema).replace(/'/g, "''")
    lines.push(`
INSERT INTO ${schemaName}.form_templates (template_code, name, process_group, is_active)
VALUES (${sqlQuote(r.templateCode)}, ${sqlQuote(r.name)}, ${sqlQuote(r.processGroup)}, ${r.isActive ? 'TRUE' : 'FALSE'})
ON CONFLICT (template_code) DO UPDATE SET
  name = EXCLUDED.name,
  process_group = EXCLUDED.process_group,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
DECLARE
  v_id UUID;
  v_ver INT;
BEGIN
  SELECT id INTO v_id FROM ${schemaName}.form_templates WHERE template_code = ${sqlQuote(r.templateCode)} LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'form_templates missing after upsert: %', ${sqlQuote(r.templateCode)};
  END IF;
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
  FROM ${schemaName}.form_template_versions WHERE template_id = v_id;
  UPDATE ${schemaName}.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
  INSERT INTO ${schemaName}.form_template_versions (template_id, version_number, schema, is_current)
  VALUES (v_id, v_ver, '${schemaJson}'::jsonb, TRUE);
END $$;
`)
  }
  return lines.join('\n')
}

const allRows = []
const seen = new Set()
for (const file of SOURCE_FILES) {
  const fp = path.join(adminSqlDir, file)
  if (!fs.existsSync(fp)) {
    console.error('Missing Admin SQL (required):', fp)
    process.exit(1)
  }
  const extracted = extractFormRows(fs.readFileSync(fp, 'utf8'))
  for (const row of extracted) {
    if (seen.has(row.templateCode)) continue
    seen.add(row.templateCode)
    allRows.push(row)
  }
  console.log(file, '→', extracted.length, 'form rows')
}

if (!allRows.length) {
  console.error('No form rows extracted')
  process.exit(1)
}

const body = `-- =============================================================================
-- v786: Platform + Simulator Structured/Agile form template field completeness
-- Plan: projectplan/v786_platform_sim_methodology_form_seed_parity_plan.md
-- Source: Admin GTL seeds v189*/v191* (parsed by scripts/generate-v786-platform-sim-form-seeds.js)
-- Idempotent: ON CONFLICT (template_code) + new current version row
-- Prerequisites: form_templates / form_template_versions (public + sim)
-- =============================================================================

${schemaUpsertBlock('public', allRows)}

-- Simulator mirror (same template_code / schemas)
${schemaUpsertBlock('sim', allRows)}

DO $$
BEGIN
  RAISE NOTICE 'v786_structured_agile_form_template_seeds.sql applied (% templates × public+sim)', ${allRows.length};
END $$;
`

fs.writeFileSync(outFile, body)
console.log('Wrote', outFile, `(${allRows.length} templates, ${body.length} bytes)`)
console.log('process_groups:', [...new Set(allRows.map((r) => r.processGroup))].sort().join(', '))
