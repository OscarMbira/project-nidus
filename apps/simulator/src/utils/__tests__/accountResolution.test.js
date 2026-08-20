import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockPlatformDb } = vi.hoisted(() => ({
  mockPlatformDb: { auth: { getSession: vi.fn() }, from: vi.fn() },
}))
vi.mock('@nidus/supabase', () => ({ platformDb: mockPlatformDb }))

import { isValidAccountId, getCurrentUserInternalUserId } from '../accountResolution'

/** A Supabase-query-builder-shaped stub: every method returns itself, and it's
 * thenable so `await` resolves at whichever point the code stops chaining. */
function chainable(result) {
  const obj = {}
  const methods = ['select', 'eq', 'maybeSingle']
  methods.forEach((m) => { obj[m] = vi.fn(() => obj) })
  obj.then = (resolve) => Promise.resolve(result).then(resolve)
  return obj
}

describe('accountResolution', () => {
  describe('isValidAccountId', () => {
    it('rejects null, undefined, empty, and literal "null"', () => {
      expect(isValidAccountId(null)).toBe(false)
      expect(isValidAccountId(undefined)).toBe(false)
      expect(isValidAccountId('')).toBe(false)
      expect(isValidAccountId('null')).toBe(false)
    })

    it('accepts a valid UUID', () => {
      expect(isValidAccountId('42a1c47a-c1bf-4ea3-a78c-cd278270458d')).toBe(true)
    })
  })

  describe('getCurrentUserInternalUserId', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      mockPlatformDb.auth.getSession.mockResolvedValue({
        data: { session: { user: { id: 'auth-1', email: 'pat@example.com' } } },
      })
      mockPlatformDb.from.mockReturnValue(chainable({ data: { id: 'user-row-1' }, error: null }))
    })

    it('resolves the internal user id', async () => {
      expect(await getCurrentUserInternalUserId()).toBe('user-row-1')
    })

    it('de-dupes concurrent calls into a single underlying users query — this function is', async () => {
      // called independently by many components mounted on the same page (header,
      // profile sections, project context, ...); overlapping calls should share one
      // in-flight request rather than each firing their own identical query.
      const [a, b, c] = await Promise.all([
        getCurrentUserInternalUserId(),
        getCurrentUserInternalUserId(),
        getCurrentUserInternalUserId(),
      ])
      expect(a).toBe('user-row-1')
      expect(b).toBe('user-row-1')
      expect(c).toBe('user-row-1')
      expect(mockPlatformDb.from).toHaveBeenCalledTimes(1)
    })

    it('is not a persistent cache — a later call after the first resolves runs fresh', async () => {
      await getCurrentUserInternalUserId()
      expect(mockPlatformDb.from).toHaveBeenCalledTimes(1)

      await getCurrentUserInternalUserId()
      expect(mockPlatformDb.from).toHaveBeenCalledTimes(2)
    })
  })
})
