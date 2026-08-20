import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ProfilePictureSection from '../ProfilePictureSection.jsx'

const getUserAvatar = vi.fn()
const saveUserAvatar = vi.fn()
const removeUserAvatar = vi.fn()
const getAvatarSignedUrl = vi.fn()

vi.mock('@nidus/shared/services/userAvatarService', () => ({
  getUserAvatar: (...args) => getUserAvatar(...args),
  saveUserAvatar: (...args) => saveUserAvatar(...args),
  removeUserAvatar: (...args) => removeUserAvatar(...args),
  getAvatarSignedUrl: (...args) => getAvatarSignedUrl(...args),
  peekAvatarDisplayUrl: () => null,
  validateAvatarFile: (file) => {
    if (!file) return 'No file selected.'
    if (!['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.type)) {
      return `File type "${file.type}" is not allowed`
    }
    if (file.size > 2 * 1024 * 1024) return 'File is too large'
    return null
  },
}))

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

function makeFile({ name = 'photo.png', type = 'image/png', size = 1024 } = {}) {
  return new File([new Uint8Array(size)], name, { type })
}

describe('ProfilePictureSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getUserAvatar.mockResolvedValue({ success: true, data: null })
    getAvatarSignedUrl.mockResolvedValue({ success: false })
  })

  it('shows initials while no picture is set, and no Remove button', async () => {
    render(<ProfilePictureSection db={{}} accountId="account-1" initials="OS" />)
    expect(await screen.findByText('OS')).toBeInTheDocument()
    expect(screen.queryByText('Remove')).not.toBeInTheDocument()
  })

  it('uploads a picture and saves it immediately', async () => {
    saveUserAvatar.mockResolvedValue({ success: true, data: 'account-1/auth-1/avatar.png' })
    render(<ProfilePictureSection db={{}} accountId="account-1" initials="OS" />)
    await screen.findByText('OS')

    const input = document.querySelector('input[type="file"]')
    fireEvent.change(input, { target: { files: [makeFile()] } })

    await waitFor(() => expect(saveUserAvatar).toHaveBeenCalledWith({}, expect.any(File), 'account-1'))
  })

  it('rejects an oversized file before calling saveUserAvatar', async () => {
    render(<ProfilePictureSection db={{}} accountId="account-1" initials="OS" />)
    await screen.findByText('OS')

    const input = document.querySelector('input[type="file"]')
    fireEvent.change(input, { target: { files: [makeFile({ size: 3 * 1024 * 1024 })] } })

    await waitFor(() => expect(saveUserAvatar).not.toHaveBeenCalled())
  })

  it('shows Remove once a picture is set, and calls removeUserAvatar on click', async () => {
    getUserAvatar.mockResolvedValue({ success: true, data: 'account-1/auth-1/avatar.png' })
    removeUserAvatar.mockResolvedValue({ success: true, data: null })
    render(<ProfilePictureSection db={{}} accountId="account-1" initials="OS" />)

    const removeButton = await screen.findByText('Remove')
    fireEvent.click(removeButton)

    await waitFor(() => expect(removeUserAvatar).toHaveBeenCalledWith({}))
  })
})
