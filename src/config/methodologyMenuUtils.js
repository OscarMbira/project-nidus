/**
 * Methodology-aware sidebar utilities (v671).
 * @see projectplan/v671_Methodology_Aware_Menu_Rationalisation_Plan.md
 */

/** @typedef {'structured'|'pmbok'|'agile'|'universal'|'hybrid'} MethodologyTrack */

export const METHODOLOGY_TRACK_IDS = ['structured', 'pmbok', 'agile']

export const METHODOLOGY_TRACK_DEFS = [
  {
    id: 'pmo-cat-structured',
    track: 'structured',
    label: 'Predictive - PRINCE2',
    shortLabel: 'PRINCE2',
    order: 5.2,
    menuIcon: 'shield',
    badge: 'S',
    color: '#3B82F6',
  },
  {
    id: 'pmo-cat-pmbok',
    track: 'pmbok',
    label: 'Predictive - PMBOK',
    shortLabel: 'PMBOK',
    order: 5.4,
    menuIcon: 'settings-2',
    badge: 'P',
    color: '#10B981',
  },
  {
    id: 'pmo-cat-agile',
    track: 'agile',
    label: 'Adaptive - Agile',
    shortLabel: 'Agile',
    order: 5.6,
    menuIcon: 'zap',
    badge: 'A',
    color: '#F59E0B',
  },
]

/**
 * PMO + Simulator category ids nested under each methodology track wrapper.
 * Platform entries use hyphen codes (pmo-cat-*);
 * Simulator entries use underscore codes (sim_pmo_cat_* / sim_pm_cat_*).
 */
export const TRACK_CHILD_CATEGORY_IDS = {
  structured: [
    'pmo-cat-initiation', 'pmo-cat-governance-standards',
    'sim_pmo_cat_initiation', 'sim_pmo_cat_governance',
    'sim_pm_cat_initiation',  'sim_pm_cat_governance',
  ],
  pmbok: ['pmo-cat-pmbok', 'sim_pmo_cat_pmbok', 'sim_pm_cat_pmbok'],
  agile: ['pmo-cat-agile-lean', 'sim_pmo_cat_agile', 'sim_pm_cat_agile'],
}

const UNIVERSAL_CATEGORY_IDS = new Set([
  // Platform universal categories (v676)
  'pmo-cat-exec',
  'pmo-cat-project-delivery',
  'pmo-cat-delivery-management',   // legacy cache detection only
  'pmo-cat-portfolio',
  'pmo-cat-programme',
  'pmo-cat-projects',
  'pmo-cat-project-oversight',
  'pmo-cat-delivery-controls',
  'pmo-cat-financial-commercial',
  'pmo-cat-risk-issues-quality',
  'pmo-cat-process-templates',
  'pmo-cat-reporting-intelligence',
  'pmo-cat-workflows-approvals',
  'pmo-cat-teams',
  'pmo-cat-stakeholders',
  'pmo-cat-knowledge-assets',
  'pmo-cat-audit-compliance',
  'pmo-cat-email-notifications',
  'pmo-cat-admin',
  'pmo-cat-system-admin',
  'pmo-cat-help',
  'pmo-cat-support',
  // Simulator PMO universal categories (v677)
  'sim_pmo_cat_live',
  'sim_pmo_cat_exec',
  'sim_pmo_cat_project_delivery',
  'sim_pmo_cat_reporting',
  'sim_pmo_cat_workflows',
  'sim_pmo_cat_process_templates',
  'sim_pmo_cat_knowledge',
  'sim_pmo_cat_email',
  'sim_pmo_cat_admin',
  'sim_pmo_cat_system_admin',
  // Simulator PM universal categories (v677)
  'sim_pm_cat_live',
  'sim_pm_cat_dashboard',
  'sim_pm_cat_projects',
  'sim_pm_cat_teams',
  'sim_pm_cat_controls',
  'sim_pm_cat_process_templates',
  'sim_pm_cat_cross_framework',
  'sim_pm_cat_learning',
])

const TRACK_CATEGORY_SET = new Set(
  Object.values(TRACK_CHILD_CATEGORY_IDS).flat()
)

export const USER_METHODOLOGY_PREF_KEY = 'nidus_sidebar_methodology_pref_v1'
export const ACTIVE_PROJECT_METHODOLOGY_KEY = 'nidus_active_project_methodology_v1'

/**
 * Map legacy project delivery_methodology values to track ids.
 * @param {string|null|undefined} raw
 * @returns {MethodologyTrack|null}
 */
