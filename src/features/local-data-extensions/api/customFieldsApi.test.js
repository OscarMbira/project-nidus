import { describe, it, expect, vi } from 'vitest'
import { pickDefinitionUpsertPayload, upsertDefinition } from './customFieldsApi'

describe('pickDefinitionUpsertPayload', () => {
  it('keeps only definition table keys', () => {
    const out = pickDefinitionUpsertPayload({
      id: 'u1',
      account_id: 'a1',
      field_code: 'fc',
      label: 'L',
      validation_rules: { required: true },
      options: [{ option_value: 'x' }],
      system_screens: {},
      junk: 1,
    })
    expect(out.options).toBeUndefined()
    expect(out.junk).toBeUndefined()
    expect(out.field_code).toBe('fc')
    expect(out.validation_rules).toEqual({ required: true })
  })
})

describe('upsertDefinition', () => {
  it('strips non-column keys before update', async () => {
    const single = vi.fn(() => Promise.resolve({ data: { id: 'u1', field_code: 'fc' }, error: null }))
    const select = vi.fn(() => ({ single }))
    const eq = vi.fn(() => ({ select }))
    const update = vi.fn(() => ({ eq }))
    const from = vi.fn(() => ({ update }))
    const platformDb = { from }

    const res = await upsertDefinition(
      platformDb,
      {
        id: 'u1',
        label: 'New label',
        validation_rules: {},
        options: [{ option_value: 'x' }],
      },
      'user-1'
    )

    expect(res.success).toBe(true)
    expect(update).toHaveBeenCalled()
    const row = update.mock.calls[0][0]
    expect(row.options).toBeUndefined()
    expect(row.label).toBe('New label')
    expect(row.updated_by).toBe('user-1')
  })
})
