import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  useSortableTable,
  compareSortValues,
  sortRowsByColumn
} from '../useSortableTable'

describe('compareSortValues', () => {
  it('sorts strings ascending', () => {
    expect(compareSortValues('a', 'b', true)).toBeLessThan(0)
    expect(compareSortValues('b', 'a', true)).toBeGreaterThan(0)
  })

  it('sorts numbers descending', () => {
    expect(compareSortValues(10, 2, false)).toBeLessThan(0)
  })
})

describe('sortRowsByColumn', () => {
  const rows = [
    { name: 'B', n: 2 },
    { name: 'A', n: 1 }
  ]
  const accessors = {
    name: (r) => r.name,
    n: (r) => r.n
  }

  it('uses defaultSort when no active sort', () => {
    const out = sortRowsByColumn(rows, null, null, accessors, { column: 'name', direction: 'asc' })
    expect(out.map((r) => r.name)).toEqual(['A', 'B'])
  })

  it('uses active sort when set', () => {
    const out = sortRowsByColumn(rows, 'n', 'desc', accessors, { column: 'name', direction: 'asc' })
    expect(out.map((r) => r.n)).toEqual([2, 1])
  })
})

describe('useSortableTable', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn()
    })
  })

  it('cycles sort on same column: asc -> desc -> clear', () => {
    const { result } = renderHook(() =>
      useSortableTable({ defaultSort: { column: 'id', direction: 'asc' } })
    )
    act(() => result.current.handleSort('name'))
    expect(result.current.sortColumn).toBe('name')
    expect(result.current.sortDirection).toBe('asc')
    act(() => result.current.handleSort('name'))
    expect(result.current.sortDirection).toBe('desc')
    act(() => result.current.handleSort('name'))
    expect(result.current.sortColumn).toBe(null)
    expect(result.current.sortDirection).toBe(null)
  })

  it('switching column starts at asc', () => {
    const { result } = renderHook(() =>
      useSortableTable({ defaultSort: { column: 'id', direction: 'asc' } })
    )
    act(() => result.current.handleSort('a'))
    act(() => result.current.handleSort('b'))
    expect(result.current.sortColumn).toBe('b')
    expect(result.current.sortDirection).toBe('asc')
  })

  it('supabaseOrder falls back to defaultSort when cleared', () => {
    const { result } = renderHook(() =>
      useSortableTable({
        defaultSort: { column: 'created_at', direction: 'desc' },
        serverColumnMap: { created_at: 'created_at' }
      })
    )
    expect(result.current.supabaseOrder.column).toBe('created_at')
    expect(result.current.supabaseOrder.ascending).toBe(false)
  })
})
