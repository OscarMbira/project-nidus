// v1272 Phase 2b — meaning search helpers.
import { describe, expect, it } from 'vitest'
import { cosine, DUPLICATE_MIN_MEANING, guessLanguage, isDuplicateCandidate, recallAtK, toVectorLiteral } from '../embedding.js'

describe('toVectorLiteral', () => {
  it('formats 384 numbers and rejects anything else', () => {
    const lit = toVectorLiteral(new Array(384).fill(0.5))
    expect(lit.startsWith('[0.5,0.5')).toBe(true)
    expect(lit.split(',')).toHaveLength(384)
    expect(() => toVectorLiteral([1, 2])).toThrow()
    expect(() => toVectorLiteral(new Array(384).fill(Number.NaN))).toThrow()
  })
})

describe('guessLanguage', () => {
  it('tells English from other languages, and stays quiet on short text', () => {
    expect(guessLanguage('The supplier will deliver the steel late and we need a plan for the delay')).toBe('en')
    expect(guessLanguage('Le fournisseur livrera l’acier en retard et nous devons prévoir un plan')).toBe('other')
    expect(guessLanguage('Steel late')).toBeNull()
  })
})

describe('duplicates and recall', () => {
  it('needs a high meaning score unless keywords or the reference match', () => {
    expect(isDuplicateCandidate({ similarity: DUPLICATE_MIN_MEANING + 0.01 })).toBe(true)
    expect(isDuplicateCandidate({ similarity: 0.7 })).toBe(false)
    expect(isDuplicateCandidate({ similarity: 0.7, keyword_similarity: 0.2 })).toBe(true)
    expect(isDuplicateCandidate({ matched: 'reference' })).toBe(true)
  })
  it('computes cosine similarity and recall@k', () => {
    expect(cosine([1, 0], [1, 0])).toBe(1)
    expect(cosine([1, 0], [0, 1])).toBe(0)
    expect(recallAtK([{ expected: 'a', ranked: ['x', 'a'] }, { expected: 'b', ranked: ['x', 'y'] }], 5)).toBe(0.5)
  })
})
