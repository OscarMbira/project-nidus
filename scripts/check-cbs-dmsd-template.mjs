#!/usr/bin/env node
/**
 * Content check for the Core Banking System DMSD system template (v1336 plan, slice 2.4).
 *
 *   node scripts/check-cbs-dmsd-template.mjs [path/to/v1341_fin_cbs_dmsd_system_template.sql]
 *
 * Reads the template SQL and fails when:
 *   - a bank, vendor, product, country or person name from the sample documents appears (rule 26:
 *     the template must be vendor-neutral and usable by any organisation);
 *   - a product selected in Products in Scope has no Data Scope child, or a child is not selected;
 *   - a child repeats a product area;
 *   - square-bracket text is not a valid [Placeholder] (so the placeholder banner finds it).
 * Prints the placeholders the template asks users to fill.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const file = process.argv[2]
  || fileURLToPath(new URL('../SQL/v1341_fin_cbs_dmsd_system_template.sql', import.meta.url))
const sql = readFileSync(file, 'utf8')

// Same pattern as packages/shared/src/utils/registerPlaceholders.js
const PLACEHOLDER = /\[[A-Z][A-Za-z0-9 &/().,'’-]{1,39}\]/g

const BANNED = [
  'KCB', 'CRDB', 'LISCO', 'T24', 'Transact', 'Temenos', 'R14', 'R21', 'FBE', 'Fusion', 'Essence', 'TechMahindra', 'Tech Mahindra',
  'IRD Soft', 'Oaknet', 'Burundi', 'Tanzania', 'Kenya', 'EDMS', 'OFS', 'AA', 'EB.', 'RE.CONSOL', 'HVT', 'DE.BIC', 'IM.DOCUMENT',
  'AC.LOCKED', 'Transaction Recycler', 'CCE',
  // People named in the earlier seed record.
  'Grace Moyo', 'Daniel Okafor', 'Olivia Banda', 'Amina Diallo', 'Fatima Bello', 'Nomvula', 'Catherine Mwangi', 'Joy Akinyi',
  'Kevin Mutua', 'Ahmed Hassan', 'Brian Otieno', 'Ravi Pillai', 'Linda Zhou', 'Nadia Rahman', 'Priya Naidoo', 'Kwame Asante',
  'Maria Fernandes',
]

const blocks = [...sql.matchAll(/\$cbs\$([\s\S]*?)\$cbs\$/g)].map((m) => m[1])
const jsonBlocks = blocks.filter((b) => /^\s*[[{]/.test(b)).map((b) => JSON.parse(b))
const strategy = jsonBlocks.find((b) => !Array.isArray(b))
const children = jsonBlocks.find((b) => Array.isArray(b))
const errors = []
if (!strategy || !children) errors.push('Could not find the strategy values and the children in the SQL')

const text = blocks.join('\n')
for (const name of BANNED) {
  const re = new RegExp(`(^|[^A-Za-z0-9])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z0-9])`, 'm')
  if (re.test(text)) errors.push(`Banned name found: ${name}`)
}

const bracketed = text.match(/\[[^\]\n]*\]/g) || []
const placeholders = new Set()
for (const b of bracketed) {
  if (b.match(PLACEHOLDER)?.[0] === b) placeholders.add(b)
  else errors.push(`Not a valid placeholder: ${b}`)
}

if (strategy && children) {
  const selected = strategy.products_in_scope || []
  const areas = children.map((c) => c.field_values?.product_area)
  for (const p of selected) if (!areas.includes(p)) errors.push(`Selected product without a Data Scope child: ${p}`)
  for (const a of areas) if (!selected.includes(a)) errors.push(`Data Scope child not selected in Products in Scope: ${a}`)
  const dupes = areas.filter((a, i) => areas.indexOf(a) !== i)
  if (dupes.length) errors.push(`Product areas repeated: ${[...new Set(dupes)].join(', ')}`)
  console.log(`Strategy fields: ${Object.keys(strategy).length} · Data Scope children: ${children.length}`)
}

console.log(`Placeholders (${placeholders.size}): ${[...placeholders].sort().join(' ')}`)
if (errors.length) {
  console.error(`\n${errors.length} problem(s):\n- ${errors.join('\n- ')}`)
  process.exit(1)
}
console.log('CBS DMSD template content check passed.')
