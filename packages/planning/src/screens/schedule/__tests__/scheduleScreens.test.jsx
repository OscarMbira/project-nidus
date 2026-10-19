// v1239 Slice 3 — shared schedule screens: pure helpers, link building, and the save-conflict
// UX (Slice 3.4: a stale save is rejected and the reload prompt is shown).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
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
import { validateTask, dateWarnings, daysBetween } from '../TaskFormScreen.jsx'
import ScheduleFilteredListScreen, { PRESETS } from '../ScheduleFilteredListScreen.jsx'
import TaskFormScreen from '../TaskFormScreen.jsx'
import ScheduleGridScreen from '../ScheduleGridScreen.jsx'
import ScheduleBaselinesScreen from '../ScheduleBaselinesScreen.jsx'

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

describe('task dates: planned, actual and baseline', () => {
  beforeEach(() => vi.clearAllMocks())

  it('checks planned order, warns on future actual dates and counts day shifts', () => {
    expect(validateTask({ task_name: 'A', estimated_duration_days: 2, percentage_complete: 0, planned_start_date: '2026-10-12', planned_end_date: '2026-10-10' })).toMatch(/Planned finish/)
    expect(dateWarnings({ actual_start_date: '2026-10-20' }, '2026-10-12')).toHaveLength(1)
    expect(dateWarnings({ actual_start_date: '2026-10-01', actual_end_date: '2026-10-12' }, '2026-10-12')).toEqual([])
    expect(daysBetween('2026-10-16', '2026-10-14')).toBe(2)
    expect(daysBetween('', '2026-10-14')).toBeNull()
  })

  it('typing a planned date on an Automatic task switches it to Manual and says so', async () => {
    fake.api = makeApi()
    renderAt('/platform/pm/schedule/tasks/TSK-0001/edit?projectId=PRJ-1', <TaskFormScreen />, 'platform', '/platform/pm/schedule/tasks/:taskKey/edit')
    fireEvent.click(await screen.findByRole('tab', { name: 'Schedule' }))
    const start = await screen.findByDisplayValue('2026-10-12')
    expect(screen.getByDisplayValue('Automatic')).toBeInTheDocument()
    fireEvent.change(start, { target: { value: '2026-10-19' } })
    expect(screen.getByDisplayValue('Manual')).toBeInTheDocument()
    expect(screen.getByText(/this task is now Manual/)).toBeInTheDocument()
  })

  it('shows the baseline and how far the plan has moved from it', async () => {
    fake.api = makeApi({ getTask: vi.fn(async () => ({ ...TASK, baseline_start_date: '2026-10-12', baseline_end_date: '2026-10-12' })) })
    renderAt('/platform/pm/schedule/tasks/TSK-0001/edit?projectId=PRJ-1', <TaskFormScreen />, 'platform', '/platform/pm/schedule/tasks/:taskKey/edit')
    fireEvent.click(await screen.findByRole('tab', { name: 'Progress' }))
    expect(await screen.findByText(/Planned finish \+2 days/)).toBeInTheDocument()
  })

  it('says when no baseline has been saved', async () => {
    fake.api = makeApi()
    renderAt('/platform/pm/schedule/tasks/TSK-0001/edit?projectId=PRJ-1', <TaskFormScreen />, 'platform', '/platform/pm/schedule/tasks/:taskKey/edit')
    fireEvent.click(await screen.findByRole('tab', { name: 'Progress' }))
    expect(await screen.findByText(/none saved yet/)).toBeInTheDocument()
  })
})

describe('baseline dates fallback', () => {
  beforeEach(() => vi.clearAllMocks())

  it('uses the latest saved schedule baseline when the task has no baseline columns', async () => {
    fake.api = makeApi({
      listBaselines: vi.fn(async () => [
        { baseline_name: 'Scope', baseline_type: 'scope', baseline_data: { tasks: [{ id: 't1', start: '2026-01-01', finish: '2026-01-02' }] } },
        { baseline_name: 'Initial plan', baseline_type: 'schedule', baseline_date: '2026-10-01', baseline_data: { tasks: [{ id: 't1', start: '2026-10-12', finish: '2026-10-13' }] } },
      ]),
    })
    renderAt('/platform/pm/schedule/tasks/TSK-0001/edit?projectId=PRJ-1', <TaskFormScreen />, 'platform', '/platform/pm/schedule/tasks/:taskKey/edit')
    fireEvent.click(await screen.findByRole('tab', { name: 'Progress' }))
    expect(await screen.findByText(/Baseline \(Initial plan, 2026-10-01\)/)).toBeInTheDocument()
    expect(screen.getByText(/Planned finish \+1 day\b/)).toBeInTheDocument()
  })
})

