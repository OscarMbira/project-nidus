import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../api/customFieldValuesApi', () => ({
  fetchPublishedExportSnapshot: vi.fn(),
}))
vi.mock('../mapCustomFieldValue', () => ({
  deserializeCustomFieldValue: (_type, raw) => raw?.text_value ?? '',
}))

import { fetchPublishedExportSnapshot } from '../../api/customFieldValuesApi'
import { buildCustomFieldExportParts } from '../exportMerge'

describe('buildCustomFieldExportParts screenCode override (v1348)', () => {
  beforeEach(() => {
    fetchPublishedExportSnapshot.mockReset()
  })

  it('uses explicit screenCode for Brief vs Charter', async () => {
    fetchPublishedExportSnapshot.mockResolvedValue({
      definitions: [{ id: 'd1', field_code: 'region', label: 'Region', field_type: 'text' }],
      valuesByFieldId: { d1: { text_value: 'EMEA' } },
    })
    await buildCustomFieldExportParts(
      {},
      'acct',
      'project_brief',
      'brief-1',
      'proj-1',
      null,
      { screenCode: 'charter_detail' },
    )
    expect(fetchPublishedExportSnapshot).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ screenCode: 'charter_detail', entityType: 'project_brief' }),
    )
  })

  it('falls back to ENTITY_SCREEN_CODES when screenCode omitted', async () => {
    fetchPublishedExportSnapshot.mockResolvedValue({ definitions: [], valuesByFieldId: {} })
    await buildCustomFieldExportParts({}, 'acct', 'project_mandate', 'm1', 'proj-1')
    expect(fetchPublishedExportSnapshot).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ screenCode: 'mandate_detail' }),
    )
  })

  it('titles the section Custom Fields and marks fields as facts', async () => {
    fetchPublishedExportSnapshot.mockResolvedValue({
      definitions: [{ id: 'd1', field_code: 'region', label: 'Region', field_type: 'text' }],
      valuesByFieldId: { d1: { text_value: 'EMEA' } },
    })
    const parts = await buildCustomFieldExportParts({}, 'acct', 'pid', 'p1', 'proj-1')
    expect(parts.section.title).toBe('Custom Fields')
    expect(parts.section.fields[0]).toMatchObject({ key: 'lde_region', label: 'Region', fact: true })
    expect(parts.mergedRecord.lde_region).toBe('EMEA')
  })
})
