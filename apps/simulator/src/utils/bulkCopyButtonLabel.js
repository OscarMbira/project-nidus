/**
 * Label for the Template Library bulk "Copy to Organisational" control.
 * Shows progress so a long copy does not look frozen on a generic "Copying…".
 *
 * Federated modules alias @nidus/shared/utils → apps shell utils — keep in sync with
 * packages/shared/src/utils/bulkCopyButtonLabel.js
 */
export function formatBulkCopyButtonLabel({
  busy = false,
  phase = 'copy',
  finished = 0,
  total = 0,
  selectedCount = 0,
} = {}) {
  if (!busy) return `Copy ${selectedCount} to Organisational`
  if (phase === 'refresh') return 'Refreshing…'
  if (total > 0) {
    const shown = finished < total ? finished + 1 : total
    return `Copying ${shown} of ${total}…`
  }
  return 'Copying…'
}

/**
 * Run `worker` over `items` with a capped number of in-flight tasks.
 * Per-item errors must be handled inside `worker` — this does not abort the rest.
 */
export async function runPool(items, concurrency, worker) {
  const queue = [...items]
  const n = Math.max(1, Math.min(concurrency, queue.length || 1))
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (queue.length) {
        const item = queue.shift()
        if (item === undefined) return
        await worker(item)
      }
    }),
  )
}
