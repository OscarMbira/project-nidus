/** v1352 Slice 3 (3.2) — storage clean-up handler: report only, deletion through the Storage API, dry run. */
import { describe, expect, it, vi } from 'vitest'
import { handlers } from '../handlers/index.js'
import { chunk } from '../handlers/storage.cleanup.js'

function makeCtx(scan, { removeError = null, removed } = {}) {
  const calls = { rpc: [], remove: [] }
  const ctx = {
    rpc: vi.fn(async (fn, args) => {
      calls.rpc.push([fn, args])
      if (fn === 'storage_cleanup_scan') return { data: scan, error: null }
      return { data: null, error: null }
    }),
    storageRemove: vi.fn(async (bucket, paths) => {
      calls.remove.push([bucket, paths])
      if (removeError) return { removed: 0, error: { message: removeError } }
      return { removed: removed ?? paths.length, error: null }
    }),
    log: vi.fn(),
  }
  return { ctx, calls }
}

describe('storage.cleanup handler', () => {
  const handler = handlers['storage.cleanup']

  it('is registered for its catalogue code', () => {
    expect(typeof handler?.handle).toBe('function')
  })

  it('removes only the paths the scan listed, in chunks, and records each bucket', async () => {
    const paths = Array.from({ length: 150 }, (_, i) => `lost/${i}.pdf`)
    const { ctx, calls } = makeCtx({
      buckets: [
        { bucket: 'risk-attachments', old_files: 400, orphans: 150, delete_enabled: true, paths },
        { bucket: 'user-avatars', old_files: 20, orphans: 3, delete_enabled: false, paths: [] },
        { bucket: 'defect-attachments', skipped: 'bucket not found' },
      ],
    })
    const out = await handler.handle({}, ctx)
    expect(calls.rpc[0]).toEqual(['storage_cleanup_scan', { p_dry_run: false }])
    expect(calls.remove).toHaveLength(2)
    expect(calls.remove[0][0]).toBe('risk-attachments')
    expect(calls.remove[0][1]).toHaveLength(100)
    expect(calls.remove[1][1]).toHaveLength(50)
    expect(calls.remove.flatMap(([, p]) => p)).toEqual(paths)
    expect(out.processed).toBe(150)
    expect(out.orphans).toBe(153)
    expect(out.report_only_buckets).toEqual(['user-avatars'])
    expect(out.skipped).toEqual([{ bucket: 'defect-attachments', reason: 'bucket not found' }])
    const recorded = calls.rpc.filter(([fn]) => fn === 'storage_cleanup_record')
    expect(recorded).toEqual([['storage_cleanup_record', { p_bucket: 'risk-attachments', p_deleted: 150, p_error: null }]])
  })

  it('deletes nothing on a dry run or when no bucket has deletion switched on', async () => {
    const { ctx, calls } = makeCtx({ buckets: [{ bucket: 'user-avatars', orphans: 4, delete_enabled: false, paths: [] }] })
    const out = await handler.handle({ dry_run: true }, ctx)
    expect(calls.rpc[0]).toEqual(['storage_cleanup_scan', { p_dry_run: true }])
    expect(calls.remove).toHaveLength(0)
    expect(out).toMatchObject({ processed: 0, orphans: 4, dry_run: true })
  })

  it('ignores paths for a bucket the scan did not mark for deletion', async () => {
    const { ctx, calls } = makeCtx({ buckets: [{ bucket: 'user-avatars', orphans: 1, delete_enabled: false, paths: ['a.png'] }] })
    await handler.handle({}, ctx)
    expect(calls.remove).toHaveLength(0)
  })

  it('records a Storage error on the bucket and fails the item so it is retried', async () => {
    const { ctx, calls } = makeCtx(
      { buckets: [{ bucket: 'risk-attachments', orphans: 2, delete_enabled: true, paths: ['x.pdf', 'y.pdf'] }] },
      { removeError: 'Storage unavailable' },
    )
    const out = await handler.handle({}, ctx)
    expect(out.error).toMatch(/risk-attachments: Storage unavailable/)
    const recorded = calls.rpc.find(([fn]) => fn === 'storage_cleanup_record')
    expect(recorded[1]).toEqual({ p_bucket: 'risk-attachments', p_deleted: 0, p_error: 'Storage unavailable' })
  })

  it('fails when the scan fails or the adapter has no Storage access', async () => {
    const failing = { rpc: vi.fn(async () => ({ data: null, error: { message: 'permission denied' } })), storageRemove: vi.fn() }
    expect((await handler.handle({}, failing)).error).toMatch(/storage_cleanup_scan: permission denied/)

    const { ctx } = makeCtx({ buckets: [{ bucket: 'b', orphans: 1, delete_enabled: true, paths: ['a'] }] })
    delete ctx.storageRemove
    expect((await handler.handle({}, ctx)).error).toMatch(/storageRemove/)
  })

  it('splits lists into fixed-size chunks', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
    expect(chunk([], 2)).toEqual([])
  })
})
