import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AddRegisterCustomFieldDialog from '../AddRegisterCustomFieldDialog'

const LIBRARY = [
  { id: 'a', label: 'Vendor Ticket Reference', field_type: 'text', attached: false, used_in: 2 },
  { id: 'b', label: 'Cost Centre', field_type: 'dropdown', attached: true, used_in: 1 },
]

function renderDialog(props = {}) {
  const onAttach = vi.fn(async () => ({ success: true }))
  const onCreate = vi.fn(async () => ({ success: true, status: 'created' }))
  render(
    <AddRegisterCustomFieldDialog
      isOpen
      onClose={() => {}}
      registerLabel="Product Configuration"
      library={LIBRARY}
      count={1}
      limit={30}
      onAttach={onAttach}
      onCreate={onCreate}
      {...props}
    />
  )
  return { onAttach, onCreate }
}

describe('AddRegisterCustomFieldDialog', () => {
  it('starts on the organisation library and attaches an existing field', async () => {
    const { onAttach } = renderDialog()
    expect(screen.getByText('Vendor Ticket Reference')).toBeInTheDocument()
    expect(screen.getByText('On this register')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Add to this register' }))
    await waitFor(() => expect(onAttach).toHaveBeenCalledWith('a'))
  })

  it('blocks an exact duplicate name and offers the existing field', () => {
    renderDialog()
    fireEvent.click(screen.getByRole('tab', { name: 'Create a new field' }))
    fireEvent.change(screen.getByLabelText('Field name *'), { target: { value: 'vendor ticket-reference' } })
    expect(screen.getByText(/already exists in your organisation/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create field' })).toBeDisabled()
  })

  it('suggests similar names but still allows creating', () => {
    renderDialog()
    fireEvent.click(screen.getByRole('tab', { name: 'Create a new field' }))
    fireEvent.change(screen.getByLabelText('Field name *'), { target: { value: 'Vendor Ticket' } })
    expect(screen.getByText(/Did you mean/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create field' })).toBeEnabled()
  })

  it('requires options for a dropdown and sends them with Required', async () => {
    const { onCreate } = renderDialog()
    fireEvent.click(screen.getByRole('tab', { name: 'Create a new field' }))
    fireEvent.change(screen.getByLabelText('Field name *'), { target: { value: 'Delivery Risk' } })
    fireEvent.change(screen.getByLabelText('Type *'), { target: { value: 'dropdown' } })
    expect(screen.getByRole('button', { name: 'Create field' })).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Options * (one per line)'), { target: { value: 'High\nLow\n' } })
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Create field' }))
    await waitFor(() =>
      expect(onCreate).toHaveBeenCalledWith({ label: 'Delivery Risk', fieldType: 'dropdown', options: ['High', 'Low'], required: true })
    )
  })

  it('disables adding when the organisation is at its limit', () => {
    renderDialog({ count: 30, limit: 30 })
    expect(screen.getByText(/reached its limit of 30/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add to this register' })).toBeDisabled()
  })
})
