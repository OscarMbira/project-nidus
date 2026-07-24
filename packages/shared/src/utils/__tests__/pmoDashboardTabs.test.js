import { describe, it, expect } from 'vitest'
import { normalizeDashboardTab, PMO_DASHBOARD_TABS } from '../pmoDashboardTabs'

describe('pmoDashboardTabs', () => {
  it('normalizes tab query values', () => {
    expect(normalizeDashboardTab(null)).toBe('overview')
    expect(normalizeDashboardTab('')).toBe('overview')
    expect(normalizeDashboardTab('overview')).toBe('overview')
    expect(normalizeDashboardTab('PORTFOLIO')).toBe('portfolio')
    expect(normalizeDashboardTab('programmes')).toBe('programmes')
    expect(normalizeDashboardTab('programs')).toBe('programmes')
    expect(normalizeDashboardTab('projects')).toBe('projects')
    expect(normalizeDashboardTab('invalid')).toBe('overview')
  })

  it('lists known tab ids', () => {
    expect(PMO_DASHBOARD_TABS).toContain('overview')
    expect(PMO_DASHBOARD_TABS).toContain('portfolio')
  })
})
