import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import CostActualForm from '../CostActualForm'
import { createCostActual } from '../../../services/costActualsService'
import { getByProjectId } from '../../../services/projectBudgetCategoryService'

vi.mock('@nidus/shared/hooks/usePlatformProjectId.js', () => ({
  usePlatformProjectId: () => ({ projectId: 'p-standalone', routeKey: 'PM-STANDALONE-01' }),
}))

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

vi.mock('../../../services/projectBudgetCategoryService', () => ({
  getByProjectId: vi.fn(),
}))

function renderForm(path = '/platform/cost-actuals/create?projectId=PM-STANDALONE-01') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/platform/cost-actuals/create" element={<CostActualForm />} />
        <Route path="/platform/cost-actuals/:id/edit" element={<CostActualForm />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('CostActualForm — category is chosen from the project budget lines', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getByProjectId.mockResolvedValue({
      success: true,
      data: [
        { category_name: 'Consulting time', budget_amount: 60000 },
        { category_name: 'Travel', budget_amount: 8000 },
      ],
    })
  })

  it('offers the budget lines of the project as the category options', async () => {
    renderForm()

    const category = await screen.findByLabelText('Category')
    expect(category.tagName).toBe('SELECT')
    await waitFor(() => expect(getByProjectId).toHaveBeenCalledWith('p-standalone'))
    expect(screen.getByRole('option', { name: 'Consulting time' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Travel' })).toBeInTheDocument()
  })

  it('saves the chosen budget line as the category', async () => {
    renderForm()

    fireEvent.change(await screen.findByLabelText('Category'), { target: { value: 'Travel' } })
    fireEvent.change(screen.getByLabelText('Amount *'), { target: { value: '450' } })
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => expect(createCostActual).toHaveBeenCalled())
    expect(createCostActual.mock.calls[0][0]).toEqual(expect.objectContaining({ category: 'Travel' }))
  })
})
