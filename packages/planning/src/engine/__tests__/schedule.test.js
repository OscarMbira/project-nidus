import { describe, it, expect } from 'vitest'
import { buildCalendar, addWorkingDays, workingDaysBetween, isWorkingDay, scheduleProject, ScheduleCycleError } from '../schedule.js'

// 2026-10-12 is a Monday.
const MON = '2026-10-12'
const cal = buildCalendar({ workingDays: [1, 2, 3, 4, 5], exceptions: ['2026-10-14'] }) // Wed holiday

describe('working calendar', () => {
  it('skips weekends and exception dates', () => {
    expect(isWorkingDay('2026-10-17', cal)).toBe(false) // Saturday
    expect(isWorkingDay('2026-10-14', cal)).toBe(false) // holiday
    expect(isWorkingDay('2026-10-13', cal)).toBe(true)
  })

  it('adds working days forwards and backwards', () => {
    expect(addWorkingDays(MON, 0, cal)).toBe(MON)
    expect(addWorkingDays(MON, 1, cal)).toBe('2026-10-13')
    expect(addWorkingDays(MON, 2, cal)).toBe('2026-10-15') // jumps the Wednesday holiday
    expect(addWorkingDays('2026-10-16', 1, cal)).toBe('2026-10-19') // Fri -> Mon
    expect(addWorkingDays('2026-10-19', -1, cal)).toBe('2026-10-16')
  })

  it('moves a non-working start forward to the next working day', () => {
    expect(addWorkingDays('2026-10-17', 0, cal)).toBe('2026-10-19')
  })

  it('counts working days between two dates', () => {
    expect(workingDaysBetween(MON, '2026-10-16', cal)).toBe(3) // Tue, Thu, Fri (Wed holiday)
    expect(workingDaysBetween('2026-10-16', MON, cal)).toBe(-3)
  })

  it('treats an extra working date as working even on a weekend', () => {
    const c = buildCalendar({ extraWorkingDays: ['2026-10-17'] })
    expect(isWorkingDay('2026-10-17', c)).toBe(true)
    expect(addWorkingDays('2026-10-16', 1, c)).toBe('2026-10-17')
  })

  it('defaults to Monday–Friday with no exceptions', () => {
    const plain = buildCalendar()
    expect(addWorkingDays('2026-10-16', 1, plain)).toBe('2026-10-19')
  })
})

