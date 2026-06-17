# v664 — DB as Single Source of Truth for Sidebar Menu

## Problem Statement

The sidebar menu currently has **three competing sources of truth**:

| Layer | Source | Location | Role |
|---|---|---|---|
| 1 | **DB `menu_items` table** | Supabase | Primary store — seeded by v659–v662 SQL migrations |
| 2 | **JS registry fallback** | `src/config/menuRegistry.js` + `menuRegistryUtils.js` | "Temporary shim until DB backfill v638+ confirmed" — still active, mis-categorising items |
| 3 | **Hardcoded virtual items** | `src/hooks/useMenu.js` | Fills Teams/Process Templates/PM pipeline when DB rows are missing |

`useMenu.js` also contains a `matchCategory()` regex engine (~150 lines) that re-classifies DB items into visual buckets independently of anything stored in the DB.

### Why this matters

- Layer 2 is the root cause of the v663 Governance pollution: registry entries tagged with wrong `category: 'pmo-cat-governance-standards'` are injected as virtual items before the whitelist runs.
- Layer 3 means entire sidebar sections exist with no DB representation — invisible to role-based access control.
- The split makes it impossible to manage menus from a single place (DB admin, SQL seed, or JS code all affect the final render).

### Intended architecture (from code comments)

> `menuRegistryUtils.js` line 4: *"Temporary shim until DB backfill (v638+) is confirmed in all environments."*

The DB was always meant to be the sole source. The shim has never been retired.

---

## Goal

Make `menu_items` (Supabase) the **single source of truth** for sidebar content.  
`useMenu.js` transforms become **presentation-only** (grouping, deduplication, layout) with no content injection.

---

## Current State Audit

### Already fully DB-seeded (no fallback needed)
- Governance & Standards core items (mandate, strategies, ITTO, EEF)
- Project Oversight (risk/issue/quality/lessons/delays/scope/schedule)
- Reporting & Assurance
- Business Justification (initiation section)
- Process Templates sections (v629)
- Email & Notifications
- Knowledge & Assets (v660)
- Administration / System Administration (v660)

### Still virtual (registry fallback or hardcoded injection)
| Item / Section | Source | Fix |
|---|---|---|
| Procurement items (Vendor Register, POs, Contracts, etc.) | Registry `pmo_section_procurement` with wrong `category` | Seed under correct DB parent (Procurement section); fix registry category |
| Platform Config items (Automation Rules, Custom Fields, Intake Forms, Client Portals) | Registry `pmo_section_platform_config` with wrong `category` | Seed under correct DB parent (Administration section); fix registry category |
| Notification Preferences | Registry `pmo_notification_prefs` with wrong `category` | Fix registry category; confirm DB seed exists |
| **Teams section** (Manager Assignments, Invitation Tracker, etc.) | `useMenu.js` `pushVirtualToCategory` + `organizeTeamsCategoryItems` | Seed all team-admin items in DB under `pmo_section_teams` |
| **PM Teams section** | `useMenu.js` `ensurePmPlatformTeamsMenu` | Seed PM team items in DB |
| **Process Templates (PM/TM)** | `useMenu.js` `ensureProcessTemplatesMenusForPm/TM` | DB already has PMO PT seeded; extend to PM and TM roles |
| **Stakeholders virtual fill** | `useMenu.js` `pushVirtualToCategory` | Audit existing DB seed; remove gap-fills once confirmed |
| PM Industry Templates | `useMenu.js` `ensureIndustryPlanMenusForPm` | Seed under correct PM DB parent |
| PM Invitation Tracker | `useMenu.js` `ensurePmInvitationTrackerMenu` | Seed as leaf under PM Teams in DB |
| **Team Member entire sidebar** | `useMenu.js` `ensureTeamMemberMenus` (900+ lines of virtual tree) | Full DB seed for team_member role |

---

## Scope of Changes

| File | Change |
|---|---|
| `SQL/v664_db_menu_source_of_truth.sql` | Seed all missing items; remove mis-parented records |
| `src/config/pmisGapMenuRegistry.js` | Fix categories (procurement → financial-commercial; platform-config → admin; notification prefs → email) |
| `src/config/menuRegistry.js` | Remove `pmo_gov_mandate` singleton; ensure all registry entries have correct categories |
| `src/hooks/useMenu.js` | Phase 1: registry fallback runs after whitelist; Phase 2: progressively remove virtual injections once DB seeded |
| `src/config/menuRegistryUtils.js` | Add `isDev`-only warning when fallback fires (visibility into what is still missing from DB) |

---

## Todo List

