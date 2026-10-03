export function stakeholderTypeBadgeClass(type) {
  switch ((type || '').toLowerCase()) {
    case 'internal':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
    case 'external':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
    case 'customer':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    case 'supplier':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
    case 'regulator':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  }
}

export function linesToArray(value) {
  return String(value || '').split('\n').map((line) => line.trim()).filter(Boolean)
}

export function audienceStakeholders(stakeholders, groups) {
  const needles = (groups || []).map((group) => String(group || '').trim().toLowerCase()).filter(Boolean)
  if (!needles.length) return []
  return (stakeholders || []).filter((person) => {
    const name = String(person.stakeholder_name || '').trim().toLowerCase()
    const blob = [person.stakeholder_name, person.stakeholder_role, person.project_role, person.stakeholder_title]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return needles.some((needle) => blob.includes(needle) || (name && needle.includes(name)))
  }).sort((a, b) => String(a.stakeholder_name || '').localeCompare(String(b.stakeholder_name || ''), undefined, { sensitivity: 'base' }))
}

export function planAudienceGroups(plan) {
  const fromArray = Array.isArray(plan?.target_stakeholder_groups) ? plan.target_stakeholder_groups : []
  const fromText = linesToArray(plan?.stakeholder_communication_requirements)
  const seen = new Set()
  const groups = []
  for (const item of [...fromArray, ...fromText]) {
    const label = String(item || '').trim()
    const key = label.toLowerCase()
    if (!label || seen.has(key)) continue
    seen.add(key)
    groups.push(label)
  }
  return groups
}

export function audienceForPlan(plan, stakeholders) {
  return audienceStakeholders(stakeholders, planAudienceGroups(plan))
}

export function groupsMatchingPerson(person, groups) {
  return (groups || []).filter((group) => audienceStakeholders([person], [group]).length > 0)
}

/** Same briefing copied into a second row (name, dates, and status match). */
export function duplicatePlanKey(plan) {
  return [
    plan?.project_id || '',
    String(plan?.plan_name || '').trim().toLowerCase(),
    String(plan?.plan_start_date || '').slice(0, 10),
    String(plan?.plan_end_date || '').slice(0, 10),
    String(plan?.plan_status || '').trim().toLowerCase(),
  ].join('|')
}

export function unionPlanGroups(plans) {
  const seen = new Set()
  const groups = []
  for (const plan of plans || []) {
    for (const group of planAudienceGroups(plan)) {
      const key = group.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      groups.push(group)
    }
  }
  return groups
}
