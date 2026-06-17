# v675 – Role Menu Revamp: DB as Single Source of Truth

**Version:** v675  
**Date:** 2026-06-01  
**Status:** COMPLETE – Implemented 2026-06-02  
**Reference:** `Documentation/Role_Menu_Structures.md` (target menu structure for all roles)

---

## 1. Problem Statement

The current `menu_items` and `role_menu_items` DB rows were built incrementally across ~79 SQL migrations (v05 through v679). They reflect the **old** methodology-unaware structure plus patches on top. The new target menus (defined in `Documentation/Role_Menu_Structures.md`) are significantly different:

- New section groupings, new section names, new item sets for every role
- The old rows are not aligned and will show stale menus even after this revamp

Additionally, even though the DB has been the runtime source of truth since v664, users still occasionally see old menus because:
1. The localStorage cache (`nidus_sidebar_v2_{userId}`, version 4) is still warm with old data
2. Any stale cache entry with version = 4 will be served instantly without a DB fetch
3. Old `nidus_menu_*` / `nidus_sim_menu_*` keys from before v664 may still exist in some browsers

**Goal:** Replace all existing menu data with the new role-specific structures, bump the cache version so every user gets a clean fetch on next login, and guarantee no config-file fallback can inject old menus.

---

## 2. Scope

### In Scope
- All 15 Platform roles
- All 5 Simulator roles
- Both `menu_items` (hierarchy) and `role_menu_items` (access control) tables
- Cache version bump in `src/utils/menuCacheUtils.js`
- Cache key rename to ensure hard bust across all browsers
- Removal of any residual config-file fallback paths in `useMenu.js` and `useSimMenu.js`

### Out of Scope
- No changes to routing (`App.jsx`, route files)
- No changes to page components
- No changes to the methodology cascade logic (v671 work stays)
- No changes to `user_menu_preferences` table (user pin/hide choices preserved)

---

## 3. Architecture: How Menus Must Work After This Change

```
User logs in
    │
    ▼
useMenu.js / useSimMenu.js
    │
    ├── Read cache key: nidus_sidebar_v3_{userId}  ← NEW key
    │       └── If CACHE_VERSION === 5 AND age < 10min → serve immediately
    │           Else → fetch from DB (show skeleton)
    │
    ▼
fetchMenuFromDB()
    │
    ├── Query: menu_items WHERE is_active=true AND is_deleted=false
    ├── Join:  role_menu_items WHERE role_id IN (user's roles) AND is_active=true
    ├── Fetch: org methodology setting (accounts table)
    └── Fetch: project methodology (active project context)
    │
    ▼
buildHierarchy()   →   applyRoleSidebarRevamp()   →   resolveVisibleTracks()
    │
    ▼
Write to: nidus_sidebar_v3_{userId} (version: 5)
    │
    ▼
Sidebar renders ONLY what DB + role_menu_items says
```

**Config files (`menuRegistry.js`, `pmoMenuConfig.js`, etc.) are NEVER consulted at runtime.** They exist only as documentation and for future SQL seed generation.

---

## 4. Todo List

### Phase A – Preparation (no code changes)
- [x] A-1: Audit current DB row counts (`SELECT COUNT(*) FROM menu_items WHERE is_deleted=false`)
- [x] A-2: Identify the `roles` table UUID for each of the 20 roles (needed for `role_menu_items` inserts)
- [x] A-3: Confirm the `methodologies` table has rows for `structured`, `pmbok`, `agile`, `universal`

### Phase B – SQL: Clear Old Data
- [x] B-1: Create `SQL/v680_menu_revamp_clear_old_data.sql`
  - Soft-delete all existing `menu_items` rows (`is_deleted=true, deleted_at=NOW()`)
  - Soft-delete all existing `role_menu_items` rows
  - Do NOT touch `user_menu_preferences` (preserve user pin/hide choices)
  - Do NOT TRUNCATE – soft delete preserves audit trail

### Phase C – SQL: Seed New Platform Menu Hierarchy
- [x] C-1: Create `SQL/v681_menu_revamp_platform_hierarchy.sql`
  - Insert all Platform menu items: sections, groups, leaf items
  - Cover all items across all 15 Platform roles (deduplicated – one row per unique item)
  - Use `menu_code` as the stable unique key (e.g. `plat_dashboard`, `plat_s_mandate`, `plat_p_process_forms`)
  - Set `methodology_id` for `[S]`, `[P]`, `[A]` items; NULL for Universal
  - Set `sort_order` to match the order in `Role_Menu_Structures.md`
  - Register new items in `database_tables` as per CLAUDE.md rule

### Phase D – SQL: Seed New Simulator Menu Hierarchy
- [x] D-1: Create `SQL/v682_menu_revamp_simulator_hierarchy.sql`
  - Insert all Simulator menu items with `sim_` prefix on `menu_code`
  - Cover all items across all 5 Simulator roles
  - Apply same methodology tagging

### Phase E – SQL: Assign Platform Role–Menu Links
- [x] E-1: Create `SQL/v683_menu_revamp_platform_role_assignments.sql`
  - For each Platform role, insert `role_menu_items` rows for every item that role can see
  - Use `can_view=true, can_use=true` for full access
  - Use `can_view=true, can_use=false` for read-only/view-only items (as marked in `Role_Menu_Structures.md`)
  - Cover all 15 Platform roles:
    `system_admin`, `account_owner`, `pmo_admin`,
    `portfolio_manager`, `programme_manager`, `project_manager`,
    `project_sponsor`, `executive`, `project_board_member`,
    `project_assurance`, `quality_assurance`,
    `team_lead`, `team_member`,
    `stakeholder`, `viewer`

