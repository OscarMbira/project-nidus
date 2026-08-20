/**
 * Sidebar hierarchy normalisation (v671 / v676 / v677).
 * Buckets orphan roots under category rows when DB parent links are missing.
 */
import { MENU_REGISTRY } from './menuRegistry'
import {
  DELIVERY_MANAGEMENT_SUB_DEFS,
  PMO_CATEGORY_DEFS,
  PM_CATEGORY_DEFS,
  resolveRegistryCategoryId,
} from './pmoSidebarCategories'
import { METHODOLOGY_TRACK_CATEGORY_DEFS } from './methodologyMenuUtils'
import {
  V671_CATEGORY_NESTING,
  getV671CanonicalLeaves,
} from './v671PmoMenuCanonical.js'
import {
  dedupePmoMenuTree,
  executiveDashboardSemanticKey,
  pickPreferredPmoMenuLeaf,
  pmoMenuNodeDedupeKey,
} from './pmoMenuSemanticDedupe.js'

/** Human labels for category rows when DB still stores menu_code as menu_label. */
const CATEGORY_PRESENTATION_LABELS = new Map([
  ...PMO_CATEGORY_DEFS.map((c) => [c.id, c.label]),
  ...PM_CATEGORY_DEFS.map((c) => [c.id, c.label]),
  ...METHODOLOGY_TRACK_CATEGORY_DEFS.map((c) => [c.id, c.label]),
])

function menuNodeShell(partial = {}) {
  return {
    route_path: null,
    is_visible: true,
    is_active: true,
    canUse: true,
    children: [],
    ...partial,
  }
}

/** v671 §5.1.1 — canonical Executive Overview + Project Delivery leaves (DB gap-fill). */
const V671_CANONICAL_EXEC = {
  pmo: {
    dashboard: [
      menuNodeShell({
        menu_code: 'pmo_dashboard',
        menu_label: 'Dashboard',
        route_path: '/platform/dashboard',
        menu_icon: 'layout-dashboard',
        sort_order: 1,
      }),
    ],
    portfolio: [
      menuNodeShell({
        menu_code: 'pmo-pp-overview',
        menu_label: 'Portfolio Overview',
        route_path: '/platform/portfolio',
        menu_icon: 'briefcase',
        sort_order: 1,
      }),
      menuNodeShell({
        menu_code: 'pmo-pp-dependencies',
        menu_label: 'Portfolio Dependencies',
        route_path: '/platform/portfolio/dependencies',
        menu_icon: 'git-branch',
        sort_order: 2,
      }),
      menuNodeShell({
        menu_code: 'pmo-pp-collisions',
        menu_label: 'Portfolio Collisions',
        route_path: '/pmo/planning/collisions',
        menu_icon: 'alert-triangle',
        sort_order: 3,
      }),
    ],
    programme: [
      menuNodeShell({
        menu_code: 'pmo-pp-programme',
        menu_label: 'Programme Management',
        route_path: '/platform/programme',
        menu_icon: 'layers',
        sort_order: 1,
      }),
      menuNodeShell({
        menu_code: 'pmo-pp-benefits',
        menu_label: 'Benefits Management',
        route_path: '/platform/benefits',
        menu_icon: 'trending-up',
        sort_order: 2,
      }),
    ],
    planning: [
      menuNodeShell({
        menu_code: 'pmo-planning-hub',
        menu_label: 'Planning Hub',
        route_path: '/pmo/planning',
        menu_icon: 'layout-dashboard',
        sort_order: 1,
      }),
      menuNodeShell({
        menu_code: 'pmo-planning-intelligence',
        menu_label: 'Intelligence Rules',
        route_path: '/pmo/planning/intelligence-rules',
        menu_icon: 'search-code',
        sort_order: 2,
      }),
      menuNodeShell({
        menu_code: 'pmo-planning-governance-config',
        menu_label: 'Governance Rules Configuration',
        route_path: '/pmo/planning/governance-rules',
        menu_icon: 'shield-check',
        sort_order: 3,
      }),
    ],
  },
  sim_pmo: {
    dashboard: [
      menuNodeShell({
        menu_code: 'sim_pmo_dashboard',
        menu_label: 'Practice Dashboard',
        route_path: '/simulator/pmo/dashboard',
        menu_icon: 'layout-dashboard',
        sort_order: 1,
      }),
    ],
    portfolio: [
      menuNodeShell({
        menu_code: 'sim-pmo-pp-dependencies',
        menu_label: 'Portfolio Dependencies',
        route_path: '/simulator/practice-dependencies',
        menu_icon: 'git-branch',
        sort_order: 1,
      }),
      menuNodeShell({
        menu_code: 'sim-pmo-pp-collisions',
        menu_label: 'Portfolio Collisions',
        route_path: '/simulator/pmo/planning/collisions',
        menu_icon: 'alert-triangle',
        sort_order: 2,
      }),
    ],
    programme: [
      menuNodeShell({
        menu_code: 'sim-pmo-pp-programme',
        menu_label: 'Programme Management',
        route_path: '/simulator/practice-programme',
        menu_icon: 'layers',
        sort_order: 1,
      }),
      menuNodeShell({
        menu_code: 'sim-pmo-pp-benefits',
        menu_label: 'Benefits Management',
        route_path: '/simulator/benefits',
        menu_icon: 'trending-up',
        sort_order: 2,
      }),
    ],
    planning: [
      menuNodeShell({
        menu_code: 'sim_pmo_planning_hub',
        menu_label: 'Planning Hub',
        route_path: '/simulator/pmo/planning',
        menu_icon: 'layout-dashboard',
        sort_order: 1,
      }),
      menuNodeShell({
        menu_code: 'sim_pmo_planning_intelligence',
        menu_label: 'Intelligence Rules',
        route_path: '/simulator/pmo/planning/intelligence',
        menu_icon: 'search-code',
        sort_order: 2,
      }),
      menuNodeShell({
        menu_code: 'sim_pmo_planning_governance_config',
        menu_label: 'Governance Rules Config',
        route_path: '/simulator/pmo/planning/governance-config',
        menu_icon: 'shield-check',
        sort_order: 3,
      }),
    ],
  },
}

const V671_CANONICAL_DELIVERY = {
  pmo: {
    projects: [
      menuNodeShell({ menu_code: 'pmo-pr-project-dashboard', menu_label: 'Project Dashboard', route_path: '/platform/dashboard?tab=projects', menu_icon: 'layout-dashboard', sort_order: 1 }),
      menuNodeShell({ menu_code: 'pmo-pr-my-projects', menu_label: 'My Projects', route_path: '/platform/projects', menu_icon: 'folder-kanban', sort_order: 2 }),
      menuNodeShell({ menu_code: 'pmo-pp-project-list', menu_label: 'All Projects', route_path: '/platform/projects/all', menu_icon: 'briefcase', sort_order: 3 }),
      menuNodeShell({ menu_code: 'pmo-pp-create-project', menu_label: 'Create Project', route_path: '/platform/projects/create', menu_icon: 'file-plus', sort_order: 4 }),
      menuNodeShell({ menu_code: 'pmo-pr-quick-create', menu_label: 'Quick Create', route_path: '/platform/projects/new', menu_icon: 'file-plus', sort_order: 5 }),
      menuNodeShell({ menu_code: 'pmo-pp-archives', menu_label: 'Archived Projects', route_path: '/platform/projects/archives', menu_icon: 'package-open', sort_order: 6 }),
      menuNodeShell({ menu_code: 'pmo-pp-on-hold', menu_label: 'On Hold / Drafts', route_path: '/app/projects/on-hold', menu_icon: 'pause', sort_order: 7 }),
      menuNodeShell({ menu_code: 'pmo-pr-members-roles', menu_label: 'Members & Roles', route_path: '/app/project-members', menu_icon: 'users', sort_order: 8 }),
      menuNodeShell({ menu_code: 'pmo-pr-my-daily-log', menu_label: 'My Daily Log', route_path: '/app/daily-log/my-entries', menu_icon: 'book-open', sort_order: 9 }),
      menuNodeShell({ menu_code: 'pmo-pr-story-map', menu_label: 'Story Map', route_path: '/platform/projects/:projectId/scrum/story-map', menu_icon: 'map', sort_order: 10 }),
      menuNodeShell({ menu_code: 'pmo-pr-releases', menu_label: 'Releases', route_path: '/platform/projects/:projectId/scrum/releases', menu_icon: 'rocket', sort_order: 11 }),
    ],
    oversight: [
      menuNodeShell({ menu_code: 'pmo-oversight-risk-register', menu_label: 'Risk Register', route_path: '/pmo/oversight/risk-register', menu_icon: 'alert-triangle', sort_order: 1 }),
      menuNodeShell({ menu_code: 'pmo-oversight-issue-register', menu_label: 'Issue Register', route_path: '/pmo/oversight/issue-register', menu_icon: 'alert-circle', sort_order: 2 }),
      menuNodeShell({ menu_code: 'pmo-oversight-quality-register', menu_label: 'Quality Register', route_path: '/pmo/oversight/quality-register', menu_icon: 'clipboard-list', sort_order: 3 }),
      menuNodeShell({ menu_code: 'pmo-oversight-lessons-log', menu_label: 'Lessons Log', route_path: '/pmo/oversight/lessons-log', menu_icon: 'graduation-cap', sort_order: 4 }),
      menuNodeShell({ menu_code: 'pmo-oversight-delays', menu_label: 'Delay Register', route_path: '/pmo/oversight/delays', menu_icon: 'file-clock', sort_order: 5 }),
      menuNodeShell({ menu_code: 'pmo-oversight-scope', menu_label: 'Scope Oversight', route_path: '/pmo/oversight/scope', menu_icon: 'clipboard-list', sort_order: 6 }),
      menuNodeShell({ menu_code: 'pmo-oversight-schedules', menu_label: 'Schedule Oversight', route_path: '/pmo/oversight/schedules', menu_icon: 'file-clock', sort_order: 7 }),
      menuNodeShell({ menu_code: 'pmo-oversight-changes', menu_label: 'Change Register', route_path: '/pmo/registers/changes', menu_icon: 'refresh-ccw', sort_order: 8 }),
    ],
  },
}

const LEGACY_PROGRAMME_LABEL_RE =
  /^(all programmes|programme dashboard|programme projects|programme dependencies|programme benefits|programme timeline|programme reports|measurements|realization|timeline|reports)$/i

/**
 * Retired pmo-cat-* shells still present as DB roots or nested under wrong parents.
 * Without this map, orphans default to Administration and mix up the sidebar.
 */
export const LEGACY_CATEGORY_SHELL_TARGETS = {
  'pmo-cat-portfolio': 'pmo-cat-project-delivery',
  'pmo-cat-programme': 'pmo-cat-project-delivery',
  'pmo-cat-planning': 'pmo-cat-project-delivery',
  'pmo-cat-strategy': 'pmo-cat-knowledge-assets',
  'pmo-cat-projects': 'pmo-cat-project-delivery',
  'pmo-cat-project-oversight': 'pmo-cat-project-delivery',
  'pmo-cat-delivery-controls': 'pmo-cat-project-delivery',
  'pmo-cat-delivery-management': 'pmo-cat-project-delivery',
  'pmo-cat-risk-issues-quality': 'pmo-cat-project-delivery',
  'pmo-cat-financial-commercial': 'pmo-cat-reporting-intelligence',
  'pmo-cat-governance': 'pmo-cat-governance-standards',
  'pmo-cat-oversight': 'pmo-cat-reporting-intelligence',
  'pmo-cat-delivery': 'pmo-cat-agile-lean',
  // v681 plat_sec_* section headers — map to canonical pmo-cat-* buckets so
  // reorganizeMenuRoots does not fall them through to the default (pmo-cat-admin).
  // PMO layout sections
  'plat_sec_exec_overview':       'pmo-cat-exec',
  'plat_sec_project_delivery':    'pmo-cat-project-delivery',
  'plat_sec_templates':           'pmo-cat-project-delivery',
  'plat_grp_portfolio':           'pmo-cat-project-delivery',
  'plat_grp_programme':           'pmo-cat-project-delivery',
  'plat_grp_plan_intel':          'pmo-cat-project-delivery',
  'plat_sec_reporting':           'pmo-cat-reporting-intelligence',
  'plat_sec_structured':          null,
  'plat_grp_initiation':          'pmo-cat-initiation',
  'plat_grp_gov_standards':       'pmo-cat-governance-standards',
  'plat_sec_standards_based':               null,
  'plat_grp_standards_based_forms':         'pmo-cat-standards-based',
  'plat_sec_agile':               null,
  'plat_grp_agile_tools':         'pmo-cat-agile-lean',
  'plat_sec_process_templates':   null,
  'pmo-cat-process-templates':    null,
  'plat_xf_process_templates':    'pmo-cat-knowledge-assets',
  // PM layout sections
  'plat_sec_universal':           'pmo-cat-exec',
  'plat_sec_cross_fw':            null,
  'plat_sec_approvals_gov':       'pmo-cat-workflows-approvals',
  'plat_sec_quality_assurance':   'pmo-cat-workflows-approvals',
  'plat_sec_reporting_controls':  'pmo-cat-reporting-intelligence',
  'plat_sec_comm_reporting':      'pmo-cat-reporting-intelligence',
  'plat_sec_approvals_reporting': 'pmo-cat-workflows-approvals',
  // TM layout sections
  'plat_sec_personal':            'pmo-cat-project-delivery',
  'plat_sec_team_section':        'pmo-cat-teams',
  'plat_sec_delivery_artefacts':  'pmo-cat-project-delivery',
  'plat_sec_team_mgmt':           'pmo-cat-teams',
  'plat_sec_delivery':            'pmo-cat-project-delivery',
}

