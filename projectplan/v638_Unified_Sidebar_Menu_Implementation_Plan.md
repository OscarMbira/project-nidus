# v638 — Unified Sidebar Menu Implementation Plan

**Date:** 2026-05-27  
**Status:** Phases 0–4 implemented — apply `v641`/`v642` for simulator SQL; manual smoke tests pending  
**Goal:** One runtime menu pipeline (DB + permissions), static configs as **registry/seed only**, single shared sidebar chrome across Platform `/platform/*` and PMO `/pmo/*` routes.

**Builds on:** [v503 Sidebar Menu Revamp](v503_Sidebar_Menu_Revamp_Plan.md), [v484 Role Menu Customisation](v484_Role_Menu_Customisation_Plan.md), [v628 Team Member Sidebar](v628_Team_Member_Sidebar_Menu_Plan.md)

---

## 1. Problem statement

Today Project Nidus maintains **three overlapping menu systems**:

| Layer | Location | Runtime? |
|-------|----------|----------|
| **Database** | `menu_items`, `role_menu_items` | Yes — `useMenu.js` → `Sidebar.jsx` (`/platform/*`) |
| **Static configs** | `pmoMenuConfig.js`, `pmDashboardMenuConfig.js`, `simulator*MenuConfig.js` (6 files) | Yes — `PMOSidebar`, `SimulatorPMOSidebar`, etc. (`/pmo/*`, `/simulator/*`) |
| **Client patches** | `useMenu.js` virtual items (`ensureProcessTemplates…`, initiation injection, cache v20) | Yes — fills DB gaps at render time |

**Symptoms already seen:** Process Templates missing on Platform dashboard, Initiation paths inconsistent, duplicate IA, menu cache bumps, SQL + static + virtual all updated for one feature.

**Target architecture:**

```
menuRegistry (code) ──generates/validates──► SQL seeds (menu_items)
                              │
role_menu_items (permissions) ◄─────────────┘
                              │
                         useMenu.js
                    (layout transform only)
                              │
                    Sidebar.jsx (single component)
                              │
              /platform/*  /pmo/*  /pm/*  (same chrome)
```

Static configs **do not render menus** after migration; they become the **registry**.

---

## 2. Design principles

1. **DB is runtime source of truth** — visibility, order, role access, org admin overrides.
2. **Registry is build-time source of truth** — `menu_code`, default route, icon, parent, platform/sim flags.
3. **Transforms are presentation-only** — PMO category grouping (`pmo-cat-*`), TM filtered tree; no new routes invented in JS.
4. **No virtual menu injection for new features** — only temporary shims during migration with explicit removal tickets.
5. **Platform–Simulator parity** — every registry entry + SQL seed has Platform and Simulator rows where applicable (rule 34.1).
6. **Route exists before menu** — CI/registry check: every `route_path` must match a route in `App.jsx`.

---

## 3. Scope

### In scope

- Platform PMO (`/platform/dashboard`, categorised sidebar via `useMenu`)
- Platform PMO routes on `/pmo/*` (currently `PMOLayout` + static `PMOSidebar`)
- Platform PM (`/pm/*`) — align with same pipeline where `PMLayout` uses static config today
- Team Member sidebar (already mostly DB + `ensureTeamMemberMenus`)
- Simulator PMO/PM/TM — same registry pattern, `sim.*` menu seeds
- Menu admin UI compatibility (`role_menu_items`, menu management service)
- Documentation under `Documentation/Unified_Sidebar_Menu_Guide.md`

### Out of scope (this plan)

- Rewriting all 16+ PMO category labels (defer to v503 grouping cleanup as Phase 2 polish)
- Merging `/pmo/dashboard` redirect (already → `/platform/dashboard`)
- Admin app (`project-nidus-admin`) — separate application per your rules

---

## 4. Phased implementation

### Phase 0 — Audit & registry (no user-visible change)

**Objective:** Know exactly what diverges before changing runtime behaviour.

| # | Task | Output |
|---|------|--------|
| 0.1 | Export all `menu_items` rows (menu_code, route_path, parent, sort_order) for Platform roles | `Documentation/menu_audit_platform_db.csv` |
| 0.2 | Parse static configs into comparable list: `pmoMenuConfig`, `pmDashboardMenuConfig`, `pmMenuConfig` | `Documentation/menu_audit_static.csv` |
| 0.3 | Diff report: **DB-only**, **static-only**, **path mismatches**, **orphan routes** | Section in this plan → Appendix A (filled during 0.1–0.2) |
| 0.4 | Create **`src/config/menuRegistry.js`** — single array of menu definitions | Registry schema below |
| 0.5 | Script **`scripts/validate-menu-registry.mjs`** — registry routes ⊆ `App.jsx` routes | Fails CI if broken link |
| 0.6 | Script **`scripts/generate-menu-seed-from-registry.mjs`** — emits SQL INSERT for missing items | Optional; manual SQL OK for v1 |