describe('multiple baselines (v1265 S2)', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.spyOn(window, 'confirm').mockReturnValue(true) })

  const B0 = { id: 'b0', baseline_number: 0, baseline_name: 'Approved plan', baseline_type: 'schedule', approval_date: '2026-10-01T00:00:00Z', is_active_baseline: true, baseline_data: { tasks: [] } }
  const B1 = { id: 'b1', baseline_number: 1, baseline_name: 'Re-plan', baseline_type: 'schedule', reason: 'CR-0012', is_active_baseline: false, baseline_data: { tasks: [] } }

  it('the first baseline needs no reason', async () => {
    fake.api = makeApi({ listBaselines: vi.fn(async () => []), saveBaseline: vi.fn(async () => ({ ...B0 })) })
    renderAt('/platform/pm/schedule/baselines?projectId=PRJ-1', <ScheduleBaselinesScreen />)
    expect(await screen.findByText(/Save the original baseline \(B0\)\./)).toBeInTheDocument()
    expect(screen.queryByText(/Reason for re-baselining/)).toBeNull()
    fireEvent.change(screen.getByPlaceholderText('e.g. Approved plan'), { target: { value: 'Approved plan' } })
    await waitFor(() => expect(screen.getByRole('button', { name: /Save current dates/ })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: /Save current dates/ }))
    await waitFor(() => expect(fake.api.saveBaseline).toHaveBeenCalled())
  })

  it('a re-baseline needs a reason before it can be saved', async () => {
    fake.api = makeApi({ listBaselines: vi.fn(async () => [B0]) })
    renderAt('/platform/pm/schedule/baselines?projectId=PRJ-1', <ScheduleBaselinesScreen />)
    fireEvent.change(await screen.findByPlaceholderText(/Re-plan after/), { target: { value: 'Re-plan' } })
    expect(screen.getByRole('button', { name: /Save current dates/ })).toBeDisabled()
    fireEvent.change(screen.getByPlaceholderText(/Scope change approved/), { target: { value: 'CR-0012 approved' } })
    expect(screen.getByRole('button', { name: /Save current dates/ })).toBeEnabled()
  })

  it('approving needs a justification; an approved baseline can be made active', async () => {
    fake.api = makeApi({
      listBaselines: vi.fn(async () => [B1, B0]),
      approveBaseline: vi.fn(async () => ({})),
      activateBaseline: vi.fn(async () => ({})),
    })
    renderAt('/platform/pm/schedule/baselines?projectId=PRJ-1', <ScheduleBaselinesScreen />)
    expect(await screen.findAllByText('Active')).not.toHaveLength(0)
    fireEvent.click(screen.getAllByRole('button', { name: 'Approve' })[0])
    const dialog = screen.getByRole('dialog')
    const confirm = within(dialog).getByRole('button', { name: 'Approve' })
    expect(confirm).toBeDisabled()
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'Steering committee approved' } })
    fireEvent.click(confirm)
    await waitFor(() => expect(fake.api.approveBaseline).toHaveBeenCalledWith('b1', 'Steering committee approved'))
  })

  it('offers Make active only for approved, inactive baselines', async () => {
    const approvedB1 = { ...B1, approval_date: '2026-10-10T00:00:00Z' }
    fake.api = makeApi({ listBaselines: vi.fn(async () => [approvedB1, B0]), activateBaseline: vi.fn(async () => ({})) })
    renderAt('/platform/pm/schedule/baselines?projectId=PRJ-1', <ScheduleBaselinesScreen />)
    const buttons = await screen.findAllByRole('button', { name: 'Make active' })
    fireEvent.click(buttons[0])
    await waitFor(() => expect(fake.api.activateBaseline).toHaveBeenCalledWith('b1'))
  })
})

describe('sub-tasks and full screen (v1265)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('a new task opened with ?parent= is a sub-task placed after its siblings', async () => {
    const parent = { ...TASK, id: 'p1', task_code: 'TSK-0009', task_name: 'Envs' }
    const kids = [{ ...TASK, id: 'k1', parent_task_id: 'p1', outline_position: 3 }]
    const saveTask = vi.fn(async () => ({ data: { id: 'n1', task_code: 'TSK-0010', task_name: 'Prod' }, operation: 'created' }))
    fake.api = makeApi({ listTasks: vi.fn(async () => [parent, ...kids]), saveTask })
    renderAt('/platform/pm/schedule/tasks/new?projectId=PRJ-1&parent=TSK-0009', <TaskFormScreen />, 'platform', '/platform/pm/schedule/tasks/new')
    expect(await screen.findByText(/Sub-task of/)).toHaveTextContent('TSK-0009 · Envs')
    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: 'Prod' } })
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    await waitFor(() => expect(saveTask).toHaveBeenCalledWith('p-public', expect.objectContaining({ parent_task_id: 'p1', outline_position: 4 }), null))
  })

  it('a schedule view goes full screen and back with Esc', async () => {
    fake.api = makeApi()
    renderAt('/platform/pm/schedule/activities?projectId=PRJ-1', <ScheduleGridScreen />)
    await screen.findAllByText('Pour slab')
    fireEvent.click(screen.getByRole('button', { name: 'Full screen' }))
    expect(screen.getByRole('dialog', { name: /full screen/ })).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: /full screen/ })).toBeNull()
    expect(screen.getByRole('button', { name: 'Open in a new window' })).toBeInTheDocument()
  })
})

