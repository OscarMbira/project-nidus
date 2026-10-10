import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PMControlsQualityRegister from '../PMControlsQualityRegister'
import { getQualityRegister } from '../../../services/qualityManagementService'

vi.mock('@nidus/shared/hooks/usePlatformProjectId.js', () => ({
  usePlatformProjectId: () => ({ projectId: 'proj-1' }),
}))

vi.mock('../../../services/qualityManagementService', () => ({
  getQualityRegister: vi.fn(),
}))

const items = [
  { id: 'qr-1', product_name: 'Business Requirements Specification', product_reference: 'QR-002', quality_status: 'approved' },
]

vi.mock('../../../components/quality/QualityRegister', () => ({
  default: ({ items, onView, onEdit }) => (
    <div>
      {items.map((item) => (
        <div key={item.id}>
          <span>{item.product_name}</span>
          <button onClick={() => onView(item)}>View quality item</button>
          <button onClick={() => onEdit(item)}>Edit quality item</button>
        </div>
      ))}
    </div>
  ),
}))

vi.mock('../../../components/quality/QualityRegisterForm', () => ({
  default: ({ item, onSave, onCancel, variant }) => (
    <div role="dialog" data-variant={variant}>
      <p>Editing: {item ? item.product_name : 'New item'}</p>
      <button onClick={onSave}>Save</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}))

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/pm/controls/quality-register?projectId=proj-1']}>
      <PMControlsQualityRegister />
    </MemoryRouter>,
  )
}

describe('PMControlsQualityRegister — View/Edit open the form (fix: previously did nothing)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getQualityRegister.mockResolvedValue(items)
  })

  it('clicking View opens the form pre-filled with that item', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('tab', { name: /register/i }))
    await screen.findByText('Business Requirements Specification')

    fireEvent.click(screen.getByRole('button', { name: 'View quality item' }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Editing: Business Requirements Specification')).toBeInTheDocument()
  })

  it('clicking Edit opens the same form pre-filled with that item', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('tab', { name: /register/i }))
    await screen.findByText('Business Requirements Specification')

    fireEvent.click(screen.getByRole('button', { name: 'Edit quality item' }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Editing: Business Requirements Specification')).toBeInTheDocument()
  })

  it('saving or cancelling closes the form and refreshes the list', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('tab', { name: /register/i }))
    await screen.findByText('Business Requirements Specification')
    fireEvent.click(screen.getByRole('button', { name: 'Edit quality item' }))
    await screen.findByRole('dialog')

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(getQualityRegister).toHaveBeenCalledTimes(2) // initial load + refresh after save
  })

  it('opens the form in-page (not as a modal) on /pm/controls/quality-register, and hides the list behind it', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('tab', { name: /register/i }))
    await screen.findByText('Business Requirements Specification')

    fireEvent.click(screen.getByRole('button', { name: 'Edit quality item' }))

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveAttribute('data-variant', 'page')
    // The register list is replaced by the in-page form, not layered under an overlay.
    expect(screen.queryByText('Business Requirements Specification')).toBeNull()
  })
})
