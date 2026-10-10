import { describe, expect, it } from 'vitest'
import { emptyProcurementPlan, normalizeProcurementPlan } from '../ProcurementPlanFields'

describe('normalizeProcurementPlan', () => {
  it('fills the plan sections when the stored document is empty', () => {
    const plan = normalizeProcurementPlan(null)
    expect(plan.integration).toEqual(emptyProcurementPlan().integration)
    expect(plan.activities.length).toBeGreaterThan(0)
    expect(plan.metrics[0]).toEqual({ item: '', metric: '', method: '' })
    expect(plan.roles[0]).toEqual({ role: '', responsibility: '', authority: '' })
    expect(plan.assumptions[0]).toEqual({ category: '', text: '' })
    expect(plan.prequalifiedSellers).toBe('')
  })

  it('keeps saved rows and text', () => {
    const plan = normalizeProcurementPlan({
      planDate: '2026-10-06',
      integration: { scope: 'Contractor WBS joins the project WBS' },
      activities: [{ date: '2026-11-01', activity: 'Issue the statement of work' }],
      metrics: [{ item: 'Delivery', metric: 'On time', method: 'Milestone review' }],
      roles: [{ role: 'Project manager', responsibility: 'Approve awards', authority: 'Sign' }],
      assumptions: [{ category: 'Schedule', text: 'Long-lead items are ordered in stage 1' }],
      legalJurisdiction: 'England and Wales, GBP',
      independentEstimates: 'Used before source selection',
      riskManagement: 'Performance bond required',
      prequalifiedSellers: 'Northwind\nContoso',
      notes: 'kept outside the plan body',
    })
    expect(plan.planDate).toBe('2026-10-06')
    expect(plan.integration.scope).toBe('Contractor WBS joins the project WBS')
    expect(plan.activities).toHaveLength(1)
    expect(plan.prequalifiedSellers).toBe('Northwind\nContoso')
    expect(plan.notes).toBeUndefined()
  })
})
