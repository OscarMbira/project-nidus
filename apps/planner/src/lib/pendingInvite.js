/**
 * v1239 Slice 7.2 — remember an invitation token across sign-up / email confirmation, so an
 * invited person joins the inviting workspace instead of getting a new trial workspace.
 * Browser storage is only a convenience here: the token itself is checked by the database.
 */
const KEY = 'nidus:planner:pendingInvite'

export function rememberPendingInvite(token) {
  try { localStorage.setItem(KEY, token) } catch { /* storage blocked */ }
}
export function readPendingInvite() {
  try { return localStorage.getItem(KEY) } catch { return null }
}
export function clearPendingInvite() {
  try { localStorage.removeItem(KEY) } catch { /* storage blocked */ }
}
export function inviteTokenFromPath(path) {
  const m = String(path || '').match(/^\/app\/invite\/([A-Za-z0-9]+)/)
  return m ? m[1] : null
}
