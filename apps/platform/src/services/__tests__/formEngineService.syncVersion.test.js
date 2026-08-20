/**
 * syncFormInstanceToLatestVersion unit tests (v863 follow-up — "Update to latest template" action)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { syncFormInstanceToLatestVersion } from '../formEngineService'
import { platformDb } from '../supabase/supabaseClient'

vi.mock('../supabase/supabaseClient', () => ({
  platformDb: { from: vi.fn(), storage: { from: vi.fn() } },
  simDb: { from: vi.fn(), storage: { from: vi.fn() } },
}))

describe('syncFormInstanceToLatestVersion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('re-points template_version_id and logs an audit entry when a newer version exists', async () => {
    const instanceSingle = vi.fn().mockResolvedValue({
      data: { template_id: 'tmpl-1', template_version_id: 'v1' }, error: null,
    })
    const instanceEq = vi.fn().mockReturnValue({ single: instanceSingle })
    const instanceSelect = vi.fn().mockReturnValue({ eq: instanceEq })

    const versionSingle = vi.fn().mockResolvedValue({
      data: { id: 'v3', version_number: 3 }, error: null,
    })
    const versionEq2 = vi.fn().mockReturnValue({ single: versionSingle })
    const versionEq1 = vi.fn().mockReturnValue({ eq: versionEq2 })
    const versionSelect = vi.fn().mockReturnValue({ eq: versionEq1 })

    const updatedRow = { id: 'instance-1', template_version_id: 'v3' }
    const updateSingle = vi.fn().mockResolvedValue({ data: updatedRow, error: null })
    const updateSelect = vi.fn().mockReturnValue({ single: updateSingle })
    const updateEq = vi.fn().mockReturnValue({ select: updateSelect })
    const update = vi.fn().mockReturnValue({ eq: updateEq })

    const auditInsert = vi.fn().mockResolvedValue({ error: null })

    platformDb.from.mockImplementation((table) => {
      if (table === 'form_instances') return { select: instanceSelect, update }
      if (table === 'form_template_versions') return { select: versionSelect }
      if (table === 'form_audit_log') return { insert: auditInsert }
      throw new Error(`unexpected table: ${table}`)
    })

    const result = await syncFormInstanceToLatestVersion('instance-1', 'platform')

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ template_version_id: 'v3' }))
    expect(auditInsert).toHaveBeenCalledWith(expect.objectContaining({
      form_instance_id: 'instance-1',
      action: 'template_version.synced',
    }))
    expect(result.success).toBe(true)
    expect(result.data.alreadyCurrent).toBe(false)
    expect(result.data.versionNumber).toBe(3)
  })

  it('reports alreadyCurrent and does not write when already on the latest version', async () => {
    const instanceSingle = vi.fn().mockResolvedValue({
      data: { template_id: 'tmpl-1', template_version_id: 'v3' }, error: null,
    })
    const instanceEq = vi.fn().mockReturnValue({ single: instanceSingle })
    const instanceSelect = vi.fn().mockReturnValue({ eq: instanceEq })

    const versionSingle = vi.fn().mockResolvedValue({
      data: { id: 'v3', version_number: 3 }, error: null,
    })
    const versionEq2 = vi.fn().mockReturnValue({ single: versionSingle })
    const versionEq1 = vi.fn().mockReturnValue({ eq: versionEq2 })
    const versionSelect = vi.fn().mockReturnValue({ eq: versionEq1 })

    const update = vi.fn()

    platformDb.from.mockImplementation((table) => {
      if (table === 'form_instances') return { select: instanceSelect, update }
      if (table === 'form_template_versions') return { select: versionSelect }
      throw new Error(`unexpected table: ${table}`)
    })

    const result = await syncFormInstanceToLatestVersion('instance-1', 'platform')

    expect(update).not.toHaveBeenCalled()
    expect(result.success).toBe(true)
    expect(result.data.alreadyCurrent).toBe(true)
    expect(result.data.versionNumber).toBe(3)
  })

  it('fails cleanly when the instance id is missing', async () => {
    const result = await syncFormInstanceToLatestVersion(null, 'platform')
    expect(result.success).toBe(false)
  })
})
