import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ExpenseCategories from '../ExpenseCategories'
import {
  getExpenseCategories,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
} from '../../../services/expenseCategoryService'

vi.mock('../../../services/expenseCategoryService', () => ({
  getExpenseCategories: vi.fn(),
  createExpenseCategory: vi.fn(),
  updateExpenseCategory: vi.fn(),
  deleteExpenseCategory: vi.fn(),
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

describe('ExpenseCategories admin page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getExpenseCategories.mockResolvedValue({ success: true, data: categories })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('lists existing categories', async () => {
    renderPage()
    expect(await screen.findByText('Travel')).toBeInTheDocument()
    expect(screen.getByText('Meals')).toBeInTheDocument()
  })

  it('creates a new category', async () => {
    createExpenseCategory.mockResolvedValue({ success: true, data: { id: 'c3', category_name: 'Parking' } })
    renderPage()
    await screen.findByText('Travel')

    fireEvent.click(screen.getByRole('button', { name: /add category/i }))
    fireEvent.change(screen.getByLabelText(/category code/i), { target: { value: 'parking' } })
    fireEvent.change(screen.getByLabelText(/category name/i), { target: { value: 'Parking' } })
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }))

    await waitFor(() => expect(createExpenseCategory).toHaveBeenCalledWith(
      expect.objectContaining({ category_code: 'parking', category_name: 'Parking' }),
    ))
  })

  it('edits an existing category', async () => {
    updateExpenseCategory.mockResolvedValue({ success: true, data: { ...categories[0], category_name: 'Travel & Transit' } })
    renderPage()
    await screen.findByText('Travel')

    fireEvent.click(screen.getByRole('button', { name: /^edit travel$/i }))
    fireEvent.change(screen.getByLabelText(/category name/i), { target: { value: 'Travel & Transit' } })
    fireEvent.click(screen.getByRole('button', { name: /^update$/i }))

    await waitFor(() => expect(updateExpenseCategory).toHaveBeenCalledWith('c1', expect.objectContaining({ category_name: 'Travel & Transit' })))
  })

  it('deletes a category after confirmation', async () => {
    deleteExpenseCategory.mockResolvedValue({ success: true, data: { id: 'c1' } })
    renderPage()
    await screen.findByText('Travel')

    fireEvent.click(screen.getByRole('button', { name: /^delete travel$/i }))

    await waitFor(() => expect(deleteExpenseCategory).toHaveBeenCalledWith('c1'))
  })
})
