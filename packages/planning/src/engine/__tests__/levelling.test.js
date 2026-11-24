import { describe, it, expect } from 'vitest'
import { buildCalendar } from '../schedule.js'
import { levelSchedule } from '../levelling.js'
import { computeWorkload, weekStarts } from '../../services/workload.js'
import { projectScore, weightsAreValid, confidenceToScore } from '../portfolioScoring.js'
import { bruteForcePortfolio, optimisePortfolio } from '../portfolioOptimiser.js'

const cal = buildCalendar()
const day = (id, extra = {}) => ({
  id, name: id, start: '2026-01-05', finish: '2026-01-05', duration: 1, hours: 8,
  assignee: 'p1', priority: 'medium', critical: false, slack: 5, pinned: false, percent: 0,
  ...extra,
})

describe('levelSchedule', () => {
  it('delays the lower-priority task and keeps the critical one', () => {
    const result = levelSchedule({
      calendar: cal,
      mode: 'beyond_float',
      tasks: [
        day('crit', { critical: true, priority: 'low', slack: 0 }),
        day('other', { priority: 'high', slack: 5, start: '2026-01-05', finish: '2026-01-05' }),
      ],
    })
    const moved = result.moves.map((m) => m.taskId)
    expect(moved).toContain('other')
    expect(moved).not.toContain('crit')
    expect(result.moves.find((m) => m.taskId === 'other').newStart).toBe('2026-01-06')
  })

  it('does not move a task past its float when the finish is locked', () => {
    const result = levelSchedule({
      calendar: cal,
      mode: 'within_float',
      tasks: [
        day('a', { critical: true, slack: 0, priority: 'high' }),
        day('b', { slack: 0, priority: 'low' }),
      ],
    })
    expect(result.moves).toEqual([])
    expect(result.finishDelayDays).toBe(0)
  })

  it('moves within float when there is room', () => {
    const result = levelSchedule({
      calendar: cal,
      mode: 'within_float',
      tasks: [
        day('a', { assignee: 'p2', critical: true, slack: 0, duration: 5, finish: '2026-01-09' }),
        day('full', { critical: true, slack: 0 }),
        day('b', { slack: 4, priority: 'low' }),
      ],
    })
    expect(result.moves.map((m) => m.taskId)).toEqual(['b'])
    expect(result.projectFinishAfter).toBe('2026-01-09')
    expect(result.finishDelayDays).toBe(0)
  })

  it('never moves a pinned task', () => {
    const result = levelSchedule({
      calendar: cal,
      mode: 'beyond_float',
      tasks: [day('pin', { pinned: true, priority: 'low', slack: 5 }), day('free', { priority: 'high', critical: true, slack: 0 })],
    })
    expect(result.moves.map((m) => m.taskId)).not.toContain('pin')
  })

  it('keeps a must-start-on date', () => {
    const result = levelSchedule({
      calendar: cal,
      mode: 'beyond_float',
      tasks: [
        day('fixed', { constraintType: 'mso', constraintDate: '2026-01-05', priority: 'low' }),
        day('other', { priority: 'low', slack: 5 }),
      ],
    })
    expect(result.moves.map((m) => m.taskId)).not.toContain('fixed')
  })

  it('skips the weekend', () => {
    const result = levelSchedule({
      calendar: cal,
      mode: 'beyond_float',
      tasks: [
        day('a', { critical: true, slack: 0, start: '2026-01-09', finish: '2026-01-09' }),
        day('b', { priority: 'low', slack: 5, start: '2026-01-09', finish: '2026-01-09' }),
      ],
    })
    expect(result.moves.find((m) => m.taskId === 'b').newStart).toBe('2026-01-12')
  })

  it('orders by priority when neither task is critical', () => {
    const result = levelSchedule({
      calendar: cal,
      mode: 'beyond_float',
      tasks: [day('low', { priority: 'low' }), day('high', { priority: 'high' })],
    })
    expect(result.moves.map((m) => m.taskId)).toEqual(['low'])
  })

  it('puts project priority ahead of task priority', () => {
    const result = levelSchedule({
      calendar: cal,
      mode: 'beyond_float',
      crossProject: true,
      tasks: [
        day('later', { projectId: 'p-low', projectPriority: 2, critical: true, priority: 'critical', slack: 0 }),
        day('first', { projectId: 'p-high', projectPriority: 1, critical: false, priority: 'low', slack: 5 }),
      ],
    })
    expect(result.moves.map((m) => m.taskId)).toEqual(['later'])
  })

  it('treats other projects as fixed load', () => {
    const result = levelSchedule({
      calendar: cal,
      mode: 'beyond_float',
      externalLoad: [{ userId: 'p1', date: '2026-01-05', hours: 8 }],
      tasks: [day('only', { slack: 5 })],
    })
    expect(result.moves[0].newStart).toBe('2026-01-06')
  })

  it('follows a predecessor that moved', () => {
    const result = levelSchedule({
      calendar: cal,
      mode: 'beyond_float',
      tasks: [
        day('pred', { assignee: 'p1', critical: true, slack: 0 }),
        day('block', { assignee: 'p1', priority: 'low', slack: 5 }),
        day('succ', { assignee: 'p2', priority: 'high', slack: 0, start: '2026-01-06', finish: '2026-01-06' }),
      ],
      dependencies: [{ pred: 'block', succ: 'succ', type: 'FS' }],
    })
    const succ = result.moves.find((m) => m.taskId === 'succ')
    const block = result.moves.find((m) => m.taskId === 'block')
    expect(block.newStart).toBe('2026-01-06')
    expect(succ.newStart > block.newStart).toBe(true)
  })

  it('matches workload.js: after levelling, no person is over a day of capacity', () => {
    const tasks = [
      day('a', { critical: true, slack: 0, estimated_hours: 8, assigned_to_user_id: 'p1', planned_start_date: '2026-01-05', planned_end_date: '2026-01-05' }),
      day('b', { priority: 'low', slack: 5, estimated_hours: 8, assigned_to_user_id: 'p1', planned_start_date: '2026-01-05', planned_end_date: '2026-01-05' }),
    ]
    const result = levelSchedule({ calendar: cal, mode: 'beyond_float', tasks })
    const moved = new Map(result.moves.map((m) => [m.taskId, m]))
    const rows = tasks.map((t) => {
      const m = moved.get(t.id)
      return { ...t, planned_start_date: m ? m.newStart : t.planned_start_date, planned_end_date: m ? m.newEnd : t.planned_end_date }
    })
    const weeks = weekStarts('2026-01-05', 2)
    const load = computeWorkload({ tasks: rows, calendar: cal, weeks, defaultHoursPerDay: 8 })
    expect(load).toHaveLength(1)
    for (const week of Object.values(load[0].weeks)) {
      expect(week.assigned).toBeLessThanOrEqual(week.capacity + 0.05)
    }
  })
})

