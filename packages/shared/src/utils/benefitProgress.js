/**
 * Share of the journey from baseline to target that the latest reading has covered.
 * Direction comes from the two ends: a lower target means "bring the number down."
 * 100 means the target is reached. Above 100 means the reading has gone past the
 * target in the intended direction. A reading that has moved the wrong way is 0.
 */
function toNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const n = typeof value === 'number' ? value : parseFloat(value)
  return Number.isFinite(n) ? n : null
}

export function benefitGapProgressPercent(benefit = {}) {
  const baseline = toNumber(benefit.baseline_value)
  const target = toNumber(benefit.target_value)
  const current = toNumber(benefit.realized_value ?? benefit.current_value)
  if (baseline === null || target === null || current === null) return 0

  const span = target - baseline
  if (span === 0) return current === target ? 100 : 0

  const percent = ((current - baseline) / span) * 100
  return percent < 0 ? 0 : percent
}