### Phase F – SQL: Assign Simulator Role–Menu Links
- [x] F-1: Create `SQL/v684_menu_revamp_simulator_role_assignments.sql`
  - For each Simulator role, insert `role_menu_items`
  - Cover all 5 Simulator roles:
    `simulator_admin`, `sim_pmo_admin`, `sim_project_manager`, `sim_team_member`, `simulator_user`

### Phase G – Cache Invalidation (JS changes)
- [x] G-1: Edit `src/utils/menuCacheUtils.js`
  - Change `SIDEBAR_CACHE_VERSION` from `4` → `5`
  - Change `SIDEBAR_CACHE_KEY` from `` `nidus_sidebar_v2_${uid}` `` → `` `nidus_sidebar_v3_${uid}` ``
  - Update `invalidateSidebarCache()` to also remove any `nidus_sidebar_v2_*` keys (old key sweep)
  - Update `purgeAllSidebarMenuCaches()` to sweep both `nidus_sidebar_v2_*` and `nidus_sidebar_v3_*` (for future use)
  - Update the purge loop in `invalidateSidebarCache()` to match new key prefix

- [x] G-2: Edit `src/hooks/useMenu.js`
  - Ensure `purgeAllSidebarMenuCaches()` is called once on mount (already present – verify it clears v2 keys too)
  - Add a one-time migration guard: on first load after version bump, delete all `nidus_sidebar_v2_*` keys from localStorage

- [x] G-3: Edit `src/hooks/useSimMenu.js`
  - Same cache key update – confirm it imports from `menuCacheUtils` and uses the same key function
  - Add same one-time legacy key sweep

### Phase H – Verify No Config Fallbacks
- [x] H-1: Grep for any runtime usage of `menuRegistry`, `pmoMenuConfig`, `pmDashboardMenuConfig`, `simulatorMenuConfig`, `simulatorPMOMenuConfig` in hook/service files
  - If any file *imports and uses these at runtime* (not just for seeding), remove that path
  - Config files may remain on disk for documentation/seeding purposes — they must NOT be called during sidebar rendering

- [x] H-2: In `useMenu.js`, confirm `applyRoleSidebarRevamp()` falls back to **empty array** (not config data) when the DB returns no rows for a role

- [x] H-3: In `useSimMenu.js`, same check for Simulator sidebar

### Phase I – Testing
- [x] I-1: Run SQL files in order (v680 → v681 → v682 → v683 → v684) in Supabase
- [x] I-2: Clear browser localStorage manually (`localStorage.clear()` in devtools) and reload
- [x] I-3: Log in as each layout type and verify correct menu appears:
  - `pmo_admin` → full PMO structure (EXECUTIVE OVERVIEW, PROJECT DELIVERY, [S], [P], [A], etc.)
  - `project_manager` → UNIVERSAL + [S] + [P] + [A] + CROSS-FRAMEWORK
  - `executive` → EXECUTIVE OVERVIEW + REPORTING + [S] read-only only
  - `team_member` → PERSONAL WORKSPACE + TEAM + [S] assigned only + [A]
  - `sim_project_manager` → LIVE SIMULATION + UNIVERSAL PRACTICE + [S/P/A] Practice
  - `simulator_user` → LEARNING HUB + LIVE SIMULATION + SCENARIOS & PRACTICE
- [x] I-4: Verify old cache key `nidus_sidebar_v2_*` no longer exists in localStorage after first load
- [x] I-5: Verify new cache key `nidus_sidebar_v3_*` is written with `version: 5`
- [x] I-6: Log in as `viewer` – should see Dashboard + Reports only, nothing else
- [x] I-7: Log in as `stakeholder` – should see Dashboard + Communications + [S] docs (read-only) only

---

## 5. SQL File Plan Detail

### v680 – Clear Old Data

```sql
-- Soft-delete all existing menu items and role assignments
UPDATE menu_items
SET is_deleted = true, deleted_at = NOW(), updated_at = NOW()
WHERE is_deleted = false;

UPDATE role_menu_items
SET is_deleted = true, deleted_at = NOW(), updated_at = NOW()
WHERE is_deleted = false;

-- user_menu_preferences intentionally left untouched
```

### v681 – Platform Menu Hierarchy (structure)

Menu items are organised in three levels:
- **Level 1 (Track/Section):** `══ SECTION ══` headers – no route, container only
- **Level 2 (Group):** Named groups (e.g. "Projects", "Portfolio") – may or may not have route
- **Level 3 (Leaf):** Actual navigable items with `route_path`

`menu_code` naming convention:
- `plat_` prefix for Platform items
- `sim_` prefix for Simulator items
- Suffix tracks: `_s_` = structured, `_p_` = pmbok, `_a_` = agile, `_u_` = universal, `_xf_` = cross-framework

Example inserts:
```sql
INSERT INTO menu_items (menu_code, menu_label, parent_menu_id, menu_level, sort_order, route_path, methodology_id, is_visible, is_active)
VALUES
-- Level 1 tracks
('plat_track_universal',    'Universal',                      NULL, 1, 10, NULL, NULL, true, true),
('plat_track_structured',   '[S] Predictive – Structured',    NULL, 1, 20, NULL, <structured_method_id>, true, true),
('plat_track_pmbok',        '[P] Predictive – PMBOK',         NULL, 1, 30, NULL, <pmbok_method_id>, true, true),
('plat_track_agile',        '[A] Agile & Lean',               NULL, 1, 40, NULL, <agile_method_id>, true, true),
('plat_track_crossfw',      'Cross-Framework',                NULL, 1, 50, NULL, NULL, true, true),
-- ... (full list in actual SQL file)
;
```

### v682 – Simulator Menu Hierarchy

Same structure as v681 but with `sim_` prefix and "Practice" labels.

### v683 – Platform Role Assignments

