/** v1358 Slice 3b — organisation.deletion_execute (files, steps, finish, certificate) and the certificate PDF. */
import { describe, expect, it, vi } from 'vitest'
import { handlers } from '../handlers/index.js'
import { BUCKET, certificateEmail } from '../handlers/organisation.deletion_execute.js'
import { buildCertificatePdf, certificateBlocks, layout, pdfSafe, toBase64, wrap } from '../deletionCertificate.js'

const CERT = {
  record_id: 'rec1', reference: 'ODL-004', request_reference: 'ODR-012', organisation: 'Example Freight Ltd',
  reason: 'Moving to another tool', requested_by: 'Head of Operations', requested_on: '1 Nov 2026',
  approved_on: '2 Nov 2026', confirmed_by: 'Head of Operations', confirmed_on: '3 Nov 2026',
  locked_on: '3 Nov 2026', deleted_on: '3 Dec 2026', tables: [{ table: 'projects', rows: 4 }, { table: 'risks', rows: 120 }],
  table_count: 2, rows_deleted: 124, files_removed: 7, files_not_removed: 0, members_removed: 3, members_kept: 2,
  kept: [{ table: 'platform_subscriptions', rows: 2, reason: 'Our own billing record, kept for the tax period (D6)', keep_days: 2555 }],
  recipients: [{ name: 'Head of Operations', email: 'head.of.operations@company.example' }],
}

const text = (bytes) => Array.from(bytes, (b) => String.fromCharCode(b)).join('')

/** A fake worker context; `script` gives the answer per RPC call, in order. */
function makeCtx(script = {}, extra = {}) {
  const calls = {}
  const ctx = {
    rpc: vi.fn(async (fn, params) => {
      calls[fn] = (calls[fn] || 0) + 1
      const answers = script[fn]
      const data = typeof answers === 'function' ? answers(params, calls[fn]) : Array.isArray(answers) ? answers[Math.min(calls[fn], answers.length) - 1] : answers
      return data && data.__error ? { data: null, error: { message: data.__error } } : { data: data ?? null, error: null }
    }),
    storageRemove: vi.fn(async () => ({ removed: 1, error: null })),
    storageUpload: vi.fn(async () => ({ error: null })),
    invokeFunction: vi.fn(async () => ({ ok: true, status: 200, data: { success: true } })),
    env: () => undefined,
    log: vi.fn(),
    ...extra,
  }
  return ctx
}

describe('deletion certificate PDF', () => {
  it('is a valid-looking PDF with the key facts', () => {
    const pdf = text(buildCertificatePdf(CERT))
    expect(pdf.startsWith('%PDF-1.4')).toBe(true)
    expect(pdf.trimEnd().endsWith('%%EOF')).toBe(true)
    expect(pdf).toContain('Organisation deletion certificate')
    expect(pdf).toContain('Certificate reference: ODL-004')
    expect(pdf).toContain('Example Freight Ltd')
    expect(pdf).toContain('124 records in 2 tables')
    expect(pdf).toContain('- risks: 120')
    expect(pdf).toContain('for up to 7 years. Our own billing record')
    expect(pdf).not.toContain('(D6)')
    const startxref = Number(pdf.match(/startxref\n(\d+)/)[1])
    expect(pdf.slice(startxref, startxref + 4)).toBe('xref')
  })

  it('makes text safe for the standard fonts and escapes PDF characters', () => {
    expect(pdfSafe('Owner’s – “list” → done')).toBe('Owner\'s - "list" -> done')
    expect(pdfSafe('東京')).toBe('??')
    const pdf = text(buildCertificatePdf({ ...CERT, organisation: 'A (B) \\ C' }))
    expect(pdf).toContain('A \\(B\\) \\\\ C')
  })

  it('wraps long text and moves to a new page when full', () => {
    expect(wrap('word '.repeat(200), 10).length).toBeGreaterThan(2)
    expect(wrap('x'.repeat(300), 10).every((l) => l.length <= 96)).toBe(true)
    const tables = Array.from({ length: 150 }, (_, i) => ({ table: `table_${i}`, rows: i }))
    const pages = layout(certificateBlocks({ ...CERT, tables }))
    expect(pages.length).toBeGreaterThan(1)
    expect(pages.flat().every((l) => l.y >= 56)).toBe(true)
    expect(text(buildCertificatePdf({ ...CERT, tables }))).toContain(`/Count ${pages.length}`)
  })

  it('says when nothing but the record is kept, and when files could not be removed', () => {
    const lines = certificateBlocks({ ...CERT, kept: [], files_not_removed: 2 }).map((b) => b.text)
    expect(lines).toContain('Nothing apart from this record.')
    expect(lines.some((l) => l.startsWith('2 files could not be removed'))).toBe(true)
  })

  it('encodes base64 for the email attachment', () => {
    expect(toBase64(new Uint8Array([37, 80, 68, 70]))).toBe('JVBERg==')
  })
})

