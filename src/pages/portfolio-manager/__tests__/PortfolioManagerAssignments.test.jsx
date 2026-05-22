import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PortfolioManagerAssignments from '../PortfolioManagerAssignments'

vi.mock('../../../components/pm/ManagerAssignmentsWorkbench', () => ({
  default: ({ title }) => <div data-testid="workbench">{title}</div>,
}))

vi.mock('../../../services/managerAssignmentService', () => ({
  getCurrentPlatformUserId: vi.fn(),
  listProgrammesForPortfolioManager: vi.fn(),
  listProjectsForPortfolioManager: vi.fn(),
  assignProgrammeManager: vi.fn(),
  assignProjectManager: vi.fn(),
  removeProgrammeManager: vi.fn(),
  removeProjectManager: vi.fn(),
}))

describe('PortfolioManagerAssignments', () => {
  it('renders scoped assignment workbench', () => {
    render(
      <MemoryRouter>
        <PortfolioManagerAssignments />
      </MemoryRouter>
    )
    expect(screen.getByTestId('workbench')).toHaveTextContent('People & Assignments')
  })
})
