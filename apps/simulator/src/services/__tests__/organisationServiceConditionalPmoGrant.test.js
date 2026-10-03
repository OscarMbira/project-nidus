/**
 * Unit tests for the conditional PMO Admin grant in createOrganisation() (v982 Phase 1,
 * task E/G). Account Owner is always granted; PMO Admin is now conditional on
 * organisationData.type / wantsPmoAdmin instead of unconditional. Exercises all
 * type x wantsPmoAdmin combinations the plan calls out, plus the pre-v982
 * backward-compat case (wantsPmoAdmin not passed at all).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.hoisted(() => vi.fn())
const mockFrom = vi.hoisted(() => vi.fn())
const mockAssignSystemRole = vi.hoisted(() => vi.fn())

vi.mock('../supabase/supabaseClient', () => ({
  platformDb: {
    auth: { getUser: (...args) => mockGetUser(...args) },
    from: (...args) => mockFrom(...args),
  },
}))

vi.mock('../roleService', () => ({
  assignSystemRole: (...args) => mockAssignSystemRole(...args),
}))

vi.mock('../registrationEmailService', () => ({
  sendOrganisationVerificationEmail: vi.fn().mockResolvedValue({ success: true }),
}))

const { createOrganisation } = await import('../organisationService')

/** A minimal chainable Supabase query-builder mock resolving to `result` at the terminal call. */
function chainable(result) {
  const obj = {}
  const self = () => obj
  obj.select = vi.fn(self)
  obj.eq = vi.fn(self)
  obj.insert = vi.fn(self)
  obj.update = vi.fn(self)
  obj.single = vi.fn(() => Promise.resolve(result))
  obj.maybeSingle = vi.fn(() => Promise.resolve(result))
  return obj
}

const AUTH_USER = { id: 'auth-user-1', email: 'owner@example.com' }
const USER_ROW = { data: { id: 'db-user-1' }, error: null }
const NO_EXISTING_ORG = { data: null, error: null }
const NEW_ORG_ROW = {
  data: { id: 'org-1', account_name: 'Acme', account_code: 'ACME1234', owner_user_id: 'db-user-1' },
  error: null,
};
const VERIFIED_ORG_ROW = {
  data: { id: 'org-1', account_name: 'Acme', account_code: 'ACME1234', owner_user_id: 'db-user-1', organisation_verified: true },
  error: null,
};

/** Wires the 4-call sequence createOrganisation()'s "create new" branch makes. */
function mockCreatePath() {
  mockGetUser.mockResolvedValue({ data: { user: AUTH_USER }, error: null })
  mockFrom
    .mockReturnValueOnce(chainable(USER_ROW))       // users lookup
    .mockReturnValueOnce(chainable(NO_EXISTING_ORG)) // existing-org check
    .mockReturnValueOnce(chainable(NEW_ORG_ROW))     // insert
    .mockReturnValueOnce(chainable(VERIFIED_ORG_ROW)) // mark-verified update
}

describe('createOrganisation — conditional PMO Admin grant', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAssignSystemRole.mockResolvedValue({ success: true, error: null })
  })

  it('always grants account_owner regardless of type/wantsPmoAdmin', async () => {
    mockCreatePath()
    await createOrganisation({ name: 'Acme', type: 'business', country: 'US', wantsPmoAdmin: false })
    expect(mockAssignSystemRole).toHaveBeenCalledWith(AUTH_USER.id, 'account_owner')
  })

  it('individual + wantsPmoAdmin=false -> still grants pmo_admin (no one else exists to hold it)', async () => {
    mockCreatePath()
    await createOrganisation({ name: 'Solo', type: 'individual', country: 'US', wantsPmoAdmin: false })
    expect(mockAssignSystemRole).toHaveBeenCalledWith(AUTH_USER.id, 'pmo_admin')
  })

  it('freelancer + wantsPmoAdmin=false -> still grants pmo_admin', async () => {
    mockCreatePath()
    await createOrganisation({ name: 'Freelance Co', type: 'freelancer', country: 'US', wantsPmoAdmin: false })
    expect(mockAssignSystemRole).toHaveBeenCalledWith(AUTH_USER.id, 'pmo_admin')
  })

  it('business + wantsPmoAdmin=true -> grants pmo_admin', async () => {
    mockCreatePath()
    await createOrganisation({ name: 'Acme', type: 'business', country: 'US', wantsPmoAdmin: true })
    expect(mockAssignSystemRole).toHaveBeenCalledWith(AUTH_USER.id, 'pmo_admin')
  })

  it('business + wantsPmoAdmin=false -> does NOT grant pmo_admin', async () => {
    mockCreatePath()
    await createOrganisation({ name: 'Acme', type: 'business', country: 'US', wantsPmoAdmin: false })
    expect(mockAssignSystemRole).not.toHaveBeenCalledWith(AUTH_USER.id, 'pmo_admin')
    // account_owner is still the only role granted
    expect(mockAssignSystemRole).toHaveBeenCalledTimes(1)
  })

  it('company + wantsPmoAdmin=false -> does NOT grant pmo_admin', async () => {
    mockCreatePath()
    await createOrganisation({ name: 'Acme Ltd', type: 'company', country: 'US', wantsPmoAdmin: false })
    expect(mockAssignSystemRole).not.toHaveBeenCalledWith(AUTH_USER.id, 'pmo_admin')
  })

  it('company + wantsPmoAdmin=true -> grants pmo_admin', async () => {
    mockCreatePath()
    await createOrganisation({ name: 'Acme Ltd', type: 'company', country: 'US', wantsPmoAdmin: true })
    expect(mockAssignSystemRole).toHaveBeenCalledWith(AUTH_USER.id, 'pmo_admin')
  })

  it('pre-v982 caller (wantsPmoAdmin omitted entirely) -> preserves old unconditional grant', async () => {
    mockCreatePath()
    await createOrganisation({ name: 'Acme Ltd', type: 'company', country: 'US' })
    expect(mockAssignSystemRole).toHaveBeenCalledWith(AUTH_USER.id, 'pmo_admin')
  })
})
