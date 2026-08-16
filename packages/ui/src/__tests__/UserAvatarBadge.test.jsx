import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import UserAvatarBadge from '../UserAvatarBadge.jsx'

const getAvatarSignedUrl = vi.fn()

vi.mock('@nidus/shared/services/userAvatarService', () => ({
  getAvatarSignedUrl: (...args) => getAvatarSignedUrl(...args),
}))

describe('UserAvatarBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows initials when no avatarPath is set', () => {
    render(<UserAvatarBadge db={{}} avatarPath={null} initials="OS" />)
    expect(screen.getByText('OS')).toBeInTheDocument()
    expect(getAvatarSignedUrl).not.toHaveBeenCalled()
  })

  it('shows the signed-URL image once resolved, when avatarPath is set', async () => {
    getAvatarSignedUrl.mockResolvedValue({ success: true, data: 'https://signed.example/avatar.png' })
    render(<UserAvatarBadge db={{}} avatarPath="account-1/auth-1/avatar.png" initials="OS" />)

    const img = await screen.findByAltText('Your profile picture')
    expect(img).toHaveAttribute('src', 'https://signed.example/avatar.png')
    expect(screen.queryByText('OS')).not.toBeInTheDocument()
  })

  it('makes a zoomable badge clickable to enlarge', async () => {
    getAvatarSignedUrl.mockResolvedValue({ success: true, data: 'https://signed.example/avatar.png' })
    render(<UserAvatarBadge db={{}} avatarPath="account-1/auth-1/avatar.png" initials="OS" zoomable />)
    await screen.findByAltText('Your profile picture')
    fireEvent.click(screen.getByRole('button', { name: /enlarge your profile picture/i }))
    expect(screen.getByRole('dialog', { name: 'Your profile picture' })).toBeInTheDocument()
  })

  it('falls back to initials if the signed URL request fails', async () => {
    getAvatarSignedUrl.mockResolvedValue({ success: false, message: 'boom' })
    render(<UserAvatarBadge db={{}} avatarPath="account-1/auth-1/avatar.png" initials="OS" />)

    await waitFor(() => expect(getAvatarSignedUrl).toHaveBeenCalled())
    expect(screen.getByText('OS')).toBeInTheDocument()
  })
})
