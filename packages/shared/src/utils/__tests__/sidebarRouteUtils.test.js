import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  extractPlatformProjectId,
  extractPmDashboardProjectId,
  extractPracticeProjectId,
  resolveMenuRoutePath,
  resolveMenuRoutePathForLayout,
  menuPathIsActive,
  getSidebarMenuNodeKey,
  resolvePreferredActiveMenuKey,
  findTopLevelKeyForActiveMenu,
  persistLastActiveMenuKey,
  readLastActiveMenuKey,
  SIDEBAR_LAST_ACTIVE_MENU_KEY,
} from '../sidebarRouteUtils'

describe('sidebarRouteUtils', () => {
  it('extracts platform project id', () => {
    expect(extractPlatformProjectId('/platform/projects/abc-123/scope/wbs')).toBe('abc-123')
    expect(extractPlatformProjectId('/platform/projects/create')).toBeNull()
  })

  it('extracts practice project id', () => {
    expect(extractPracticeProjectId('/simulator/practice-projects/xyz/schedule/gantt')).toBe('xyz')
    expect(extractPracticeProjectId('/simulator/practice-projects/create')).toBeNull()
  })

  it('resolves :id in platform project routes', () => {
    expect(
      resolveMenuRoutePath('/platform/projects/:id/plans', '/platform/projects/p1/dashboard')
    ).toBe('/platform/projects/p1/plans')
  })

  it('resolves :id in simulator practice project routes', () => {
    expect(
      resolveMenuRoutePath('/simulator/practice-projects/:id/plans', '/simulator/practice-projects/q1/scope/wbs')
    ).toBe('/simulator/practice-projects/q1/plans')
  })

  it('resolves __PROJECT__', () => {
    expect(
      resolveMenuRoutePath('/platform/projects/__PROJECT__/scope/wbs', '/platform/projects/p1/x')
    ).toBe('/platform/projects/p1/scope/wbs')
    expect(resolveMenuRoutePath('/platform/projects/__PROJECT__/scope/wbs', '/platform/dashboard')).toBe(
      '/platform/projects'
    )
  })

  it('resolves __PRACTICE__', () => {
    expect(
      resolveMenuRoutePath('/simulator/practice-projects/__PRACTICE__/scope/wbs', '/simulator/practice-projects/q1/y')
    ).toBe('/simulator/practice-projects/q1/scope/wbs')
  })

  it('resolves :projectId in PM dashboard project routes', () => {
    expect(extractPmDashboardProjectId('/pm/projects/p99/industry-plan')).toBe('p99')
    expect(
      resolveMenuRoutePath(
        '/pm/projects/:projectId/industry-plan',
        '/pm/projects/p99/forms',
      ),
    ).toBe('/pm/projects/p99/industry-plan')
    expect(
      resolveMenuRoutePath('/pm/projects/:projectId/industry-plan', '/pm/dashboard'),
    ).toBe('/pm/dashboard')
  })

  it('normalizes legacy /app/projects industry plan routes', () => {
    expect(
      resolveMenuRoutePath(
        '/app/projects/:projectId/industry-plan',
        '/platform/projects/p1/dashboard',
      ),
    ).toBe('/platform/projects/p1/industry-plan')
    expect(
      resolveMenuRoutePath(
        '/platform/projects/__PROJECT__/industry-plan',
        '/platform/projects/p1/dashboard',
      ),
    ).toBe('/platform/projects/p1/industry-plan')
  })

  it('menuPathIsActive', () => {
    expect(menuPathIsActive('/platform/projects/p1/scope/requirements/new', '/platform/projects/p1/scope/requirements')).toBe(
      true
    )
    expect(menuPathIsActive('/platform/projects', '/platform/projects')).toBe(false)
    expect(menuPathIsActive('/platform/dashboard', '/platform/dashboard')).toBe(true)
    expect(menuPathIsActive('/platform/dashboard', '/platform/dashboard', '?tab=projects')).toBe(false)
    expect(menuPathIsActive('/platform/dashboard', '/platform/dashboard?tab=projects', '?tab=projects')).toBe(true)
    expect(menuPathIsActive('/platform/dashboard', '/platform/dashboard?tab=projects', '')).toBe(false)
  })

  it('menuPathIsActive does not treat Project Templates as under Organizational Templates hub', () => {
    expect(menuPathIsActive('/platform/templates/project', '/platform/templates')).toBe(false)
    expect(menuPathIsActive('/platform/templates/project', '/platform/templates/project')).toBe(true)
    expect(menuPathIsActive('/platform/templates/organisational', '/platform/templates')).toBe(true)
    expect(menuPathIsActive('/platform/templates/organisational', '/platform/templates/organisational')).toBe(true)
    expect(menuPathIsActive('/platform/templates/organisational', '/platform/templates/project')).toBe(false)
  })

  it('menuPathIsActive does not treat sibling Testing/Resources leaves as descendants', () => {
    expect(menuPathIsActive('/platform/testing/suites', '/platform/testing')).toBe(false)
    expect(menuPathIsActive('/platform/testing', '/platform/testing')).toBe(true)
    expect(menuPathIsActive('/platform/resources/calendar', '/platform/resources')).toBe(false)
    expect(menuPathIsActive('/platform/resources', '/platform/resources')).toBe(true)
  })

  it('resolveMenuRoutePathForLayout rewrites PM dashboard links', () => {
    expect(
      resolveMenuRoutePathForLayout('/platform/dashboard', '/platform/projects', 'pm')
    ).toBe('/pm/dashboard')
    expect(
      resolveMenuRoutePathForLayout('/platform/executive/dashboard', '/platform/projects', 'pm')
    ).toBe('/pm/dashboard')
    expect(
      resolveMenuRoutePathForLayout('/platform/dashboard', '/platform/projects', 'pmo')
    ).toBe('/platform/dashboard')
    expect(
      resolveMenuRoutePathForLayout('/platform/executive/dashboard', '/platform/projects', 'pmo')
    ).toBe('/platform/executive/dashboard')
  })
})

