/**
 * Pure transition helpers for tests and UI hints (status labels only).
 */

export const PLATFORM_STATUSES = [
  'draft',
  'in_review',
  'approved',
  'rejected',
  'deferred',
  'suspended',
  'executed',
  'closed',
  'cancelled',
]

/** @param {string} status */
export function isTerminalStatus(status) {
  return ['rejected', 'closed', 'cancelled'].includes(status)
}

/** @param {string} status */
export function canEditDraft(status) {
  return status === 'draft'
}