describe('task modal (v1265, rule 65 task-form exception)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('View on the Tasks list opens the task in a modal over the list; Edit, then Esc closes it', async () => {
    fake.api = makeApi()
    renderAt('/platform/pm/schedule/activities?projectId=PRJ-1', <ScheduleGridScreen />)
    await screen.findAllByText('Pour slab')
    fireEvent.click(screen.getAllByRole('button', { name: 'View task' })[0])
    const dialog = await screen.findByRole('dialog', { name: /Pour slab/ })
    expect(within(dialog).getByText('TSK-0001')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Tasks' })).toBeInTheDocument() // the list is still behind
    fireEvent.click(within(dialog).getByRole('button', { name: 'Edit task' }))
    expect(await within(screen.getByRole('dialog')).findByDisplayValue('Pour slab')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('New task opens an empty form in the modal', async () => {
    fake.api = makeApi()
    renderAt('/platform/pm/schedule/activities?projectId=PRJ-1', <ScheduleGridScreen />)
    await screen.findAllByText('Pour slab')
    fireEvent.click(screen.getByRole('button', { name: /New task/ }))
    expect(await screen.findByRole('dialog', { name: 'New task' })).toBeInTheDocument()
  })
})

describe('Plan Sheet tab and branch delete (v1265)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('the Gantt tab is called Plan Sheet', async () => {
    fake.api = makeApi()
    renderAt('/platform/pm/schedule/activities?projectId=PRJ-1', <ScheduleGridScreen />)
    fireEvent.click(await screen.findByRole('button', { name: /^Plan/ }))
    expect(await screen.findByRole('link', { name: 'Plan Sheet' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Gantt' })).toBeNull()
  })

  it('deleting a summary from the Tasks list deletes its sub-tasks after the extra tick', async () => {
    const parent = { ...TASK, id: 'p1', task_code: 'TSK-0009', task_name: 'Envs' }
    const kid = { ...TASK, id: 'k1', task_code: 'TSK-0010', task_name: 'Dev env', parent_task_id: 'p1' }
    const deleteTaskTree = vi.fn(async () => ({ deleted: 2 }))
    fake.api = makeApi({ listTasks: vi.fn(async () => [parent, kid]), deleteTaskTree })
    renderAt('/platform/pm/schedule/activities?projectId=PRJ-1', <ScheduleGridScreen />)
    await screen.findAllByText('Envs')
    const envsRow = screen.getAllByText('Envs').map((el) => el.closest('tr')).find(Boolean)
    fireEvent.click(within(envsRow).getByRole('button', { name: 'Delete task' }))
    const dialog = await screen.findByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('checkbox'))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete 2 tasks' }))
    await waitFor(() => expect(deleteTaskTree).toHaveBeenCalledWith('p-public', expect.objectContaining({ id: 'p1' }), [expect.objectContaining({ id: 'k1' })]))
  })
})

describe('Board and Due dates inside the schedule frame (v1265)', () => {
  it('the Due dates tab has Back, the schedule tabs and full screen', async () => {
    fake.api = makeApi()
    const { default: ScheduleRoutes } = await import('../../../routes/ScheduleRoutes.jsx')
    renderAt('/platform/pm/schedule/due-dates?projectId=PRJ-1', <ScheduleRoutes />)
    expect(await screen.findByRole('heading', { name: 'Due dates' }, { timeout: 10000 })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Back/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Plan: Due dates/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Full screen' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Task Calendar' })).toBeNull()
  })
})

describe('task form tabs (v1265)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('splits the form into Details, Schedule and Progress', async () => {
    fake.api = makeApi()
    renderAt('/platform/pm/schedule/tasks/TSK-0001/edit?projectId=PRJ-1', <TaskFormScreen />, 'platform', '/platform/pm/schedule/tasks/:taskKey/edit')
    expect(await screen.findByDisplayValue('Pour slab')).toBeInTheDocument()
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Details', 'Schedule', 'Progress', 'Links', 'Audit details'])
    expect(screen.queryByLabelText('% done')).toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: 'Progress' }))
    expect(screen.getByLabelText('% done')).toBeInTheDocument()
  })

  it('a save problem on another tab switches to that tab', async () => {
    fake.api = makeApi()
    renderAt('/platform/pm/schedule/tasks/TSK-0001/edit?projectId=PRJ-1', <TaskFormScreen />, 'platform', '/platform/pm/schedule/tasks/:taskKey/edit')
    fireEvent.click(await screen.findByRole('tab', { name: 'Progress' }))
    fireEvent.change(screen.getByLabelText('% done'), { target: { value: '150' } })
    fireEvent.click(screen.getByRole('tab', { name: 'Details' }))
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(await screen.findByText(/between 0 and 100/)).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Progress' })).toHaveAttribute('aria-selected', 'true')
  })
})

