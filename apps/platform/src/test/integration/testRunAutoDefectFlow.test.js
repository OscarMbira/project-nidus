/**
 * Contract tests for fail → defect linkage (platform TestRunExecute + DB trigger).
 * The database trigger creates the defect; the UI uses updateExecution embed or refetch.
 */

import { describe, it, expect } from 'vitest'

/** Same resolution order as TestRunExecute onUpdate (merged = requested updates; row = API response). */
function resolveDefectForFailedRun(mergedStatus, updateRow, executionId, refetchedList) {
  let defect = updateRow?.defect
  if (mergedStatus === 'failed' && !defect?.id && refetchedList?.length) {
    defect = refetchedList.find((e) => e.id === executionId)?.defect
  }
  if (mergedStatus === 'failed' && defect?.id) return defect
  return null
}

describe('Test run auto-defect flow (client contract)', () => {
  it('uses defect from updateExecution response when embed is present', () => {
    const row = {
      id: 'ex1',
      status: 'failed',
      defect: { id: 'd1', defect_ref: 'DEF-20260327-0001' },
    }
    const d = resolveDefectForFailedRun('failed', row, 'ex1', [])
    expect(d?.defect_ref).toBe('DEF-20260327-0001')
  })

  it('falls back to refetched execution when update omits defect embed', () => {
    const row = { id: 'ex1', status: 'failed' }
    const list = [
      { id: 'ex1', defect: { id: 'd2', defect_ref: 'DEF-20260327-0002' } },
    ]
    const d = resolveDefectForFailedRun('failed', row, 'ex1', list)
    expect(d?.defect_ref).toBe('DEF-20260327-0002')
  })

  it('returns null when status is not failed', () => {
    expect(resolveDefectForFailedRun('passed', { id: 'ex1', defect: {} }, 'ex1', [])).toBeNull()
  })
})
