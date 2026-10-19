// v1265 S1 — Plan sheet: outline rows, numbers toggle, collapse, summaries, project row, links.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'
import PlanSheet from '../PlanSheet.jsx'
import { layoutGantt } from '../ScheduleGanttChart.jsx'

const T = (id, name, parent, extra = {}) => ({ id, task_name: name, parent_task_id: parent, ...extra })
const TASKS = [
  T('p', 'TZ&BD Plan', null, { outline_position: 1 }),
  T('e', 'Provision of DRC Environments', 'p', { outline_position: 1 }),
  T('m', 'Master', 'e', { outline_position: 1, estimated_duration_days: 5, percentage_complete: 100, planned_start_date: '2022-08-08', planned_end_date: '2022-08-12', assigned_to_user_id: 'u1' }),
  T('d', 'Dev', 'e', { outline_position: 2, estimated_duration_days: 5, percentage_complete: 0, planned_start_date: '2022-08-15', planned_end_date: '2022-08-19', schedule_mode: 'manual' }),
]
const DEPS = [{ id: 'x', predecessor_task_id: 'm', successor_task_id: 'd', dependency_type: 'finish_to_start', lag_days: 0 }]

// The table only (the Gantt bars are buttons named after their tasks too).
const table = () => within(screen.getByRole('table'))
// The task-name button carries the name as its title (row action buttons do not).
const rowOf = (name) => table().getAllByRole('button', { name: new RegExp(name) }).find((b) => b.title && new RegExp(name).test(b.textContent)).closest('tr')

describe('PlanSheet', () => {
  beforeEach(() => localStorage.clear())

  it('shows tasks in outline order with numbers, indent and summary roll-ups', () => {
    render(<PlanSheet tasks={TASKS} dependencies={DEPS} team={[{ id: 'u1', name: 'O. Mbira' }]} projectKey="p1" />)
    const names = screen.getAllByRole('row').slice(1).map((r) => within(r).getAllByRole('cell')[3].textContent)
    expect(names).toEqual(['1TZ&BD Plan', '1.1Provision of DRC Environments', '1.1.1Master', '1.1.2Dev'])
    const env = rowOf('^1\\.1Provision')
    expect(within(env).getByText('10 days')).toBeInTheDocument() // 08 Aug → 19 Aug, working days
    expect(within(env).getByText('50%')).toBeInTheDocument() // duration-weighted
    expect(within(rowOf('Dev')).getByText('3')).toBeInTheDocument() // predecessor by ID
    expect(within(rowOf('Master')).getByText('O. Mbira')).toBeInTheDocument()
    expect(within(rowOf('Master')).getByLabelText('Done')).toBeInTheDocument()
    expect(within(rowOf('Dev')).getByLabelText('Manually scheduled')).toBeInTheDocument()
  })

  it('hides outline numbers and remembers the choice', () => {
    const { unmount } = render(<PlanSheet tasks={TASKS} projectKey="p1" />)
    fireEvent.click(screen.getByLabelText('Outline number'))
    expect(screen.queryByText('1.1.1')).toBeNull()
    unmount()
    render(<PlanSheet tasks={TASKS} projectKey="p1" />)
    expect(screen.getByLabelText('Outline number')).not.toBeChecked()
  })

  it('collapses and expands a summary', () => {
    render(<PlanSheet tasks={TASKS} projectKey="p1" />)
    fireEvent.click(screen.getByRole('button', { name: 'Collapse Provision of DRC Environments' }))
    expect(table().queryByRole('button', { name: /Master/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Expand all' }))
    expect(table().getByRole('button', { name: /Master/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Collapse all' }))
    expect(screen.getAllByRole('row')).toHaveLength(2) // header + top summary
  })

  it('shows a project summary row when asked', () => {
    render(<PlanSheet tasks={TASKS} projectName="Velocity Freight" projectKey="p1" />)
    fireEvent.click(screen.getByLabelText('Project summary'))
    const first = screen.getAllByRole('row')[1]
    expect(within(first).getByText('Velocity Freight')).toBeInTheDocument()
    expect(within(first).getAllByRole('cell')[0].textContent).toBe('0')
  })

  it('opens a task from its name', () => {
    const onOpen = vi.fn()
    render(<PlanSheet tasks={TASKS} projectKey="p1" onOpen={onOpen} />)
    fireEvent.click(table().getByRole('button', { name: /Master/ }))
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'm' }))
  })

  it('lays out bars in the given row order, keeping slots for undated rows', () => {
    const { rows } = layoutGantt([{ id: 'a', task_name: 'A' }, { id: 'b', task_name: 'B', planned_start_date: '2026-01-05', planned_end_date: '2026-01-06' }], 'day', false, true)
    expect(rows.map((r) => [r.task.id, r.index, r.left === null])).toEqual([['a', 0, true], ['b', 1, false]])
  })

  it('says when there are no tasks', () => {
    render(<PlanSheet tasks={[]} projectKey="p1" />)
    expect(screen.getByText(/No tasks yet/)).toBeInTheDocument()
  })
})

describe('PlanSheet progress columns (v1265 S2)', () => {
  beforeEach(() => localStorage.clear())
  const withBaseline = [
    T('s', 'Stage', null, { outline_position: 1 }),
    T('a', 'Build', 's', { outline_position: 1, estimated_duration_days: 10, percentage_complete: 40, planned_start_date: '2026-01-05', planned_end_date: '2026-01-16', baseline_start_date: '2026-01-05', baseline_end_date: '2026-01-16' }),
  ]
  const cells = (name) => within(rowOf(name)).getAllByRole('cell').map((c) => c.textContent)

  it('shows Planned % / Actual % / % Deviation against the status date', () => {
    render(<PlanSheet tasks={withBaseline} projectKey="p2" statusDate="2026-01-09" />)
    const header = screen.getAllByRole('columnheader').map((h) => h.textContent)
    const at = (label) => header.indexOf(label)
    const build = cells('Build')
    expect([build[at('Planned %')], build[at('Actual %')], build[at('% Deviation')]]).toEqual(['50%', '40%', '-10'])
    expect(within(rowOf('Build')).getByText('-10').className).toMatch(/text-red/)
    expect(cells('^1Stage')[at('Planned %')]).toBe('50%')
  })

  it('prompts to save a baseline when there is none', () => {
    render(<PlanSheet tasks={TASKS} projectKey="p2" />)
    expect(screen.getByText(/Save a baseline on the Baselines tab/)).toBeInTheDocument()
  })

  it('offers a second baseline to compare when there is more than one', () => {
    const baselines = [
      { id: 'b1', baseline_number: 1, baseline_name: 'Re-plan', is_active_baseline: true },
      { id: 'b0', baseline_number: 0, baseline_name: 'Original', is_active_baseline: false, baseline_data: { tasks: [{ id: 'a', start: '2026-01-05', finish: '2026-01-09' }] } },
    ]
    render(<PlanSheet tasks={withBaseline} projectKey="p2" baselines={baselines} />)
    fireEvent.change(screen.getByLabelText(/Compare with/), { target: { value: 'b0' } })
    expect(screen.getByTitle('Compared baseline')).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /Re-plan/ })).toBeNull() // the active one is not offered
  })
})

