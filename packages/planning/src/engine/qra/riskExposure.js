/**
 * v1355 — probability band mapping and expected monetary value (D2, D3).
 * A blank probability % uses the middle of the 1–5 band and is marked "estimated from score".
 * Opportunities are negative impacts, so their EMV reduces exposure.
 */

import { distributionMean, numberOrNull } from './distributions.js'

/** Used when the organisation has not set its own probability scale. */
export const DEFAULT_PROBABILITY_BANDS = [
  { scale: 1, min: 1, max: 20 },
  { scale: 2, min: 21, max: 40 },
  { scale: 3, min: 41, max: 60 },
  { scale: 4, min: 61, max: 80 },
  { scale: 5, min: 81, max: 99 },
]

export function normaliseBands(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return DEFAULT_PROBABILITY_BANDS
  const bands = rows
    .map((r) => ({
      scale: Number(r.scale ?? r.scale_value),
      min: Number(r.min ?? r.percentage_range_min),
      max: Number(r.max ?? r.percentage_range_max),
    }))
    .filter((b) => b.scale >= 1 && b.scale <= 5 && Number.isFinite(b.min) && Number.isFinite(b.max))
    .sort((a, b) => a.scale - b.scale)
  return bands.length ? bands : DEFAULT_PROBABILITY_BANDS
}

/** 1–5 score for an exact probability %. The nearest band wins when the % sits in a gap. */
export function scoreFromPercent(percent, bands = DEFAULT_PROBABILITY_BANDS) {
  const p = Number(percent)
  if (!Number.isFinite(p)) return null
  const list = normaliseBands(bands)
  const hit = list.find((b) => p >= Math.min(b.min, b.max) && p <= Math.max(b.min, b.max))
  if (hit) return hit.scale
  let best = list[0]
  let bestDist = Infinity
  for (const b of list) {
    const mid = (b.min + b.max) / 2
    const dist = Math.abs(p - mid)
    if (dist < bestDist) {
      best = b
      bestDist = dist
    }
  }
  return best.scale
}

/** Middle of the band, as a percent. */
export function midpointFromScore(score, bands = DEFAULT_PROBABILITY_BANDS) {
  const list = normaliseBands(bands)
  const band = list.find((b) => b.scale === Number(score)) || list[2] || list[0]
  if (!band) return 50
  return (Number(band.min) + Number(band.max)) / 2
}

function rangeOf(risk, prefix, kind) {
  const min = numberOrNull(risk[`${prefix}_${kind}_min`])
  const mode = numberOrNull(risk[`${prefix}_${kind}_ml`])
  const max = numberOrNull(risk[`${prefix}_${kind}_max`])
  return { min, mode, max }
}

/**
 * One risk's probability and EMV for a basis ('pre' or 'post').
 * Cost EMV and schedule EMV (working days) use the distribution's mean impact.
 */
export function riskEmv(risk, { basis = 'pre', bands = DEFAULT_PROBABILITY_BANDS } = {}) {
  const prefix = basis === 'post' ? 'post' : 'pre'
  const explicit = numberOrNull(risk[`${prefix}_probability_percent`] ?? (prefix === 'pre' ? risk.probability_percent : null))
  const score = Number(risk[`${prefix}_probability`] ?? risk[prefix === 'pre' ? 'probability' : 'post_probability'] ?? risk.probability) || null
  let probability
  let estimatedFromScore = false
  if (explicit != null) {
    probability = explicit / 100
  } else {
    probability = midpointFromScore(score || 3, bands) / 100
    estimatedFromScore = true
  }
  const kind = risk.impact_distribution || risk.distribution || 'triangular'
  const cost = rangeOf(risk, prefix, 'cost')
  const days = rangeOf(risk, prefix, 'schedule_days')
  const costMean = cost.mode == null && cost.min == null ? numberOrNull(risk[`${prefix}_cost_impact`]) : distributionMean(kind, cost.min ?? cost.mode, cost.mode ?? cost.min, cost.max ?? cost.mode)
  const dayMean = days.mode == null && days.min == null ? numberOrNull(risk[`${prefix}_schedule_impact_days`] ?? risk[`${prefix}_schedule_days`]) : distributionMean(kind, days.min ?? days.mode, days.mode ?? days.min, days.max ?? days.mode)
  return {
    probability,
    estimatedFromScore,
    score: explicit != null ? scoreFromPercent(explicit, bands) : score,
    costMean: costMean ?? 0,
    scheduleMeanDays: dayMean ?? 0,
    costEmv: probability * (costMean ?? 0),
    scheduleEmvDays: probability * (dayMean ?? 0),
  }
}

export function exposureTotals(risks = [], options = {}) {
  const rows = risks.map((risk) => ({ risk, ...riskEmv(risk, options) }))
  return {
    riskCount: rows.length,
    estimatedCount: rows.filter((r) => r.estimatedFromScore).length,
    costEmv: rows.reduce((s, r) => s + r.costEmv, 0),
    scheduleEmvDays: rows.reduce((s, r) => s + r.scheduleEmvDays, 0),
    rows,
  }
}

/** 'Minimum, most likely and maximum are out of order' or a percent problem; null when valid. */
export function quantifiedProblem(values, { percentKey, minKey, mlKey, maxKey }) {
  const percent = values[percentKey]
  if (percent != null && percent !== '') {
    const p = Number(percent)
    if (!Number.isFinite(p) || p < 1 || p > 99) return 'Probability % must be from 1 to 99'
  }
  const min = numberOrNull(values[minKey])
  const ml = numberOrNull(values[mlKey])
  const max = numberOrNull(values[maxKey])
  const present = [min, ml, max].filter((v) => v != null).length
  if (present === 0) return null
  if (min == null && max == null) return null
  if (min == null || ml == null || max == null) return 'Enter minimum, most likely and maximum, or only most likely'
  if (!(min <= ml && ml <= max)) return 'Minimum, most likely and maximum are out of order'
  return null
}

/** Quick % range around a point estimate. lowPct may be negative (−10 → 10% below). */
export function applyQuickRange(point, lowPct, highPct) {
  const base = Number(point) || 0
  const low = Number(lowPct) || 0
  const high = Number(highPct) || 0
  let min = roundRange(base * (1 + low / 100))
  let max = roundRange(base * (1 + high / 100))
  if (min > max) [min, max] = [max, min]
  return { min, ml: roundRange(base), max }
}

function roundRange(n) {
  return Math.round(n * 100) / 100
}
