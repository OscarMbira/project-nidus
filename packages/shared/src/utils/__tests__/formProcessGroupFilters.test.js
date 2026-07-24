import { describe, it, expect } from 'vitest'

/** Mirrors FormTemplateAdmin GROUP_TO_PROCESS_GROUP (v786). */
const GROUP_TO_PROCESS_GROUP = {
  Initiating: 'initiating',
  Planning: 'planning',
  Executing: 'executing',
  Monitoring: 'monitoring_controlling',
  Closing: 'closing',
  Agile: 'agile',
  'Starting Up': 'starting_up',
  Directing: 'directing',
  'Controlling a Stage': 'controlling_a_stage',
  'Managing Product Delivery': 'managing_product_delivery',
  'Managing a Stage Boundary': 'managing_a_stage_boundary',
  Backlog: 'backlog',
  'Sprint Planning': 'sprint_planning',
  'Sprint Execution': 'sprint_execution',
  'Review & Retrospective': 'review_retrospective',
  Release: 'release',
}

describe('v786 form process group filters', () => {
  it('maps Structured and Agile ceremony groups', () => {
    expect(GROUP_TO_PROCESS_GROUP['Starting Up']).toBe('starting_up')
    expect(GROUP_TO_PROCESS_GROUP.Backlog).toBe('backlog')
    expect(GROUP_TO_PROCESS_GROUP['Review & Retrospective']).toBe('review_retrospective')
    expect(GROUP_TO_PROCESS_GROUP.Release).toBe('release')
  })

  it('keeps Standards-Based process groups', () => {
    expect(GROUP_TO_PROCESS_GROUP.Initiating).toBe('initiating')
    expect(GROUP_TO_PROCESS_GROUP.Monitoring).toBe('monitoring_controlling')
  })
})