describe('grouped schedule menus (v1265)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows four menus; the current one names the view', async () => {
    fake.api = makeApi()
    renderAt('/platform/pm/schedule/activities?projectId=PRJ-1', <ScheduleGridScreen />)
    const nav = within(await screen.findByRole('navigation', { name: 'Schedule views' }))
    expect(nav.getAllByRole('button').map((b) => b.textContent)).toEqual(['Plan: Tasks', 'Sequence', 'Track', 'Time & people'])
    expect(nav.queryAllByRole('link')).toHaveLength(0) // closed until opened
  })

  it('opens a menu, lists its views, and closes with Escape', async () => {
    fake.api = makeApi()
    renderAt('/platform/pm/schedule/activities?projectId=PRJ-1', <ScheduleGridScreen />)
    const track = await screen.findByRole('button', { name: 'Track' })
    fireEvent.click(track)
    expect(track).toHaveAttribute('aria-expanded', 'true')
    const list = within(screen.getByRole('list', { name: 'Track' }))
    expect(list.getAllByRole('link').map((a) => a.textContent)).toEqual(['Milestones', 'Look-ahead', 'Variance', 'Baselines'])
    expect(list.getByRole('link', { name: 'Baselines' }).getAttribute('href')).toBe('/platform/pm/schedule/baselines?projectId=PRJ-1')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(track).toHaveAttribute('aria-expanded', 'false')
  })

  it('every view is in exactly one group', async () => {
    const { SCHEDULE_GROUPS, SCHEDULE_TABS, isScheduleViewActive } = await import('../../../components/ScheduleLayout.jsx')
    expect(SCHEDULE_TABS).toHaveLength(15)
    expect(new Set(SCHEDULE_TABS.map((t) => t.sub)).size).toBe(15)
    expect(SCHEDULE_GROUPS.map((g) => g.label)).toEqual(['Plan', 'Sequence', 'Track', 'Time & people'])
    expect(isScheduleViewActive('/x/schedule/calendar/exceptions/create', 'calendar')).toBe(true)
    expect(isScheduleViewActive('/x/schedule/critical-path', 'calendar')).toBe(false)
  })
})

describe('project picker (v1265)', () => {
  const Bar = () => <p>PROJECT PICKER</p>
  const renderWith = (headerProjectPicker) => render(
    <MemoryRouter initialEntries={['/platform/pm/schedule/activities?projectId=PRJ-1']}>
      <UnsavedChangesProvider>
        <PlanningProvider mode="platform" basePath="/x" ProjectBar={Bar} headerProjectPicker={headerProjectPicker}>
          <Routes><Route path="/platform/pm/schedule/*" element={<ScheduleGridScreen />} /></Routes>
        </PlanningProvider>
      </UnsavedChangesProvider>
    </MemoryRouter>
  )

  it('is not repeated on the page when the header already has one', async () => {
    fake.api = makeApi()
    renderWith(true)
    await screen.findAllByText('Pour slab')
    expect(screen.queryByText('PROJECT PICKER')).toBeNull()
  })

  it('is shown when the shell header has none (e.g. Planner)', async () => {
    fake.api = makeApi()
    renderWith(false)
    expect(await screen.findByText('PROJECT PICKER')).toBeInTheDocument()
  })
})

describe('priority vs critical path (v1265)', () => {
  it('Milestones shows the chosen Priority and the calculated Critical path as separate columns', async () => {
    const ms = { ...TASK, id: 'm1', task_name: 'Charter approved', is_milestone: true, priority: 'critical', is_critical_path: false }
    fake.api = makeApi({ listTasks: vi.fn(async () => [ms]) })
    renderAt('/platform/pm/schedule/milestones?projectId=PRJ-1', <ScheduleFilteredListScreen preset="milestones" />)
    const row = (await screen.findAllByText('Charter approved'))[0].closest('tr')
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent.trim())
    expect(headers).toEqual(expect.arrayContaining([expect.stringMatching(/^Priority/), expect.stringMatching(/^Critical path/)]))
    expect(within(row).getByText('Critical')).toBeInTheDocument()
    expect(within(row).getByText('No')).toBeInTheDocument()
  })
})
