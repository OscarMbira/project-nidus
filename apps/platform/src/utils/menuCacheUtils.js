/**
 * Sidebar menu localStorage cache helpers (v675 revamp).
 *
 * Strategy: stale-while-revalidate.
 *   - Fresh  (<10 min): serve immediately, skip DB fetch entirely.
 *   - Stale  (>10 min): serve immediately, refresh in background.
 *   - Miss             : show skeleton, fetch from DB, write cache.
 *
 * Cache is partitioned by auth user ID AND layout scope (pm / pmo / tm) so
 * dual-role users never see a PMO sidebar on /pm/* routes (or vice versa).
 *
 * Cache is invalidated on SIGNED_OUT and on explicit refetch().
 */

// Bumped 38 → v805 added plat_tpl_organisational/sim_tpl_organisational under the
// Templates section; without a version bump, anyone with an already-cached sidebar
// tree (up to 10 min old per the TTL below) would keep seeing the pre-v805 shape
// until it happened to expire.
// Bumped 48 → 49: Manage Roles (v902/v905) must appear for PMO + manager creator tiers.
// Bumped 49 → 50: Manage Menu Bundles (v914/v916/v917) must appear for the same tiers.
// Bumped 50 → 51: fixed a bug where the fast cache-read path recomputed the sidebar from
// rawHierarchy (skipping v930's pack-grouping step) instead of using the already-grouped
// `items` the cache stores — force a clean re-write so no browser keeps replaying the old,
// buggy read behaviour's output shape.
// Bumped 51 → 52: fixed fetchRoleMenuRowsForRoles() silently truncating role_menu_items at
// PostgREST's default row cap (no pagination) once an account's role grants passed ~1000 rows —
// any cache written before this fix has an incomplete menu baked in, even though the fix itself
// doesn't change the cache's shape.
// Bumped 52 → 53: v963a deactivates the broken Procurement stub menu_items rows — any cache
// written before this migration ran still has them baked in.
// Bumped 53 → 54: v964c adds the new "Approvals Register" menu item.
// Bumped 54 → 55: v966 Phase 9 rebuilds PM_CATEGORY_DEFS (new RAID/Benefits/Change Control/
// Governance top-level categories, Financial relabelled to Cost Management) and re-parents the
// underlying menu_items rows to match — any cache written before this ran still has the old
// Controls & Registers-only shape baked in.
// Bumped 55 → 56: v966 Phase 9 (2nd pass) adds 4 more top-level categories (Planning, Resources,
// Quality, Project Closure — SQL/v966m-v966o, v966q) and relabels Reporting & Analytics to
// Reports (v966p) — any cache written before this ran still has the old shape baked in.
// Bumped 56 → 57: v966 Phase 9 (3rd pass, 2026-08-23) relabels Quality & Testing to Testing
// (v966r) and Project Documents to Documents (v966s), re-parents Resource Directory into
// Resources (v966t), and folds Authorisation's 3 approval leaves into Governance (v966u,
// Authorisation now renders empty and disappears) — any cache written before this ran still has
// the old shape baked in.
// Bumped 57 → 58: v966 Phase 9 (4th pass, 2026-08-23) wires Planning > Schedule (Activity
// Register / Gantt / Network-Dependencies — SQL/v966v), a new sub-group with 3 leaves nested
// under the existing Planning category — any cache written before this ran still has the old
// (Schedule-less) Planning shape baked in.
// 58->59 (2026-08-23): Phase 11/12 new leaves — Milestones (plat_pm_planning_milestones, under
// Planning, SQL/v966y) and Actions (plat_pm_governance_actions, under Governance, SQL/v966ab).
// 60->61 (2026-08-24): Phase 1 follow-up — PLATFORM_INFRA_TOP_LEVEL_CODES gains
// plat_grp_template_library/plat_grp_okr/plat_grp_process_groups (SQL/v966aj), each re-parented
// to a literal top-level DB root and split into the "Platform" sidebar wrapper — any cache
// written before this ran still shows them nested under Knowledge & Operations/Standards-Based.
// 61->62 (2026-08-24): Phase 6 remaining leaves wired (SQL/v966ak) — Scope Statement + WBS
// Builder (new plat_pm_planning children), Schedule Management Plan (new
// plat_pm_planning_schedule child), Quality Reviews + Testing Centre (new plat_pm_quality
// children) — any cache written before this ran doesn't have these 5 new leaves.
// 62->63 (2026-08-24): Content-gap pass — Governance > Meetings (SQL/v966al) re-parents
// plat_tm_meetings into plat_pm_governance and fixes its stale route_path — any cache written
// before this ran still shows Meetings under "Communications" with the old dead-link route.
// 63->64 (2026-08-25): (a) v980 dedupes the "Financial Management" duplicate caused by running
// v422 today; (b) v981 builds a new "Project Setup" top-level group (Mandate/Brief/Business
// Case/Governance Framework/PIDs re-parented out of the Structured track); (c) a real JS fix in
// reorganizeMenuRoots() stops plat_pm_* top-level categories from leaking into the PMO layout —
// any cache written before this ran still shows the old Financial Management duplicate, no
// Project Setup group, and RAID/Governance/Planning/etc. bleeding into the PMO Admin dashboard.
// 64->65 (2026-08-25): the PM layout's top-level wrapper and the PMO layout's top-level wrapper
// were both labeled "Core Project Management" with no visual way to tell them apart (this is
// what made the plat_pm_* leak bug confusing to diagnose). PMO layout's wrapper now reads "PMO
// Workspace" instead — any cache written before this ran still shows the old shared label.
// 65->66 (2026-08-29): v982 Phase 7 — Main Application Zones. Defensive bump, not a cache-shape
// change: Sidebar.jsx now renders a My Work / Delivery / Organisation ZoneTabs bar above the
// existing menu tree, purely derived from location.pathname + the already-resolved
// layoutHint.layout (ZoneTabs.jsx's resolveActiveZone()) — no changes to reorganizeMenuRoots(),
// groupMenuTreeByIndustryPack(), or any other function whose output this cache actually stores
// (items/rawHierarchy/layoutHint are all byte-identical in shape to before this phase; the
// existing pmoMenuHierarchyUtils.test.js suite, 36/36, confirms this). Bumped anyway per this
// codebase's own established convention for any change touching Sidebar.jsx's rendered output,
// so a stale-cache reader can never end up mid-transition between an old and new sidebar shell.
// 66->67 (2026-09-03): real fix in reorganizeMenuRoots() — sim_* top-level orphan categories
// (e.g. sim_sec_standards_based, "[P] Practice – Standards-Based") were leaking into Platform's
// 'pmo'/'pm'/'tm' layouts for any role holding both plat_* and sim_* grants (account_owner,
// pmo_admin), visible as Simulator content inside the Organisation zone. Now excluded by prefix,
// with the mirror-image plat_* exclusion added for Simulator's own 'sim_pmo'/'sim_pm' layouts —
// any cache written before this ran still shows the leaked Simulator category.
// 67->68 (2026-09-03): v1000 promotes Dashboard out of Executive Overview.
// 68->69 (2026-09-03): v1001 FIN Testing Strategy + Sanity Checks.
// 69->70 (2026-09-03): v1002 FIN Testing Strategy + Sanity Checks wire-up fix.
// 70->71 (2026-09-03): v1003 FIN Dress Rehearsal Strategy.
// 71->72 (2026-09-03): v1004 FIN Dress Rehearsal Strategy hard fix.
// 72->73 (2026-09-03): v1010 project-level industry classification — pm/tm-layout sidebars
// now restrict industry pack sections to the assigned project(s)' industries instead of every
// account-selected industry (getMenuItemIndustryPackMap's new restrictToIndustryCategoryIds
// param, layoutHint.projectIndustryCategoryIds) — a stale cache for a project-scoped user would
// still show every org industry until re-fetched.
// 80->81 (2026-09-09): v1024 Scope & Deliverables taxonomy group.
// 88->89 (2026-09-10): v1036 Quality taxonomy expansion (Quality Plan/Acceptance/Non-Conformance).
// 89->90 (2026-09-10): v1037 Testing taxonomy expansion — Testing converted from a flat leaf into
// a group (Test Planning/Test Cases/Test Execution/Defects/Evidence) + stale route_path fix.
// 90->91 (2026-09-10): pm/tm-layout industry pack sections now scope to the CURRENTLY OPEN
// project's own industry only, not the union across every project the user manages — a cache
// written before this ran still has the wrong (aggregate) industry sections baked in.
// 91->92 (2026-09-10): real fix for the above — an excluded pack's menu codes were falling
// through to 'core' (shown unfiltered) instead of being dropped, because menuCodeToPack was
// built only from the already-restricted pack list. getMenuItemIndustryPackMap now builds it
// from every account-enabled industry so pruneToOwner can correctly identify (and drop) an
// excluded pack's items; a cache written before this ran still has the excluded pack's items
// leaked into Core Project Management.
// 92->93 (2026-09-11): UX tweak — Structured/Standards-Based/Agile now nest under one
// "Methodology" row instead of three separate top-level ones whenever more than one track is
// visible at once (org/project methodology unset); a single visible track is unaffected.
// 93->94 (2026-09-11): v1038 dedupes Project Setup — the 3 stale pre-v981 Structured-track
// duplicates (Project Mandates/Briefs/Business Cases under "Initiation Hub") are deactivated in
// favour of their already-correct universal Project Setup counterparts, and Benefits Review
// Plans is promoted alongside them — a cache written before this ran still shows both copies.
// 94->95 (2026-09-11): real fix for a cross-contamination bug in the project-switch regroup
// effect — it read a shared, module-level state Map keyed by layout scope but never checked
// that the entry it found actually belonged to THIS instance's own current scope, so a stale
// 'pmo' entry (from an earlier PMO visit, or another MenuProvider instance) could get force-
// applied into a PM user's own sidebar, and — because applyFetchResult writes to localStorage
// unconditionally — get PERSISTED there too. Any cache written before this fix may hold the
// wrong (PMO Workspace) content baked into a PM-layout key.
// 95->96 (2026-09-11): real root cause of the above — /platform/benefits was hardcoded into
// PMO_ONLY_PLATFORM_PREFIXES (menuLayoutUtils.js), which short-circuited resolveMenuLayoutScope
// to 'pmo' for EVERY user on that path before role-based resolution ever ran. Fixed by resolving
// role truth first and only letting the hardcoded list apply when the role isn't confirmed 'pm'
// — a Project Manager's own role now always wins. Any cache written before this fix may still
// hold the wrong (PMO Workspace) sidebar for /platform/benefits* visits.
// 96->97 (2026-09-11): v1039 dedupes ITTO Templates — plat_s_itto (a stale, mis-homed
// Structured-track copy of the same /platform/itto/templates route already served correctly
// under Standards-Based's "ITTO Framework") is deactivated.
// 97->98 (2026-09-11): v1040 retires the legacy "Controls & Registers" bucket — its 4 remaining
// orphaned leaves (Delay Register, Configuration Item Register, Requirements Register, EEF)
// re-parented into RAID/Quality/Scope & Deliverables, the now-empty wrapper + 4 sub-groups
// deactivated.
// 98->99 (2026-09-11): v1041 fixes 5 stale /pmo/okr* route_paths (never a registered route —
// the old OKR page was deleted, superseded by a richer implementation at /pm/okr* that the menu
// rows were never updated to point at) — clicking "Strategy & OKRs" fell through to /pm/dashboard.
// 99->100 (2026-09-11): v1042 retires the redundant "Knowledge & Resources" hub
// (plat_xf_knowledge) — both things it linked to (EEF, Organisational Process Assets) already
// have their own directly-granted sidebar entries under Scope & Deliverables and Structured >
// Governance & Standards respectively.
// 100->101 (2026-09-11): v1043 folds "Strategy & OKRs" (plat_xf_okr) from Cross-Framework into
// Benefits — Cross-Framework had degraded to a 1-item wrapper for project_manager and no longer
// warranted its own top-level slot for that role.
// 101->102 (2026-09-11): v1044 fixes the stale "AI Assistant" route_path — /platform/ai-assistant
// was never a registered route; repointed to the real /platform/ai (AIWorkspace.jsx).
// 102->103 (2026-09-11): v1045 adds a new "Resource Calendar" item under Resources.
// 103->104 (2026-09-11): v1046 deactivates plat_pm_gov_decisions (duplicate of Decision Log,
// same /platform/governance/decisions route) and relabels plat_pm_ps_governance from
// "Governance" to "Governance Setup" to disambiguate from the top-level Governance group.
// 104->105 (2026-09-11): v1047 fixes 3 broken Governance approval route_paths (missing the
// required /platform prefix — see the file's own header comment) and adds Stage Gates + Meetings
// under top-level Governance.
// 105->106 (2026-09-11): v1048 fixes OKR's route_paths — v1041 had repointed them to a bare
// /pm/okr*, /pmo/okr* path that (like the Governance items above) is missing the /platform
// prefix its actual registered route needs.
// 106->107 (2026-09-11): v1049 adds a new top-level "Procurement" category (Procurement Plan,
// Vendors, Vendor Performance) — taxonomy §3, previously missing from the PM sidebar entirely.
// 107->108 (2026-09-12): v1050 adds Measures, Realisation Tracking, and Post-Implementation
// Review under Benefits — taxonomy §3, previously missing (Measures/Realisation Tracking pages
// already existed with no menu item; Post-Implementation Review is a brand-new page).
// 108->109 (2026-09-12): v1051 converts the flat "Documents" leaf into a group (Document
// Register + a new Version History page) — taxonomy §3.
// 109->110 (2026-09-12): v1052 adds a new "Archive" leaf under Project Closure (taxonomy §3).
// Final Acceptance is a form-only addition to the existing "Closing a Project" page — no menu
// change, no cache-relevant data change for that leaf.
// 110->111 (2026-09-12): v1053 adds a "Final Acceptance" menu item after all — reported live as
// "not showing" since it was only reachable as a tab inside Closing a Project with no sidebar
// entry of its own. Deep-links to the same page via ?section=approval.
// 111->112 (2026-09-12): v1054 adds Closure Checklist, Outstanding Items, Handover, Benefits
// Transition, and Closure Report as their own menu items under Project Closure — same fix as
// v1053, extended to every remaining taxonomy leaf that was previously only an unlabeled tab
// inside Closing a Project. Deep-links via ?tab=/&section= combinations.
// 112->113 (2026-09-12): v1055 adds the 9 missing Reports taxonomy leaves (Project Status,
// Executive, Schedule, Cost, RAID, Change, Resource, Quality, Testing Reports) under the
// Reports group, and rebuilds Report Library from a "Coming Soon" placeholder into a real hub.
// 113->114 (2026-09-12): v1056 groups Report Library/Report Builder/Analytics Dashboards/Custom
// Metrics under a new "Reporting Tools" sub-section so they don't get lost among the 9 report
// leaves added in v1055 (reported live via sidebar screenshot).
// 114->115 (2026-09-14): v1057 groups the 9 report-type leaves (Project Status ... Testing
// Report) under a new "Standard Reports" sub-section, mirroring v1056's Reporting Tools —
// reported live via sidebar screenshot as still a long flat list.
// 115->116 (2026-09-17): force cache refresh after v1067 project-industry backfill; pm/tm
// pack sections use only the open project's industry_category_id (no account fallback).
// 116->117 (2026-09-17): fix Banking pack missing when project industry is set — MenuProvider
// now sits under CurrentProjectProvider + regroup runs once projectId first resolves.
// 117->118 (2026-09-20): v1101 fixes plat_pm_gov_authorities route_path — was /pmo-admin/authorities
// (missing /platform prefix); correct Organisation Authorities page is /platform/pmo-admin/authorities.
// 118->119 (2026-09-20): v1102 deactivates plat_pm_gov_authorities under Governance Setup — org
// Authorities stay under PMO Configuration only (not a PM project-setup leaf).
// 119->120 (2026-09-26): v1113 adds Risk Categories under PMO Configuration and Core Controls.
// 120->121 (2026-09-26): pm/tm with no project industries now shows the organisation's
// account_industries packs. A cached Core+Platform-only tree must not be reused.
// 121->122 (2026-10-03): v1192 moves Environments from Testing to Project Setup.
// A hard refresh keeps the previous sidebar for up to 10 minutes.
// 122->123 (2026-10-04): restore Project Manager pack grouping (Core Project Management,
// Platform, industry packs). A cached ungrouped tree must not be reused.
// 123->124 (2026-10-04): that ungrouped tree was already stored as version 123.
// Also keep DB taxonomy sections (Project Setup, Planning, RAID, …) on the PM sidebar.
// 124->125 (2026-10-04): restore Platform plus every project industry pack
// (Banking & Financial Services was missing next to Information Technology).
// 125->126 (2026-10-04): Core PM taxonomy has no Structured / Standards-Based / Agile sections.
// 129->130 (2026-10-04): v1199 removes the Test Management wrapper. Test Planning,
// Test Cases, Test Execution, Defects, and Evidence sit directly under Testing.
// 130->131 (2026-10-06): v1208 adds Vendor Categories under Procurement.
// 131->132 (2026-10-06): v1218 adds Configuration Item Types under Quality.
const SIDEBAR_CACHE_VERSION = 132
const SIDEBAR_CACHE_TTL_MS  = 10 * 60 * 1000   // 10 minutes — fresh window
const SIDEBAR_CACHE_KEY     = (uid, layoutScope) => `nidus_sidebar_v7_${uid}_${layoutScope}`

