import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { taskPagePath, useLegacyTaskLinkRedirect } from '../useTaskPage.js'

const link = (sub) => `/platform/pm/schedule/${sub}?projectId=PRJ-1`

describe('taskPagePath', () => {
  it('opens a task to view or edit by its code', () => {
    expect(taskPagePath(link, { task_code: 'TSK-0025', id: 'u1' })).toBe('/platform/pm/schedule/tasks/TSK-0025?projectId=PRJ-1')
    expect(taskPagePath(link, 'TSK-0025', 'edit')).toBe('/platform/pm/schedule/tasks/TSK-0025/edit?projectId=PRJ-1')
  })

  it('falls back to the id when a task has no code', () => {
    expect(taskPagePath(link, { id: 'u1' })).toBe('/platform/pm/schedule/tasks/u1?projectId=PRJ-1')
  })

  it('creates a new task or a sub-task under a parent', () => {
    expect(taskPagePath(link, null)).toBe('/platform/pm/schedule/tasks/new?projectId=PRJ-1')
    expect(taskPagePath(link, null, 'view', { task_code: 'TSK-0034' }))
      .toBe('/platform/pm/schedule/tasks/new?projectId=PRJ-1&parent=TSK-0034')
  })
})

function Where() {
  const { pathname, search } = useLocation()
  return <p data-testid="where">{pathname + search}</p>
}

function ScheduleView() {
  useLegacyTaskLinkRedirect()
  return <Where />
}

const renderAt = (url) => render(
  <MemoryRouter initialEntries={[url]}>
    <Routes>
      <Route path="/platform/pm/schedule/critical-path" element={<ScheduleView />} />
      <Route path="/platform/pm/schedule/tasks/*" element={<Where />} />
    </Routes>
  </MemoryRouter>,
)

describe('useLegacyTaskLinkRedirect', () => {
  it('sends an old modal link to the task edit page', () => {
    renderAt('/platform/pm/schedule/critical-path?projectId=PRJ-1&task=TSK-0025&taskMode=edit')
    expect(screen.getByTestId('where').textContent).toBe('/platform/pm/schedule/tasks/TSK-0025/edit?projectId=PRJ-1')
  })

  it('sends an old new-sub-task link to the new task page', () => {
    renderAt('/platform/pm/schedule/critical-path?projectId=PRJ-1&task=new&parent=TSK-0034')
    expect(screen.getByTestId('where').textContent).toBe('/platform/pm/schedule/tasks/new?projectId=PRJ-1&parent=TSK-0034')
  })

  it('leaves the view alone when there is no task in the address', () => {
    renderAt('/platform/pm/schedule/critical-path?projectId=PRJ-1')
    expect(screen.getByTestId('where').textContent).toBe('/platform/pm/schedule/critical-path?projectId=PRJ-1')
  })
})
