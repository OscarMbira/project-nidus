// v1265 S1 — outline numbers, summaries, summary links (same cases as SQL/v1265 tests).
import { describe, it, expect } from 'vitest'
import {
  buildOutline, rollUpSummaries, withRollUps, expandSummaryLinks, projectSummary,
  formatDuration, linkTextByTask, childrenByParent,
} from '../planOutline.js'

const T = (id, parent = null, extra = {}) => ({ id, task_name: id, parent_task_id: parent, ...extra })

// Plan (like the owner's sample):  1 Plan > 1.1 MVP > 1.1.1 Closure > 1.1.1.1 Review
//                                                  > 1.1.2 Envs > 1.1.2.1 Master, 1.1.2.2 Dev
const PLAN = [
  T('plan', null, { outline_position: 1 }),
  T('mvp', 'plan', { outline_position: 1 }),
  T('closure', 'mvp', { outline_position: 1 }),
  T('review', 'closure', { outline_position: 1, estimated_duration_days: 91, percentage_complete: 100, planned_start_date: '2022-07-07', planned_end_date: '2022-11-10' }),
  T('envs', 'mvp', { outline_position: 2 }),
  T('dev', 'envs', { outline_position: 2, estimated_duration_days: 5, percentage_complete: 0, planned_start_date: '2022-08-08', planned_end_date: '2022-08-12' }),
  T('master', 'envs', { outline_position: 1, estimated_duration_days: 5, percentage_complete: 100, planned_start_date: '2022-08-08', planned_end_date: '2022-08-12', is_critical_path: true }),
]

