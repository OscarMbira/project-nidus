import { describe, it, expect } from 'vitest'
import {
  assertCanEditTargetRole,
  canAccessAdminRoleMenuPage,
  canAccessPmoRoleMenuPage,
  filterPlatformMenuItems,
} from '../menuManagementService'

describe('menuManagementService helpers', () => {
  it('filterPlatformMenuItems keeps platform routes and parents without path', () => {
    const rows = [
      { id: '1', route_path: '/platform/dashboard' },
      { id: '2', route_path: '' },
      { id: '3', route_path: '/simulator/foo' },
      { id: '4', route_path: '/pmo/governance/mandate' },
      { id: '5', route_path: '/admin/security' },
    ]
    const out = filterPlatformMenuItems(rows)
    expect(out.map((r) => r.id).sort()).toEqual(['1', '2', '4', '5'])
  })

  it('assertCanEditTargetRole allows system admin editor for any target', () => {
    expect(() =>
      assertCanEditTargetRole(
        'pmo',
        { role_name: 'system_admin', role_level: 100 },
        { isSystemAdmin: true, pmoRoleLevel: 80 },
      ),
    ).not.toThrow()
  })

  it('assertCanEditTargetRole blocks PMO editor from system admin role', () => {
    expect(() =>
      assertCanEditTargetRole(
        'pmo',
        { role_name: 'system_admin', role_level: 100 },
        { isSystemAdmin: false, pmoRoleLevel: 80 },
      ),
    ).toThrow(/system admin role/i)
  })

  it('assertCanEditTargetRole blocks PMO editor from higher role_level', () => {
    expect(() =>
      assertCanEditTargetRole(
        'pmo',
        { role_name: 'account_owner', role_level: 90 },
        { isSystemAdmin: false, pmoRoleLevel: 80 },
      ),
    ).toThrow(/authority/i)
  })

  it('canAccessPmoRoleMenuPage', () => {
    expect(canAccessPmoRoleMenuPage({ authenticated: true, isSystemAdmin: true, pmoRoleLevel: null })).toBe(
      true,
    )
    expect(canAccessPmoRoleMenuPage({ authenticated: true, isSystemAdmin: false, pmoRoleLevel: 80 })).toBe(
      true,
    )
    expect(canAccessPmoRoleMenuPage({ authenticated: true, isSystemAdmin: false, pmoRoleLevel: null })).toBe(
      false,
    )
  })

  it('canAccessAdminRoleMenuPage requires system admin', () => {
    expect(canAccessAdminRoleMenuPage({ authenticated: true, isSystemAdmin: true })).toBe(true)
    expect(canAccessAdminRoleMenuPage({ authenticated: true, isSystemAdmin: false, pmoRoleLevel: 80 })).toBe(
      false,
    )
  })
})
