/**
 * Consolidated role menus (v1341, rule 75) — the pure engine.
 *
 * Turns the finished, role-filtered sidebar tree (what useMenu builds today) into ONE menu per
 * role: the sections from `menu_sections`, with core and industry items placed side by side by
 * `menu_item_placements`. No I/O here — the apps load the data and pass it in.
 *
 * Rules implemented (PRD projectprd/v1341_consolidated_role_menus_PRD.md):
 *   D2 / D3 / D18  industry items show only for the open project's packs (`allowedPackIds`);
 *                  no project or no industry → core only
 *   D4 / D23       shared slots: one entry; leaf members get a tab strip (`slotTabs`),
 *                  group members merge into one sub-menu
 *   D13 / D13b     Level 3 sub-menus: placed parents carry their children; `parent_code` nests
 *   D14            a section above `sectionLimit` entries groups its industry entries
 *   D15            members ordered core first, then by `allowedPackIds` order (primary first)
 *   D16            `disabledCodes` hidden
 *   D22            `pageIndex`: every visible page, for "Go to page" search
 *   D27            `homeOnly`: only the Home section
 *   D28            organisation-scope placements: shown only when `includeOrganisationScope`,
 *                  filtered by `organisationPackIds`
 *   story 25       no placement → nearest `defaultSectionByCode`; otherwise reported in `unplaced`.
 *                  Compact menus (Team Member, governance profiles) pass `useDefaults: false`: they
 *                  show only what is placed for them, so a default never adds a whole category back.
 */

const SLOT_CODE_PREFIX = 'slot:'
const SECTION_CODE_PREFIX = 'section:'
const OVERFLOW_CODE_PREFIX = 'overflow:'
const DERIVED_SORT = 10000

/** Placement keys from widest to narrowest (D26: several roles → widest key). */
export const PLACEMENT_KEY_ORDER = [
  'pmo_oversight', 'pmo_organisation', 'portfolio', 'programme', 'pm', 'team', 'team_member',
  'change_authority', 'board', 'assurance', 'qa', 'sponsor', 'executive', 'stakeholder', 'viewer',
]

/** Keys whose menu is about one project: with no project open they show Home only (D27). */
export const PROJECT_PLACEMENT_KEYS = new Set([
  'pm', 'team', 'team_member', 'change_authority', 'board', 'assurance', 'qa', 'sponsor',
  'executive', 'stakeholder', 'viewer',
])

/**
 * Layouts a custom role can be based on (D25), in the order shown in Manage Roles. The keys are the
 * CHECK-constrained values of roles.menu_layout_key (SQL v1456); the labels are the built-in roles
 * whose consolidated menu each key gives.
 */
export const MENU_LAYOUT_OPTIONS = [
  { value: 'pm', label: 'Project Manager' },
  { value: 'team', label: 'Team Lead / Team Manager' },
  { value: 'team_member', label: 'Team Member' },
  { value: 'programme', label: 'Programme Manager' },
  { value: 'portfolio', label: 'Portfolio Manager' },
  { value: 'executive', label: 'Executive' },
  { value: 'sponsor', label: 'Project Sponsor' },
  { value: 'board', label: 'Project Board Member' },
  { value: 'assurance', label: 'Project Assurance' },
  { value: 'qa', label: 'Quality Assurance' },
  { value: 'change_authority', label: 'Change Authority' },
  { value: 'stakeholder', label: 'Stakeholder' },
  { value: 'viewer', label: 'Viewer' },
]

/** Keys with a deliberately small menu: no default-section fallback (only placed items show). */
export const COMPACT_PLACEMENT_KEYS = new Set([
  'team_member', 'executive', 'sponsor', 'board', 'assurance', 'qa', 'change_authority', 'stakeholder', 'viewer',
])

/** Built-in role name → placement key. Custom roles use `menu_layout_key` (D25). */
export const ROLE_PLACEMENT_KEYS = {
  pmo_admin: 'pmo_oversight', system_admin: 'pmo_oversight', account_owner: 'pmo_oversight',
  super_admin: 'pmo_oversight', org_admin: 'pmo_oversight',
  project_manager: 'pm', pm_project_manager: 'pm',
  programme_manager: 'programme', pm_programme_manager: 'programme',
  portfolio_manager: 'portfolio', pm_portfolio_manager: 'portfolio',
  team_manager: 'team', pm_team_manager: 'team', team_lead: 'team',
  team_member: 'team_member',
  executive: 'executive', project_sponsor: 'sponsor', project_board_member: 'board',
  project_assurance: 'assurance', quality_assurance: 'qa', change_authority: 'change_authority',
  stakeholder: 'stakeholder', viewer: 'viewer',
}