// ---------------------------------------------------------------------------
// Platform sidebar cache
// ---------------------------------------------------------------------------

/** Read a cached sidebar entry for the given auth user ID and layout scope. */
export function readSidebarCache(userId, layoutScope) {
  if (!userId || !layoutScope) return null
  try {
    const raw = localStorage.getItem(SIDEBAR_CACHE_KEY(userId, layoutScope))
    if (!raw) return null
    const entry = JSON.parse(raw)
    if (entry?.version !== SIDEBAR_CACHE_VERSION) return null
    if (!entry?.cachedAt || !Array.isArray(entry?.items)) return null
    if (entry?.layoutScope && entry.layoutScope !== layoutScope) return null
    return entry
  } catch {
    return null
  }
}

/** Write a sidebar cache entry for the given auth user ID and layout scope. */
export function writeSidebarCache(userId, layoutScope, { items, rawHierarchy, layoutHint }) {
  if (!userId || !layoutScope) return
  try {
    const entry = {
      version: SIDEBAR_CACHE_VERSION,
      layoutScope,
      cachedAt: Date.now(),
      items:        items        ?? [],
      rawHierarchy: rawHierarchy ?? [],
      layoutHint:   layoutHint   ?? null,
    }
    localStorage.setItem(SIDEBAR_CACHE_KEY(userId, layoutScope), JSON.stringify(entry))
  } catch {
    // Storage full or unavailable — ignore; next load just fetches from DB.
  }
}