describe('resolvePreferredActiveMenuKey (dual-location)', () => {
  const dualMenu = [
    {
      id: 'planning',
      menu_code: 'plat_pm_planning',
      menu_label: 'Planning',
      children: [
        {
          id: 'planning-assumptions',
          menu_code: 'plat_pm_planning_assumptions',
          menu_label: 'Planning Assumptions',
          route_path: '/platform/assumptions',
        },
      ],
    },
    {
      id: 'raid',
      menu_code: 'plat_pm_raid',
      menu_label: 'RAID',
      children: [
        {
          id: 'assumptions-reg',
          menu_code: 'plat_pm_assumptions_reg',
          menu_label: 'Assumptions Register',
          route_path: '/platform/assumptions',
        },
      ],
    },
  ]
  const location = { pathname: '/platform/assumptions', search: '' }

  beforeEach(() => {
    vi.stubGlobal('sessionStorage', {
      store: {},
      getItem(k) { return this.store[k] ?? null },
      setItem(k, v) { this.store[k] = String(v) },
      removeItem(k) { delete this.store[k] },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('picks exactly one leaf when two share the same route', () => {
    const key = resolvePreferredActiveMenuKey(dualMenu, location, { lastActiveKey: null })
    expect(key).toBe('assumptions-reg')
  })

  it('prefers the leaf the user last clicked', () => {
    persistLastActiveMenuKey({ menu_code: 'plat_pm_planning_assumptions', id: 'planning-assumptions' })
    expect(readLastActiveMenuKey()).toBe('plat_pm_planning_assumptions')
    const key = resolvePreferredActiveMenuKey(dualMenu, location, {})
    expect(key).toBe('planning-assumptions')
  })

  it('prefers the leaf under the expanded top-level section when no click memory', () => {
    const key = resolvePreferredActiveMenuKey(dualMenu, location, {
      lastActiveKey: null,
      expandedSectionKey: 'planning',
    })
    expect(key).toBe('planning-assumptions')
  })

  it('findTopLevelKeyForActiveMenu expands only the preferred section', () => {
    const preferred = resolvePreferredActiveMenuKey(dualMenu, location, { lastActiveKey: null })
    expect(findTopLevelKeyForActiveMenu(dualMenu, preferred)).toBe('raid')
    expect(getSidebarMenuNodeKey(dualMenu[0])).toBe('planning')
  })

  it('stores last-active key in sessionStorage', () => {
    persistLastActiveMenuKey({ menu_code: 'plat_pm_assumptions_reg' })
    expect(sessionStorage.getItem(SIDEBAR_LAST_ACTIVE_MENU_KEY)).toBe('plat_pm_assumptions_reg')
  })
})