describe('buildOutline', () => {
  it('numbers tasks by position and indents them', () => {
    const rows = buildOutline(PLAN)
    expect(rows.map((r) => `${r.outline} ${r.id}`)).toEqual([
      '1 plan', '1.1 mvp', '1.1.1 closure', '1.1.1.1 review', '1.1.2 envs', '1.1.2.1 master', '1.1.2.2 dev',
    ])
    expect(rows.map((r) => r.depth)).toEqual([0, 1, 2, 3, 2, 3, 3])
    expect(rows.map((r) => r.rowNumber)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(rows.filter((r) => r.isSummary).map((r) => r.id)).toEqual(['plan', 'mvp', 'closure', 'envs'])
  })

  it('renumbers when tasks move', () => {
    const moved = PLAN.map((t) => (t.id === 'envs' ? { ...t, outline_position: 0 } : t))
    expect(buildOutline(moved).find((r) => r.id === 'master').outline).toBe('1.1.1.1')
  })

  it('hides the children of a collapsed summary but keeps their numbers', () => {
    const rows = buildOutline(PLAN, { collapsed: new Set(['envs']) })
    expect(rows.filter((r) => r.visible).map((r) => r.id)).toEqual(['plan', 'mvp', 'closure', 'review', 'envs'])
    expect(rows.find((r) => r.id === 'dev').outline).toBe('1.1.2.2')
    expect(rows.find((r) => r.id === 'envs').collapsed).toBe(true)
  })

  it('never loses a task: missing parents and parent loops become top level', () => {
    const rows = buildOutline([T('a', 'b'), T('b', 'a'), T('c', 'gone'), T('d', 'a')])
    expect(rows.map((r) => r.id).sort()).toEqual(['a', 'b', 'c', 'd'])
    expect(childrenByParent([T('a', 'b'), T('b', 'a')]).parentOf.get('a')).toBe('')
  })

  it('orders unpositioned siblings by start date, then created', () => {
    const rows = buildOutline([
      T('late', null, { planned_start_date: '2026-02-01' }),
      T('early', null, { planned_start_date: '2026-01-01' }),
      T('first', null, { outline_position: 1 }),
    ])
    expect(rows.map((r) => r.id)).toEqual(['first', 'early', 'late'])
  })
})

describe('summary roll-up', () => {
  it('summary dates span its leaves; critical if any leaf is', () => {
    const roll = rollUpSummaries(PLAN)
    expect(roll.get('envs')).toMatchObject({ start: '2022-08-08', finish: '2022-08-12', duration: 5, critical: true })
    expect(roll.get('plan')).toMatchObject({ start: '2022-07-07', finish: '2022-11-10' })
    expect(roll.has('dev')).toBe(false)
  })

  it('% complete is weighted by duration (90d @100% + 10d @0% = 90%)', () => {
    const roll = rollUpSummaries([T('s'), T('a', 's', { estimated_duration_days: 90, percentage_complete: 100 }), T('b', 's', { estimated_duration_days: 10, percentage_complete: 0 })])
    expect(roll.get('s').percent).toBe(90)
    expect(rollUpSummaries(PLAN).get('envs').percent).toBe(50)
  })

  it('all-milestone summaries use a simple average', () => {
    const roll = rollUpSummaries([T('s'), T('a', 's', { is_milestone: true, percentage_complete: 100 }), T('b', 's', { is_milestone: true, percentage_complete: 0 })])
    expect(roll.get('s').percent).toBe(50)
  })

  it('withRollUps marks summaries and applies their values', () => {
    const envs = withRollUps(PLAN).find((t) => t.id === 'envs')
    expect(envs).toMatchObject({ is_summary: true, planned_start_date: '2022-08-08', estimated_duration_days: 5, percentage_complete: 50 })
  })

  it('project summary covers the whole plan', () => {
    expect(projectSummary(PLAN, undefined, 'TZ&BD Plan')).toMatchObject({ task_name: 'TZ&BD Plan', planned_start_date: '2022-07-07', planned_end_date: '2022-11-10' })
    expect(projectSummary([])).toBeNull()
  })
})

describe('summary links', () => {
  const tasks = [T('S'), T('A', 'S'), T('B', 'S'), T('X'), T('N'), T('M', 'N'), T('L', 'M')]

  it('only leaves are scheduled', () => {
    expect([...expandSummaryLinks(tasks, []).leafIds].sort()).toEqual(['A', 'B', 'L', 'X'])
  })
  it('a link into a summary reaches every leaf; out of a summary leaves from every leaf', () => {
    expect(expandSummaryLinks(tasks, [{ pred: 'X', succ: 'S', lag: 2 }]).deps.map((d) => `${d.pred}>${d.succ}:${d.lag}`)).toEqual(['X>A:2', 'X>B:2'])
    expect(expandSummaryLinks(tasks, [{ pred: 'S', succ: 'X' }]).deps.map((d) => `${d.pred}>${d.succ}`)).toEqual(['A>X', 'B>X'])
  })
  it('ignores links between a summary and its own sub-tasks', () => {
    expect(expandSummaryLinks(tasks, [{ pred: 'S', succ: 'A' }, { pred: 'L', succ: 'N' }]).deps).toEqual([])
  })
})

describe('display text', () => {
  it('formats durations', () => {
    expect(formatDuration(5)).toBe('5 days')
    expect(formatDuration(1)).toBe('1 day')
    expect(formatDuration(null)).toBe('—')
  })
  it('writes links desktop-style by ID', () => {
    const rows = buildOutline(PLAN)
    const deps = [
      { predecessor_task_id: 'master', successor_task_id: 'dev', dependency_type: 'start_to_start', lag_days: 0 },
      { predecessor_task_id: 'review', successor_task_id: 'dev', dependency_type: 'finish_to_start', lag_days: 2 },
      { predecessor_task_id: 'closure', successor_task_id: 'envs', dependency_type: 'finish_to_start', lag_days: 0 },
    ]
    expect(linkTextByTask(rows, deps, 'pred').get('dev')).toBe('4FS+2d, 6SS')
    expect(linkTextByTask(rows, deps, 'pred').get('envs')).toBe('3')
    expect(linkTextByTask(rows, deps, 'succ').get('master')).toBe('7SS')
  })
})

describe('isAncestorOf', () => {
  it('finds parents and grandparents only', async () => {
    const { isAncestorOf } = await import('../planOutline.js')
    expect(isAncestorOf(PLAN, 'mvp', 'dev')).toBe(true)
    expect(isAncestorOf(PLAN, 'dev', 'mvp')).toBe(false)
    expect(isAncestorOf(PLAN, 'closure', 'dev')).toBe(false)
  })
})

describe('descendantsOf', () => {
  it('lists every level under a task in outline order', async () => {
    const { descendantsOf } = await import('../planOutline.js')
    expect(descendantsOf(PLAN, 'mvp').map((t) => t.id)).toEqual(['closure', 'review', 'envs', 'master', 'dev'])
    expect(descendantsOf(PLAN, 'dev')).toEqual([])
  })
})

describe('predecessorChoices', () => {
  it('lists other tasks in plan order with outline numbers, hiding its own summaries, sub-tasks and existing links', async () => {
    const { predecessorChoices } = await import('../planOutline.js')
    const tasks = PLAN.map((t) => (t.id === 'review' ? { ...t, assigned_to_user_id: 'me', task_code: 'TSK-4' } : t))
    const choices = predecessorChoices(tasks, { id: 'dev' }, { existing: ['master'], userId: 'me' })
    expect(choices.map((c) => c.value)).toEqual(['closure', 'review']) // not plan / mvp / envs (its summaries), not master (linked), not itself
    expect(choices[1].label).toBe('   1.1.1.1  TSK-4 · review')
    expect(choices.filter((c) => c.mine).map((c) => c.value)).toEqual(['review'])
    expect(predecessorChoices(tasks, { id: 'envs' }).map((c) => c.value)).not.toContain('dev') // its own sub-task
  })
})