const LEGACY_CATEGORY_SHELL_CODES = new Set(Object.keys(LEGACY_CATEGORY_SHELL_TARGETS))

/** v681 methodology section wrappers — explode so initiation vs governance bucket separately. */
const METHODOLOGY_TRACK_SECTION_EXPLODE_CODES = new Set([
  'plat_sec_structured',
  'plat_sec_standards_based',
  'plat_sec_agile',
])

function explodeMethodologyTrackSectionRoots(nodes = []) {
  return (nodes || []).flatMap((node) => {
    const code = String(node?.menu_code || '').trim()
    const children = explodeMethodologyTrackSectionRoots(node.children || [])
    const next = { ...node, children }
    if (METHODOLOGY_TRACK_SECTION_EXPLODE_CODES.has(code) && (next.children || []).length) {
      return explodeMethodologyTrackSectionRoots(next.children)
    }
    return [next]
  })
}

function resolveTrackCategoryTarget(node = {}, layout = 'pmo') {
  const code = String(node?.menu_code || '').trim()
  const legacyTarget = LEGACY_CATEGORY_SHELL_TARGETS[code]
  if (legacyTarget) return legacyTarget
  return inferCategoryId(node, layout)
}

/** Flatten legacy group shells and move misbucketed leaves to sibling track categories. */
function prepareTrackCategoryNodes(trackCategoryNodes = [], layout = 'pmo') {
  const trackIds = trackCategoryIdsForLayout(layout)
  const byCode = new Map(
    (trackCategoryNodes || []).map((node) => [
      String(node?.menu_code || ''),
      { ...node, children: flattenLegacyCategoryShells(node.children || [], layout) },
    ])
  )
  const pending = []

  for (const node of byCode.values()) {
    const code = String(node?.menu_code || '')
    if (!trackIds.has(code)) continue

    const keep = []
    for (const child of node.children || []) {
      const target = resolveTrackCategoryTarget(child, layout)
      if (target !== code && trackIds.has(target)) pending.push({ target, node: child })
      else keep.push(child)
    }
    node.children = keep
  }

  for (const { target, node } of pending) {
    let cat = byCode.get(target)
    if (!cat) {
      cat = createCategoryShell(target, 999, LAYOUT_CONFIG[layout]?.universalDefs || PMO_CATEGORY_DEFS)
      byCode.set(target, cat)
    }
    const key = String(node?.menu_code || '')
    const existing = new Set((cat.children || []).map((c) => String(c?.menu_code || '')))
    if (key && existing.has(key)) continue
    cat.children = sortNodes([...(cat.children || []), node])
  }

  return [...byCode.values()]
    .filter((node) => trackIds.has(String(node?.menu_code || '')))
    .map((node) => ({ ...node, children: sortNodes(node.children || []) }))
    .sort((a, b) => {
      const { trackOrder } = buildOrderMaps(
        LAYOUT_CONFIG[layout]?.universalDefs || PMO_CATEGORY_DEFS,
        trackCategoryIdsForLayout(layout)
      )
      return (trackOrder.get(a.menu_code) ?? 999) - (trackOrder.get(b.menu_code) ?? 999)
    })
}

/** @typedef {'pmo'|'pm'|'sim_pmo'|'sim_pm'} MenuHierarchyLayout */

export const SIM_PMO_CATEGORY_DEFS = [
  { id: 'sim_pmo_cat_live', label: 'Live Simulation', order: 5 },
  { id: 'sim_pmo_cat_exec', label: 'Practice Executive Overview', order: 10 },
  { id: 'sim_pmo_cat_project_delivery', label: 'Practice Project Delivery', order: 20 },
  { id: 'sim_pmo_cat_reporting', label: 'Practice Reporting & Intelligence', order: 60 },
  { id: 'sim_pmo_cat_workflows', label: 'Practice Workflows & Governance', order: 70 },
  { id: 'sim_pmo_cat_process_templates', label: 'Practice Process Templates', order: 80 },
  { id: 'sim_pmo_cat_knowledge', label: 'Practice Knowledge & Assets', order: 90 },
  { id: 'sim_pmo_cat_email', label: 'Practice Email & Notifications', order: 100 },
  { id: 'sim_pmo_cat_admin', label: 'Practice Administration', order: 110 },
  { id: 'sim_pmo_cat_system_admin', label: 'Simulator System Administration', order: 120 },
]

export const SIM_PM_CATEGORY_DEFS = [
  { id: 'sim_pm_cat_live', label: 'Live Simulation', order: 5 },
  { id: 'sim_pm_cat_dashboard', label: 'Practice Dashboard', order: 10 },
  { id: 'sim_pm_cat_projects', label: 'Practice Projects', order: 20 },
  { id: 'sim_pm_cat_teams', label: 'Practice Teams', order: 25 },
  { id: 'sim_pm_cat_controls', label: 'Practice Controls & Registers', order: 30 },
  { id: 'sim_pm_cat_process_templates', label: 'Practice Process Templates', order: 70 },
  { id: 'sim_pm_cat_cross_framework', label: 'Practice Cross-Framework', order: 90 },
  { id: 'sim_pm_cat_learning', label: 'Learning Hub', order: 95 },
]

const PLATFORM_TRACK_CODES = new Set([
  ...METHODOLOGY_TRACK_CATEGORY_DEFS.map((c) => c.id),
  'pmo-cat-initiation',
  'pmo-cat-governance-standards',
  'pmo-cat-standards-based',
  'pmo-cat-agile-lean',
])

const SIM_PMO_TRACK_CODES = new Set([
  'sim_pmo_cat_initiation',
  'sim_pmo_cat_governance',
  'sim_pmo_cat_standards_based',
  'sim_pmo_cat_agile',
])

const SIM_PM_TRACK_CODES = new Set([
  'sim_pm_cat_initiation',
  'sim_pm_cat_governance',
  'sim_pm_cat_standards_based',
  'sim_pm_cat_agile',
])

const PMO_UNIVERSAL_CATEGORY_IDS = new Set(PMO_CATEGORY_DEFS.map((c) => c.id))
const PM_UNIVERSAL_CATEGORY_IDS = new Set(PM_CATEGORY_DEFS.map((c) => c.id))
const SIM_PMO_UNIVERSAL_IDS = new Set(SIM_PMO_CATEGORY_DEFS.map((c) => c.id))
const SIM_PM_UNIVERSAL_IDS = new Set(SIM_PM_CATEGORY_DEFS.map((c) => c.id))

const REGISTRY_PLATFORM = new Map()
const REGISTRY_SIMULATOR = new Map()
for (const entry of MENU_REGISTRY) {
  if (!entry.menu_code) continue
  const cat = resolveRegistryCategoryId(entry.category)
  if (entry.domain === 'platform') REGISTRY_PLATFORM.set(entry.menu_code, cat)
  if (entry.domain === 'simulator') REGISTRY_SIMULATOR.set(entry.menu_code, cat)
}

/** @type {Record<MenuHierarchyLayout, object>} */
const LAYOUT_CONFIG = {
  pmo: {
    universalDefs: PMO_CATEGORY_DEFS,
    universalIds: PMO_UNIVERSAL_CATEGORY_IDS,
    trackCodes: PLATFORM_TRACK_CODES,
    trackAnchor: { position: 'after', code: 'pmo-cat-project-delivery' },
  },
  pm: {
    universalDefs: PM_CATEGORY_DEFS,
    universalIds: PM_UNIVERSAL_CATEGORY_IDS,
    trackCodes: PLATFORM_TRACK_CODES,
    trackAnchor: { position: 'before', code: 'plat_sec_cross_fw' },
  },
  sim_pmo: {
    universalDefs: SIM_PMO_CATEGORY_DEFS,
    universalIds: SIM_PMO_UNIVERSAL_IDS,
    trackCodes: SIM_PMO_TRACK_CODES,
    trackAnchor: { position: 'after', code: 'sim_pmo_cat_project_delivery' },
  },
  sim_pm: {
    universalDefs: SIM_PM_CATEGORY_DEFS,
    universalIds: SIM_PM_UNIVERSAL_IDS,
    trackCodes: SIM_PM_TRACK_CODES,
    trackAnchor: { position: 'before', code: 'sim_pm_cat_process_templates' },
  },
}

function buildOrderMaps(universalDefs = [], trackCodes = new Set()) {
  const categoryOrder = new Map(universalDefs.map((c) => [c.id, c.order ?? 999]))
  const trackOrder = new Map(
    [...trackCodes].map((code, i) => {
      const fromDefs = METHODOLOGY_TRACK_CATEGORY_DEFS.find((d) => d.id === code)
      return [code, fromDefs?.order ?? 5.5 + i * 0.01]
    })
  )
  return { categoryOrder, trackOrder }
}

function sortNodes(nodes = []) {
  return [...nodes].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
}

function sortChildren(node) {
  if (!node?.children?.length) return node
  return { ...node, children: sortNodes(node.children.map(sortChildren)) }
}

