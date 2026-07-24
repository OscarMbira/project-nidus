import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.hoisted(() => vi.fn())

vi.mock('../../../services/supabase/supabaseClient', () => ({
  platformDb: {
    from: (...args) => mockFrom(...args),
  },
}))

import { getTemplatesForAccount, upsertTemplate, toggleTemplateActive } from './invitationTemplatesApi'

describe('invitationTemplatesApi', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('getTemplatesForAccount returns rows', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [{ id: '1', role_name: 'team_member' }], error: null }),
        }),
      }),
    })
    const res = await getTemplatesForAccount('acc-1')
    expect(res.success).toBe(true)
    expect(res.data).toHaveLength(1)
  })

  it('upsertTemplate calls upsert with onConflict', async () => {
    const upsert = vi.fn(() => ({
      select: () => ({
        single: () => Promise.resolve({ data: { id: 'x', role_name: 'team_member' }, error: null }),
      }),
    }))
    mockFrom.mockReturnValue({ upsert })
    const res = await upsertTemplate(
      'acc-1',
      'team_member',
      { template_label: 'L', subject_line: '', message_body: 'Hello', is_active: true },
      'auth-uid',
    )
    expect(res.success).toBe(true)
    expect(upsert).toHaveBeenCalled()
    const [, opts] = upsert.mock.calls[0]
    expect(opts.onConflict).toBe('account_id,role_name')
    expect(upsert.mock.calls[0][0].created_by).toBe('auth-uid')
  })

  it('toggleTemplateActive updates row', async () => {
    const eq = vi.fn(() => ({
      select: () => ({
        single: () => Promise.resolve({ data: { id: 'id1', is_active: false }, error: null }),
      }),
    }))
    const update = vi.fn(() => ({ eq }))
    mockFrom.mockReturnValue({ update })
    const res = await toggleTemplateActive('id1', false, 'auth-uid')
    expect(res.success).toBe(true)
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ is_active: false, updated_by: 'auth-uid' }),
    )
  })
})
