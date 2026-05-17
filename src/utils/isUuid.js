/**
 * Strict RFC-style UUID v4 detector (for distinguishing codes such as PRJ-0001).
 * @param {unknown} str
 * @returns {boolean}
 */
export const isUuid = (str) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str ?? '')

/** Any canonical 8-4-4-4-12 hex id (legacy bookmarks may be non-v4). */
const LOOSE_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * True if the segment should be treated as a database id without code lookup.
 * @param {unknown} str
 * @returns {boolean}
 */
export function isLikelyDatabaseUuid(str) {
  if (str == null || typeof str !== 'string') return false
  const t = str.trim()
  return isUuid(t) || LOOSE_UUID_RE.test(t)
}