export function normalizeProjectDeliveryTrack(raw) {
  const v = String(raw || '').trim().toLowerCase()
  if (!v) return null
  if (v === 'hybrid' || v.includes('hybrid')) return 'hybrid'
  if (v === 'structured' || v === 'prince2' || v === 'waterfall' || v.includes('structured')) {
    return 'structured'
  }
  if (v === 'pmbok' || v.includes('pmbok') || v === 'waterfall-pmbok') return 'pmbok'
  if (v === 'agile' || v.includes('agile') || v === 'scrum' || v === 'kanban') return 'agile'
  return null
}

/**
 * @param {string|null|undefined} orgMethodology
 * @param {string|null|undefined} projectMethodology
 * @param {boolean} allowOverride
 * @param {string|null|undefined} [userPref]
 * @returns {Set<string>}
 */
export function resolveVisibleTracks(orgMethodology, projectMethodology, allowOverride, userPref = null) {
  const org = String(orgMethodology || 'hybrid').trim().toLowerCase() || 'hybrid'
  const projectTrack = normalizeProjectDeliveryTrack(projectMethodology)
  const pref = String(userPref || '').trim().toLowerCase()

  if (org === 'hybrid') {
    // Sidebar "Methodology focus" — show only the selected track (+ universal sections always render separately).
    if (pref && METHODOLOGY_TRACK_IDS.includes(pref)) {
      return new Set([pref])
    }
    if (projectTrack && projectTrack !== 'hybrid') {
      return new Set([projectTrack])
    }
    return new Set(METHODOLOGY_TRACK_IDS)
  }

  const orgTracks = new Set([org])
  if (allowOverride && projectTrack && projectTrack !== 'hybrid' && projectTrack !== org) {
    orgTracks.add(projectTrack)
  }
  // Hybrid org only: non-hybrid orgs ignore sidebar focus pref (org setting wins).
  return orgTracks
}

/**
 * Infer methodology for a registry / menu row.
 * @param {{ menu_code?: string, menu_label?: string, route_path?: string|null, category?: string|null, methodology?: string|null }} entry
 * @returns {'structured'|'pmbok'|'agile'|'universal'}
 */
export function inferMenuItemMethodology(entry = {}) {
  if (entry.methodology && entry.methodology !== 'universal') {
    return entry.methodology
  }
  const category = String(entry.category || '').trim()
  if (category === 'pmo-cat-initiation' || category === 'pmo-cat-governance-standards') return 'structured'
  if (category === 'pmo-cat-pmbok' || category === 'pmo-cat-agile-lean') {
    return category === 'pmo-cat-pmbok' ? 'pmbok' : 'agile'
  }

  const code = String(entry.menu_code || '').toLowerCase()
  const path = String(entry.route_path || '').toLowerCase()
  const label = String(entry.menu_label || '').toLowerCase()
  const signal = `${code} ${label} ${path}`

  if (/pmo-cat-pmbok|process.group.forms|process-group-forms|\/forms\?group=/.test(signal)) return 'pmbok'
  if (/pmo-cat-agile|scrum-of-scrums|value-stream|kaizen|\/scrum\/|\/lean\/|agile metrics/.test(signal)) {
    return 'agile'
  }
  if (/pmo-cat-initiation|pmo_init_|\/pmo\/initiation\/|\/mandates\/|project brief|business case|benefits review/.test(signal)) {
    return 'structured'
  }
  if (/pmo_gov_|governance\/mandate|communication management strategy|configuration management|risk management strategy|quality management strategy/.test(signal)) {
    return 'structured'
  }
  if (/itto|\/eef\b|environment factors/.test(signal)) return 'pmbok'
  return 'universal'
}

/**
 * @param {string} categoryId
 * @returns {'structured'|'pmbok'|'agile'|'universal'|null}
 */
export function categoryMethodologyTrack(categoryId) {
  const id = String(categoryId || '').trim()
  for (const [track, ids] of Object.entries(TRACK_CHILD_CATEGORY_IDS)) {
    if (ids.includes(id)) return track
  }
  if (UNIVERSAL_CATEGORY_IDS.has(id)) return 'universal'
  return null
}

/** Category nodes placed under methodology track wrappers (not top-level universal rows). */
export const METHODOLOGY_TRACK_CATEGORY_DEFS = [
  { id: 'pmo-cat-initiation', label: 'Initiation Hub', order: 5.5, menuIcon: 'briefcase' },
  { id: 'pmo-cat-governance-standards', label: 'Governance & Standards', order: 5.55, menuIcon: 'shield' },
  { id: 'pmo-cat-pmbok', label: 'Process Group Forms', order: 5.56, menuIcon: 'clipboard-list' },
  { id: 'pmo-cat-agile-lean', label: 'Agile & Lean Tools', order: 5.57, menuIcon: 'zap' },
]

const AGILE_TRACK_CATEGORY_IDS = new Set([
  'pmo-cat-agile-lean',
  'sim_pmo_cat_agile',
  'sim_pm_cat_agile',
])

