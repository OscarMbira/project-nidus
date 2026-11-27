/**
 * v1358 Slice 1 — handler for `organisation.export_build` (queued when the Account Owner requests an export).
 *
 * 1. public.organisation_export_begin returns the stored plan (tables with rows, columns, files) and the
 *    checkpoint of an earlier run; a closed request is skipped.
 * 2. Part 1 starts with README.txt and dictionary.csv. Each table is read page by page
 *    (public.organisation_export_page — secrets already removed) and written as data/<table>.csv + .json;
 *    very large tables are split into numbered files. Then the uploaded files are copied to files/<bucket>/…
 *    (files over FILE_LIMIT, or that cannot be read, are listed in files-not-included.csv).
 * 3. Entries are packed into ZIP parts of about PART_LIMIT. After each part is uploaded to the private
 *    bucket the checkpoint is saved, so a stopped run resumes from the last part. When the time budget is
 *    used up the handler saves its place and queues itself again.
 * 4. public.organisation_export_finish marks the request ready (7 days) and tells the owner (in-app + email,
 *    no link). An error is noted on the request and returned, so the queue retries with back-off; a build
 *    with no progress for 24 hours is failed by organisation.export_expire.
 */
import { createZip, dictionaryCsv, readMe, safeName, toCsv } from '../exportZip.js'

export const BUCKET = 'organisation-exports'
export const PART_LIMIT = 40 * 1024 * 1024
export const CHUNK_LIMIT = 12 * 1024 * 1024
export const FILE_LIMIT = 45 * 1024 * 1024
export const PAGE_SIZE = 1000
export const TIME_BUDGET_MS = 100_000

const entrySize = (e) => 76 + 2 * e.name.length + (typeof e.data === 'string' ? e.data.length * 3 : e.data.length)

