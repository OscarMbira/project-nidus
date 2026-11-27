/**
 * v1356 — ETag from updated_at (D5). If-Match must equal the current tag.
 */
export function etagFromUpdatedAt(updatedAt: string | null | undefined): string {
  const raw = updatedAt || ''
  return `"${raw}"`
}

export function ifMatchOk(ifMatch: string | null, current: string | null | undefined): boolean {
  if (!ifMatch) return true
  const want = ifMatch.trim()
  const have = etagFromUpdatedAt(current)
  return want === have || want === have.replaceAll('"', '') || `"${want}"` === have
}
