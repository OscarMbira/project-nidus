export function parseShorthandNumber(input) {
  if (typeof input === 'number') return Number.isFinite(input) ? input : 0
  if (typeof input !== 'string') return 0

  const value = input.trim().toLowerCase().replace(/,/g, '')
  if (!value) return 0

  const match = value.match(/^(-?\d+(?:\.\d+)?)([kmt])?$/)
  if (!match) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  const number = Number(match[1])
  const suffix = match[2]
  const multipliers = { k: 1000, t: 1000, m: 1000000 }
  return number * (multipliers[suffix] || 1)
}

export function calculateRiskScore(probability, impact) {
  return parseShorthandNumber(probability) * parseShorthandNumber(impact)
}

export function calculateThreePointDuration(optimistic, mostLikely, pessimistic) {
  const o = parseShorthandNumber(optimistic)
  const m = parseShorthandNumber(mostLikely)
  const p = parseShorthandNumber(pessimistic)
  return (o + 4 * m + p) / 6
}

export function calculateEvmMetrics({ pv = 0, ev = 0, ac = 0, bac = 0 } = {}) {
  const plannedValue = parseShorthandNumber(pv)
  const earnedValue = parseShorthandNumber(ev)
  const actualCost = parseShorthandNumber(ac)
  const budgetAtCompletion = parseShorthandNumber(bac)

  const sv = earnedValue - plannedValue
  const cv = earnedValue - actualCost
  const spi = plannedValue === 0 ? 0 : earnedValue / plannedValue
  const cpi = actualCost === 0 ? 0 : earnedValue / actualCost
  const eac = cpi === 0 ? budgetAtCompletion : budgetAtCompletion / cpi
  const etc = eac - actualCost
  const vac = budgetAtCompletion - eac
  const tcpi = (budgetAtCompletion - earnedValue) === 0
    ? 0
    : (budgetAtCompletion - earnedValue) / Math.max(1, (budgetAtCompletion - actualCost))

  return { sv, cv, spi, cpi, eac, etc, vac, tcpi }
}