const TEAM_KEYS = new Set(['team', 'team_member'])
const PMO_KEYS = new Set(['pmo_oversight', 'pmo_organisation'])
const normRole = (name) => String(name || '').trim().toLowerCase().replace(/\s+/g, '_')

/**
 * Which placement rows a user sees (D25, D26, D27).
 * @param {{ layout: 'pm'|'tm'|'pmo'|null, roles: Array<{ role_name: string, project_id?: string|null, menu_layout_key?: string|null }>, projectId?: string|null, projectOpen?: boolean }} input
 * @returns {{ key: string, homeOnly: boolean }}
 */
export function resolvePlacementKey({ layout = null, roles = [], projectId = null, projectOpen = false } = {}) {
  if (layout === 'pmo') return { key: 'pmo_oversight', homeOnly: false }
  const list = Array.isArray(roles) ? roles : []
  // D26: roles held on the open project win; otherwise the user's global roles.
  const onProject = projectId ? list.filter((r) => r?.project_id && r.project_id === projectId) : []
  const global = list.filter((r) => !r?.project_id)
  const pool = onProject.length > 0 ? onProject : (global.length > 0 ? global : list)

  let keys = pool
    .map((r) => (r?.menu_layout_key ? String(r.menu_layout_key) : ROLE_PLACEMENT_KEYS[normRole(r?.role_name)]))
    .filter(Boolean)
  keys = layout === 'tm' ? keys.filter((k) => TEAM_KEYS.has(k)) : keys.filter((k) => !PMO_KEYS.has(k))
  keys.sort((a, b) => PLACEMENT_KEY_ORDER.indexOf(a) - PLACEMENT_KEY_ORDER.indexOf(b))
  const key = keys[0] || (layout === 'tm' ? 'team_member' : 'pm')
  return { key, homeOnly: PROJECT_PLACEMENT_KEYS.has(key) && !projectOpen }
}

function indexPlacements(placements = [], includeOrganisationScope) {
  const byCode = new Map()
  const excluded = new Set()
  for (const p of placements || []) {
    if (!p?.menu_code || p.is_active === false) continue
    if (p.scope === 'organisation' && !includeOrganisationScope) {
      excluded.add(p.menu_code)
      continue
    }
    byCode.set(p.menu_code, p)
  }
  return { byCode, excluded }
}

/** First pack found on a node or its descendants (industry groups have no pack link themselves). */
function packOfNode(node, packOfCode) {
  const own = packOfCode.get(node?.menu_code)
  if (own) return own
  for (const child of node?.children || []) {
    const p = packOfNode(child, packOfCode)
    if (p) return p
  }
  return null
}

/** True when every page under the node belongs to an industry pack (D14 grouping). */
function isIndustryNode(node, packOfCode) {
  if (packOfCode.get(node?.menu_code)) return true
  const kids = node?.children || []
  if (kids.length === 0) return false
  return kids.every((c) => isIndustryNode(c, packOfCode))
}

/**
 * Build the consolidated sidebar.
 * @returns {{ items: object[], slotTabs: Array<{slotKey: string, label: string, tabs: Array<{code: string, label: string, route: string}>}>, pageIndex: object[], unplaced: string[] }}
 */
