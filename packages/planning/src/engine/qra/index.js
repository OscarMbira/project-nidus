export {
  createRng, randomSeed, sampleTriangular, sampleUniform, samplePert, sampleRange,
  distributionMean, unitDraw, prepareGroupDraws, inverseNormal, normalCdf, GROUP_STRENGTH,
} from './distributions.js'
export {
  DEFAULT_PROBABILITY_BANDS, normaliseBands, scoreFromPercent, midpointFromScore,
  riskEmv, exposureTotals, quantifiedProblem, applyQuickRange,
} from './riskExposure.js'
export {
  percentile, percentileDate, chanceOfMeeting, histogram, sCurve, spearman, tornado,
  criticalityIndex, contingency,
} from './results.js'
export { buildAnalysisModel, clampIterations, dependencyType } from './model.js'
import { runAnalysis, runScheduleIteration, runCostIteration, withExposure } from './runAnalysis.js'

export { runAnalysis, runScheduleIteration, runCostIteration, withExposure }

/**
 * Start a run in a Web Worker, or on this thread when workers are unavailable.
 * Returns { cancel }.
 */
export function startQraRun(model, { onProgress, onDone, onError } = {}) {
  let worker = null
  let stopped = false
  const finish = (summary) => onDone?.(summary)
  const fail = (error) => onError?.(error)
  if (typeof Worker !== 'undefined') {
    try {
      worker = new Worker(new URL('./qra.worker.js', import.meta.url), { type: 'module' })
      worker.onmessage = (event) => {
        const msg = event.data || {}
        if (msg.type === 'progress') onProgress?.(msg.done, msg.total)
        else if (msg.type === 'done') finish(msg.summary)
        else if (msg.type === 'cancelled') onDone?.(null)
        else if (msg.type === 'error') fail(new Error(msg.message))
      }
      worker.onerror = (event) => fail(new Error(event.message || 'The analysis could not finish'))
      worker.postMessage({ type: 'run', model })
      return {
        cancel() {
          worker?.postMessage({ type: 'cancel' })
          worker?.terminate()
        },
      }
    } catch {
      worker = null
    }
  }
  runAnalysis(model, {
    yieldEvery: 100,
    shouldCancel: () => stopped,
    onProgress,
  }).then((result) => {
    if (!result.cancelled) finish(result.summary)
    else onDone?.(null)
  }).catch(fail)
  return { cancel() { stopped = true } }
}
