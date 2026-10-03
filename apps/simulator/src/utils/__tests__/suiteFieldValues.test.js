import { describe, it, expect } from 'vitest'
import {
  tagsToMultiline,
  multilineToTags,
  environmentIdsFromSuite,
  legacyEnvironmentLabel,
} from '../suiteFieldValues'

describe('suiteFieldValues', () => {
  it('turns a tag array into a newline list and back', () => {
    expect(tagsToMultiline(['seed354', 'smoke'])).toBe('seed354\nsmoke')
    expect(multilineToTags('seed354\nsmoke')).toEqual(['seed354', 'smoke'])
  })

  it('splits a legacy comma-separated tag string', () => {
    expect(tagsToMultiline('seed354, smoke')).toBe('seed354\nsmoke')
  })

  it('keeps stored environment ids and falls back to the legacy name', () => {
    const options = [{ id: 'env-1', name: 'dev' }, { id: 'env-2', name: 'uat' }]
    expect(environmentIdsFromSuite({ environment_ids: ['env-2'], environment: 'dev' }, options)).toEqual(['env-2'])
    expect(environmentIdsFromSuite({ environment: 'dev' }, options)).toEqual(['env-1'])
    expect(legacyEnvironmentLabel(['env-1', 'env-2'], options)).toBe('dev, uat')
  })
})
