/**
 * Generates v576 industry template seed SQL in editor-safe chunks.
 * Run: node scripts/generate-v576-industry-seed.mjs
 *
 * Outputs:
 *   SQL/v576_industry_template_seed.sql          — pointer only (too large for one Editor run)
 *   SQL/v576_seed/batches/batch_01_of_10.sql     — 3 industries each (~1.8k lines)
 *   SQL/v576_seed/industries/{code}.sql          — one industry per file (~600 lines)
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const planPath = path.join(root, 'projectplan/v575_Industry_Plan_Templates.md')
const stubPath = path.join(root, 'SQL/v576_industry_template_seed.sql')
const seedDir = path.join(root, 'SQL/v576_seed')
const batchDir = path.join(seedDir, 'batches')
const industryDir = path.join(seedDir, 'industries')

const INDUSTRIES_PER_BATCH = 3

const INDUSTRY_META = [
  ['software_development', 'Software Development & IT', 'code-2', '3–18 months'],
  ['construction', 'Construction', 'hard-hat', '6–36 months'],
  ['management_consulting', 'Management Consulting', 'briefcase', '6–52 weeks'],
  ['infrastructure', 'Infrastructure & Civil Engineering', 'landmark', '1–5 years'],
  ['research_development', 'Research & Development (R&D)', 'flask-conical', '1–3 years'],
  ['hr_people', 'HR & People Management', 'users', '3–12 months'],
  ['office_relocation', 'Office Relocation', 'building-2', '4–12 months'],
  ['event_management', 'Event Planning & Management', 'calendar-days', '3–6 months'],
  ['manufacturing', 'Manufacturing & Product Development', 'factory', '1–2 years'],
  ['healthcare_clinical', 'Healthcare & Clinical Projects', 'heart-pulse', '2–5 years'],
  ['marketing_campaigns', 'Marketing & Campaign Management', 'megaphone', '2–6 months'],
  ['financial_services', 'Financial Services & Transformation', 'landmark', '1–3 years'],
  ['education_training', 'Education & Training Programme', 'graduation-cap', '6–18 months'],
  ['oil_gas_energy', 'Oil, Gas & Energy', 'fuel', '2–7 years'],
  ['retail_commercial', 'Retail & Commercial Fit-Out', 'store', '6–18 months'],
  ['telecommunications', 'Telecommunications & Network Rollout', 'radio-tower', '1–3 years'],
  ['aerospace_defence', 'Aerospace & Defence', 'plane', '3–10 years'],
  ['pharmaceutical', 'Pharmaceutical & Life Sciences', 'pill', '5–15 years'],
  ['agriculture_food', 'Agriculture & Food Production', 'wheat', '6–18 months'],
  ['logistics_supply_chain', 'Logistics & Supply Chain', 'truck', '6–18 months'],
  ['legal_services', 'Legal Services & Compliance', 'scale', '2–12 months'],
  ['nonprofit_charity', 'Non-Profit & Charity Projects', 'heart-handshake', '1–3 years'],
  ['government_public_sector', 'Government & Public Sector', 'landmark', '2–5 years'],
  ['mining_natural_resources', 'Mining & Natural Resources', 'pickaxe', '3–10 years'],
  ['hospitality_tourism', 'Hospitality & Tourism', 'hotel', '1–3 years'],
  ['media_broadcasting', 'Media & Broadcasting', 'clapperboard', '3–12 months'],
  ['real_estate_property', 'Real Estate & Property Development', 'building', '2–5 years'],
  ['cybersecurity', 'Cybersecurity & Information Security', 'shield', '6–18 months'],
  ['digital_transformation', 'Digital Transformation', 'cpu', '1–3 years'],
  ['sustainability_environment', 'Sustainability & Environmental Projects', 'leaf', '1–3 years'],
]

function esc(s) {
  return String(s ?? '').replace(/'/g, "''")
}

function parsePhases(line) {
  if (!line) return []
  return line
    .replace(/^\*\*Phases:\*\*\s*/i, '')
    .split('→')
    .map((chunk, i) => {
      const t = chunk.trim()
      const m = t.match(/^(.+?)\s*\(([^)]+)\)\s*$/)
      return {
        phase_number: i + 1,
        phase_name: (m?.[1] || t).trim(),
        estimated_duration: (m?.[2] || '2–4 weeks').trim(),
      }
    })
}