/** Drop redundant agile category shell — subsections sit directly under [A] track header. */
function flattenAgileTrackChildren(categories = []) {
  const out = []
  for (const cat of categories || []) {
    const code = String(cat?.menu_code || cat?.id || '')
    if (AGILE_TRACK_CATEGORY_IDS.has(code) && (cat.children || []).length) {
      out.push(...cat.children)
    } else {
      out.push(cat)
    }
  }
  return out
}

/**
 * Wrap categorised PMO roots with methodology track headers.
 * @param {object[]} categorisedRoots — universal top-level category nodes
 * @param {Set<string>} visibleTracks
 * @param {object[]} [trackCategoryNodes] — initiation / governance / pmbok / agile category nodes
 * @param {{ position?: 'after'|'before', code?: string }} [trackAnchor] — where to insert [S]/[P]/[A] headers
 * @returns {object[]}
 */
export function wrapPmoMenuWithMethodologyTracks(
  categorisedRoots = [],
  visibleTracks = new Set(METHODOLOGY_TRACK_IDS),
  trackCategoryNodes = [],
  trackAnchor = { position: 'after', code: 'pmo-cat-project-delivery' }
) {
  const universal = [...categorisedRoots]
  const byTrack = { structured: [], pmbok: [], agile: [] }

  for (const node of trackCategoryNodes) {
    const catId = String(node?.menu_code || node?.id || '')
    const track = categoryMethodologyTrack(catId)
    if (track && track !== 'universal' && visibleTracks.has(track)) {
      byTrack[track].push(node)
    }
  }

  const trackNodes = METHODOLOGY_TRACK_DEFS.filter((def) => visibleTracks.has(def.track))
    .map((def) => {
      let children = byTrack[def.track] || []
      if (def.track === 'agile') {
        children = flattenAgileTrackChildren(children)
      }
      if (!children.length) return null
      return {
        id: def.id,
        menu_code: def.id,
        menu_label: def.label,
        menu_description: def.label,
        parent_menu_id: null,
        menu_level: 1,
        sort_order: def.order,
        route_path: null,
        external_url: null,
        menu_icon: def.menuIcon,
        menu_color: def.color,
        methodology_track: def.track,
        is_methodology_header: true,
        badge_text: def.badge,
        badge_color: def.color,
        is_visible: true,
        is_active: true,
        canUse: true,
        children,
      }
    })
    .filter(Boolean)

  if (trackNodes.length === 0) {
    return universal.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  }

  const sortedUniversal = [...universal].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  const sortedTracks = trackNodes.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  const anchorCode = trackAnchor?.code || 'pmo-cat-project-delivery'
  const insertBefore = trackAnchor?.position === 'before'
  const out = []
  let tracksInserted = false
  for (const node of sortedUniversal) {
    if (insertBefore && !tracksInserted && node.menu_code === anchorCode) {
      out.push(...sortedTracks)
      tracksInserted = true
    }
    out.push(node)
    if (!insertBefore && !tracksInserted && node.menu_code === anchorCode) {
      out.push(...sortedTracks)
      tracksInserted = true
    }
  }
  if (!tracksInserted) {
    const anchorIdx = out.findIndex((n) => n.menu_code === anchorCode)
    const insertAt = anchorIdx >= 0 ? (insertBefore ? anchorIdx : anchorIdx + 1) : out.length
    out.splice(insertAt, 0, ...sortedTracks)
  }
  return out
}

/**
 * Strip methodology track wrappers and categories outside visible tracks.
 * @param {object[]} items
 * @param {Set<string>} visibleTracks
 */
export function filterMenuTreeByVisibleTracks(items = [], visibleTracks = new Set(METHODOLOGY_TRACK_IDS)) {
  const filterNode = (node) => {
    if (node?.is_methodology_header) {
      const track = node.methodology_track
      if (!visibleTracks.has(track)) return null
      const children = (node.children || []).map(filterNode).filter(Boolean)
      if (!children.length) return null
      return { ...node, children }
    }
    const catId = String(node?.menu_code || '')
    const track = categoryMethodologyTrack(catId)
    if (track && track !== 'universal' && TRACK_CATEGORY_SET.has(catId) && !visibleTracks.has(track)) {
      return null
    }
    const children = (node.children || []).map(filterNode).filter(Boolean)
    if (!String(node.route_path || '').trim() && !children.length) {
      const code = String(node?.menu_code || '').trim()
      // Keep assigned menu rows even when route_path is null in DB; only drop nameless placeholders.
      if (code && !node?.is_methodology_header) return { ...node, children: [] }
      return null
    }
    return { ...node, children: children.length ? children : node.children }
  }
  return items.map(filterNode).filter(Boolean)
}

