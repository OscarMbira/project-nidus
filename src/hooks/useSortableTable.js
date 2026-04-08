import { useState, useCallback, useMemo, useEffect } from 'react'

/**
 * @typedef {'asc' | 'desc' | null} SortDirection
 */

function readStoredSort(storageKey) {
  if (!storageKey || typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (
      parsed &&
      typeof parsed.column === 'string' &&
      (parsed.direction === 'asc' || parsed.direction === 'desc' || parsed.direction === null)
    ) {
      return { column: parsed.column, direction: parsed.direction }
    }
  } catch {
    /* ignore */
  }
  return null
}

function writeStoredSort(storageKey, sortColumn, sortDirection) {
  if (!storageKey || typeof localStorage === 'undefined') return
  try {
    if (sortColumn == null && sortDirection == null) {
      localStorage.removeItem(storageKey)
    } else {
      localStorage.setItem(storageKey, JSON.stringify({ column: sortColumn, direction: sortDirection }))
    }
  } catch {
    /* ignore */
  }
}

/** @param {unknown} v */
function toSortablePrimitive(v) {
  if (v == null) return null
  if (typeof v === 'number' && !Number.isNaN(v)) return v
  if (typeof v === 'boolean') return v ? 1 : 0
  if (v instanceof Date) return v.getTime()
  if (typeof v === 'string') {
    const t = Date.parse(v)
    if (!Number.isNaN(t) && /^\d{4}-\d{2}-\d{2}/.test(v.trim())) return t
    return v.toLowerCase()
  }
  if (typeof v === 'object' && v !== null && 'status_name' in v) {
    return String(v.status_name ?? '').toLowerCase()
  }
  return String(v).toLowerCase()
}

/**
 * @param {unknown} a
 * @param {unknown} b
 * @param {boolean} ascending
 * @returns {number}
 */
export function compareSortValues(a, b, ascending) {
  const mul = ascending ? 1 : -1
  const va = toSortablePrimitive(a)
  const vb = toSortablePrimitive(b)
  if (va == null && vb == null) return 0
  if (va == null) return 1 * mul
  if (vb == null) return -1 * mul
  if (typeof va === 'number' && typeof vb === 'number') {
    if (va < vb) return -1 * mul
    if (va > vb) return 1 * mul
    return 0
  }
  const sa = String(va)
  const sb = String(vb)
  if (sa < sb) return -1 * mul
  if (sa > sb) return 1 * mul
  return 0
}

/**
 * @param {Record<string, unknown>[]} data
 * @param {string} column
 * @param {SortDirection} direction
 * @param {Record<string, (row: Record<string, unknown>) => unknown>} accessors
 * @param {{ column: string, direction: 'asc' | 'desc' }} [defaultSort]
 */
export function sortRowsByColumn(data, sortColumn, sortDirection, accessors, defaultSort) {
  if (!Array.isArray(data) || data.length === 0) return data
  if (!accessors) return [...data]

  const effCol =
    sortColumn && sortDirection ? sortColumn : defaultSort?.column
  const effDir =
    sortColumn && sortDirection ? sortDirection : defaultSort?.direction
  if (!effCol || !effDir) return [...data]

  const get = accessors[effCol]
  if (!get) return [...data]

  const ascending = effDir === 'asc'
  return [...data].sort((rowA, rowB) =>
    compareSortValues(get(rowA), get(rowB), ascending)
  )
}

/**
 * Sortable table / list state (Platform & Simulator).
 *
 * @param {object} options
 * @param {{ column: string, direction: 'asc' | 'desc' }} [options.defaultSort]
 * @param {string} [options.storageKey] — optional localStorage key for { column, direction }
 * @param {Record<string, string>} [options.serverColumnMap] — logical key → Supabase column name
 */
export function useSortableTable(options = {}) {
  const { defaultSort = { column: 'created_at', direction: 'desc' }, storageKey, serverColumnMap = {} } = options

  const [sortColumn, setSortColumn] = useState(() => readStoredSort(storageKey)?.column ?? null)
  const [sortDirection, setSortDirection] = useState(() => readStoredSort(storageKey)?.direction ?? null)

  useEffect(() => {
    const s = readStoredSort(storageKey)
    setSortColumn(s?.column ?? null)
    setSortDirection(s?.direction ?? null)
  }, [storageKey])

  useEffect(() => {
    writeStoredSort(storageKey, sortColumn, sortDirection)
  }, [storageKey, sortColumn, sortDirection])

  const handleSort = useCallback(
    (column) => {
      if (sortColumn !== column) {
        setSortColumn(column)
        setSortDirection('asc')
        return
      }
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        setSortColumn(null)
        setSortDirection(null)
      } else {
        setSortDirection('asc')
      }
    },
    [sortColumn, sortDirection]
  )

  /** Direction for a column header (only active column shows asc/desc) */
  const getSortDirectionForColumn = useCallback(
    (column) => {
      if (sortColumn !== column) return null
      return sortDirection
    },
    [sortColumn, sortDirection]
  )

  /**
   * Client-side sort using accessors map: logical column → (row) => value
   */
  const sortedData = useCallback(
    (data, accessors) => {
      if (!Array.isArray(data) || !accessors) return data
      return sortRowsByColumn(data, sortColumn, sortDirection, accessors, defaultSort)
    },
    [sortColumn, sortDirection, defaultSort]
  )

  /**
   * For Supabase `.order(column, { ascending })` — uses active sort or falls back to defaultSort
   */
  const supabaseOrder = useMemo(() => {
    const col = sortColumn && sortDirection ? sortColumn : defaultSort.column
    const asc =
      sortColumn && sortDirection
        ? sortDirection === 'asc'
        : defaultSort.direction === 'asc'
    const dbCol = serverColumnMap[col] || col
    return { column: dbCol, ascending: asc }
  }, [sortColumn, sortDirection, defaultSort, serverColumnMap])

  return {
    sortColumn,
    sortDirection,
    handleSort,
    getSortDirectionForColumn,
    sortedData,
    supabaseOrder,
    defaultSort
  }
}

export default useSortableTable
