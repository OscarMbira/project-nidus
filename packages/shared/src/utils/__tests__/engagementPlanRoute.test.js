import { describe, expect, it } from 'vitest'
import { engagementPlanEditPath, engagementPlanRecordKey } from '../engagementPlanRoute'

describe('engagement plan route keys', () => {
  it('prefers the engagement reference over the uuid', () => {
    expect(engagementPlanRecordKey({
      id: '3a15ef16-fc1d-4295-a60b-9c7dba3ecb77',
      engagement_reference: 'EPL-2026-001',
    })).toBe('EPL-2026-001')
  })

  it('builds the edit address from that reference', () => {
    expect(engagementPlanEditPath({
      id: 'plan-uuid',
      engagement_reference: 'EPL-2026-001',
    })).toBe('/platform/stakeholders/engagement/edit/EPL-2026-001')
  })
})
