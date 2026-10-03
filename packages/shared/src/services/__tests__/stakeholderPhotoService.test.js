/**
 * stakeholderPhotoService unit tests (v1147)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  saveStakeholderPhoto,
  removeStakeholderPhoto,
  copyAvatarOntoLinkedStakeholders,
  ensureStakeholderPhotoFromProfile,
  stakeholderPhotoControlsVisible,
  stakeholderPhotoLabel,
  deleteStoredStakeholderPhoto,
  STAKEHOLDER_PHOTOS_BUCKET,
} from '../stakeholderPhotoService'
import { saveUserAvatar, removeUserAvatar, MAX_AVATAR_FILE_SIZE_BYTES } from '../userAvatarService'
import { clearSignedImageCache } from '../signedImageCache'

function makeFile({ name = 'photo.png', type = 'image/png', size = 1024 } = {}) {
  return { name, type, size }
}

function chainable(result) {
  const obj = {}
  ;['select', 'eq', 'update', 'maybeSingle'].forEach((m) => { obj[m] = vi.fn(() => obj) })
  obj.then = (resolve) => Promise.resolve(result).then(resolve)
  return obj
}

describe('stakeholder photo rules', () => {
  it('labels an individual as Photo and a group or organisation as Logo', () => {
    expect(stakeholderPhotoLabel('individual')).toBe('Photo')
    expect(stakeholderPhotoLabel('')).toBe('Photo')
    expect(stakeholderPhotoLabel('group')).toBe('Logo')
    expect(stakeholderPhotoLabel('organization')).toBe('Logo')
    expect(stakeholderPhotoLabel('community')).toBe('Logo')
  })

  it('hides upload controls only when a linked user currently has a profile picture', () => {
    expect(stakeholderPhotoControlsVisible({ linkedUserHasAvatar: true })).toBe(false)
    expect(stakeholderPhotoControlsVisible({ linkedUserHasAvatar: false })).toBe(true)
    expect(stakeholderPhotoControlsVisible({ isPractice: true, linkedUserHasAvatar: true })).toBe(true)
  })
})

describe('saveStakeholderPhoto', () => {
  it('rejects a file over the max size before upload', async () => {
    const db = { from: vi.fn(), storage: { from: vi.fn() } }
    const result = await saveStakeholderPhoto(db, {
      id: 's1',
      accountId: 'acct',
      file: makeFile({ size: MAX_AVATAR_FILE_SIZE_BYTES + 1 }),
    })
    expect(result.success).toBe(false)
    expect(result.message).toMatch(/too large/i)
    expect(db.storage.from).not.toHaveBeenCalled()
  })

  it('does not retry a storage rejection', async () => {
    const upload = vi.fn().mockResolvedValue({
      error: { message: 'new row violates row-level security policy', statusCode: '400' },
    })
    const db = {
      from: vi.fn(),
      storage: { from: vi.fn(() => ({ upload })) },
    }
    const result = await saveStakeholderPhoto(db, {
      id: 's1',
      accountId: 'acct',
      file: makeFile(),
    })
    expect(result.success).toBe(false)
    expect(upload).toHaveBeenCalledTimes(1)
    expect(result.message).toMatch(/row-level security/i)
    expect(db.from).not.toHaveBeenCalled()
  })

  it('rejects a file of the wrong type', async () => {
    const db = { from: vi.fn(), storage: { from: vi.fn() } }
    const result = await saveStakeholderPhoto(db, {
      id: 's1',
      accountId: 'acct',
      file: makeFile({ type: 'image/svg+xml' }),
    })
    expect(result.success).toBe(false)
    expect(result.message).toMatch(/not allowed/i)
  })
})

describe('copyAvatarOntoLinkedStakeholders', () => {
  beforeEach(() => clearSignedImageCache())

  it('replaces photo_path on every linked stakeholder and deletes the previous stakeholder file', async () => {
    const remove = vi.fn().mockResolvedValue({ error: null })
    const upload = vi.fn().mockResolvedValue({ error: null })
    const download = vi.fn().mockResolvedValue({ data: new Blob(['img'], { type: 'image/png' }), error: null })
    const updateChain = chainable({ data: { photo_path: 'acct/stakeholders/s1/photo.png' }, error: null })
    const listChain = chainable({
      data: [
        { id: 's1', account_id: 'acct', photo_path: 'acct/stakeholders/s1/photo.jpg' },
        { id: 's2', account_id: 'acct', photo_path: null },
      ],
      error: null,
    })
    const db = {
      from: vi.fn((table) => (table === 'stakeholders' && db.from.mock.calls.length === 1 ? listChain : updateChain)),
      storage: {
        from: vi.fn((bucket) => {
          if (bucket === 'user-avatars') return { download }
          return { upload, remove }
        }),
      },
    }
    db.from.mockImplementation((table) => {
      if (table !== 'stakeholders') throw new Error(`unexpected table ${table}`)
      const calls = db.from.mock.calls.filter((c) => c[0] === 'stakeholders').length
      return calls === 1 ? listChain : updateChain
    })

    const result = await copyAvatarOntoLinkedStakeholders(db, {
      platformUserId: 'user-1',
      avatarPath: 'acct/auth/avatar.png',
    })

    expect(result.success).toBe(true)
    expect(result.data).toEqual([
      'acct/stakeholders/s1/photo.png',
      'acct/stakeholders/s2/photo.png',
    ])
    expect(db.from).not.toHaveBeenCalledWith('practice_stakeholder_register')
    expect(remove).toHaveBeenCalledWith(['acct/stakeholders/s1/photo.jpg'])
    expect(upload).toHaveBeenCalled()
    expect(db.storage.from).toHaveBeenCalledWith(STAKEHOLDER_PHOTOS_BUCKET)
  })

  it('does not clear photo_path when the profile picture is removed', async () => {
    const db = {
      from: vi.fn(),
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'auth-1' } }, error: null }) },
      storage: { from: vi.fn() },
    }
    const removeMock = vi.fn().mockResolvedValue({ error: null })
    db.storage.from.mockReturnValue({ remove: removeMock })
    db.from
      .mockReturnValueOnce(chainable({ data: { avatar_url: 'acct/auth/avatar.png' }, error: null }))
      .mockReturnValueOnce(chainable({ data: null, error: null }))

    const result = await removeUserAvatar(db)

    expect(result.success).toBe(true)
    expect(db.from).not.toHaveBeenCalledWith('stakeholders')
    expect(removeMock).toHaveBeenCalledWith(['acct/auth/avatar.png'])
    expect(db.storage.from).toHaveBeenCalledWith('user-avatars')
    expect(db.storage.from).not.toHaveBeenCalledWith(STAKEHOLDER_PHOTOS_BUCKET)
  })
})

describe('ensureStakeholderPhotoFromProfile', () => {
  it('copies once when the stakeholder has no picture and the linked user has an avatar', async () => {
    const upload = vi.fn().mockResolvedValue({ error: null })
    const download = vi.fn().mockResolvedValue({ data: new Blob(['img'], { type: 'image/png' }), error: null })
    const db = {
      from: vi.fn((table) => {
        if (table === 'users') return chainable({ data: { avatar_url: 'acct/auth/avatar.png' }, error: null })
        return chainable({ data: null, error: null })
      }),
      storage: {
        from: vi.fn((bucket) => (bucket === 'user-avatars' ? { download } : { upload, remove: vi.fn() })),
      },
    }

    const result = await ensureStakeholderPhotoFromProfile(db, {
      id: 's-new',
      user_id: 'user-1',
      account_id: 'acct',
      photo_path: null,
    })

    expect(result.success).toBe(true)
    expect(result.data).toBe('acct/stakeholders/s-new/photo.png')
    expect(upload).toHaveBeenCalled()
  })

  it('leaves an existing stakeholder picture alone', async () => {
    const db = { from: vi.fn(), storage: { from: vi.fn() } }
    const result = await ensureStakeholderPhotoFromProfile(db, {
      id: 's1',
      user_id: 'user-1',
      account_id: 'acct',
      photo_path: 'acct/stakeholders/s1/photo.png',
    })
    expect(result.success).toBe(true)
    expect(result.data).toBe('acct/stakeholders/s1/photo.png')
    expect(db.from).not.toHaveBeenCalled()
  })
})

describe('removeStakeholderPhoto', () => {
  it('clears photo_path and deletes only the stakeholder file', async () => {
    const remove = vi.fn().mockResolvedValue({ error: null })
    const db = {
      from: vi.fn(() => chainable({ data: null, error: null })),
      storage: { from: vi.fn(() => ({ remove })) },
    }
    const result = await removeStakeholderPhoto(db, {
      id: 's1',
      photoPath: 'acct/stakeholders/s1/photo.png',
    })
    expect(result.success).toBe(true)
    expect(remove).toHaveBeenCalledWith(['acct/stakeholders/s1/photo.png'])
    expect(db.storage.from).toHaveBeenCalledWith(STAKEHOLDER_PHOTOS_BUCKET)
    expect(db.from).toHaveBeenCalledWith('stakeholders')
  })
})

describe('deleteStoredStakeholderPhoto', () => {
  it('does nothing when there is no path', async () => {
    const db = { storage: { from: vi.fn() } }
    const result = await deleteStoredStakeholderPhoto(db, null)
    expect(result.success).toBe(true)
    expect(db.storage.from).not.toHaveBeenCalled()
  })
})

describe('saveUserAvatar stakeholder copy', () => {
  it('copies the new profile picture onto linked stakeholders', async () => {
    const upload = vi.fn().mockResolvedValue({ error: null })
    const download = vi.fn().mockResolvedValue({ data: new Blob(['img'], { type: 'image/png' }), error: null })
    const db = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'auth-1' } }, error: null }) },
      from: vi.fn((table) => {
        if (table === 'users') {
          return chainable({ data: { id: 'user-1', avatar_url: 'account-1/auth-1/avatar.png' }, error: null })
        }
        const calls = db.from.mock.calls.filter((c) => c[0] === 'stakeholders').length
        if (calls === 1) {
          return chainable({
            data: [{ id: 's1', account_id: 'account-1', photo_path: null }],
            error: null,
          })
        }
        return chainable({ data: null, error: null })
      }),
      storage: {
        from: vi.fn((bucket) => (bucket === 'user-avatars' ? { upload, download } : { upload, remove: vi.fn().mockResolvedValue({ error: null }) })),
      },
    }

    const result = await saveUserAvatar(db, makeFile(), 'account-1')

    expect(result.success).toBe(true)
    expect(db.from).toHaveBeenCalledWith('stakeholders')
    expect(db.from).not.toHaveBeenCalledWith('practice_stakeholder_register')
  })
})
