/**
 * Upload the four annexures of the Core Banking System DMSD system template (v1336 plan, slice 2.3;
 * template rows from SQL v1341) — A (cutover timeline, single window / big bang), B (cutover
 * timeline, multi-window / phased), C (data hand-off control form, Word) and D (RACI matrix, Excel).
 * The files are vendor-neutral. SQL cannot upload files, so this script does it with the service
 * key: each file goes to the private `local-register-templates` bucket under
 * system/<template_id>/… (readable by any signed-in user) and the template's
 * `local_register_template_attachments` rows are replaced. Records created from the template
 * get their own copies of these files.
 *
 * Files: A/B in Design Images/seed/cbs-dmsd-template/, C/D in Documents/seed/cbs-dmsd-template/.
 * Idempotent: files are overwritten in place and the attachment rows rewritten.
 *
 * Run from the repo root (needs VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY in .env):
 *   node scripts/seed-cbs-dmsd-template-annexures.mjs
 * Prerequisites: SQL v1336 (bucket + table) and v1341 (template row).
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const TEMPLATE_ID = '00000000-0000-4000-b341-000000000001'
const BUCKET = 'local-register-templates'
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

const template = (await rest(`local_register_templates?id=eq.${TEMPLATE_ID}&select=id,display_id,name`))[0]
if (!template) throw new Error(`Template ${TEMPLATE_ID} not found — run SQL v1341 first.`)

const rows = []
for (const [index, annexure] of ANNEXURES.entries()) {
  const bytes = readFileSync(join(annexure.dir, annexure.file))
  const storagePath = `system/${TEMPLATE_ID}/${annexure.file}`
  const up = await fetch(`${URL_BASE}/storage/v1/object/${BUCKET}/${storagePath}`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': annexure.mime, 'x-upsert': 'true' },
    body: bytes,
  })
  if (!up.ok) throw new Error(`upload ${annexure.file}: ${up.status} ${await up.text()}`)
  rows.push({
    template_id: TEMPLATE_ID,
    sort_order: index + 1,
    annexure_title: annexure.title,
    storage_bucket: BUCKET,
    storage_path: storagePath,
    file_name: annexure.file,
    mime_type: annexure.mime,
    file_size: bytes.length,
  })
  console.log(`uploaded ${annexure.file}`)
}

await rest(`local_register_template_attachments?template_id=eq.${TEMPLATE_ID}`, { method: 'DELETE' })
await rest('local_register_template_attachments', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(rows) })
console.log(`Done — ${rows.length} annexures on ${template.display_id || template.name}.`)
