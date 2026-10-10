import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import QualityRegister from '../QualityRegister'
import { deleteQualityRegisterItem } from '../../../services/qualityManagementService'
import toast from 'react-hot-toast'

vi.mock('../../../services/qualityManagementService', () => ({
  deleteQualityRegisterItem: vi.fn(),
  getQualityActivities: vi.fn().mockResolvedValue([]),
}))

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

const items = [
  { id: 'qr-1', product_name: 'Business Requirements Specification', product_reference: 'QR-002', quality_status: 'approved' },
]

describe('QualityRegister delete — save confirmation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('confirms with a success toast once the item is deleted', async () => {
    deleteQualityRegisterItem.mockResolvedValue({})
    const onRefresh = vi.fn()
    render(<QualityRegister items={items} onRefresh={onRefresh} registerViewMode="list" />)

    fireEvent.click(screen.getByRole('button', { name: 'Delete quality item' }))

    await waitFor(() => expect(deleteQualityRegisterItem).toHaveBeenCalledWith('qr-1'))
    await waitFor(() => expect(toast.success).toHaveBeenCalled())
    expect(onRefresh).toHaveBeenCalled()
  })

  it('shows a toast instead of a native alert when deletion fails', async () => {
    deleteQualityRegisterItem.mockRejectedValue(new Error('network error'))
    render(<QualityRegister items={items} onRefresh={vi.fn()} registerViewMode="list" />)
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

    fireEvent.click(screen.getByRole('button', { name: 'Delete quality item' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(alertSpy).not.toHaveBeenCalled()
    alertSpy.mockRestore()
  })
})