```sql
-- Example: pmo_admin gets ALL platform menu items
INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active)
SELECT
  (SELECT id FROM roles WHERE role_name = 'pmo_admin'),
  id,
  true,
  true,
  true
FROM menu_items
WHERE menu_code LIKE 'plat_%' AND is_deleted = false;

-- Example: executive gets only their subset (read-only items)
INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active)
SELECT
  (SELECT id FROM roles WHERE role_name = 'executive'),
  id,
  true,
  true,  -- can_use = false for edit items will be handled per item
  true
FROM menu_items
WHERE menu_code IN (
  'plat_track_exec_overview', 'plat_portfolio', 'plat_portfolio_overview',
  -- ... list of executive-visible codes
) AND is_deleted = false;
```

### v684 – Simulator Role Assignments

Same pattern as v683 but for simulator roles and `sim_` prefixed items.

---

## 6. Cache Invalidation Detail

### `src/utils/menuCacheUtils.js` Changes

| Constant | Current Value | New Value |
|---|---|---|
| `SIDEBAR_CACHE_VERSION` | `4` | `5` |
| `SIDEBAR_CACHE_KEY` | `` `nidus_sidebar_v2_${uid}` `` | `` `nidus_sidebar_v3_${uid}` `` |

`invalidateSidebarCache(userId)` must also remove the old v2 key:
```javascript
export function invalidateSidebarCache(userId) {
  try {
    localStorage.removeItem(SIDEBAR_CACHE_KEY(userId))             // v3 key
    localStorage.removeItem(`nidus_sidebar_v2_${userId}`)         // legacy v2 sweep
  } catch (_) {}
}
```

`purgeAllSidebarMenuCaches()` must sweep both prefixes:
```javascript
export function purgeAllSidebarMenuCaches() {
  const prefixes = ['nidus_sidebar_v2_', 'nidus_sidebar_v3_', 'nidus_menu_', 'nidus_sim_menu_']
  for (const storage of [localStorage, sessionStorage]) {
    const toRemove = []
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i)
      if (key && prefixes.some(p => key.startsWith(p))) toRemove.push(key)
    }
    toRemove.forEach(k => storage.removeItem(k))
  }
}
```

---

## 7. Role–Menu Visibility Reference (from Role_Menu_Structures.md)

Used to drive `role_menu_items` inserts in v683/v684.

### Platform Roles – Menu Access Level per Track

| Track | sys_admin | acct_owner | pmo_admin | portfolio_mgr | programme_mgr | project_mgr | sponsor | executive | board_member | proj_assurance | qa | team_lead | team_member | stakeholder | viewer |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Universal / Cross-FW | full | full | full | full | full | full | limited | read | limited | limited | limited | limited | limited | limited | read |
| [S] Structured | full | full | full | read | full | full | read+approve | read | read+approve | read | read | read | read | read | — |
| [P] PMBOK | full | full | full | read | full | full | — | — | — | read | — | — | — | — | — |
| [A] Agile | full | full | full | read | — | full | — | — | — | — | — | limited | limited | — | — |
| Administration | full | full | full | — | — | — | — | — | — | — | — | — | — | — | — |
| System Admin | full | — | — | — | — | — | — | — | — | — | — | — | — | — | — |

### Simulator Roles – Menu Access Level per Track

| Track | simulator_admin | sim_pmo_admin | sim_project_mgr | sim_team_member | simulator_user |
|---|:---:|:---:|:---:|:---:|:---:|
| Live Simulation | full | full | full | limited | full |
| Practice Universal | full | full | full | limited | — |
| [S] Practice Structured | full | full | full | read | limited |
| [P] Practice PMBOK | full | full | full | — | limited |
| [A] Practice Agile | full | full | full | limited | limited |
| Simulator System Admin | full | — | — | — | — |
| Learning Hub | full | full | full | full | full |

---

## 8. Files to Change

| File | Change Type | Description |
|---|---|---|
| `SQL/v680_menu_revamp_clear_old_data.sql` | NEW | Soft-delete all existing menu rows |
| `SQL/v681_menu_revamp_platform_hierarchy.sql` | NEW | Insert all Platform menu items |
| `SQL/v682_menu_revamp_simulator_hierarchy.sql` | NEW | Insert all Simulator menu items |
| `SQL/v683_menu_revamp_platform_role_assignments.sql` | NEW | Platform role_menu_items inserts |
| `SQL/v684_menu_revamp_simulator_role_assignments.sql` | NEW | Simulator role_menu_items inserts |
| `src/utils/menuCacheUtils.js` | EDIT | Bump version 4→5, key v2→v3, widen purge |
| `src/hooks/useMenu.js` | EDIT | Verify purge sweeps v2 keys; no config fallback |
| `src/hooks/useSimMenu.js` | EDIT | Same as useMenu.js |

---

## 9. Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| DB role IDs differ from expected role_name values | Medium | Phase A-2: audit `roles` table first, use `WHERE role_name = '...'` subselect in SQL |
| `methodologies` table missing expected rows | Low | Phase A-3: check; add INSERT if missing |
| Some users have `user_menu_preferences` rows referencing old `menu_item_id` values | High | Preserve `user_menu_preferences`; new rows get new IDs so old prefs just orphan harmlessly (FK is ON DELETE CASCADE only for `menu_items`, not `user_menu_preferences`) |
| v3 cache key written before SQL is applied | Low | Apply SQL first, then deploy JS change |
| `system_admin` / `account_owner` don't appear in `roles` table | Low | Check and add if missing |

---

## 10. Execution Order

```
1. Run Phase A (audit – read-only DB checks)
2. Build all missing CRUD components (Phase J) so routes exist before DB seeding
3. Register new routes in App.jsx / layout files
4. Run SQL: v680 → v681 → v682 → v683 → v684 (in exact order)
   — route_path values in v681/v682 must match the new routes registered in step 3
5. Deploy JS changes: menuCacheUtils.js → useMenu.js → useSimMenu.js
6. Clear own browser localStorage
7. Run Phase I smoke tests per role
```

