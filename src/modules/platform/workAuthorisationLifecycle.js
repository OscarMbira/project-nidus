/**
 * Lifecycle embedding helpers — call before governed transitions (Platform).
 * Uses DB RPC work_authorisation_has_approved_action when available.
 */

import { hasApprovedActionForLifecycle } from '../../services/workAuthorisationService'

/**
 * @param {string} projectId
 * @param {string} actionType — same convention as work_authorisations.action_type
 * @returns {Promise<{ ok: boolean, authorised: boolean, message?: string }>}
 */
export async function assertLifecycleAuthorisation(projectId, actionType) {
  if (!projectId || !actionType) {
    return { ok: false, authorised: false, message: 'Missing project or action type' }
  }
  const { success, data } = await hasApprovedActionForLifecycle(projectId, actionType)
  if (!success) {
    return { ok: false, authorised: false, message: 'Could not verify authorisation' }
  }
  return { ok: true, authorised: data === true }
}
