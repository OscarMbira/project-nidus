/**
 * v1356 — cursor pagination (limit ≤ 200) (D5).
 */
export const MAX_LIMIT = 200
export const DEFAULT_LIMIT = 50

export type CursorPage = {
  limit: number
  cursor: string | null
}

export function parsePagination(url: URL): CursorPage {
  const raw = Number(url.searchParams.get('limit') || DEFAULT_LIMIT)
  const limit = Number.isFinite(raw) ? Math.min(MAX_LIMIT, Math.max(1, Math.floor(raw))) : DEFAULT_LIMIT
  const cursor = url.searchParams.get('cursor') || null
  return { limit, cursor }
}

export function encodeCursor(value: { updated_at: string; id: string }): string {
  return btoa(JSON.stringify(value))
}

export function decodeCursor(cursor: string | null): { updated_at: string; id: string } | null {
  if (!cursor) return null
  try {
    const parsed = JSON.parse(atob(cursor))
    if (parsed && typeof parsed.updated_at === 'string' && typeof parsed.id === 'string') return parsed
  } catch {
    /* ignore */
  }
  return null
}

export function nextCursorFromRows<T extends { updated_at?: string; id: string }>(rows: T[], limit: number): string | null {
  if (rows.length < limit) return null
  const last = rows[rows.length - 1]
  return encodeCursor({ updated_at: last.updated_at || '', id: last.id })
}
