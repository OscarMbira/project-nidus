/** Pure helpers for organisation risk-category duplicate and similar-name checks. */

export function normaliseRiskLabel(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

export function isDuplicateLabel(candidate, existingNames) {
  const normalised = normaliseRiskLabel(candidate)
  if (!normalised) return false
  return (existingNames || []).some((name) => normaliseRiskLabel(name) === normalised)
}

/**
 * Catalogue names that contain the typed text, or that the typed text contains.
 * Exact matches are excluded — those are duplicates, not suggestions.
 */
export function similarCatalogueNames(candidate, rows, limit = 5) {
  const normalised = normaliseRiskLabel(candidate)
  if (normalised.length < 2) return []
  const matches = []
  for (const row of rows || []) {
    const name = normaliseRiskLabel(row?.name)
    if (!name || name === normalised) continue
    if (name.includes(normalised) || normalised.includes(name)) {
      matches.push(row)
      if (matches.length >= limit) break
    }
  }
  return matches
}

/** Current project first, then name order. Capped at `limit`. */
export function orderSimilarRisks(risks, currentProjectId, limit = 5) {
  return [...(risks || [])]
    .sort((a, b) => {
      const aHere = currentProjectId && a.project_id === currentProjectId ? 0 : 1
      const bHere = currentProjectId && b.project_id === currentProjectId ? 0 : 1
      if (aHere !== bHere) return aHere - bHere
      return normaliseRiskLabel(a.risk_title).localeCompare(normaliseRiskLabel(b.risk_title))
    })
    .slice(0, limit)
}
