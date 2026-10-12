/**
 * Remember the paid plan someone picked on the pricing page across sign-up and email
 * confirmation, so they land on checkout for that plan instead of a plain trial workspace.
 * Browser storage is only a convenience: the price is re-read from the catalog and re-checked
 * by the payment webhook.
 */
const KEY = 'nidus:planner:pendingPlan'

export function rememberPendingPlan(planId) {
  try { if (planId) localStorage.setItem(KEY, planId) } catch { /* storage blocked */ }
}
export function readPendingPlan() {
  try { return localStorage.getItem(KEY) } catch { return null }
}
export function clearPendingPlan() {
  try { localStorage.removeItem(KEY) } catch { /* storage blocked */ }
}

/** Where a paid-plan button sends someone. Pure; exported for tests. */
export function planCtaPath(planId, signedIn) {
  const q = `plan=${encodeURIComponent(planId)}`
  return signedIn ? `/app/upgrade?${q}` : `/signup?${q}`
}
