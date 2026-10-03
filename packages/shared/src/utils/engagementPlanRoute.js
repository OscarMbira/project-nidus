/** Route key for an engagement plan. */

export function engagementPlanRecordKey(plan) {
  const ref = String(plan?.engagement_reference || '').trim()
  return ref || plan?.id || ''
}

export function engagementPlanEditPath(plan) {
  return `/platform/stakeholders/engagement/edit/${encodeURIComponent(engagementPlanRecordKey(plan))}`
}

export function engagementPlanViewPath(plan) {
  return `/platform/stakeholders/engagement/view/${encodeURIComponent(engagementPlanRecordKey(plan))}`
}
