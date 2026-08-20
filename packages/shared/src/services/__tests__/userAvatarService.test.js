/**
 * userAvatarService unit tests (v894 — Profile Picture)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getUserAvatar,
  saveUserAvatar,
  removeUserAvatar,
  getAvatarSignedUrl,
  validateAvatarFile,
  MAX_AVATAR_FILE_SIZE_BYTES,
} from '../userAvatarService'
import { clearSignedImageCache } from '../signedImageCache'

function makeFile({ name = 'photo.png', type = 'image/png', size = 1024 } = {}) {
  return { name, type, size }
}

/** A Supabase-query-builder-shaped stub: every method returns itself, and it's
 * thenable so `await` resolves at whichever point the code stops chaining. */
function chainable(result) {
  const obj = {}
  const methods = ['select', 'eq', 'update', 'maybeSingle']
  methods.forEach((m) => { obj[m] = vi.fn(() => obj) })
  obj.then = (resolve) => Promise.resolve(result).then(resolve)
  return obj
}

function makeDb({ authUserId = 'auth-1' } = {}) {
  return {
    from: vi.fn(),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: authUserId } }, error: null }) },
    storage: { from: vi.fn() },
  }
}

describe('validateAvatarFile', () => {
  it('rejects when no file is provided', () => {
    expect(validateAvatarFile(null)).toMatch(/no file/i)
  })

  it('accepts an allowed image file', () => {
    expect(validateAvatarFile(makeFile({ type: 'image/jpeg' }))).toBeNull()
  })

  it('rejects a disallowed mime type (e.g. svg — raster only for photos)', () => {
    expect(validateAvatarFile(makeFile({ type: 'image/svg+xml' }))).toMatch(/not allowed/i)
  })

  it('rejects a file over the max size', () => {
    expect(validateAvatarFile(makeFile({ size: MAX_AVATAR_FILE_SIZE_BYTES + 1 }))).toMatch(/too large/i)
  })
})

describe('getUserAvatar', () => {
  it('returns the current avatar_url (storage path) for the signed-in user', async () => {
    const db = makeDb()
    db.from.mockReturnValue(chainable({ data: { avatar_url: 'acct-1/auth-1/avatar.png' }, error: null }))

    const result = await getUserAvatar(db)

    expect(result.success).toBe(true)
    expect(result.data).toBe('acct-1/auth-1/avatar.png')
    expect(db.from).toHaveBeenCalledWith('users')
  })

  it('returns null when no avatar is set', async () => {
    const db = makeDb()
    db.from.mockReturnValue(chainable({ data: { avatar_url: null }, error: null }))

    const result = await getUserAvatar(db)

    expect(result.success).toBe(true)
    expect(result.data).toBeNull()
  })
})

describe('saveUserAvatar', () => {
  it('uploads to user-avatars at an account-scoped path and updates users.avatar_url', async () => {
    const db = makeDb()
    db.storage.from.mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
    })
    db.from.mockReturnValue(chainable({ data: { avatar_url: 'account-1/auth-1/avatar.png' }, error: null }))

    const result = await saveUserAvatar(db, makeFile(), 'account-1')

    expect(result.success).toBe(true)
    expect(db.storage.from).toHaveBeenCalledWith('user-avatars')
    const uploadCall = db.storage.from.mock.results[0].value.upload.mock.calls[0]
    expect(uploadCall[0]).toBe('account-1/auth-1/avatar.png')
    expect(result.data).toBe('account-1/auth-1/avatar.png')
  })

  it('rejects an invalid file before attempting an upload', async () => {
    const db = makeDb()
    const result = await saveUserAvatar(db, makeFile({ type: 'application/pdf' }), 'account-1')
    expect(result.success).toBe(false)
    expect(db.storage.from).not.toHaveBeenCalled()
  })

  it('requires an accountId', async () => {
    const db = makeDb()
    const result = await saveUserAvatar(db, makeFile(), null)
    expect(result.success).toBe(false)
  })

  it('fails (not a silent success) when the UPDATE affects 0 rows — e.g. RLS blocked it', async () => {
    const db = makeDb()
    db.storage.from.mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
    })
    // PostgREST returns data: null, error: null for an UPDATE that matched 0 rows —
    // no thrown error, so this must be checked explicitly rather than assumed to be a
    // successful write just because the image itself uploaded to storage fine.
    db.from.mockReturnValue(chainable({ data: null, error: null }))

    const result = await saveUserAvatar(db, makeFile(), 'account-1')

    expect(result.success).toBe(false)
    expect(result.message).toMatch(/could not be saved to your profile/i)
  })
})

describe('removeUserAvatar', () => {
  it('removes the storage object and clears avatar_url', async () => {
    const db = makeDb()
    const removeMock = vi.fn().mockResolvedValue({ error: null })
    db.storage.from.mockReturnValue({ remove: removeMock })
    db.from
      .mockReturnValueOnce(chainable({ data: { avatar_url: 'account-1/auth-1/avatar.png' }, error: null })) // getUserAvatar
      .mockReturnValueOnce(chainable({ data: null, error: null })) // update

    const result = await removeUserAvatar(db)

    expect(result.success).toBe(true)
    expect(removeMock).toHaveBeenCalledWith(['account-1/auth-1/avatar.png'])
  })

  it('is a no-op storage-wise when no avatar is currently set', async () => {
    const db = makeDb()
    db.from
      .mockReturnValueOnce(chainable({ data: { avatar_url: null }, error: null })) // getUserAvatar
      .mockReturnValueOnce(chainable({ data: null, error: null })) // update
    const removeMock = vi.fn()
    db.storage.from.mockReturnValue({ remove: removeMock })

    const result = await removeUserAvatar(db)

    expect(result.success).toBe(true)
    expect(removeMock).not.toHaveBeenCalled()
  })
})

describe('getAvatarSignedUrl', () => {
  beforeEach(() => {
    clearSignedImageCache()
  })

  it('creates a signed URL against the user-avatars bucket', async () => {
    const db = makeDb()
    const createSignedUrl = vi.fn().mockResolvedValue({ data: { signedUrl: 'https://signed.example/avatar.png' }, error: null })
    db.storage.from.mockReturnValue({ createSignedUrl })

    const result = await getAvatarSignedUrl(db, 'account-1/auth-1/avatar.png')

    expect(result.success).toBe(true)
    expect(result.data).toBe('https://signed.example/avatar.png')
    expect(db.storage.from).toHaveBeenCalledWith('user-avatars')
    expect(createSignedUrl).toHaveBeenCalledWith('account-1/auth-1/avatar.png', 86400)
  })

  it('reuses a cached signed URL instead of minting a new token', async () => {
    const db = makeDb()
    const createSignedUrl = vi.fn().mockResolvedValue({ data: { signedUrl: 'https://signed.example/avatar.png' }, error: null })
    db.storage.from.mockReturnValue({ createSignedUrl })

    await getAvatarSignedUrl(db, 'account-1/auth-1/avatar.png')
    const second = await getAvatarSignedUrl(db, 'account-1/auth-1/avatar.png')

    expect(second.success).toBe(true)
    expect(second.data).toBe('https://signed.example/avatar.png')
    expect(createSignedUrl).toHaveBeenCalledTimes(1)
  })
})
