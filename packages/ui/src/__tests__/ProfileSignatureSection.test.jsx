import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ProfileSignatureSection from '../ProfileSignatureSection.jsx'

const getSavedSignature = vi.fn()
const saveSignatureImage = vi.fn()
const deleteSavedSignature = vi.fn()
const getSignatureSignedUrl = vi.fn()

vi.mock('@nidus/shared/services/processTemplateSignatoryService', () => ({
  getSavedSignature: (...args) => getSavedSignature(...args),
  saveSignatureImage: (...args) => saveSignatureImage(...args),
  deleteSavedSignature: (...args) => deleteSavedSignature(...args),
  getSignatureSignedUrl: (...args) => getSignatureSignedUrl(...args),
  peekSignatureDisplayUrl: () => null,
  validateSignatureFile: (file) => {
    if (!file) return 'No file selected.'
    if (file.size > 2 * 1024 * 1024) return 'File is too large'
    return null
  },
  USER_SIGNATURES_BUCKET: 'user-signatures',
}))

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

function makeFile({ name = 'sig.png', type = 'image/png', size = 1024 } = {}) {
  return new File([new Uint8Array(size)], name, { type })
}

describe('ProfileSignatureSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getSavedSignature.mockResolvedValue({ success: true, data: null })
  })

  it('shows "No signature saved yet" and an Upload (not Replace) button when none is saved', async () => {
    render(<ProfileSignatureSection db={{}} accountId="account-1" />)
    expect(await screen.findByText('No signature saved yet.')).toBeInTheDocument()
    expect(screen.getByText('Upload')).toBeInTheDocument()
    expect(screen.queryByText('Remove')).not.toBeInTheDocument()
  })

  it('shows the saved signature preview and a Replace/Remove pair when one exists', async () => {
    getSavedSignature.mockResolvedValue({
      success: true,
      data: { storage_bucket: 'user-signatures', storage_path: 'auth-1/signature.png' },
    })
    getSignatureSignedUrl.mockResolvedValue({ success: true, data: 'https://signed.example/sig.png' })

    render(<ProfileSignatureSection db={{}} accountId="account-1" />)

    const img = await screen.findByAltText('Your saved signature')
    expect(img).toHaveAttribute('src', 'https://signed.example/sig.png')
    expect(screen.getByText('Replace')).toBeInTheDocument()
    expect(screen.getByText('Remove')).toBeInTheDocument()
    expect(getSignatureSignedUrl).toHaveBeenCalledWith({}, 'auth-1/signature.png', 86400, 'user-signatures')
    fireEvent.click(screen.getByRole('button', { name: /enlarge your saved signature/i }))
    expect(screen.getByRole('dialog', { name: 'Your saved signature' })).toBeInTheDocument()
  })

  it('uploads a signature and saves it immediately', async () => {
    saveSignatureImage.mockResolvedValue({
      success: true,
      data: { storage_bucket: 'user-signatures', storage_path: 'auth-1/signature.png' },
    })
    render(<ProfileSignatureSection db={{}} accountId="account-1" />)
    await screen.findByText('No signature saved yet.')

    const input = document.querySelector('input[type="file"]')
    fireEvent.change(input, { target: { files: [makeFile()] } })

    await waitFor(() => expect(saveSignatureImage).toHaveBeenCalledWith({}, expect.any(File), 'account-1'))
  })

  it('calls deleteSavedSignature on Remove', async () => {
    getSavedSignature.mockResolvedValue({
      success: true,
      data: { storage_bucket: 'user-signatures', storage_path: 'auth-1/signature.png' },
    })
    getSignatureSignedUrl.mockResolvedValue({ success: true, data: 'https://signed.example/sig.png' })
    deleteSavedSignature.mockResolvedValue({ success: true, data: null })

    render(<ProfileSignatureSection db={{}} accountId="account-1" />)
    const removeButton = await screen.findByText('Remove')
    fireEvent.click(removeButton)

    await waitFor(() => expect(deleteSavedSignature).toHaveBeenCalledWith({}))
  })
})