export async function handle(payload, ctx, options = {}) {
  const now = options.now || (() => Date.now())
  const limits = { part: PART_LIMIT, chunk: CHUNK_LIMIT, file: FILE_LIMIT, page: PAGE_SIZE, budget: TIME_BUDGET_MS, ...(options.limits || {}) }
  const requestId = payload?.request_id
  if (!requestId) return { error: 'request_id is missing from the payload' }
  if (typeof ctx.storageUpload !== 'function') return { error: 'The worker adapter has no storageUpload' }
  const started = now()

  const begin = await ctx.rpc('organisation_export_begin', { p_request_id: requestId })
  if (begin.error) return { error: `organisation_export_begin: ${begin.error.message}` }
  const info = begin.data || {}
  if (info.skip) return { processed: 0, skipped: info.skip }

  const plan = info.plan || { tables: [], files: [] }
  const tables = Array.isArray(plan.tables) ? plan.tables : []
  const files = Array.isArray(plan.files) ? plan.files : []
  const cp = { table: 0, offset: 0, chunk: 1, file: 0, part: 1, readme: false, notIncluded: [], ...(info.checkpoint || {}) }
  const uploaded = Array.isArray(info.files) ? [...info.files] : []
  const base = `${info.account_id}/${info.request_id}`
  const ref = safeName(info.reference || 'export').replace(/\//g, '-')
  let entries = []
  let size = 22

  const save = async () => {
    const res = await ctx.rpc('organisation_export_checkpoint', { p_request_id: requestId, p_checkpoint: cp, p_files: uploaded })
    if (res?.error) throw new Error(`organisation_export_checkpoint: ${res.error.message}`)
  }
  const flush = async () => {
    if (!entries.length) return
    const bytes = createZip(entries)
    const name = `nidus-export-${ref}-part-${cp.part}.zip`
    const path = `${base}/${name}`
    const up = await ctx.storageUpload(BUCKET, path, bytes, 'application/zip')
    if (up?.error) throw new Error(`upload ${name}: ${up.error.message || up.error}`)
    const idx = uploaded.findIndex((f) => f.part === cp.part)
    const record = { part: cp.part, name, path, size: bytes.length }
    if (idx >= 0) uploaded[idx] = record
    else uploaded.push(record)
    cp.part += 1
    entries = []
    size = 22
    await save()
  }
  // Adds entries that belong together. If they do not fit in the current part, that part is uploaded first
  // (its checkpoint still points at these entries); then advance() moves the checkpoint past them.
  const add = async (list, advance) => {
    const extra = list.reduce((sum, e) => sum + entrySize(e), 0)
    if (entries.length && size + extra > limits.part) await flush()
    advance()
    entries.push(...list)
    size += extra
    if (size >= limits.part) await flush()
  }
  const outOfTime = () => now() - started >= limits.budget

  try {
    if (!cp.readme) {
      await add([
        { name: 'README.txt', data: readMe(plan, { reference: info.reference, organisation: info.organisation_name, createdAt: info.requested_at }) },
        { name: 'dictionary.csv', data: dictionaryCsv(plan) },
      ], () => { cp.readme = true })
    }

    while (cp.table < tables.length) {
      if (outOfTime()) return await pause()
      const t = tables[cp.table]
      const columns = (t.columns || []).map((c) => c.name)
      const rows = []
      let offset = cp.offset
      let bytes = 0
      let finished = false
      for (;;) {
        const page = await ctx.rpc('organisation_export_page', {
          p_request_id: requestId, p_table: t.table, p_offset: offset, p_limit: limits.page,
        })
        if (page.error) throw new Error(`organisation_export_page ${t.table}: ${page.error.message}`)
        const got = Array.isArray(page.data) ? page.data : []
        rows.push(...got)
        offset += got.length
        bytes += JSON.stringify(got).length
        if (got.length < limits.page) { finished = true; break }
        if (bytes >= limits.chunk) break
      }
      const split = cp.chunk > 1 || !finished
      const stem = `data/${safeName(t.table)}${split ? `.part-${cp.chunk}` : ''}`
      await add([
        { name: `${stem}.csv`, data: toCsv(columns, rows) },
        { name: `${stem}.json`, data: JSON.stringify(rows, null, 1) },
      ], () => {
        if (finished) Object.assign(cp, { table: cp.table + 1, offset: 0, chunk: 1 })
        else Object.assign(cp, { offset, chunk: cp.chunk + 1 })
      })
    }

    while (cp.file < files.length) {
      if (outOfTime()) return await pause()
      const f = files[cp.file]
      const label = { bucket: f.bucket, path: f.path, table: f.table }
      const dl = typeof ctx.storageDownload === 'function'
        ? await ctx.storageDownload(f.bucket, f.path)
        : { error: { message: 'the worker adapter has no storageDownload' } }
      if (dl?.error || !dl?.data) {
        cp.notIncluded.push({ ...label, reason: dl?.error?.message || 'could not be read' })
        cp.file += 1
        continue
      }
      if (dl.data.length > limits.file) {
        cp.notIncluded.push({ ...label, reason: `larger than ${Math.round(limits.file / 1048576)} MB; download it from the app` })
        cp.file += 1
        continue
      }
      await add([{ name: `files/${safeName(f.bucket)}/${safeName(f.path)}`, data: dl.data }], () => { cp.file += 1 })
    }

    if (cp.notIncluded.length) {
      const list = cp.notIncluded
      await add([{ name: 'files-not-included.csv', data: toCsv(['bucket', 'path', 'table', 'reason'], list) }],
        () => { cp.notIncluded = [] })
    }
    await flush()
    const fin = await ctx.rpc('organisation_export_finish', { p_request_id: requestId, p_files: uploaded })
    if (fin.error) throw new Error(`organisation_export_finish: ${fin.error.message}`)
    return { processed: tables.length, parts: uploaded.length, files: files.length }
  } catch (err) {
    const message = String(err?.message || err)
    await ctx.rpc('organisation_export_note_error', { p_request_id: requestId, p_error: message })
    return { error: message, parts: uploaded.length }
  }

  async function pause() {
    await flush()
    await save()
    const next = await ctx.rpc('enqueue_background_job', {
      p_code: 'organisation.export_build',
      p_payload: { request_id: requestId },
      p_run_after: null,
      p_dedupe_key: `orgexport:${requestId}:${cp.part}-${cp.table}-${cp.offset}-${cp.file}`,
      p_organisation_id: info.account_id,
    })
    if (next?.error) return { error: `could not queue the next run: ${next.error.message}` }
    return { processed: cp.table, parts: uploaded.length, continued: true }
  }
}
