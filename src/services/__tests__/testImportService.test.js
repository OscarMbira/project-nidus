import { describe, it, expect } from 'vitest'
import { validateImportRows } from '../testImportService'

describe('testImportService', () => {
  it('validateImportRows uses project_id by default', () => {
    const { validRows } = validateImportRows([{ title: 'T1' }], 'proj-a', {})
    expect(validRows[0].project_id).toBe('proj-a')
  })

  it('validateImportRows respects projectKey for practice imports', () => {
    const { validRows } = validateImportRows([{ title: 'T1' }], 'pp-1', {}, { projectKey: 'practice_project_id' })
    expect(validRows[0].practice_project_id).toBe('pp-1')
    expect(validRows[0].project_id).toBeUndefined()
  })
})