**Registry entry shape (minimal):**

```js
{
  menu_code: 'pmo_init_business_case',
  menu_label: 'Business Case',
  route_path: '/pmo/initiation/business-case',
  parent_code: 'pmo_section_initiation',   // null = top-level / category child
  menu_icon: 'briefcase',
  sort_order: 1,
  domain: 'platform',                      // platform | simulator
  roles: ['pmo_admin'],                    // default role_menu_items seed
  category: 'pmo-cat-initiation',          // optional: PMO layout grouping hint
  is_container: false,
}
```

**Checklist Phase 0**

- [x] 0.2 Static export complete (`npm run audit:menus-static` → `Documentation/menu_audit_static.csv`)
- [x] 0.4 `menuRegistry.js` created with Initiation, Process Templates, Governance sections
- [x] 0.5 Route validation script + npm script `validate:menus`
- [ ] 0.1 DB export complete (manual — run against Supabase)
- [ ] 0.3 Diff report reviewed by you
- [ ] 0.6 Seed generator (optional)

---

### Phase 1 — SQL backfill & deprecate static PMO sidebar

**Objective:** DB contains everything `pmoMenuConfig.js` had; `/pmo/*` can use dynamic sidebar.

| # | Task | Details |
|---|------|---------|
| 1.1 | SQL **`v638_menu_registry_backfill_platform.sql`** | INSERT/UPDATE `menu_items` from registry; idempotent on `menu_code` |
| 1.2 | SQL **`v639_menu_registry_role_menu_items.sql`** | Seed `role_menu_items` for pmo_admin, system_admin, project_manager as per registry |
| 1.3 | Fix known gaps: Initiation (3 items), Process Templates hub + leaves, Platform `/pmo/*` paths | Reuse patterns from v629, v636 sidebar fixes |
| 1.4 | **`PMOLayout.jsx`** — replace `PMOSidebar` with shared **`Sidebar`** (same as `Layout.jsx`) | Keep `PlatformAppHeader`; same `lg:ml-80` offset |
| 1.5 | Mark **`pmoMenuConfig.js`** `@deprecated` — comment points to `menuRegistry.js` | Do not delete until Phase 4 |
| 1.6 | Bump menu cache → **`nidus_menu_v21_`** in `useMenu.js` | Force client refresh after deploy |
| 1.7 | Smoke test all `/pmo/*` routes from sidebar | Initiation, Governance, Oversight, Process Templates, Reporting |

**Checklist Phase 1**

- [ ] 1.1 SQL applied in Supabase (run `v638`, `v639`)
- [ ] 1.2 Role mappings applied
- [x] 1.4 PMOLayout uses shared Sidebar
- [ ] 1.7 Smoke test pass (PMO Admin role)

---

### Phase 2 — Consolidate `useMenu.js` transforms

**Objective:** Remove duplicate logic; virtual injections only where DB truly empty (with TTL to remove).

| # | Task | Details |
|---|------|---------|
| 2.1 | Document transform pipeline in code comment block at top of `applyRoleSidebarRevamp` | layoutHint → flatten → categorise → dedupe |
| 2.2 | Move category defs (`pmo-cat-*`) to **`src/config/pmoSidebarCategories.js`** | Single file for PMO grouping rules |
| 2.3 | Replace hardcoded `pushVirtualToCategory` blocks with **registry-driven** “required menus” list | If `menu_code` missing from DB, log warning + inject once |
| 2.4 | Remove **`pmOnlyLabels` filter** that drops Initiation parent without re-homing children — replaced by registry parent | Fixes lost submenu items |
| 2.5 | Add **`console.warn` in dev** when virtual injection runs (menu_code + reason) | Makes gaps visible |
| 2.6 | Delete virtual shims as SQL backfill proves complete (track in checklist per menu_code) | e.g. `ensureProcessTemplatesPmoCategoryGrouped` |

**Virtual shim removal tracker**

| Shim | Remove after |
|------|----------------|
| `ensureProcessTemplatesPmoCategoryGrouped` | v638 SQL + registry confirmed in prod |
| Initiation `pushVirtualToCategory` | v638 initiation section in DB |
| `ensureTeamMemberMenus` (full virtual tree) | TM SQL seed complete (v628) |
| `ensurePmPlatformTeamsMenu` | Teams section in DB |

**Checklist Phase 2**

- [x] 2.2 Category config extracted (`pmoSidebarCategories.js`)
- [x] 2.3 Registry-driven fallback (`menuRegistryUtils.js`)
- [x] 2.4 Initiation filter fixed (children re-homed; initiation removed from pmOnlyLabels drop)
- [x] At least 2 virtual shims removed (Process Templates + Initiation hardcoded blocks)

