/**
 * v1355 — percentiles, chance of the target, histogram, S-curve, tornado, criticality,
 * contingency (D8, D9).
 */

/** Linear percentile of a sorted numeric array. p is 0–100. */
export function percentile(sorted, p) {
  if (!sorted?.length) return null
  if (sorted.length === 1) return sorted[0]
  const rank = (Math.min(100, Math.max(0, p)) / 100) * (sorted.length - 1)
  const lo = Math.floor(rank)
  const hi = Math.ceil(rank)
  if (lo === hi) return sorted[lo]
  const frac = rank - lo
  return sorted[lo] * (1 - frac) + sorted[hi] * frac
}

/** Date percentile: the sample at the nearest rank (dates do not interpolate). */
export function percentileDate(sortedDates, p) {
  if (!sortedDates?.length) return null
  const rank = (Math.min(100, Math.max(0, p)) / 100) * (sortedDates.length - 1)
  return sortedDates[Math.round(rank)]
}

export function chanceOfMeeting(values, target, { dates = false } = {}) {
  if (target == null || target === '' || !values?.length) return null
  const n = values.length
  const hit = dates
    ? values.filter((v) => String(v) <= String(target).slice(0, 10)).length
    : values.filter((v) => Number(v) <= Number(target)).length
  return hit / n
}

export function histogram(values, bins = 12) {
  if (!values?.length) return []
  const nums = values.map(Number).filter((n) => Number.isFinite(n))
  if (!nums.length) return []
  const lo = Math.min(...nums)
  const hi = Math.max(...nums)
  if (lo === hi) return [{ from: lo, to: hi, count: nums.length, share: 1 }]
  const width = (hi - lo) / bins
  const counts = Array.from({ length: bins }, () => 0)
  for (const n of nums) {
    const i = Math.min(bins - 1, Math.floor((n - lo) / width))
    counts[i] += 1
  }
  return counts.map((count, i) => ({
    from: lo + i * width,
    to: lo + (i + 1) * width,
    count,
    share: count / nums.length,
  }))
}

/** Cumulative share after each bin (the S-curve). */
export function sCurve(bins) {
  let cum = 0
  return (bins || []).map((b) => {
    cum += b.share
    return { at: b.to, share: cum }
  })
}

function averageRanks(values) {
  const order = values.map((v, i) => ({ v: Number(v), i })).sort((a, b) => a.v - b.v)
  const ranks = new Array(values.length)
  let i = 0
  while (i < order.length) {
    let j = i
    while (j + 1 < order.length && order[j + 1].v === order[i].v) j += 1
    const avg = (i + j) / 2 + 1
    for (let k = i; k <= j; k++) ranks[order[k].i] = avg
    i = j + 1
  }
  return ranks
}

function pearson(xs, ys) {
  const n = xs.length
  if (n < 3) return 0
  let sx = 0
  let sy = 0
  for (let i = 0; i < n; i++) {
    sx += xs[i]
    sy += ys[i]
  }
  const mx = sx / n
  const my = sy / n
  let num = 0
  let dx = 0
  let dy = 0
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx
    const b = ys[i] - my
    num += a * b
    dx += a * a
    dy += b * b
  }
  if (dx === 0 || dy === 0) return 0
  return num / Math.sqrt(dx * dy)
}

/** Spearman rank correlation. */
export function spearman(xs, ys) {
  if (!xs || xs.length !== ys?.length || xs.length < 3) return 0
  return pearson(averageRanks(xs), averageRanks(ys))
}

/**
 * Biggest drivers. `drivers` is [{ id, label, kind, samples }].
 * Ranked by |correlation| with the outcome. Sign is kept (positive = pushes the outcome up).
 */
export function tornado(drivers, outcome, { top = 8 } = {}) {
  const rows = (drivers || [])
    .map((d) => ({
      id: d.id,
      label: d.label,
      kind: d.kind,
      correlation: spearman(d.samples, outcome),
    }))
    .filter((d) => d.correlation !== 0)
    .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
  return rows.slice(0, top)
}

export function criticalityIndex(hits, iterations) {
  const n = iterations || 1
  return Object.entries(hits || {})
    .map(([taskId, count]) => ({ taskId, criticality: count / n }))
    .sort((a, b) => b.criticality - a.criticality || a.taskId.localeCompare(b.taskId))
}

/**
 * Recommended contingency at the chosen confidence.
 * Cost: P-value − base budget. Schedule: working days from the planned finish to the P-date
 * (passed in already as day offsets: pDay − plannedDay).
 */
export function contingency({ pCost, baseBudget, held = 0, pDay = null, plannedDay = 0 }) {
  const recommendedCost = pCost == null || baseBudget == null ? null : Number(pCost) - Number(baseBudget)
  const recommendedScheduleDays = pDay == null ? null : Number(pDay) - Number(plannedDay)
  const heldN = Number(held) || 0
  return {
    recommendedCost,
    recommendedScheduleDays,
    held: heldN,
    gap: recommendedCost == null ? null : recommendedCost - heldN,
  }
}
