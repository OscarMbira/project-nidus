import { describe, it, expect, vi } from 'vitest'
import { formatBulkCopyButtonLabel, runPool } from '../bulkCopyButtonLabel.js'

describe('formatBulkCopyButtonLabel', () => {
  it('shows the idle copy label with the selection count', () => {
    expect(formatBulkCopyButtonLabel({ selectedCount: 6 })).toBe('Copy 6 to Organisational')
  })

  it('shows which item is in flight so the button does not look stuck', () => {
    expect(
      formatBulkCopyButtonLabel({ busy: true, finished: 0, total: 6 }),
    ).toBe('Copying 1 of 6…')
    expect(
      formatBulkCopyButtonLabel({ busy: true, finished: 2, total: 6 }),
    ).toBe('Copying 3 of 6…')
    expect(
      formatBulkCopyButtonLabel({ busy: true, finished: 6, total: 6 }),
    ).toBe('Copying 6 of 6…')
  })

  it('shows Refreshing after copies finish', () => {
    expect(
      formatBulkCopyButtonLabel({ busy: true, phase: 'refresh', finished: 6, total: 6 }),
    ).toBe('Refreshing…')
  })
})

describe('runPool', () => {
  it('runs every item and caps in-flight work', async () => {
    const seen = []
    let inFlight = 0
    let maxInFlight = 0
    await runPool([1, 2, 3, 4], 2, async (n) => {
      inFlight += 1
      maxInFlight = Math.max(maxInFlight, inFlight)
      seen.push(n)
      await Promise.resolve()
      inFlight -= 1
    })
    expect(seen.sort()).toEqual([1, 2, 3, 4])
    expect(maxInFlight).toBeLessThanOrEqual(2)
  })

  it('continues after a worker handles an item error', async () => {
    const worker = vi.fn(async (n) => {
      if (n === 2) throw new Error('skip')
    })
    await expect(runPool([1, 2, 3], 2, async (n) => {
      try {
        await worker(n)
      } catch {
        /* per-item */
      }
    })).resolves.toBeUndefined()
    expect(worker).toHaveBeenCalledTimes(3)
  })
})
