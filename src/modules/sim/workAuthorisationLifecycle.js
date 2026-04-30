/**
 * Lifecycle embedding helpers — Simulator (practice projects)
 */

import { hasApprovedActionForLifecycle } from '../../services/simWorkAuthorisationService'

export async function assertPracticeLifecycleAuthorisation(practiceProjectId, actionType) {
  if (!practiceProjectId || !actionType) {
    return { ok: false, authorised: false, message: 'Missing practice project or action type' }
  }
  const { success, data } = await hasApprovedActionForLifecycle(practiceProjectId, actionType)
  if (!success) {
    return { ok: false, authorised: false, message: 'Could not verify authorisation' }
  }
  return { ok: true, authorised: data === true }
}
