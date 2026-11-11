/**
 * Seed the four annexures of the sample Data Migration Strategy (seed record LREG-2026-105, re-created
 * from the CBS DMSD template by SQL v1342) — A (cutover timeline, single window), B (cutover timeline,
 * multi-window), C (data hand-off control form, Word) and D (RACI matrix, Excel) — the template's
 * vendor-neutral annexures. SQL cannot upload files, so this script does it
 * with the service key: uploads each file to the private `local-register-attachments` bucket and inserts the matching
 * `local_register_record_attachments` row (the Admin ID trigger assigns the display ID).
 *
 * Files: A/B images in Design Images/seed/cbs-dmsd-template/, C (Word) / D (Excel) in
 * Documents/seed/cbs-dmsd-template/ (the same files as the template — scripts/seed-cbs-dmsd-template-annexures.mjs).
 * Idempotent: an annexure that already exists for the record (same title) is skipped. Files left in
 * storage under the record's folder by annexure rows that no longer exist (e.g. after v1342) are removed.
 *
 * Run from the repo root (needs VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY in .env):
 *   node scripts/seed-data-migration-strategy-annexures.mjs
 * Prerequisites: SQL v1318 (bucket + table) and the seed record (v1329, re-created by v1342).
 */
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'

const RECORD_ID = '00000000-0000-4000-a00c-000000000001'
const IMAGE_DIR = join('Design Images', 'seed', 'cbs-dmsd-template')
const FILE_DIR = join('Documents', 'seed', 'cbs-dmsd-template')
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const ANNEXURES = [
  { title: 'Cutover timeline – single window (big bang) option', file: 'annexure-a-cutover-single-window.png', dir: IMAGE_DIR, mime: 'image/png' },
  { title: 'Cutover timeline – multi-window (phased) option', file: 'annexure-b-cutover-multi-window.png', dir: IMAGE_DIR, mime: 'image/png' },
  { title: 'Data hand-off control form', file: 'annexure-c-data-handoff-control-form.docx', dir: FILE_DIR, mime: DOCX },
  { title: 'RACI matrix', file: 'annexure-d-raci-matrix.xlsx', dir: FILE_DIR, mime: XLSX },
]

const env = Object.fromEntries(
  readFileSync('.env', 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^"|"$/g, '')]),
)
const URL_BASE = env.VITE_SUPABASE_URL
const KEY = env.VITE_SUPABASE_SERVICE_ROLE_KEY
if (!URL_BASE || !KEY) throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY are required in .env')
const auth = { apikey: KEY, Authorization: `Bearer ${KEY}` }

async function rest(path, init = {}) {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, { ...init, headers: { ...auth, 'Content-Type': 'application/json', ...(init.headers || {}) } })
  const text = await res.text()
  if (!res.ok) throw new Error(`${path}: ${res.status} ${text}`)
  return text ? JSON.parse(text) : null
}

const record = (await rest(`local_register_records?id=eq.${RECORD_ID}&select=id,display_id,signoff_state`))[0]
if (!record) throw new Error(`Seed record ${RECORD_ID} not found — run the v1329 seed (or v1342) first.`)
if (record.signoff_state !== 'none') throw new Error(`${record.display_id} is locked for sign-off — restart sign-off first.`)

const existing = await rest(`local_register_record_attachments?record_id=eq.${RECORD_ID}&is_deleted=eq.false&is_current=eq.true&select=annexure_title`)
const have = new Set(existing.map((r) => r.annexure_title))

// Remove files in the record's folder that no annexure row points to any more.
const referenced = new Set((await rest(`local_register_record_attachments?record_id=eq.${RECORD_ID}&select=storage_path`)).map((r) => r.storage_path))
const listed = await fetch(`${URL_BASE}/storage/v1/object/list/local-register-attachments`, {
  method: 'POST',
  headers: { ...auth, 'Content-Type': 'application/json' },
  body: JSON.stringify({ prefix: `platform/${RECORD_ID}`, limit: 1000 }),
})
if (!listed.ok) throw new Error(`list files: ${listed.status} ${await listed.text()}`)
const orphans = (await listed.json()).map((o) => `platform/${RECORD_ID}/${o.name}`).filter((path) => !referenced.has(path))
if (orphans.length) {
  const removed = await fetch(`${URL_BASE}/storage/v1/object/local-register-attachments`, {
    method: 'DELETE',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefixes: orphans }),
  })
  if (!removed.ok) throw new Error(`remove old files: ${removed.status} ${await removed.text()}`)
  console.log(`removed ${orphans.length} old file(s) no annexure row uses`)
}

for (const annexure of ANNEXURES) {
  if (have.has(annexure.title)) {
    console.log(`skip  ${annexure.title} (already attached)`)
    continue
  }
  const bytes = readFileSync(join(annexure.dir, annexure.file))
  const groupId = randomUUID()
  const storagePath = `platform/${RECORD_ID}/${groupId}-v1-${annexure.file}`
  const up = await fetch(`${URL_BASE}/storage/v1/object/local-register-attachments/${storagePath}`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': annexure.mime, 'x-upsert': 'false' },
    body: bytes,
  })
  if (!up.ok) throw new Error(`upload ${annexure.file}: ${up.status} ${await up.text()}`)
  await rest('local_register_record_attachments', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      id: groupId,
      attachment_group_id: groupId,
      record_id: RECORD_ID,
      version_number: 1,
      is_current: true,
      annexure_title: annexure.title,
      storage_bucket: 'local-register-attachments',
      storage_path: storagePath,
      file_name: annexure.file,
      mime_type: annexure.mime,
      file_size: bytes.length,
    }),
  })
  console.log(`added ${annexure.title}`)
}
console.log(`Done — open ${record.display_id} → Attachments, or View / Export → Complete document.`)
