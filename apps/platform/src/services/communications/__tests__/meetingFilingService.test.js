// v1272 Phase 2 — Meeting-to-Register filing: choices, draft-only creation, updates to existing records.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const calls = []
function table(name) {
  const q = {
    _name: name,
    insert: vi.fn((row) => { calls.push({ table: name, op: 'insert', row }); return Promise.resolve({ error: null }) }),
    update: vi.fn((patch) => { calls.push({ table: name, op: 'update', patch }); return { eq: () => Promise.resolve({ error: null }) } }),
    select: () => q,
    eq: () => q,
    order: () => Promise.resolve({ data: [], error: null }),
    maybeSingle: () => Promise.resolve({ data: name.startsWith('ai_v_') ? { display_id: 'DEC-0007' } : { id: 'user-1' }, error: null }),
  }
  return q
}
const fakeDb = {
  from: (name) => table(name),
  auth: { getUser: () => Promise.resolve({ data: { user: { id: 'auth-1' } } }) },
  functions: { invoke: vi.fn() },
  rpc: vi.fn(),
}

vi.mock('../../supabase/supabaseClient', () => ({ platformDb: fakeDb }))
vi.mock('@nidus/supabase', () => ({ simDb: fakeDb, platformDb: fakeDb }))
vi.mock('../meetingExtractionService', () => ({ approveAndCreateIssue: vi.fn(), approveAndCreateRisk: vi.fn() }))
vi.mock('../../sim/communications/simMeetingExtractionService', () => ({ approveAndCreatePracticeIssue: vi.fn(), approveAndCreatePracticeRisk: vi.fn() }))
const createDecision = vi.fn(async (p) => ({ id: 'dec-1', ...p }))
vi.mock('../../decisionLogService', () => ({ createDecision: (p) => createDecision(p) }))
vi.mock('../../sim/simDecisionService', () => ({ createDecision: vi.fn() }))
vi.mock('../../dailyLogEntryService', () => ({ addEntry: vi.fn() }))
vi.mock('../../dailyLogService', () => ({ createDailyLog: vi.fn(), getDailyLogByProject: vi.fn() }))
vi.mock('../../sim/practiceDailyLogService', () => ({ createPracticeDailyLog: vi.fn(), createPracticeDailyLogEntry: vi.fn(), getPracticeDailyLog: vi.fn() }))

const { canFileMeetingItems, defaultChoice, fileMeetingItem, filingSummary, isHandled } = await import('../meetingFilingService')

beforeEach(() => { calls.length = 0; createDecision.mockClear() })

describe('choices', () => {
  it('suggests adding to the existing record when a duplicate was found', () => {
    expect(defaultChoice({ duplicate_of_id: 'r1' })).toBe('update')
    expect(defaultChoice({})).toBe('create')
  })
  it('treats created, merged and set-aside items as handled', () => {
    for (const status of ['created', 'merged', 'rejected', 'dismissed']) expect(isHandled({ status })).toBe(true)
    for (const status of ['pending_review', 'enriched', 'pending']) expect(isHandled({ status })).toBe(false)
  })
})

describe('fileMeetingItem', () => {
  const meeting = { title: 'Weekly', actual_start: '2026-10-19T10:00:00Z' }
  it('creates decisions as proposed (the pre-approval state) and links the staging row', async () => {
    const row = { id: 's1', meeting_id: 'm1', project_id: 'p1', ai_extracted_title: 'Use vendor B', mapped_values: { priority: 'High' } }
    const res = await fileMeetingItem({ isSim: false, kind: 'decision', row, choice: 'create', meeting })
    expect(createDecision).toHaveBeenCalledWith(expect.objectContaining({ project_id: 'p1', status: 'proposed', priority: 'high', decision_date: '2026-10-19' }))
    expect(calls).toContainEqual(expect.objectContaining({ table: 'comm_meeting_extracted_decisions', op: 'update', patch: expect.objectContaining({ status: 'created', decision_id: 'dec-1' }) }))
    expect(res.displayId).toBe('DEC-0007')
  })
  it('adds an update to the existing record without changing it', async () => {
    const row = { id: 's2', meeting_id: 'm1', project_id: 'p1', ai_extracted_title: 'Steel late', duplicate_of_id: 'r9', duplicate_of_ref: 'RSK-0042', source_quote: 'steel is late' }
    const res = await fileMeetingItem({ isSim: false, kind: 'risk', row, choice: 'update', meeting })
    expect(res.displayId).toBe('RSK-0042')
    expect(calls.map((c) => `${c.table}:${c.op}`)).toEqual(['comm_meeting_record_updates:insert', 'risk_comments:insert', 'comm_meeting_extracted_risks:update'])
    expect(calls.some((c) => c.table === 'risks')).toBe(false)
  })
  it('sets aside an action as dismissed', async () => {
    await fileMeetingItem({ isSim: true, kind: 'action', row: { id: 'a1', description: 'x' }, choice: 'reject' })
    expect(calls[0]).toMatchObject({ table: 'comm_meeting_action_items', patch: expect.objectContaining({ status: 'dismissed' }) })
  })
})

describe('filingSummary', () => {
  it('lists created display IDs and counts the rest', () => {
    const s = filingSummary([
      { choice: 'create', displayId: 'RSK-1' }, { choice: 'create', displayId: 'ISS-2' },
      { choice: 'update', displayId: 'RSK-0042' }, { choice: 'reject' },
    ])
    expect(s.recordId).toBe('RSK-1, ISS-2')
    expect(s.message).toContain('2 draft records created')
    expect(s.message).toContain('RSK-0042')
    expect(s.message).toContain('1 set aside')
  })
})

describe('canFileMeetingItems (v1290)', () => {
  it('follows the can_use grant on the Pending AI Reviews menu item of the right app', async () => {
    fakeDb.rpc.mockResolvedValueOnce({ data: true, error: null })
    expect(await canFileMeetingItems(false)).toBe(true)
    expect(fakeDb.rpc).toHaveBeenLastCalledWith('auth_user_can_use_menu', { p_menu_codes: ['plat_pm_comms_pending_review'] })
    fakeDb.rpc.mockResolvedValueOnce({ data: false, error: null })
    expect(await canFileMeetingItems(true)).toBe(false)
    expect(fakeDb.rpc).toHaveBeenLastCalledWith('auth_user_can_use_menu', { p_menu_codes: ['sim_pm_comms_pending_review'] })
  })
  it('is view-only when the check fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    fakeDb.rpc.mockResolvedValueOnce({ data: null, error: { message: 'function does not exist' } })
    expect(await canFileMeetingItems(false)).toBe(false)
    fakeDb.rpc.mockRejectedValueOnce(new Error('network'))
    expect(await canFileMeetingItems(false)).toBe(false)
    warn.mockRestore()
  })
})
