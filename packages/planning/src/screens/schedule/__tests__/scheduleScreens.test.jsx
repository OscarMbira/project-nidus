// v1239 Slice 3 — shared schedule screens: pure helpers, link building, and the save-conflict
// UX (Slice 3.4: a stale save is rejected and the reload prompt is shown).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

const fake = vi.hoisted(() => ({ api: null }))
vi.mock('../../../services/scheduleData.js', async (importOriginal) => {
  const real = await importOriginal()
  return { ...real, createScheduleData: () => fake.api }
})
vi.mock('@nidus/shared/hooks/usePlatformProjectId', () => ({
  usePlatformProjectId: () => ({ projectId: 'p-public', routeKey: 'PRJ-1', loading: false, error: null }),
}))

import { PlanningProvider } from '../../../context/PlanningContext.jsx'
import { UnsavedChangesProvider } from '@nidus/shared/context/UnsavedChangesContext'
import { ScheduleConflictError } from '../../../services/scheduleData.js'
import { scheduleLinkFor } from '../../../hooks/useSchedule.js'
import { layoutGantt } from '../../../components/ScheduleGanttChart.jsx'
import { networkColumns } from '../ScheduleNetworkScreen.jsx'
import { validateTask } from '../TaskFormScreen.jsx'
import { PRESETS } from '../ScheduleFilteredListScreen.jsx'
import TaskFormScreen from '../TaskFormScreen.jsx'
import ScheduleGridScreen from '../ScheduleGridScreen.jsx'

const TASK = {
  id: 't1', task_code: 'TSK-0001', task_name: 'Pour slab', estimated_duration_days: 3, is_milestone: false,
  schedule_mode: 'auto', constraint_type: 'asap', percentage_complete: 0, row_version: 2,
  planned_start_date: '2026-10-12', planned_end_date: '2026-10-14', created_at: '2026-10-01T00:00:00Z',
}

function makeApi(overrides = {}) {
  return {
    listTasks: vi.fn(async () => [TASK]),
    listDependencies: vi.fn(async () => []),
    listTeam: vi.fn(async () => []),
    getTask: vi.fn(async () => ({ ...TASK })),
    getCalendarRows: vi.fn(async () => ({ calendar: null, exceptions: [] })),
    saveTask: vi.fn(),
    deleteTask: vi.fn(),
    recalculate: vi.fn(async () => ({})),
    ...overrides,
  }
}

const renderAt = (url, element, mode = 'platform', routePath = '/platform/pm/schedule/*') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <UnsavedChangesProvider>
        <PlanningProvider mode={mode} basePath="/x">
          <Routes>
            <Route path={routePath} element={element} />
          </Routes>
        </PlanningProvider>
      </UnsavedChangesProvider>
    </MemoryRouter>
  )

describe('schedule links', () => {
  it('keeps the shell prefix and ?projectId= wherever the screens are mounted', () => {
    expect(scheduleLinkFor('/platform/pm/schedule/gantt', '?projectId=PRJ-1', 'tasks/new')).toBe('/platform/pm/schedule/tasks/new?projectId=PRJ-1')
    expect(scheduleLinkFor('/platform/projects/PRJ-1/schedule/activities', '', 'gantt')).toBe('/platform/projects/PRJ-1/schedule/gantt')
    expect(scheduleLinkFor('/simulator/practice-projects/abc/schedule/network', '', 'calendar')).toBe('/simulator/practice-projects/abc/schedule/calendar')
    expect(scheduleLinkFor('/platform/pm/planning/calendars', '?projectId=X', 'calendar/exceptions/create')).toBe('/platform/pm/schedule/calendar/exceptions/create?projectId=X')
    expect(scheduleLinkFor('/app/schedule', '', 'activities')).toBe('/app/schedule/activities')
  })
})

