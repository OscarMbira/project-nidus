import { describe, it, expect } from 'vitest'
import { bucketPmLifecycle, bucketProjectExecutiveKey } from '../dashboardService'

describe('bucketPmLifecycle', () => {
  it('maps active and completed', () => {
    expect(bucketPmLifecycle('active')).toBe('active')
    expect(bucketPmLifecycle('COMPLETED')).toBe('completed')
  })

  it('maps on-hold variants', () => {
    expect(bucketPmLifecycle('on-hold')).toBe('onHold')
    expect(bucketPmLifecycle('on hold')).toBe('onHold')
    expect(bucketPmLifecycle('paused')).toBe('onHold')
  })

  it('maps planning and cancelled', () => {
    expect(bucketPmLifecycle('planning')).toBe('planning')
    expect(bucketPmLifecycle('planned')).toBe('planning')
    expect(bucketPmLifecycle('cancelled')).toBe('cancelled')
    expect(bucketPmLifecycle('canceled')).toBe('cancelled')
  })

  it('treats unknown statuses as planning', () => {
    expect(bucketPmLifecycle('')).toBe('planning')
    expect(bucketPmLifecycle(null)).toBe('planning')
    expect(bucketPmLifecycle('unknown')).toBe('planning')
  })
})

describe('bucketProjectExecutiveKey', () => {
  it('maps seeded project_status codes to KPI buckets', () => {
    expect(bucketProjectExecutiveKey({ status_code: 'draft', status_name: 'Draft' })).toBe('planned')
    expect(bucketProjectExecutiveKey({ status_code: 'planning', status_name: 'Planning' })).toBe('planned')
    expect(bucketProjectExecutiveKey({ status_code: 'active', status_name: 'Active' })).toBe('active')
    expect(bucketProjectExecutiveKey({ status_code: 'at_risk', status_name: 'At Risk' })).toBe('active')
    expect(bucketProjectExecutiveKey({ status_code: 'on_hold', status_name: 'On Hold' })).toBe('onHold')
    expect(bucketProjectExecutiveKey({ status_code: 'completed', status_name: 'Completed' })).toBe('completed')
    expect(bucketProjectExecutiveKey({ status_code: 'cancelled', status_name: 'Cancelled' })).toBe('completed')
  })

  it('defaults missing meta to planned', () => {
    expect(bucketProjectExecutiveKey(null)).toBe('planned')
    expect(bucketProjectExecutiveKey(undefined)).toBe('planned')
  })
})
