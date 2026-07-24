import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ProgrammeManagerAssignments from '../ProgrammeManagerAssignments'

vi.mock('../../../components/pm/ManagerAssignmentsWorkbench', () => ({
  default: ({ title }) => <div data-testid="workbench">{title}</div>,
}))

vi.mock('../../../services/managerAssignmentService', () => ({
  getCurrentPlatformUserId: vi.fn(),
  listProjectsForProgrammeManager: vi.fn(),
  assignProjectManager: vi.fn(),
  removeProjectManager: vi.fn(),
}))

describe('ProgrammeManagerAssignments', () => {
  it('renders programme-scoped workbench', () => {
    render(
      <MemoryRouter>
        <ProgrammeManagerAssignments />
      </MemoryRouter>
    )
    expect(screen.getByTestId('workbench')).toHaveTextContent('Assign Project Managers')
  })
})