describe('organisation.deletion_execute', () => {
  const handler = handlers['organisation.deletion_execute']

  it('is registered for its catalogue code', () => {
    expect(typeof handler?.handle).toBe('function')
  })

  it('removes files, deletes rows, finishes, stores and emails the certificate', async () => {
    const ctx = makeCtx({
      organisation_deletion_context: [
        { status: 'deleting', account_id: 'acc1', next_files: [{ bucket: 'risk-attachments', path: 'a/1.pdf' }, { bucket: 'logos', path: 'acc1/logo.png' }] },
        { status: 'deleting', account_id: 'acc1', next_files: [] },
        { status: 'completed', account_id: 'acc1', certificate: CERT },
      ],
      organisation_deletion_files_done: { files_done: 2, files_total: 2 },
      organisation_deletion_step: [{ done: false }, { done: true }],
      organisation_deletion_finish: { reference: 'ODL-004' },
      organisation_deletion_certificate_saved: null,
    })
    const out = await handler.handle({ record_id: 'rec1' }, ctx)
    expect(out).toEqual({ processed: 1, rows_deleted: 124, certificate: 'rec1/deletion-certificate-ODL-004.pdf', sent: 1 })
    expect(ctx.storageRemove).toHaveBeenCalledWith('risk-attachments', ['a/1.pdf'])
    expect(ctx.storageRemove).toHaveBeenCalledWith('logos', ['acc1/logo.png'])
    expect(ctx.rpc).toHaveBeenCalledWith('organisation_deletion_files_done', { p_record_id: 'rec1', p_count: 2, p_failed: [] })
    expect(ctx.rpc.mock.calls.filter(([fn]) => fn === 'organisation_deletion_step')).toHaveLength(2)
    const [bucket, path, bytes, type] = ctx.storageUpload.mock.calls[0]
    expect([bucket, path, type]).toEqual([BUCKET, 'rec1/deletion-certificate-ODL-004.pdf', 'application/pdf'])
    expect(text(bytes)).toContain('ODL-004')
    const [fn, body] = ctx.invokeFunction.mock.calls[0]
    expect(fn).toBe('send-email')
    expect(body.to).toBe('head.of.operations@company.example')
    expect(body.subject).toBe('Deletion certificate for Example Freight Ltd')
    expect(body.attachments[0]).toMatchObject({ filename: 'deletion-certificate-ODL-004.pdf', content_type: 'application/pdf' })
    expect(ctx.rpc).toHaveBeenCalledWith('organisation_deletion_certificate_saved', { p_record_id: 'rec1', p_path: 'rec1/deletion-certificate-ODL-004.pdf', p_sent: 1 })
  })

  it('only sends the certificate when the deletion is already complete', async () => {
    const ctx = makeCtx({ organisation_deletion_context: { status: 'completed', account_id: 'acc1', certificate: CERT } })
    const out = await handler.handle({ record_id: 'rec1' }, ctx)
    expect(out.processed).toBe(1)
    expect(ctx.rpc.mock.calls.some(([f]) => f === 'organisation_deletion_step')).toBe(false)
    expect(ctx.invokeFunction).toHaveBeenCalledTimes(1)
  })

  it('pauses on legal hold and skips finished records', async () => {
    expect(await handler.handle({ record_id: 'rec1' }, makeCtx({ organisation_deletion_context: { status: 'deleting', held: true } })))
      .toEqual({ processed: 0, paused: 'legal hold' })
    const held = makeCtx({ organisation_deletion_context: { status: 'deleting', next_files: [] }, organisation_deletion_step: { held: true } })
    expect(await handler.handle({ record_id: 'rec1' }, held)).toEqual({ processed: 0, paused: 'legal hold' })
    expect(await handler.handle({ record_id: 'rec1' }, makeCtx({ organisation_deletion_context: { skip: 'deletion and certificate already done' } })))
      .toEqual({ processed: 0, skipped: 'deletion and certificate already done' })
    expect((await handler.handle({}, makeCtx())).error).toMatch(/record_id/)
  })

  it('queues itself again when its time is used up', async () => {
    let t = 0
    const ctx = makeCtx({
      organisation_deletion_context: { status: 'deleting', account_id: 'acc1', next_files: [] },
      organisation_deletion_step: () => { t += 60_000; return { done: false } },
      enqueue_background_job: 'item1',
    })
    const out = await handler.handle({ record_id: 'rec1' }, ctx, { now: () => t })
    expect(out).toEqual({ processed: 0, continued: true, stage: 'rows' })
    const [, params] = ctx.rpc.mock.calls.find(([fn]) => fn === 'enqueue_background_job')
    expect(params).toMatchObject({ p_code: 'organisation.deletion_execute', p_payload: { record_id: 'rec1' }, p_organisation_id: 'acc1' })
    expect(params.p_dedupe_key).toMatch(/^orgdel-exec:rec1:rows-/)
  })

  it('goes back to the steps when rows were left, and gives up after repeated leftovers', async () => {
    const ok = makeCtx({
      organisation_deletion_context: [{ status: 'deleting', next_files: [] }, { status: 'completed', certificate: { ...CERT, recipients: [] } }],
      organisation_deletion_step: { done: true },
      organisation_deletion_finish: [{ retry: true, left: ['risks (2)'] }, { reference: 'ODL-004' }],
    })
    expect((await handler.handle({ record_id: 'rec1' }, ok)).processed).toBe(1)
    expect(ok.rpc.mock.calls.filter(([fn]) => fn === 'organisation_deletion_step')).toHaveLength(2)

    const bad = makeCtx({
      organisation_deletion_context: { status: 'deleting', next_files: [] },
      organisation_deletion_step: { done: true },
      organisation_deletion_finish: { retry: true, left: ['risks (2)'] },
    })
    const out = await handler.handle({ record_id: 'rec1' }, bad)
    expect(out.error).toMatch(/Rows keep being left in: risks \(2\)/)
    expect(bad.rpc).toHaveBeenCalledWith('organisation_deletion_note_error', expect.objectContaining({ p_record_id: 'rec1' }))
  })

  it('reports a stalled deletion and a Storage error, but treats a missing file as removed', async () => {
    const stalled = makeCtx({ organisation_deletion_context: { status: 'deleting', next_files: [] }, organisation_deletion_step: { stalled: true, errors: { risks: 'violates foreign key' } } })
    expect((await handler.handle({ record_id: 'rec1' }, stalled)).error).toMatch(/cannot go on: .*violates foreign key/)

    const files = [{ bucket: 'b', path: 'p' }]
    const storageDown = makeCtx({ organisation_deletion_context: { status: 'deleting', next_files: files } },
      { storageRemove: vi.fn(async () => ({ removed: 0, error: { message: 'Service unavailable' } })) })
    expect((await handler.handle({ record_id: 'rec1' }, storageDown)).error).toMatch(/Storage b: Service unavailable/)

    const missing = makeCtx({
      organisation_deletion_context: [{ status: 'deleting', next_files: files }, { status: 'deleting', next_files: [] }, { status: 'completed', certificate: { ...CERT, recipients: [] } }],
      organisation_deletion_step: { done: true },
      organisation_deletion_finish: {},
    }, { storageRemove: vi.fn(async () => ({ removed: 0, error: { message: 'Object not found' } })) })
    expect((await handler.handle({ record_id: 'rec1' }, missing)).processed).toBe(1)
  })

  it('reports a failed email so the queue retries', async () => {
    const ctx = makeCtx({ organisation_deletion_context: { status: 'completed', certificate: CERT } },
      { invokeFunction: vi.fn(async () => ({ ok: false, status: 500, data: { error: 'SMTP down' } })) })
    const out = await handler.handle({ record_id: 'rec1' }, ctx)
    expect(out.error).toMatch(/send-email 500: SMTP down/)
    expect(ctx.rpc.mock.calls.some(([fn]) => fn === 'organisation_deletion_certificate_saved')).toBe(false)
  })

  it('writes a short email that escapes names', () => {
    const { subject, html } = certificateEmail({ ...CERT, organisation: 'A & B' }, { name: 'Head <of> Finance' })
    expect(subject).toBe('Deletion certificate for A & B')
    expect(html).toContain('A &amp; B')
    expect(html).toContain('Head &lt;of&gt; Finance')
    expect(html).toContain('ODL-004')
  })
})
