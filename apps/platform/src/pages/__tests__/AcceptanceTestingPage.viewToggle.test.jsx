import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AcceptanceTestingPage from '../AcceptanceTestingPage'

vi.mock('@nidus/shared/hooks/usePlatformProjectId.js', () => ({
  usePlatformProjectId: () => ({ projectId: 'proj-1', routeKey: 'proj-1' }),
}))

vi.mock('../../services/projectProductDescriptionService', () => ({
  getOrCreatePPD: vi.fn(),
  getPPDByProject: vi.fn(),
}))

vi.mock('../../services/ppdAcceptanceCriteriaService', () => ({
  getCriteria: vi.fn(),
  recordAcceptance: vi.fn(),
  getAcceptanceStatus: vi.fn(),
}))

vi.mock('@nidus/shared/utils/ppdExport', () => ({ exportAcceptanceReportToCSV: vi.fn() }))

import { getOrCreatePPD } from '../../services/projectProductDescriptionService'
import { getCriteria, getAcceptanceStatus } from '../../services/ppdAcceptanceCriteriaService'

const criteria = [
  {
    id: 'c-2',
    criteria_reference: 'AC-002',
    criteria_title: 'Route accuracy',
    criteria_description: 'Suggested routes are within 2% of the known-best distance.',
    priority: 'must_have',
    acceptance_status: 'pending',
    is_measurable: true,
  },
  {
    id: 'c-1',
    criteria_reference: 'AC-001',
    criteria_title: 'Route suggestion response time',
    criteria_description: 'The engine returns a suggested route within 2 seconds.',
    priority: 'must_have',
    acceptance_status: 'passed',
    is_measurable: true,
  },
  {
    id: 'c-3',
    criteria_reference: 'AC-003',
    criteria_title: 'Driver app sync',
    criteria_description: 'Routes sync to the driver app within one minute.',
    priority: 'should_have',
    acceptance_status: 'pending',
    is_measurable: false,
  },
]

function renderPage() {
  return render(
    <MemoryRouter>
      <AcceptanceTestingPage />
    </MemoryRouter>,
  )
}

describe('AcceptanceTestingPage — Card / Table-List view toggle', () => {
  beforeEach(() => {
    localStorage.clear()
    getOrCreatePPD.mockResolvedValue({ id: 'ppd-1' })
    getCriteria.mockResolvedValue(criteria)
    getAcceptanceStatus.mockResolvedValue(null)
  })

  it('defaults to the table list view', async () => {
    renderPage()
    expect(await screen.findByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Table list view' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('lists criteria alphabetically by title by default', async () => {
    renderPage()
    const table = await screen.findByRole('table')
    const titles = within(table).getAllByRole('row').slice(1).map((row) => row.textContent)
    expect(titles[0]).toContain('Driver app sync')
    expect(titles[1]).toContain('Route accuracy')
    expect(titles[2]).toContain('Route suggestion response time')
  })

  it('switches to card view and back to table view with the toggle', async () => {
    renderPage()
    await screen.findByRole('table')

    fireEvent.click(screen.getByRole('button', { name: 'Card grid view' }))
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.getByText('Route accuracy')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Table list view' }))
    expect(await screen.findByRole('table')).toBeInTheDocument()
  })

  it('filters both views with the search box', async () => {
    renderPage()
    await screen.findByRole('table')

    fireEvent.change(screen.getByPlaceholderText('Search criteria...'), { target: { value: 'accuracy' } })
    expect(screen.queryByText('Driver app sync')).toBeNull()
    expect(screen.queryByText('Route suggestion response time')).toBeNull()
    expect(screen.getByText('Route accuracy')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Card grid view' }))
    expect(screen.queryByText('Driver app sync')).toBeNull()
    expect(screen.getByText('Route accuracy')).toBeInTheDocument()
  })
})