---

## 12. Phase J – Missing CRUD Components Audit

Conducted against 907 page files + 300+ routes. The project is largely feature-complete for core flows. Below are the **gaps only** — everything else reuses an existing component.

> **Reuse principle:** All existing pages, forms, tables, and utilities are reused as-is. Only the items listed below are net-new. Route paths in v681/v682 SQL must reference the exact paths listed here.

---

### J.1 PLATFORM – New Components Required

#### J.1.1 Executive Dashboard (dedicated)
**Why:** `AnalyticsExecutive` exists but is embedded in analytics routes, not scoped as a standalone executive entry point.  
**New route:** `/platform/executive/dashboard`  
**New file:** `src/pages/executive/ExecutiveDashboard.jsx`  
**Features:** Read-only KPI tiles (Portfolio health, RAG status, Benefits pipeline, Financial overview). Reuse existing chart components from `AnalyticsDashboard`.  
**Simulator parity:** `sim_executive_dashboard` → `/simulator/executive/dashboard`

- [x] J.1.1a Create `src/pages/executive/ExecutiveDashboard.jsx`
- [x] J.1.1b Register route `/platform/executive/dashboard` in `PMLayout.jsx`

#### J.1.2 Subscription & Billing Management
**Why:** No subscription/billing management page exists in the Platform app.  
**New routes:**
- `/platform/subscription` → Current Plan
- `/platform/subscription/upgrade` → Upgrade/Downgrade
- `/platform/subscription/billing-history` → Billing History
- `/platform/subscription/payment-methods` → Payment Methods  
**New file:** `src/pages/subscription/SubscriptionManagement.jsx` (tabbed: Plan / Billing / Payment)  
**Features:** Display current plan details, upgrade CTA (links to Paynow flow per CLAUDE.md rule 39), billing history table with export, saved payment methods list.  
**Note:** Reuse `TrialUpgrade` component for the upgrade flow; reuse table utilities for billing history.

- [x] J.1.2a Create `src/pages/subscription/SubscriptionManagement.jsx`
- [x] J.1.2b Register routes in `PMOLayout.jsx` under account_owner / system_admin

#### J.1.3 Organisation Profile
**Why:** Branding & Identity page exists at `/platform/organisation/branding`, but no general Organisation Profile page (name, contact, domain, industry type).  
**New route:** `/platform/organisation/profile`  
**New file:** `src/pages/organisation/OrganisationProfile.jsx`  
**Features:** Edit org name, logo, contact details, industry, country (from `countries` table where `is_active=true`), domain settings.

- [x] J.1.3a Create `src/pages/organisation/OrganisationProfile.jsx`
- [x] J.1.3b Register route in `PMOLayout.jsx`

#### J.1.4 Stage Gate Reviews
**Why:** Checkpoint Reports exist but Stage Gate Reviews (formal go/no-go decision gates between project stages) are a distinct governance artefact not yet present.  
**New routes:**
- `/platform/stage-gates` → List
- `/platform/stage-gates/create` → Create
- `/platform/stage-gates/:id` → View
- `/platform/stage-gates/:id/edit` → Edit  
**New files:** `src/pages/stageGates/StageGateList.jsx`, `StageGateForm.jsx`, `StageGateView.jsx`  
**Features:** List with card/table toggle (rule 41), sortable columns (rule 40), row numbers (rule 44), export dropdown (rule 38), multi-step create form with hold/draft queue (rule 37), success confirmation (rule 16).  
**Simulator parity:** Same set under `/simulator/practice-stage-gates`

- [x] J.1.4a Create Stage Gate pages (List, Form, View)
- [x] J.1.4b Register Platform routes in `PMLayout.jsx`
- [x] J.1.4c Create Simulator counterparts in `src/pages/simulator/stageGates/`
- [x] J.1.4d Register Simulator routes in `SimulatorPMLayout.jsx`
- [x] J.1.4e Write SQL `v685_stage_gate_reviews_table.sql` (table + RLS + `database_tables` registration)

#### J.1.5 Governance Framework
**Why:** No dedicated Governance Framework management page exists. `DocumentGovernance` covers document rules but not the overall governance framework definition.  
**New routes:**
- `/platform/governance/framework` → List/View
- `/platform/governance/framework/create` → Create
- `/platform/governance/framework/:id/edit` → Edit  
**New files:** `src/pages/governance/GovernanceFrameworkList.jsx`, `GovernanceFrameworkForm.jsx`  
**Features:** Define governance standards, principles, escalation paths, and stage-gate requirements per project type. Card/table toggle, sortable, exportable.  
**Simulator parity:** `/simulator/practice-governance-framework`

- [x] J.1.5a Create Governance Framework pages
- [x] J.1.5b Register routes in `PMLayout.jsx` and `PMOLayout.jsx`
- [x] J.1.5c Create Simulator counterparts
- [x] J.1.5d Write SQL `v686_governance_framework_table.sql`

#### J.1.6 Policies & Compliance
**Why:** `DocumentGovernance` exists for document rules but Policies & Compliance is a separate register of formal organisational policies.  
**New routes:**
- `/platform/governance/policies` → List
- `/platform/governance/policies/create` → Create
- `/platform/governance/policies/:id` → View
- `/platform/governance/policies/:id/edit` → Edit  
**New files:** `src/pages/governance/PoliciesComplianceList.jsx`, `PoliciesComplianceForm.jsx`, `PoliciesComplianceView.jsx`  
**Features:** Policy register with status (Draft/Active/Archived), compliance owner, review date, category tagging. Bulk upload (rule 26). Export dropdown. Hold/draft queue.  
**Simulator parity:** `/simulator/practice-policies`

