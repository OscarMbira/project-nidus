import { describe, expect, it } from 'vitest'
import {
  parseRoleSkillsLinks,
  serializeRoleSkillsLinks,
  validateRoleSkillsLinks,
  parseSkillsLines,
} from '../roleSkillsUtils.js'

describe('roleSkillsUtils', () => {
  it('round-trips role ↔ skills associations', () => {
    const rows = [
      { role: 'Developer', skills: 'React\nTypeScript' },
      { role: 'Tester', skills: 'Selenium' },
    ]
    const stored = serializeRoleSkillsLinks(rows)
    expect(parseRoleSkillsLinks(stored)).toEqual(rows)
  })

  it('rejects role without skills', () => {
    const res = validateRoleSkillsLinks([{ role: 'Developer', skills: '' }])
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/at least one required skill/i)
  })

  it('accepts valid associations', () => {
    const res = validateRoleSkillsLinks([{ role: 'Developer', skills: 'React\n\nSQL' }])
    expect(res.ok).toBe(true)
    expect(parseSkillsLines(res.rows[0].skills)).toEqual(['React', 'SQL'])
  })

  it('parseSkillsLines yields display list for task role skills (v1104)', () => {
    expect(parseSkillsLines(null)).toEqual([])
    expect(parseSkillsLines('')).toEqual([])
    expect(parseSkillsLines('React\nTypeScript\n')).toEqual(['React', 'TypeScript'])
  })
  it('rejects duplicate role names', () => {
    const res = validateRoleSkillsLinks([
      { role: 'Developer', skills: 'A' },
      { role: 'developer', skills: 'B' },
    ])
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/unique/i)
  })
})
