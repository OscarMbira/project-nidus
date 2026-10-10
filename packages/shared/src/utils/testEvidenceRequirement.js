/**
 * Passed-test evidence rules (PRD v1204, Platform + Simulator).
 * Pure functions only — the apps read the stored values and pass them in.
 */

export const TEST_EVIDENCE_REQUIREMENT = Object.freeze({
  OPTIONAL: 'optional',
  REQUIRED: 'required',
})

const VALID = new Set(Object.values(TEST_EVIDENCE_REQUIREMENT))

/**
 * Project override wins, then the organisation default, then optional.
 * Unknown values are ignored so they fall through to the next level.
 */
export function resolveTestEvidenceRequirement({ projectValue, accountDefault } = {}) {
  if (VALID.has(projectValue)) return projectValue
  if (VALID.has(accountDefault)) return accountDefault
  return TEST_EVIDENCE_REQUIREMENT.OPTIONAL
}

/** True when the result cannot be saved as Passed yet (required evidence, no files). */
export function isEvidenceGateBlocking({ status, requirement, fileCount = 0 }) {
  return (
    status === 'passed' &&
    requirement === TEST_EVIDENCE_REQUIREMENT.REQUIRED &&
    fileCount === 0
  )
}

/**
 * Uploader may remove until the run closes; a Project Manager may remove at any time.
 */
export function canRemoveTestEvidence({ runClosed = false, isUploader = false, isProjectManager = false } = {}) {
  if (isProjectManager) return true
  return Boolean(isUploader) && !runClosed
}