function parseList(line, prefix) {
  if (!line) return []
  const raw = line.replace(new RegExp(`^\\*\\*${prefix}:\\*\\*\\s*`, 'i'), '')
  return raw.split(',').map((s) => s.trim()).filter(Boolean)
}

function parseRisks(line) {
  return parseList(line, 'Risks').map((item) => {
    const m = item.match(/^(.+?)\s*\[(\w+)\/(\w+)\]\s*$/)
    if (m) {
      return { risk_title: m[1].trim(), likelihood: m[2], impact: m[3], risk_category: 'General' }
    }
    return { risk_title: item.replace(/\[[^\]]+\]/, '').trim(), likelihood: 'medium', impact: 'medium', risk_category: 'General' }
  })
}

function parseRoles(line) {
  return parseList(line, 'Roles').map((item, i) => {
    const key = item.includes('★')
    const role_title = item.replace(/★/g, '').trim()
    return { role_title, is_key_role: key, sort_order: i }
  })
}

/** Parse `- *Phase:* act [type, dur, effort, role], ...` lines from plan §8. */
function parseActivitiesFromBlock(block) {
  const activities = []
  const actLineRe = /^\s*-\s*\*([^*]+):\*\s*(.+)$/gm
  let match
  while ((match = actLineRe.exec(block)) !== null) {
    const phaseName = match[1].trim()
    const segments = match[2].split(/\],\s*/)
    segments.forEach((segment, idx) => {
      let part = segment.trim()
      if (!part.endsWith(']')) part += ']'
      const m = part.match(/^(.+?)\s*\[([^,\]]+),\s*([^,\]]+),\s*([^,\]]+),\s*([^\]]+)\]\s*$/)
      if (!m) return
      activities.push({
        phase_name: phaseName,
        activity_name: m[1].trim(),
        activity_type: m[2].trim(),
        typical_duration: m[3].trim(),
        typical_effort: m[4].trim(),
        resource_type: m[5].trim(),
        predecessor_notes: '',
        constraints: '',
        sort_order: idx,
      })
    })
  }
  return activities
}

function parseActivitiesSection(block) {
  const marker = '**Activities (per phase):**'
  const start = block.indexOf(marker)
  if (start < 0) return []
  const slice = block.slice(start + marker.length)
  const end = slice.search(/\n\*\*Deliverables:\*\*/)
  return parseActivitiesFromBlock(end >= 0 ? slice.slice(0, end) : slice)
}

function standardActivities(phaseName, phaseNum) {
  return [
    [`${phaseName} kick-off and planning`, 'meeting', '1d', '4h', 'Project Manager', 'Start of phase', 'Align scope before execution'],
    [`${phaseName} core execution`, 'task', '3–10d', '24h', 'Delivery Lead', `After ${phaseName} kick-off`, 'Primary delivery work for the phase'],
    [`${phaseName} quality review`, 'review', '2d', '6h', 'Project Manager', 'Before phase exit', 'Peer or gate review of outputs'],
    [`${phaseName} stakeholder update`, 'meeting', '1d', '2h', 'Project Manager', 'During execution', 'Status and decisions with sponsors'],
    [`${phaseName} phase close-out`, 'deliverable', '2d', '8h', 'Project Manager', 'End of phase', 'Document lessons and handover to next phase'],
  ].map((row, i) => ({
    activity_name: row[0],
    activity_type: row[1],
    typical_duration: row[2],
    typical_effort: row[3],
    resource_type: row[4],
    predecessor_notes: row[5],
    constraints: row[6],
    sort_order: i,
    phase_number: phaseNum,
    phase_name: phaseName,
  }))
}

