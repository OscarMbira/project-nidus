# v966 — Core PM Menu Rationalisation PRD

## a) Problem statement

`Documentation/Core_PM_and_Industry_Menu_Taxonomy.md` (§3, "Generic / Core Project Management
Menu") is the authoritative sidebar structure the user originally asked for — a clean, 19-group
taxonomy (Dashboard, Project Setup, Scope & Deliverables, Planning, RAID, Stakeholders, Change
Control, Resources, Cost Management, Quality, Testing, Governance, Procurement, Benefits,
Documents, Reports, Project Closure, plus two more) organised by PM discipline.

What the live Platform sidebar's "Core Project Management" section actually shows today is a
different structure entirely: Executive Overview, Portfolio & Delivery, Structured[S]/Agile[A]
methodology-track headers, People & Resources, Knowledge & Operations, Universal Practice,
Process Group Forms, Template Library, Email & Notifications, Administration, System
Administration. This traces back to a *different* design lineage —
`SQL/v680_menu_revamp_clear_old_data.sql` → `v681`/`v682`'s PMBOK/Agile/Standards-Based
methodology-track rebuild — which was never reconciled with the taxonomy document above. The
v918 industry-pack work and v930 pack-grouping work were both built on top of that
methodology-track structure, not on top of §3's taxonomy — v930's pack-grouping just wraps
whatever functional groups already existed (its own PRD, decision 3, explicitly preserves
"Portfolio & Delivery, Workflows & Governance, People & Resources, Knowledge & Operations,
Administration, System Administration" as-is).

By contrast, the ICT industry pack (§6 of the taxonomy doc) already tracks its taxonomy fairly
closely (Technology Delivery, Architecture, Design, Environments, Development, Interfaces, Data,
Testing, Technical Debt, Cybersecurity, Production Readiness all present) — evidence that a prior
initiative (the v946 industry capability taxonomy work) implemented the *industry pack* sections
against this document, but the *Generic/Core PM pack* (§3) was never done. This is exactly
§21's step-3-before-step-4 ordering in the taxonomy document being skipped in practice.

## b) Solution (shape only — decisions pending interview)

Per the taxonomy document's own §19 requirement ("Claude must first map this taxonomy to the
current codebase/database... Produce a table... Do not proceed directly from taxonomy text to
creating empty pages"), this PRD is preceded by a full mapping audit: every §3 taxonomy leaf
against the current Platform "Core Project Management" menu tree and its underlying pages,
classified per §16's A–F reuse categories (Existing Generic PM Capability / Existing Shared
Capability + Industry Configuration / Industry-Specific Extension / Genuine New Industry
Capability / Filtered-Reporting View / Template-Workflow-Reference-Data-Only).

Per the earlier interview answer: this is a **relabel/regroup**, not a feature-reduction. Every
currently-working page/feature stays reachable — the goal is that Core Project Management's
top-level sidebar groups and their nesting match §3's structure, with existing pages mapped
into the taxonomy's leaves (renamed/regrouped in the menu only, not rebuilt), and any genuine
gap (a taxonomy leaf with no existing capability) tracked as backlog per §21.6, not built as an
empty page.

## c) User stories

1. As any Platform user, I see one canonical "Core Project Management" top-level sidebar section
   whose groups and nesting match `Documentation/Core_PM_and_Industry_Menu_Taxonomy.md` §3
   exactly (Dashboard, Project Setup, Scope & Deliverables, Planning, RAID, Stakeholders, Change
   Control, Resources, Cost Management, Quality, Testing, Governance, Benefits, Documents,
   Reports, Project Closure) — no methodology-track or role-track top-level split.
2. As any Platform user, I see exactly one Risk Register, one Issue Register, one Change
   Register, one Work Packages view, one Capacity view, one Timesheets/Approvals surface, one
   Calendar, and one Assumptions Register — not 2-3 menu entries for the same underlying page.
   Who can see/use each is controlled by existing role_menu_items grants, not by duplicate rows.
3. As a PM, I find RACI Matrix, Skills Matrix, S-Curve & Baselines, and Timesheet Approvals in
   the sidebar under their taxonomy-correct location — all four are real, already-built pages
   from prior gap-closure work that were never linked into Core PM's menu.
4. As a PM, I have a working Milestone Register (register, key dates, forecast, slippage) and a
   unified Governance Action Register (cross-domain, not per-feature "my actions" silos) — both
   genuinely new capabilities built as part of this initiative.
5. As any Platform user, platform/SaaS infrastructure that isn't a PM discipline (Email &
   Notifications, Administration, System Administration, Account & Subscription, Template
   Library, Strategy & OKRs, Process Group Forms, Intake Forms, Client Portal, Guest Access,
   Training Tracker, Integrations) lives in its own top-level sidebar section, separate from Core
   Project Management — Core PM shows only taxonomy disciplines.