describe('pure screen helpers', () => {
  it('validates the task form before any save', () => {
    expect(validateTask({ task_name: '' })).toMatch(/name/)
    expect(validateTask({ task_name: 'A', estimated_duration_days: 0, percentage_complete: 0 })).toMatch(/at least 1/)
    expect(validateTask({ task_name: 'A', is_milestone: true, estimated_duration_days: 0, percentage_complete: 0 })).toBeNull()
    expect(validateTask({ task_name: 'A', estimated_duration_days: 2, schedule_mode: 'manual', percentage_complete: 0 })).toMatch(/start date/)
    expect(validateTask({ task_name: 'A', estimated_duration_days: 2, constraint_type: 'snet', percentage_complete: 0 })).toMatch(/constraint/)
    expect(validateTask({ task_name: 'A', estimated_duration_days: 2, percentage_complete: 140 })).toMatch(/between 0 and 100/)
    expect(validateTask({ task_name: 'A', estimated_duration_days: 2, percentage_complete: 0, actual_start_date: '2026-10-12', actual_end_date: '2026-10-10' })).toMatch(/Actual finish/)
  })

  it('lays out Gantt bars with inclusive finish days and skips undated tasks', () => {
    const { rows, px } = layoutGantt([
      { id: 'a', task_name: 'A', planned_start_date: '2026-10-12', planned_end_date: '2026-10-14' },
      { id: 'b', task_name: 'B' },
    ], 'day')
    expect(rows).toHaveLength(1)
    expect(rows[0].width).toBe(3 * px)
  })

  it('puts tasks in network columns by their longest chain of predecessors', () => {
    const cols = networkColumns(
      [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }],
      [
        { predecessor_task_id: 'a', successor_task_id: 'b' },
        { predecessor_task_id: 'b', successor_task_id: 'c' },
        { predecessor_task_id: 'a', successor_task_id: 'c' },
      ]
    )
    expect(cols.map((c) => c.map((t) => t.id).sort())).toEqual([['a', 'd'], ['b'], ['c']])
  })

  it('filter presets pick the right tasks', () => {
    expect(PRESETS['critical-path'].filter({ is_critical_path: true })).toBe(true)
    expect(PRESETS.milestones.filter({ is_milestone: false })).toBe(false)
    expect(PRESETS.variance.filter({ baseline_end_date: '2026-10-12' })).toBe(true)
    const soon = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)
    expect(PRESETS['look-ahead'].filter({ planned_start_date: soon, planned_end_date: soon, percentage_complete: 0 }, 7)).toBe(true)
    expect(PRESETS['look-ahead'].filter({ planned_start_date: soon, planned_end_date: soon, percentage_complete: 100 }, 7)).toBe(false)
  })
})

describe('save conflict (Slice 3.4)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects a stale save, shows the reload prompt, and reloads the task on request', async () => {
    fake.api = makeApi({ saveTask: vi.fn(async () => { throw new ScheduleConflictError() }) })
    renderAt('/platform/pm/schedule/tasks/TSK-0001/edit?projectId=PRJ-1', <TaskFormScreen />, 'platform', '/platform/pm/schedule/tasks/:taskKey/edit')

    const name = await screen.findByDisplayValue('Pour slab')
    fireEvent.change(name, { target: { value: 'Pour slab (revised)' } })
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))

    expect(await screen.findByText(/This plan changed since you opened it/)).toBeInTheDocument()
    expect(fake.api.saveTask).toHaveBeenCalledWith('p-public', expect.objectContaining({ task_name: 'Pour slab (revised)' }), expect.objectContaining({ id: 't1', row_version: 2 }))
    expect(fake.api.recalculate).not.toHaveBeenCalled()

    const callsBefore = fake.api.getTask.mock.calls.length
    fireEvent.click(screen.getByRole('button', { name: /reload plan/i }))
    await waitFor(() => expect(fake.api.getTask.mock.calls.length).toBe(callsBefore + 1))
    await waitFor(() => expect(screen.queryByText(/This plan changed since you opened it/)).not.toBeInTheDocument())
  })

  it('a recalculate conflict on the grid shows the same prompt', async () => {
    fake.api = makeApi({ recalculate: vi.fn(async () => { throw new ScheduleConflictError() }) })
    renderAt('/platform/pm/schedule/activities?projectId=PRJ-1', <ScheduleGridScreen />)
    await screen.findAllByText('Pour slab')
    fireEvent.click(screen.getByRole('button', { name: /recalculate/i }))
    expect(await screen.findByRole('button', { name: /reload plan/i })).toBeInTheDocument()
    expect(fake.api.recalculate).toHaveBeenCalledWith('p-public', { t1: 2 })
  })
})

describe('Simulator mode', () => {
  it('uses the practice project from the route, not the public resolver', async () => {
    fake.api = makeApi()
    renderAt('/simulator/practice-projects/sim-proj-1/schedule/activities', <ScheduleGridScreen />, 'simulator', '/simulator/practice-projects/:projectId/schedule/*')
    await screen.findAllByText('Pour slab')
    expect(fake.api.listTasks).toHaveBeenCalledWith('sim-proj-1')
  })
})

describe('schedule screen contract', () => {
  const here = path.dirname(fileURLToPath(import.meta.url))
  const dir = path.resolve(here, '..')
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.jsx'))

  it('no schedule screen decides its data mode from the URL', () => {
    expect(files.filter((f) => /pathname\.includes\(['"]\/simulator/.test(fs.readFileSync(path.join(dir, f), 'utf8')))).toEqual([])
  })

  it('no schedule screen talks to Supabase directly (all data goes through scheduleData)', () => {
    expect(files.filter((f) => /@nidus\/supabase|platformDb|simDb/.test(fs.readFileSync(path.join(dir, f), 'utf8')))).toEqual([])
  })

  it('no schedule screen ships a dark-only surface', () => {
    const offenders = files.filter((f) => /className="[^"]*(?<!dark:)\bbg-gray-9[05]0\b/.test(fs.readFileSync(path.join(dir, f), 'utf8')))
    expect(offenders).toEqual([])
  })
})