describe('PlanSheet columns and sub-tasks (v1265)', () => {
  beforeEach(() => localStorage.clear())
  const headers = () => screen.getAllByRole('columnheader').map((h) => h.textContent).filter(Boolean)

  it('drags a column heading to a new place and remembers it', () => {
    const { unmount } = render(<PlanSheet tasks={TASKS} projectKey="p3" />)
    const finish = screen.getByRole('columnheader', { name: /^Finish/ })
    const duration = screen.getByRole('columnheader', { name: /^Duration/ })
    const dt = { setData: vi.fn(), effectAllowed: '' }
    fireEvent.dragStart(finish, { dataTransfer: dt })
    fireEvent.dragOver(duration, { dataTransfer: dt })
    fireEvent.drop(duration, { dataTransfer: dt })
    expect(headers().indexOf('Finish')).toBeLessThan(headers().indexOf('Duration'))
    unmount()
    render(<PlanSheet tasks={TASKS} projectKey="p3" />)
    expect(headers().indexOf('Finish')).toBeLessThan(headers().indexOf('Duration'))
  })

  it('Columns panel shows / hides columns and moves them with the arrows', () => {
    render(<PlanSheet tasks={TASKS} projectKey="p3" />)
    fireEvent.click(screen.getByRole('button', { name: /Columns/ }))
    const panel = within(screen.getByRole('region', { name: 'Choose columns' }))
    fireEvent.click(panel.getByLabelText('WBS code'))
    expect(headers()).toContain('WBS code')
    fireEvent.click(panel.getByLabelText('Successors'))
    expect(headers()).not.toContain('Successors')
    expect(panel.getByLabelText('Task name')).toBeDisabled()
    fireEvent.click(panel.getByRole('button', { name: 'Move Mode left' }))
    expect(headers().indexOf('Mode')).toBeLessThan(headers().findIndex((h) => h.startsWith('Info')))
    fireEvent.click(panel.getByRole('button', { name: 'Reset to default' }))
    expect(headers()).toContain('Successors')
  })

  it('every task row has an add-sub-task button', () => {
    const onAddSubtask = vi.fn()
    render(<PlanSheet tasks={TASKS} projectKey="p3" onAddSubtask={onAddSubtask} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add a sub-task under Master' }))
    expect(onAddSubtask).toHaveBeenCalledWith(expect.objectContaining({ id: 'm' }))
    expect(screen.getAllByRole('button', { name: /^Add a sub-task under/ })).toHaveLength(4)
  })
})

describe('PlanSheet resizing and row actions (v1265)', () => {
  beforeEach(() => localStorage.clear())
  const widthOf = (name) => Number(screen.getByRole('separator', { name: `Resize ${name} column` }).getAttribute('aria-valuenow'))

  it('resizes a column by dragging its edge and remembers the width', () => {
    const { unmount } = render(<PlanSheet tasks={TASKS} projectKey="p4" />)
    const edge = screen.getByRole('separator', { name: 'Resize Task name column' })
    expect(widthOf('Task name')).toBe(300)
    fireEvent.pointerDown(edge, { clientX: 500 })
    fireEvent.pointerMove(window, { clientX: 580 })
    fireEvent.pointerUp(window, { clientX: 580 })
    expect(widthOf('Task name')).toBe(380)
    unmount()
    render(<PlanSheet tasks={TASKS} projectKey="p4" />)
    expect(widthOf('Task name')).toBe(380)
  })

  it('resizes with the keyboard and never below the minimum', () => {
    render(<PlanSheet tasks={TASKS} projectKey="p4" />)
    const edge = screen.getByRole('separator', { name: 'Resize ID column' })
    fireEvent.keyDown(edge, { key: 'ArrowRight' })
    expect(widthOf('ID')).toBe(58)
    fireEvent.keyDown(edge, { key: 'ArrowLeft', shiftKey: true })
    expect(widthOf('ID')).toBe(40)
  })

  it('each row has View, Edit, Add sub-task and Delete', () => {
    const calls = { onView: vi.fn(), onEdit: vi.fn(), onAddSubtask: vi.fn(), onDelete: vi.fn() }
    render(<PlanSheet tasks={TASKS} projectKey="p4" {...calls} />)
    const row = rowOf('Master')
    fireEvent.click(within(row).getByRole('button', { name: 'View Master' }))
    fireEvent.click(within(row).getByRole('button', { name: 'Edit Master' }))
    fireEvent.click(within(row).getByRole('button', { name: 'Add a sub-task under Master' }))
    fireEvent.click(within(row).getByRole('button', { name: 'Delete Master' }))
    for (const fn of Object.values(calls)) expect(fn).toHaveBeenCalledWith(expect.objectContaining({ id: 'm' }))
  })
})

describe('PlanSheet double-click (v1265)', () => {
  beforeEach(() => localStorage.clear())

  it('double-clicking a row opens the task for editing (not viewing)', async () => {
    const onOpen = vi.fn()
    const onEdit = vi.fn()
    render(<PlanSheet tasks={TASKS} projectKey="p5" onOpen={onOpen} onEdit={onEdit} />)
    const name = table().getAllByRole('button', { name: /Master/ }).find((b) => b.title === 'Master')
    fireEvent.click(name)
    fireEvent.click(name)
    fireEvent.doubleClick(name)
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'm' }))
    await new Promise((r) => setTimeout(r, 300))
    expect(onOpen).not.toHaveBeenCalled()
  })

  it('a single click on the name still views the task', async () => {
    const onOpen = vi.fn()
    render(<PlanSheet tasks={TASKS} projectKey="p5" onOpen={onOpen} onEdit={vi.fn()} />)
    fireEvent.click(table().getAllByRole('button', { name: /Master/ }).find((b) => b.title === 'Master'))
    await new Promise((r) => setTimeout(r, 300))
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'm' }))
  })

  it('double-clicking the action buttons does not also open the editor', () => {
    const onEdit = vi.fn()
    render(<PlanSheet tasks={TASKS} projectKey="p5" onEdit={onEdit} onDelete={vi.fn()} />)
    fireEvent.doubleClick(within(rowOf('Master')).getByRole('button', { name: 'Delete Master' }))
    expect(onEdit).not.toHaveBeenCalled()
  })
})