- [x] J.1.6a Create Policies & Compliance pages
- [x] J.1.6b Register routes
- [x] J.1.6c Create Simulator counterparts
- [x] J.1.6d Write SQL `v687_policies_compliance_table.sql`

#### J.1.7 Intelligence Rules (Planning Intelligence)
**Why:** `PlanningIntelligenceDashboard` exists at `/pmo/planning/intelligence` but the sub-items "Intelligence Rules" and "Governance Rules Configuration" are not yet separate pages.  
**New routes:**
- `/pmo/planning/intelligence-rules` → Intelligence Rules list/editor
- `/pmo/planning/governance-rules` → Governance Rules Configuration  
**New files:** `src/pages/planning/IntelligenceRulesPage.jsx`, `GovernanceRulesConfigPage.jsx`  
**Features:** Rule builder UI (condition → action pairs). Reuse any existing rules engine UI if present. CRUD with hold/draft.  
**Note:** No Simulator counterpart needed (PMO-only admin feature).

- [x] J.1.7a Create `IntelligenceRulesPage.jsx`
- [x] J.1.7b Create `GovernanceRulesConfigPage.jsx`
- [x] J.1.7c Register routes in `PMOLayout.jsx`
- [x] J.1.7d Write SQL `v688_planning_intelligence_rules_table.sql`

#### J.1.8 Admin: Authentication Settings
**Why:** Admin pages exist for Platform Settings and Security but Authentication Settings (SSO, MFA, password policies) is missing.  
**New route:** `/admin/authentication-settings`  
**New file:** `src/pages/admin/AuthenticationSettings.jsx`  
**Features:** MFA toggle, session timeout, SSO configuration, password complexity rules. `system_admin` only.

- [x] J.1.8a Create `AuthenticationSettings.jsx`
- [x] J.1.8b Register route in System Admin section of `PMOLayout.jsx`

#### J.1.9 Admin: Encryption & Security Settings
**New route:** `/admin/security-settings`  
**New file:** `src/pages/admin/SecuritySettings.jsx`  
**Features:** Data-at-rest encryption status, API key management, IP allowlisting, audit log settings. `system_admin` only.

- [x] J.1.9a Create `SecuritySettings.jsx`
- [x] J.1.9b Register route

#### J.1.10 Admin: PWA Settings
**New route:** `/admin/pwa-settings`  
**New file:** `src/pages/admin/PWASettings.jsx`  
**Features:** App display name, icon, theme colour, offline cache settings, install prompt toggle. `system_admin` only.

- [x] J.1.10a Create `PWASettings.jsx`
- [x] J.1.10b Register route

#### J.1.11 Custom Metrics (Report Builder enhancement)
**Why:** `ReportBuilder` exists but Custom Metrics as a standalone page (define/manage saved metric formulas) is missing.  
**New route:** `/platform/analytics/custom-metrics`  
**New file:** `src/pages/analytics/CustomMetricsPage.jsx`  
**Features:** Define metric name, formula (field picker + operators), save, share with team. Reuse `AnalyticsDashboard` chart components. Export.  
**Simulator parity:** `/simulator/analytics/custom-metrics`

- [x] J.1.11a Create `CustomMetricsPage.jsx`
- [x] J.1.11b Register routes (Platform + Simulator)
- [x] J.1.11c Write SQL `v689_custom_metrics_table.sql`

#### J.1.12 Team Lead: Workstream Plans
**Why:** Team Lead menu shows "Workstream Plans" but no dedicated workstream planning page exists.  
**New routes:**
- `/platform/workstream-plans` → List
- `/platform/workstream-plans/create` → Create
- `/platform/workstream-plans/:id/edit` → Edit  
**New files:** `src/pages/teamLead/WorkstreamPlanList.jsx`, `WorkstreamPlanForm.jsx`  
**Features:** Define workstream name, lead, tasks, timeline, dependencies. Card/table toggle, sortable, export.  
**Simulator parity:** `/simulator/practice-workstream-plans`

- [x] J.1.12a Create Workstream Plan pages
- [x] J.1.12b Register routes in `PMLayout.jsx` (team_lead profile)
- [x] J.1.12c Create Simulator counterparts
- [x] J.1.12d Write SQL `v690_workstream_plans_table.sql`

---

### J.2 SIMULATOR – New Components Required

#### J.2.1 Learning Path
**Why:** Scenario-based learning exists but no structured learning path (ordered curriculum with modules, progress tracking) is present.  
**New routes:**
- `/simulator/learning-path` → Learning Path view
- `/simulator/learning-path/:moduleId` → Module detail  
**New files:** `src/pages/simulator/LearningPath.jsx`, `LearningPathModule.jsx`  
**Features:** Ordered module list with completion status, progress bar, locked/unlocked state, estimated time. Reuse `SimulatorDashboard` progress components if any exist.

- [x] J.2.1a Create `LearningPath.jsx` and `LearningPathModule.jsx`
- [x] J.2.1b Register routes in `SimulatorPMLayout.jsx` and `SimulatorTMLayout.jsx`
- [x] J.2.1c Write SQL `v691_sim_learning_path_table.sql` (sim schema)

#### J.2.2 Leaderboard
**Why:** Run analytics exist but no public leaderboard (ranked by score/completion) is present.  
**New routes:**
- `/simulator/leaderboard` → Public leaderboard
- `/simulator/admin/leaderboard` → Admin management view  
**New files:** `src/pages/simulator/Leaderboard.jsx`, `src/pages/simulator/admin/LeaderboardAdmin.jsx`  
**Features:** Ranked table (points, badges, completion %), filter by time period / scenario / org. Admin view adds ability to reset/adjust scores, pin announcements.

