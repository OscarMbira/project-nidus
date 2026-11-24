/**
 * v1354 — Weighted portfolio scores (D7). Weights are percentages and must total 100.
 * A project's total is the weighted average of its 1–5 scores.
 */

export function weightTotal(criteria) {
  return (criteria || []).reduce((sum, c) => sum + (Number(c.weight) || Number(c.weight_percent) || 0), 0)
}

export function weightsAreValid(criteria) {
  return Math.abs(weightTotal(criteria) - 100) < 0.001 && (criteria || []).every((c) => (Number(c.weight ?? c.weight_percent) || 0) > 0)
}

/** @param {Array<{id, weight|weight_percent}>} criteria @param {Record<string, number>} scores */
export function projectScore(criteria, scores) {
  let total = 0
  for (const c of criteria || []) {
    const weight = Number(c.weight ?? c.weight_percent) || 0
    const score = Number(scores?.[c.id])
    if (!Number.isFinite(score)) continue
    total += score * (weight / 100)
  }
  return Math.round(total * 100) / 100
}

/** Map a strategic-contribution confidence word to the 1–5 scale. */
export function confidenceToScore(confidence) {
  const c = String(confidence || '').toLowerCase()
  if (c === 'high') return 5
  if (c === 'medium') return 3
  if (c === 'low') return 1
  return null
}