function inferPlatformCategoryId(node = {}) {
  const code = String(node?.menu_code || '').trim()
  const legacyTarget = LEGACY_CATEGORY_SHELL_TARGETS[code]
  if (legacyTarget) return legacyTarget
  if (PMO_UNIVERSAL_CATEGORY_IDS.has(code) || PLATFORM_TRACK_CODES.has(code)) return code

  const path = String(node?.route_path || '').toLowerCase()
  const label = String(node?.menu_label || '').toLowerCase()
  const signal = `${code} ${label} ${path}`

  if (/pmo_okr|\/pmo\/okr|\/platform\/okr|\/pmo\/strategy|whiteboard|\/pmo\/collaboration/.test(signal)) {
    return 'pmo-cat-knowledge-assets'
  }

  if (/\/pmo\/process-templates|process templates|delay template|delays\/templates|delay_templates|pmo_pt_delay|plat_pt_delay|plat_pt_|pmo_pt_|plat_xf_process/.test(signal)) {
    if (/agile template|process-templates\/agile|plat_pt_agile|pmo_pt_agile/.test(signal)) {
      return 'pmo-cat-agile-lean'
    }
    if (/pre-project|pre project|plat_pt_preproject|pmo_pt_pre/.test(signal)) {
      return 'pmo-cat-initiation'
    }
    return 'pmo-cat-knowledge-assets'
  }

  if (REGISTRY_PLATFORM.has(code)) return REGISTRY_PLATFORM.get(code)

  // Global / Template Library (published Admin templates — copy to customise) +
  // Organisational Templates (v807 — account's own copies, methodology-grouped) +
  // Document Signatory Requirements (v868/v870 — PMO config sibling of those peers)
  if (
    /plat_sec_templates|plat_tpl_library|plat_tpl_organisational|plat_tpl_org_|plat_tpl_signatory|plat_pmo_field_templates|sim_sec_templates|sim_tpl_library|sim_tpl_organisational|sim_tpl_org_|sim_tpl_signatory|sim_pmo_field_templates|template-library|organisational-templates|signatory-requirements|template library|organisational templates|document signatory|global templates|field templates/.test(
      signal
    )
  ) {
    return 'pmo-cat-project-delivery'
  }

  if (/pid|project initiation document|\(pids\)|\/initiation\/pids/.test(signal)) {
    return 'pmo-cat-governance-standards'
  }

  if (
    /organisational process assets|\(opa\)|\/platform\/opa(?:\/?$|\?)/.test(signal) &&
    !/\/platform\/opa\/(new|on-hold|bulk-upload)/.test(signal)
  ) {
    return 'pmo-cat-governance-standards'
  }

  if (
    /pmo-cat-initiation|\/mandates\/|\/initiation\/|business case|project brief|benefits review|pre-project/.test(
      signal
    )
  ) {
    return 'pmo-cat-initiation'
  }
  if (
    /pmo-cat-governance|governance\/|communication strategy|configuration strategy|quality strategy|risk strategy|communication management strategy|configuration management|risk management strategy|quality management strategy|\/eef\b|organisational process assets|\(opa\)|\/platform\/opa|itto/.test(
      signal
    )
  ) {
    return 'pmo-cat-governance-standards'
  }
  if (/\/pmo\/forms\?status=|forms\?status=/.test(signal)) {
    return 'pmo-cat-workflows-approvals'
  }
  if (/pmo-cat-standards-based|process.group|process_group|\/forms\?group=/.test(signal)) {
    return 'pmo-cat-standards-based'
  }
  if (/pmo-cat-agile|scrum-of-scrums|value-stream|kaizen|\/scrum\/|\/lean\//.test(signal)) {
    return 'pmo-cat-agile-lean'
  }
  if (
    /\/platform\/reports|\/pm\/reports|\/financial|highlight report|exception report|analytics|dashboard builder|scheduled report|checkpoint report/.test(
      signal
    )
  ) {
    return 'pmo-cat-reporting-intelligence'
  }
  if (
    /authorisation|lifecycle|archive vault|pending approval|\/pmo\/forms|workflows|\/pm\/authorisation/.test(
      signal
    )
  ) {
    return 'pmo-cat-workflows-approvals'
  }
  if (
    /\/platform\/projects|\/pm\/projects|\/pm\/tasks|task board|my tasks|story map|releases|my projects|project dashboard|daily log/.test(
      signal
    )
  ) {
    return 'pmo-cat-project-delivery'
  }
  if (
    /\/platform\/dashboard|\/pm\/dashboard|pmo dashboard/.test(signal) &&
    !/portfolio|programme|planning/.test(signal)
  ) {
    return 'pmo-cat-exec'
  }
  if (
    /\/platform\/portfolio\/?$|portfolio overview|portfolio dependencies|portfolio collisions|\/platform\/programme|\/platform\/benefits|planning intelligence|planning hub|intelligence rules|governance rules|\/pmo\/planning|\/dependencies/.test(
      signal
    )
  ) {
    return 'pmo-cat-project-delivery'
  }
  if (/\/calendar|calendar/.test(signal) && !/predictive/.test(signal)) {
    return 'pmo-cat-project-delivery'
  }
  if (
    /risk register|issue log|change log|controls & registers|\/pm\/controls|delay register|requirements register/.test(
      signal
    )
  ) {
    return 'pmo-cat-project-oversight'
  }
  if (/testing-centre|testing centre|quality & testing|\/pmo\/testing/.test(signal)) {
    return 'pmo-cat-workflows-approvals'
  }
  if (
    /\/platform\/financial|financial report|portfolio\/evm|programme\/evm|\/projects\/evm|expense approval|expense threshold|\/financial-reports/.test(
      signal
    )
  ) {
    return 'pmo-cat-reporting-intelligence'
  }
  if (/procurement|\/pmo\/procurement|\/pmo\/rfp/.test(signal)) {
    return 'pmo-cat-knowledge-assets'
  }
  if (/\/pmo\/okr|\/platform\/okr|objectives.*key results|okr check-in|alignment map|\/pmo\/strategy|whiteboard|\/pmo\/collaboration/.test(signal)) {
    return 'pmo-cat-knowledge-assets'
  }
  if (
    /\/platform\/teams|\/pm\/teams|manager assignment|appointment tracker|people.resource|people & resources|team capacity|resource directory|send invitation|assign roles to project|manage roles|manage-roles|manage menu bundles|manage-menu-bundles|invitation-tracker|send-role-invites|organisation-industries|industries & capabilities/.test(
      signal
    )
  ) {
    return 'pmo-cat-teams'
  }
  if (/stakeholder/.test(signal)) {
    return 'pmo-cat-stakeholders'
  }
  if (/org-knowledge|knowledge|industry template/.test(signal)) {
    return 'pmo-cat-knowledge-assets'
  }
  if (/expense threshold|expense-thresholds/.test(signal)) {
    return 'pmo-cat-reporting-intelligence'
  }
  if (
    /\/platform\/settings|\/pwa-settings|\/authentication|\/encryption|\/gdpr|roles-permissions|\/admin\/security|\bsecurity\b|platform settings|authentication settings|encryption|gdpr|roles & permissions|monitoring dashboard|help content|feedback analysis|pmo_sys_/.test(
      signal
    )
  ) {
    return 'pmo-cat-system-admin'
  }
  if (
    /\/pmo-admin\/|\/platform\/organisation|branding|user management|role menu|subscription|local.data.extension|form template|project types|project statuses|funding source|budget categor|\/platform\/admin\/form-templates/.test(
      signal
    )
  ) {
    return 'pmo-cat-admin'
  }
  if (
    /\/platform\/admin\/(invitation|send-role|assign-roles|manage-roles|manage-menu-bundles|organisation-industries|email-settings|email-sender|invitation-settings)/.test(path)
  ) {
    if (/email|sender profile|invitation template|invitation expiry|\/comms\//.test(signal)) {
      return 'pmo-cat-email-notifications'
    }
    return 'pmo-cat-teams'
  }
  if (/audit|compliance/.test(signal)) {
    return 'pmo-cat-audit-compliance'
  }
  if (/notification preference|\/settings\/notifications/.test(signal)) {
    return 'pmo-cat-email-notifications'
  }
  if (/email|notification|invitation|\/comms\//.test(signal)) {
    return 'pmo-cat-email-notifications'
  }
  if (/\/help|\/support/.test(signal)) {
    return path.includes('/support') ? 'pmo-cat-support' : 'pmo-cat-help'
  }
  if (/\/pmo\/oversight|risk register|issue register|quality register/.test(signal)) {
    return 'pmo-cat-project-delivery'
  }

  return resolveRegistryCategoryId(null)
}

// v682 sim_sec_* section headers that don't match signal patterns in inferSimPmoCategoryId
const SIM_PMO_SEC_TARGETS = {
  'sim_sec_exec':       'sim_pmo_cat_exec',
  'sim_sec_structured': 'sim_pmo_cat_initiation',
}

function inferSimPmoCategoryId(node = {}) {
  const code = String(node?.menu_code || '').trim()
  if (SIM_PMO_SEC_TARGETS[code]) return SIM_PMO_SEC_TARGETS[code]
  if (REGISTRY_SIMULATOR.has(code)) return REGISTRY_SIMULATOR.get(code)
  if (SIM_PMO_UNIVERSAL_IDS.has(code) || SIM_PMO_TRACK_CODES.has(code)) return code

  const path = String(node?.route_path || '').toLowerCase()
  const label = String(node?.menu_label || '').toLowerCase()
  const signal = `${code} ${label} ${path}`

  if (
    /sim_pmo_cat_initiation|practice mandate|practice brief|practice business|\/simulator\/pmo\/initiation/.test(
      signal
    )
  ) {
    return 'sim_pmo_cat_initiation'
  }
  if (/sim_pmo_cat_governance|practice governance|communication management/.test(signal)) {
    return 'sim_pmo_cat_governance'
  }
  if (/sim_pmo_cat_standards_based|process group/.test(signal)) return 'sim_pmo_cat_standards_based'
  if (/sim_pmo_cat_agile|scrum-of-scrums|value-stream|kaizen/.test(signal)) return 'sim_pmo_cat_agile'
  // Global / Organisational Templates (v807 — explicit, not relying on the
  // trailing default fallback below to coincidentally match deliveryCode).
  if (/sim_tpl_library|sim_tpl_organisational|sim_tpl_org_|sim_tpl_signatory|template-library|organisational-templates|signatory-requirements|template library|organisational templates|document signatory|field templates/.test(signal)) {
    return 'sim_pmo_cat_project_delivery'
  }
  if (/process templates|delay template|delays\/templates|delay_templates/.test(signal)) {
    return 'sim_pmo_cat_process_templates'
  }
  if (/report|analytics|evm/.test(signal)) return 'sim_pmo_cat_reporting'
  if (/workflow|authorisation|approval/.test(signal)) return 'sim_pmo_cat_workflows'
  if (/\/simulator\/pmo\/dashboard|practice dashboard|portfolio|programme/.test(signal)) {
    return 'sim_pmo_cat_exec'
  }
  if (/\/simulator\/pmo\/projects|practice project|simulation run|event inbox/.test(signal)) {
    return 'sim_pmo_cat_project_delivery'
  }
  if (/start new run|active run|run history|live simulation/.test(signal)) {
    return 'sim_pmo_cat_live'
  }
  if (/admin|subscription|organisation/.test(signal)) return 'sim_pmo_cat_admin'
  if (/system admin|authentication|encryption|gdpr/.test(signal)) return 'sim_pmo_cat_system_admin'
  if (/email|notification/.test(signal)) return 'sim_pmo_cat_email'
  if (/knowledge|bookmark/.test(signal)) return 'sim_pmo_cat_knowledge'

  return 'sim_pmo_cat_project_delivery'
}

/** PM layout section wrappers — promote children to top-level sidebar rows. */
const PM_LAYOUT_SECTION_EXPLODE_CODES = new Set([
  'plat_sec_universal',
  'plat_sec_cross_fw',
])

/** PMO-only section/category rows that must never appear on PM layout sidebars. */
const PMO_ONLY_PM_LAYOUT_DROP_CODES = new Set([
  'plat_sec_exec_overview',
  'plat_sec_project_delivery',
  'plat_sec_financial_commercial',
  'plat_sec_people_resources',
  'plat_sec_workflows_governance',
  'plat_sec_stakeholders_pmo',
  'plat_sec_knowledge_ops',
  'plat_sec_account',
  // Org-wide executive page — not a PM project-scoped sidebar child (v827 / v843)
  'plat_exec_dashboard',
  'pmo-cat-exec',
  'pmo-cat-project-delivery',
  'pmo-cat-audit-compliance',
  'pmo-cat-account-subscription',
  'pmo-cat-admin',
  'pmo-cat-system-admin',
  'pmo-cat-teams',
  'pmo-cat-stakeholders',
  'pmo-cat-workflows-approvals',
  'pmo-cat-reporting-intelligence',
])

const PM_PLATFORM_SEC_TARGETS = {
  plat_sec_approvals_gov: 'plat_grp_pm_auth',
  plat_sec_quality_assurance: 'plat_pm_quality_testing',
  plat_sec_quality_testing: 'plat_pm_quality_testing',
  plat_sec_reporting_controls: 'plat_grp_pm_reporting',
  plat_sec_comm_reporting: 'plat_grp_pm_reporting',
  plat_sec_approvals_reporting: 'plat_grp_pm_auth',
}

/** v681 — only these menu_code values belong under the PM Projects group. */
const PM_PROJECTS_ALLOWED_CHILD_CODES = new Set([
  'plat_pm_my_projects',
  'plat_pm_all_projects',
  'plat_pm_create_project',
  'plat_pm_archives',
  'plat_pm_manage_members',
  'plat_pm_daily_log',
  // plat_pm_lessons removed (v883) — Lessons Log lives under Controls → Knowledge
])

/** Methodology / cross-framework groups — never nest under Projects. */
const PM_TRACK_AND_GROUP_CODE_TARGETS = {
  plat_grp_pm_pre_project: 'pmo-cat-initiation',
  plat_grp_pm_proj_controls: 'pmo-cat-initiation',
  plat_grp_pm_del_reporting: 'pmo-cat-initiation',
  plat_grp_pm_gov_standards: 'pmo-cat-governance-standards',
  plat_grp_pm_process_groups: 'pmo-cat-standards-based',
  plat_grp_pm_itto: 'pmo-cat-standards-based',
  plat_grp_pm_agile_delivery: 'pmo-cat-agile-lean',
  plat_grp_pm_agile_forms: 'pmo-cat-agile-lean',
  plat_grp_pm_lean_tools: 'pmo-cat-agile-lean',
  plat_grp_pm_planning_tools: 'pmo-cat-agile-lean',
  plat_grp_initiation: 'pmo-cat-initiation',
  plat_grp_gov_standards: 'pmo-cat-governance-standards',
  plat_grp_agile_delivery: 'pmo-cat-agile-lean',
  plat_grp_agile_tools: 'pmo-cat-agile-lean',
  plat_grp_agile_metrics: 'pmo-cat-agile-lean',
  plat_grp_standards_based_process: 'pmo-cat-standards-based',
  plat_grp_itto: 'pmo-cat-standards-based',
  plat_grp_financial: 'plat_grp_pm_financial',
  plat_grp_okr: 'plat_sec_cross_fw',
  plat_xf_okr: 'plat_sec_cross_fw',
  plat_a_scrum_of_scrums: 'pmo-cat-agile-lean',
}

/**
 * Flatten PM layout DB section wrappers and drop PMO-only sections.
 * @param {object[]} nodes
 */
export function flattenPmLayoutSectionRoots(nodes = []) {
  return (nodes || []).flatMap((node) => {
    const code = String(node?.menu_code || '').trim()
    if (PMO_ONLY_PM_LAYOUT_DROP_CODES.has(code)) return []

    if (PM_LAYOUT_SECTION_EXPLODE_CODES.has(code)) {
      return flattenPmLayoutSectionRoots(node.children || [])
    }

    const children = flattenPmLayoutSectionRoots(node.children || [])
    return [{ ...node, children }]
  })
}

