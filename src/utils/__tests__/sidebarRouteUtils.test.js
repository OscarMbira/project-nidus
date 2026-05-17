import { describe, it, expect } from 'vitest'
import {
  extractPlatformProjectId,
  extractPmDashboardProjectId,
  extractPracticeProjectId,
  resolveMenuRoutePath,
  menuPathIsActive,
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
})
