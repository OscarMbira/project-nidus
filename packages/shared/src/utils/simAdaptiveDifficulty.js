/**
 * v1272 Phase 3 — Simulator adaptive difficulty (PRD D27). Rule-based and pure.
 *
 * Each simulated day: a performance band from the run's metrics → the difficulty level moves at most
 * one step (1–5), always within the scenario author's min/max → the level tunes the existing NPC
 * template controls. Options, impacts and scoring of events are never changed.
 */

export const BANDS = ['struggling', 'on_track', 'excelling']
export const SEVERITIES = ['low', 'medium', 'high', 'critical']

const avg = (xs) => {
  const v = xs.map(Number).filter((x) => Number.isFinite(x))
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
}

/**
 * @param {object} m  { health: {metric: 0-100}, eventScores: number[], moduleScores: number[], trust: number[] (−100..100), assessor: number[] (0-100) }
 * @returns {{ band: string, index: number|null, parts: object }}
 */
export function performanceBand(m = {}) {
  const health = avg(Object.entries(m.health || {}).filter(([k, v]) => k !== 'schedule_variance_days' && typeof v === 'number').map(([, v]) => v))
  const events = avg((m.eventScores || []).slice(-5))
  const modules = avg(m.moduleScores || [])
  const trust = avg(m.trust || [])
  const assessor = avg((m.assessor || []).slice(-3))
  const parts = { health, events, modules, trust: trust == null ? null : (trust + 100) / 2, assessor }
  const weights = { health: 0.35, events: 0.25, modules: 0.1, trust: 0.15, assessor: 0.15 }
  let sum = 0
  let w = 0
  for (const [k, v] of Object.entries(parts)) {
    if (v == null) continue
    sum += v * weights[k]
    w += weights[k]
  }
  const index = w ? Math.round((sum / w) * 10) / 10 : null
  const band = index == null ? 'on_track' : index < 55 ? 'struggling' : index >= 78 ? 'excelling' : 'on_track'
  return { band, index, parts }
}

export function startingLevel(scenario) {
  const min = scenario?.min_difficulty ?? 2
  const max = scenario?.max_difficulty ?? 4
  return Math.round((min + max) / 2)
}

/** One step towards the band, inside the author's range. */
export function nextDifficultyLevel(current, band, scenario) {
  const min = scenario?.min_difficulty ?? 1
  const max = scenario?.max_difficulty ?? 5
  const from = Math.min(max, Math.max(min, Number(current) || startingLevel(scenario)))
  if (scenario?.adaptive_enabled === false) return from
  const step = band === 'struggling' ? -1 : band === 'excelling' ? 1 : 0
  return Math.min(max, Math.max(min, from + step))
}

/** Template controls for a level: more, harder, faster events as the level rises. */
export function templateControls(level) {
  const l = Math.min(5, Math.max(1, Number(level) || 3))
  return {
    level: l,
    severityCap: SEVERITIES[Math.min(3, Math.max(1, l - 1))], // levels 1–2: up to medium, 3: high, 4–5: critical
    weightBoost: { low: 6 - l, medium: 3, high: l - 1, critical: Math.max(0, l - 3) * 2 },
    cooldownFactor: [1.5, 1.25, 1, 0.85, 0.7][l - 1],
    deadlineDays: [4, 3, 3, 2, 2][l - 1],
    maxEvents: l >= 4 ? 3 : 2,
  }
}

/**
 * Pick today's templates: filter by severity cap and scaled cooldown, then highest adjusted weight
 * first (ties by template code) — deterministic, no randomness, no AI.
 */
export function selectTemplates(candidates = [], controls, { simDay = 0, fired = {}, max = controls?.maxEvents ?? 2 } = {}) {
  const capIndex = SEVERITIES.indexOf(controls?.severityCap || 'critical')
  return candidates
    .filter((t) => SEVERITIES.indexOf(t.severity) <= capIndex)
    .filter((t) => {
      const last = fired[t.template_code]
      if (typeof last !== 'number') return true
      return simDay - last >= Math.max(1, Math.round((t.cooldown_days || 7) * (controls?.cooldownFactor ?? 1)))
    })
    .map((t) => ({ t, w: (Number(t.weight) || 10) + (controls?.weightBoost?.[t.severity] ?? 0) * 5 }))
    .sort((a, b) => b.w - a.w || String(a.t.template_code).localeCompare(String(b.t.template_code)))
    .slice(0, max)
    .map((x) => x.t)
}

/** Response time in days for an event: shorter at higher levels, and when the emitting NPC's trust is low (D15). */
export function responseDeadlineDays(controls, trust = 0) {
  const base = controls?.deadlineDays ?? 3
  return trust < -30 ? Math.max(1, base - 1) : base
}
