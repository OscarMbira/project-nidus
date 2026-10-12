const CLOSED_STATUSES = new Set(['closed', 'expired'])

function scoreToken(risk) {
  return String(risk?.pre_risk_score ?? risk?.risk_level ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
}

/** High or very high from the stored score label, or from probability × impact when the label is blank. */
export function isHighOrVeryHighRisk(risk) {
  const token = scoreToken(risk)
  if (token === 'high' || token === 'very_high' || token === 'critical') return true
  if (token) return false
  const expected = Number(risk?.pre_expected_value)
  if (Number.isFinite(expected) && risk?.pre_expected_value != null && expected >= 12) return true
  const probability = Number(risk?.pre_probability)
  const impact = Number(risk?.pre_impact)
  return Number.isFinite(probability) && Number.isFinite(impact) && probability * impact >= 12
}

export function isActiveRisk(risk) {
  const status = String(risk?.status_enum || risk?.status || '').trim().toLowerCase()
  if (!status) return true
  return !CLOSED_STATUSES.has(status)
}

export function hasResponsePlan(risk) {
  return String(risk?.response_strategy || risk?.response_category || '').trim().length > 0
}

export function summariseProjectRisks(risks = []) {
  const list = Array.isArray(risks) ? risks : []
  const active = list.filter(isActiveRisk)
  const high = list.filter(isHighOrVeryHighRisk)
  const highActive = active.filter(isHighOrVeryHighRisk)
  return {
    total: list.length,
    active: active.length,
    high: high.length,
    highActive,
    withoutResponsePlan: highActive.filter((risk) => !hasResponsePlan(risk)),
  }
}

export function topOpenRisks(risks = [], limit = 5) {
  return (Array.isArray(risks) ? risks : [])
    .filter(isActiveRisk)
    .slice()
    .sort((a, b) => {
      const av = Number(a?.pre_expected_value) || 0
      const bv = Number(b?.pre_expected_value) || 0
      if (bv !== av) return bv - av
      return String(a?.risk_title || '').localeCompare(String(b?.risk_title || ''))
    })
    .slice(0, limit)
    .map((risk) => ({
      risk_id: risk.id,
      risk_identifier: risk.risk_identifier || risk.risk_code || '',
      title: risk.risk_title || '',
      risk_score: risk.pre_risk_score || risk.risk_level || '',
      expected_value: risk.pre_expected_value,
    }))
}
