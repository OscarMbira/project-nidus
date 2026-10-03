/**
 * Parse / serialize Benefits Review Plan scope items with benefit owners.
 * Stored in scope_description (TEXT): JSON array of { item, owner_user_id, owner_name }.
 * Legacy plain newline text → items with no owner.
 */

export function parseScopeItemsWithOwners(value) {
  if (value == null || value === '') return []
  if (Array.isArray(value)) {
    return value
      .map((row) => ({
        item: String(row?.item ?? row?.scope_item ?? row?.description ?? '').trim(),
        owner_user_id: String(row?.owner_user_id ?? row?.owner_id ?? '').trim(),
        owner_name: String(row?.owner_name ?? row?.owner ?? '').trim(),
      }))
      .filter((row) => row.item)
  }

  const raw = String(value).trim()
  if (!raw) return []

  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parseScopeItemsWithOwners(parsed)
    } catch {
      /* fall through */
    }
  }

  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((item) => ({ item, owner_user_id: '', owner_name: '' }))
}

export function serializeScopeItemsWithOwners(rows) {
  const cleaned = (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      item: String(row?.item ?? '').trim(),
      owner_user_id: String(row?.owner_user_id ?? '').trim(),
      owner_name: String(row?.owner_name ?? '').trim(),
    }))
    .filter((row) => row.item)
  if (!cleaned.length) return ''
  return JSON.stringify(cleaned)
}

export function formatScopeItemsWithOwnersForDisplay(value) {
  const rows = parseScopeItemsWithOwners(value)
  if (!rows.length) return ''
  return rows
    .map((row) => (row.owner_name ? `${row.item} (Owner: ${row.owner_name})` : row.item))
    .join('\n')
}