6. As a Structured-track or Agile-track user, Project Charter still resolves to Project Brief or
   PID respectively (methodology variants preserved) — I'm not forced onto a single generic form
   that doesn't match my project's methodology.
7. As a Simulator user, the equivalent rationalised structure applies to Simulator's Practice
   menu once the Platform-side structure and decisions are finalised and verified (rule 34.1
   parity, deferred to its own follow-up phase per Out-of-scope below).
8. As a PMO Admin, Procurement (Vendors/Contracts/Purchase Requests/Vendor Performance/Contract
   Closure) remains out of scope — consistent with the explicit v963 decision that procurement
   belongs outside this PMIS.

## d) Implementation decisions (from interview)

1. **Collapse role-track/methodology-track duplication to one canonical tree.** The current
   Personal/Universal/Team-Management role-axis crossed with Structured/Agile methodology-axis
   is the root cause of most duplication found in the mapping audit. Target: one menu row per
   concept; visibility resolved by `role_menu_items` grants, matching how the rest of the system
   already works. *(User decision.)*
2. **Canonical route per duplicated concept**, following the existing v879 precedent (prefer the
   newer `/pm/controls/...`-style implementation over legacy `/platform/...` pages where one
   exists) plus "prefer the more complete/more recently maintained implementation" for pairs v879
   didn't cover: Work Packages (already one shared route across 3 duplicate menu rows — just
   remove the duplicate rows), Capacity (`/platform/resources/capacity`), Timesheets (GAP-13's
   newer approval module over the older `plat_tl_timesheet_mgmt` route). *(Derived from existing
   precedent + audit findings, not re-asked.)*
3. **Non-PM-discipline items move to their own top-level "Platform" section**, separate from
   Core Project Management: Email & Notifications, Administration, System Administration,
   Account & Subscription, Template Library, Strategy & OKRs, Process Group Forms, and the SaaS
   gap-closure capabilities (Intake Forms, Client Portal, Guest Access, Training Tracker,
   Integrations). *(User decision.)*
4. **The 8 empty `plat_sec_*` stub sections are removed**, not populated — their would-be content
   already has a canonical home elsewhere in the rationalised structure (a consequence of
   decisions 1 and 3, not a separate build). *(Derived from decisions 1 & 3.)*
5. **Build Milestone Register and unified Governance Action Register** as real new capabilities
   as part of this initiative (both apps) — not deferred to a separate PRD. *(User decision.)*
6. **Consolidate the three calendar implementations to one** — the schedule calendar
   (`schedule/calendar` + exceptions) is canonical, since it already has the richest feature set
   (working days/holidays/exceptions); the generic team calendar and Universal Calendar (v963)
   are retired/redirected into it. *(User decision.)*
7. **Planning Assumptions and RAID Assumptions share one register** — the existing v963
   Assumptions Register, linked from both menu locations. No new capability needed. *(User
   decision.)*
8. **Project Charter stays split as Project Brief (Structured-track) and PID (also
   Structured-track's fuller artefact)** — both nest under the taxonomy's "Project Charter" menu
   location rather than picking one as canonical. No content changes. *(User decision.)*
9. **Procurement stays out of scope** — consistent with the explicit v963 decision that
   procurement belongs outside this PMIS entirely. GAP-12's Vendors/Contracts/Purchase Requests
   remain unbuilt. *(Derived from prior explicit decision, not re-asked.)*
10. **All fully-dead menu generations are deleted outright**, discovered by a follow-up audit
    after Phase 1 implementation began: `platform_section_*`/`tm_section_*` (Platform's own
    abandoned 2nd/3rd-generation rewrites, 0% role-granted), PMO's `pmo_section_*`/most of
    `pmo-cat-*`, and PM's `pm_section_*` (87-99% role-granted... i.e. 87-99% *un*granted —
    effectively fully dead). Every route these cover already exists live in `plat_sec_*`, which
    this plan continues to work from exclusively. *(User decision, made after the complete
    three-layout audit — see `projectplan/v966_full_three_layout_menu_audit.md`.)*
