import { describe, it, expect, vi, beforeEach } from 'vitest'

const platformRpc = vi.fn()
const simRpc = vi.fn()
vi.mock('@nidus/supabase', () => ({
  platformDb: { rpc: (...a) => platformRpc(...a), from: vi.fn() },
  simDb: { rpc: (...a) => simRpc(...a), from: vi.fn() },
}))

const { listIndustryModules, setIndustryModuleDisabled } = await import('../industryModulesService.js')

describe('industryModulesService (v1341 D16)', () => {
  beforeEach(() => { platformRpc.mockReset(); simRpc.mockReset() })

  it('Platform lists through list_project_industry_menu_items and reads can_edit', async () => {
    platformRpc.mockResolvedValue({ data: [{ menu_item_id: 'a', can_edit: true }], error: null })
    const res = await listIndustryModules('platform', 'prj-1')
    expect(platformRpc).toHaveBeenCalledWith('list_project_industry_menu_items', { p_project_id: 'prj-1' })
    expect(res.canEdit).toBe(true)
  })

  it('Simulator uses the practice project RPCs on the sim client', async () => {
    simRpc.mockResolvedValue({ data: { disabled: true }, error: null })
    const events = []
    window.addEventListener('nidus-menu-context-changed', () => events.push(1))
    await setIndustryModuleDisabled('simulator', 'pp-1', 'item-1', true)
    expect(simRpc).toHaveBeenCalledWith('set_practice_project_menu_item_disabled', { p_practice_project_id: 'pp-1', p_menu_item_id: 'item-1', p_disabled: true })
    expect(events).toHaveLength(1) // sidebar refresh (R5)
  })

  it('passes RPC errors through (e.g. not the Project Manager)', async () => {
    platformRpc.mockResolvedValue({ data: null, error: { message: 'Only the Project Manager or a PMO Admin can switch industry items off' } })
    await expect(setIndustryModuleDisabled('platform', 'prj-1', 'item-1', true)).rejects.toMatchObject({ message: expect.stringMatching(/Project Manager/) })
  })

  it('returns nothing without a project', async () => {
    expect(await listIndustryModules('platform', null)).toEqual({ rows: [], canEdit: false })
  })
})
