import { describe, it, expect } from 'vitest'
import {
  TEST_EVIDENCE_REQUIREMENT,
  resolveTestEvidenceRequirement,
  isEvidenceGateBlocking,
  canRemoveTestEvidence,
} from '../testEvidenceRequirement.js'

describe('resolveTestEvidenceRequirement (PRD v1204 stories 7–9)', () => {
  it('uses the project override when one is set', () => {
    expect(
      resolveTestEvidenceRequirement({ projectValue: 'required', accountDefault: 'optional' }),
    ).toBe('required')
  })

  it('falls back to the organisation default when the project has no override', () => {
    expect(
      resolveTestEvidenceRequirement({ projectValue: null, accountDefault: 'required' }),
    ).toBe('required')
  })

  it('treats a missing project value and a missing org default as optional', () => {
    expect(resolveTestEvidenceRequirement({ projectValue: null, accountDefault: null })).toBe('optional')
    expect(resolveTestEvidenceRequirement({})).toBe('optional')
  })

  it('ignores unknown values and falls through to the next level', () => {
    expect(
      resolveTestEvidenceRequirement({ projectValue: 'maybe', accountDefault: 'required' }),
    ).toBe('required')
  })
})

describe('isEvidenceGateBlocking (PRD stories 5–6)', () => {
  it('blocks a Passed result with no files when evidence is required', () => {
    expect(
      isEvidenceGateBlocking({ status: 'passed', requirement: TEST_EVIDENCE_REQUIREMENT.REQUIRED, fileCount: 0 }),
    ).toBe(true)
  })

  it('allows a Passed result with no files when evidence is optional', () => {
    expect(
      isEvidenceGateBlocking({ status: 'passed', requirement: TEST_EVIDENCE_REQUIREMENT.OPTIONAL, fileCount: 0 }),
    ).toBe(false)
  })

  it('allows a required Passed result once at least one file is attached', () => {
    expect(
      isEvidenceGateBlocking({ status: 'passed', requirement: TEST_EVIDENCE_REQUIREMENT.REQUIRED, fileCount: 1 }),
    ).toBe(false)
  })

  it('never blocks a Failed, Blocked or Skipped result', () => {
    for (const status of ['failed', 'blocked', 'skipped', 'pending']) {
      expect(
        isEvidenceGateBlocking({ status, requirement: TEST_EVIDENCE_REQUIREMENT.REQUIRED, fileCount: 0 }),
      ).toBe(false)
    }
  })
})

describe('canRemoveTestEvidence (PRD stories 3, 4, 16)', () => {
  const base = { runClosed: false, isUploader: true, isProjectManager: false }

  it('lets the uploader remove a file while the run is open', () => {
    expect(canRemoveTestEvidence(base)).toBe(true)
  })

  it('stops the uploader removing a file once the run is closed', () => {
    expect(canRemoveTestEvidence({ ...base, runClosed: true })).toBe(false)
  })

  it('lets a Project Manager remove any file, open or closed', () => {
    expect(canRemoveTestEvidence({ runClosed: true, isUploader: false, isProjectManager: true })).toBe(true)
    expect(canRemoveTestEvidence({ runClosed: false, isUploader: false, isProjectManager: true })).toBe(true)
  })

  it('refuses a non-uploader who is not a Project Manager', () => {
    expect(canRemoveTestEvidence({ runClosed: false, isUploader: false, isProjectManager: false })).toBe(false)
  })
})
