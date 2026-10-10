import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { UnsavedChangesProvider } from '@nidus/shared/context/UnsavedChangesContext'
import DecisionLogForm from '../DecisionLogForm'
import DecisionLogDetail from '../DecisionLogDetail'

const { getDecision } = vi.hoisted(() => ({
  getDecision: vi.fn(),
}))

vi.mock('../../../services/decisionLogService', () => ({
  getDecision,
  createDecision: vi.fn(),
  updateDecision: vi.fn(),
  deleteDecision: vi.fn(),
}))

function renderForm() {
  return render(
    <MemoryRouter initialEntries={['/platform/governance/decisions/new?projectId=project-1']}>
      <UnsavedChangesProvider>
        <Routes>
          <Route path="/platform/governance/decisions/new" element={<DecisionLogForm />} />
        </Routes>
      </UnsavedChangesProvider>
    </MemoryRouter>
  )
}

describe('Decision record list fields', () => {
  it('keeps rationale, impact, and alternatives on their own multi-value tabs', () => {
    renderForm()

    expect(screen.getByRole('tab', { name: 'Rationale' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Impact' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Alternatives Considered' })).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Rationale' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'Rationale' }))
    expect(screen.getByRole('columnheader', { name: 'Rationale' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('New rationale'), { target: { value: 'Keeps the cutover window short' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    fireEvent.change(screen.getByLabelText('New rationale'), { target: { value: 'Avoids a weekday outage' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(screen.getByText('Keeps the cutover window short')).toBeInTheDocument()
    expect(screen.getByText('Avoids a weekday outage')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'Impact' }))
    expect(screen.getByRole('columnheader', { name: 'Impact' })).toBeInTheDocument()
    expect(screen.queryByText('Keeps the cutover window short')).not.toBeInTheDocument()
  })

  it('shows the same lists as read-only rows on the decision view', async () => {
    getDecision.mockResolvedValue({
      id: 'd1',
      decision_reference: 'DEC-2026-0004',
      decision_title: 'Approve weekend cutover',
      status: 'proposed',
      priority: 'high',
      category: 'technical',
      rationale: 'Keeps the cutover window short\nAvoids a weekday outage',
      impact: 'Weekend support cover is required',
      alternatives_considered: 'Weekday window\nPhased cutover',
    })

    render(
      <MemoryRouter initialEntries={['/platform/governance/decisions/d1']}>
        <Routes>
          <Route path="/platform/governance/decisions/:id" element={<DecisionLogDetail />} />
        </Routes>
      </MemoryRouter>
    )

    expect(await screen.findByText('Approve weekend cutover')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Rationale' }))
    expect(await screen.findByText('Keeps the cutover window short')).toBeInTheDocument()
    expect(screen.getByText('Avoids a weekday outage')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Delete rationale/ })).not.toBeInTheDocument()
  })
})