---

### Phase 3 — PM dashboard & PMLayout unification

**Objective:** `/pm/*` uses same pipeline; eliminate `pmDashboardMenuConfig.js` as runtime source.

| # | Task | Details |
|---|------|---------|
| 3.1 | Merge `pmDashboardMenuConfig` entries into **`menuRegistry.js`** | PM-specific paths under `/pm/initiation/…` |
| 3.2 | SQL **`v640_menu_registry_pm_dashboard.sql`** | PM role menu seeds |
| 3.3 | **`PMLayout.jsx`** — use shared `Sidebar` + `useMenu` | Mirror PMOLayout change |
| 3.4 | Deprecate `pmDashboardMenuConfig.js` | Registry only |
| 3.5 | Verify PM Initiation list-first routes appear in sidebar | Business Case, Brief, BRP |

**Checklist Phase 3**

- [x] 3.1 Registry updated (PM initiation entries)
- [ ] 3.2 SQL applied (`v638` includes PM section)
- [x] 3.3 PMLayout unified (shared Sidebar + PlatformAppHeader)
- [ ] 3.5 PM role smoke test

---

### Phase 4 — Simulator parity

**Objective:** Simulator sidebars use DB + registry; static `simulator*MenuConfig.js` deprecated.

| # | Task | Details |
|---|------|---------|
| 4.1 | Extend registry with `domain: 'simulator'` entries | Mirror Platform initiation, process templates, etc. |
| 4.2 | SQL **`v641_sim_menu_registry_backfill.sql`** | sim menu_items (reuse v635 patterns) |
| 4.3 | **`SimulatorPMOLayout`**, **`SimulatorPMLayout`** — shared sim sidebar component using `useMenu` (sim client / sim role filter) | May need `useSimMenu` hook if schema differs |
| 4.4 | Deprecate `simulatorPMOMenuConfig.js`, `simulatorPMMenuConfig.js` | Keep `simulatorMenuConfig` for landing/marketing only if needed |

**Checklist Phase 4**

- [x] 4.1–4.2 Simulator registry + SQL (`v641`, `v642`)
- [x] 4.3 Simulator layouts unified (`SimulatorPMOLayout`, `SimulatorPMLayout` + `useSimMenu`)
- [ ] Platform–Simulator parity spot-check (Initiation, Process Templates) — manual after SQL

---

### Phase 5 — Tooling, tests, docs, cleanup

| # | Task | Details |
|---|------|---------|
| 5.1 | Unit tests: `validate-menu-registry.mjs`, registry required fields, `resolveLayoutType` | `src/config/__tests__/menuRegistry.test.js` |
| 5.2 | Integration test: PMO Admin sees Initiation + Process Templates after seed | Vitest + mocked menu rows |
| 5.3 | **`Documentation/Unified_Sidebar_Menu_Guide.md`** — how to add a new menu item (registry → SQL → route → Layout rule if `/app/*`) | Developer guide |
| 5.4 | Update **`Documentation/Process_Templates_Seed_Data_Guide.md`** — point to unified menu flow | Cross-link |
| 5.5 | Delete deprecated static configs **only after** 2 release cycles with no references | Grep zero imports |
| 5.6 | Add Cursor rule **`.cursor/rules/menu-registry-conventions.mdc`** | “New `/app/*` or `/pmo/*` screen → registry + SQL + Layout header” |

**Checklist Phase 5**

- [x] 5.1–5.2 Tests in CI (`menuRegistry.test.js`, `validate:menus`)
- [x] 5.3 Developer guide published
- [x] 5.6 Cursor rule added

---

## 5. File change summary (expected)

| Action | Files |
|--------|-------|
| **Create** | `src/config/menuRegistry.js`, `src/config/pmoSidebarCategories.js`, `scripts/validate-menu-registry.mjs`, `SQL/v638–v641_*.sql`, `Documentation/Unified_Sidebar_Menu_Guide.md` |
| **Modify** | `src/hooks/useMenu.js`, `src/components/pmo/PMOLayout.jsx`, `src/components/pm/PMLayout.jsx`, `src/components/sim/pmo/SimulatorPMOLayout.jsx`, `src/components/Layout.jsx` (if header offset tweaks) |
| **Deprecate then remove** | `pmoMenuConfig.js`, `pmDashboardMenuConfig.js`, `PMOSidebar.jsx`, `SimulatorPMOSidebar.jsx` (Phase 5) |

---

## 6. Risk register

