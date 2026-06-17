/**
 * Menu items excluded from PMO layout sidebars (v710).
 * Team-member / team-lead assigned work packages are not PMO responsibilities.
 */

export const PMO_EXCLUDED_ASSIGNED_WORK_PACKAGE_CODES = new Set([
  'plat_tm_work_packages',
  'plat_tm_s_work_packages_ro',
  'plat_tl_work_packages',
])

/** Phase template shortcuts duplicate PMBOK Process Group Forms — reachable via Template Hub only. */
export const PMO_HIDDEN_PROCESS_TEMPLATE_PHASE_CODES = new Set([
  'plat_pt_initiating',
  'plat_pt_planning',
  'plat_pt_executing',
  'plat_pt_mc',
  'plat_pt_closing',
  'plat_pt_browse',
  'pmo_pt_init',
  'pmo_pt_plan',
  'pmo_pt_exec',
  'pmo_pt_mon',
  'pmo_pt_close',
])

export function isHiddenProcessTemplatePhaseNode(node) {
  const code = String(node?.menu_code || '').trim().toLowerCase()
  if (PMO_HIDDEN_PROCESS_TEMPLATE_PHASE_CODES.has(code)) return true

  const path = String(node?.route_path || '').toLowerCase()
  if (
    /\/process-templates\/(initiating|planning|executing|monitoring|closing|monitoring-controlling)(\/|\?|$)/.test(
      path
    )
  ) {
    return true
  }

  return false
}

export function isExcludedPmoAssignedWorkPackageNode(node) {
  const code = String(node?.menu_code || '').trim().toLowerCase()
  if (PMO_EXCLUDED_ASSIGNED_WORK_PACKAGE_CODES.has(code)) return true

  const label = String(node?.menu_label || '').toLowerCase()
  const path = String(node?.route_path || '').toLowerCase()
  if (!/\/pm\/delivery\/work-packages/.test(path)) return false

  if (/^plat_tm_/.test(code) || /^plat_tl_/.test(code)) return true
  if (/my work packages|work packages \(assigned|assigned to me\)/.test(label)) return true

  return false
}

export function filterExcludedPmoLayoutMenuItems(items = []) {
  const walk = (nodes) =>
    (nodes || [])
      .filter((node) => !isExcludedPmoAssignedWorkPackageNode(node) && !isHiddenProcessTemplatePhaseNode(node))
      .map((node) => {
        const children = walk(node.children)
        return { ...node, children }
      })
      .filter((node) => {
        if (node?.is_methodology_header) return true
        const hasRoute = Boolean(String(node?.route_path || '').trim())
        const hasChildren = (node.children || []).length > 0
        return hasRoute || hasChildren
      })

  return walk(items)
}