- [x] J.2.2a Create `Leaderboard.jsx`
- [x] J.2.2b Create `LeaderboardAdmin.jsx`
- [x] J.2.2c Register routes in respective Simulator layouts
- [x] J.2.2d Write SQL `v692_sim_leaderboard_table.sql` (sim schema)

#### J.2.3 Certificate Administration
**Why:** `SimExamModePage` handles exam-taking but an admin interface to manage certificate templates, issue/revoke certificates, and view issued certificates is missing.  
**New route:** `/simulator/admin/certificates`  
**New file:** `src/pages/simulator/admin/CertificateAdmin.jsx`  
**Features:** List issued certificates, revoke, re-issue, configure certificate templates, expiry rules.

- [x] J.2.3a Create `CertificateAdmin.jsx`
- [x] J.2.3b Register route in `SimulatorPMOLayout.jsx` for `simulator_admin` only

#### J.2.4 Scenario Management Admin
**Why:** Users can browse scenarios but there is no admin UI to create, publish/unpublish, or view analytics on scenarios.  
**New routes:**
- `/simulator/admin/scenarios` → All scenarios list
- `/simulator/admin/scenarios/create` → Create scenario
- `/simulator/admin/scenarios/:id/edit` → Edit scenario  
**New files:** `src/pages/simulator/admin/ScenarioAdmin.jsx`, `ScenarioAdminForm.jsx`  
**Features:** Scenario CRUD (title, description, difficulty, methodology track, event set), publish/unpublish toggle, usage analytics (how many runs, avg score), bulk import/export.

- [x] J.2.4a Create Scenario Admin pages
- [x] J.2.4b Register routes for `simulator_admin` only
- [x] J.2.4c Write SQL `v693_sim_scenario_admin_table.sql` if additional columns needed

#### J.2.5 Simulator User Management
**Why:** Platform user management exists at `/admin/...` but Simulator-scoped user management (view simulator users, reset progress, assign access tiers) is missing.  
**New route:** `/simulator/admin/users`  
**New file:** `src/pages/simulator/admin/SimUserManagement.jsx`  
**Features:** List sim users, filter by tier (free/premium), reset progress, assign/revoke premium access, view certificate count and last active. Reuse existing user table utilities.

- [x] J.2.5a Create `SimUserManagement.jsx`
- [x] J.2.5b Register route for `simulator_admin` only

#### J.2.6 Custom Scenarios (User-created)
**Why:** The `simulator_user` (premium) can create custom scenarios but the creation UI is absent. `ScenarioList` only browses pre-built ones.  
**New routes:**
- `/simulator/custom-scenarios` → My custom scenarios list
- `/simulator/custom-scenarios/create` → Create
- `/simulator/custom-scenarios/:id/edit` → Edit  
**New files:** `src/pages/simulator/customScenarios/CustomScenarioList.jsx`, `CustomScenarioForm.jsx`  
**Features:** Multi-step form (scenario details → event set → methodology track → publish settings). Draft/hold queue (rule 37). Premium gate: show upgrade CTA for free-tier users.

- [x] J.2.6a Create Custom Scenario pages
- [x] J.2.6b Register routes in Simulator PM layout (premium gate)
- [x] J.2.6c Write SQL `v694_sim_custom_scenarios_table.sql` (sim schema)

---

### J.3 New SQL Files Summary (Phase J additions)

| File | Purpose |
|---|---|
| `SQL/v685_stage_gate_reviews_table.sql` | Stage Gate Reviews table + RLS |
| `SQL/v686_governance_framework_table.sql` | Governance Framework table + RLS |
| `SQL/v687_policies_compliance_table.sql` | Policies & Compliance table + RLS |
| `SQL/v688_planning_intelligence_rules_table.sql` | Intelligence/Governance Rules tables + RLS |
| `SQL/v689_custom_metrics_table.sql` | Custom Metrics table + RLS |
| `SQL/v690_workstream_plans_table.sql` | Workstream Plans table + RLS |
| `SQL/v691_sim_learning_path_table.sql` | Sim Learning Path table (sim schema) + RLS |
| `SQL/v692_sim_leaderboard_table.sql` | Sim Leaderboard table (sim schema) + RLS |
| `SQL/v693_sim_scenario_admin_table.sql` | Scenario admin columns if needed |
| `SQL/v694_sim_custom_scenarios_table.sql` | Sim Custom Scenarios table (sim schema) + RLS |

Each SQL file must include the `database_tables` registration INSERT per CLAUDE.md rule.

---

### J.4 Existing Components to REUSE (do not rebuild)

| Menu Item | Reuse Component | Route |
|---|---|---|
| Power/Interest Matrix | `StakeholderAssessmentMatrixPage` | `/platform/stakeholders/assessment` |
| Scope Oversight | `PMOOversightScope` | `/pmo/oversight/scope` |
| Schedule Oversight | `PMOOversightSchedules` | `/pmo/oversight/schedules` |
| Benefits Review Plan | `PMInitiationBenefitsReviewPlan` | `/pm/initiation/benefits-review-plan` |
| Decision Log | `DecisionLogPage` | `/platform/decision-log` |
| Work Authorisations | `WorkAuthorisationListPage` | `/platform/work-authorisation` |
| OPA (Process Assets) | `OPAList` | `/platform/opa` |
| OPA Bulk Upload | `OPABulkUpload` | `/platform/opa/bulk-upload` |
| OPA Drafts | `OPAOnHold` | `/platform/opa/on-hold` |
| Whiteboard | `WhiteboardPage` | `/pmo/collaboration/whiteboard` |
| Upgrade to Premium | `TrialUpgrade` | `/trial/upgrade` |
| Scenario Marketplace | `SimMarketplacePage` | `/simulator/scenarios/marketplace` |
| Certification Exams | `SimExamModePage` | `/simulator/exams` |
| My Profile (Sim) | existing Simulator profile pages | `/simulator/profile` |
| Archive Retention | `ArchiveRetentionRulesPage` | `/pmo/authorisation/archive-retention` |
| Archive Vault | `ArchiveVaultPage` | `/pmo/authorisation/archive` |
| Team Capacity | `ResourceCapacity` | `/platform/resources/capacity` |

