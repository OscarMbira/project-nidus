import { describe, expect, it } from 'vitest'
import {
  communicationPlanHref,
  communicationPlanRecordKey,
  findStakeholderByRouteKey,
  stakeholderRecordKey,
} from '../communicationPlanRoute'

describe('communication plan route keys', () => {
  it('prefers the plan reference over the uuid', () => {
    expect(communicationPlanRecordKey({ id: '3a15ef16-fc1d-4295-a60b-9c7dba3ecb77', plan_reference: 'CPL-2026-001' })).toBe('CPL-2026-001')
  })

  it('prefers the stakeholder reference over the uuid', () => {
    expect(stakeholderRecordKey({ id: '11480001-5801-4a01-9c01-534433340001', stakeholder_reference: 'STK-2026-004' })).toBe('STK-2026-004')
  })

  it('builds the edit address from those references', () => {
    const href = communicationPlanHref(
      'edit',
      { id: 'plan-uuid', plan_reference: 'CPL-2026-001' },
      { id: 'person-uuid', stakeholder_reference: 'STK-2026-004' },
    )
    expect(href.pathname).toBe('/platform/stakeholders/communications/edit/CPL-2026-001')
    expect(href.search).toBe('?stakeholderId=STK-2026-004')
  })

  it('finds a stakeholder from either key', () => {
    const people = [{ id: 'person-uuid', stakeholder_reference: 'STK-2026-004', stakeholder_name: 'Lindiwe Moyo' }]
    expect(findStakeholderByRouteKey(people, 'STK-2026-004')?.stakeholder_name).toBe('Lindiwe Moyo')
    expect(findStakeholderByRouteKey(people, 'person-uuid')?.stakeholder_name).toBe('Lindiwe Moyo')
  })
})