/** Remove sidebar cache for a user (all scopes), one scope, or legacy keys. */
export function clearSidebarCache(userId, layoutScope = null) {
  try {
    if (userId && layoutScope) {
      localStorage.removeItem(SIDEBAR_CACHE_KEY(userId, layoutScope))
      return
    }
    if (userId) {
      const prefixes = [
        `nidus_sidebar_v7_${userId}_`,
        `nidus_sidebar_v6_${userId}_`,
        `nidus_sidebar_v5_${userId}_`,
        `nidus_sidebar_v4_${userId}`,
        `nidus_sidebar_v3_${userId}`,
        `nidus_sidebar_v2_${userId}`,
      ]
      const toRemove = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (!key) continue
        if (prefixes.some((p) => key === p || key.startsWith(p))) {
          toRemove.push(key)
        }
      }
      toRemove.forEach((k) => localStorage.removeItem(k))
      return
    }
    const toRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (
        key?.startsWith('nidus_sidebar_v2_') ||
        key?.startsWith('nidus_sidebar_v3_') ||
        key?.startsWith('nidus_sidebar_v4_') ||
        key?.startsWith('nidus_sidebar_v5_') ||
        key?.startsWith('nidus_sidebar_v6_') ||
        key?.startsWith('nidus_sidebar_v7_')
      ) {
        toRemove.push(key)
      }
    }
    toRemove.forEach((k) => localStorage.removeItem(k))
  } catch {
    // ignore
  }
}

