import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ExpenseItemsTable from '../ExpenseItemsTable'

vi.mock('@nidus/shared/context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
  useThemeContext: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
  ThemeProvider: ({ children }) => children,
}))

const categories = [
  { id: 'cat-1', category_name: 'Travel' },
  { id: 'cat-2', category_name: 'Meals' },
]

describe('ExpenseItemsTable', () => {
  it('shows an empty state when there are no items', () => {
    render(<ExpenseItemsTable items={[]} onChange={() => {}} categories={categories} />)
    expect(screen.getByText(/no items added/i)).toBeInTheDocument()
  })

  it('adds a new item with description, category, and amount', () => {
    const onChange = vi.fn()
    render(<ExpenseItemsTable items={[]} onChange={onChange} categories={categories} />)

    fireEvent.change(screen.getByLabelText(/new item description/i), { target: { value: 'Milk' } })
    const amount = screen.getByPlaceholderText(/amount/i)
    fireEvent.change(amount, { target: { value: '20' } })
    fireEvent.blur(amount)
    fireEvent.click(screen.getByRole('button', { name: /add item/i }))

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ description: 'Milk', amount: 20 }),
    ])
  })

  it('blocks adding an item with no description or a zero amount', () => {
    const onChange = vi.fn()
    render(<ExpenseItemsTable items={[]} onChange={onChange} categories={categories} />)
    fireEvent.click(screen.getByRole('button', { name: /add item/i }))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('shows the running total of all items', () => {
    render(
      <ExpenseItemsTable
        items={[
          { description: 'Milk', amount: 20, category_id: null },
          { description: 'Eggs', amount: 25, category_id: null },
        ]}
        onChange={() => {}}
        categories={categories}
      />,
    )
    expect(screen.getByText(/45/)).toBeInTheDocument()
  })

  it('edits an existing item', () => {
    const onChange = vi.fn()
    render(
      <ExpenseItemsTable
        items={[{ description: 'Milk', amount: 20, category_id: null }]}
        onChange={onChange}
        categories={categories}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /edit item 1/i }))
    fireEvent.change(screen.getByLabelText(/edit item 1 description/i), { target: { value: 'Oat milk' } })
    fireEvent.click(screen.getByRole('button', { name: /save item 1/i }))

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ description: 'Oat milk', amount: 20 }),
    ])
  })

  it('deletes an item', () => {
    const onChange = vi.fn()
    render(
      <ExpenseItemsTable
        items={[{ description: 'Milk', amount: 20, category_id: null }]}
        onChange={onChange}
        categories={categories}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /delete item 1/i }))
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('adds a new item with its own notes', () => {
    const onChange = vi.fn()
    render(<ExpenseItemsTable items={[]} onChange={onChange} categories={categories} />)

    fireEvent.change(screen.getByLabelText(/new item description/i), { target: { value: 'Milk' } })
    fireEvent.change(screen.getByLabelText(/new item notes/i), { target: { value: 'Organic, 2L' } })
    const amount = screen.getByPlaceholderText(/amount/i)
    fireEvent.change(amount, { target: { value: '20' } })
    fireEvent.blur(amount)
    fireEvent.click(screen.getByRole('button', { name: /add item/i }))

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ description: 'Milk', amount: 20, notes: 'Organic, 2L' }),
    ])
  })

  it('shows an item\'s notes in read-only mode', () => {
    render(
      <ExpenseItemsTable
        items={[{ description: 'Milk', amount: 20, category_id: null, notes: 'Organic, 2L' }]}
        onChange={() => {}}
        categories={categories}
        readOnly
      />,
    )
    expect(screen.getByText('Organic, 2L')).toBeInTheDocument()
  })

  it('edits an item\'s notes', () => {
    const onChange = vi.fn()
    render(
      <ExpenseItemsTable
        items={[{ description: 'Milk', amount: 20, category_id: null, notes: '' }]}
        onChange={onChange}
        categories={categories}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /edit item 1/i }))
    fireEvent.change(screen.getByLabelText(/edit item 1 notes/i), { target: { value: 'Low-fat this time' } })
    fireEvent.click(screen.getByRole('button', { name: /save item 1/i }))

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ description: 'Milk', amount: 20, notes: 'Low-fat this time' }),
    ])
  })

  it('hides the add row and action buttons in read-only mode', () => {
    render(
      <ExpenseItemsTable
        items={[{ description: 'Milk', amount: 20, category_id: null }]}
        onChange={() => {}}
        categories={categories}
        readOnly
      />,
    )
    expect(screen.queryByRole('button', { name: /add item/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /edit item 1/i })).toBeNull()
  })
})