export function buildConsolidatedMenu({
  tree = [],
  sections = [],
  slots = [],
  placements = [],
  defaultSectionByCode = new Map(),
  packOfCode = new Map(),
  allowedPackIds = [],
  organisationPackIds = [],
  includeOrganisationScope = false,
  disabledCodes = new Set(),
  homeOnly = false,
  sectionLimit = 12,
  useDefaults = true,
} = {}) {
  const { byCode: placementByCode, excluded } = indexPlacements(placements, includeOrganisationScope)
  const projectAllowed = new Set(allowedPackIds || [])
  const orgAllowed = new Set(organisationPackIds || [])
  const packRank = new Map((allowedPackIds || []).map((id, i) => [id, i]))
  const isAnchor = (n) => placementByCode.has(n?.menu_code) || excluded.has(n?.menu_code)

  // Keep a node's subtree minus items placed elsewhere, other packs' items and switched-off items.
  const filterSub = (node, allowed, { root = false, keepEmpty = false } = {}) => {
    const code = node?.menu_code
    if (!code || disabledCodes.has(code) || excluded.has(code)) return null
    const pack = packOfCode.get(code)
    if (pack && !allowed.has(pack)) return null
    const children = (node.children || [])
      .filter((c) => !isAnchor(c))
      .map((c) => filterSub(c, allowed))
      .filter(Boolean)
    if (!node.route_path && children.length === 0 && !(root && keepEmpty)) return null
    return { ...node, children }
  }

  // 1. Anchors: placed nodes, plus default-section fallbacks; everything else is carried or unplaced.
  const anchors = []
  const unplaced = []
  const walk = (nodes, carried) => {
    for (const n of nodes || []) {
      const code = n?.menu_code
      if (!code) continue
      if (excluded.has(code)) continue
      const pl = placementByCode.get(code)
      if (pl) {
        anchors.push({ node: n, pl })
        walk(n.children, true)
        continue
      }
      if (carried) {
        walk(n.children, true)
        continue
      }
      const def = useDefaults ? defaultSectionByCode.get(code) : null
      if (def) {
        anchors.push({ node: n, pl: { menu_code: code, section_code: def, sort_order: DERIVED_SORT, derived: true } })
        walk(n.children, true)
        continue
      }
      if (n.route_path) unplaced.push(code)
      walk(n.children, false)
    }
  }
  walk(tree, false)

  // 2. Build each anchor's entry.
  const built = new Map() // code → { node, pl }
  const parentCodes = new Set(anchors.map((a) => a.pl.parent_code).filter(Boolean))
  for (const { node, pl } of anchors) {
    const allowed = pl.scope === 'organisation' ? orgAllowed : projectAllowed
    const entry = filterSub(node, allowed, { root: true, keepEmpty: parentCodes.has(node.menu_code) })
    if (entry) built.set(node.menu_code, { node: entry, pl })
  }

  // 3. Level 3: nest items under their placed parent (D13 / D13b); missing parent → section.
  for (const [code, rec] of [...built]) {
    const parentCode = rec.pl.parent_code
    if (!parentCode) continue
    const parent = built.get(parentCode)
    if (!parent || parent === rec) continue
    parent.node.children = [...parent.node.children, { ...rec.node, _sort: rec.pl.sort_order ?? 0 }]
    built.delete(code)
  }
  for (const rec of built.values()) {
    rec.node.children = [...rec.node.children].sort((a, b) => (a._sort ?? 0) - (b._sort ?? 0))
  }
  for (const [code, rec] of [...built]) {
    if (!rec.node.route_path && rec.node.children.length === 0) built.delete(code)
  }

  // 4. Shared slots (D4 / D23).
  const slotByKey = new Map((slots || []).filter((s) => s?.is_active !== false).map((s) => [s.slot_key, s]))
  const sectionEntries = new Map() // section_code → [{ node, sort }]
  const pushEntry = (sectionCode, node, sort) => {
    if (!sectionEntries.has(sectionCode)) sectionEntries.set(sectionCode, [])
    sectionEntries.get(sectionCode).push({ node, sort: sort ?? 0 })
  }
  const slotMembers = new Map()
  for (const rec of built.values()) {
    const key = rec.pl.slot_key
    if (key && slotByKey.has(key)) {
      if (!slotMembers.has(key)) slotMembers.set(key, [])
      slotMembers.get(key).push(rec)
    } else {
      pushEntry(rec.pl.section_code, rec.node, rec.pl.sort_order)
    }
  }
  const slotTabs = []
  const memberRank = (rec) => {
    const pack = packOfNode(rec.node, packOfCode)
    return pack ? 1 + (packRank.has(pack) ? packRank.get(pack) : 999) : 0
  }
  for (const [key, members] of slotMembers) {
    const slot = slotByKey.get(key)
    const ordered = [...members].sort((a, b) =>
      memberRank(a) - memberRank(b) || (a.pl.sort_order ?? 0) - (b.pl.sort_order ?? 0))
    if (ordered.length === 1) {
      pushEntry(slot.section_code, ordered[0].node, slot.sort_order)
      continue
    }
    const allLeaves = ordered.every((m) => m.node.route_path && m.node.children.length === 0)
    if (allLeaves) {
      const tabs = ordered.map((m) => ({ code: m.node.menu_code, label: m.node.menu_label, route: m.node.route_path }))
      slotTabs.push({ slotKey: key, label: slot.label, tabs })
      pushEntry(slot.section_code, {
        menu_code: `${SLOT_CODE_PREFIX}${key}`,
        menu_label: slot.label,
        menu_icon: ordered[0].node.menu_icon,
        route_path: ordered[0].node.route_path,
        children: [],
        slotKey: key,
        slotTabs: tabs,
      }, slot.sort_order)
    } else {
      const children = ordered.flatMap((m) => (m.node.children.length > 0 ? m.node.children : [m.node]))
      pushEntry(slot.section_code, {
        menu_code: `${SLOT_CODE_PREFIX}${key}`,
        menu_label: slot.label,
        menu_icon: ordered[0].node.menu_icon,
        route_path: null,
        children,
        slotKey: key,
      }, slot.sort_order)
    }
  }

  // 5. Sections: order, D14 grouping, hide empty, footer last, Home only (D27).
  const activeSections = (sections || [])
    .filter((s) => s?.is_active !== false)
    .filter((s) => !homeOnly || s.section_code === 'home')
    .sort((a, b) => Number(!!a.is_footer) - Number(!!b.is_footer) || (a.sort_order ?? 0) - (b.sort_order ?? 0))

  const items = []
  for (const s of activeSections) {
    let entries = (sectionEntries.get(s.section_code) || []).sort((a, b) => a.sort - b.sort)
    // The catalogue has a few pages listed twice under different codes (e.g. two PID rows):
    // keep the first entry for a route within a section.
    const seenRoutes = new Set()
    entries = entries.filter((e) => {
      const route = e.node.children?.length ? null : e.node.route_path
      if (!route) return true
      if (seenRoutes.has(route)) return false
      seenRoutes.add(route)
      return true
    })
    if (entries.length > sectionLimit) {
      const industry = entries.filter((e) => !e.node.slotKey && isIndustryNode(e.node, packOfCode))
      if (industry.length > 1) {
        const rest = entries.filter((e) => !industry.includes(e))
        entries = [...rest, {
          sort: DERIVED_SORT * 2,
          node: {
            menu_code: `${OVERFLOW_CODE_PREFIX}${s.section_code}`,
            menu_label: s.overflow_label || `${s.label} (industry)`,
            route_path: null,
            children: industry.map((e) => e.node),
          },
        }]
      }
    }
    if (entries.length === 0) continue
    items.push({
      menu_code: `${SECTION_CODE_PREFIX}${s.section_code}`,
      menu_label: s.label,
      menu_icon: s.icon || null,
      route_path: null,
      section_code: s.section_code,
      isConsolidatedSection: true,
      isFooter: !!s.is_footer,
      children: entries.map((e) => stripSort(e.node)),
    })
  }

  return { items, slotTabs, pageIndex: buildPageIndex(items, packOfCode), unplaced }
}

