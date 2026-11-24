/**
 * v1355 — Monte Carlo off the page thread (D11). Messages:
 *   in  { type: 'run', model } | { type: 'cancel' }
 *   out { type: 'progress', done, total } | { type: 'done', summary } | { type: 'cancelled', ran } | { type: 'error', message }
 */
import { runAnalysis } from './runAnalysis.js'

let cancel = false

self.onmessage = async (event) => {
  const msg = event.data || {}
  if (msg.type === 'cancel') {
    cancel = true
    return
  }
  if (msg.type !== 'run') return
  cancel = false
  try {
    const result = await runAnalysis(msg.model, {
      yieldEvery: 100,
      shouldCancel: () => cancel,
      onProgress: (done, total) => self.postMessage({ type: 'progress', done, total }),
    })
    if (result.cancelled) self.postMessage({ type: 'cancelled', ran: result.ran, summary: result.summary })
    else self.postMessage({ type: 'done', summary: result.summary })
  } catch (error) {
    self.postMessage({ type: 'error', message: error?.message || 'The analysis could not finish' })
  }
}
