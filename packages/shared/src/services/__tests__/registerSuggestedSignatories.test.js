import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@nidus/supabase', () => ({ platformDb: { from: vi.fn() } }))
const resolveEffectiveSignatoryRequirements = vi.fn()
vi.mock('../processTemplateSignatoryService', () => ({ resolveEffectiveSignatoryRequirements: (...a) => resolveEffectiveSignatoryRequirements(...a) }))

const { resolveRegisterSignatorySlots, suggestedSignatorySlots } = await import('../localRegisterSignoffService')

const SUGGESTED = [
  { role_label: 'Business Owner', is_mandatory: true },
  { role_label: 'IT / Solution Lead', is_mandatory: true },
  'Project Manager',
]

describe('suggested signatory roles (v1338 D12)', () => {
  beforeEach(() => resolveEffectiveSignatoryRequirements.mockReset())

  it('turns the register setting into ordered, mandatory slots', () => {
    expect(suggestedSignatorySlots(SUGGESTED)).toEqual([
      { role_label: 'Business Owner', is_mandatory: true, slot_order: 1 },
      { role_label: 'IT / Solution Lead', is_mandatory: true, slot_order: 2 },
      { role_label: 'Project Manager', is_mandatory: true, slot_order: 3 },
    ])
    expect(suggestedSignatorySlots(null)).toEqual([])
  })

  it("keeps the organisation's own roles when it has set them", async () => {
    resolveEffectiveSignatoryRequirements.mockResolvedValue({ success: true, data: { slots: [{ role_label: 'Head of IT', is_mandatory: true }], source: { mode: 'organisation' } } })
    const result = await resolveRegisterSignatorySlots({}, { accountId: 'a1', registerKey: 'ict_requirements_specification', suggestedRoles: SUGGESTED })
    expect(result.data.slots.map((s) => s.role_label)).toEqual(['Head of IT'])
  })

  it('falls back to the suggested roles when the organisation has none', async () => {
    resolveEffectiveSignatoryRequirements.mockResolvedValue({ success: true, data: { slots: [], source: { mode: 'organisation' } } })
    const result = await resolveRegisterSignatorySlots({}, { accountId: 'a1', registerKey: 'ict_requirements_specification', suggestedRoles: SUGGESTED })
    expect(result.data.source.mode).toBe('register_default')
    expect(result.data.slots).toHaveLength(3)
  })

  it('changes nothing for registers without suggested roles', async () => {
    resolveEffectiveSignatoryRequirements.mockResolvedValue({ success: true, data: { slots: [], source: { mode: 'organisation' } } })
    const result = await resolveRegisterSignatorySlots({}, { accountId: 'a1', registerKey: 'fin_migration_strategy' })
    expect(result.data.slots).toEqual([])
    expect(result.data.source.mode).toBe('organisation')
  })
})
