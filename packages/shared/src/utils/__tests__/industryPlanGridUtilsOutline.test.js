import { describe, expect, it } from 'vitest'
import {
  groupByPhase,
  flattenWbsTree,
  computeMaxOutlineLevel,
  filterFlatByOutlineLevel,
  expandedMapForOutlineLevel,
} from '../industryPlanGridUtils.js'

describe('industryPlanGridUtils outline level', () => {
  it('computes outline levels and filters like MS Project', () => {
    const phases = [{ phase_number: 1, phase_name: 'Start', row_id: 'p1' }]
    const { groups } = groupByPhase(phases, {
      activities: [],
      deliverables: [
        { deliverable_name: 'Parent', phase_number: 1, row_id: 'd1', parent_id: '' },
        { deliverable_name: 'Child', phase_number: 1, row_id: 'd2', parent_id: 'd1' },
      ],
      milestones: [],
    })
    const flat = flattenWbsTree(groups[0].tree)
    expect(computeMaxOutlineLevel(groups)).toBeGreaterThanOrEqual(2)
    expect(filterFlatByOutlineLevel(flat, 1)).toEqual([])
    expect(filterFlatByOutlineLevel(flat, 2).length).toBeGreaterThan(0)
    expect(expandedMapForOutlineLevel(groups, 1)['1']).toBe(false)
    expect(expandedMapForOutlineLevel(groups, 2)['1']).toBe(true)
  })
})
