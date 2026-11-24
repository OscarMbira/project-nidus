/**
 * v1355 — seeded draws for quantitative risk analysis (D4, D7, D8).
 * Triangular is the default. PERT is the beta-PERT with λ = 4. Uniform is flat between
 * minimum and maximum. A "moves together" group shares one draw, blended by strength
 * (Low 0.3, Medium 0.6, High 0.9) so the items stay partly independent.
 * The same seed always produces the same sequence.
 */

export const GROUP_STRENGTH = { low: 0.3, medium: 0.6, high: 0.9 }

const ACKLAM_A = [
  -3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02,
  1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00,
]
const ACKLAM_B = [
  -5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02,
  6.680131188771972e+01, -1.328068155288572e+01,
]
const ACKLAM_C = [
  -7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00,
  -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00,
]
const ACKLAM_D = [
  7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00,
]

/** Standard normal quantile (Acklam). p is clamped away from 0 and 1. */
export function inverseNormal(p) {
  const pp = Math.min(1 - 1e-12, Math.max(1e-12, Number(p)))
  const plow = 0.02425
  if (pp < plow) {
    const q = Math.sqrt(-2 * Math.log(pp))
    return (((((ACKLAM_C[0] * q + ACKLAM_C[1]) * q + ACKLAM_C[2]) * q + ACKLAM_C[3]) * q + ACKLAM_C[4]) * q + ACKLAM_C[5]) /
      ((((ACKLAM_D[0] * q + ACKLAM_D[1]) * q + ACKLAM_D[2]) * q + ACKLAM_D[3]) * q + 1)
  }
  if (pp > 1 - plow) {
    const q = Math.sqrt(-2 * Math.log(1 - pp))
    return -(((((ACKLAM_C[0] * q + ACKLAM_C[1]) * q + ACKLAM_C[2]) * q + ACKLAM_C[3]) * q + ACKLAM_C[4]) * q + ACKLAM_C[5]) /
      ((((ACKLAM_D[0] * q + ACKLAM_D[1]) * q + ACKLAM_D[2]) * q + ACKLAM_D[3]) * q + 1)
  }
  const q = pp - 0.5
  const r = q * q
  return (((((ACKLAM_A[0] * r + ACKLAM_A[1]) * r + ACKLAM_A[2]) * r + ACKLAM_A[3]) * r + ACKLAM_A[4]) * r + ACKLAM_A[5]) * q /
    (((((ACKLAM_B[0] * r + ACKLAM_B[1]) * r + ACKLAM_B[2]) * r + ACKLAM_B[3]) * r + ACKLAM_B[4]) * r + 1)
}

/** Standard normal CDF (Abramowitz and Stegun 26.2.17). */
export function normalCdf(z) {
  const x = Number(z)
  const t = 1 / (1 + 0.2316419 * Math.abs(x))
  const d = 0.3989422804014327 * Math.exp(-0.5 * x * x)
  const p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))))
  return x >= 0 ? 1 - p : p
}

/** Mulberry32. `seed` is stored and the sequence is fully determined by it. */
export function createRng(seed) {
  let a = (Number(seed) >>> 0) || 1
  return {
    seed: a,
    next() {
      a = (a + 0x6d2b79f5) | 0
      let t = Math.imul(a ^ (a >>> 15), 1 | a)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    },
  }
}

export function randomSeed() {
  return Math.floor(Math.random() * 0x7fffffff) + 1
}

function sampleGamma(rng, shape) {
  if (shape < 1) return sampleGamma(rng, shape + 1) * rng.next() ** (1 / shape)
  const d = shape - 1 / 3
  const c = 1 / Math.sqrt(9 * d)
  for (;;) {
    let x
    let v
    do {
      x = inverseNormal(rng.next())
      v = 1 + c * x
    } while (v <= 0)
    v = v * v * v
    const u = rng.next()
    if (u < 1 - 0.0331 * x * x * x * x) return d * v
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v
  }
}

function sampleBeta(rng, alpha, beta) {
  const x = sampleGamma(rng, alpha)
  const y = sampleGamma(rng, beta)
  return x / (x + y)
}

export function sampleUniform(min, max, u) {
  return min + (max - min) * u
}

export function sampleTriangular(min, mode, max, u) {
  if (max === min) return min
  const c = (mode - min) / (max - min)
  if (u <= c) return min + Math.sqrt(u * (max - min) * (mode - min))
  return max - Math.sqrt((1 - u) * (max - min) * (max - mode))
}

/** Beta-PERT. λ = 4, so the mean is (min + 4·mode + max) / 6. */
export function samplePert(rng, min, mode, max) {
  if (max === min) return min
  const span = max - min
  const alpha = 1 + 4 * ((mode - min) / span)
  const beta = 1 + 4 * ((max - mode) / span)
  return min + span * sampleBeta(rng, alpha, beta)
}

export function distributionMean(kind, min, mode, max) {
  if (min == null || max == null || mode == null) return mode ?? min ?? max ?? null
  if (kind === 'pert') return (min + 4 * mode + max) / 6
  if (kind === 'uniform') return (min + max) / 2
  return (min + mode + max) / 3
}

/**
 * One uniform in (0, 1) for an item. Grouped items blend a shared group draw with a
 * private draw (Gaussian copula) at the group's strength.
 */
export function unitDraw(rng, { groupId, strength } = {}, groupDraws) {
  const shared = groupId && groupDraws ? groupDraws.get(groupId) : null
  const rho = GROUP_STRENGTH[strength] || 0
  if (shared == null || !rho) return Math.min(1 - 1e-12, Math.max(1e-12, rng.next()))
  const z = rho * inverseNormal(shared) + Math.sqrt(1 - rho * rho) * inverseNormal(rng.next())
  return Math.min(1 - 1e-12, Math.max(1e-12, normalCdf(z)))
}

export function prepareGroupDraws(rng, groups = []) {
  const draws = new Map()
  for (const g of groups) {
    if (g?.id) draws.set(g.id, Math.min(1 - 1e-12, Math.max(1e-12, rng.next())))
  }
  return draws
}

/**
 * Sample a three-point range. A point estimate (no min/max, or min = max) is returned as-is.
 * `u` is optional; when omitted a fresh draw is taken.
 */
export function sampleRange(rng, { min, mode, max, distribution = 'triangular', groupId, strength } = {}, groupDraws, u) {
  const lo = numberOrNull(min)
  const hi = numberOrNull(max)
  const mid = numberOrNull(mode)
  if (lo == null || hi == null || lo === hi) return mid ?? lo ?? hi ?? 0
  const modeClamped = Math.min(hi, Math.max(lo, mid ?? (lo + hi) / 2))
  const unit = u ?? unitDraw(rng, { groupId, strength }, groupDraws)
  if (distribution === 'uniform') return sampleUniform(lo, hi, unit)
  if (distribution === 'pert') {
    const independent = samplePert(rng, lo, modeClamped, hi)
    const rho = GROUP_STRENGTH[strength] || 0
    if (!rho || u != null) return independent
    const shared = sampleTriangular(lo, modeClamped, hi, unit)
    return (1 - rho) * independent + rho * shared
  }
  return sampleTriangular(lo, modeClamped, hi, unit)
}

export function numberOrNull(value) {
  if (value == null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}
