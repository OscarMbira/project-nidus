import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getLogoutRedirectPath,
  clearAppSessionCaches,
} from '../authLogoutService'

describe('authLogoutService', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  describe('getLogoutRedirectPath', () => {
    it('returns simulator login for simulator routes', () => {
      expect(getLogoutRedirectPath('/simulator/pm/dashboard')).toBe('/simulator/login')
    })

    it('returns platform login for PM and platform routes', () => {
      expect(getLogoutRedirectPath('/pm/team-members')).toBe('/platform/login')
      expect(getLogoutRedirectPath('/app/project-members')).toBe('/platform/login')
    })
  })

  describe('clearAppSessionCaches', () => {
    it('removes nidus session cache keys', () => {
      sessionStorage.setItem('nidus-internal-user-id:abc', 'x')
      sessionStorage.setItem('nidus-pm-member-mgmt-projects:u1', '[]')
      sessionStorage.setItem('other-key', 'keep')
      clearAppSessionCaches()
      expect(sessionStorage.getItem('nidus-internal-user-id:abc')).toBeNull()
      expect(sessionStorage.getItem('nidus-pm-member-mgmt-projects:u1')).toBeNull()
      expect(sessionStorage.getItem('other-key')).toBe('keep')
    })
  })
})