function inferPmPlatformCategoryId(node = {}) {
  const code = String(node?.menu_code || '').trim()
  if (PM_PLATFORM_SEC_TARGETS[code]) return PM_PLATFORM_SEC_TARGETS[code]
  if (PM_TRACK_AND_GROUP_CODE_TARGETS[code]) return PM_TRACK_AND_GROUP_CODE_TARGETS[code]
  if (PM_UNIVERSAL_CATEGORY_IDS.has(code) || PLATFORM_TRACK_CODES.has(code)) return code
  if (PM_PROJECTS_ALLOWED_CHILD_CODES.has(code)) return 'plat_grp_pm_projects'
  if (/^plat_pm_s_/.test(code)) {
    if (/checkpoint|highlight|issue rep|exception|end stage|end project|del_reporting|del-reporting/.test(code)) {
      return 'pmo-cat-initiation'
    }
    if (/cms|conf_ms|qms|rms|doc_gov|gov_framework|policies|decision|work_auth|stage_gate/.test(code)) {
      return 'pmo-cat-governance-standards'
    }
    return 'pmo-cat-initiation'
  }
  if (/^plat_pm_p_/.test(code)) return 'pmo-cat-standards-based'
  if (/^plat_pm_a_|^plat_a_/.test(code)) return 'pmo-cat-agile-lean'

  const path = String(node?.route_path || '').toLowerCase()
  const label = String(node?.menu_label || '').toLowerCase()
  const signal = `${code} ${label} ${path}`

  // Keep Executive Dashboard out of the PM "Dashboard" accordion — it is PMO/exec-only.
  if (/^plat_exec_dashboard|executive dashboard|\/platform\/executive\/dashboard/.test(signal)) return null
  if (/^plat_pm_dashboard|\/pm\/dashboard/.test(signal)) return 'plat_pm_dashboard'
  if (/plat_pm_ai|ai assistant/.test(signal)) return 'plat_pm_ai'
  // v849: Project Documents register (must run before Project Templates path checks).
  if (
    /^plat_pm_project_documents$|^sim_pm_project_documents$|project documents|\/platform\/documents\/project|\/simulator\/pm\/documents\/project/.test(
      signal,
    )
  ) {
    return 'plat_pm_project_documents'
  }
  // v851 submenu leaves nest under their parent category (exact codes before path match).
  if (
    /^plat_pm_project_templates_(templates|forms)$|^sim_pm_project_templates_(templates|forms)$/.test(
      code,
    )
  ) {
    return 'plat_pm_project_templates'
  }
  if (/^plat_pm_templates_(templates|forms)$|^sim_pm_templates_(templates|forms)$/.test(code)) {
    return 'plat_pm_templates'
  }
  // v843: Organisational Templates is a top-level PM row (not under Projects).
  if (/^plat_pm_project_templates$|project templates|\/platform\/templates\/project/.test(signal)) {
    return 'plat_pm_project_templates'
  }
  if (/^plat_pm_templates$|organisational templates|organizational templates|\/platform\/templates/.test(signal)) {
    return 'plat_pm_templates'
  }
  if (/^plat_grp_pm_projects$|^plat_pm_my_projects$|^plat_pm_all_projects$|^plat_pm_create_project$|^plat_pm_archives$|^plat_pm_manage_members$|^plat_pm_daily_log$/.test(signal)) {
    return 'plat_grp_pm_projects'
  }
  if (/^my projects$|^all projects$|^create project$|^archives|^manage members$/.test(label)) {
    return 'plat_grp_pm_projects'
  }
  if (/plat_grp_pm_tasks|my tasks|task board|task calendar/.test(signal)) return 'plat_grp_pm_tasks'
  if (/plat_grp_pm_teams|plat_pm_manage_roles|all teams|my team|resource directory|skill matrix|capacity|leave calendar|manage roles|manage-roles/.test(signal)) {
    return 'plat_grp_pm_teams'
  }
  if (/plat_pm_calendar|\/calendar/.test(signal) && !/task calendar|leave calendar/.test(signal)) {
    return 'plat_pm_calendar'
  }
  if (
    /plat_grp_pm_controls|plat_pm_ctrl_|plat_pm_lessons_ctrl|risk register|issue log|change log|delay register|requirements register|lessons log|decision log|raid log|\/eef\b|\/pm\/controls\/lessons-log/.test(
      signal
    )
  ) {
    return 'plat_grp_pm_controls'
  }
  if (/plat_grp_pm_stakeholders|stakeholder register|stakeholder analysis|engagement planning|communication plan|power\/interest/.test(signal)) {
    return 'plat_grp_pm_stakeholders'
  }
  if (/plat_pm_quality_testing|quality & testing|testing dashboard/.test(signal)) return 'plat_pm_quality_testing'
  if (/plat_grp_pm_reporting|report library|report builder|analytics dashboard|custom metrics/.test(signal)) {
    return 'plat_grp_pm_reporting'
  }
  if (/plat_grp_pm_financial|financial management|my expenses|expense approval|financial report/.test(signal)) {
    return 'plat_grp_pm_financial'
  }
  if (/plat_grp_pm_auth|pending my approval|submitted records|approval chain|authorisation/.test(signal)) {
    return 'plat_grp_pm_auth'
  }
  if (/process templates|plat_xf_process|plat_pt_|okr dashboard|knowledge & resources|cross-framework|strategy & okr/.test(signal)) {
    return 'plat_sec_cross_fw'
  }
  if (/email settings|notification preferences|pmo-cat-email/.test(signal)) return 'pmo-cat-email-notifications'
  if (/\/help\b|help centre/.test(signal)) return 'pmo-cat-help'
  if (/\/support\b/.test(signal)) return 'pmo-cat-support'
  if (/org knowledge|bookmark|knowledge hub/.test(signal)) return 'pmo-cat-knowledge-assets'

  if (/scrum of scrums|agile delivery|agile process|lean tools|planning poker|s-curve|story map|releases|sprint|kaizen|value stream|agile metrics/.test(signal)) {
    return 'pmo-cat-agile-lean'
  }
  if (/itto framework|itto template|process group forms|\/itto\//.test(signal)) return 'pmo-cat-standards-based'
  if (/project controls|pre-project & initiation|delivery reporting|checkpoint report|highlight report|work packages|product description|project mandate|project brief|business case|benefits review/.test(signal)) {
    return 'pmo-cat-initiation'
  }
  if (/governance & standards|communication.*strategy|configuration.*strategy|quality.*strategy|risk.*strategy|document governance|stage gate/.test(signal)) {
    return 'pmo-cat-governance-standards'
  }

  if (/portfolio overview|programme management|planning hub|planning intelligence/.test(signal)) {
    return null
  }

  return null
}

/** v851 Forms/Templates submenu leaves — kept under Organizational / Project Templates. */
const PM_TEMPLATES_SUBMENU_CHILD_CODES = new Set([
  'plat_pm_templates_templates',
  'plat_pm_templates_forms',
  'plat_pm_project_templates_templates',
  'plat_pm_project_templates_forms',
  'sim_pm_templates_templates',
  'sim_pm_templates_forms',
  'sim_pm_project_templates_templates',
  'sim_pm_project_templates_forms',
])

/**
 * PM top-level rows with their own route normally stay single clickable links
 * (strips legacy Executive Dashboard under Dashboard, etc.).
 *
 * Exception (v851): Organizational Templates + Project Templates keep their
 * Forms / Templates submenu children so the sidebar can expand like Tasks/Teams.
 */
function collapsePmNavigableCategoryToLeaf(node = {}) {
  const code = String(node?.menu_code || '').trim()
  const isDashboard = code === 'plat_pm_dashboard'
  const isOrgTemplates = code === 'plat_pm_templates' || code === 'sim_pm_templates'
  const isProjectTemplates =
    code === 'plat_pm_project_templates' || code === 'sim_pm_project_templates'
  const isProjectDocuments =
    code === 'plat_pm_project_documents' || code === 'sim_pm_project_documents'
  if (!isDashboard && !isOrgTemplates && !isProjectTemplates && !isProjectDocuments) return node

  const children = Array.isArray(node.children) ? node.children : []
  if (!children.length) return node

  // v851: keep Forms/Templates children; drop any other nested leftovers.
  if (isOrgTemplates || isProjectTemplates) {
    const kept = children.filter((child) =>
      PM_TEMPLATES_SUBMENU_CHILD_CODES.has(String(child?.menu_code || '').trim()),
    )
    if (kept.length) {
      return {
        ...node,
        route_path:
          String(node.route_path || '').trim() ||
          (isProjectTemplates ? '/platform/templates/project' : '/platform/templates'),
        menu_icon:
          node.menu_icon || (isProjectTemplates ? 'folder-kanban' : 'library'),
        children: kept,
      }
    }
  }

  const ownRoute = String(node.route_path || '').trim()
  if (ownRoute) {
    return { ...node, children: [] }
  }

  if (isProjectDocuments) {
    return {
      ...node,
      route_path: '/platform/documents/project',
      menu_icon: node.menu_icon || 'file-text',
      children: [],
    }
  }

  if (isProjectTemplates) {
    return {
      ...node,
      route_path: '/platform/templates/project',
      menu_icon: node.menu_icon || 'folder-kanban',
      children: [],
    }
  }

  if (isOrgTemplates) {
    return {
      ...node,
      route_path: '/platform/templates',
      menu_icon: node.menu_icon || 'library',
      children: [],
    }
  }

  const preferred =
    children.find((child) => {
      const childCode = String(child?.menu_code || '').trim()
      const path = String(child?.route_path || '').toLowerCase()
      return (
        childCode === 'plat_pm_dashboard' ||
        (/\/pm\/dashboard|\/platform\/dashboard/.test(path) && !/executive/.test(path))
      )
    }) || children.find((child) => String(child?.route_path || '').trim())

  return {
    ...node,
    route_path: preferred?.route_path || '/platform/dashboard',
    menu_icon: node.menu_icon || preferred?.menu_icon || 'layout-dashboard',
    children: [],
  }
}

/** Remove PMO universal categories that leaked into PM layout trees. */
export function filterPmLayoutMenuItems(items = []) {
  const walk = (nodes) =>
    (nodes || [])
      .filter((node) => !PMO_ONLY_PM_LAYOUT_DROP_CODES.has(String(node?.menu_code || '').trim()))
      .map((node) => {
        let children = walk(node.children)
        const code = String(node?.menu_code || '').trim()
        if (code === 'plat_grp_pm_projects') {
          children = children.filter((child) => {
            const childCode = String(child?.menu_code || '').trim()
            if (PM_PROJECTS_ALLOWED_CHILD_CODES.has(childCode)) return true
            const target = inferPmPlatformCategoryId(child)
            return target === 'plat_grp_pm_projects' && !(child.children || []).length
          })
        }
        return collapsePmNavigableCategoryToLeaf({ ...node, children })
      })
      .filter((node) => {
        if (node?.is_methodology_header) return true
        const hasRoute = Boolean(String(node?.route_path || '').trim())
        const hasChildren = (node.children || []).length > 0
        return hasRoute || hasChildren
      })

  return walk(items)
}

function relocatePmUniversalOrphans(universalNodes = [], orphans = [], layout = 'pm') {
  if (!orphans.length) return universalNodes
  const byCode = new Map((universalNodes || []).map((node) => [String(node?.menu_code || ''), node]))

  for (const orphan of orphans) {
    const target = inferCategoryId(orphan, layout)
    if (!target || !PM_UNIVERSAL_CATEGORY_IDS.has(target)) continue
    const key = String(orphan?.menu_code || '')
    // Leaf that is itself a universal category (e.g. plat_pm_templates) — promote, don't nest under a shell of itself.
    if (key && key === target) {
      if (!byCode.has(key)) {
        byCode.set(key, { ...orphan, children: Array.isArray(orphan.children) ? orphan.children : [] })
      }
      continue
    }
    let cat = byCode.get(target)
    if (!cat) {
      const order = PM_CATEGORY_DEFS.find((d) => d.id === target)?.order ?? 999
      cat = createCategoryShell(target, order, PM_CATEGORY_DEFS)
      byCode.set(target, cat)
    }
    const existing = new Set((cat.children || []).map((c) => String(c?.menu_code || '')))
    if (!key || existing.has(key)) continue
    cat.children = sortNodes([...(cat.children || []), orphan])
  }

  return PM_CATEGORY_DEFS.map((d) => byCode.get(d.id)).filter(Boolean).concat(
    [...byCode.values()].filter((n) => !PM_UNIVERSAL_CATEGORY_IDS.has(String(n?.menu_code || '')))
  )
}

/**
 * Pull methodology / cross-framework items out of the PM Projects bucket and
 * merge them into the correct universal or track category nodes.
 */
export function applyPmLayoutSanitization(universalNodes = [], trackCategoryNodes = []) {
  const layout = 'pm'
  const relocate = []

  const sanitizedUniversal = (universalNodes || []).map((node) => {
    const code = String(node?.menu_code || '').trim()
    if (code !== 'plat_grp_pm_projects') return node

    const stay = []
    for (const child of node.children || []) {
      const childCode = String(child?.menu_code || '').trim()
      if (PM_PROJECTS_ALLOWED_CHILD_CODES.has(childCode)) {
        stay.push(child)
        continue
      }
      const target = inferCategoryId(child, layout)
      if (target === 'plat_grp_pm_projects') {
        stay.push(child)
      } else if (target) {
        relocate.push(child)
      }
    }
    return { ...node, children: stay }
  })

  const trackRelocate = relocate.filter((node) => {
    const target = inferCategoryId(node, layout)
    return target && PLATFORM_TRACK_CODES.has(target)
  })
  const universalRelocate = relocate.filter((node) => {
    const target = inferCategoryId(node, layout)
    return target && PM_UNIVERSAL_CATEGORY_IDS.has(target)
  })

  let tracks = prepareTrackCategoryNodes(trackCategoryNodes, layout)
  if (trackRelocate.length) {
    tracks = relocateMisbucketedToTrackCategories(tracks, trackRelocate, layout)
    const mergedCodes = new Set(tracks.map((n) => String(n?.menu_code || '')))
    for (const node of trackRelocate) {
      const target = inferCategoryId(node, layout)
      if (!target || mergedCodes.has(target)) continue
      tracks.push(createCategoryShell(target, 999, PM_CATEGORY_DEFS))
      mergedCodes.add(target)
    }
    tracks = relocateMisbucketedToTrackCategories(tracks, trackRelocate, layout)
  }

  const universal = relocatePmUniversalOrphans(sanitizedUniversal, universalRelocate, layout)

  return { universalNodes: universal, trackCategoryNodes: tracks }
}

// v682 sim_sec_* section headers that don't match signal patterns in inferSimPmCategoryId
const SIM_PM_SEC_TARGETS = {
  'sim_sec_universal':  'sim_pm_cat_dashboard',
  'sim_sec_structured': 'sim_pm_cat_initiation',
  'sim_sec_personal':   'sim_pm_cat_dashboard',
}

function inferSimPmCategoryId(node = {}) {
  const code = String(node?.menu_code || '').trim()
  if (SIM_PM_SEC_TARGETS[code]) return SIM_PM_SEC_TARGETS[code]
  if (REGISTRY_SIMULATOR.has(code)) return REGISTRY_SIMULATOR.get(code)
  if (SIM_PM_UNIVERSAL_IDS.has(code) || SIM_PM_TRACK_CODES.has(code)) return code

  const path = String(node?.route_path || '').toLowerCase()
  const label = String(node?.menu_label || '').toLowerCase()
  const signal = `${code} ${label} ${path}`

  if (/sim_pm_cat_initiation|practice mandate|practice brief/.test(signal)) return 'sim_pm_cat_initiation'
  if (/sim_pm_cat_governance|practice governance/.test(signal)) return 'sim_pm_cat_governance'
  if (/sim_pm_cat_standards_based|process group/.test(signal)) return 'sim_pm_cat_standards_based'
  if (/sim_pm_cat_agile|story map|sprint|kaizen|value-stream/.test(signal)) return 'sim_pm_cat_agile'
  if (/process templates/.test(signal)) return 'sim_pm_cat_process_templates'
  if (/cross-framework|automation|integration|okr/.test(signal)) return 'sim_pm_cat_cross_framework'
  if (/learning|scenario|certificate|leaderboard/.test(signal)) return 'sim_pm_cat_learning'
  if (/\/simulator\/pm\/dashboard|practice dashboard/.test(signal)) return 'sim_pm_cat_dashboard'
  if (/\/simulator\/pm\/projects|practice project/.test(signal)) return 'sim_pm_cat_projects'
  if (/risk register|issue log|controls/.test(signal)) return 'sim_pm_cat_controls'
  if (/team|timesheet|daily log/.test(signal)) return 'sim_pm_cat_teams'
  if (/start new run|active run|live simulation/.test(signal)) return 'sim_pm_cat_live'

  return 'sim_pm_cat_projects'
}

function inferCategoryId(node, layout) {
  if (layout === 'sim_pmo') return inferSimPmoCategoryId(node)
  if (layout === 'sim_pm') return inferSimPmCategoryId(node)
  if (layout === 'pm' || layout === 'tm') return inferPmPlatformCategoryId(node)
  return inferPlatformCategoryId(node)
}

function createCategoryShell(categoryId, sortOrder, universalDefs) {
  const def = universalDefs.find((c) => c.id === categoryId)
  return {
    id: categoryId,
    menu_code: categoryId,
    menu_label: def?.label || categoryId,
    route_path: null,
    sort_order: sortOrder,
    children: [],
    is_visible: true,
    is_active: true,
    canUse: true,
  }
}

/**
 * Move orphan roots under category nodes for a layout (v671).
 * @param {object[]} roots
 * @param {MenuHierarchyLayout} layout
 */
export function reorganizeMenuRoots(roots = [], layout = 'pmo') {
  const config = LAYOUT_CONFIG[layout] || LAYOUT_CONFIG.pmo
  const { universalDefs, universalIds, trackCodes } = config
  const { categoryOrder, trackOrder } = buildOrderMaps(universalDefs, trackCodes)

  const inputRoots =
    layout === 'pm' || layout === 'tm' ? flattenPmLayoutSectionRoots(roots) : roots

  const categoryByCode = new Map()
  const trackCategoryNodes = []
  const orphans = []

  for (const node of explodeMethodologyTrackSectionRoots(flattenLegacyCategoryShells(inputRoots, layout))) {
    const code = String(node?.menu_code || '')
    if (trackCodes.has(code)) {
      const sorted = sortChildren({ ...node })
      trackCategoryNodes.push(sorted)
      categoryByCode.set(code, sorted)
    } else if (universalIds.has(code)) {
      categoryByCode.set(code, sortChildren({ ...node }))
    } else {
      orphans.push(node)
    }
  }

  let orphanCount = 0
  for (const orphan of orphans) {
    orphanCount += 1
    const catId = inferCategoryId(orphan, layout)
    if (!catId) continue
    const orphanCode = String(orphan?.menu_code || '')
    // Navigable leaf that is its own category (e.g. plat_pm_project_templates) — promote, don't nest under a shell.
    if (
      (layout === 'pm' || layout === 'tm') &&
      orphanCode &&
      orphanCode === catId &&
      String(orphan?.route_path || '').trim()
    ) {
      if (!categoryByCode.has(orphanCode)) {
        categoryByCode.set(orphanCode, sortChildren({ ...orphan, children: orphan.children || [] }))
      }
      continue
    }
    let cat = categoryByCode.get(catId)
    if (!cat) {
      const order = trackOrder.get(catId) ?? categoryOrder.get(catId) ?? 999
      cat = createCategoryShell(catId, order, universalDefs)
      categoryByCode.set(catId, cat)
      if (trackCodes.has(catId)) trackCategoryNodes.push(cat)
    }
    const existingCodes = new Set((cat.children || []).map((c) => String(c?.menu_code || '')))
    if (!orphanCode || !existingCodes.has(orphanCode)) {
      cat.children = sortNodes([...(cat.children || []), orphan])
    }
  }

  const universalNodes = universalDefs
    .map((def) => categoryByCode.get(def.id))
    .filter(Boolean)
    .map(sortChildren)

  // Keep new PM top-level leaves (granted from DB) visible even if they are not yet in PM_CATEGORY_DEFS.
  if (layout === 'pm' || layout === 'tm') {
    const seen = new Set(universalNodes.map((n) => String(n?.menu_code || '')))
    for (const [code, node] of categoryByCode) {
      if (seen.has(code)) continue
      if (!/^plat_pm_/.test(code)) continue
      const hasRoute = Boolean(String(node?.route_path || '').trim())
      const hasChildren = (node.children || []).length > 0
      if (!hasRoute && !hasChildren) continue
      universalNodes.push(sortChildren(node))
      seen.add(code)
    }
    universalNodes.sort((a, b) => {
      const ao = categoryOrder.get(String(a?.menu_code || '')) ?? a?.sort_order ?? 999
      const bo = categoryOrder.get(String(b?.menu_code || '')) ?? b?.sort_order ?? 999
      return ao - bo
    })
  }

  trackCategoryNodes.sort((a, b) => {
    const ao = trackOrder.get(a.menu_code) ?? 999
    const bo = trackOrder.get(b.menu_code) ?? 999
    return ao - bo
  })

  return { universalNodes, trackCategoryNodes, orphanCount }
}

/** @deprecated Use reorganizeMenuRoots(roots, 'pmo') */
export function reorganizePmoMenuRoots(roots = []) {
  return reorganizeMenuRoots(roots, 'pmo')
}

/** menu_code values for category rows to hydrate from DB. */
export function getCategoryMenuCodes(layout = 'pmo') {
  const config = LAYOUT_CONFIG[layout] || LAYOUT_CONFIG.pmo
  return [...config.universalIds, ...config.trackCodes]
}

/** @deprecated Use getCategoryMenuCodes('pmo') */
export function getPmoCategoryMenuCodes() {
  return getCategoryMenuCodes('pmo')
}

/** Resolve layout key for platform useMenu (tm shares pm ordering). */
export function resolvePlatformHierarchyLayout(layoutHintLayout) {
  if (layoutHintLayout === 'pmo') return 'pmo'
  if (layoutHintLayout === 'pm' || layoutHintLayout === 'tm') return 'pm'
  return null
}

export function getTrackAnchorForLayout(layout = 'pmo') {
  return (LAYOUT_CONFIG[layout] || LAYOUT_CONFIG.pmo).trackAnchor
}

/** Override DB sort_order with v671 category order. */
export function applyCategorySortOrders(nodes = [], layout = 'pmo') {
  const config = LAYOUT_CONFIG[layout] || LAYOUT_CONFIG.pmo
  const { categoryOrder, trackOrder } = buildOrderMaps(config.universalDefs, config.trackCodes)
  return (nodes || []).map((node) => {
    const code = String(node?.menu_code || '')
    const order = categoryOrder.get(code) ?? trackOrder.get(code)
    return order != null ? { ...node, sort_order: order } : node
  })
}

/** @deprecated Use applyCategorySortOrders(nodes, 'pmo') */
export function applyPmoCategorySortOrders(nodes = []) {
  return applyCategorySortOrders(nodes, 'pmo')
}

/** Back-compat alias */
export function inferPmoCategoryId(node = {}) {
  return inferPlatformCategoryId(node)
}

const EXEC_OVERVIEW_CHILD_ORDER = ['dashboard', 'portfolio', 'programme', 'planning', 'other']

const EXEC_OVERVIEW_SORT_ORDER = {
  dashboard: 1,
  portfolio: 2,
  programme: 3,
  planning: 4,
  other: 5,
}

const PROJECTS_LEAF_ORDER = [
  /project dashboard|dashboard\?tab=projects/i,
  /my projects/i,
  /all projects|project list|projects\/all/i,
  /create project|projects\/create/i,
  /quick create|projects\/new/i,
  /archived projects|projects\/archives/i,
  /on hold|drafts/i,
  /members.*roles|project-members/i,
  /daily log/i,
  /story map/i,
  /releases/i,
]

const OVERSIGHT_LEAF_ORDER = [
  /risk register/i,
  /issue register/i,
  /quality register/i,
  /lessons log/i,
  /delay register|\/pmo\/oversight\/delays|\/platform\/delays(?!\/templates)/i,
  /scope oversight/i,
  /schedule oversight/i,
  /change register/i,
]

function leafOrderIndex(node, patterns) {
  const signal = `${node?.menu_code || ''} ${node?.menu_label || ''} ${node?.route_path || ''}`
  const idx = patterns.findIndex((re) => re.test(signal))
  return idx === -1 ? patterns.length : idx
}

function orderLeavesByPatterns(leaves = [], patterns = []) {
  return sortNodes(
    [...leaves].sort(
      (a, b) => leafOrderIndex(a, patterns) - leafOrderIndex(b, patterns) || (a.sort_order || 0) - (b.sort_order || 0)
    )
  )
}

/** Same feature may appear under legacy and v681 routes — dedupe by semantic feature key. */
function pickPreferredMenuLeaf(existing, incoming) {
  return pickPreferredPmoMenuLeaf(existing, incoming)
}

function nodeDedupeKey(node = {}, layout = 'pmo') {
  return pmoMenuNodeDedupeKey(node, layout)
}

function dedupeMenuNodes(nodes = [], layout = 'pmo') {
  const seen = new Set()
  const out = []
  for (const node of nodes) {
    const key = nodeDedupeKey(node, layout)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(node)
  }
  return out
}

function normalizeMenuLabel(label = '') {
  return String(label || '').trim().toLowerCase()
}

function isDashboardMenuLabel(label = '') {
  return normalizeMenuLabel(label) === 'dashboard'
}

function isExecutiveOverviewRoute(path = '', layout = 'pmo') {
  const normalized = String(path || '').trim().toLowerCase()
  if (!normalized || normalized === '/') return true
  if (layout === 'sim_pmo') return /\/simulator\/(pmo\/)?dashboard/.test(normalized)
  return /\/platform\/dashboard/.test(normalized) && !/tab=/.test(normalized)
}

function isExecutiveOverviewDashboardLeaf(node = {}, layout = 'pmo') {
  return Boolean(executiveDashboardSemanticKey(node, layout))
}

/** Group containers (plat_grp_*) win over a mis-set /platform/dashboard route_path. */
function classifyExecutiveOverviewSectionBucket(node = {}, layout = 'pmo') {
  const code = String(node?.menu_code || '').trim().toLowerCase()
  const label = normalizeMenuLabel(node?.menu_label)
  const hasChildren = (node?.children || []).length > 0

  if (
    code === 'plat_grp_portfolio' ||
    code === 'pmo-cat-portfolio' ||
    code === 'sim_grp_pmo_portfolio' ||
    ((/^portfolio$|^practice portfolio$/.test(label) || code.includes('portfolio')) && (hasChildren || !String(node?.route_path || '').trim()))
  ) {
    return 'portfolio'
  }

  if (
    code === 'plat_grp_programme' ||
    code === 'pmo-cat-programme' ||
    code === 'sim_grp_pmo_programme' ||
    ((/^programme$|^practice programme$/.test(label) || (code.includes('programme') && !code.includes('portfolio'))) &&
      (hasChildren || !String(node?.route_path || '').trim()))
  ) {
    return 'programme'
  }

  if (
    code === 'plat_grp_plan_intel' ||
    code === 'pmo-cat-planning' ||
    code === 'pmo_planning' ||
    code === 'sim_pmo_plan_intel' ||
    code === 'sim_pmo_section_planning' ||
    /^planning intelligence$/.test(label) ||
    /^practice planning intelligence$/.test(label) ||
    ((code.includes('plan_intel') || code.includes('planning_intelligence')) &&
      (hasChildren || !String(node?.route_path || '').trim()))
  ) {
    return 'planning'
  }

  return null
}

function finalizeExecutiveOverviewOrder(ordered = [], layout = 'pmo') {
  let dashboardKept = false
  const out = []

  for (const node of ordered) {
    if (isExecutiveOverviewDashboardLeaf(node, layout)) {
      if (dashboardKept) continue
      dashboardKept = true
      out.push({ ...node, menu_label: String(node.menu_label || '').trim() || 'Dashboard' })
      continue
    }

    if (node?.children?.length) {
      const children = (node.children || []).filter((child) => !isExecutiveOverviewDashboardLeaf(child, layout))
      out.push({ ...node, children })
      continue
    }

    out.push(node)
  }

  return out
}

function cloneMenuSubtree(node) {
  if (!node) return null
  return {
    ...node,
    children: sortNodes((node.children || []).map(cloneMenuSubtree).filter(Boolean)),
  }
}

function classifyExecutiveOverviewChild(node = {}, layout = 'pmo') {
  const sectionBucket = classifyExecutiveOverviewSectionBucket(node, layout)
  if (sectionBucket) return sectionBucket

  const code = String(node?.menu_code || '').toLowerCase()
  const label = normalizeMenuLabel(node?.menu_label)
  const path = String(node?.route_path || '').trim().toLowerCase()
  const signal = `${code} ${label} ${path}`

  if (layout === 'sim_pmo') {
    if (/practice dashboard|\/simulator\/pmo\/dashboard/.test(signal)) return 'dashboard'
  } else if (
    (isExecutiveOverviewRoute(path, layout) || isDashboardMenuLabel(node?.menu_label)) &&
    !/monitoring|performance dashboard/.test(signal)
  ) {
    return 'dashboard'
  }

  if (
    code === 'pmo-cat-portfolio' ||
    code === 'pmo-portfolio' ||
    code === 'sim_pmo_cat_portfolio' ||
    code === 'plat_portfolio_overview' ||
    /^portfolio$/.test(label.trim()) ||
    /portfolio overview|portfolio dependencies|portfolio collisions/.test(signal) ||
    /^\/platform\/portfolio\/?$/.test(path)
  ) {
    return 'portfolio'
  }

  if (
    code === 'pmo-cat-programme' ||
    code === 'pmo-programme' ||
    code === 'programme' ||
    code === 'sim_pmo_cat_programme' ||
    /^programme$/.test(label.trim()) ||
    /programme management|benefits management/.test(signal) ||
    (/\/platform\/programme|\/platform\/benefits/.test(path) && !LEGACY_PROGRAMME_LABEL_RE.test(label.trim()))
  ) {
    return 'programme'
  }

  if (
    code === 'pmo-planning' ||
    code === 'pmo_planning' ||
    code === 'pmo-cat-planning' ||
    code === 'planning_intelligence' ||
    code === 'pmo_intel_rules' ||
    code === 'sim_pmo_section_planning' ||
    code.startsWith('sim_pmo_planning') ||
    code.startsWith('pmo-planning') ||
    code.startsWith('pmo_planning') ||
    /^planning intelligence$/.test(label.trim()) ||
    /planning hub|intelligence rules|governance rules/.test(signal)
  ) {
    return 'planning'
  }

  return 'other'
}

function getV671CanonicalExecBucket(layout, bucketKey) {
  const canon = V671_CANONICAL_EXEC[layout] || V671_CANONICAL_EXEC.pmo
  return (canon[bucketKey] || []).map((n) => cloneMenuSubtree(n))
}

function mergeV671Leaves(dbLeaves = [], canonicalLeaves = [], leafFilter, leafOrder, layout) {
  const byKey = new Map()
  const setLeaf = (leaf) => {
    const key = nodeDedupeKey(leaf, layout)
    byKey.set(key, cloneMenuSubtree(pickPreferredMenuLeaf(byKey.get(key), leaf)))
  }
  for (const leaf of canonicalLeaves) setLeaf(leaf)
  for (const leaf of dbLeaves) {
    if (!leafFilter(leaf, layout)) continue
    setLeaf(leaf)
  }
  return orderLeavesByPatterns([...byKey.values()], leafOrder)
}

/** Apply display labels from v671 category defs (fixes raw pmo-cat-* menu_label in DB). */
export function applyCategoryPresentationLabels(nodes = []) {
  return (nodes || []).map((node) => {
    const code = String(node?.menu_code || '').trim()
    const presentation = CATEGORY_PRESENTATION_LABELS.get(code)
    const label = String(node?.menu_label || '').trim()
    // Only fill missing/code-as-label shells — never override a real DB menu_label.
    const needsLabel =
      presentation &&
      (!label || label === code || label.toLowerCase() === code.toLowerCase())
    const next = needsLabel ? { ...node, menu_label: presentation } : node
    const children = applyCategoryPresentationLabels(next.children || [])
    return children.length ? { ...next, children } : next
  })
}

function execSubsectionCodes(layout) {
  if (layout === 'sim_pmo') {
    return {
      portfolio: 'sim_pmo_cat_portfolio',
      programme: 'sim_pmo_cat_programme',
      planning: 'sim_pmo_cat_planning',
      projects: 'sim_pmo_cat_projects',
      oversight: 'sim_pmo_cat_project_oversight',
    }
  }
  return {
    portfolio: 'pmo-cat-portfolio',
    programme: 'pmo-cat-programme',
    planning: 'pmo-planning',
    projects: 'pmo-cat-projects',
    oversight: 'pmo-cat-project-oversight',
  }
}

const V671_PROGRAMME_LEAF_ORDER = [/programme management/i, /benefits management/i]

const V671_PLANNING_LEAF_ORDER = [/planning hub/i, /intelligence rules/i, /governance rules/i]

const V671_PORTFOLIO_LEAF_ORDER = [/portfolio overview/i, /dependencies/i, /collisions/i]

function flattenExecBucket(node, acc = []) {
  if (!node) return acc
  const label = String(node?.menu_label || '').trim()
  const isSectionHub = /^(portfolio|programme|planning intelligence|practice portfolio|practice programme|practice planning intelligence)$/i.test(
    label
  )
  if (isSectionHub && (node.children || []).length) {
    for (const child of node.children) flattenExecBucket(child, acc)
    return acc
  }
  if ((node.children || []).length) {
    for (const child of node.children) flattenExecBucket(child, acc)
    return acc
  }
  acc.push(node)
  return acc
}

function isV671ProgrammeLeaf(node = {}, layout = 'pmo') {
  const code = String(node?.menu_code || '').trim().toLowerCase()
  const label = String(node?.menu_label || '').trim()
  const path = String(node?.route_path || '').trim().toLowerCase()

  if (layout === 'sim_pmo') {
    return (
      /^programme management$/i.test(label) ||
      /^benefits management$/i.test(label) ||
      code === 'sim-pmo-pp-programme' ||
      code === 'sim_pmo_pp_programme' ||
      code === 'sim-pmo-pp-benefits' ||
      code === 'sim_pmo_pp_benefits' ||
      /\/simulator\/practice-programme/.test(path) ||
      /\/simulator\/benefits/.test(path)
    )
  }

  if (LEGACY_PROGRAMME_LABEL_RE.test(label)) return false

  return (
    /^programme management$/i.test(label) ||
    /^benefits management$/i.test(label) ||
    code === 'pmo-pp-programme' ||
    code === 'pmo_pp_programme' ||
    code === 'pmo-pp-benefits' ||
    code === 'pmo_pp_benefits' ||
    /\/platform\/benefits/.test(path) ||
    (/\/platform\/programme/.test(path) && !/^\/programme\/?$/.test(path))
  )
}

function isV671PlanningLeaf(node = {}, layout = 'pmo') {
  if (isExecutiveOverviewDashboardLeaf(node, layout)) return false

  const code = String(node?.menu_code || '').trim().toLowerCase()
  const label = String(node?.menu_label || '').trim()
  const path = String(node?.route_path || '').trim().toLowerCase()

  const labelMatch =
    /^planning hub$/i.test(label) ||
    /^intelligence rules$/i.test(label) ||
    /^governance rules/i.test(label)

  const pathMatch =
    /^\/pmo\/planning\/?$/.test(path) ||
    /^\/pmo\/planning\/intelligence/.test(path) ||
    /^\/pmo\/planning\/governance/.test(path)

  if (layout === 'sim_pmo') {
    return (
      labelMatch ||
      pathMatch ||
      /^\/simulator\/pmo\/planning/.test(path) ||
      code.startsWith('sim_pmo_planning_') ||
      code.startsWith('sim-pmo-planning-')
    )
  }

  const codeMatch =
    code.startsWith('plat_plan_intel_') ||
    code === 'pmo-planning-hub' ||
    code === 'pmo-planning-intelligence' ||
    code === 'pmo-planning-governance-config'

  const legacyCodeMatch =
    code === 'pmo_planning_hub' ||
    code === 'pmo_planning_intelligence' ||
    code === 'pmo_planning_governance_config'

  if (labelMatch || pathMatch || codeMatch) return true
  if (legacyCodeMatch && (labelMatch || pathMatch)) return true

  return false
}

function isV671PortfolioLeaf(node = {}, layout = 'pmo') {
  const code = String(node?.menu_code || '').trim().toLowerCase()
  const label = String(node?.menu_label || '').trim()
  const path = String(node?.route_path || '').trim().toLowerCase()
  const signal = `${code} ${label} ${path}`

  if (/portfolio map|strategic alignment|benefits pipeline/.test(signal)) return false

  if (layout === 'sim_pmo') {
    return (
      /portfolio dependencies|portfolio collisions/i.test(label) ||
      code === 'sim-pmo-pp-dependencies' ||
      code === 'sim-pmo-pp-collisions' ||
      /\/simulator\/practice-dependencies/.test(path) ||
      /\/simulator\/pmo\/planning\/collisions/.test(path)
    )
  }

  return (
    /portfolio overview/i.test(label) ||
    code === 'plat_portfolio_overview' ||
    /^\/platform\/portfolio\/?$/.test(path) ||
    /portfolio dependencies/i.test(label) ||
    (/^dependencies$/i.test(label) && /\/platform\/(portfolio\/)?dependencies/.test(path)) ||
    /portfolio collisions/i.test(label) ||
    code === 'pmo-pp-overview' ||
    code === 'pmo-pp-dependencies' ||
    code === 'pmo-pp-collisions' ||
    code === 'plat_portfolio_dependencies' ||
    code === 'plat_portfolio_collisions' ||
    /\/platform\/portfolio\/dependencies/.test(path) ||
    /\/platform\/dependencies/.test(path) ||
    /\/pmo\/planning\/collisions/.test(path)
  )
}

function buildV671ExecSubsection(label, menuCode, icon, bucketItems, leafFilter, leafOrder, sortOrder, layout, bucketKey) {
  const leaves = []
  for (const item of bucketItems || []) flattenExecBucket(item, leaves)
  const canonical = getV671CanonicalExecBucket(layout, bucketKey)
  const filtered = mergeV671Leaves(leaves, canonical, leafFilter, leafOrder, layout)
  if (!filtered.length) return null
  return {
    menu_code: menuCode,
    menu_label: label,
    route_path: null,
    sort_order: sortOrder,
    menu_icon: icon,
    children: filtered,
    is_visible: true,
    is_active: true,
    canUse: true,
  }
}

function pickV671DashboardLeaves(dashboardItems = [], layout = 'pmo') {
  const leaves = []
  for (const item of dashboardItems || []) flattenExecBucket(item, leaves)
  const canonical = getV671CanonicalExecBucket(layout, 'dashboard')
  const merged = mergeV671Leaves(
    leaves,
    canonical,
    (n) => isExecutiveOverviewDashboardLeaf(n, layout),
    [/dashboard/i],
    layout
  )
  if (merged.length <= 1) return merged

  const preferred =
    merged.find((n) => {
      const code = String(n?.menu_code || '').toLowerCase()
      const path = String(n?.route_path || '').toLowerCase()
      if (layout === 'sim_pmo') {
        return code.includes('sim_pmo_dashboard') || /\/simulator\/pmo\/dashboard/.test(path)
      }
      return (
        code === 'pmo_dashboard' ||
        code === 'pmo-dashboard' ||
        (/\/platform\/dashboard/.test(path) && !/tab=/.test(path))
      )
    }) || merged[0]

  return [preferred]
}

/**
 * v719: Move Portfolio / Programme / Planning Intelligence from Executive Overview
 * into Portfolio & Delivery before subsection nesting runs.
 */
function harvestExecSubsectionsForPortfolioDelivery(universalNodes = [], layout = 'pmo') {
  if (layout !== 'pmo' && layout !== 'sim_pmo') return universalNodes

  const execCode = layout === 'sim_pmo' ? 'sim_pmo_cat_exec' : 'pmo-cat-exec'
  const deliveryCode = layout === 'sim_pmo' ? 'sim_pmo_cat_project_delivery' : 'pmo-cat-project-delivery'

  let execNode = null
  let deliveryNode = null
  const other = []

  for (const node of universalNodes || []) {
    const code = String(node?.menu_code || '')
    if (code === execCode) execNode = node
    else if (code === deliveryCode) deliveryNode = node
    else other.push(node)
  }

  if (!execNode || !deliveryNode) return universalNodes

  const stayOnExec = []
  const harvest = []
  for (const child of execNode.children || []) {
    const bucket = classifyExecutiveOverviewChild(child, layout)
    if (bucket === 'portfolio' || bucket === 'programme' || bucket === 'planning') {
      harvest.push(child)
    } else {
      stayOnExec.push(child)
    }
  }

  if (!harvest.length) return universalNodes

  return [
    ...other,
    { ...execNode, children: stayOnExec },
    {
      ...deliveryNode,
      children: sortNodes([...harvest, ...(deliveryNode.children || [])]),
    },
  ]
}

/**
 * v671 §5.1.1 / v719: Executive Overview → Dashboard only.
 */
export function nestExecutiveOverviewSections(universalNodes = [], layout = 'pmo') {
  if (layout !== 'pmo' && layout !== 'sim_pmo') return universalNodes

  const execCode = layout === 'sim_pmo' ? 'sim_pmo_cat_exec' : 'pmo-cat-exec'

  return universalNodes.map((node) => {
    if (node.menu_code !== execCode) return node

    const buckets = Object.fromEntries(EXEC_OVERVIEW_CHILD_ORDER.map((k) => [k, []]))
    for (const child of node.children || []) {
      buckets[classifyExecutiveOverviewChild(child, layout)].push(child)
    }

    const ordered = []
    for (const child of pickV671DashboardLeaves(buckets.dashboard, layout)) {
      ordered.push({ ...child, sort_order: EXEC_OVERVIEW_SORT_ORDER.dashboard })
    }

    for (const child of sortNodes(buckets.other)) {
      if (isExecutiveOverviewDashboardLeaf(child, layout)) continue
      if (classifyExecutiveOverviewChild(child, layout) !== 'other') continue
      ordered.push({ ...child, sort_order: EXEC_OVERVIEW_SORT_ORDER.other })
    }

    return { ...node, children: finalizeExecutiveOverviewOrder(ordered, layout) }
  })
}

/** v851/v852 Forms|Templates domainGroup leaves — not PMO "Forms & Documents". */
function isTemplateDomainGroupSubmenuLeaf(node = {}) {
  const code = String(node?.menu_code || '').toLowerCase()
  const path = String(node?.route_path || '').toLowerCase()
  if (/domaingrouproup=(forms|templates)/.test(path)) return true
  return /_(?:tpl_library|tpl_organisational|pm_templates|pm_project_templates)_(?:forms|templates)$/.test(
    code,
  )
}

function classifyProjectDeliveryChild(node = {}, layout = 'pmo') {
  const code = String(node?.menu_code || '').toLowerCase()
  const label = String(node?.menu_label || '').toLowerCase()
  const path = String(node?.route_path || '').toLowerCase()
  const signal = `${code} ${label} ${path}`

  // Keep Template Library / Organisational Templates Forms|Templates children on delivery.
  // The workflows regex matches bare "forms" and would otherwise relocate them.
  if (isTemplateDomainGroupSubmenuLeaf(node)) {
    return 'other'
  }

  if (
    /forms|draft forms|process group forms|\/pmo\/forms|authorisation|lifecycle dashboard|archive vault/.test(
      signal
    )
  ) {
    return 'workflows'
  }

  const codes = execSubsectionCodes(layout)
  if (code === codes.projects || code === 'plat_grp_projects' || /^projects$|^practice projects$/.test(label.trim())) {
    return 'projects'
  }
  if (
    code === codes.oversight ||
    code === 'plat_grp_oversight' ||
    /^project oversight$|^practice project oversight$/.test(label.trim())
  ) {
    return 'oversight'
  }

  if (/^my tasks$|\/platform\/tasks(?:\/mine|\/?$)|^calendar$|\/platform\/calendar\/?$/.test(signal)) {
    return 'projects'
  }

  if (/delay template|delays\/templates|delay_templates|pmo_pt_delay|plat_pt_delay/.test(signal)) {
    return 'other'
  }

  if (
    /risk register|issue register|quality register|lessons log|delay register|scope oversight|schedule oversight|change register|\/pmo\/oversight|\/pmo\/registers/.test(
      signal
    )
  ) {
    return 'oversight'
  }

  if (
    /story map|releases|my projects|archived|on hold|members|daily log|create project|quick create|project dashboard|projects\/all|\/platform\/projects|\/app\/projects|\/app\/project-members|\/app\/daily-log/.test(
      signal
    )
  ) {
    return 'projects'
  }

  return 'other'
}

/**
 * If Forms/Templates domainGroup leaves arrived as siblings of their parent
 * (Template Library / Organisational Templates), nest them back under that parent.
 */
function attachTemplateDomainGroupSubmenus(nodes = []) {
  const list = (nodes || []).map((n) => cloneMenuSubtree(n)).filter(Boolean)
  const byCode = new Map(list.map((n) => [String(n?.menu_code || '').trim(), n]))

  const parentForChildCode = (childCode) => {
    const code = String(childCode || '').trim()
    const pairs = [
      ['plat_tpl_library_templates', 'plat_tpl_library'],
      ['plat_tpl_library_forms', 'plat_tpl_library'],
      ['sim_tpl_library_templates', 'sim_tpl_library'],
      ['sim_tpl_library_forms', 'sim_tpl_library'],
      ['plat_tpl_organisational_templates', 'plat_tpl_organisational'],
      ['plat_tpl_organisational_forms', 'plat_tpl_organisational'],
      ['sim_tpl_organisational_templates', 'sim_tpl_organisational'],
      ['sim_tpl_organisational_forms', 'sim_tpl_organisational'],
    ]
    const hit = pairs.find(([child]) => child === code)
    return hit ? hit[1] : null
  }

  const consumed = new Set()
  for (const node of list) {
    const code = String(node?.menu_code || '').trim()
    const parentCode = parentForChildCode(code)
    if (!parentCode) continue
    const parent = byCode.get(parentCode)
    if (!parent) continue
    const existing = new Set((parent.children || []).map((c) => String(c?.menu_code || '').trim()))
    if (!existing.has(code)) {
      parent.children = sortNodes([...(parent.children || []), cloneMenuSubtree(node)])
    }
    consumed.add(code)
  }

  return list.filter((n) => !consumed.has(String(n?.menu_code || '').trim()))
}

function flattenDeliveryBucket(node, bucket, layout, acc) {
  const kind = classifyProjectDeliveryChild(node, layout)
  if (kind !== bucket) return

  const label = String(node?.menu_label || '').trim()
  const isHub =
    (bucket === 'projects' && /^projects$|^practice projects$/i.test(label)) ||
    (bucket === 'oversight' && /^project oversight$/i.test(label))

  if (isHub && (node.children || []).length) {
    for (const child of node.children) flattenDeliveryBucket(child, bucket, layout, acc)
    return
  }

  if ((node.children || []).length && kind === bucket) {
    for (const child of node.children) flattenDeliveryBucket(child, bucket, layout, acc)
    return
  }

  acc.push(node)
}

function getV671CanonicalDeliveryBucket(layout, bucketKey) {
  const canon = V671_CANONICAL_DELIVERY[layout] || V671_CANONICAL_DELIVERY.pmo
  return (canon?.[bucketKey] || []).map((n) => cloneMenuSubtree(n))
}

function buildDeliverySubsection(label, menuCode, icon, leaves, orderPatterns, sortOrder, layout, bucketKey, leafFilter) {
  const canonical = getV671CanonicalDeliveryBucket(layout, bucketKey)
  const ordered = mergeV671Leaves(leaves, canonical, leafFilter, orderPatterns, layout)
  if (!ordered.length) return null
  return {
    menu_code: menuCode,
    menu_label: label,
    route_path: null,
    sort_order: sortOrder,
    menu_icon: icon,
    children: ordered,
    is_visible: true,
    is_active: true,
    canUse: true,
  }
}

function relocateMisbucketedDeliveryOrphans(universalNodes = [], misbucketed = [], deliveryCode, layout = 'pmo') {
  if (!misbucketed.length) return universalNodes

  return universalNodes.map((node) => {
    const code = String(node?.menu_code || '')
    if (code === deliveryCode) return node

    const existing = new Set((node.children || []).map((c) => String(c?.menu_code || '')))
    const merged = [...(node.children || [])]
    for (const o of misbucketed) {
      if (inferCategoryId(o, layout) !== code) continue
      const key = String(o?.menu_code || '')
      if (!key || existing.has(key)) continue
      existing.add(key)
      merged.push(cloneMenuSubtree(o))
    }
    if (merged.length === (node.children || []).length) return node
    return { ...node, children: sortNodes(merged) }
  })
}

function relocateAllMisbucketedDeliveryOrphans(universalNodes, misbucketed, deliveryCode, layout) {
  if (!misbucketed.length) return universalNodes
  let nodes = universalNodes
  const byTarget = new Map()
  for (const item of misbucketed) {
    const target = inferCategoryId(item, layout)
    if (target === deliveryCode) continue
    if (!byTarget.has(target)) byTarget.set(target, [])
    byTarget.get(target).push(item)
  }
  for (const [, items] of byTarget) {
    nodes = relocateMisbucketedDeliveryOrphans(nodes, items, deliveryCode, layout)
  }
  return nodes
}

function trackCategoryIdsForLayout(layout = 'pmo') {
  if (layout === 'sim_pmo') return SIM_PMO_TRACK_CODES
  if (layout === 'sim_pm') return SIM_PM_TRACK_CODES
  return PLATFORM_TRACK_CODES
}

/** Move delivery orphans that belong under [S]/[P]/[A] track category rows. */
export function relocateMisbucketedToTrackCategories(trackCategoryNodes = [], misbucketed = [], layout = 'pmo') {
  if (!misbucketed.length) return trackCategoryNodes
  const trackIds = trackCategoryIdsForLayout(layout)

  return (trackCategoryNodes || []).map((node) => {
    const code = String(node?.menu_code || '')
    if (!trackIds.has(code)) return node

    const existing = new Set((node.children || []).map((c) => String(c?.menu_code || '')))
    const merged = [...(node.children || [])]
    for (const o of misbucketed) {
      if (inferCategoryId(o, layout) !== code) continue
      const key = String(o?.menu_code || '')
      if (!key || existing.has(key)) continue
      existing.add(key)
      merged.push(cloneMenuSubtree(o))
    }
    if (merged.length === (node.children || []).length) return node
    return { ...node, children: sortNodes(merged) }
  })
}

function relocateDeliveryWorkflowOrphans(universalNodes = [], workflowOrphans = [], layout = 'pmo') {
  if (!workflowOrphans.length) return universalNodes
  const workflowsCode = layout === 'sim_pmo' ? 'sim_pmo_cat_workflows' : 'pmo-cat-workflows-approvals'
  const orphans = dedupeMenuNodes(workflowOrphans.map(cloneMenuSubtree).filter(Boolean), layout)

  return universalNodes.map((node) => {
    if (node.menu_code !== workflowsCode) return node
    const existing = new Set((node.children || []).map((c) => String(c?.menu_code || '')))
    const merged = [...(node.children || [])]
    for (const o of orphans) {
      const key = String(o?.menu_code || '')
      if (!key || existing.has(key)) continue
      existing.add(key)
      merged.push(o)
    }
    return { ...node, children: sortNodes(merged) }
  })
}

function isProjectExecutionShell(node = {}) {
  const code = String(node?.menu_code || '').trim()
  const label = String(node?.menu_label || '').trim()
  return (
    code === 'plat_grp_project_execution' ||
    code === 'pmo-v671-project-execution' ||
    code === 'sim_pmo_v671_project_execution' ||
    /^project execution$|^practice project execution$/.test(label)
  )
}

/**
 * v671 §5.1.1 / v719: Portfolio & Delivery → Portfolio, Programme, Planning Intelligence,
 * Project Execution (Projects + Project Oversight); forms move to Workflows.
 */
export function nestProjectDeliverySections(universalNodes = [], layout = 'pmo') {
  if (layout !== 'pmo' && layout !== 'sim_pmo') {
    return { universalNodes, trackMisbucketed: [] }
  }

  const deliveryCode = layout === 'sim_pmo' ? 'sim_pmo_cat_project_delivery' : 'pmo-cat-project-delivery'
  const codes = execSubsectionCodes(layout)
  const portfolioDef = DELIVERY_MANAGEMENT_SUB_DEFS.find((d) => d.id === 'pmo-cat-portfolio')
  const programmeDef = DELIVERY_MANAGEMENT_SUB_DEFS.find((d) => d.id === 'pmo-cat-programme')
  const planningDef = DELIVERY_MANAGEMENT_SUB_DEFS.find((d) => d.id === 'pmo-cat-planning')
  const projectsDef = DELIVERY_MANAGEMENT_SUB_DEFS.find((d) => d.id === 'pmo-cat-projects')
  const oversightDef = DELIVERY_MANAGEMENT_SUB_DEFS.find((d) => d.id === 'pmo-cat-project-oversight')
  const trackIds = trackCategoryIdsForLayout(layout)
  const workflowOrphans = []
  const misbucketedOrphans = []
  const trackMisbucketed = []

  let nodes = universalNodes.map((node) => {
    if (node.menu_code !== deliveryCode) return node

    const portfolioItems = []
    const programmeItems = []
    const planningItems = []
    const projectsLeaves = []
    const oversightLeaves = []

    const deliveryChildren = []
    for (const child of node.children || []) {
      if (isProjectExecutionShell(child) && (child.children || []).length) {
        deliveryChildren.push(...child.children)
      } else {
        deliveryChildren.push(child)
      }
    }

    for (const child of deliveryChildren) {
      const execBucket = classifyExecutiveOverviewChild(child, layout)
      if (execBucket === 'portfolio') {
        portfolioItems.push(child)
        continue
      }
      if (execBucket === 'programme') {
        programmeItems.push(child)
        continue
      }
      if (execBucket === 'planning') {
        planningItems.push(child)
        continue
      }

      const bucket = classifyProjectDeliveryChild(child, layout)
      if (bucket === 'workflows') workflowOrphans.push(child)
      else if (bucket === 'projects') flattenDeliveryBucket(child, 'projects', layout, projectsLeaves)
      else if (bucket === 'oversight') flattenDeliveryBucket(child, 'oversight', layout, oversightLeaves)
      else {
        const target = inferCategoryId(child, layout)
        if (trackIds.has(target)) trackMisbucketed.push(child)
        else misbucketedOrphans.push(child)
      }
    }

    const portfolioLabel = layout === 'sim_pmo' ? 'Practice Portfolio' : portfolioDef?.label || 'Portfolio'
    const programmeLabel = layout === 'sim_pmo' ? 'Practice Programme' : programmeDef?.label || 'Programme'
    const planningLabel =
      layout === 'sim_pmo' ? 'Practice Planning Intelligence' : planningDef?.label || 'Planning Intelligence'
    const projectsLabel = layout === 'sim_pmo' ? 'Practice Projects' : projectsDef?.label || 'Projects'
    const oversightLabel = layout === 'sim_pmo' ? 'Practice Project Oversight' : oversightDef?.label || 'Project Oversight'

    const children = []

    const portfolioNode = buildV671ExecSubsection(
      portfolioLabel,
      codes.portfolio,
      'briefcase',
      portfolioItems,
      isV671PortfolioLeaf,
      V671_PORTFOLIO_LEAF_ORDER,
      portfolioDef?.order ?? 1,
      layout,
      'portfolio'
    )
    if (portfolioNode) children.push(portfolioNode)

    const programmeNode = buildV671ExecSubsection(
      programmeLabel,
      codes.programme,
      'layers',
      programmeItems,
      isV671ProgrammeLeaf,
      V671_PROGRAMME_LEAF_ORDER,
      programmeDef?.order ?? 2,
      layout,
      'programme'
    )
    if (programmeNode) children.push(programmeNode)

    const planningNode = buildV671ExecSubsection(
      planningLabel,
      codes.planning,
      'bar-chart-3',
      planningItems,
      isV671PlanningLeaf,
      V671_PLANNING_LEAF_ORDER,
      planningDef?.order ?? 3,
      layout,
      'planning'
    )
    if (planningNode) children.push(planningNode)

    const projectsShell = buildDeliverySubsection(
      projectsLabel,
      codes.projects,
      'folder-kanban',
      projectsLeaves,
      PROJECTS_LEAF_ORDER,
      1,
      layout,
      'projects',
      (n, l) => classifyProjectDeliveryChild(n, l) === 'projects'
    )

    const oversightShell = buildDeliverySubsection(
      oversightLabel,
      codes.oversight,
      'eye',
      oversightLeaves,
      OVERSIGHT_LEAF_ORDER,
      2,
      layout,
      'oversight',
      (n, l) => classifyProjectDeliveryChild(n, l) === 'oversight'
    )

    const executionChildren = [projectsShell, oversightShell].filter(Boolean)
    if (executionChildren.length) {
      children.push({
        menu_code: layout === 'sim_pmo' ? 'sim_pmo_v671_project_execution' : 'pmo-v671-project-execution',
        menu_label: layout === 'sim_pmo' ? 'Practice Project Execution' : 'Project Execution',
        route_path: null,
        sort_order: projectsDef?.order ?? 4,
        menu_icon: 'folder-kanban',
        children: executionChildren,
        is_visible: true,
        is_active: true,
        canUse: true,
      })
    }

    const stayOnDelivery = misbucketedOrphans.filter((c) => inferCategoryId(c, layout) === deliveryCode)
    const relocateAway = misbucketedOrphans.filter((c) => inferCategoryId(c, layout) !== deliveryCode)
    // Re-attach v851/v852 Forms|Templates leaves under their Template Library /
    // Organisational Templates parents when the DB tree arrived flat.
    const attached = attachTemplateDomainGroupSubmenus(stayOnDelivery)
    for (const leaf of attached) children.push(cloneMenuSubtree(leaf))
    misbucketedOrphans.length = 0
    misbucketedOrphans.push(...relocateAway)

    return { ...node, children }
  })

  nodes = relocateDeliveryWorkflowOrphans(nodes, workflowOrphans, layout)
  nodes = relocateAllMisbucketedDeliveryOrphans(nodes, misbucketedOrphans, deliveryCode, layout)
  return { universalNodes: nodes, trackMisbucketed }
}

function flattenCategoryBucket(node, acc = []) {
  if (!node) return acc
  const hasChildren = (node.children || []).length > 0
  const hasRoute = Boolean(String(node?.route_path || '').trim())
  if (hasChildren && !hasRoute) {
    for (const child of node.children) flattenCategoryBucket(child, acc)
    return acc
  }
  if (hasChildren) {
    for (const child of node.children) flattenCategoryBucket(child, acc)
    return acc
  }
  acc.push(node)
  return acc
}

function buildV671CategorySubsection(def, bucketItems, layout) {
  const leaves = []
  for (const item of bucketItems || []) flattenCategoryBucket(item, leaves)
  const canonical = getV671CanonicalLeaves(def.canonicalKey, layout)
  const filtered = mergeV671Leaves(leaves, canonical, def.match, def.orderPatterns || [], layout)
  if (!filtered.length) return null
  return {
    menu_code: def.menuCode,
    menu_label: def.label,
    route_path: null,
    sort_order: def.sortOrder,
    menu_icon: def.icon,
    children: filtered,
    is_visible: true,
    is_active: true,
    canUse: true,
  }
}

/**
 * Apply v671 subsection structure to a category node (flat or grouped children).
 * @param {object} node
 * @param {'pmo'|'sim_pmo'} layout
 */
function flattenLegacyCategoryShells(nodes = [], layout = 'pmo') {
  return (nodes || []).flatMap((node) => {
    const code = String(node?.menu_code || '').trim()
    const children = flattenLegacyCategoryShells(node.children || [], layout)
    const next = { ...node, children }
    if (LEGACY_CATEGORY_SHELL_CODES.has(code) && (next.children || []).length) {
      return flattenLegacyCategoryShells(next.children, layout)
    }
    return [next]
  })
}

/**
 * Pull children that infer to a different category out of the wrong parent (e.g. Portfolio under Administration).
 */
function sanitizeMisnestedUniversalChildren(universalNodes = [], layout = 'pmo') {
  const relocate = []
  const sanitized = (universalNodes || []).map((node) => {
    const code = String(node?.menu_code || '')
    if (!PMO_UNIVERSAL_CATEGORY_IDS.has(code)) return node

    const stay = []
    for (const child of node.children || []) {
      const childCode = String(child?.menu_code || '').trim()
      let target = inferCategoryId(child, layout)
      if (LEGACY_CATEGORY_SHELL_CODES.has(childCode)) {
        const legacyTarget = LEGACY_CATEGORY_SHELL_TARGETS[childCode]
        if (legacyTarget) target = legacyTarget
      }
      if (target !== code) relocate.push(child)
      else stay.push(child)
    }
    return { ...node, children: stay }
  })
  return { universalNodes: sanitized, relocate }
}

export function nestV671CategoryNode(node = {}, layout = 'pmo') {
  const code = String(node?.menu_code || '')
  const spec = V671_CATEGORY_NESTING[code]
  if (!spec) return node

  const leaves = []
  for (const child of node.children || []) flattenCategoryBucket(child, leaves)

  if (spec.mode === 'flat') {
    const canonical = getV671CanonicalLeaves(spec.canonicalKey, layout)
    return {
      ...node,
      children: mergeV671Leaves(leaves, canonical, spec.match, spec.orderPatterns || [], layout),
    }
  }

  const buckets = spec.subsections.map((def) => ({ def, items: [] }))
  const unmatched = []
  const rootOrphans = []
  for (const leaf of leaves) {
    let matched = false
    for (const bucket of buckets) {
      if (bucket.def.match(leaf)) {
        bucket.items.push(leaf)
        matched = true
        break
      }
    }
    if (!matched && inferCategoryId(leaf, layout) === code) unmatched.push(leaf)
  }

  for (const leaf of unmatched) {
    let placed = false
    for (const bucket of buckets) {
      if (bucket.def.match(leaf)) {
        bucket.items.push(leaf)
        placed = true
        break
      }
    }
    if (!placed) {
      if (spec.keepOrphansAtRoot) rootOrphans.push(leaf)
      else if (buckets.length) buckets[buckets.length - 1].items.push(leaf)
    }
  }

  const children = []
  for (const { def, items } of buckets) {
    const subsection = buildV671CategorySubsection(def, items, layout)
    if (subsection) children.push(subsection)
  }

  if (rootOrphans.length) {
    const orphanCanonical = spec.orphanCanonicalKey
      ? getV671CanonicalLeaves(spec.orphanCanonicalKey, layout)
      : []
    const orphanMatch = spec.orphanMatch || (() => true)
    const orphanOrder = spec.orphanOrderPatterns || []
    children.push(...mergeV671Leaves(rootOrphans, orphanCanonical, orphanMatch, orphanOrder, layout))
  }

  return { ...node, children }
}

/** Nest universal PMO categories per v671 §5.1.1 (reporting, workflows, templates, …). */
export function nestV671UniversalCategories(universalNodes = [], layout = 'pmo') {
  if (layout !== 'pmo') return universalNodes
  return (universalNodes || []).map((node) => nestV671CategoryNode(node, layout))
}

/** Nest methodology track categories ([S]/[P]/[A] children) per v671. */
export function nestV671TrackCategories(trackCategoryNodes = [], layout = 'pmo') {
  if (layout !== 'pmo' && layout !== 'sim_pmo') return trackCategoryNodes
  const prepared = prepareTrackCategoryNodes(trackCategoryNodes, layout)
  return dedupePmoMenuTree(
    (prepared || []).map((node) => nestV671CategoryNode(node, layout)),
    layout
  )
}

function dissolveRetiredUniversalCategories(universalNodes = [], layout = 'pmo') {
  if (layout !== 'pmo') return universalNodes
  const relocatables = []
  const kept = []
  for (const node of universalNodes || []) {
    if (String(node?.menu_code || '') === 'pmo-cat-process-templates') {
      flattenCategoryBucket(node, relocatables)
      continue
    }
    kept.push(node)
  }
  if (!relocatables.length) return kept
  return relocateAllMisbucketedDeliveryOrphans(kept, relocatables, 'pmo-cat-project-delivery', layout)
}

/**
 * Executive Overview + Project Delivery + full v671 category alignment.
 * @returns {{ universalNodes: object[], trackMisbucketed: object[] }}
 */
export function applyPmoSectionNesting(universalNodes = [], layout = 'pmo') {
  const deliveryCode = layout === 'sim_pmo' ? 'sim_pmo_cat_project_delivery' : 'pmo-cat-project-delivery'

  let nodes = flattenLegacyCategoryShells(universalNodes, layout)
  nodes = dissolveRetiredUniversalCategories(nodes, layout)
  nodes = harvestExecSubsectionsForPortfolioDelivery(nodes, layout)
  const { universalNodes: sanitized, relocate: misnested } = sanitizeMisnestedUniversalChildren(nodes, layout)
  nodes = sanitized

  let nested = nestExecutiveOverviewSections(nodes, layout)
  const delivery = nestProjectDeliverySections(nested, layout)
  nested = nestV671UniversalCategories(delivery.universalNodes, layout)

  if (misnested.length) {
    nested = relocateAllMisbucketedDeliveryOrphans(nested, misnested, deliveryCode, layout)
  }

  return {
    universalNodes: dedupePmoMenuTree(applyCategoryPresentationLabels(nested), layout),
    trackMisbucketed: delivery.trackMisbucketed,
  }
}

/** Labels for methodology track category nodes (Initiation Hub, Agile & Lean Tools, …). */
export function applyTrackCategoryPresentationLabels(trackCategoryNodes = []) {
  return applyCategoryPresentationLabels(trackCategoryNodes).map(applyGovernanceCategoryPresentationLabels)
}

/** Shorten governance strategy labels to avoid sidebar overlap (v671 PMO sidebar). */
function applyGovernanceCategoryPresentationLabels(node = {}) {
  const code = String(node?.menu_code || '').trim()
  if (code !== 'pmo-cat-governance-standards') return node

  const children = (node.children || []).map((child) => {
    const label = String(child?.menu_label || '').trim()
    if (/^communication (mgmt |management )strategy$/i.test(label)) {
      return { ...child, menu_label: 'Communication Strategy' }
    }
    if (/^configuration (mgmt |management )strategy$/i.test(label)) {
      return { ...child, menu_label: 'Configuration Strategy' }
    }
    if (/^quality (mgmt |management )strategy$/i.test(label)) {
      return { ...child, menu_label: 'Quality Strategy' }
    }
    if (/^risk (mgmt |management )strategy$/i.test(label)) {
      return { ...child, menu_label: 'Risk Strategy' }
    }
    if (/^itto templates$/i.test(label)) {
      return { ...child, menu_label: 'ITTO Templates / Drafts' }
    }
    return child
  })

  return { ...node, children }
}