describe('portfolio scoring', () => {
  const criteria = [{ id: 'fit', weight: 40 }, { id: 'value', weight: 60 }]
  it('requires weights to total 100', () => {
    expect(weightsAreValid(criteria)).toBe(true)
    expect(weightsAreValid([{ id: 'fit', weight: 40 }])).toBe(false)
  })
  it('computes a weighted average on the 1–5 scale', () => {
    expect(projectScore(criteria, { fit: 5, value: 1 })).toBe(2.6)
  })
  it('maps contribution confidence onto the scale', () => {
    expect(confidenceToScore('high')).toBe(5)
    expect(confidenceToScore('medium')).toBe(3)
    expect(confidenceToScore('low')).toBe(1)
  })
})

describe('portfolio optimiser', () => {
  const periods = [{ id: '2026', budget: 100, capacity: 10 }]
  const projects = [
    { id: 'a', name: 'Alpha', score: 5, cost: 60, demand: 6 },
    { id: 'b', name: 'Beta', score: 4, cost: 50, demand: 5 },
    { id: 'c', name: 'Gamma', score: 3, cost: 40, demand: 4 },
  ]

  it('matches brute force on a small set', () => {
    const exact = optimisePortfolio({ projects, periods, rules: [], maxShift: 0 })
    const brute = bruteForcePortfolio({ projects, periods, rules: [], maxShift: 0 })
    expect(exact.method).toBe('exact')
    expect(exact.totalScore).toBe(brute.totalScore)
    expect(exact.chosen.map((c) => c.projectId).sort()).toEqual(brute.chosen.map((c) => c.projectId).sort())
  })

  it('keeps a mandatory project and drops an exclusive partner', () => {
    const result = optimisePortfolio({
      projects,
      periods,
      rules: [
        { type: 'mandatory', projectId: 'c' },
        { type: 'exclusive', projectId: 'a', otherId: 'b' },
      ],
    })
    const ids = result.chosen.map((c) => c.projectId)
    expect(ids).toContain('c')
    expect(ids.includes('a') && ids.includes('b')).toBe(false)
    const left = result.leftOut.find((r) => !ids.includes(r.projectId) && (r.projectId === 'a' || r.projectId === 'b'))
    expect(left.reason).toMatch(/Cannot be in with|Over the/)
  })

  it('shifts a project into a later period', () => {
    const result = optimisePortfolio({
      projects: [
        { id: 'now', name: 'Now', score: 5, cost: 80, demand: 1 },
        { id: 'later', name: 'Later', score: 4, cost: 80, demand: 1 },
      ],
      periods: [{ id: 'q1', budget: 100, capacity: 5 }, { id: 'q2', budget: 100, capacity: 5 }],
      maxShift: 1,
      rules: [],
    })
    expect(result.chosen).toHaveLength(2)
    expect(result.chosen.find((c) => c.projectId === 'later').shift).toBe(1)
  })

  it('gives every left-out project a reason', () => {
    const result = optimisePortfolio({
      projects,
      periods: [{ id: '2026', budget: 60, capacity: 6 }],
      rules: [{ type: 'excluded', projectId: 'c' }],
    })
    expect(result.leftOut.length).toBeGreaterThan(0)
    expect(result.leftOut.every((r) => r.reason)).toBe(true)
    expect(result.leftOut.find((r) => r.projectId === 'c').reason).toMatch(/Excluded/)
  })

  it('labels a large set as a ranked shortlist', () => {
    const many = Array.from({ length: 41 }, (_, i) => ({ id: `p${i}`, name: `Project ${i}`, score: 41 - i, cost: 1, demand: 1 }))
    const result = optimisePortfolio({ projects: many, periods: [{ id: 'y', budget: 10, capacity: 10 }], rules: [] })
    expect(result.method).toBe('greedy')
    expect(result.chosen).toHaveLength(10)
  })
})
