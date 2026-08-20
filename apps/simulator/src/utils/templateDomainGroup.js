/**
 * v851 — Organisational / Project Templates sidebar split (Forms vs Templates).
 * domainGroup=forms → form_template only; domainGroup=templates → everything else.
 */

export function normalizeDomainGroup(value) {
  const v = String(value || '').trim().toLowerCase()
  if (v === 'forms' || v === 'templates') return v
  return null
}

/**
 * @param {object[]} rows
 * @param {{ domainGroup?: string|null, domainFilter?: string }} opts
 */
export function filterRowsByDomainGroup(rows = [], { domainGroup = null, domainFilter = '' } = {}) {
  const group = normalizeDomainGroup(domainGroup)
  let list = rows || []
  if (group === 'templates') {
    return list.filter((r) => r.domain !== 'form_template')
  }
  if (group === 'forms') {
    return list.filter((r) => r.domain === 'form_template')
  }
  if (domainFilter) {
    return list.filter((r) => r.domain === domainFilter)
  }
  return list
}

export function domainGroupHeadingSuffix(domainGroup) {
  const group = normalizeDomainGroup(domainGroup)
  if (group === 'forms') return ' — Forms'
  if (group === 'templates') return ' — Templates'
  return ''
}
