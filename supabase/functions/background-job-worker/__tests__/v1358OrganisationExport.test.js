/** v1358 Slice 1 — organisation export: ZIP writer, CSV, build handler (parts, checkpoint, resume), expiry. */
import { describe, expect, it, vi } from 'vitest'
import { crc32 } from 'node:zlib'
import { handlers } from '../handlers/index.js'
import { createZip, csvCell, dictionaryCsv, readMe, safeName, toCsv } from '../exportZip.js'

const decoder = new TextDecoder()

/** Reads a stored ZIP: [{ name, text, crcOk }]. Checks the central directory count too. */
function readZip(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const out = []
  let pos = 0
  while (view.getUint32(pos, true) === 0x04034b50) {
    const crc = view.getUint32(pos + 14, true)
    const size = view.getUint32(pos + 18, true)
    const nameLen = view.getUint16(pos + 26, true)
    const name = decoder.decode(bytes.subarray(pos + 30, pos + 30 + nameLen))
    const data = bytes.subarray(pos + 30 + nameLen, pos + 30 + nameLen + size)
    out.push({ name, text: decoder.decode(data), crcOk: crc32(data) === crc })
    pos += 30 + nameLen + size
  }
  const end = bytes.length - 22
  expect(view.getUint32(end, true)).toBe(0x06054b50)
  expect(view.getUint16(end + 10, true)).toBe(out.length)
  return out
}

describe('exportZip helpers', () => {
  it('writes a valid ZIP with UTF-8 names and correct checksums', () => {
    const zip = createZip([{ name: 'data/risks.csv', data: 'id,title\r\n1,Café opening\r\n' }, { name: 'README.txt', data: 'hello' }])
    const entries = readZip(zip)
    expect(entries.map((e) => e.name)).toEqual(['data/risks.csv', 'README.txt'])
    expect(entries.every((e) => e.crcOk)).toBe(true)
    expect(entries[0].text).toContain('Café opening')
  })

  it('quotes CSV cells, keeps nested values as JSON and defuses formulas', () => {
    expect(csvCell('a,b')).toBe('"a,b"')
    expect(csvCell('say "hi"')).toBe('"say ""hi"""')
    expect(csvCell({ a: 1 })).toBe('"{""a"":1}"')
    expect(csvCell('=SUM(A1)')).toBe("'=SUM(A1)")
    expect(csvCell(-5)).toBe('-5')
    expect(csvCell(null)).toBe('')
    expect(toCsv(['id', 'name'], [{ id: 1, name: 'Line\nbreak' }])).toBe('id,name\r\n1,"Line\nbreak"\r\n')
  })

  it('strips path tricks from names', () => {
    expect(safeName('../etc/passwd')).toBe('_/etc/passwd')
    expect(safeName('a:b*c?.pdf')).toBe('a_b_c_.pdf')
  })

  it('builds the dictionary and the read-me from the plan', () => {
    const plan = { tables: [{ table: 'risks', rows: 2, columns: [{ name: 'id', type: 'uuid', nullable: false }, { name: 'title', type: 'text', nullable: true, description: 'Short title' }] }] }
    expect(dictionaryCsv(plan)).toBe('table,column,type,required,description\r\nrisks,id,uuid,Yes,\r\nrisks,title,text,No,Short title\r\n')
    expect(readMe(plan, { reference: 'ODR-001' })).toContain('- risks: 2 row(s)')
    expect(readMe(plan, {})).toContain('secrets are never exported')
  })
})

const TABLES = {
  risks: Array.from({ length: 5 }, (_, i) => ({ id: `r${i}`, title: `Risk ${i}` })),
  issues: [{ id: 'i1', title: 'Issue one' }],
}

