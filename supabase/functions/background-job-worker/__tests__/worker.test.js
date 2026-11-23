/**
 * v1352 Slice 0 — background job worker: claim-once under concurrency, handler errors recorded,
 * back-off / dead outcomes counted, adapter is the only module importing @supabase/supabase-js.
 */
import { describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { groupByJob, processJobBatch, runWorker } from '../worker.js'
import { handlers as registry } from '../handlers/index.js'

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** In-memory stand-in for the SQL queue: a claim hands each pending item to one caller only. */
function fakeDb(items, { maxAttempts = 2 } = {}) {
  const queue = items.map((i) => ({ status: 'pending', attempts: 0, max_attempts: maxAttempts, payload: {}, ...i }))
  const runs = []
  const calls = []
  const rpc = async (fn, args) => {
    calls.push([fn, args])
    await Promise.resolve() // let concurrent workers interleave
    if (fn === 'background_job_claim') {
      const picked = queue.filter((q) => q.status === 'pending').slice(0, args.p_limit)
      for (const q of picked) { q.status = 'running'; q.attempts += 1; q.locked_by = args.p_worker_id }
      return { data: picked.map((q) => ({ ...q })), error: null }
    }
    if (fn === 'background_job_run_start') {
      const id = `run-${runs.length + 1}`
      runs.push({ id, job_code: args.p_job_code, status: 'running' })
      return { data: id, error: null }
    }
    if (fn === 'background_job_item_complete') {
      const q = queue.find((x) => x.id === args.p_item_id)
      q.last_error = args.p_error
      q.status = args.p_ok ? 'succeeded' : q.attempts >= q.max_attempts ? 'dead' : 'waiting'
      return { data: q.status === 'waiting' ? 'pending' : q.status, error: null }
    }
    if (fn === 'background_job_run_finish') {
      const run = runs.find((r) => r.id === args.p_run_id)
      run.status = args.p_dead > 0 ? 'failed' : args.p_retrying > 0 ? 'partial' : 'succeeded'
      Object.assign(run, { processed: args.p_processed, dead: args.p_dead, retrying: args.p_retrying, error: args.p_error })
      return { data: run.status, error: null }
    }
    return { data: null, error: { message: `unexpected rpc ${fn}` } }
  }
  return { ctx: { rpc, invokeFunction: vi.fn(), env: () => undefined, log: () => {} }, queue, runs, calls }
}

describe('background job worker', () => {
  it('groups claimed items by job code in claim order', () => {
    const groups = groupByJob([{ id: 1, job_code: 'a.x' }, { id: 2, job_code: 'b.y' }, { id: 3, job_code: 'a.x' }])
    expect([...groups.keys()]).toEqual(['a.x', 'b.y'])
    expect(groups.get('a.x').map((i) => i.id)).toEqual([1, 3])
  })

  it('handles each queue item exactly once when two workers run at the same time', async () => {
    const items = Array.from({ length: 30 }, (_, i) => ({ id: `item-${i}`, job_code: 'test.q' }))
    const { ctx, queue } = fakeDb(items)
    const handlers = { 'test.q': { handle: async () => ({ processed: 1 }) } }
    const handled = vi.spyOn(handlers['test.q'], 'handle')
    const [a, b] = await Promise.all([
      runWorker(ctx, handlers, { workerId: 'w1', claimLimit: 4 }),
      runWorker(ctx, handlers, { workerId: 'w2', claimLimit: 4 }),
    ])
    expect(handled).toHaveBeenCalledTimes(30)
    expect(a.processed + b.processed).toBe(30)
    expect(queue.every((q) => q.status === 'succeeded' && q.attempts === 1)).toBe(true)
    expect(new Set(queue.map((q) => q.locked_by)).size).toBe(2)
  })

  it('records a handler error on the item and counts retrying versus dead items', async () => {
    const { ctx, queue, runs } = fakeDb([
      { id: 'fresh', job_code: 'test.q', attempts: 0 },
      { id: 'last-try', job_code: 'test.q', attempts: 1 },
    ])
    const handlers = { 'test.q': { handle: async () => { throw new Error('endpoint down') } } }
    const summary = await runWorker(ctx, handlers, { claimLimit: 10 })
    expect(queue.find((q) => q.id === 'fresh').status).toBe('waiting')
    expect(queue.find((q) => q.id === 'last-try').status).toBe('dead')
    expect(queue.every((q) => q.last_error === 'endpoint down')).toBe(true)
    expect(runs[0]).toMatchObject({ status: 'failed', dead: 1, retrying: 1, error: 'endpoint down' })
    expect(summary.batches[0].status).toBe('failed')
  })

  it('treats a returned { error } and a missing handler as failures', async () => {
    const { ctx, queue } = fakeDb([{ id: 'x', job_code: 'test.q' }, { id: 'y', job_code: 'no.handler' }], { maxAttempts: 1 })
    await runWorker(ctx, { 'test.q': { handle: async () => ({ error: 'bad payload' }) } })
    expect(queue.find((q) => q.id === 'x')).toMatchObject({ status: 'dead', last_error: 'bad payload' })
    expect(queue.find((q) => q.id === 'y').last_error).toMatch(/No handler is registered for no.handler/)
  })

  it('writes one run row per job per batch with the processed count', async () => {
    const { ctx, runs } = fakeDb([{ id: '1', job_code: 'a.one' }, { id: '2', job_code: 'a.one' }, { id: '3', job_code: 'b.two' }])
    const handlers = { 'a.one': { handle: async () => ({ processed: 2 }) }, 'b.two': { handle: async () => ({}) } }
    await runWorker(ctx, handlers)
    expect(runs).toHaveLength(2)
    expect(runs[0]).toMatchObject({ job_code: 'a.one', status: 'succeeded', processed: 4 })
    expect(runs[1]).toMatchObject({ job_code: 'b.two', status: 'succeeded', processed: 0 })
  })

  it('stops when the time budget is used', async () => {
    const { ctx, calls } = fakeDb([{ id: '1', job_code: 'a.one' }])
    let t = 0
    const summary = await runWorker(ctx, { 'a.one': { handle: async () => ({}) } }, { timeBudgetMs: 10, now: () => (t += 20) })
    expect(summary.claimed).toBe(0)
    expect(calls).toHaveLength(0)
  })

  it('throws when the database refuses a worker call', async () => {
    const ctx = { rpc: async () => ({ data: null, error: { message: 'permission denied' } }), log: () => {} }
    await expect(processJobBatch(ctx, {}, 'a.one', [{ id: '1' }])).rejects.toThrow(/permission denied/)
  })

  it('has a handler module with handle() for every registered code', () => {
    for (const [code, mod] of Object.entries(registry)) {
      expect(typeof mod.handle, code).toBe('function')
      expect(fs.existsSync(path.join(DIR, 'handlers', `${code}.js`)), code).toBe(true)
    }
  })

  it('imports @supabase/supabase-js only in the adapter', () => {
    const files = []
    const walk = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name)
        if (e.isDirectory()) { if (e.name !== '__tests__') walk(p) } else if (/\.(js|ts)$/.test(e.name)) files.push(p)
      }
    }
    walk(DIR)
    const importers = files.filter((f) => /@supabase\/supabase-js/.test(fs.readFileSync(f, 'utf8')))
    expect(importers.map((f) => path.basename(f))).toEqual(['adapter.ts'])
  })
})
