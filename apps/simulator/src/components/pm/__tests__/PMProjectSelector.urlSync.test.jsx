import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import PMProjectSelector from '../PMProjectSelector'

const ctx = vi.hoisted(() => ({
  setCurrentProject: vi.fn(),
  projects: [],
  currentProjectId: null,
}))

vi.mock('../../../lib/CurrentProjectContext', () => ({
  useCurrentProject: () => ({
    projects: ctx.projects,
    currentProjectId: ctx.currentProjectId,
    setCurrentProject: ctx.setCurrentProject,
    loading: false,
  }),
}))

function LocationProbe() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname + location.search}</div>
}

function renderAt(url) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <PMProjectSelector />
      <Routes>
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PMProjectSelector — keeps the URL on the chosen project', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ctx.projects = [
      { projectId: 'p-seed', projectCode: 'SEED334-PRJ-08', projectName: 'Velocity Freight', roleDisplayName: 'Project Manager' },
      { projectId: 'p-standalone', projectCode: 'PM-STANDALONE-01', projectName: 'Personal Consulting Pilot', roleDisplayName: 'Project Manager' },
    ]
    ctx.currentProjectId = 'p-seed'
  })

  it('rewrites a ?projectId= query to the newly selected project code', async () => {
    renderAt('/platform/budget?projectId=SEED334-PRJ-08')

    fireEvent.focus(screen.getByRole('combobox'))
    fireEvent.mouseDown(screen.getByRole('option', { name: /PM-STANDALONE-01/ }))

    expect(ctx.setCurrentProject).toHaveBeenCalledWith('p-standalone')
    expect(screen.getByTestId('location')).toHaveTextContent('/platform/budget?projectId=PM-STANDALONE-01')
  })

  it('moves a project-scoped page in the path to the new project', async () => {
    renderAt('/platform/projects/SEED334-PRJ-08/budget?projectId=SEED334-PRJ-08')

    fireEvent.focus(screen.getByRole('combobox'))
    fireEvent.mouseDown(screen.getByRole('option', { name: /PM-STANDALONE-01/ }))

    expect(screen.getByTestId('location')).toHaveTextContent('/platform/projects/PM-STANDALONE-01/budget?projectId=PM-STANDALONE-01')
  })

  it('sends a record page to the new project home, because the record belongs to the old project', async () => {
    renderAt('/platform/projects/SEED334-PRJ-08/lessons/reports/PLR-26SHRJ26C?projectId=SEED334-PRJ-08')

    fireEvent.focus(screen.getByRole('combobox'))
    fireEvent.mouseDown(screen.getByRole('option', { name: /PM-STANDALONE-01/ }))

    expect(screen.getByTestId('location')).toHaveTextContent('/platform/projects/PM-STANDALONE-01?projectId=PM-STANDALONE-01')
  })

  it('follows the URL when the saved selection differs from the project on the page', async () => {
    ctx.currentProjectId = 'p-standalone'
    renderAt('/platform/budget?projectId=SEED334-PRJ-08')

    expect(ctx.setCurrentProject).toHaveBeenCalledWith('p-seed')
  })

  it('does not reset the selection when the URL already matches it', async () => {
    ctx.currentProjectId = 'p-seed'
    renderAt('/platform/budget?projectId=SEED334-PRJ-08')

    expect(ctx.setCurrentProject).not.toHaveBeenCalled()
  })

  it('leaves the URL alone when there is no projectId query', async () => {
    renderAt('/platform/budget')

    fireEvent.focus(screen.getByRole('combobox'))
    fireEvent.mouseDown(screen.getByRole('option', { name: /PM-STANDALONE-01/ }))

    expect(ctx.setCurrentProject).toHaveBeenCalledWith('p-standalone')
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/platform\/budget$/)
  })
})
