/** Convert stored suite tags (array or legacy comma text) into a newline list. */
export function tagsToMultiline(tags) {
  if (Array.isArray(tags)) {
    return tags.map((tag) => String(tag).trim()).filter(Boolean).join('\n')
  }
  if (typeof tags === 'string') {
    return tags.split(/,|\r?\n/).map((tag) => tag.trim()).filter(Boolean).join('\n')
  }
  return ''
}

/** Persist a newline list as a JSON array of tag strings. */
export function multilineToTags(value) {
  return String(value || '').split(/\r?\n/).map((tag) => tag.trim()).filter(Boolean)
}

/**
 * Selected environment ids for a suite.
 * Uses environment_ids when present, otherwise matches the legacy single name.
 */
export function environmentIdsFromSuite(suite, options = []) {
  const raw = suite?.environment_ids
  const ids = Array.isArray(raw) ? raw.map((id) => String(id)).filter(Boolean) : []
  if (ids.length) return ids
  const legacy = String(suite?.environment || '').trim().toLowerCase()
  if (!legacy) return []
  const match = (options || []).find((option) => String(option.name || '').trim().toLowerCase() === legacy)
  return match ? [String(match.id)] : []
}

/** Comma-joined names for the legacy single environment column (max 100). */
export function legacyEnvironmentLabel(ids, options = []) {
  const names = (ids || [])
    .map((id) => (options || []).find((option) => String(option.id) === String(id))?.name)
    .filter(Boolean)
  return names.join(', ').slice(0, 100)
}