11. **PMO and PM layouts are not independently rationalised by this PRD** — their only live
    content either gets deleted (dead rows, decision 10) or already renders via orphan-bucketing
    from `plat_sec_*` (which this PRD does rationalise). A dedicated PMO/PM-layout pass, if
    wanted later, is separate follow-on work. *(Derived from decision 10, not separately asked.)*
12. **"Project Setup" and "Scope & Deliverables" (taxonomy §3 top-level groups) are left out of
    the rationalised sidebar entirely — settled, not deferred.** Their only real content (Business
    Case/Mandate/Brief/PID, End Project Report, Scope Statement/WBS/PBS/Deliverable Register) is
    Structured-track-only, and the methodology-track rendering mechanism
    (`wrapPmoMenuWithMethodologyTracks()` / `filterMenuTreeByVisibleTracks()` in
    `packages/config/src/methodologyMenuUtils.js`) filters at the whole-header/whole-category
    level, not per-leaf — so building these as their own universal taxonomy groups would require
    new per-leaf methodology visibility logic touching the core rendering pipeline every user's
    sidebar depends on. The user first chose to build that per-leaf logic (option a), then
    reversed to this option (option c) before any pipeline change was made: no new
    `plat_pm_project_setup`/`plat_pm_scope_deliverables` category rows are created, no existing
    Structured-track content is re-parented or touched. That content stays exactly where it
    already lives today, under the existing "Structured" methodology-track section — reachable,
    just not reorganised into the taxonomy's shape. Revisiting this as a genuine per-leaf
    visibility build is possible later (the `menu_items.methodology` column already exists on
    individual rows as a starting point) but is out of scope for this PRD. *(User decision —
    reversed mid-session from option (a) to option (c); see
    `projectplan/v966_core_pm_menu_rationalisation_plan.md` Phase 9.)*
13. **Decision 12's resolution extends to Governance > Stage Gates and Project Closure > Closure
    Report** — both confirmed (2026-08-24) to share the identical Structured-track-lock root
    cause (Stage Gate Reviews: `plat_pm_s_stage_gates`, methodology='structured', nested inside
    `plat_grp_pm_gov_standards`; Closure Report's closest match, End Project Report:
    `plat_pm_s_end_project`, methodology='structured', nested inside `plat_grp_pm_del_reporting`
    — no Agile-track equivalent exists for either to pair with). Both are left out of the
    rationalised sidebar, same as Project Setup/Scope & Deliverables: no re-parenting, no new
    per-leaf methodology visibility architecture built, content stays reachable exactly where it
    already lives today under the Structured track. *(User decision, confirming a by-analogy
    extension a background run had applied without being explicitly told to.)*
14. **Testing Centre and Testing (`plat_pm_quality_testing`) coexist permanently as two separate
    Quality-group leaves** — they are genuinely different in scope (Testing Centre adds
    diagnostics, defects, evidence, environments, and automated scripts on top of what Testing
    covers), so no consolidation is planned. *(User decision, 2026-08-24.)*
15. **Phase 14's full 14-group Simulator taxonomy mirror is out of scope for this PRD, scoped as
    its own future initiative.** Investigation confirmed Simulator's PM/PMO sidebar pipeline
    (`SIM_PM_CATEGORY_DEFS`/`SIM_PMO_CATEGORY_DEFS`) is a fundamentally different, coarser, and
    less mature mechanism than what Phase 9 built for Platform — not a lagging mirror of it —
    with zero backing `menu_items` rows for any category, unlike Platform's real-DB-row groups.
    A full mirror would require inventing 12+ new category definitions and matching
    classification logic: genuine JS taxonomy design work comparable in size to the original
    Phase 9 effort, not a SQL-only wiring pass. This PRD closes with only the two lowest-risk,
    already-built-for-both-apps capabilities wired into Simulator's existing structure (Milestone
    Register, Governance Action Register — `SQL/v966am`/`v966an`). The remaining 12 groups, and
    the first-order design question of whether Simulator's taxonomy should even match Platform's
    14-group shape 1:1 or stay intentionally coarser, are deferred to a future `v967`-or-later
    initiative with its own PRD/interview — not a Phase 14 checkbox inside this one. *(User
    decision, 2026-08-24.)*
