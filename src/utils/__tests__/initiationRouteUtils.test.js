import { describe, it, expect } from 'vitest'
import {
  resolveInitiationBasePath,
  resolveBenefitsReviewPlanViewPath,
} from '../../utils/initiationRouteUtils'

describe('initiationRouteUtils', () => {
  it('resolves PMO business case base path', () => {
    expect(resolveInitiationBasePath('/pmo/initiation/business-case/create')).toBe('/pmo/initiation/business-case')
  })

  it('resolves PM business case base path', () => {
    expect(resolveInitiationBasePath('/pm/initiation/business-case/abc/view')).toBe('/pm/initiation/business-case')
  })

  it('resolves benefits review plan project view path', () => {
    expect(resolveBenefitsReviewPlanViewPath('proj-1', '/pmo/initiation/benefits-review-plan')).toBe(
      '/platform/projects/proj-1/benefits/review-plan'
    )
  })
})
