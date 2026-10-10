import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import CostActualForm from '../CostActualForm'
import { createCostActual, getCostActual } from '../../../services/costActualsService'

vi.mock('@nidus/shared/hooks/useSuccessModal', () => ({
  useSuccessModal: () => ({ showSuccess: vi.fn(), modal: null }),
}))

vi.mock('@nidus/shared/context/UnsavedChangesContext', () => ({
  useUnsavedChangesGuard: () => ({ confirmDiscard: vi.fn(), requestNavigation: vi.fn() }),
}))

vi.mock('../../../services/costActualsService', () => ({
  getCostActual: vi.fn(async () => null),
  createCostActual: vi.fn(async () => ({ success: true })),
  updateCostActual: vi.fn(async () => ({ success: true })),
}))

function renderForm(path = '/simulator/practice-projects/pp-1/cost-actuals/create') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/simulator/practice-projects/:projectId/cost-actuals/create" element={<CostActualForm />} />
        <Route path="/simulator/practice-projects/:projectId/cost-actuals/:costActualId/edit" element={<CostActualForm />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('CostActualForm (Simulator) — Notes field', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('saves the captured notes alongside the other fields', async () => {
    renderForm()

    fireEvent.change(await screen.findByLabelText('Amount *'), { target: { value: '450' } })
    fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'Approved verbally by PM on-site' } })
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => expect(createCostActual).toHaveBeenCalled())
    expect(createCostActual.mock.calls[0][0]).toEqual(
      expect.objectContaining({ notes: 'Approved verbally by PM on-site' }),
    )
  })

  it('loads existing notes when editing', async () => {
    getCostActual.mockResolvedValue({
      success: true,
      data: { transaction_type: 'actual', amount: 450, transaction_date: '2026-10-10', category: '', description: '', notes: 'Pre-existing note' },
    })

    renderForm('/simulator/practice-projects/pp-1/cost-actuals/c-1/edit')

    expect(await screen.findByLabelText('Notes')).toHaveValue('Pre-existing note')
  })
})