16. **"Project Setup" reversal: decision 12's resolution is reversed specifically for this group
    (2026-08-25).** After live use surfaced real findability problems (the content was reachable
    only by expanding "Structured" and knowing to look under "Pre-Project & Initiation"/
    "Governance & Standards"), the user was shown the tradeoff and explicitly chose to build
    "Project Setup" as a real, universal top-level group after all — accepting the minor
    methodology-visibility broadening decision 12 was originally cautious about (a business case/
    charter/mandate is something almost every project needs regardless of methodology track, so
    this was assessed as low-risk). Implemented via `SQL/v981`: Project Mandate, Project Brief,
    Business Case, Governance Framework, and PIDs (5 existing, already-granted leaves) re-parented
    out of the Structured-track-locked `plat_grp_pm_pre_project`/`plat_grp_gov_standards` groups
    into a new plain-universal `plat_pm_project_setup` root (added to `PM_CATEGORY_DEFS`). Same-id
    re-parents throughout, no grant migration needed. **Scope & Deliverables, Closure Report, and
    Stage Gates are explicitly unaffected by this reversal** — they remain out of scope per
    decision 12/13, since only Project Setup was reported as causing user-facing friction; each
    would need its own explicit reversal request, not inferred from this one. *(User decision,
    2026-08-25.)*
17. **Also fixed as part of the same session: a real cross-layout leak bug, unrelated to any
    prior decision.** `reorganizeMenuRoots()`'s "surface new top-level categories" sweep
    (`packages/config/src/pmoMenuHierarchyUtils.js`) excluded non-`plat_pm_*` codes from the PM
    layout, but had no mirror exclusion keeping `plat_pm_*` codes OUT of the PMO layout — so every
    Phase 9 top-level root (RAID, Governance, Planning, etc., all literal DB orphans by design)
    was leaking into the PMO Admin's own dashboard sidebar alongside its own, separate, never-
    rationalised `PMO_CATEGORY_DEFS` categories, producing a confusing mixed/duplicated view.
    Fixed with a symmetric one-line exclusion; verified via the full `packages/config` test suite
    (101/101) and a live-data simulation confirming zero `plat_pm_*` leakage into the PMO render.
    Not a PRD decision — a genuine bug fix.

## e) Testing decisions

- Manual verification against real accounts covering at least: a PMO Admin, a Project Manager on
  a Structured-track project, a Project Manager on an Agile-track project, and a narrower role
  (e.g. Team Member) — confirming no menu item silently disappeared for a role that previously
  had it, and that consolidated routes still resolve correctly for each.
- New unit tests for Milestone Register and Governance Action Register services (both apps),
  matching the established `__tests__` pattern used throughout the codebase (rule 23).
- Existing `pmoMenuHierarchyUtils.test.js` / `useMenu`/`useSimMenu` test suites must continue
  passing — this initiative changes menu DATA (menu_items rows) and route consolidation, not the
  hierarchy-building logic itself, so no expected regressions there, but a full re-run confirms
  it.

## f) Explicitly out of scope for this PRD

- The 12 industry-specific taxonomy sections (§4–§15 excluding §15's GEN, which just references
  §3) — those are each their own scoped effort; §21's step 3 (this PRD) comes before step 4
  ("define industry pack structures") in the document's own recommended order, and several
  industry packs (ICT at least) already have partial, separately-built implementations that are
  out of scope to touch here.
- Simulator parity is deferred until the Platform-side mapping and decisions are settled, then
  applied per CLAUDE.md rule 34.1 in a follow-up phase — not attempted blind alongside an
  still-being-decided Platform structure.
