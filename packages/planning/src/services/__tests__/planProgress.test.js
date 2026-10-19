// v1265 S2 — Planned % / Actual % / Deviation / slip since original.
import { describe, it, expect } from 'vitest'
import { plannedPercent, progressByTask, baselineEntry, slipSinceOriginal, formatDeviation, deviationTone } from '../planProgress.js'

describe('plannedPercent (Mon–Fri calendar)', () => {
  // Baseline Mon 5 Jan → Fri 16 Jan 2026 = 10 working days
  it('is 0 before the start and 100 on / after the finish', () => {
    expect(plannedPercent('2026-01-05', '2026-01-16', '2026-01-02')).toBe(0)
    expect(plannedPercent('2026-01-05', '2026-01-16', '2026-01-16')).toBe(100)
    expect(plannedPercent('2026-01-05', '2026-01-16', '2026-02-01')).toBe(100)
  })
  it('counts working days passed, including the status date', () => {
    expect(plannedPercent('2026-01-05', '2026-01-16', '2026-01-05')).toBe(10)
    expect(plannedPercent('2026-01-05', '2026-01-16', '2026-01-09')).toBe(50)
    expect(plannedPercent('2026-01-05', '2026-01-16', '2026-01-11')).toBe(50) // Sunday: no extra day
  })
  it('milestones jump from 0 to 100 on their date; no baseline is null', () => {
    expect(plannedPercent('2026-01-07', '2026-01-07', '2026-01-06')).toBe(0)
    expect(plannedPercent('2026-01-07', '2026-01-07', '2026-01-07')).toBe(100)
    expect(plannedPercent(null, null, '2026-01-07')).toBeNull()
  })
})

describe('progressByTask', () => {
  const tasks = [
    { id: 's' },
    { id: 'a', parent_task_id: 's', estimated_duration_days: 10, percentage_complete: 40, baseline_start_date: '2026-01-05', baseline_end_date: '2026-01-16' },
    { id: 'b', parent_task_id: 's', estimated_duration_days: 10, percentage_complete: 100, baseline_start_date: '2026-01-19', baseline_end_date: '2026-01-30' },
    { id: 'n', estimated_duration_days: 3, percentage_complete: 0 },
  ]
  const p = progressByTask(tasks, { statusDate: '2026-01-09' })

  it('leaf: planned from its baseline, deviation = actual − planned', () => {
    expect(p.get('a')).toEqual({ planned: 50, actual: 40, deviation: -10 })
    expect(p.get('b')).toEqual({ planned: 0, actual: 100, deviation: 100 })
  })
  it('summary: duration-weighted planned and actual', () => {
    expect(p.get('s')).toEqual({ planned: 25, actual: 70, deviation: 45 })
  })
  it('no baseline: planned and deviation are null', () => {
    expect(p.get('n')).toEqual({ planned: null, actual: 0, deviation: null })
  })
})

describe('baselines', () => {
  const b0 = { baseline_data: { tasks: [{ id: 't1', task_code: 'TSK-1', start: '2026-01-05', finish: '2026-01-16', duration: 10 }] } }
  it('finds a task in a snapshot by id or code', () => {
    expect(baselineEntry(b0, { id: 't1' })).toMatchObject({ finish: '2026-01-16' })
    expect(baselineEntry(b0, { id: 'other', task_code: 'TSK-1' })).toMatchObject({ start: '2026-01-05' })
    expect(baselineEntry(b0, { id: 'none' })).toBeNull()
  })
  it('slip since original in working days', () => {
    expect(slipSinceOriginal({ id: 't1', baseline_end_date: '2026-01-21' }, b0)).toBe(3)
    expect(slipSinceOriginal({ id: 't1', baseline_end_date: null }, b0)).toBeNull()
  })
})

describe('display', () => {
  it('formats and tones deviation', () => {
    expect(formatDeviation(-5.2)).toBe('-5')
    expect(formatDeviation(3)).toBe('+3')
    expect(formatDeviation(null)).toBe('—')
    expect([deviationTone(-2), deviationTone(2), deviationTone(0.2), deviationTone(null)]).toEqual(['behind', 'ahead', 'neutral', 'neutral'])
  })
})