function stripSort(node) {
  const { _sort, ...rest } = node || {}
  return { ...rest, children: (rest.children || []).map(stripSort) }
}

function buildPageIndex(items, packOfCode = new Map()) {
  const out = []
  for (const section of items || []) {
    const walk = (nodes) => {
      for (const n of nodes || []) {
        if (Array.isArray(n.slotTabs) && n.slotTabs.length > 0) {
          for (const t of n.slotTabs) {
            out.push({ code: t.code, label: t.label, route: t.route, section: section.menu_label, packId: packOfCode.get(t.code) || null })
          }
        } else if (n.route_path) {
          out.push({ code: n.menu_code, label: n.menu_label, route: n.route_path, section: section.menu_label, packId: packOfCode.get(n.menu_code) || null })
        }
        walk(n.children)
      }
    }
    walk(section.children)
  }
  return out
}

/** Flat list of the pages in a consolidated menu (same rules as `pageIndex`). */
export function flattenConsolidatedPages(items = [], packOfCode = new Map()) {
  return buildPageIndex(items, packOfCode)
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function routeMatches(route, path) {
  const clean = String(route || '').split('?')[0].replace(/\/+$/, '')
  if (!clean) return false
  if (!clean.includes(':')) return path === clean || path.startsWith(`${clean}/`)
  // Menu routes may carry placeholders such as :projectId — match any single segment.
  const pattern = clean.split('/').map((seg) => (seg.startsWith(':') ? '[^/]+' : escapeRe(seg))).join('/')
  return new RegExp(`^${pattern}(/.*)?$`).test(path)
}

/** The slot tab strip for the current route, or null (D23: only for 2+ visible leaf members). */
export function findSlotTabsForRoute(slotTabs = [], pathname = '') {
  const path = String(pathname || '').split('?')[0].replace(/\/+$/, '')
  if (!path) return null
  for (const strip of slotTabs || []) {
    const hit = (strip.tabs || []).find((t) => routeMatches(t.route, path))
    if (hit) return { ...strip, activeRoute: hit.route }
  }
  return null
}

/** Case-insensitive "Go to page" filter over the page index (D22). */
export function searchConsolidatedPages(pageIndex = [], query = '', packNameById = new Map(), limit = 20) {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return []
  const seen = new Set()
  const out = []
  for (const p of pageIndex || []) {
    const industry = p.packId ? packNameById.get(p.packId) || null : null
    const hay = `${p.label} ${p.section} ${industry || ''}`.toLowerCase()
    if (!hay.includes(q) || seen.has(p.route)) continue
    seen.add(p.route)
    out.push({ ...p, industry })
    if (out.length >= limit) break
  }
  return out
}