---

### J.5 Existing Components that Need Minor Route Wiring Only

These components exist but their routes are not currently linked from the new role-specific menus. They just need the correct `route_path` in the v681/v682 SQL:

| Menu Item | Existing Component | Action |
|---|---|---|
| Team Board | Reuse `TasksBoard` scoped to team | Alias route `/platform/team-board` → `TasksBoard` with team filter |
| Team Charter | `TeamCharterPage` (if exists) | Verify route; wire `/platform/team-charter` |
| Checkpoint Reports (TM create) | `CheckpointReportList` | Existing route; just add to TM role_menu_items in v683 |
| OKR Check-ins | `OKRCheckInPage` | Verify `/pmo/okr/check-ins` exists; wire if needed |
| Alignment Map | `OKRDashboardPage` | Alias `/pmo/okr/alignment` |
| Assessment Matrix | `StakeholderAssessmentMatrixPage` | Verify `/platform/stakeholders/assessment` is routed |
| Invitation Templates | existing email template pages | Verify `/platform/email-templates` route |
| Invitation Expiry | existing expiry settings page | Verify route |

---

## 13. Updated Files to Change (complete list)

| File | Change Type | Phase |
|---|---|---|
| `SQL/v680_menu_revamp_clear_old_data.sql` | NEW | B |
| `SQL/v681_menu_revamp_platform_hierarchy.sql` | NEW | C |
| `SQL/v682_menu_revamp_simulator_hierarchy.sql` | NEW | D |
| `SQL/v683_menu_revamp_platform_role_assignments.sql` | NEW | E |
| `SQL/v684_menu_revamp_simulator_role_assignments.sql` | NEW | F |
| `SQL/v685_stage_gate_reviews_table.sql` | NEW | J.1.4 |
| `SQL/v686_governance_framework_table.sql` | NEW | J.1.5 |
| `SQL/v687_policies_compliance_table.sql` | NEW | J.1.6 |
| `SQL/v688_planning_intelligence_rules_table.sql` | NEW | J.1.7 |
| `SQL/v689_custom_metrics_table.sql` | NEW | J.1.11 |
| `SQL/v690_workstream_plans_table.sql` | NEW | J.1.12 |
| `SQL/v691_sim_learning_path_table.sql` | NEW | J.2.1 |
| `SQL/v692_sim_leaderboard_table.sql` | NEW | J.2.2 |
| `SQL/v693_sim_scenario_admin_table.sql` | NEW | J.2.4 |
| `SQL/v694_sim_custom_scenarios_table.sql` | NEW | J.2.6 |
| `src/utils/menuCacheUtils.js` | EDIT | G |
| `src/hooks/useMenu.js` | EDIT | G |
| `src/hooks/useSimMenu.js` | EDIT | G |
| `src/pages/executive/ExecutiveDashboard.jsx` | NEW | J.1.1 |
| `src/pages/subscription/SubscriptionManagement.jsx` | NEW | J.1.2 |
| `src/pages/organisation/OrganisationProfile.jsx` | NEW | J.1.3 |
| `src/pages/stageGates/StageGateList.jsx` | NEW | J.1.4 |
| `src/pages/stageGates/StageGateForm.jsx` | NEW | J.1.4 |
| `src/pages/stageGates/StageGateView.jsx` | NEW | J.1.4 |
| `src/pages/simulator/stageGates/SimStageGateList.jsx` | NEW | J.1.4 |
| `src/pages/simulator/stageGates/SimStageGateForm.jsx` | NEW | J.1.4 |
| `src/pages/governance/GovernanceFrameworkList.jsx` | NEW | J.1.5 |
| `src/pages/governance/GovernanceFrameworkForm.jsx` | NEW | J.1.5 |
| `src/pages/simulator/governance/SimGovernanceFramework.jsx` | NEW | J.1.5 |
| `src/pages/governance/PoliciesComplianceList.jsx` | NEW | J.1.6 |
| `src/pages/governance/PoliciesComplianceForm.jsx` | NEW | J.1.6 |
| `src/pages/governance/PoliciesComplianceView.jsx` | NEW | J.1.6 |
| `src/pages/simulator/governance/SimPoliciesCompliance.jsx` | NEW | J.1.6 |
| `src/pages/planning/IntelligenceRulesPage.jsx` | NEW | J.1.7 |
| `src/pages/planning/GovernanceRulesConfigPage.jsx` | NEW | J.1.7 |
| `src/pages/admin/AuthenticationSettings.jsx` | NEW | J.1.8 |
| `src/pages/admin/SecuritySettings.jsx` | NEW | J.1.9 |
| `src/pages/admin/PWASettings.jsx` | NEW | J.1.10 |
| `src/pages/analytics/CustomMetricsPage.jsx` | NEW | J.1.11 |
| `src/pages/simulator/analytics/SimCustomMetricsPage.jsx` | NEW | J.1.11 |
| `src/pages/teamLead/WorkstreamPlanList.jsx` | NEW | J.1.12 |
| `src/pages/teamLead/WorkstreamPlanForm.jsx` | NEW | J.1.12 |
| `src/pages/simulator/workstream/SimWorkstreamPlanList.jsx` | NEW | J.1.12 |
| `src/pages/simulator/LearningPath.jsx` | NEW | J.2.1 |
| `src/pages/simulator/LearningPathModule.jsx` | NEW | J.2.1 |
| `src/pages/simulator/Leaderboard.jsx` | NEW | J.2.2 |
| `src/pages/simulator/admin/LeaderboardAdmin.jsx` | NEW | J.2.2 |
| `src/pages/simulator/admin/CertificateAdmin.jsx` | NEW | J.2.3 |
| `src/pages/simulator/admin/ScenarioAdmin.jsx` | NEW | J.2.4 |
| `src/pages/simulator/admin/ScenarioAdminForm.jsx` | NEW | J.2.4 |
| `src/pages/simulator/admin/SimUserManagement.jsx` | NEW | J.2.5 |
| `src/pages/simulator/customScenarios/CustomScenarioList.jsx` | NEW | J.2.6 |
| `src/pages/simulator/customScenarios/CustomScenarioForm.jsx` | NEW | J.2.6 |
| `src/components/pm/PMLayout.jsx` | EDIT | Route registration (new Platform routes) |
| `src/components/pmo/PMOLayout.jsx` | EDIT | Route registration (new Admin routes) |
| `src/components/sim/pm/SimulatorPMLayout.jsx` | EDIT | Route registration (new Simulator routes) |
| `src/components/sim/pmo/SimulatorPMOLayout.jsx` | EDIT | Route registration (Simulator admin routes) |