describe('PlanSheet Gantt export (v1265)', () => {
  beforeEach(() => localStorage.clear())

  it('View previews the task names and bars; Export lists the formats', () => {
    render(<PlanSheet tasks={TASKS} projectName="Velocity Freight" projectKey="p6" />)
    fireEvent.click(screen.getByRole('button', { name: /^View$/ }))
    const dialog = within(screen.getByRole('dialog', { name: 'Gantt chart preview' }))
    expect(dialog.getByRole('heading', { name: 'Velocity Freight' })).toBeInTheDocument()
    const names = screen.getByTestId('gantt-preview-names')
    expect(names.className).toMatch(/sticky/) // frozen while the timeline scrolls
    expect(names.innerHTML).toContain('Master')
    expect(screen.getByTestId('gantt-preview-timeline').innerHTML).toContain('<svg')
    fireEvent.click(screen.getByRole('button', { name: 'Close preview' }))
    fireEvent.click(screen.getByRole('button', { name: /Export/ }))
    const menu = within(screen.getByRole('menu', { name: 'Export Gantt chart' }))
    expect(menu.getAllByRole('menuitem').map((b) => b.textContent.trim())).toEqual(['PDF', 'PNG image', 'PowerPoint', 'SVG (editable drawing)', 'Print'])
  })

  it('"Only expanded rows" leaves collapsed sub-tasks out of the export', () => {
    render(<PlanSheet tasks={TASKS} projectKey="p6" />)
    fireEvent.click(table().getByRole('button', { name: 'Collapse Provision of DRC Environments' }))
    fireEvent.click(screen.getByRole('button', { name: /^View$/ }))
    expect(screen.getByTestId('gantt-preview').innerHTML).not.toContain('Master')
  })
})

