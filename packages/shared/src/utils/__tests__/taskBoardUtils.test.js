import { describe, expect, it } from 'vitest'
import { groupTasksByStatus, resolveDropStatusId, sortTasksForBoard } from '../taskBoardUtils.js'

const statuses = [
  { id: 's-open', status_name: 'Open' },
  { id: 's-done', status_name: 'Done' },
]

describe('sortTasksForBoard', () => {
  it('sorts by name, then created_at', () => {
    const sorted = sortTasksForBoard([
      { id: '2', task_name: 'Bravo', created_at: '2024-02-01' },
      { id: '1', task_name: 'alpha', created_at: '2024-03-01' },
      { id: '3', task_name: 'Alpha', created_at: '2024-01-01' },
    ])
    expect(sorted.map((task) => task.id)).toEqual(['3', '1', '2'])
  })
})

describe('groupTasksByStatus', () => {
  it('keeps an empty bucket for every status and ignores unknown statuses', () => {
    const grouped = groupTasksByStatus(
      [
        { id: 't1', status_id: 's-done' },
        { id: 't2', status_id: 'missing' },
        { id: 't3', status_id: 's-open' },
      ],
      statuses,
    )
    expect(grouped.get('s-open').map((task) => task.id)).toEqual(['t3'])
    expect(grouped.get('s-done').map((task) => task.id)).toEqual(['t1'])
    expect(grouped.has('missing')).toBe(false)
  })
})

describe('resolveDropStatusId', () => {
  it('accepts a column id or the status of the card dropped on', () => {
    const tasks = [{ id: 't1', status_id: 's-done' }]
    expect(resolveDropStatusId('s-open', statuses, tasks)).toBe('s-open')
    expect(resolveDropStatusId('t1', statuses, tasks)).toBe('s-done')
    expect(resolveDropStatusId('nope', statuses, tasks)).toBe(null)
    expect(resolveDropStatusId(null, statuses, tasks)).toBe(null)
  })
})