### Phase 1 — Fix miscategorisation (v663 scope, immediate)
- [x] **1.1** Fix `pmisGapMenuRegistry.js` — Platform Config section → `pmo-cat-admin`
- [x] **1.2** Fix `pmisGapMenuRegistry.js` — Procurement section → `pmo-cat-financial-commercial`
- [x] **1.3** Fix `pmisGapMenuRegistry.js` — Notification Prefs → `pmo-cat-email-notifications`
- [x] **1.4** Remove duplicate `pmo-gov-mandate` singleton from `pmoMenuConfig.js` and `menuRegistry.js`
- [x] **1.5** Create `SQL/v663_governance_menu_rationalisation.sql` — DB mirror of Phase 1 fixes

### Phase 2 — Complete DB seeding of currently-virtual items
- [x] **2.1** Seed Procurement items in DB — v647 + v663
- [x] **2.2** Seed Platform Config items in DB — v647 + v663
- [x] **2.3** Seed PMO Teams admin ops under `platform_teams` — **v664 SQL**
- [x] **2.4** Seed PM role Teams section items — v631 + v664 role grants
- [x] **2.5** Seed PM/TM Process Templates — v629 + v664 role grants
- [x] **2.6** Seed Team Member sidebar — v628b + v664 role grants
- [x] **2.7** Seed PM Invitation Tracker and Industry Templates — v577/v631 + v664
- [x] **2.8** Seed Stakeholders leaves under `platform_stakeholders` — v302/v604 + v664

### Phase 3 — Remove JS virtual injections (once Phase 2 confirmed in DB)
- [x] **3.1** Gate `applyRegistryCategoryFallback` — off by default (`VITE_MENU_REGISTRY_FALLBACK=true` to enable)
- [x] **3.2** Gate PM Teams virtual injectors — `VITE_MENU_VIRTUAL_INJECTION=true`
- [x] **3.3** Gate `ensureIndustryPlanMenusForPm` — same flag
- [x] **3.4** Gate Process Templates virtual injectors — same flag
- [x] **3.5** Gate `ensureTeamMemberMenus` — same flag; DB fetch is primary
- [x] **3.6** Removed hardcoded Teams/Stakeholders `pushVirtualToCategory` gap-fills
- [x] **3.7** Added `menuSourceConfig.js`; menu cache bumped to **v31**

### Phase 4 — Governance guardrails (resilience)
- [x] **4.1** Governance whitelist runs after gated registry fallback
- [x] **4.2** Dev `console.warn` in `applyRegistryCategoryFallback`
- [x] **4.3** Governance integrity tests in `menuRegistry.test.js`

---

## Architecture Rule (going forward)

> **All sidebar menu items MUST be seeded in `menu_items` via a versioned SQL migration.**  
> The JS registry (`MENU_REGISTRY`) is a catalogue/validator only — not a runtime content source.  
> The `registry_fallback` field and `applyRegistryCategoryFallback()` are deprecated once all environments are on v664+.

**Legacy escape hatches (dev/staging only):**
- `VITE_MENU_REGISTRY_FALLBACK=true` — re-enable registry bucket injection
- `VITE_MENU_VIRTUAL_INJECTION=true` — re-enable PM/TM/PMO virtual trees

---

## Execution Order

1. **Now**: Implement Phase 1 (v663 fixes — stop the governance bleed)
2. **Next sprint**: Phase 2 (complete DB seeding — one SQL migration per role group)
3. **After DB confirmed**: Phase 3 (remove virtual injections — test each removal against the live sidebar)
4. **Ongoing**: Phase 4 guardrails apply from Phase 1 onwards

---

## Review

**Completed:** 2026-05-28

### Summary

v664 makes Supabase `menu_items` the default sole runtime source for sidebar content. Registry fallback and hardcoded virtual injections are **disabled by default** and retained only behind explicit env flags for legacy environments missing SQL migrations.

### Files changed

| File | Change |
|---|---|
| `SQL/v664_db_menu_source_of_truth.sql` | **New** — Teams/Stakeholders DB leaves + role grants |
| `src/config/menuSourceConfig.js` | **New** — feature flags |
| `src/hooks/useMenu.js` | Removed Teams/Stakeholders virtual gap-fills; gated fallback; cache **v31** |
| `src/config/menuRegistryUtils.js` | Dev warning on registry fallback |
| `src/config/__tests__/menuRegistry.test.js` | Governance integrity tests |

### Deployment checklist

1. Run on Supabase: `v663_governance_menu_rationalisation.sql` then `v664_db_menu_source_of_truth.sql`
2. Hard-refresh browser (cache key `nidus_menu_v31_*`)
3. Verify PMO **Teams** and **Stakeholders** categories show DB items (no `virtual_pmo-cat-teams_*` codes)
4. On stale environments, temporarily set `VITE_MENU_REGISTRY_FALLBACK=true` while applying SQL

### Tests

- `npm run validate:menus` — 303 registry entries OK
- `vitest run src/config/__tests__/menuRegistry.test.js` — 15/15 passed
