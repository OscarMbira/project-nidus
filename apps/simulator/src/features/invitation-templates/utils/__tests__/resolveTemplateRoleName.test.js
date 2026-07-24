import { describe, it, expect } from 'vitest'
import { resolveTemplateRoleName } from '../resolveTemplateRoleName'

describe('resolveTemplateRoleName', () => {
  it('maps legacy pm_ role names to template keys', () => {
    expect(resolveTemplateRoleName('pm_team_member')).toBe('team_member')
    expect(resolveTemplateRoleName('project_manager')).toBe('project_manager')
  })

  it('returns empty string for blank input', () => {
    expect(resolveTemplateRoleName('')).toBe('')
  })
})