describe('PlanSheet frozen columns (v1265)', () => {
  beforeEach(() => localStorage.clear())
  const head = (name) => screen.getByRole('columnheader', { name: new RegExp(`^${name}`) })

  it('freezes the chosen column and every column to its left, and remembers it', () => {
    const { unmount } = render(<PlanSheet tasks={TASKS} projectKey="p7" />)
    fireEvent.change(screen.getByLabelText(/Freeze up to/), { target: { value: 'name' } })
    expect(head('ID').className).toMatch(/sm:sticky/)
    expect(head('ID').style.left).toBe('0px')
    expect(head('Mode').style.left).toBe(`${48 + 56}px`) // after ID (48) and Info (56)
    expect(head('Task name').className).toMatch(/sm:sticky/)
    expect(head('Duration').className).not.toMatch(/sm:sticky/)
    expect(within(rowOf('Master')).getAllByRole('cell')[3].className).toMatch(/sm:sticky/)
    unmount()
    render(<PlanSheet tasks={TASKS} projectKey="p7" />)
    expect(screen.getByLabelText(/Freeze up to/)).toHaveValue('name')
  })

  it('keeps the frozen column when columns are moved, and clears it on Reset', () => {
    render(<PlanSheet tasks={TASKS} projectKey="p7" />)
    fireEvent.change(screen.getByLabelText(/Freeze up to/), { target: { value: 'name' } })
    fireEvent.click(screen.getByRole('button', { name: /Columns/ }))
    const panel = within(screen.getByRole('region', { name: 'Choose columns' }))
    fireEvent.click(panel.getByRole('button', { name: 'Move Mode left' }))
    expect(screen.getByLabelText(/Freeze up to/)).toHaveValue('name')
    fireEvent.click(panel.getByRole('button', { name: 'Reset to default' }))
    expect(screen.getByLabelText(/Freeze up to/)).toHaveValue('')
    expect(head('ID').className).not.toMatch(/sm:sticky/)
  })
})

describe('Gantt preview pop-out (v1265)', () => {
  beforeEach(() => localStorage.clear())

  it('goes full screen and opens in a new window with the names frozen', () => {
    const doc = { write: vi.fn(), close: vi.fn() }
    const open = vi.spyOn(window, 'open').mockReturnValue({ document: doc })
    render(<PlanSheet tasks={TASKS} projectName="Velocity Freight" projectKey="p8" />)
    fireEvent.click(screen.getByRole('button', { name: /^View$/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Full screen' }))
    expect(screen.getByTestId('gantt-preview').className).toMatch(/flex-1/)
    expect(screen.getByRole('button', { name: 'Exit full screen' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Open in a new window' }))
    return waitFor(() => {
      expect(open).toHaveBeenCalled()
      const html = doc.write.mock.calls[0][0]
      expect(html).toContain('<h1>Velocity Freight</h1>')
      expect(html).toContain('class="names"')
      expect(html).toContain('position:sticky')
      open.mockRestore()
    })
  })

  it('says so when the browser blocks the new window', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    render(<PlanSheet tasks={TASKS} projectKey="p8" />)
    fireEvent.click(screen.getByRole('button', { name: /^View$/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Open in a new window' }))
    expect((await screen.findAllByText(/Allow pop-ups/))[0]).toBeInTheDocument()
    open.mockRestore()
  })
})
