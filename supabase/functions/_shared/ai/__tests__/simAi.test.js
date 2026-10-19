// v1272 Phase 3 — AI stakeholders and AI Assessor helpers.
import { describe, expect, it } from 'vitest'
import { clampTrust, eventOutcomeTrustDelta, nextMemory, validateNpcReply, validatePersonalised } from '../simNpc.js'
import { agreement, levelPoints, overallScore, rubricFor, validateAssessment } from '../simAssessor.js'

describe('AI stakeholders', () => {
  it('keeps trust between -100 and 100 and caps message swings at ±10', () => {
    expect(clampTrust(140)).toBe(100)
    expect(clampTrust(-500)).toBe(-100)
    expect(validateNpcReply({ reply: 'Fine.', trust_delta: -40 }).trust_delta).toBe(-10)
    expect(() => validateNpcReply({ reply: '  ' })).toThrow()
  })
  it('moves trust by rule after event decisions', () => {
    expect(eventOutcomeTrustDelta(95, true)).toBe(8)
    expect(eventOutcomeTrustDelta(20)).toBe(-10)
    expect(eventOutcomeTrustDelta(60)).toBe(0)
  })
  it('remembers decisions and counts interactions', () => {
    const m = nextMemory({ trust_score: 95, key_decisions: [], interactions: 2 }, { trustDelta: 10, keyDecision: { text: 'Cut scope' }, at: 't' })
    expect(m).toMatchObject({ trust_score: 100, interactions: 3, key_decisions: [{ text: 'Cut scope', at: 't' }] })
  })
  it('drops personalised wording that is empty or unchanged', () => {
    const ev = { event_name: 'Board pack due', event_description: 'Need update' }
    expect(validatePersonalised({ title: 'Board pack due', description: 'Need update' }, ev)).toBeNull()
    expect(validatePersonalised({ title: 'Board pack for Atlas due', description: 'Sarah needs the Atlas update' }, ev)).toEqual({
      title: 'Board pack for Atlas due', description: 'Sarah needs the Atlas update',
    })
  })
})

describe('AI Assessor', () => {
  const rubric = [
    { criterion_key: 'stakeholders', title: 'Stakeholders', weight: 2, applies_to: 'both' },
    { criterion_key: 'risk', title: 'Risk', weight: 1, applies_to: 'run_end' },
  ]
  it('picks the criteria for the assessment point', () => {
    expect(rubricFor(rubric, 'decision').map((c) => c.criterion_key)).toEqual(['stakeholders'])
    expect(rubricFor(rubric, 'run_end')).toHaveLength(2)
  })
  it('weights levels into an overall score', () => {
    expect(levelPoints(1)).toBe(0)
    expect(levelPoints(4)).toBe(100)
    expect(overallScore([{ criterion_key: 'stakeholders', level: 4 }, { criterion_key: 'risk', level: 1 }], rubric)).toBeCloseTo(66.67, 1)
  })
  it('rejects incomplete assessments and evidence the model was not shown', () => {
    expect(() => validateAssessment({ criteria: [{ criterion_key: 'stakeholders', level: 3, reason: 'ok' }] }, rubric)).toThrow()
    const ok = validateAssessment({
      criteria: [
        { criterion_key: 'stakeholders', level: 3, reason: 'Kept sponsor informed', evidence: [{ type: 'event', id: 'e1' }, { type: 'event', id: 'invented' }] },
        { criterion_key: 'risk', level: 2, reason: 'Few risks logged' },
      ],
    }, rubric, new Set(['e1']))
    expect(ok.criteria[0].evidence.map((e) => e.id)).toEqual(['e1'])
    expect(ok.overall_score).toBeCloseTo(55.56, 1)
  })
  it('measures author agreement within one level', () => {
    expect(agreement([{ criterion_key: 'a', level: 4 }, { criterion_key: 'b', level: 1 }], { a: 3, b: 4 })).toBe(50)
    expect(agreement([{ criterion_key: 'a', level: 2 }], {})).toBeNull()
  })
})

describe('idempotent trust updates', () => {
  it('counts each decision once', async () => {
    const { alreadyCounted } = await import('../simNpc.js')
    const memory = nextMemory({ key_decisions: [] }, { trustDelta: 8, countedEventId: 'e1', keyDecision: { text: 'x', event_id: 'e1' } })
    expect(alreadyCounted(memory, 'e1')).toBe(true)
    expect(alreadyCounted(memory, 'e2')).toBe(false)
  })
})