function makeCtx({ checkpoint = null, files = [], planFiles = [], download = {}, uploadError = null } = {}) {
  const uploads = []
  const calls = []
  const plan = {
    tables: Object.entries(TABLES).map(([table, rows]) => ({ table, rows: rows.length, columns: [{ name: 'id' }, { name: 'title' }] })),
    files: planFiles,
  }
  const ctx = {
    rpc: vi.fn(async (fn, args) => {
      calls.push([fn, args])
      if (fn === 'organisation_export_begin') {
        return { data: { request_id: 'req1', account_id: 'acc1', reference: 'ODR-001', plan, checkpoint, files }, error: null }
      }
      if (fn === 'organisation_export_page') {
        const rows = TABLES[args.p_table] || []
        return { data: rows.slice(args.p_offset, args.p_offset + args.p_limit), error: null }
      }
      return { data: null, error: null }
    }),
    storageUpload: vi.fn(async (bucket, path, bytes) => {
      if (uploadError) return { error: { message: uploadError } }
      uploads.push({ bucket, path, entries: readZip(bytes) })
      return { error: null }
    }),
    storageDownload: vi.fn(async (bucket, path) => (download[path]
      ? { data: new TextEncoder().encode(download[path]), error: null }
      : { data: null, error: { message: 'Object not found' } })),
    storageRemove: vi.fn(async (_b, paths) => ({ removed: paths.length, error: null })),
    log: vi.fn(),
  }
  return { ctx, uploads, calls }
}

describe('organisation.export_build handler', () => {
  const handler = handlers['organisation.export_build']

  it('is registered for its catalogue code', () => {
    expect(typeof handler?.handle).toBe('function')
    expect(typeof handlers['organisation.export_expire']?.handle).toBe('function')
  })

  it('writes one ZIP with read-me, dictionary, CSV + JSON per table and the files, then finishes', async () => {
    const { ctx, uploads, calls } = makeCtx({
      planFiles: [{ bucket: 'risk-attachments', path: 'r0/plan.pdf', table: 'risk_attachments' }, { bucket: 'risk-attachments', path: 'gone.pdf' }],
      download: { 'r0/plan.pdf': 'PDF' },
    })
    const out = await handler.handle({ request_id: 'req1' }, ctx)
    expect(out).toMatchObject({ processed: 2, parts: 1 })
    expect(uploads).toHaveLength(1)
    expect(uploads[0].bucket).toBe('organisation-exports')
    expect(uploads[0].path).toBe('acc1/req1/nidus-export-ODR-001-part-1.zip')
    const names = uploads[0].entries.map((e) => e.name)
    expect(names).toEqual(['README.txt', 'dictionary.csv', 'data/risks.csv', 'data/risks.json', 'data/issues.csv',
      'data/issues.json', 'files/risk-attachments/r0/plan.pdf', 'files-not-included.csv'])
    expect(uploads[0].entries.find((e) => e.name === 'data/risks.csv').text.split('\r\n')).toHaveLength(7)
    expect(JSON.parse(uploads[0].entries.find((e) => e.name === 'data/issues.json').text)).toEqual(TABLES.issues)
    expect(uploads[0].entries.find((e) => e.name === 'files-not-included.csv').text).toContain('gone.pdf')
    const finish = calls.find(([fn]) => fn === 'organisation_export_finish')
    expect(finish[1].p_files).toEqual([expect.objectContaining({ part: 1, path: 'acc1/req1/nidus-export-ODR-001-part-1.zip' })])
  })

  it('splits a large table into numbered files and the export into several parts', async () => {
    const { ctx, uploads } = makeCtx()
    const out = await handler.handle({ request_id: 'req1' }, ctx, { limits: { page: 2, chunk: 1, part: 600 } })
    expect(out.parts).toBeGreaterThan(1)
    const names = uploads.flatMap((u) => u.entries.map((e) => e.name))
    expect(names).toEqual(expect.arrayContaining(['data/risks.part-1.csv', 'data/risks.part-2.csv', 'data/risks.part-3.csv', 'data/issues.csv']))
    const csvRows = names.filter((n) => /^data\/risks\.part-\d\.csv$/.test(n))
      .flatMap((n) => uploads.flatMap((u) => u.entries).find((e) => e.name === n).text.trim().split('\r\n').slice(1))
    expect(csvRows).toHaveLength(5)
    expect(uploads.map((u) => u.path)).toEqual(uploads.map((_, i) => `acc1/req1/nidus-export-ODR-001-part-${i + 1}.zip`))
  })

  it('pauses when the time budget is used, saving its place and queueing the next run', async () => {
    let t = 0
    const { ctx, calls } = makeCtx()
    const out = await handler.handle({ request_id: 'req1' }, ctx, { now: () => (t += 60_000), limits: { budget: 100_000 } })
    expect(out.continued).toBe(true)
    const saved = calls.filter(([fn]) => fn === 'organisation_export_checkpoint').pop()[1]
    expect(saved.p_checkpoint).toMatchObject({ readme: true })
    const next = calls.find(([fn]) => fn === 'enqueue_background_job')[1]
    expect(next).toMatchObject({ p_code: 'organisation.export_build', p_payload: { request_id: 'req1' }, p_organisation_id: 'acc1' })
    expect(calls.some(([fn]) => fn === 'organisation_export_finish')).toBe(false)
  })

  it('resumes from a checkpoint without repeating finished tables', async () => {
    const { ctx, uploads } = makeCtx({
      checkpoint: { table: 1, offset: 0, chunk: 1, file: 0, part: 2, readme: true, notIncluded: [] },
      files: [{ part: 1, name: 'p1.zip', path: 'acc1/req1/p1.zip', size: 10 }],
    })
    await handler.handle({ request_id: 'req1' }, ctx)
    expect(uploads).toHaveLength(1)
    expect(uploads[0].path).toMatch(/part-2\.zip$/)
    expect(uploads[0].entries.map((e) => e.name)).toEqual(['data/issues.csv', 'data/issues.json'])
  })

  it('skips a closed request and notes an upload error for the retry', async () => {
    const closed = makeCtx()
    closed.ctx.rpc = vi.fn(async () => ({ data: { skip: 'request is ready' }, error: null }))
    expect(await handler.handle({ request_id: 'req1' }, closed.ctx)).toEqual({ processed: 0, skipped: 'request is ready' })

    const { ctx, calls } = makeCtx({ uploadError: 'Payload too large' })
    const out = await handler.handle({ request_id: 'req1' }, ctx)
    expect(out.error).toMatch(/Payload too large/)
    expect(calls.find(([fn]) => fn === 'organisation_export_note_error')[1].p_error).toMatch(/Payload too large/)
    expect(await handler.handle({}, ctx)).toEqual({ error: 'request_id is missing from the payload' })
  })
})

