import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CurrentProjectProvider } from '../../../context/CurrentProjectContext'
import PMProjectSelector from '../PMProjectSelector'

vi.mock('@nidus/shared/utils/authSession', () => ({
  getAuthenticatedUser: vi.fn(async () => ({ user: { id: 'auth-1' }, error: null })),
}))

vi.mock('../../../services/roleService', () => ({
  getUserProjectRoles: vi.fn(async () => ({
    success: true,
    data: [
      {
        project_id: 'p-seed',
        projects: { project_name: 'Velocity Freight', project_code: 'SEED334-PRJ-08' },
        project_roles: { role_display_name: 'Project Manager', role_name: 'project_manager' },
      },
      {
        project_id: 'p-standalone',
        projects: { project_name: 'Personal Consulting Pilot', project_code: 'PM-STANDALONE-01' },
        project_roles: { role_display_name: 'Project Manager', role_name: 'project_manager' },
      },
    ],
  })),
}))

function renderHeader(url) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <CurrentProjectProvider>
        <PMProjectSelector compact />
      </CurrentProjectProvider>
    </MemoryRouter>,
  )
}

describe('PMProjectSelector — shows the dropdown after a page refresh', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
  })

  it('shows the project dropdown on a fresh load of a project page', async () => {
    renderHeader('/platform/budget?projectId=SEED334-PRJ-08')

    expect(await screen.findByRole('combobox')).toBeInTheDocument()
  })

  it('keeps the dropdown after a refresh that follows a project switch', async () => {
    const first = renderHeader('/platform/budget?projectId=SEED334-PRJ-08')
    await screen.findByRole('combobox')
    fireEvent.focus(screen.getByRole('combobox'))
    fireEvent.mouseDown(screen.getByRole('option', { name: /PM-STANDALONE-01/ }))
    first.unmount()

    renderHeader('/platform/budget?projectId=PM-STANDALONE-01')
    expect(await screen.findByRole('combobox')).toBeInTheDocument()
  })

  it('still shows the dropdown when the project list is already cached in this session', async () => {
    renderHeader('/platform/budget?projectId=SEED334-PRJ-08')
    await screen.findByRole('combobox')

    renderHeader('/platform/budget?projectId=SEED334-PRJ-08')
    expect((await screen.findAllByRole('combobox')).length).toBeGreaterThan(0)
  })
})
