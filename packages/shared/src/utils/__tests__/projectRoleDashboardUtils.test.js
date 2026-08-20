import { describe, it, expect } from 'vitest'
import { isGovernanceOnlyRole, GOVERNANCE_ONLY_ROLE_KEYS, isGovernanceOnlyFromRoles } from '../projectRoleDashboardUtils'

describe('isGovernanceOnlyRole', () => {
  it('is false with no roles on the project', () => {
    expect(isGovernanceOnlyRole([])).toBe(false)
    expect(isGovernanceOnlyRole(undefined)).toBe(false)
  })

  it('is true when the only role is project_board_member', () => {
    expect(isGovernanceOnlyRole(['project_board_member'])).toBe(true)
  })

  it('is true when the only role is project_sponsor', () => {
    expect(isGovernanceOnlyRole(['project_sponsor'])).toBe(true)
  })

  it('is true when the only role is portfolio_manager', () => {
    expect(isGovernanceOnlyRole(['portfolio_manager'])).toBe(true)
  })

  it('is true when the user holds multiple governance-only roles on the project', () => {
    expect(isGovernanceOnlyRole(['project_board_member', 'project_sponsor'])).toBe(true)
    expect(isGovernanceOnlyRole(['portfolio_manager', 'project_board_member', 'project_sponsor'])).toBe(true)
  })

  it('is false for an operational role like project_manager', () => {
    expect(isGovernanceOnlyRole(['project_manager'])).toBe(false)
  })

  it('is false when a governance role is combined with an operational role — they still need the operational dashboard', () => {
    expect(isGovernanceOnlyRole(['project_board_member', 'project_manager'])).toBe(false)
    expect(isGovernanceOnlyRole(['team_manager', 'project_sponsor'])).toBe(false)
    expect(isGovernanceOnlyRole(['portfolio_manager', 'project_manager'])).toBe(false)
  })

  it('GOVERNANCE_ONLY_ROLE_KEYS contains exactly the three governance-only roles', () => {
    expect(Array.from(GOVERNANCE_ONLY_ROLE_KEYS).sort()).toEqual(['portfolio_manager', 'project_board_member', 'project_sponsor'])
  })
})

describe('isGovernanceOnlyFromRoles (v902 — DB-driven, works for custom org roles too)', () => {
  it('is false with no roles on the project', () => {
    expect(isGovernanceOnlyFromRoles([])).toBe(false)
    expect(isGovernanceOnlyFromRoles(undefined)).toBe(false)
  })

  it('is true when the only role has is_governance_only true', () => {
    expect(isGovernanceOnlyFromRoles([{ is_governance_only: true }])).toBe(true)
  })

  it('is true for a custom org role flagged governance-only, same as a built-in one', () => {
    expect(isGovernanceOnlyFromRoles([{ role_name: 'regional_delivery_lead', is_governance_only: true }])).toBe(true)
  })

  it('is false for an operational role', () => {
    expect(isGovernanceOnlyFromRoles([{ is_governance_only: false }])).toBe(false)
  })

  it('is false when a governance role is combined with an operational role', () => {
    expect(isGovernanceOnlyFromRoles([{ is_governance_only: true }, { is_governance_only: false }])).toBe(false)
  })

  it('treats a missing/undefined flag as not governance-only', () => {
    expect(isGovernanceOnlyFromRoles([{ role_name: 'team_member' }])).toBe(false)
  })
})
