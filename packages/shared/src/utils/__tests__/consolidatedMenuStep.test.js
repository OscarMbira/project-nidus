import { describe, it, expect, vi } from 'vitest'

vi.mock('@nidus/supabase', () => ({ platformDb: {}, simDb: {} }))
const { applyConsolidatedMenuStep } = await import('../consolidatedMenuStep.js')

const TODAY = [{ menu_code: 'synthetic-core-pack', menu_label: 'Core Project Management', children: [] }]
const BUILT = {
  enabled: true, placementKey: 'pm', homeOnly: false, projectId: 'prj-1', version: 3,
  items: [{ menu_code: 'section:home', menu_label: 'Home', children: [] }],
  slotTabs: [], pageIndex: [{ code: 'a', label: 'A', route: '/a' }], packNames: [], unplaced: ['x'],
}
const base = (overrides = {}) => ({
  app: 'platform', finalItems: TODAY, hierarchy: [], fetchedHint: { layout: 'pm' }, accountId: 'acc', userId: 'auth',
  layoutScope: 'pm', projectId: 'prj-1', projectLoading: false,
  buildPresentation: vi.fn(() => [{ menu_code: 'unfiltered' }]), getPackMap: vi.fn(() => Promise.resolve(null)),
  isEnabled: vi.fn(() => Promise.resolve(true)), build: vi.fn(() => Promise.resolve(BUILT)),
  ...overrides,
})

describe('applyConsolidatedMenuStep (v1341)', () => {
  it('switch off → null, so today’s sidebar is kept unchanged (D11)', async () => {
    const args = base({ isEnabled: vi.fn(() => Promise.resolve(false)) })
    expect(await applyConsolidatedMenuStep(args)).toBeNull()
    expect(args.build).not.toHaveBeenCalled()
  })

  it('switch on → consolidated sections and the extras for the tab strip and search', async () => {
    const res = await applyConsolidatedMenuStep(base())
    expect(res.items[0].menu_code).toBe('section:home')
    expect(res.consolidated).toMatchObject({ placementKey: 'pm', projectId: 'prj-1', unplacedCount: 1, pageIndex: BUILT.pageIndex })
    expect(res.incomplete).toBe(false)
  })

  it('passes the open project only for project-scoped layouts', async () => {
    const pm = base()
    await applyConsolidatedMenuStep(pm)
    expect(pm.build).toHaveBeenCalledWith(expect.objectContaining({ projectId: 'prj-1', layout: 'pm' }))
    const pmo = base({ layoutScope: 'pmo' })
    await applyConsolidatedMenuStep(pmo)
    expect(pmo.build).toHaveBeenCalledWith(expect.objectContaining({ projectId: null, layout: 'pmo' }))
  })

  it('governance profile: places from the tree without the keyword profile filter (D8)', async () => {
    const args = base({ fetchedHint: { layout: 'pm', pmProfile: 'sponsor' } })
    await applyConsolidatedMenuStep(args)
    expect(args.buildPresentation).toHaveBeenCalledWith([], { layout: 'pm', pmProfile: null })
    expect(args.build).toHaveBeenCalledWith(expect.objectContaining({ tree: [{ menu_code: 'unfiltered' }] }))
  })

  it('marks the result provisional while the project id is still resolving (not cached, R5)', async () => {
    expect((await applyConsolidatedMenuStep(base({ projectLoading: true }))).incomplete).toBe(true)
  })

  it('falls back to today’s sidebar when nothing could be built', async () => {
    expect(await applyConsolidatedMenuStep(base({ build: vi.fn(() => Promise.resolve({ enabled: true, items: [] })) }))).toBeNull()
    expect(await applyConsolidatedMenuStep(base({ accountId: null }))).toBeNull()
  })
})
