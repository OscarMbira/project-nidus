import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRpc = vi.fn()
vi.mock('./supabaseClient', () => ({ simDb: { rpc: (...a) => mockRpc(...a) } }))

import { getReminderLeadTimes, saveReminderLeadTimes } from './reminderLeadTimeService'

describe('reminderLeadTimeService (Simulator)', () => {
  beforeEach(() => mockRpc.mockReset())

  it('reads the organisation lead times through the RPC', async () => {
    mockRpc.mockResolvedValueOnce({ data: { items: [], can_manage: true }, error: null })
    expect(await getReminderLeadTimes()).toEqual({ items: [], can_manage: true })
    expect(mockRpc).toHaveBeenCalledWith('reminder_lead_times_get')
  })

  it('saves the changes and surfaces errors (no fallback data)', async () => {
    mockRpc.mockResolvedValueOnce({ data: { items: [] }, error: null })
    await saveReminderLeadTimes([{ record_type: 'risk_review', lead_days: null }])
    expect(mockRpc).toHaveBeenCalledWith('reminder_lead_times_save', { p_items: [{ record_type: 'risk_review', lead_days: null }] })
    mockRpc.mockResolvedValueOnce({ data: null, error: new Error('Only a PMO Admin or the account owner can change reminder lead times') })
    await expect(saveReminderLeadTimes([])).rejects.toThrow(/PMO Admin/)
  })
})
