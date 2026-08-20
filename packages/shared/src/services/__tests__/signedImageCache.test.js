import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  peekSignedImage,
  resolveSignedImage,
  invalidateSignedImage,
  clearSignedImageCache,
} from '../signedImageCache'

describe('signedImageCache', () => {
  beforeEach(() => {
    clearSignedImageCache()
  })

  it('returns null on a cold peek', () => {
    expect(peekSignedImage('user-avatars', 'acct/user/avatar.png')).toBeNull()
  })

  it('mints once and reuses the signed URL', async () => {
    const createSignedUrl = vi.fn().mockResolvedValue('https://signed.example/a.png')
    const first = await resolveSignedImage({
      bucket: 'user-avatars',
      path: 'acct/user/avatar.png',
      expiresInSeconds: 86400,
      createSignedUrl,
    })
    const second = await resolveSignedImage({
      bucket: 'user-avatars',
      path: 'acct/user/avatar.png',
      expiresInSeconds: 86400,
      createSignedUrl,
    })
    expect(first).toBe('https://signed.example/a.png')
    expect(second).toBe('https://signed.example/a.png')
    expect(createSignedUrl).toHaveBeenCalledTimes(1)
    expect(peekSignedImage('user-avatars', 'acct/user/avatar.png')).toBe('https://signed.example/a.png')
  })

  it('shares one inflight createSignedUrl across concurrent callers', async () => {
    let release
    const createSignedUrl = vi.fn().mockImplementation(
      () => new Promise((resolve) => { release = () => resolve('https://signed.example/a.png') }),
    )
    const a = resolveSignedImage({
      bucket: 'user-avatars',
      path: 'acct/user/avatar.png',
      expiresInSeconds: 86400,
      createSignedUrl,
    })
    const b = resolveSignedImage({
      bucket: 'user-avatars',
      path: 'acct/user/avatar.png',
      expiresInSeconds: 86400,
      createSignedUrl,
    })
    release()
    expect(await a).toBe('https://signed.example/a.png')
    expect(await b).toBe('https://signed.example/a.png')
    expect(createSignedUrl).toHaveBeenCalledTimes(1)
  })

  it('mints again after invalidate', async () => {
    const createSignedUrl = vi.fn()
      .mockResolvedValueOnce('https://signed.example/old.png')
      .mockResolvedValueOnce('https://signed.example/new.png')
    await resolveSignedImage({
      bucket: 'user-avatars',
      path: 'acct/user/avatar.png',
      expiresInSeconds: 86400,
      createSignedUrl,
    })
    invalidateSignedImage('user-avatars', 'acct/user/avatar.png')
    const next = await resolveSignedImage({
      bucket: 'user-avatars',
      path: 'acct/user/avatar.png',
      expiresInSeconds: 86400,
      createSignedUrl,
    })
    expect(next).toBe('https://signed.example/new.png')
    expect(createSignedUrl).toHaveBeenCalledTimes(2)
  })
})
