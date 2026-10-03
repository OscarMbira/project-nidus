import { describe, it, expect } from 'vitest'
import {
  resolveInitiationBasePath,
  resolveBenefitsReviewPlanViewPath,
} from '@nidus/shared/utils/initiationRouteUtils'

describe('initiationRouteUtils', () => {
  it('resolves PMO business case base path', () => {
    expect(resolveInitiationBasePath('/pmo/initiation/business-case/create')).toBe('/pmo/initiation/business-case')
  })

  it('resolves PM business case base path', () => {
    expect(resolveInitiationBasePath('/pm/initiation/business-case/abc/view')).toBe('/pm/initiation/business-case')
  })

  it('resolves benefits review plan project view path under PMO shell', () => {
    expect(resolveBenefitsReviewPlanViewPath('proj-1', '/pmo/initiation/benefits-review-plan')).toBe(
      '/pmo/projects/proj-1/benefits/review-plan'
    )
  })

  it('resolves benefits review plan project view path under PM shell', () => {
    expect(resolveBenefitsReviewPlanViewPath('SEED334-PRJ-08', '/pm/initiation/benefits-review-plan')).toBe(
      '/pm/projects/SEED334-PRJ-08/benefits/review-plan'
    )
  })
})
