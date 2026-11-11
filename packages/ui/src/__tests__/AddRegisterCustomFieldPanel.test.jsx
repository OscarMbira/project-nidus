import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AddRegisterCustomFieldPanel from '../AddRegisterCustomFieldPanel'

const LIBRARY = [
  { id: 'a', label: 'Vendor Ticket Reference', field_type: 'text', attached: false, used_in: 2 },
  { id: 'b', label: 'Cost Centre', field_type: 'dropdown', attached: true, used_in: 1 },
]

/** Adds one value through the multi-value list input (type + Enter). */
function addValue(label, value) {
  const input = screen.getByLabelText(label)
  fireEvent.change(input, { target: { value } })
  fireEvent.keyDown(input, { key: 'Enter' })
}

function renderDialog(props = {}) {
  const onAttach = vi.fn(async () => ({ success: true }))
  const onCreate = vi.fn(async () => ({ success: true, status: 'created' }))
  render(
    <AddRegisterCustomFieldPanel
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

describe('AddRegisterCustomFieldPanel', () => {
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
    addValue('Dropdown values *', 'High')
    addValue('Dropdown values *', 'Low')
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Create field' }))
    await waitFor(() =>
      expect(onCreate).toHaveBeenCalledWith({ name: 'Delivery Risk', label: 'Delivery Risk', fieldType: 'dropdown', options: ['High', 'Low'], required: true, rules: {} })
    )
  })

  it('renders inline (non-modal) and closes with Close', () => {
    const onClose = vi.fn()
    render(
      <AddRegisterCustomFieldPanel isOpen onClose={onClose} library={LIBRARY} count={1} limit={30} onAttach={vi.fn()} onCreate={vi.fn()} />
    )
    expect(screen.getByRole('region', { name: 'Add custom field' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('renders nothing when closed', () => {
    const { container } = render(
      <AddRegisterCustomFieldPanel isOpen={false} onClose={() => {}} library={LIBRARY} onAttach={vi.fn()} onCreate={vi.fn()} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('offers optional settings, blocks impossible ranges and sends the settings', async () => {
    const { onCreate } = renderDialog()
    fireEvent.click(screen.getByRole('tab', { name: 'Create a new field' }))
    fireEvent.change(screen.getByLabelText('Field name *'), { target: { value: 'Headcount' } })
    fireEvent.change(screen.getByLabelText('Type *'), { target: { value: 'number' } })
    fireEvent.click(screen.getByRole('button', { name: /More options/ }))
    fireEvent.change(screen.getByLabelText('Allowed values — Minimum'), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText('Allowed values — Maximum'), { target: { value: '1' } })
    expect(screen.getByText('Minimum value cannot be greater than the maximum')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create field' })).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Allowed values — Maximum'), { target: { value: '500' } })
    fireEvent.change(screen.getByLabelText('Default value'), { target: { value: '25' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create field' }))
    await waitFor(() =>
      expect(onCreate).toHaveBeenCalledWith({
        name: 'Headcount', label: 'Headcount', fieldType: 'number', options: [], required: false,
        rules: { min: '10', max: '500', defaultValue: '25' },
      })
    )
  })

  it('lets a dropdown default be picked from the values just entered', () => {
    renderDialog()
    fireEvent.click(screen.getByRole('tab', { name: 'Create a new field' }))
    fireEvent.change(screen.getByLabelText('Type *'), { target: { value: 'dropdown' } })
    addValue('Dropdown values *', 'Low')
    addValue('Dropdown values *', 'High')
    fireEvent.click(screen.getByRole('button', { name: /More options/ }))
    expect(screen.getByRole('option', { name: 'High' })).toBeInTheDocument()
    expect(screen.queryByText(/Need a list of values/)).not.toBeInTheDocument()
  })

  it('sends a separate field label, and blocks a label that duplicates an existing field', async () => {
    const { onCreate } = renderDialog()
    fireEvent.click(screen.getByRole('tab', { name: 'Create a new field' }))
    fireEvent.change(screen.getByLabelText('Field name *'), { target: { value: 'VTR' } })
    fireEvent.change(screen.getByLabelText('Field label'), { target: { value: 'Vendor Ticket Reference' } })
    expect(screen.getByText(/already exists in your organisation/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create field' })).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Field label'), { target: { value: 'Finance cost code' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create field' }))
    await waitFor(() =>
      expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ name: 'VTR', label: 'Finance cost code' }))
    )
  })

  it('limits a text field to a list of values by turning it into a dropdown', async () => {
    const { onCreate } = renderDialog()
    fireEvent.click(screen.getByRole('tab', { name: 'Create a new field' }))
    fireEvent.change(screen.getByLabelText('Field name *'), { target: { value: 'Region' } })
    addValue('Dropdown values (optional)', 'North')
    addValue('Dropdown values (optional)', 'South')
    expect(screen.getByRole('columnheader', { name: 'Dropdown value' })).toBeInTheDocument()
    expect(screen.getByText(/created as a Dropdown/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Create field' }))
    await waitFor(() =>
      expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ fieldType: 'dropdown', options: ['North', 'South'] }))
    )
  })

  it('hides the values box for types that cannot be a list', () => {
    renderDialog()
    fireEvent.click(screen.getByRole('tab', { name: 'Create a new field' }))
    fireEvent.change(screen.getByLabelText('Type *'), { target: { value: 'date' } })
    expect(screen.queryByLabelText(/Dropdown values/)).not.toBeInTheDocument()
  })

  it('disables adding when the organisation is at its limit', () => {
    renderDialog({ count: 30, limit: 30 })
    expect(screen.getByText(/reached its limit of 30/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add to this register' })).toBeDisabled()
  })
})
