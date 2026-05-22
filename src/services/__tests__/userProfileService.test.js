import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildUserProfileUpdatePayload, updateUserProfile } from '../userProfileService'

const mockGetUser = vi.fn()
const mockFrom = vi.fn()

vi.mock('../supabaseClient', () => ({
  platformDb: {
    auth: { getUser: (...args) => mockGetUser(...args) },
    from: (...args) => mockFrom(...args),
  },
}))

describe('buildUserProfileUpdatePayload', () => {
  it('trims fields and maps phone to phone_number', () => {
    const payload = buildUserProfileUpdatePayload({
      full_name: '  Jane Doe  ',
      phone: '  +123  ',
      job_title: ' PM ',
      bio: ' Bio text ',
    })
    expect(payload.full_name).toBe('Jane Doe')
    expect(payload.phone_number).toBe('+123')
    expect(payload.job_title).toBe('PM')
    expect(payload.bio).toBe('Bio text')
    expect(payload.updated_at).toBeTruthy()
  })

  it('throws when full name is empty', () => {
    expect(() =>
      buildUserProfileUpdatePayload({ full_name: '   ', phone: '', job_title: '', bio: '' })
    ).toThrow('Full name is required')
  })
})

describe('updateUserProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates users row for authenticated user', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'auth-1' } },
      error: null,
    })

    const selectChain = {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'user-1' }, error: null }),
    }
    const updateChain = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: 'user-1',
          full_name: 'Jane',
          phone_number: null,
          job_title: 'PM',
          bio: 'x',
        },
        error: null,
      }),
    }

    mockFrom.mockImplementation((table) => {
      if (table !== 'users') throw new Error('unexpected table')
      return {
        select: vi.fn(() => selectChain),
        update: vi.fn(() => updateChain),
      }
    })

    const result = await updateUserProfile({
      full_name: 'Jane',
      phone: '',
      job_title: 'PM',
      bio: 'x',
    })

    expect(result.full_name).toBe('Jane')
    expect(mockFrom).toHaveBeenCalledWith('users')
  })

  it('throws when no users row exists', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'auth-1' } },
      error: null,
    })

    mockFrom.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    })

    await expect(
      updateUserProfile({ full_name: 'Jane', phone: '', job_title: '', bio: '' })
    ).rejects.toThrow('Profile record not found')
  })
})
