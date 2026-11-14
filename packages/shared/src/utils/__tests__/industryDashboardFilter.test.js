import { describe, it, expect, vi } from 'vitest'

vi.mock('@nidus/supabase', () => ({ platformDb: { from: vi.fn() } }))
const { groupProjectsByIndustry } = await import('../industryDashboardFilter.js')

const INDUSTRIES = [{ id: 'fin', name: 'Banking' }, { id: 'ict', name: 'IT' }, { id: 'con', name: 'Construction' }]

describe('groupProjectsByIndustry (v1341 D3)', () => {
  it('counts a composite project under each of its industries', () => {
    const projects = [{ id: 'p1' }, { id: 'p2' }]
    const tags = [
      { project_id: 'p1', industry_category_id: 'fin' },
      { project_id: 'p1', industry_category_id: 'ict' },
      { project_id: 'p2', industry_category_id: 'ict' },
    ]
    const res = groupProjectsByIndustry(projects, tags, INDUSTRIES)
    expect(res.byIndustry.get('fin')).toEqual(['p1'])
    expect(res.byIndustry.get('ict')).toEqual(['p1', 'p2'])
    expect(res.counts).toEqual([
      { id: 'fin', name: 'Banking', count: 1 },
      { id: 'ict', name: 'IT', count: 2 },
      { id: 'con', name: 'Construction', count: 0 },
    ])
  })

  it('falls back to the project’s single industry column, and lists untagged projects', () => {
    const res = groupProjectsByIndustry([{ id: 'p3', industry_category_id: 'con' }, { id: 'p4' }], [], INDUSTRIES)
    expect(res.byIndustry.get('con')).toEqual(['p3'])
    expect(res.untagged).toEqual(['p4'])
  })

  it('ignores industries the organisation has not selected', () => {
    const res = groupProjectsByIndustry([{ id: 'p5' }], [{ project_id: 'p5', industry_category_id: 'hlt' }], INDUSTRIES)
    expect(res.counts.every((c) => c.count === 0)).toBe(true)
    expect(res.untagged).toEqual([])
  })
})
