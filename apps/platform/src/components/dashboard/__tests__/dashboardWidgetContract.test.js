/**
 * Unit tests for the dashboard widget contract's filter function (v982 Phase 5).
 * This is the "no if(role==='x') forks" structural guarantee: widget selection must be entirely
 * data-driven from each widget's own declared requiredRole/requiredScope, never a branch inside
 * the framework or this filter that names a specific persona.
 */
import { describe, it, expect } from 'vitest'
import { filterWidgetsForViewer, normalizeRoleName } from '../dashboardWidgetContract'

function widget(overrides = {}) {
  return { id: 'w1', title: 'Widget', component: () => null, ...overrides }
}

describe('filterWidgetsForViewer', () => {
  it('includes a widget with no requiredRole/requiredScope for any viewer', () => {
    const result = filterWidgetsForViewer([widget()], { roleNames: [] })
    expect(result).toHaveLength(1)
  })

  it('excludes a widget whose requiredRole the viewer does not hold', () => {
    const result = filterWidgetsForViewer([widget({ requiredRole: ['pmo_admin'] })], { roleNames: ['project_manager'] })
    expect(result).toHaveLength(0)
  })

  it('includes a widget when the viewer holds ANY of the requiredRole list (OR match)', () => {
    const w = widget({ requiredRole: ['pmo_admin', 'system_admin'] })
    expect(filterWidgetsForViewer([w], { roleNames: ['system_admin'] })).toHaveLength(1)
    expect(filterWidgetsForViewer([w], { roleNames: ['pmo_admin'] })).toHaveLength(1)
    expect(filterWidgetsForViewer([w], { roleNames: ['team_member'] })).toHaveLength(0)
  })

  it('excludes a widget when a requiredScope key is missing/falsy on the viewer context', () => {
    const w = widget({ requiredScope: ['projectId'] })
    expect(filterWidgetsForViewer([w], { roleNames: [], projectId: null })).toHaveLength(0)
    expect(filterWidgetsForViewer([w], { roleNames: [] })).toHaveLength(0)
  })

  it('includes a widget when every requiredScope key is present (AND match)', () => {
    const w = widget({ requiredScope: ['projectId', 'accountId'] })
    expect(filterWidgetsForViewer([w], { roleNames: [], projectId: 'p1', accountId: 'a1' })).toHaveLength(1)
    expect(filterWidgetsForViewer([w], { roleNames: [], projectId: 'p1' })).toHaveLength(0)
  })

  it('combines requiredRole AND requiredScope — both must pass', () => {
    const w = widget({ requiredRole: ['pmo_admin'], requiredScope: ['accountId'] })
    expect(filterWidgetsForViewer([w], { roleNames: ['pmo_admin'], accountId: 'a1' })).toHaveLength(1)
    expect(filterWidgetsForViewer([w], { roleNames: ['pmo_admin'], accountId: null })).toHaveLength(0)
    expect(filterWidgetsForViewer([w], { roleNames: ['team_member'], accountId: 'a1' })).toHaveLength(0)
  })

  it('filters a mixed list down to only the widgets the viewer qualifies for, preserving order', () => {
    const widgets = [
      widget({ id: 'a' }),
      widget({ id: 'b', requiredRole: ['pmo_admin'] }),
      widget({ id: 'c', requiredScope: ['projectId'] }),
      widget({ id: 'd', requiredRole: ['project_manager'], requiredScope: ['projectId'] }),
    ]
    const result = filterWidgetsForViewer(widgets, { roleNames: ['project_manager'], projectId: 'p1' })
    expect(result.map((w) => w.id)).toEqual(['a', 'c', 'd'])
  })

  it('handles empty/undefined inputs gracefully', () => {
    expect(filterWidgetsForViewer([], {})).toEqual([])
    expect(filterWidgetsForViewer(undefined, undefined)).toEqual([])
  })
})

describe('normalizeRoleName', () => {
  it('lowercases and underscores whitespace', () => {
    expect(normalizeRoleName('PMO Admin')).toBe('pmo_admin')
    expect(normalizeRoleName('  Project  Manager  ')).toBe('project_manager')
  })

  it('handles falsy input', () => {
    expect(normalizeRoleName(null)).toBe('')
    expect(normalizeRoleName(undefined)).toBe('')
  })
})
