import { describe, it, expect } from 'vitest'
import {
  extractPlatformProjectId,
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

  it('menuPathIsActive', () => {
    expect(menuPathIsActive('/platform/projects/p1/scope/requirements/new', '/platform/projects/p1/scope/requirements')).toBe(
      true
    )
    expect(menuPathIsActive('/platform/projects', '/platform/projects')).toBe(false)
  })
})
