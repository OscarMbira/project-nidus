/** Valid ?tab= values for /platform/dashboard */
export const PMO_DASHBOARD_TABS = [
  'overview',
  'portfolio',
  'programmes',
  'projects',
  'alerts',
  'governance',
]

export function normalizeDashboardTab(raw) {
  const v = String(raw || '')
    .toLowerCase()
    .trim()
  if (v === 'programs') return 'programmes'
  if (PMO_DASHBOARD_TABS.includes(v)) return v
  return 'overview'
}
