/**
 * Unit tests for simProjectIndustryService (v1106 practice project multi-industry
 * classification). Simulator parity for projectIndustryService.test.js (Platform), minus the
 * legacy-column sync since sim.practice_projects has no equivalent single column.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

function matchFilters(row, filters) {
  return filters.every(([col, op, val]) => {
    if (op === 'eq') return row[col] === val
    if (op === 'in') return (val || []).includes(row[col])
    return true
  })
}

function makeFakeDb(initialState) {
  const state = initialState
  let idCounter = 1

  function builder(table) {
    let mode = null
    let payload = null
    const filters = []
    let single = false

    const api = {
      select() {
        if (!mode) mode = 'select'
        return api
      },
      eq(col, val) {
        filters.push([col, 'eq', val])
        return api
      },
      in(col, vals) {
        filters.push([col, 'in', vals])
        return api
      },
      order() {
        return api
      },
      maybeSingle() {
        single = true
        return api
      },
      insert(data) {
        mode = 'insert'
        payload = data
        return api
      },
      update(data) {
        mode = 'update'
        payload = data
        return api
      },
      delete() {
        mode = 'delete'
        return api
      },
      then(resolve, reject) {
        let result
        if (mode === 'insert') {
          const row = { id: `row-${idCounter++}`, ...payload }
          state[table].push(row)
          result = { data: row, error: null }
        } else if (mode === 'update') {
          state[table] = state[table].map((r) => (matchFilters(r, filters) ? { ...r, ...payload } : r))
          result = { data: null, error: null }
        } else if (mode === 'delete') {
          state[table] = state[table].filter((r) => !matchFilters(r, filters))
          result = { data: null, error: null }
        } else {
          const rows = state[table].filter((r) => matchFilters(r, filters))
          result = single ? { data: rows[0] || null, error: null } : { data: rows, error: null }
        }
        return Promise.resolve(result).then(resolve, reject)
      },
    }
    return api
  }

  return { from: (table) => builder(table), __state: state }
}

let fakeDb

vi.mock('../../supabaseClient', () => ({
  get simDb() {
    return fakeDb
  },
}))

import { listPracticeProjectIndustries, replacePracticeProjectIndustries } from '../simProjectIndustryService'

describe('simProjectIndustryService (v1106)', () => {
  beforeEach(() => {
    fakeDb = makeFakeDb({ practice_project_industries: [] })
  })

  describe('listPracticeProjectIndustries', () => {
    it('returns empty without throwing when no practiceProjectId is given', async () => {
      const result = await listPracticeProjectIndustries(null)
      expect(result).toEqual({ success: true, data: [], error: null })
    })

    it('sorts rows primary-first', async () => {
      fakeDb.__state.practice_project_industries = [
        { id: 'pi-1', practice_project_id: 'pp-1', industry_category_id: 'ind-b', is_primary: false, industry: { id: 'ind-b', name: 'Zeta' } },
        { id: 'pi-2', practice_project_id: 'pp-1', industry_category_id: 'ind-a', is_primary: true, industry: { id: 'ind-a', name: 'Alpha' } },
      ]
      const result = await listPracticeProjectIndustries('pp-1')
      expect(result.success).toBe(true)
      expect(result.data.map((r) => r.industry_category_id)).toEqual(['ind-a', 'ind-b'])
    })
  })

  describe('replacePracticeProjectIndustries', () => {
    it('errors without a practiceProjectId', async () => {
      const result = await replacePracticeProjectIndustries(null, [{ industryCategoryId: 'ind-a' }])
      expect(result.success).toBe(false)
    })

    it('defaults the first pick to primary when none is marked', async () => {
      const result = await replacePracticeProjectIndustries('pp-1', [
        { industryCategoryId: 'ind-a' },
        { industryCategoryId: 'ind-b' },
      ], 'user-1')

      expect(result.success).toBe(true)
      const primary = result.data.find((r) => r.is_primary)
      expect(primary.industry_category_id).toBe('ind-a')
      expect(result.data).toHaveLength(2)
    })

    it('keeps exactly one primary even if the caller ticks more than one', async () => {
      const result = await replacePracticeProjectIndustries('pp-1', [
        { industryCategoryId: 'ind-a', isPrimary: true },
        { industryCategoryId: 'ind-b', isPrimary: true },
      ], 'user-1')

      const primaries = result.data.filter((r) => r.is_primary)
      expect(primaries).toHaveLength(1)
      expect(primaries[0].industry_category_id).toBe('ind-a')
    })

    it('removes rows no longer selected (delete-down-to-zero)', async () => {
      await replacePracticeProjectIndustries('pp-1', [{ industryCategoryId: 'ind-a', isPrimary: true }], 'user-1')
      const result = await replacePracticeProjectIndustries('pp-1', [], 'user-1')

      expect(result.success).toBe(true)
      expect(result.data).toEqual([])
    })

    it('updates an existing row in place instead of duplicating it', async () => {
      await replacePracticeProjectIndustries('pp-1', [{ industryCategoryId: 'ind-a', isPrimary: true }], 'user-1')
      await replacePracticeProjectIndustries('pp-1', [{ industryCategoryId: 'ind-a', isPrimary: true }], 'user-1')

      expect(fakeDb.__state.practice_project_industries).toHaveLength(1)
    })
  })
})