function resolveActivities(section, phases) {
  const parsed = parseActivitiesSection(section.block || '')
  if (!parsed.length) {
    return phases.flatMap((ph) => standardActivities(ph.phase_name, ph.phase_number))
  }
  const phaseByName = new Map(phases.map((p) => [p.phase_name.toLowerCase(), p]))
  return parsed.map((a, i) => {
    const ph =
      phaseByName.get(a.phase_name.toLowerCase()) ||
      phases.find((p) => p.phase_name.toLowerCase().startsWith(a.phase_name.toLowerCase().slice(0, 6)))
    return {
      ...a,
      phase_number: ph?.phase_number ?? 1,
      sort_order: i,
    }
  })
}

function parsePlanSections(md) {
  const sections = md.split(/^### \d+\.\s+/m).slice(1)
  const byName = new Map()
  for (const block of sections) {
    const titleLine = block.split('\n')[0].trim()
    const phases = parsePhases(block.match(/^\*\*Phases:\*\*.*$/m)?.[0] || '')
    const deliverables = parseList(block.match(/^\*\*Deliverables:\*\*.*$/m)?.[0], 'Deliverables')
    const risks = parseRisks(block.match(/^\*\*Risks:\*\*.*$/m)?.[0] || '')
    const milestones = parseList(block.match(/^\*\*Milestones:\*\*.*$/m)?.[0], 'Milestones')
    const roles = parseRoles(block.match(/^\*\*Roles:\*\*.*$/m)?.[0] || '')
    const activities = resolveActivities({ block }, phases)
    byName.set(titleLine.toLowerCase(), { phases, activities, deliverables, risks, milestones, roles, block })
  }
  return byName
}

function findSection(byName, name) {
  const key = name.toLowerCase()
  if (byName.has(key)) return byName.get(key)
  for (const [k, v] of byName) {
    if (k.includes(key.split(' ')[0]) || key.includes(k.split(' ')[0])) return v
  }
  return { phases: [], activities: [], deliverables: [], risks: [], milestones: [], roles: [] }
}

function generateIndustrySql(code, name, icon, duration, section) {
  const { phases, activities, deliverables, risks, milestones, roles } = section
  const activityRows =
    activities?.length > 0
      ? activities
      : phases.flatMap((ph) => standardActivities(ph.phase_name, ph.phase_number))
  const desc = `PMO blueprint for ${name} projects — phases, activities, deliverables, risks, milestones, and roles.`
  const lines = []

  lines.push(`-- Industry: ${name} (${code})`)
  lines.push(`DELETE FROM public.pmo_industry_template_activities WHERE template_id IN (SELECT id FROM public.pmo_industry_templates WHERE industry_code = '${code}');`)
  lines.push(`DELETE FROM public.pmo_industry_template_deliverables WHERE template_id IN (SELECT id FROM public.pmo_industry_templates WHERE industry_code = '${code}');`)
  lines.push(`DELETE FROM public.pmo_industry_template_risks WHERE template_id IN (SELECT id FROM public.pmo_industry_templates WHERE industry_code = '${code}');`)
  lines.push(`DELETE FROM public.pmo_industry_template_milestones WHERE template_id IN (SELECT id FROM public.pmo_industry_templates WHERE industry_code = '${code}');`)
  lines.push(`DELETE FROM public.pmo_industry_template_roles WHERE template_id IN (SELECT id FROM public.pmo_industry_templates WHERE industry_code = '${code}');`)
  lines.push(`DELETE FROM public.pmo_industry_template_phases WHERE template_id IN (SELECT id FROM public.pmo_industry_templates WHERE industry_code = '${code}');`)
  lines.push('')
  lines.push(`INSERT INTO public.pmo_industry_templates (
  industry_code, industry_name, description, typical_duration, icon, tags, version, status, is_active, is_deleted
) VALUES (
  '${code}',
  '${esc(name)}',
  '${esc(desc)}',
  '${esc(duration)}',
  '${icon}',
  ARRAY['${esc(name.split(' ')[0])}','industry-plan'],
  '1.0',
  'published',
  TRUE,
  FALSE
)
ON CONFLICT (industry_code) DO UPDATE SET
  industry_name = EXCLUDED.industry_name,
  description = EXCLUDED.description,
  typical_duration = EXCLUDED.typical_duration,
  icon = EXCLUDED.icon,
  status = 'published',
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();
`)

  for (const ph of phases) {
    lines.push(`INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, ${ph.phase_number}, '${esc(ph.phase_name)}', '${esc(ph.phase_name)} phase for ${esc(name)}.', '${esc(ph.estimated_duration)}', ${ph.phase_number}
FROM public.pmo_industry_templates WHERE industry_code = '${code}';`)
  }

  for (const a of activityRows) {
    const phaseNum = a.phase_number ?? 1
    lines.push(`INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, '${esc(a.activity_name)}', '${esc(a.activity_name)}', '${esc(a.activity_type)}',
  '${esc(a.typical_duration)}', '${esc(a.typical_effort)}', '${esc(a.resource_type)}',
  '${esc(a.predecessor_notes || '')}', '${esc(a.constraints || '')}', ${a.sort_order ?? 0}
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = ${phaseNum}
WHERE t.industry_code = '${code}';`)
  }

  deliverables.forEach((d, i) => {
    const phaseNum = Math.min(phases.length, Math.floor((i / Math.max(deliverables.length, 1)) * phases.length) + 1)
    lines.push(`INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, '${esc(d)}', 'document', ${i < 3}, ${i}
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = ${phaseNum}
WHERE t.industry_code = '${code}';`)
  })

  risks.forEach((r, i) => {
    lines.push(`INSERT INTO public.pmo_industry_template_risks (template_id, risk_title, risk_description, risk_category, likelihood, impact, sort_order)
SELECT id, '${esc(r.risk_title)}', '${esc(r.risk_title)}', '${esc(r.risk_category)}', '${r.likelihood}', '${r.impact}', ${i}
FROM public.pmo_industry_templates WHERE industry_code = '${code}';`)
  })

  milestones.forEach((m, i) => {
    const phaseNum = Math.min(phases.length, i + 1)
    lines.push(`INSERT INTO public.pmo_industry_template_milestones (template_id, phase_id, milestone_name, milestone_description, sort_order)
SELECT t.id, p.id, '${esc(m)}', '${esc(m)}', ${i}
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = ${phaseNum}
WHERE t.industry_code = '${code}';`)
  })

  roles.forEach((r) => {
    lines.push(`INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, '${esc(r.role_title)}', '${esc(r.role_title)}', ${r.is_key_role}, ${r.sort_order}
FROM public.pmo_industry_templates WHERE industry_code = '${code}';`)
  })

  return lines
}

function wrapFile(header, bodyLines, footer = '') {
  return [
    header,
    '',
    'BEGIN;',
    '',
    ...bodyLines,
    '',
    'COMMIT;',
    footer,
  ].join('\n')
}

function main() {
  const md = fs.readFileSync(planPath, 'utf8')
  const byName = parsePlanSections(md)

  fs.mkdirSync(batchDir, { recursive: true })
  fs.mkdirSync(industryDir, { recursive: true })

  const batchManifest = []
  const industryManifest = []

  for (let i = 0; i < INDUSTRY_META.length; i++) {
    const [code, name, icon, duration] = INDUSTRY_META[i]
    const section = findSection(byName, name)
    const sql = generateIndustrySql(code, name, icon, duration, section)

    const industryFile = path.join(industryDir, `${code}.sql`)
    const industryContent = wrapFile(
      `-- v576 seed — single industry (Supabase SQL Editor safe)\n-- Prerequisites: v575`,
      sql,
    )
    fs.writeFileSync(industryFile, industryContent, 'utf8')
    industryManifest.push({ code, name, file: `SQL/v576_seed/industries/${code}.sql`, lines: industryContent.split('\n').length })
  }

  const batchCount = Math.ceil(INDUSTRY_META.length / INDUSTRIES_PER_BATCH)
  for (let b = 0; b < batchCount; b++) {
    const slice = INDUSTRY_META.slice(b * INDUSTRIES_PER_BATCH, (b + 1) * INDUSTRIES_PER_BATCH)
    const batchLines = []
    const codes = []
    for (const [code, name, icon, duration] of slice) {
      codes.push(code)
      batchLines.push(`-- ── ${name} ──`, ...generateIndustrySql(code, name, icon, duration, findSection(byName, name)), '')
    }
    const batchNum = String(b + 1).padStart(2, '0')
    const batchFile = path.join(batchDir, `batch_${batchNum}_of_${String(batchCount).padStart(2, '0')}.sql`)
    const batchContent = wrapFile(
      `-- v576 seed batch ${batchNum}/${batchCount} — industries: ${codes.join(', ')}\n-- Prerequisites: v575`,
      batchLines,
      b === batchCount - 1
        ? `
-- Verify (run after all batches)
SELECT industry_code, industry_name, status,
  (SELECT COUNT(*) FROM public.pmo_industry_template_phases p WHERE p.template_id = t.id) AS phases,
  (SELECT COUNT(*) FROM public.pmo_industry_template_activities a WHERE a.template_id = t.id) AS activities
FROM public.pmo_industry_templates t
WHERE is_deleted = FALSE
ORDER BY industry_name;`
        : '',
    )
    fs.writeFileSync(batchFile, batchContent, 'utf8')
    batchManifest.push({ batch: batchNum, file: `SQL/v576_seed/batches/batch_${batchNum}_of_${String(batchCount).padStart(2, '0')}.sql`, industries: codes, lines: batchContent.split('\n').length })
  }

  const stub = `-- ============================================================================
-- v576: Industry Plan Templates — Seed Data (30 industries)
--
-- This monolithic file is NOT runnable in Supabase SQL Editor (query too large).
-- Use the split files generated by:  node scripts/generate-v576-industry-seed.mjs
--
-- RECOMMENDED — run in order (after v575):
${batchManifest.map((b) => `--   ${b.file}  (${b.industries.join(', ')})`).join('\n')}
--
-- ALTERNATIVE — one file per industry (~600 lines each):
--   SQL/v576_seed/industries/<industry_code>.sql  (30 files)
--
-- CLI (no Editor size limit):
--   psql $DATABASE_URL -f SQL/v576_seed/batches/batch_01_of_10.sql
--   ... through batch_10_of_10.sql
-- ============================================================================
`
  fs.writeFileSync(stubPath, stub, 'utf8')

  const readme = `# v576 Industry template seed

Run **after** \`SQL/v575_industry_template_tables.sql\`.

## Supabase SQL Editor (recommended)

Run each batch file in order (${batchCount} files, ${INDUSTRIES_PER_BATCH} industries each):

${batchManifest.map((b) => `- \`${b.file}\` — ${b.lines} lines`).join('\n')}

## Single industry (if a batch still fails)

${industryManifest.map((i) => `- \`${i.file}\``).join('\n')}

## Regenerate

\`\`\`bash
node scripts/generate-v576-industry-seed.mjs
\`\`\`
`
  fs.writeFileSync(path.join(seedDir, 'README.md'), readme, 'utf8')

  console.log(`Wrote stub: ${stubPath}`)
  console.log(`Wrote ${batchCount} batches to ${batchDir}`)
  console.log(`Wrote ${industryManifest.length} industry files to ${industryDir}`)
  batchManifest.forEach((b) => console.log(`  ${b.file} — ${b.lines} lines`))
}

main()
