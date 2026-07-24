/**
 * Generates Phase 0 catalog expansion SQL from v772c draft (industries 31–50).
 * Run: node scripts/generate-v772b-industry-expansion.mjs
 *
 * Outputs:
 *   SQL/v772b_industry_template_catalog_expansion.sql  — pointer
 *   SQL/v772b_seed/industries/{code}.sql
 *   SQL/v772b_seed/batches/batch_*.sql
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

// Reuse parsers by evaluating shared logic inline (same as v576 generator)
const NEW_INDUSTRY_META = [
  ['automotive_manufacturing', 'Automotive Manufacturing & Engineering', 'car', '2–5 years'],
  ['insurance_underwriting', 'Insurance & Underwriting Transformation', 'shield', '1–3 years'],
  ['utilities_water_power', 'Utilities — Water & Power', 'zap', '2–7 years'],
  ['renewable_energy', 'Renewable Energy (Solar/Wind)', 'sun', '2–5 years'],
  ['rail_mass_transit', 'Rail & Mass Transit', 'train', '5–15 years'],
  ['maritime_shipping_ports', 'Maritime, Shipping & Ports', 'ship', '2–7 years'],
  ['aviation_airports', 'Aviation Operations & Airports', 'plane', '3–10 years'],
  ['gaming_esports', 'Gaming & Esports', 'gamepad-2', '1–4 years'],
  ['publishing_print_media', 'Publishing & Print Media', 'book-open', '6–18 months'],
  ['fashion_apparel', 'Fashion, Apparel & Textiles', 'shirt', '6–18 months'],
  ['food_beverage_manufacturing', 'Food & Beverage Manufacturing', 'utensils', '1–3 years'],
  ['chemical_process_manufacturing', 'Chemical & Process Manufacturing', 'flask-conical', '2–5 years'],
  ['semiconductor_electronics', 'Semiconductor & Electronics Manufacturing', 'cpu', '2–5 years'],
  ['biotechnology_genomics', 'Biotechnology & Genomics', 'dna', '3–10 years'],
  ['data_centres_cloud', 'Data Centres & Cloud Infrastructure', 'server', '1–4 years'],
  ['waste_management_recycling', 'Waste Management & Recycling', 'recycle', '2–5 years'],
  ['sports_recreation', 'Sports & Recreation Facilities', 'trophy', '2–5 years'],
  ['museums_arts_heritage', 'Museums, Arts & Cultural Heritage', 'landmark', '1–4 years'],
  ['veterinary_animal_health', 'Veterinary & Animal Health Services', 'paw-print', '1–3 years'],
  ['franchise_multisite_retail', 'Franchise & Multi-Site Retail Rollout', 'store', '6–18 months'],
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
    const parsedActs = parseActivitiesSection(block)
    const phaseByName = new Map(phases.map((p) => [p.phase_name.toLowerCase(), p]))
    const activities = parsedActs.map((a, i) => {
      const ph =
        phaseByName.get(a.phase_name.toLowerCase()) ||
        phases.find((p) => p.phase_name.toLowerCase().startsWith(a.phase_name.toLowerCase().slice(0, 8)))
      return { ...a, phase_number: ph?.phase_number ?? 1, sort_order: i }
    })
    byName.set(titleLine.toLowerCase(), { phases, activities, deliverables, risks, milestones, roles })
  }
  return byName
}

function generateIndustrySql(code, name, icon, duration, section) {
  const { phases, activities, deliverables, risks, milestones, roles } = section
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
  ARRAY['${esc(name.split(/[\s—-]/)[0])}','industry-plan','v772b'],
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

  for (const a of activities) {
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

function main() {
  const draftPath = path.join(root, 'projectplan/v772c_new_industry_content_draft.md')
  const seedDir = path.join(root, 'SQL/v772b_seed')
  const industryDir = path.join(seedDir, 'industries')
  const batchDir = path.join(seedDir, 'batches')
  const pointerPath = path.join(root, 'SQL/v772b_industry_template_catalog_expansion.sql')

  const md = fs.readFileSync(draftPath, 'utf8')
  const byName = parsePlanSections(md)

  fs.mkdirSync(industryDir, { recursive: true })
  fs.mkdirSync(batchDir, { recursive: true })

  const perFile = []
  for (const [code, name, icon, duration] of NEW_INDUSTRY_META) {
    const section = byName.get(name.toLowerCase())
    if (!section || !section.phases.length) {
      console.error('Missing/empty section for', name)
      process.exit(1)
    }
    const body = generateIndustrySql(code, name, icon, duration, section)
    const file = path.join(industryDir, `${code}.sql`)
    fs.writeFileSync(
      file,
      [
        `-- v772b expansion: ${name}`,
        'BEGIN;',
        '',
        ...body,
        '',
        'COMMIT;',
        '',
      ].join('\n'),
    )
    perFile.push({ code, file: `SQL/v772b_seed/industries/${code}.sql`, body })
    console.log('wrote', code, `(${section.phases.length} phases, ${section.activities.length} activities)`)
  }

  const BATCH = 4
  for (let i = 0; i < perFile.length; i += BATCH) {
    const chunk = perFile.slice(i, i + BATCH)
    const n = Math.floor(i / BATCH) + 1
    const total = Math.ceil(perFile.length / BATCH)
    const batchPath = path.join(batchDir, `batch_${String(n).padStart(2, '0')}_of_${String(total).padStart(2, '0')}.sql`)
    fs.writeFileSync(
      batchPath,
      [
        `-- v772b batch ${n}/${total}`,
        'BEGIN;',
        '',
        ...chunk.flatMap((c) => ['', ...c.body, '']),
        'COMMIT;',
        '',
      ].join('\n'),
    )
  }

  fs.writeFileSync(
    pointerPath,
    `-- =============================================================================
-- v772b: Industry Template Catalog Expansion (30 → 50)
-- Plan: projectplan/v772_industry_template_springboard_content_plan.md Phase 0
-- Source draft: projectplan/v772c_new_industry_content_draft.md
-- Apply: run each file under SQL/v772b_seed/batches/ (or industries/) in Supabase.
-- Regenerate: node scripts/generate-v772b-industry-expansion.mjs
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE 'v772b pointer only — apply SQL/v772b_seed/batches/*.sql (5 batches) or industries/*.sql';
END $$;
`,
  )
  console.log('Done. Pointer:', pointerPath)
}

main()
