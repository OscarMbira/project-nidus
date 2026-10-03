import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSendEmail = vi.hoisted(() => vi.fn())
const mockSendEmailViaSupabase = vi.hoisted(() => vi.fn())
const mockRpc = vi.hoisted(() => vi.fn())
const mockGetUser = vi.hoisted(() => vi.fn())
const mockMaybeSingle = vi.hoisted(() => vi.fn())

vi.mock('../emailIntegrationService', () => ({
  sendEmail: (...args) => mockSendEmail(...args),
  sendEmailViaSupabase: (...args) => mockSendEmailViaSupabase(...args),
}))

vi.mock('../brandingService', () => ({
  getBranding: vi.fn().mockResolvedValue(null),
  buildBrandedEmailHeader: () => '<header></header>',
  buildBrandedEmailFooter: () => '<footer></footer>',
}))

vi.mock('../supabase/supabaseClient', () => ({
  platformDb: {
    rpc: (...args) => mockRpc(...args),
    auth: { getUser: () => mockGetUser() },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => mockMaybeSingle() }) }) }),
  },
}))

import {
  ACCOUNT_EMAIL_VERIFICATION_ENABLED,
  sendWelcomeEmail,
  sendAccountVerificationEmail,
  buildAccountVerificationLink,
  requestEmailVerificationToken,
  verifyEmailToken,
  getMyVerificationStatus,
} from '../registrationEmailService'

describe('registrationEmailService — v929 account email verification (soft-gate, active)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('is active — the soft-gate design was confirmed, matching the brief\'s target onboarding model', () => {
    expect(ACCOUNT_EMAIL_VERIFICATION_ENABLED).toBe(true)
  })

  describe('getMyVerificationStatus', () => {
    it('returns isVerified/email/firstName for the current user', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-1', email: 'user@example.com' } } })
      mockMaybeSingle.mockResolvedValue({ data: { is_verified: true, email: 'user@example.com', first_name: 'Jane' }, error: null })
      const result = await getMyVerificationStatus()
      expect(result).toEqual({ success: true, isVerified: true, email: 'user@example.com', firstName: 'Jane', error: null })
    })

    it('returns unverified/no-op when nobody is signed in', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })
      const result = await getMyVerificationStatus()
      expect(result).toEqual({ success: true, isVerified: false, email: null, firstName: null, error: null })
    })
  })

  describe('sendWelcomeEmail', () => {
    it('sends via sendEmailViaSupabase, not the RLS-gated sendEmail wrapper', async () => {
      mockSendEmailViaSupabase.mockResolvedValue({ success: true })
      const result = await sendWelcomeEmail('user@example.com', 'Jane')
      expect(result.success).toBe(true)
      expect(mockSendEmailViaSupabase).toHaveBeenCalledWith(
        'user@example.com',
        'Welcome to Project Nidus',
        expect.stringContaining('Jane'),
        null,
        { templateId: 'welcome' },
      )
      expect(mockSendEmail).not.toHaveBeenCalled()
    })

    it('never throws — returns a failure result instead', async () => {
      mockSendEmailViaSupabase.mockRejectedValue(new Error('network down'))
      const result = await sendWelcomeEmail('user@example.com', 'Jane')
      expect(result.success).toBe(false)
      expect(result.error).toMatch(/network down/)
    })
  })

  describe('requestEmailVerificationToken', () => {
    it('returns the token from request_email_verification()', async () => {
      mockRpc.mockResolvedValue({ data: 'abc123token', error: null })
      const result = await requestEmailVerificationToken()
      expect(mockRpc).toHaveBeenCalledWith('request_email_verification')
      expect(result).toEqual({ success: true, token: 'abc123token', error: null })
    })

    it('surfaces RPC errors without throwing', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'Not authenticated' } })
      const result = await requestEmailVerificationToken()
      expect(result.success).toBe(false)
      expect(result.error).toBe('Not authenticated')
    })
  })

  describe('verifyEmailToken', () => {
    it('reports success and the verified email on a valid token', async () => {
      mockRpc.mockResolvedValue({ data: [{ success: true, user_email: 'user@example.com' }], error: null })
      const result = await verifyEmailToken('sometoken')
      expect(mockRpc).toHaveBeenCalledWith('verify_email_token', { p_token: 'sometoken' })
      expect(result).toEqual({ success: true, userEmail: 'user@example.com', error: null })
    })

    it('reports failure for an invalid/expired token', async () => {
      mockRpc.mockResolvedValue({ data: [{ success: false, user_email: null }], error: null })
      const result = await verifyEmailToken('bad-token')
      expect(result.success).toBe(false)
    })
  })

  describe('sendAccountVerificationEmail', () => {
    it('uses a text link, not a visible raw URL', async () => {
      mockSendEmailViaSupabase.mockResolvedValue({ success: true })
      await sendAccountVerificationEmail('user@example.com', 'Jane', 'tok-999')
      const [, , html] = mockSendEmailViaSupabase.mock.calls[0]
      expect(html).toContain('href="')
      expect(html).toContain('/v/tok-999')
      expect(html).toContain('Click to verify your email')
      expect(html).toContain('long-press')
      expect(html).not.toContain('/auth/verify-email?token=')
      expect(html).not.toMatch(/>https?:\/\/[^<]+\/v\/tok-999</)
    })
  })

  describe('buildAccountVerificationLink', () => {
    it('returns a path-style verification URL', () => {
      expect(buildAccountVerificationLink('abc123', 'https://app.example.com')).toBe(
        'https://app.example.com/v/abc123'
      )
    })
  })
})
