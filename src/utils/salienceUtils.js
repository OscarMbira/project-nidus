/**
 * Salience model (Mitchell et al.): Power × Legitimacy × Urgency.
 * High = level >= 4. Returns one of: latent, dormant, discretionary, demanding,
 * dependent, dominant, dangerous, definitive.
 *
 * @param {number} power - Power level 1–5
 * @param {number} legitimacy - Legitimacy level 1–5
 * @param {number} urgency - Urgency level 1–5
 * @returns {string} Salience class
 */
export function salienceClassFromPLU(power, legitimacy, urgency) {
  const p = power ?? 0
  const l = legitimacy ?? 0
  const u = urgency ?? 0
  const high = (v) => v >= 4
  const pH = high(p)
  const lH = high(l)
  const uH = high(u)
  const count = [pH, lH, uH].filter(Boolean).length
  if (count === 0) return 'latent'
  if (count === 1) {
    if (pH) return 'dormant'
    if (lH) return 'discretionary'
    return 'demanding'
  }
  if (count === 2) {
    if (pH && lH) return 'dominant'
    if (pH && uH) return 'dangerous'
    return 'dependent'
  }
  return 'definitive'
}

/**
 * Get salience class from a record with power_level, legitimacy_level, urgency_level (or salience_class).
 *
 * @param {{ power_level?: number, legitimacy_level?: number, urgency_level?: number, salience_class?: string }} rec
 * @returns {string}
 */
export function getSalienceClassFromRecord(rec) {
  if (!rec) return 'latent'
  if (rec.salience_class) return rec.salience_class
  return salienceClassFromPLU(
    rec.power_level ?? 0,
    rec.legitimacy_level ?? 0,
    rec.urgency_level ?? 0
  )
}