/** True when the cache entry is still within the fresh window. */
export function isSidebarCacheFresh(entry) {
  if (!entry?.cachedAt) return false
  return Date.now() - entry.cachedAt < SIDEBAR_CACHE_TTL_MS
}

// ---------------------------------------------------------------------------
// Legacy cleanup – removes old nidus_menu_*, nidus_sim_menu_*, and v2–v4 keys.
// Called once on mount by useMenu / useSimMenu to sweep all browsers clean.
// ---------------------------------------------------------------------------

const LEGACY_PREFIXES = [
  'nidus_menu_',
  'nidus_sim_menu_',
  'nidus_sidebar_v2_',
  'nidus_sidebar_v3_',
  'nidus_sidebar_v4_',
]

function collectAllLegacyKeys(storage) {
  const keys = []
  if (!storage) return keys
  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i)
      if (key && LEGACY_PREFIXES.some((p) => key.startsWith(p))) keys.push(key)
    }
  } catch {
    // ignore
  }
  return keys
}

/** Remove ALL legacy sidebar cache entries (v1–v4, nidus_menu_*) from browser storage. */
export function purgeAllSidebarMenuCaches() {
  for (const storage of [localStorage, sessionStorage]) {
    for (const key of collectAllLegacyKeys(storage)) {
      try { storage.removeItem(key) } catch { /* ignore */ }
    }
  }
}
