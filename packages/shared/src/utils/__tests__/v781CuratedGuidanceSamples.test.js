import { describe, it, expect } from 'vitest'
import samples from './fixtures/v781_curated_guidance_samples.json'

const BOILERPLATE = [
  /Briefly complete/i,
  /understood offline without system context/i,
  /Align with organisational standards/i,
]

describe('v781 curated offline guidance samples', () => {
  it('includes F004 and F050 field guidance', () => {
    expect(Object.keys(samples.F004).length).toBeGreaterThanOrEqual(7)
    expect(Object.keys(samples.F050).length).toBeGreaterThanOrEqual(7)
  })

  it('F004 stakeholder_name is field-specific (not boilerplate)', () => {
    const help = samples.F004.stakeholder_name.help
    expect(help).toMatch(/stakeholder/i)
    expect(help).toMatch(/name/i)
    for (const re of BOILERPLATE) expect(help).not.toMatch(re)
  })

  it('F050 change_id explains unique identifier usage', () => {
    const help = samples.F050.change_id.help
    expect(help).toMatch(/change/i)
    expect(help).toMatch(/identif/i)
    for (const re of BOILERPLATE) expect(help).not.toMatch(re)
  })

  it('no curated sample help matches banned boilerplate patterns', () => {
    for (const code of Object.keys(samples)) {
      for (const [key, row] of Object.entries(samples[code])) {
        for (const re of BOILERPLATE) {
          expect(row.help, `${code}.${key}`).not.toMatch(re)
        }
        expect(String(row.help).trim().length, `${code}.${key}`).toBeGreaterThan(20)
        expect(String(row.sample || '').trim().length, `${code}.${key} sample`).toBeGreaterThan(0)
      }
    }
  })
})
