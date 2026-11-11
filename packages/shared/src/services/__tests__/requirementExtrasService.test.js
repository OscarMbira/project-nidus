import { describe, it, expect, vi, beforeEach } from 'vitest'

const areasQuery = { data: [], error: null }
vi.mock('@nidus/supabase', () => {
  const chain = {
    select: () => chain,
    eq: () => chain,
    order: () => Promise.resolve(areasQuery),
  }
  return { platformDb: { from: vi.fn(() => chain) } }
})

const {
  requirementExtrasAvailable,
  requirementExtraValues,
  requirementExtrasFromRow,
  loadRequirementNfrAreas,
  resetRequirementExtrasCache,
  optionLabel,
  VERIFICATION_METHODS,
} = await import('../requirementExtrasService.js')

function probeClient(error) {
  const limit = vi.fn(() => Promise.resolve({ data: [], error }))
  return { from: vi.fn(() => ({ select: () => ({ limit }) })), limit }
}

describe('requirementExtrasService (v1338 D4/D5)', () => {
  beforeEach(() => {
    sessionStorage.clear()
    areasQuery.data = []
    areasQuery.error = null
  })

  it('reports the columns as available only when the probe succeeds, and asks once per client', async () => {
    const ok = probeClient(null)
    expect(await requirementExtrasAvailable(ok)).toBe(true)
    expect(await requirementExtrasAvailable(ok)).toBe(true)
    expect(ok.limit).toHaveBeenCalledTimes(1)

    const missing = probeClient({ code: '42703', message: 'column requirements_register.owner_name does not exist' })
    expect(await requirementExtrasAvailable(missing)).toBe(false)
    resetRequirementExtrasCache(missing)
  })

  it('sends nothing while the columns are missing', () => {
    expect(requirementExtraValues({ owner_name: 'Amina', category: 'functional' }, false)).toEqual({})
  })

  it('trims text, blanks empty values and keeps the area only for non-functional requirements', () => {
    expect(requirementExtraValues({ owner_name: '  Amina Diallo ', rationale: '', verification_method: 'test', nfr_area_key: 'performance', category: 'functional' }, true))
      .toEqual({ owner_name: 'Amina Diallo', rationale: null, verification_method: 'test', nfr_area_key: null })
    expect(requirementExtraValues({ nfr_area_key: 'performance', category: 'non_functional' }, true).nfr_area_key).toBe('performance')
  })

  it('reads a row into form state', () => {
    expect(requirementExtrasFromRow({ owner_name: 'Ravi', verification_method: 'analysis' }))
      .toEqual({ owner_name: 'Ravi', rationale: '', verification_method: 'analysis', nfr_area_key: '' })
  })

  it('loads the areas as options and caches them for the session; a missing table gives no areas', async () => {
    areasQuery.data = [{ area_key: 'volumes', label: 'Volumes', sort_order: 10 }]
    expect(await loadRequirementNfrAreas()).toEqual([{ value: 'volumes', label: 'Volumes' }])
    areasQuery.data = []
    expect(await loadRequirementNfrAreas()).toEqual([{ value: 'volumes', label: 'Volumes' }])

    sessionStorage.clear()
    areasQuery.error = { code: '42P01', message: 'relation "public.requirement_nfr_areas" does not exist' }
    expect(await loadRequirementNfrAreas()).toEqual([])
  })

  it('labels option values', () => {
    expect(optionLabel(VERIFICATION_METHODS, 'demonstration')).toBe('Demonstration')
    expect(optionLabel(VERIFICATION_METHODS, '')).toBe('')
  })
})
