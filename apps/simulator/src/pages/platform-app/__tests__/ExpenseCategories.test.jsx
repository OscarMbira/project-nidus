import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ExpenseCategories from '../ExpenseCategories'
import {
  getSimExpenseCategories,
  createSimExpenseCategory,
  updateSimExpenseCategory,
  deleteSimExpenseCategory,
} from '../../../services/simExpenseCategoryService'

vi.mock('../../../services/simExpenseCategoryService', () => ({
  getSimExpenseCategories: vi.fn(),
  createSimExpenseCategory: vi.fn(),
  updateSimExpenseCategory: vi.fn(),
  deleteSimExpenseCategory: vi.fn(),
}))

const categories = [
  { id: 'c1', category_code: 'travel', category_name: 'Travel', category_description: 'Flights etc', is_active: true },
  { id: 'c2', category_code: 'meals', category_name: 'Meals', category_description: '', is_active: true },
]

function renderPage() {
  return render(
    <MemoryRouter>
      <ExpenseCategories />
    </MemoryRouter>,
  )
}

describe('ExpenseCategories admin page (Simulator)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getSimExpenseCategories.mockResolvedValue({ success: true, data: categories })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('lists existing categories', async () => {
    renderPage()
    expect(await screen.findByText('Travel')).toBeInTheDocument()
    expect(screen.getByText('Meals')).toBeInTheDocument()
  })

  it('creates a new category', async () => {
    createSimExpenseCategory.mockResolvedValue({ success: true, data: { id: 'c3', category_name: 'Parking' } })
    renderPage()
    await screen.findByText('Travel')

    fireEvent.click(screen.getByRole('button', { name: /add category/i }))
    fireEvent.change(screen.getByLabelText(/category code/i), { target: { value: 'parking' } })
    fireEvent.change(screen.getByLabelText(/category name/i), { target: { value: 'Parking' } })
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }))

    await waitFor(() => expect(createSimExpenseCategory).toHaveBeenCalledWith(
      expect.objectContaining({ category_code: 'parking', category_name: 'Parking' }),
    ))
  })

  it('deletes a category after confirmation', async () => {
    deleteSimExpenseCategory.mockResolvedValue({ success: true, data: { id: 'c1' } })
    renderPage()
    await screen.findByText('Travel')

    fireEvent.click(screen.getByRole('button', { name: /^delete travel$/i }))

    await waitFor(() => expect(deleteSimExpenseCategory).toHaveBeenCalledWith('c1'))
  })
})
