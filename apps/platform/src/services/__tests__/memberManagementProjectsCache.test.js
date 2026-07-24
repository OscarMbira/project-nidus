import { describe, it, expect, beforeEach } from 'vitest'
import {
  readMemberManagementProjectsCache,
  writeMemberManagementProjectsCache,
} from '../projectMembershipService'

describe('member management projects cache', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('round-trips project picker rows', () => {
    const rows = [{ id: 'a', project_name: 'Alpha', project_code: 'PRJ-1' }]
    writeMemberManagementProjectsCache('user-1', rows)
    expect(readMemberManagementProjectsCache('user-1')).toEqual(rows)
  })

  it('returns null for unknown user', () => {
    expect(readMemberManagementProjectsCache('missing')).toBeNull()
  })
})