/** PM layout sub-profiles for role-differentiated menus (P1-11). */
export const PM_PROFILE_BY_ROLE = {
  executive: 'executive',
  project_sponsor: 'sponsor',
  project_board_member: 'board',
  project_assurance: 'assurance',
  quality_assurance: 'qa',
  stakeholder: 'stakeholder',
  viewer: 'viewer',
}

const PM_PROFILE_ALLOW_RE = {
  executive: /dashboard|executive|kpi|portfolio|programme|report|analytics|financial|mandate|brief|business case|highlight|exception|benefits|oversight|health/i,
  sponsor: /dashboard|mandate|brief|business case|benefits|approval|authorisation|financial|report|stakeholder/i,
  board: /dashboard|governance|approval|authorisation|stage gate|assurance|audit|report|mandate|exception/i,
  assurance: /dashboard|quality|audit|compliance|governance|report|risk|issue|assurance|itto|eef/i,
  qa: /dashboard|quality|testing|inspection|audit|issue|risk|report/i,
  stakeholder: /dashboard|stakeholder|communication|report|message/i,
  viewer: /dashboard|report|analytics/i,
}

/**
 * @param {string[]} roleNames
 * @returns {string|null}
 */
export function resolvePmProfile(roleNames = []) {
  const names = roleNames.map((r) => String(r || '').trim().toLowerCase().replace(/\s+/g, '_'))
  for (const [role, profile] of Object.entries(PM_PROFILE_BY_ROLE)) {
    if (names.includes(role)) return profile
  }
  return null
}

/**
 * Filter flat / PM layout menu tree by sub-profile.
 * @param {object[]} items
 * @param {string|null} pmProfile
 */
export function filterMenuByPmProfile(items = [], pmProfile = null) {
  if (!pmProfile || !PM_PROFILE_ALLOW_RE[pmProfile]) return items
  const re = PM_PROFILE_ALLOW_RE[pmProfile]
  const norm = (n) =>
    `${String(n?.menu_code || '')} ${String(n?.menu_label || '')} ${String(n?.route_path || '')}`.toLowerCase()

  const walk = (nodes) => {
    const out = []
    for (const node of nodes || []) {
      const children = walk(node.children || [])
      const allowed = re.test(norm(node)) || children.length > 0
      if (!allowed) continue
      out.push({ ...node, children })
    }
    return out
  }
  return walk(items)
}

/** Simulator learner role — allowed menu_code / route prefixes. */
export const SIM_LEARNER_MENU_PATTERNS = [
  /^simulator\/dashboard/i,
  /^simulator\/ai/i,
  /^simulator\/learning/i,
  /^simulator\/leaderboard/i,
  /^simulator\/certificates/i,
  /^simulator\/profile/i,
  /^simulator\/settings/i,
  /^simulator\/run\//i,
  /^simulator\/runs/i,
  /^simulator\/scenarios/i,
  /^simulator\/pm\/initiation/i,
  /^simulator\/pm\/projects\/[^/]+\/forms/i,
  /sim_learning/i,
  /sim_scenario/i,
  /sim_run/i,
  /sim_cert/i,
  /sim_leaderboard/i,
]

/**
 * @param {object[]} items
 * @param {boolean} isLearner
 */
export function filterSimulatorLearnerMenu(items = [], isLearner = false) {
  if (!isLearner) return items
  const allow = (node) => {
    const code = String(node?.menu_code || '').toLowerCase()
    const path = String(node?.route_path || '').toLowerCase()
    const label = String(node?.menu_label || '').toLowerCase()
    const signal = `${code} ${path} ${label}`
    return SIM_LEARNER_MENU_PATTERNS.some((re) => re.test(signal))
  }
  const walk = (nodes) => {
    const out = []
    for (const node of nodes || []) {
      const children = walk(node.children || [])
      if (allow(node) || children.length) {
        out.push({ ...node, children })
      }
    }
    return out
  }
  return walk(items)
}

/**
 * @param {string[]} roleNames
 */
export function roleNamesIncludeLearner(roleNames = []) {
  return roleNames.map((r) => String(r || '').trim().toLowerCase()).includes('simulator_user')
}

export function readUserMethodologyPreference() {
  try {
    return localStorage.getItem(USER_METHODOLOGY_PREF_KEY)
  } catch {
    return null
  }
}

export function writeUserMethodologyPreference(track) {
  try {
    if (!track) localStorage.removeItem(USER_METHODOLOGY_PREF_KEY)
    else localStorage.setItem(USER_METHODOLOGY_PREF_KEY, track)
  } catch { /* ignore */ }
}

/**
 * Extract project id from platform/simulator URL for methodology context.
 * @param {string} pathname
 */
export function extractProjectIdFromPath(pathname = '') {
  const m = String(pathname).match(
    /\/(?:platform|app|simulator\/pm)\/projects\/([0-9a-f-]{36})/i
  )
  return m?.[1] || null
}