| Risk | Mitigation |
|------|------------|
| Admin customised menus overwritten by SQL | Use `ON CONFLICT (menu_code) DO UPDATE` for labels/paths only; never delete custom `role_menu_items` without flag |
| Menu cache hides new items | Bump cache key each phase; document hard-refresh |
| `/pmo/*` routes break active highlight | Reuse `sidebarRouteUtils.menuPathIsActive`; test nested paths |
| Simulator schema differs | Phase 4 may need `useSimMenu` wrapper — spike 0.5 day before 4.3 |
| Large bang-bang deploy | Phase 1 only PMO layout; PM and Sim in separate releases |

---

## 7. Recommended execution order & effort

| Phase | Effort (est.) | Release |
|-------|---------------|---------|
| 0 Audit + registry | 2–3 days | None (prep) |
| 1 PMO unified sidebar | 2–3 days | **Release A** |
| 2 useMenu cleanup | 2 days | Release A or B |
| 3 PM dashboard | 1–2 days | **Release B** |
| 4 Simulator | 2–3 days | **Release C** |
| 5 Tests + docs + delete static | 1–2 days | Release C |

**Total:** ~10–15 days focused work, split across 3 releases.

---

## 8. Definition of done

- [ ] One sidebar component renders for Platform PMO on both `/platform/dashboard` and `/pmo/initiation/*`
- [ ] One sidebar component renders for Simulator PMO on `/simulator/pmo/initiation/*` (via `simulatorScope`)
- [ ] New feature checklist: registry → SQL → route → (Layout `isPlatformApp` if `/app/*`) — no static config edit
- [ ] Zero `ensureXxxMenu` virtual injections for Initiation and Process Templates
- [ ] `npm run validate:menus` passes in CI
- [ ] Simulator PMO/PM parity for shared features
- [ ] Developer guide in `Documentation/`

---

## 9. Review section (fill after implementation)

**Summary (2026-05-27):**

- Created `src/config/menuRegistry.js` (35 entries: Initiation, Governance, Oversight, Process Templates, PM Initiation).
- Created `src/config/pmoSidebarCategories.js` and `src/config/menuRegistryUtils.js`.
- Unified `PMOLayout.jsx` and `PMLayout.jsx` to use shared `Sidebar` + `PlatformAppHeader`.
- `useMenu.js`: cache bumped to `nidus_menu_v21_`; category defs extracted; registry-driven fallback replaces hardcoded Process Templates + Initiation virtual blocks; initiation PM-only filter fixed.
- SQL: `v638_menu_registry_backfill_platform.sql`, `v639_menu_registry_role_menu_items.sql` (apply in Supabase).
- Tooling: `npm run validate:menus`, `npm run audit:menus-static`.
- Docs: `Documentation/Unified_Sidebar_Menu_Guide.md`, `.cursor/rules/menu-registry-conventions.mdc`.
- Deprecated: `simulatorPMOMenuConfig.js`, `simulatorPMMenuConfig.js` (runtime comments only).
- Phase 4: `useSimMenu.js`, `applySimulatorMenuTransform`, `SimulatorPMOLayout`/`SimulatorPMLayout` unified with `Sidebar` + `simulatorScope`.
- SQL: apply `v641_sim_menu_registry_backfill.sql`, `v642_sim_menu_registry_role_menu_items.sql` in Supabase.

**Known gaps:**

- `Change Register (All)` (`/pmo/registers/changes`) — no App.jsx route yet; excluded from registry until route exists.
- Phase 4 Simulator parity implemented (`useSimMenu`, `v641`/`v642`, unified Simulator layouts).
- DB export / diff review (0.1, 0.3) pending manual Supabase audit.

**Rollback:** Revert PMOLayout/PMLayout to static sidebars; restore `nidus_menu_v20_` cache key; SQL backfill is additive (ON CONFLICT DO UPDATE).

---

## Appendix A — Diff report (to be completed in Phase 0)

| menu_code / label | Static path | DB path | Action |
|-------------------|-------------|---------|--------|
| _TBD_ | | | |

---

## Appendix B — New feature checklist (for developers)

When adding a sidebar item:

1. Add entry to **`src/config/menuRegistry.js`**
2. Run **`npm run validate:menus`** (route must exist)
3. Add SQL migration **`SQL/vNNN_menu_<feature>.sql`** (menu_items + role_menu_items)
4. If route is first-class **`/app/...`**, extend **`Layout.jsx`** `isPlatformApp` (see platform layout rule)
5. Bump **`MENU_CACHE_KEY_PREFIX`** in `useMenu.js` if menu structure changes materially
6. Hard-refresh browser; verify PMO Admin + PM roles
7. Simulator: duplicate registry row with `domain: 'simulator'` + sim SQL

---

**Next step:** Review this plan. Once approved, start **Phase 0** (audit + `menuRegistry.js` with Initiation & Process Templates sections first).
