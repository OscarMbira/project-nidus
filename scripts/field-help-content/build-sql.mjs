#!/usr/bin/env node
/**
 * v1345 slice 2 — build a field-help seed SQL file from a content module.
 *   node scripts/field-help-content/build-sql.mjs <content.mjs> <SQL/vNNNN_name.sql> "<header title>" [prerequisites]
 * The content module exports MODULE (module_code) and ROWS:
 *   [help_key, title, purpose, examples[], format_notes?, extra_notes?]
 * Optional ALIASES: [[sim.<table>.<column>, public.<table>.<column>], …] → public.field_help_aliases.
 * Output: one idempotent INSERT … ON CONFLICT DO UPDATE plus a coverage check query.
 * Refuses text containing the word "into" (Supabase SQL editor trap) and duplicate keys.
 */
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { expandRegisterKey } from './register-keys.mjs'

export function sqlText(value) {
  if (value == null || value === '') return 'NULL'
  const s = String(value)
  const escaped = s.replace(/\\/g, '\\\\').replace(/'/g, "''").replace(/\n/g, '\\n')
  return s.includes('\n') || s.includes('\\') ? `E'${escaped}'` : `'${escaped}'`
}

export function buildRowsSql(rows, moduleCode) {
  const seen = new Set()
  return rows.map((row) => {
    const [key, title, purpose, examples = [], format = null, notes = null] = row
    if (!/^register:[a-z0-9_*]+:[a-z0-9_]+$|^(public|sim)\.[a-z0-9_]+\.[a-z0-9_]+$/.test(key)) throw new Error(`Bad help key: ${key}`)
    if (seen.has(key)) throw new Error(`Duplicate help key: ${key}`)
    seen.add(key)
    if (!title || !purpose || !examples.length) throw new Error(`Title, purpose and an example are required: ${key}`)
    const text = [title, purpose, ...examples, format, notes].filter(Boolean).join(' ')
    if (/\binto\b/i.test(text)) throw new Error(`Avoid the word "into" (SQL editor trap): ${key}`)
    const ex = examples.map((e) => `- ${e}`).join('\n')
    return `  (${sqlText(key)}, ${sqlText(title)}, ${sqlText(purpose)}, ${sqlText(ex)}, ${sqlText(format)}, ${sqlText(notes)}, ${sqlText(moduleCode)})`
  }).join(',\n')
}

/**
 * v1345 fix 2026-11-22: a register help key written with a menu CATEGORY code (register:<category>:<field>)
 * is replaced by one row per real register in that category that has the field. A row the module already
 * writes for that real key wins over an expanded copy.
 */
export function expandRegisterRows(rows, expand = expandRegisterKey) {
  const explicit = new Set(rows.map((r) => r[0]))
  const out = []
  for (const row of rows) {
    const keys = row[0].startsWith('register:') ? expand(row[0]) : [row[0]]
    if (keys.length === 1 && keys[0] === row[0]) { out.push(row); continue }
    for (const k of keys) if (!explicit.has(k) && !out.some((r) => r[0] === k)) out.push([k, ...row.slice(1)])
  }
  return out
}

export function buildAliasesSql(aliases = []) {
  if (!aliases.length) return ''
  for (const [alias, key] of aliases) {
    if (!/^sim\.[a-z0-9_]+\.[a-z0-9_]+$/.test(alias) || !/^public\.[a-z0-9_]+\.[a-z0-9_]+$/.test(key)) throw new Error(`Bad alias: ${alias} → ${key}`)
  }
  const values = aliases.map(([a, k]) => `  (${sqlText(a)}, ${sqlText(k)})`).join(',\n')
  return `
-- Simulator keys read the Platform help (PRD G-D3).
INSERT INTO public.field_help_aliases (alias_key, help_key)
VALUES
${values}
ON CONFLICT (alias_key) DO UPDATE SET help_key = EXCLUDED.help_key;
`
}

export function buildSql({ rows, moduleCode, title, prerequisites, sourceFile, aliases = [] }) {
  // Aliases-only file (e.g. Simulator parity pass): no help rows to insert.
  if (!rows.length) {
    if (!aliases.length) throw new Error('Nothing to write: no rows and no aliases')
    return `-- ============================================================================
-- ${title}
-- ============================================================================
-- Generated from ${sourceFile} by scripts/field-help-content/build-sql.mjs (v1345).
-- ${aliases.length} Simulator aliases only: each sim.* key reads the Platform help it names.
-- Idempotent. Prerequisites: ${prerequisites}.
-- ============================================================================
${buildAliasesSql(aliases)}
-- Check: aliases whose Platform help is missing (expect 0 rows)
SELECT a.alias_key, a.help_key FROM public.field_help_aliases a
LEFT JOIN public.field_help h ON h.help_key = a.help_key AND h.is_active
WHERE h.help_key IS NULL;
`
  }
  return `-- ============================================================================
-- ${title}
-- ============================================================================
-- Generated from ${sourceFile} by scripts/field-help-content/build-sql.mjs (v1345 slice 2).
-- ${rows.length} help entries, module_code '${moduleCode}'. Register keys fall back to the common
-- register:*:<field_key> help when a register has no entry of its own (S2-D1).
-- Examples follow CLAUDE.md rule 77. Drafted by Claude for owner sample review (G-D5).
-- Idempotent: re-running refreshes the text. Prerequisites: ${prerequisites}.
-- ============================================================================

INSERT INTO public.field_help (help_key, title, purpose, examples, format_notes, extra_notes, module_code)
VALUES
${buildRowsSql(rows, moduleCode)}
ON CONFLICT (help_key, form_key, locale) DO UPDATE SET
  title = EXCLUDED.title,
  purpose = EXCLUDED.purpose,
  examples = EXCLUDED.examples,
  format_notes = EXCLUDED.format_notes,
  extra_notes = EXCLUDED.extra_notes,
  module_code = EXCLUDED.module_code,
  is_active = TRUE;
${buildAliasesSql(aliases)}
-- Check: entries written by this file
SELECT count(*) AS help_entries FROM public.field_help WHERE module_code = '${moduleCode}' AND is_active;
`
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))) {
  const [contentPath, outPath, title, prerequisites = 'v1490, v1497'] = process.argv.slice(2)
  const mod = await import(pathToFileURL(path.resolve(contentPath)).href)
  const rows = expandRegisterRows(mod.ROWS)
  const sql = buildSql({ rows, moduleCode: mod.MODULE, title, prerequisites, sourceFile: path.relative(process.cwd(), contentPath).replace(/\\/g, '/'), aliases: mod.ALIASES || [] })
  fs.writeFileSync(outPath, sql)
  console.log(`Wrote ${outPath}: ${rows.length} entries${rows.length !== mod.ROWS.length ? ` (${mod.ROWS.length} in the module; register category keys expanded)` : ""}`)
}