describe('scheduleProject', () => {
  const plain = buildCalendar()

  it('schedules a finish-to-start chain and finds the critical path', () => {
    const r = scheduleProject({
      projectStart: MON,
      calendar: plain,
      tasks: [
        { id: 'a', duration: 2 },
        { id: 'b', duration: 3 },
        { id: 'c', duration: 1 },
      ],
      dependencies: [
        { pred: 'a', succ: 'b', type: 'FS' },
        { pred: 'b', succ: 'c', type: 'FS' },
      ],
    })
    expect(r.tasks.a).toMatchObject({ es: '2026-10-12', ef: '2026-10-13', critical: true, slack: 0 })
    expect(r.tasks.b).toMatchObject({ es: '2026-10-14', ef: '2026-10-16', critical: true })
    expect(r.tasks.c).toMatchObject({ es: '2026-10-19', ef: '2026-10-19' })
    expect(r.projectFinish).toBe('2026-10-19')
  })

  it('gives slack to a parallel shorter branch', () => {
    const r = scheduleProject({
      projectStart: MON,
      calendar: plain,
      tasks: [{ id: 'a', duration: 1 }, { id: 'long', duration: 5 }, { id: 'short', duration: 1 }, { id: 'z', duration: 1 }],
      dependencies: [
        { pred: 'a', succ: 'long', type: 'FS' },
        { pred: 'a', succ: 'short', type: 'FS' },
        { pred: 'long', succ: 'z', type: 'FS' },
        { pred: 'short', succ: 'z', type: 'FS' },
      ],
    })
    expect(r.tasks.short.slack).toBe(4)
    expect(r.tasks.short.critical).toBe(false)
    expect(r.tasks.long.critical).toBe(true)
  })

  it('supports SS, FF and SF with lag', () => {
    const base = { projectStart: MON, calendar: plain }
    const ss = scheduleProject({ ...base, tasks: [{ id: 'p', duration: 3 }, { id: 's', duration: 2 }], dependencies: [{ pred: 'p', succ: 's', type: 'SS', lag: 1 }] })
    expect(ss.tasks.s.es).toBe('2026-10-13')

    const ff = scheduleProject({ ...base, tasks: [{ id: 'p', duration: 3 }, { id: 's', duration: 2 }], dependencies: [{ pred: 'p', succ: 's', type: 'FF', lag: 0 }] })
    expect(ff.tasks.s.ef).toBe('2026-10-14')
    expect(ff.tasks.s.es).toBe('2026-10-13')

    const sf = scheduleProject({ ...base, tasks: [{ id: 'p', duration: 1, constraintType: 'snet', constraintDate: '2026-10-16' }, { id: 's', duration: 2 }], dependencies: [{ pred: 'p', succ: 's', type: 'SF', lag: 0 }] })
    expect(sf.tasks.s.ef).toBe('2026-10-15') // finishes the working day before p starts
  })

  it('counts lag in working days across a holiday', () => {
    const r = scheduleProject({
      projectStart: MON,
      calendar: cal,
      tasks: [{ id: 'a', duration: 1 }, { id: 'b', duration: 1 }],
      dependencies: [{ pred: 'a', succ: 'b', type: 'FS', lag: 1 }],
    })
    // a: Mon. FS + 1 working day of lag: Tue is lag, Wed is a holiday, so b starts Thu.
    expect(r.tasks.b.es).toBe('2026-10-15')
  })

  it('keeps manual tasks where they are but still lets them drive successors', () => {
    const r = scheduleProject({
      projectStart: MON,
      calendar: plain,
      tasks: [{ id: 'm', duration: 1, mode: 'manual', start: '2026-10-20' }, { id: 'n', duration: 1 }],
      dependencies: [{ pred: 'm', succ: 'n', type: 'FS' }],
    })
    expect(r.tasks.m.es).toBe('2026-10-20')
    expect(r.tasks.n.es).toBe('2026-10-21')
  })

  it('honours SNET and MSO starts and an FNLT finish', () => {
    const r = scheduleProject({
      projectStart: MON,
      calendar: plain,
      tasks: [
        { id: 'snet', duration: 1, constraintType: 'snet', constraintDate: '2026-10-15' },
        { id: 'mso', duration: 1, constraintType: 'mso', constraintDate: '2026-10-13' },
        { id: 'fnlt', duration: 1, constraintType: 'fnlt', constraintDate: '2026-10-12' },
        { id: 'end', duration: 1 },
      ],
      dependencies: [{ pred: 'snet', succ: 'end', type: 'FS' }],
    })
    expect(r.tasks.snet.es).toBe('2026-10-15')
    expect(r.tasks.mso.es).toBe('2026-10-13')
    expect(r.tasks.fnlt.lf).toBe('2026-10-12')
    expect(r.tasks.fnlt.critical).toBe(true)
  })

  it('treats a zero-duration task as a milestone on its start date', () => {
    const r = scheduleProject({
      projectStart: MON,
      calendar: plain,
      tasks: [{ id: 'a', duration: 2 }, { id: 'ms', duration: 0 }],
      dependencies: [{ pred: 'a', succ: 'ms', type: 'FS' }],
    })
    expect(r.tasks.ms.es).toBe('2026-10-14')
    expect(r.tasks.ms.ef).toBe('2026-10-14')
  })

  it('rejects a dependency cycle with the tasks involved', () => {
    expect(() =>
      scheduleProject({
        projectStart: MON,
        calendar: plain,
        tasks: [{ id: 'a', duration: 1 }, { id: 'b', duration: 1 }],
        dependencies: [{ pred: 'a', succ: 'b', type: 'FS' }, { pred: 'b', succ: 'a', type: 'FS' }],
      })
    ).toThrow(ScheduleCycleError)
  })

  it('ignores dependencies that point at unknown tasks', () => {
    const r = scheduleProject({ projectStart: MON, calendar: plain, tasks: [{ id: 'a', duration: 1 }], dependencies: [{ pred: 'x', succ: 'a', type: 'FS' }] })
    expect(r.tasks.a.es).toBe(MON)
  })

  // Timing check: only in `pnpm test:perf` (run alone), not under parallel CPU load.
  it.runIf(process.env.PLANNING_PERF === '1')('schedules 1,000 chained tasks quickly (client preview target < 150 ms)', () => {
    const tasks = Array.from({ length: 1000 }, (_, i) => ({ id: `t${i}`, duration: 1 + (i % 3) }))
    const dependencies = tasks.slice(1).map((t, i) => ({ pred: `t${i}`, succ: t.id, type: 'FS' }))
    const t0 = performance.now()
    const r = scheduleProject({ projectStart: MON, calendar: plain, tasks, dependencies })
    const ms = performance.now() - t0
    expect(Object.keys(r.tasks)).toHaveLength(1000)
    expect(ms).toBeLessThan(150)
  })
})