describe('organisation.export_expire handler', () => {
  it('removes expired parts through Storage, then marks the request expired', async () => {
    const { ctx, calls } = makeCtx()
    ctx.rpc = vi.fn(async (fn, args) => {
      calls.push([fn, args])
      if (fn === 'organisation_export_due_expiry') {
        return { data: { stale_failed: 1, expired: [{ request_id: 'req1', files: [{ path: 'acc1/req1/a.zip' }, { path: 'acc1/req1/b.zip' }] }] }, error: null }
      }
      return { data: null, error: null }
    })
    const out = await handlers['organisation.export_expire'].handle({}, ctx)
    expect(out).toEqual({ processed: 1, stale_failed: 1 })
    expect(ctx.storageRemove).toHaveBeenCalledWith('organisation-exports', ['acc1/req1/a.zip', 'acc1/req1/b.zip'])
    expect(calls.find(([fn]) => fn === 'organisation_export_mark_expired')[1]).toEqual({ p_request_id: 'req1' })
  })

  it('keeps a request ready when its files could not be removed', async () => {
    const { ctx } = makeCtx()
    ctx.rpc = vi.fn(async (fn) => (fn === 'organisation_export_due_expiry'
      ? { data: { expired: [{ request_id: 'req1', files: [{ path: 'x.zip' }] }] }, error: null }
      : { data: null, error: null }))
    ctx.storageRemove = vi.fn(async () => ({ removed: 0, error: { message: 'Storage down' } }))
    const out = await handlers['organisation.export_expire'].handle({}, ctx)
    expect(out.error).toMatch(/Storage down/)
    expect(ctx.rpc).not.toHaveBeenCalledWith('organisation_export_mark_expired', expect.anything())
  })
})
