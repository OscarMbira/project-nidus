/** Route keys for a communication plan and the stakeholder it is opened for. */

export function communicationPlanRecordKey(plan) {
  const ref = String(plan?.plan_reference || '').trim()
  return ref || plan?.id || ''
}

export function stakeholderRecordKey(person) {
  const ref = String(person?.stakeholder_reference || '').trim()
  return ref || person?.id || ''
}

export function findStakeholderByRouteKey(stakeholders, key) {
  const wanted = String(key || '').trim().toLowerCase()
  if (!wanted) return null
  return (stakeholders || []).find((person) =>
    String(person?.id || '').toLowerCase() === wanted
    || String(person?.stakeholder_reference || '').trim().toLowerCase() === wanted
  ) || null
}

export function communicationPlanHref(action, plan, person) {
  const planKey = encodeURIComponent(communicationPlanRecordKey(plan))
  const personKey = person ? stakeholderRecordKey(person) : ''
  return {
    pathname: `/platform/stakeholders/communications/${action}/${planKey}`,
    search: personKey ? `?stakeholderId=${encodeURIComponent(personKey)}` : '',
  }
}

export function communicationPlanChooserHref(plan) {
  return `/platform/stakeholders/communications/${encodeURIComponent(communicationPlanRecordKey(plan))}/stakeholders`
}