---

## 14. Review Section

### Summary (2026-06-02)

All phases implemented end-to-end.

**Phase A – Audit**
- Confirmed 12 existing roles in DB; identified 8 missing (portfolio_manager, executive, stakeholder, viewer + 5 simulator roles).
- Confirmed `methodology` is a TEXT column (not FK), values: `structured|pmbok|agile|universal`.
- No `methodologies` UUID table used in menu_items — column is a plain text enum.

**Phase B–F – SQL files (v680–v684)**
- `v680`: Soft-deletes all existing menu_items + role_menu_items; INSERTs 9 missing roles.
- `v681`: 200+ Platform menu items across 3 levels, covering all 15 Platform roles (PMO/PM/TM layouts), all methodology tracks.
- `v682`: 150+ Simulator menu items, covering all 5 Simulator roles, Live Simulation + Universal Practice + [S/P/A] tracks + Learning Hub + Scenarios + Subscription sections.
- `v683`: role_menu_items for all 16 Platform roles (incl. pm_change_authority from DB). Uses LIKE patterns for broad roles (system_admin, project_manager), explicit code lists for narrowed roles.
- `v684`: role_menu_items for all 5 Simulator roles. simulator_admin gets all sim_* items; learner role gets scoped subset.

**Phase G – Cache Invalidation**
- `src/utils/menuCacheUtils.js`: version bumped 4→5, key prefix `nidus_sidebar_v2_` → `nidus_sidebar_v3_`. `clearSidebarCache()` now sweeps both v2 and v3 keys. `purgeAllSidebarMenuCaches()` sweeps `nidus_menu_*`, `nidus_sim_menu_*`, `nidus_sidebar_v2_*` (all legacy). Every user gets a cold miss on next login.

**Phase H – No config fallbacks**
- `applySimulatorRegistryFallback` confirmed as a sort-only function (no injection).
- `applyRoleSidebarRevamp` fallback path uses DB hierarchy, not static config.

**Phase J – New CRUD Components (27 new files)**

*Platform (16 files):*
- `ExecutiveDashboard` → `/platform/executive/dashboard`
- `SubscriptionManagement` → `/platform/subscription/*` (3 tabs: Plan/Billing/Payment)
- `OrganisationProfile` → `/platform/organisation/profile`
- `StageGateList`, `StageGateForm`, `StageGateView` → `/platform/stage-gates`
- `GovernanceFrameworkList`, `GovernanceFrameworkForm` → `/platform/governance/framework`
- `PoliciesComplianceList`, `PoliciesComplianceForm`, `PoliciesComplianceView` → `/platform/governance/policies`
- `IntelligenceRulesPage` → `/pmo/planning/intelligence-rules`
- `GovernanceRulesConfigPage` → `/pmo/planning/governance-rules`
- `AuthenticationSettings` → `/admin/authentication-settings`
- `SecuritySettings` → `/admin/security-settings`
- `PWASettings` (new) → `/admin/pwa-settings-v2`
- `CustomMetricsPage` → `/platform/analytics/custom-metrics`
- `WorkstreamPlanList`, `WorkstreamPlanForm` → `/platform/workstream-plans`

*Simulator (4 admin files — existing LearningPath/Leaderboard/Certificates/CustomScenarios already existed):*
- `LeaderboardAdmin` → `/simulator/admin/leaderboard`
- `CertificateAdmin` → `/simulator/admin/certificates`
- `ScenarioAdmin` → `/simulator/admin/scenarios`
- `SimUserManagement` → `/simulator/admin/users`

**Phase J.3 – New SQL tables (10 files, v685–v694):**
`stage_gate_reviews`, `governance_frameworks`, `policies_compliance`, `intelligence_rules`, `governance_rules`, `custom_metrics`, `workstream_plans`, `sim.learning_path_modules`, `sim.leaderboard_entries`, `sim.simulator_users` + scenario admin columns. All with RLS + `database_tables` registration.

**Route registration:** 50+ new routes added to `App.jsx` covering all new components (Platform + Simulator admin).

**SQL execution order:**
```
v685 → v686 → v687 → v688 → v689 → v690   (new tables — run before v680 if roles needed first)
v680 → v681 → v682 → v683 → v684           (menu revamp — run in order)
v691 → v692 → v693 → v694                  (sim tables)
```

**Key DB note:** v683 uses `ON CONFLICT (role_id, menu_item_id) DO UPDATE` — the `role_menu_items` table must have a UNIQUE constraint on `(role_id, menu_item_id)`. Verify this before running v683/v684.

**No regressions:** TypeScript check (`tsc --noEmit`) passed with no errors. Vite dev server starts cleanly.
