# v966 — Full Three-Layout Menu Audit (Platform / PMO / PM)

**Type:** Audit output only. No PRD, no implementation plan, no `menu_items`/`role_menu_items` writes,
no route/page edits were made. This is read-only research, follow-up to
`projectplan/v966_core_pm_menu_rationalisation_mapping_audit.md` (the "first audit"), which the user
correctly flagged as incomplete: it examined `plat_sec_*` in isolation and used illustrative examples
rather than a full root inventory. This document supersedes it with the complete picture across all
root-level `menu_items` rows relevant to Platform, PMO, and PM.

**Method:** Data pulled read-only via PostgREST against the live Supabase instance (`.env`
`VITE_SUPABASE_URL` / `VITE_SUPABASE_SERVICE_ROLE_KEY`), paginated with the `Range` header to avoid
PostgREST's 1000-row cap:

- `menu_items` (`is_active=true, is_visible=true`): **1,960 rows**, confirmed via
  `Prefer: count=exact` (`Content-Range: 0-999/1960`), fetched in two 1000-row pages and merged
  (1960 unique ids confirmed).
- `role_menu_items` (`is_deleted=false`): **9,299 rows**, confirmed via the same count header,
  fetched in eleven 1000-row pages.
- `roles` (`is_deleted=false`): **111 rows**, single page.

All tree/grant analysis below was computed from this exact dataset via local Node scripts (no writes
were ever issued). "Granted" below always means `can_view=true AND is_active=true` in
`role_menu_items` — this is the literal filter `apps/platform/src/hooks/useMenu.js` uses
(`fetchRoleMenuItemsPageForChunk`, `.eq('can_view', true).eq('is_active', true).eq('is_deleted', false)`)
to build a real user's sidebar, so "0 roles granted" means **no role in the system, for any
organisation, can ever see that row** — not merely "not yet checked."

---

## 0. Headline finding: the three "layouts" are not what their prefixes suggest

Before the per-layout detail, the single most important discovery of this audit, because it reframes
almost everything below:

**The prefix families the follow-up brief named as defining each layout —
`pm_section_*`/`pm_*` for PM and `pmo_section_*`/`pmo-cat-*` for PMO — are, empirically, almost
entirely dead data.** They exist in the DB, they have real child rows and real `route_path` values
that mostly resolve to registered routes, but **hardly any role in the system can see them**:

| Root family (by prefix) | Roots | Total nodes (root+descendants) | Nodes with ≥1 role grant | Nodes with 0 grants |
|---|---:|---:|---:|---:|
| **"Platform"**: `plat_sec_*` + `platform_section_*` + `platform_*` (non-section) + `plat_*` (non-sec) + `tm_section_*` | 57 | 419 | **332 (79%)** | 87 (21%) |
| **"PMO"**: `pmo_section_*` + `pmo-cat-*` + `pmo-admin-*` + `pmo-people-*` + `pmo-comms-*` + `pmo-email-*` + `pmo_calendar`/`pmo_planning`/`pmo_admin_local_registers` | 62 | 433 | **56 (13%)** | 377 (87%) |
| **"PM"**: `pm_section_*` + `pm_*` (non-section) | 24 | 144 | **2 (1.4%)** | 142 (98.6%) |

And the code confirms *why*: `apps/platform/src/config/pmoSidebarCategories.js`'s `PM_CATEGORY_DEFS`
(the literal list of root category ids the live PM sidebar renders from) is built entirely from
`plat_pm_*` / `plat_grp_pm_*` / `plat_sec_cross_fw` codes — and those turn out to be **children of
`plat_sec_universal`** (one root inside the "Platform" family above), not of any `pm_section_*` row.
Likewise `PMO_CATEGORY_DEFS` is built from `pmo-cat-*` (hyphenated) ids used directly as category
anchors — but the vast majority of *content* actually rendered under them at runtime comes from
**orphan-bucketing** (see below), not from the `pmo-cat-*` rows' own DB children.

`apps/platform/src/hooks/useMenu.js` even documents part of this directly — `LEGACY_SECTION_HEADER_CODES`
(lines 76-97) lists a set of `pmo_section_*`/`pm_section_*` codes explicitly as **"Legacy DB section
header codes (replaced by pmo-cat-* category rows in v676)"** that get stripped during the sidebar
transform. Only `pmo_section_collaboration` from the *current* DB inventory happens to match that
legacy list exactly — the other `pmo_section_*`/`pm_section_*` rows found in this audit were created
**after** that v676 legacy list was written (their names don't match it), so they are not explicitly
stripped; they simply fall through to the "orphan" bucket in `reorganizeMenuRoots()`
(`apps/platform/src/config/pmoMenuHierarchyUtils.js`) and get heuristically re-parented under a
`pmo-cat-*`/`plat_pm_*` category by `inferCategoryId()`/`inferPlatformCategoryId()` regex matching on
`menu_code`/`menu_label`/`route_path` — **while still carrying zero `role_menu_items` grants of their
own**, so even after being folded into a live category shell, they render nothing for anyone.

**Practical consequence for this audit:** "PMO layout" and "PM layout," as the task's own working
definition (`pmo_section_*`/`pmo-cat-*` and `pm_section_*`) describe them, are mostly a *parallel,
never-wired-up second attempt* at rebuilding the PMO/PM menu trees — plausibly a v9xx-era
rationalisation effort that built out full route-accurate trees but never migrated `role_menu_items`
grants onto them (or never finished it). The tree that **actually serves live PMO/PM users today**
lives inside the "Platform" family defined above, specifically:

- **Live PM tree** = children of `plat_sec_universal` (`plat_pm_*`, `plat_grp_pm_*` — 34 grants on
  the root, up to 34 on individual leaves).
- **Live PMO tree** = a patchwork of `plat_sec_exec_overview`, `plat_sec_project_delivery`,
  `plat_sec_workflows`, `plat_sec_reporting` (children granted mostly to `account_owner` /
  `pmo_admin` / `system_admin`, 3-4 roles) **plus** the flat `pmo-admin-*` / `pmo-people-*` /
  `pmo-comms-*` / `pmo-email-*` singleton leaves (each granted ~3 roles, `pmo-people-manage-roles`
  granted 23).

This finding governs the "Needs user decision" section at the end: the real rationalisation question
is not just "merge `plat_sec_*` with `platform_section_*`" (as the first audit assumed) — it's "what do
we do with two entire generations of PMO/PM menu trees, one dead (0 grants) and one live, that
disagree on `menu_code` naming, nesting, and even some route paths for the same concept?"

---

## 1. Prefix-family exhaustiveness check

The brief asked me to confirm the three layouts' defining prefixes are exhaustive rather than assumed.
They are not — there are **333 root-level (`parent_menu_id IS NULL`) rows total** across the whole
`menu_items` table, in far more than three families. Grouping by first-token prefix:

| Prefix | Roots | What it is | In scope for this audit? |
|---|---:|---|---|
| `pmo` (all `pmo-*`/`pmo_*` variants) | 62 | PMO layout family | **Yes — Section 3** |
| `plat` (`plat_sec_*`, `plat_*`) | 28 | Platform layout family | **Yes — Section 2** |
| `platform` (`platform_section_*`, `platform_*`) | 19 | Platform layout family (2nd generation) | **Yes — Section 2** |
| `local` (`local_register_*` + `local_registers_index`) | 29 | Industry "local register" leaves, mostly orphaned (should nest under `pmo_admin_local_registers`) | No — industry-pack infrastructure, not core PM |
| `pm` (`pm_section_*`, `pm_*`) | 24 | PM layout family | **Yes — Section 4** |
| `sim` (`sim_sec_*`, `sim-pmo-*`, `sim_unified_*`) | 22 | **Simulator** layout — a fourth, fully parallel tree mirroring Platform's `plat_sec_*` | No — out of scope per this task's own definition (Platform/PMO/PM only); flagged in §6 |
| `con`, `fin`, `ict`, `hlt`, `gov`, `tel`, `enr`, `mfg`, `edu`, `ngo`, `ret` (`*_cat_*`) | 94 total | Industry pack roots (taxonomy §4-14: Construction, Banking, ICT, Healthcare, Government, Telecom, Energy, Manufacturing, Education, NGO, Retail) | No — taxonomy §4-14, not §3 Core PM |
| `mkt`, `hrm`, `lco` (`*_cat_*`) | 25 total | **Marketing, HR, and Legal/Compliance industry packs — not in the taxonomy document at all** (no §-section covers these industries) | No — flagged as a taxonomy gap in §6, not audited in depth |
| `tm` (`tm_section_*`) | 10 | A **third** Platform-family generation ("Team Member" / Personal Workspace layout scope — `resolveLayoutType()` treats `tm` as a distinct role-driven shell that shares PM's category config) | **Yes — folded into Section 2 (Platform)** |
| `admseed` (`admseed-*`) | 4 | Admin-seeded test/demo rows (`Admin Seed — Platform Dashboard` etc.) | No — seed/test artefacts |
| Ungrouped singles (`testing_diagnostics_section`, `tasks`, `governance`, `dependencies`, `comms`, `quality`, `strategy`, `planning`, `delay_management`, `agile_delivery_extended`, `itto_management`, `help`, `support`, `financial_management_hub`, `testing_qa_section`) | 15 | Legacy/standalone roots, mostly `/platform/*` routes with no family prefix at all | Noted in §2 where relevant; not separately sectioned |

**Total accounted for:** 62+28+19+29+24+22+94+25+10+4+15 = 332 (+1 rounding on `local_registers_index`
counted once) ≈ 333. The three-layout framing in the brief (Platform/PMO/PM) is real and does cover
the "Core PM" menu space the taxonomy document addresses, but it excludes a **fourth parallel tree
(Simulator, `sim_*`, 22 roots)** built as a near-exact mirror of Platform's `plat_sec_*`/`platform_section_*`
duplication pattern, plus **three undocumented industry packs** (Marketing `mkt_cat_*`, HR `hrm_cat_*`,
Legal/Compliance `lco_cat_*`) that don't correspond to any section in
`Documentation/Core_PM_and_Industry_Menu_Taxonomy.md` at all. Both are called out in §6/§7 as scope
gaps for a future audit, not analysed leaf-by-leaf here.

---

## 2. Platform layout

### 2.1 Root inventory

**57 roots**, split across four generations that all claim to be "the" Platform tree:

| Generation | Prefix | Roots | Empty-container roots (0 children) | Total descendant nodes | Granted nodes |
|---|---|---:|---:|---:|---:|
| 1st gen (oldest, "role × methodology" cross) | `plat_sec_*` | 26 | 8 | 340 | ~305 |
| 1st gen singletons | `plat_exec_dashboard`, `plat_unified_approvals_register` | 2 | 1 (dashboard has 0 children but is itself a leaf) | 0 | 2 |
| 1st gen flat singletons | `platform_*` (non-`section`) | 9 | 9 (all are either true empty stubs or bare leaves) | 0 | 1 (`platform_calendar` etc. all 0; see tree) |
| 2nd gen ("scaffold rewrite," fully unwired) | `platform_section_*` | 10 | 0 (all have 1-4 children) | 21 | 0 |
| 3rd gen ("Personal Workspace" / Team Member rewrite, fully unwired) | `tm_section_*` | 10 | 1 | 29 | 0 |

Root list with direct-child and total-descendant counts (`totalDesc` = every node under the root,
recursively):

```
plat_exec_dashboard            Executive Dashboard            children=0  totalDesc=0
plat_sec_account               Account & Subscription         children=7  totalDesc=7
plat_sec_admin                 Administration                 children=0  totalDesc=0   [EMPTY STUB]
plat_sec_agile                 Agile                          children=8  totalDesc=24
plat_sec_approvals_gov         Approvals & Governance         children=0  totalDesc=0   [EMPTY STUB]
plat_sec_approvals_reporting   Approvals & Reporting          children=0  totalDesc=0   [EMPTY STUB]
plat_sec_comm_reporting        Communication & Reporting      children=0  totalDesc=0   [EMPTY STUB]
plat_sec_cross_fw              Cross-Framework                children=14 totalDesc=16
plat_sec_delivery              Delivery                       children=6  totalDesc=6
plat_sec_delivery_artefacts    Delivery Artefacts             children=2  totalDesc=2
plat_sec_email                 Email & Notifications          children=0  totalDesc=0   [EMPTY STUB]
plat_sec_exec_overview         Executive Overview             children=4  totalDesc=17
plat_sec_knowledge             Knowledge & Operations         children=5  totalDesc=22
plat_sec_people                People & Resources             children=1  totalDesc=1
plat_sec_personal              Personal Workspace              children=6  totalDesc=9
plat_sec_project_delivery      Portfolio & Delivery           children=2  totalDesc=20
plat_sec_quality_assurance     Quality & Assurance            children=0  totalDesc=0   [EMPTY STUB]
plat_sec_quality_testing       Quality & Testing              children=0  totalDesc=0   [EMPTY STUB]
plat_sec_reporting             Reporting & Intelligence       children=2  totalDesc=19
plat_sec_reporting_controls    Reporting & Controls           children=0  totalDesc=0   [EMPTY STUB]
plat_sec_standards_based       Standards-Based                children=2  totalDesc=13
plat_sec_structured            Structured                     children=7  totalDesc=42
plat_sec_system_admin          System Administration          children=10 totalDesc=10
plat_sec_team_mgmt             Team Management                children=1  totalDesc=7
plat_sec_team_section          Team                           children=2  totalDesc=8
plat_sec_universal             Universal (= LIVE PM sidebar)  children=15 totalDesc=69
plat_sec_workflows             Workflows & Governance         children=3  totalDesc=11
plat_unified_approvals_register Approvals Register            children=0  totalDesc=0
platform_calendar              Calendar                       children=0  totalDesc=0   [dead leaf, 0 grants]
platform_change_log            Change Request Log             children=0  totalDesc=0   [dead leaf, 0 grants]
platform_controls              Controls & Registers           children=0  totalDesc=0   [EMPTY STUB, 0 grants]
platform_feedback              Feedback                       children=0  totalDesc=0   [dead leaf, 0 grants]
platform_my_work               My Work                        children=0  totalDesc=0   [EMPTY STUB, 0 grants]
platform_people_stakeholders   People & Stakeholders (legacy)  children=0  totalDesc=0   [EMPTY STUB, 0 grants]
platform_planning              Planning & Delivery            children=0  totalDesc=0   [EMPTY STUB, 0 grants]
platform_quality_testing       Quality & Testing               children=0  totalDesc=0   [EMPTY STUB, 0 grants]
platform_section_admin         Administration                 children=4  totalDesc=4   [0 grants anywhere]
platform_section_agile         Agile                          children=1  totalDesc=1   [0 grants]
platform_section_collaboration Collaboration                  children=1  totalDesc=1   [0 grants]
platform_section_dashboards    Dashboards                     children=1  totalDesc=1   [0 grants]
platform_section_delivery      Delivery                       children=1  totalDesc=1   [0 grants]
platform_section_planning      Planning                       children=1  totalDesc=1   [0 grants]
platform_section_reporting     Reporting                      children=4  totalDesc=4   [0 grants except 1 leaf]
platform_section_resources     Resources                      children=3  totalDesc=3   [0 grants]
platform_section_settings      Settings                       children=3  totalDesc=3   [0 grants]
platform_section_strategy      Strategy & OKRs                children=2  totalDesc=2   [0 grants]
platform_stakeholders          Stakeholders                   children=6  totalDesc=6   [0 grants]
tm_section_appointment         Appointment Status             children=0  totalDesc=0   [0 grants]
tm_section_communications      Communications                 children=3  totalDesc=3   [0 grants]
tm_section_controls            Controls & Registers           children=6  totalDesc=6   [0 grants]
tm_section_knowledge           Knowledge & Resources           children=1  totalDesc=1   [0 grants]
tm_section_my_work             My Work                        children=6  totalDesc=6   [0 grants]
tm_section_plans               Plans                          children=5  totalDesc=5   [0 grants]
tm_section_reporting           Reporting & Status              children=3  totalDesc=3   [0 grants]
tm_section_team                Team & Collaboration            children=2  totalDesc=2   [0 grants]
tm_section_team_charter        Team Charter                    children=2  totalDesc=2   [0 grants]
tm_section_timesheets          Timesheets                      children=4  totalDesc=4   [0 grants]
```

### 2.2 Full tree dump

Format: `menu_code — menu_label | route=... | roles=N` where `roles=N` is the count of distinct roles
(out of 111) with an active `can_view=true` grant on that exact row. `roles=0` means dead —
unreachable by anyone.

```
- plat_exec_dashboard — Executive Dashboard | route=/platform/executive/dashboard | roles=13

- plat_sec_account — Account & Subscription | route=— | roles=3
  - plat_acct_current_plan — Current Plan | route=/platform/subscription | roles=3
  - plat_acct_upgrade — Upgrade / Downgrade | route=/platform/subscription/upgrade | roles=3
  - plat_acct_billing — Billing History | route=/platform/subscription/billing-history | roles=3
  - plat_acct_payment — Payment Methods | route=/platform/subscription/payment-methods | roles=3
  - plat_acct_org_profile — Organisation Profile | route=/platform/organisation/profile | roles=3
  - plat_acct_branding — Branding & Identity | route=/platform/organisation/branding | roles=3
  - plat_acct_domain — Domain Settings | route=/platform/organisation/domain-settings | roles=3

- plat_sec_admin — Administration | route=— | roles=3

- plat_sec_agile — Agile | route=— | roles=15
  - plat_grp_agile_tools — Agile & Lean Tools | route=— | roles=12
    - plat_a_scrum_of_scrums — Scrum of Scrums | route=/platform/scrum-of-scrums | roles=12
    - plat_a_vsm — Value Stream Map | route=/platform/value-stream-map | roles=12
    - plat_a_kaizen — Kaizen Board | route=/platform/kaizen-board | roles=12
    - plat_pt_agile — Agile Templates | route=/pmo/process-templates/agile | roles=3
  - plat_grp_pm_agile_delivery — Agile Delivery | route=— | roles=12
    - plat_pm_a_story_map — Story Map | route=/platform/story-map | roles=12
    - plat_pm_a_releases — Releases / Sprints | route=/platform/releases | roles=12
  - plat_grp_tm_agile — Agile Delivery | route=— | roles=5
    - plat_tm_sprint_tasks — My Sprint Tasks | route=/platform/sprint-tasks | roles=5
    - plat_tm_story_map_ro — Story Map (read) | route=/platform/story-map | roles=5
  - plat_grp_agile_delivery — Agile Delivery | route=— | roles=12
    - plat_a_story_maps — Story Maps | route=/platform/story-map | roles=12
    - plat_a_releases — Releases | route=/platform/releases | roles=12
  - plat_pm_a_process_forms — Agile Process Forms | route=/platform/agile-process-forms | roles=12
  - plat_grp_agile_metrics — Agile Metrics | route=— | roles=13
    - plat_a_sprint_metrics — Sprint Metrics | route=/platform/sprint-metrics | roles=13
    - plat_a_lean_metrics — Lean Metrics | route=/platform/lean-metrics | roles=12
  - plat_grp_pm_lean_tools — Lean Tools | route=— | roles=12
    - plat_pm_a_vsm — Value Stream Map | route=/platform/value-stream-map | roles=12
    - plat_pm_a_kaizen — Kaizen Board | route=/platform/kaizen-board | roles=12
  - plat_grp_pm_planning_tools — Planning Tools | route=— | roles=12
    - plat_pm_a_planning_poker — Planning Poker | route=/pm/planning/planning-poker | roles=12
    - plat_pm_a_scurve — S-Curve & Baselines | route=/pm/planning/s-curve | roles=12

- plat_sec_approvals_gov — Approvals & Governance | route=— | roles=17

- plat_sec_approvals_reporting — Approvals & Reporting | route=— | roles=13

- plat_sec_comm_reporting — Communication & Reporting | route=— | roles=13

- plat_sec_cross_fw — Cross-Framework | route=— | roles=24
  - plat_grp_tm_auth — Authorisation | route=— | roles=5
    - plat_tm_submitted — My Submitted Records | route=/pm/authorisation/submitted | roles=5
    - plat_tm_pending_appr — Pending My Approval | route=/pmo/authorisation/queue | roles=5
  - plat_tm_okr_contrib — My OKR Contributions | route=/pmo/okr/objectives | roles=5
  - plat_xf_knowledge — Knowledge & Resources | route=/platform/org-knowledge | roles=12
  - plat_tm_workload — Workload Heatmap | route=/platform/resources/capacity | roles=5
  - plat_xf_okr — Strategy & OKRs | route=/pmo/okr | roles=22
  - plat_tm_notif_prefs — Notification Preferences | route=/platform/notification-preferences | roles=5
  - plat_xf_resources_hub — Resources Hub | route=/platform/resources | roles=12
  - plat_xf_project_settings — Project Settings | route=/platform/project-settings | roles=12
  - plat_xf_procurement — Procurement & Contracts | route=/platform/procurement | roles=12
  - plat_xf_dashboards — Dashboards & Analytics | route=/platform/analytics | roles=12
  - plat_xf_collaboration — Collaboration | route=/pmo/collaboration/whiteboard | roles=12
  - plat_xf_automation — Automation | route=/platform/automation | roles=12
  - plat_xf_integrations — Integrations | route=/platform/integrations | roles=12
  - plat_xf_notif_prefs — Notification Preferences | route=/platform/notification-preferences | roles=34

- plat_sec_delivery — Delivery | route=— | roles=4
  - plat_tl_work_packages — Work Packages | route=/pm/delivery/work-packages | roles=4
  - plat_tl_prod_desc — Product Descriptions | route=/platform/product-descriptions | roles=4
  - plat_tl_daily_log — Daily Log (team) | route=/platform/daily-log/my-entries | roles=4
  - plat_tl_controls — Risk Register | route=/platform/risks | roles=4
  - plat_tl_checkpoint — Checkpoint Reports | route=/platform/structured/checkpoint-reports | roles=4
  - plat_tl_team_reports — Team Reports | route=/platform/reports | roles=4

- plat_sec_delivery_artefacts — Delivery Artefacts | route=— | roles=5
  - plat_tm_work_packages — My Work Packages (assigned) | route=/pm/delivery/work-packages | roles=5
  - plat_tm_prod_desc — My Product Descriptions (assigned) | route=/platform/product-descriptions | roles=5

- plat_sec_email — Email & Notifications | route=— | roles=3

- plat_sec_exec_overview — Executive Overview | route=— | roles=3
  - plat_dashboard_pmo — Dashboard | route=/platform/dashboard | roles=12
  - plat_grp_portfolio — Portfolio | route=— | roles=14
    - plat_portfolio_overview — Portfolio Overview | route=/platform/portfolio | roles=14
    - plat_portfolio_dependencies — Portfolio Dependencies | route=/platform/portfolio/dependencies | roles=13
    - plat_portfolio_collisions — Portfolio Collisions | route=/pmo/planning/collisions | roles=13
    - plat_portfolio_map — Portfolio Map | route=/pmo/strategy/portfolio-map | roles=14
    - plat_portfolio_alignment — Strategic Alignment | route=/platform/strategy/alignment | roles=14
    - plat_portfolio_benefits — Benefits Pipeline | route=/platform/benefits | roles=14
    - plat_portfolio_document_oversight — Document Oversight | route=/platform/portfolio/document-oversight | roles=4
  - plat_grp_programme — Programme | route=— | roles=23
    - plat_programme_management — Programme Management | route=/platform/programme | roles=22
    - plat_programme_benefits — Benefits Management | route=/platform/programme/benefits | roles=22
    - plat_programme_document_oversight — Document Oversight | route=/platform/programme/document-oversight | roles=12
  - plat_grp_plan_intel — Planning Intelligence | route=— | roles=12
    - plat_plan_intel_hub — Planning Hub | route=/pmo/planning | roles=12
    - plat_plan_intel_rules — Intelligence Rules | route=/pmo/planning/intelligence-rules | roles=12
    - plat_plan_gov_rules — Governance Rules Configuration | route=/pmo/planning/governance-rules | roles=12

- plat_sec_knowledge — Knowledge & Operations | route=— | roles=3
  - plat_grp_knowledge_assets — Knowledge & Assets | route=— | roles=3
    - plat_know_hub — Org Knowledge Hub | route=/platform/org-knowledge | roles=3
    - plat_know_assets — Process Assets | route=/platform/opa | roles=3
    - plat_know_add_opa — Add OPA | route=/platform/opa/new | roles=3
    - plat_know_opa_drafts — OPA Drafts | route=/platform/opa/on-hold | roles=3
    - plat_know_opa_bulk — OPA Bulk Upload | route=/platform/opa/bulk-upload | roles=3
  - plat_grp_template_library — Template Library | route=— | roles=12
    - plat_pt_hub — Template Hub | route=/pmo/process-templates | roles=3
    - plat_pt_browse — Browse Templates | route=/platform/templates | roles=3
    - plat_pt_new — New Template | route=/pmo/process-templates/create | roles=3
    - plat_pt_industry — Industry Templates | route=/pmo/process-templates/industry | roles=3
  - plat_grp_okr — Strategy & OKRs | route=— | roles=3
    - plat_okr_dashboard — OKR Dashboard | route=/pmo/okr | roles=3
    - plat_okr_objectives — Objectives & Key Results | route=/pmo/okr/objectives | roles=3
    - plat_okr_alignment — Alignment Map | route=/pmo/okr/alignment | roles=3
    - plat_okr_checkins — OKR Check-ins | route=/pmo/okr/check-ins | roles=3
  - plat_grp_procurement — Procurement | route=— | roles=3
    - plat_proc_rfp — RFP Register | route=/pmo/procurement/rfp | roles=3
    - plat_proc_load_rfp — Load RFP | route=/pmo/rfp/create | roles=3
    - plat_proc_drafts — RFP Drafts | route=/pmo/rfp/drafts | roles=3
  - plat_grp_collaboration — Collaboration | route=— | roles=3
    - plat_collab_whiteboard — Whiteboard | route=/pmo/collaboration/whiteboard | roles=3

- plat_sec_people — People & Resources | route=— | roles=3
  - plat_people_stakeholders — Stakeholders | route=/platform/stakeholders/register | roles=3

- plat_sec_personal — Personal Workspace | route=— | roles=5
  - plat_tm_dashboard — Dashboard | route=/platform/dashboard | roles=5
  - plat_grp_tm_my_tasks — My Tasks | route=— | roles=5
    - plat_tm_task_board — Task Board | route=/platform/tasks/board | roles=5
    - plat_tm_task_list — Task List | route=/platform/tasks | roles=5
    - plat_tm_task_calendar — Task Calendar | route=/platform/tasks/calendar | roles=5
  - plat_tm_daily_log — My Daily Log | route=/platform/daily-log/my-entries | roles=5
  - plat_tm_lesson_actions — My Lesson Actions | route=/platform/lessons/my-actions | roles=5
  - plat_tm_timesheets — Timesheets | route=/platform/timesheets/my | roles=5
  - plat_tm_calendar — Calendar | route=/platform/calendar | roles=5

- plat_sec_project_delivery — Portfolio & Delivery | route=— | roles=3
  - plat_grp_projects — Projects | route=— | roles=3
    - plat_project_dashboard — Project Dashboard | route=/platform/dashboard | roles=12
    - plat_my_projects — My Projects | route=/platform/projects | roles=12
    - plat_all_projects — All Projects | route=/platform/projects | roles=12
    - plat_create_project — Create Project / Quick Create | route=/platform/projects/create | roles=12
    - plat_archived_projects — Archived Projects | route=/platform/projects/archived | roles=12
    - plat_onhold_projects — On Hold / Drafts | route=/platform/projects/on-hold | roles=12
    - plat_members_roles — Members & Roles | route=/platform/project-users | roles=12
    - plat_daily_log_pmo — My Daily Log | route=/platform/daily-log/my-entries | roles=12
    - plat_story_map_pmo — Story Map | route=/platform/story-map | roles=12
    - plat_releases_pmo — Releases | route=/platform/releases | roles=12
  - plat_grp_oversight — Project Oversight | route=— | roles=3
    - plat_oversight_risk — Risk Register | route=/pmo/oversight/risk-register | roles=3
    - plat_oversight_issue — Issue Register | route=/pmo/oversight/issue-register | roles=3
    - plat_oversight_quality — Quality Register | route=/pmo/oversight/quality-register | roles=3
    - plat_oversight_lessons — Lessons Log | route=/pmo/oversight/lessons-log | roles=3
    - plat_oversight_delay — Delay Register / Templates | route=/platform/delays | roles=3
    - plat_oversight_scope — Scope Oversight | route=/pmo/oversight/scope | roles=3
    - plat_oversight_schedule — Schedule Oversight | route=/pmo/oversight/schedules | roles=3
    - plat_oversight_change — Change Register | route=/pmo/registers/changes | roles=3

- plat_sec_quality_assurance — Quality & Assurance | route=— | roles=13

- plat_sec_quality_testing — Quality & Testing | route=— | roles=13

- plat_sec_reporting — Reporting & Intelligence | route=— | roles=4
  - plat_grp_reporting_assurance — Reporting & Assurance | route=— | roles=4
    - plat_rep_highlight — Highlight Reports | route=/pm/reporting/highlight | roles=3
    - plat_rep_exception — Exception Reports | route=/pm/reporting/exception | roles=3
    - plat_rep_end_stage — End Stage Reports | route=/pm/reporting/end-stage | roles=3
    - plat_rep_end_project — End Project Reports | route=/platform/structured/end-project-report | roles=3
    - plat_rep_lessons — Lessons Reports | route=/platform/reports | roles=3
    - plat_rep_library — Report Library | route=/platform/reports | roles=3
    - plat_rep_analytics — Analytics Dashboards | route=/platform/analytics | roles=4
    - plat_rep_builder — Dashboard Builder | route=/platform/report-builder | roles=4
    - plat_rep_scheduled — Scheduled Reports | route=/platform/scheduled-reports | roles=4
    - plat_rep_agile_metrics — Agile Metrics Hub | route=/platform/sprint-metrics | roles=3
  - plat_grp_financial — Financial Management | route=— | roles=12
    - plat_fin_reports — Financial Reports | route=/platform/financial-reports | roles=19
    - plat_fin_evm — Portfolio EVM | route=/platform/portfolio/evm | roles=19
    - plat_fin_cost_actuals — Cost Actuals | route=/platform/cost-actuals | roles=4
    - plat_fin_programme_evm — Programme EVM | route=/platform/programme/evm | roles=12
    - plat_fin_approvals — Expense Approvals | route=/platform/expenses/approvals | roles=12
    - plat_fin_project_evm — Project EVM | route=/platform/projects/evm | roles=12
    - plat_fin_thresholds — Expense Thresholds | route=/platform/expense-thresholds | roles=12

- plat_sec_reporting_controls — Reporting & Controls | route=— | roles=13

- plat_sec_standards_based — Standards-Based | route=— | roles=23
  - plat_grp_process_groups — Process Group Forms | route=— | roles=12
    - plat_p_initiating — Initiating | route=/platform/process-group-forms?group=initiating | roles=12
    - plat_p_planning — Planning | route=/platform/process-group-forms?group=planning | roles=12
    - plat_p_executing — Executing | route=/platform/process-group-forms?group=executing | roles=12
    - plat_p_mc — Monitoring & Controlling | route=/platform/process-group-forms?group=monitoring | roles=12
    - plat_p_closing — Closing | route=/platform/process-group-forms?group=closing | roles=12
    - plat_p_drafts — Drafts | route=/platform/process-group-forms/drafts | roles=12
    - plat_p_approvals — Approvals | route=/pmo/authorisation/queue | roles=12
    - plat_p_new_form_template — New Template | route=/pmo/forms/new | roles=12
  - plat_grp_pm_itto — ITTO Framework | route=— | roles=12
    - plat_pm_p_itto_templates — ITTO Templates | route=/platform/itto/templates | roles=12
    - plat_pm_p_itto_project — ITTO Project | route=/platform/itto/project | roles=12
    - plat_pm_p_itto_drafts — ITTO Drafts | route=/platform/itto/drafts | roles=12

- plat_sec_structured — Structured | route=— | roles=34
  - plat_grp_initiation — Initiation Hub | route=— | roles=13
    - plat_s_mandates — Project Mandates | route=/pmo/mandates | roles=12
    - plat_s_briefs — Project Briefs | route=/platform/brief | roles=12
    - plat_s_business_cases — Business Cases | route=/pmo/initiation/business-case | roles=13
    - plat_pt_preproject — Pre-Project Templates | route=/pmo/process-templates/pre-project | roles=3
    - plat_s_benefits_review — Benefits Review Plans | route=/pm/initiation/benefits-review-plan | roles=13
  - plat_grp_pm_pre_project — Pre-Project & Initiation | route=— | roles=27
    - plat_pm_s_mandate — Project Mandate | route=/pmo/mandates | roles=27
    - plat_pm_s_brief — Project Brief | route=/platform/brief | roles=28
    - plat_pm_s_business_case — Business Case | route=/pmo/initiation/business-case | roles=29
  - plat_tm_s_work_packages_ro — Work Packages (assigned to me) | route=/pm/delivery/work-packages | roles=5
  - plat_grp_gov_standards — Governance & Standards | route=— | roles=12
    - plat_s_cms — Communication Strategy | route=/pm/governance/communication-strategy | roles=12
    - plat_s_config_ms — Configuration Strategy | route=/pm/governance/configuration-strategy | roles=12
    - plat_s_qms — Quality Strategy | route=/pm/governance/quality-strategy | roles=12
    - plat_s_rms — Risk Strategy | route=/pm/governance/risk-strategy | roles=12
    - plat_s_pids — Project Initiation Documents (PIDs) | route=/platform/initiation/pids | roles=13
    - plat_s_itto — ITTO Templates / Drafts | route=/platform/itto/templates | roles=12
    - plat_s_opa — Organisational Process Assets (OPA) | route=/platform/opa | roles=12
  - plat_grp_pm_proj_controls — Project Controls | route=— | roles=18
    - plat_pm_s_pid — Project Initiation Document | route=/platform/pid | roles=19
    - plat_pm_s_benefits_rp — Benefits Review Plan | route=/pm/initiation/benefits-review-plan | roles=20
    - plat_pm_s_work_packages — Work Packages | route=/pm/delivery/work-packages | roles=12
    - plat_pm_s_prod_desc — Product Descriptions | route=/platform/product-descriptions | roles=12
    - plat_pm_s_ppd — Project Product Description | route=/platform/ppd | roles=12
  - plat_grp_pm_gov_standards — Governance & Standards | route=— | roles=21
    - plat_pm_s_cms — Communication Mgmt Strategy | route=/pm/governance/communication-strategy | roles=21
    - plat_pm_s_conf_ms — Configuration Mgmt Strategy | route=/pm/governance/configuration-strategy | roles=22
    - plat_pm_s_qms — Quality Mgmt Strategy | route=/pm/governance/quality-strategy | roles=23
    - plat_pm_s_rms — Risk Mgmt Strategy | route=/pm/governance/risk-strategy | roles=21
    - plat_pm_s_doc_gov — Document Governance | route=/platform/document-governance | roles=13
    - plat_pm_s_gov_framework — Governance Framework | route=/platform/governance/framework | roles=14
    - plat_pm_s_policies — Policies & Compliance | route=/platform/governance/policies | roles=13
    - plat_pm_s_work_auth — Work Authorisations | route=/platform/work-authorisation | roles=18
    - plat_pm_s_stage_gates — Stage Gate Reviews | route=/platform/stage-gates | roles=18
  - plat_grp_pm_del_reporting — Delivery Reporting | route=— | roles=21
    - plat_pm_s_checkpoint — Checkpoint Reports | route=/platform/structured/checkpoint-reports | roles=13
    - plat_pm_s_highlight — Highlight Reports | route=/pm/reporting/highlight | roles=29
    - plat_pm_s_issue_rep — Issue Reports | route=/pm/reporting/issues | roles=12
    - plat_pm_s_exception — Exception Reports | route=/pm/reporting/exception | roles=20
    - plat_pm_s_end_stage — End Stage Reports | route=/pm/reporting/end-stage | roles=28
    - plat_pm_s_end_project — End Project Report | route=/platform/structured/end-project-report | roles=20

- plat_sec_system_admin — System Administration | route=— | roles=2
  - plat_sys_platform_settings — Platform Settings | route=/admin/settings | roles=2
  - plat_sys_pwa — PWA Settings | route=/admin/pwa-settings | roles=2
  - plat_sys_auth — Authentication Settings | route=/admin/authentication-settings | roles=2
  - plat_sys_security — Encryption & Security | route=/admin/security-settings | roles=2
  - plat-sys-role-catalog — System Role Catalog | route=/platform/admin/system-roles | roles=1
  - plat_sys_gdpr — GDPR Compliance | route=/admin/gdpr-compliance | roles=2
  - plat_sys_roles_perms — Roles & Permissions | route=/admin/role-menu-management | roles=2
  - plat_sys_help_content — Help Content Management | route=/admin/help-management | roles=2
  - plat_sys_feedback — Feedback Analysis | route=/admin/feedback-analysis | roles=2
  - plat_sys_monitoring — Monitoring Dashboard | route=/admin/monitoring-dashboard | roles=2

- plat_sec_team_mgmt — Team Management | route=— | roles=4
  - plat_grp_tl_team — Team | route=— | roles=4
    - plat_tl_all_members — All Team Members | route=/platform/teams | roles=4
    - plat_tl_assignments — Team Assignments | route=/pmo-admin/manager-assignments | roles=4
    - plat_tl_workstream_plans — Workstream Plans | route=/platform/workstream-plans | roles=4
    - plat_tl_charter — Team Charter | route=/platform/team-charter | roles=4
    - plat_tl_timesheet_mgmt — Timesheet Management | route=/platform/timesheets/team | roles=4
    - plat_tl_capacity — Team Capacity | route=/platform/resources/capacity | roles=4

- plat_sec_team_section — Team | route=— | roles=5
  - plat_grp_tm_my_team — My Team | route=— | roles=5
    - plat_tm_team_members — Team Members | route=/platform/teams | roles=5
    - plat_tm_team_board — Team Board | route=/platform/team-board | roles=5
    - plat_tm_team_calendar — Team Calendar | route=/platform/calendar | roles=5
  - plat_grp_tm_comms — Communications | route=— | roles=5
    - plat_tm_messages — Messages | route=/platform/comms | roles=6
    - plat_tm_direct_msgs — Direct Messages | route=/platform/comms/direct-messages | roles=6
    - plat_tm_meetings — Meetings | route=/platform/meetings | roles=6

- plat_sec_universal — Universal (= children ARE the live PM_CATEGORY_DEFS sidebar) | route=— | roles=34
  - plat_pm_dashboard — Dashboard | route=/platform/dashboard | roles=33
  - plat_pm_ai — AI Assistant | route=/platform/ai-assistant | roles=22
  - plat_grp_pm_projects — Projects | route=— | roles=23
    - plat_pm_my_projects — My Projects | route=/platform/projects | roles=32
    - plat_pm_all_projects — All Projects | route=/platform/projects | roles=14
    - plat_pm_create_project — Create Project | route=/platform/projects/create | roles=12
    - plat_pm_archives — Archives / On Hold | route=/platform/projects/on-hold | roles=12
    - plat_pm_manage_members — Manage Members | route=/platform/project-users | roles=21
    - plat_pm_daily_log — My Daily Log | route=/platform/daily-log/my-entries | roles=12
  - plat_pm_templates — Organizational Templates | route=/platform/templates | roles=22
    - plat_pm_templates_templates — Templates | route=/platform/templates/organisational?domainGroup=templates | roles=22
    - plat_pm_templates_forms — Forms | route=/platform/templates/organisational?domainGroup=forms | roles=22
  - plat_pm_project_templates — Project Templates | route=/platform/templates/project | roles=22
    - plat_pm_project_templates_templates — Templates | route=/platform/templates/project?domainGroup=templates | roles=22
    - plat_pm_project_templates_forms — Forms | route=/platform/templates/project?domainGroup=forms | roles=22
  - plat_pm_project_documents — Project Documents | route=/platform/documents/project | roles=22
  - plat_grp_pm_tasks — Tasks | route=— | roles=12
    - plat_pm_my_tasks — My Tasks | route=/platform/tasks | roles=12
    - plat_pm_all_tasks — All Tasks | route=/platform/tasks | roles=12
    - plat_pm_task_board — Task Board | route=/platform/tasks/board | roles=12
    - plat_pm_task_calendar — Task Calendar | route=/platform/tasks/calendar | roles=12
  - plat_grp_pm_teams — Teams | route=— | roles=23
    - plat_pm_all_teams — All Teams | route=/platform/teams | roles=12
    - plat_pm_my_team — My Team | route=/platform/my-team | roles=12
    - plat_pm_resource_dir — Resource Directory | route=/platform/resources | roles=12
    - plat_pm_skill_matrix — Skill Matrix | route=/platform/resources/skills | roles=12
    - plat_pm_capacity — Capacity Planning | route=/platform/resources/capacity | roles=12
    - plat_pm_leave_cal — Leave Calendar | route=/platform/calendar | roles=12
    - plat_pm_manage_roles — Manage Roles | route=/platform/admin/manage-roles | roles=23
  - plat_pm_calendar — Calendar | route=/platform/calendar | roles=12
  - plat_grp_pm_controls — Controls & Registers | route=— | roles=22
    - plat_pm_ctrl_core — Core Controls | route=— | roles=12
      - plat_pm_risk_reg — Risk Register | route=/pm/controls/risk-register | roles=23
      - plat_pm_issue_log — Issue Register | route=/pm/controls/issue-register | roles=23
      - plat_pm_change_log — Change Log | route=/platform/change | roles=23
      - plat_pm_delay_reg — Delay Register | route=/platform/delays | roles=22
      - plat_pm_assumptions_reg — Assumptions Register | route=/platform/assumptions | roles=4
    - plat_pm_ctrl_quality — Quality & Configuration | route=— | roles=12
      - plat_pm_quality_reg — Quality Register | route=/pm/controls/quality-register | roles=12
      - plat_pm_config_reg — Configuration Item Register | route=/pm/controls/configuration-items | roles=12
    - plat_pm_ctrl_knowledge — Knowledge & Governance | route=— | roles=12
      - plat_pm_lessons_ctrl — Lessons Log | route=/pm/controls/lessons-log | roles=12
      - plat_pm_s_decision_log — Decision Log | route=/platform/governance/decisions | roles=18
      - plat_pm_raid_log — RAID Log | route=/platform/raid-log | roles=12
    - plat_pm_ctrl_scope — Scope & Value | route=— | roles=12
      - plat_pm_requirements — Requirements Register | route=/platform/scope/requirements | roles=12
      - plat_pm_eef — EEF | route=/platform/eef | roles=12
      - plat_pm_benefits_reg — Benefits Register | route=/platform/benefits/register | roles=12
  - plat_grp_pm_stakeholders — Stakeholders | route=— | roles=17
    - plat_pm_stkh_register — Stakeholder Register | route=/platform/stakeholders/register | roles=17
    - plat_pm_stkh_analysis — Stakeholder Analysis | route=/platform/stakeholders/analysis | roles=12
    - plat_pm_stkh_engagement — Engagement Planning | route=/platform/stakeholders/engagement | roles=12
    - plat_pm_stkh_comms — Communication Plans | route=/platform/stakeholders/communication | roles=12
    - plat_pm_stkh_matrix — Power/Interest Matrix | route=/platform/stakeholders/assessment | roles=12
    - plat_pm_stkh_assess — Assessment Matrix | route=/platform/stakeholders/assessment | roles=12
  - plat_pm_quality_testing — Quality & Testing | route=/platform/testing/dashboard | roles=14
  - plat_grp_pm_reporting — Reporting & Analytics | route=— | roles=30
    - plat_pm_rep_library — Report Library | route=/platform/reports | roles=30
    - plat_pm_rep_builder — Report Builder | route=/platform/report-builder | roles=13
    - plat_pm_analytics — Analytics Dashboards | route=/platform/analytics | roles=23
    - plat_pm_custom_metrics — Custom Metrics | route=/platform/analytics/custom-metrics | roles=12
  - plat_grp_pm_financial — Financial | route=— | roles=28
    - plat_pm_my_expenses — My Expenses | route=/platform/expenses/my | roles=21
    - plat_pm_exp_approvals — Expense Approvals | route=/platform/expenses/approvals | roles=21
    - plat_pm_fin_reports — Financial Reports | route=/platform/financial-reports | roles=21
  - plat_grp_pm_auth — Authorisation | route=— | roles=30
    - plat_pm_pending_approval — Pending My Approval | route=/pmo/authorisation/queue | roles=30
    - plat_pm_submitted — My Submitted Records | route=/pm/authorisation/submitted | roles=29
    - plat_pm_approval_chains — Approval Chains | route=/pmo/authorisation/chains | roles=19

- plat_sec_workflows — Workflows & Governance | route=— | roles=4
  - plat_grp_workflows_approvals — Workflows & Approvals | route=— | roles=4
    - pmo-workflows-mandate-approvals — Mandate Approvals | route=/platform/mandates/approvals | roles=3
    - pmo-workflows-brief-approvals — Project Brief Approvals | route=/platform/briefs/approvals | roles=3
  - plat_grp_auth_lifecycle — Authorisation & Lifecycle | route=— | roles=4
    - plat_lc_auth_queue — Authorisation Queue | route=/pmo/authorisation/queue | roles=4
    - plat_lc_dashboard — Lifecycle Dashboard | route=/pmo/authorisation/dashboard | roles=3
    - plat_lc_configure — Configure Rules | route=/pmo/authorisation/configure | roles=3
    - plat_lc_chains — Approval Chains | route=/pmo/authorisation/chains | roles=4
    - plat_lc_retention — Archive Retention | route=/pmo/authorisation/archive-retention | roles=3
    - plat_lc_vault — Archive Vault | route=/pmo/authorisation/archive | roles=3
  - plat_grp_quality_testing_pmo — Quality & Testing | route=— | roles=12

- plat_unified_approvals_register — Approvals Register | route=/pmo/approvals/register | roles=7

- platform_calendar — Calendar | route=/platform/calendar | roles=0
- platform_change_log — Change Request Log | route=/platform/change-log | roles=0
- platform_controls — Controls & Registers | route=— | roles=0
- platform_feedback — Feedback | route=/platform/feedback | roles=0
- platform_my_work — My Work | route=— | roles=0
- platform_people_stakeholders — People & Stakeholders (legacy) | route=— | roles=0
- platform_planning — Planning & Delivery | route=— | roles=0
- platform_quality_testing — Quality & Testing | route=— | roles=0

- platform_section_admin — Administration | route=— | roles=0
  - platform_automations — Automation Rules | route=/platform/automations | roles=0
  - platform_custom_fields — Custom Fields | route=/platform/admin/custom-fields | roles=0
  - platform_guest_access — Guest Access Management | route=/platform/admin/guest-access | roles=0
  - platform_integrations_hub — Integrations Hub | route=/platform/admin/integrations | roles=0

- platform_section_agile — Agile | route=— | roles=0
  - platform_planning_poker — Planning Poker | route=/platform/agile/poker | roles=0

- platform_section_collaboration — Collaboration | route=— | roles=0
  - platform_whiteboards — Whiteboards | route=/platform/collaboration/whiteboards | roles=0

- platform_section_dashboards — Dashboards | route=— | roles=0
  - platform_dashboard_builder — Dashboard Builder | route=/platform/dashboards/builder | roles=0

- platform_section_delivery — Delivery | route=— | roles=0
  - platform_recurring_tasks — Recurring Tasks | route=/platform/recurring-tasks | roles=0

- platform_section_planning — Planning | route=— | roles=0
  - platform_raci_matrix — RACI Matrix | route=/platform/planning/raci | roles=0

- platform_section_reporting — Reporting | route=— | roles=0
  - platform_s_curve — S-Curve Analysis | route=/platform/reporting/s-curve | roles=0
  - platform_scheduled_reports — Scheduled Reports | route=/platform/reporting/scheduled | roles=0
  - platform_timesheet_approvals — Timesheet Approvals | route=/platform/timesheets/approvals | roles=0
  - platform_timesheet_approval_settings — Timesheet Approval Settings | route=/platform/timesheets/settings | roles=5

- platform_section_resources — Resources | route=— | roles=0
  - platform_workload_heatmap — Workload Heatmap | route=/platform/resources/workload | roles=0
  - platform_skills_matrix — Skills Matrix | route=/platform/resources/skills | roles=0
  - platform_training — Training & Certifications | route=/platform/resources/training | roles=0

- platform_section_settings — Settings | route=— | roles=0
  - platform_intake_forms — Intake Forms | route=/platform/intake-forms | roles=0
  - platform_client_portal — Client Portal | route=/platform/client-portal | roles=0
  - platform_notification_prefs — Notification Preferences | route=/platform/settings/notifications | roles=0

- platform_section_strategy — Strategy & OKRs | route=— | roles=0
  - platform_okr_goals — OKR & Goals | route=/platform/okr | roles=0
  - platform_portfolio_map — Strategic Portfolio Map | route=/platform/portfolio/map | roles=0

- platform_stakeholders — Stakeholders | route=/platform/stakeholders | roles=0
  - platform_stakeholders_register — Stakeholder Register | route=/platform/stakeholders/register | roles=0
  - platform_stakeholders_analysis — Stakeholder Analysis | route=/platform/stakeholders/analysis | roles=0
  - platform_stakeholders_assessment_matrix — Stakeholder Assessment Matrix | route=/platform/stakeholders/assessment-matrix | roles=0
  - platform_stakeholders_engagement — Engagement Planning | route=/platform/stakeholders/engagement | roles=0
  - platform_stakeholders_communications — Communication Plans | route=/platform/stakeholders/communications | roles=0
  - platform_stakeholders_monitoring — Monitoring | route=/platform/stakeholders/monitoring | roles=0

- tm_section_appointment — Appointment Status | route=/app/invitation-tracker | roles=0

- tm_section_communications — Communications | route=— | roles=0
  - tm_team_chat — Team Chat | route=/platform/communications/chat | roles=0
  - tm_video_calls — Video Calls | route=/platform/communications/video-calls | roles=0
  - tm_voice_calls — Voice Calls | route=/platform/communications/voice-calls | roles=0

- tm_section_controls — Controls & Registers | route=— | roles=0
  - tm_risk_register — Risk Register | route=/pmo/oversight/risk-register | roles=0
  - tm_issue_log — Issue Log | route=/pmo/oversight/issue-register | roles=0
  - tm_change_log — Change Log | route=/platform/projects/:id/registers/changes | roles=0
  - tm_delay_log — Delay Log | route=/platform/delays | roles=0
  - tm_defect_register — Defect Register | route=/platform/testing/defects | roles=0
  - tm_decision_log — Decision Log | route=/platform/governance/decisions | roles=0

- tm_section_knowledge — Knowledge & Resources | route=— | roles=0
  - tm_industry_templates — Industry Templates | route=/platform/industry-templates | roles=0

- tm_section_my_work — My Work | route=— | roles=0
  - tm_my_tasks — My Tasks | route=/platform/tasks | roles=0
  - tm_task_board — Task Board | route=/platform/tasks/board | roles=0
  - tm_task_calendar — Task Calendar | route=/platform/tasks/calendar | roles=0
  - tm_daily_log — Daily Log | route=/app/daily-log/my-entries | roles=0
  - tm_lesson_actions — My Lesson Actions | route=/app/lessons/my-actions | roles=0
  - tm_issue_actions — My Issue Actions | route=/app/issues/my-actions | roles=0

- tm_section_plans — Plans | route=— | roles=0
  - tm_my_plans — My Plans | route=/platform/plans/my-plans | roles=0
  - tm_team_workstream_plans — Team Workstream Plans | route=/platform/plans/team-workstreams | roles=0
  - tm_plans_overview — Plans Overview | route=/platform/projects/__PROJECT__/plans | roles=0
  - tm_project_plan — Project Plan | route=/platform/projects/__PROJECT__/plans/project-plan | roles=0
  - tm_stage_plans — Stage Plans | route=/platform/projects/__PROJECT__/plans/stage-plan | roles=0

- tm_section_reporting — Reporting & Status | route=— | roles=0
  - tm_highlight_reports — Highlight Reports | route=/pm/reporting/highlight-reports | roles=0
  - tm_checkpoint_reports — Checkpoint Reports | route=/pm/reporting/checkpoint-reports | roles=0
  - tm_reports_library — Reports Library | route=/platform/reports | roles=0

- tm_section_team — Team & Collaboration | route=— | roles=0
  - tm_my_team — My Team | route=/platform/teams/my-team | roles=0
  - tm_team_directory — Team Directory | route=/platform/teams | roles=0

- tm_section_team_charter — Team Charter | route=— | roles=0
  - tm_team_charter_view — Team Charter | route=/platform/projects/__PROJECT__/team-charter | roles=0
  - tm_team_charter_edit — Edit Team Charter | route=/platform/projects/__PROJECT__/team-charter/edit | roles=0

- tm_section_timesheets — Timesheets | route=— | roles=0
  - tm_my_timesheets — My Timesheets | route=/platform/timesheets | roles=0
  - tm_log_time — Log Time | route=/platform/timesheets/new | roles=0
  - tm_team_timesheets — Team Timesheets | route=/platform/timesheets/team | roles=0
  - tm_timesheet_period_submit — Submit Week for Approval | route=/platform/timesheets/weekly | roles=0
```

### 2.3 Cross-reference against taxonomy §3

The first audit's §2 mapping table (131 rows, Reuse/Extend/New candidate/Regroup/Rename/Duplicate) was
built entirely from the `plat_sec_*` generation above and remains accurate for what it covered — it is
not repeated here. What it missed, now visible with the full inventory:

- **`platform_section_*` (10 roots, 21 nodes) is itself a complete second attempt at covering most of
  the same taxonomy leaves** the first audit already mapped — Administration, Agile (Planning Poker),
  Collaboration (Whiteboards), Dashboards (Dashboard Builder), Delivery (Recurring Tasks), Planning
  (RACI Matrix), Reporting (S-Curve, Scheduled Reports, Timesheet Approvals), Resources (Workload
  Heatmap, Skills Matrix, Training), Settings (Intake Forms, Client Portal, Notification Prefs),
  Strategy & OKRs (OKR & Goals, Portfolio Map). Every one of these routes also exists, separately
  coded, somewhere in the granted `plat_sec_*`/GAP-module tree the first audit already covered (e.g.
  `platform_raci_matrix` → `/platform/planning/raci`, same route the first audit flagged as
  "Reuse (needs menu wiring)" for RACI under Project Team). **This entire generation is therefore not
  a taxonomy gap — it is a dead, 0-grant, unwired-in duplicate of content already accounted for.**
- **`tm_section_*` (10 roots, 29 nodes) likewise re-covers Personal Workspace ground already mapped**
  under `plat_sec_personal`/`plat_sec_team_section` in the first audit (My Tasks, Daily Log, Timesheets,
  Team Charter, Plans, Reporting) — again fully dead (0 grants).
- **The 8 empty `plat_sec_*` stubs the first audit found are confirmed unchanged**:
  `plat_sec_comm_reporting`, `plat_sec_quality_testing`, `plat_sec_quality_assurance`,
  `plat_sec_approvals_reporting`, `plat_sec_reporting_controls`, `plat_sec_approvals_gov`,
  `plat_sec_email`, `plat_sec_admin` — all still 0 children. Unlike the dead 2nd/3rd-generation trees
  above, these stub roots themselves **do** carry role grants (`roles=2` to `roles=17` on the root row)
  — meaning real users see an empty, clickable, content-free sidebar heading for these today.
- **`plat_exec_dashboard`** (Executive Dashboard, `/platform/executive/dashboard`, granted to 13 roles)
  sits as a bare root with no parent and no children — confirmed orphaned exactly as the first audit
  suspected ("not found nested under any `plat_sec_*` root"). It is explicitly excluded from the PM
  sidebar by `PMO_ONLY_PM_LAYOUT_DROP_CODES` in code (treated as "org-wide executive page, not a
  PM project-scoped sidebar child" per a v827/v843 comment) — so its current orphan status in the DB
  tree is intentional, not a bug, even though it looks like one from the raw inventory alone.

### 2.4 Duplication findings (Platform)

**65 distinct route paths** (Platform scope, excluding Simulator/`sim_*`) have **2 or more differently-
coded, differently-labelled `menu_items` rows that are all currently granted to at least one role** —
i.e. genuine live duplication, not just dead orphan noise. All 65 live inside the `plat_sec_*`
generation (the `platform_section_*`/`tm_section_*` generations contribute zero to this list because
they carry no grants at all, so they can't create a *live* duplicate — see §2.3). Two clear patterns
emerge:

**Pattern A — the "role-track × methodology-track" cross the first audit already identified, now with
exact role-overlap evidence.** Worked example (Risk Register, extending the first audit's flag with
real grant data):

| menu_code | Root | Route | Roles granted (23/4/3) |
|---|---|---|---|
| `plat_pm_risk_reg` | `plat_sec_universal` (live PM tree) | `/pm/controls/risk-register` | 23 roles — broad PM/programme/portfolio manager set across all industry variants (`account_owner`, `clinical_trial_manager`, `education_programme_director`, `energy_programme_manager`, `financial_programme_manager`, `healthcare_programme_director`, …) |
| `plat_tl_controls` | `plat_sec_delivery` (Team Management track) | `/platform/risks` | 4 roles — `account_owner`, `pm_team_manager`, `pmo_admin`, `system_admin` |
| `plat_oversight_risk` | `plat_sec_project_delivery` (PMO Oversight track) | `/pmo/oversight/risk-register` | 3 roles — `account_owner`, `pmo_admin`, `system_admin` |

This is a **role-scoped variant pattern, not an accidental duplicate** — three different routes/pages
for "Risk Register," each granted to a progressively narrower admin-leaning subset. The same shape
repeats for **Issue Register** (`plat_pm_issue_log` 23 roles / `plat_oversight_issue` 3 roles),
**Change Log** (`plat_pm_change_log` 23 roles / `plat_oversight_change` 3 roles). Whether this
three-tier split is *wanted* design or accidental sprawl is exactly the "role tracks vs methodology
tracks" question the first audit already raised as its #2 "Needs user decision" — this audit confirms
it with hard grant data rather than assumption.

**Pattern B — same route, same role-track, genuinely redundant rows with near-identical grant sets**
(more likely accidental, not a deliberate scoping decision). Representative examples from the 65:

| Route | Duplicate `menu_code`s | Likely cause |
|---|---|---|
| `/platform/dashboard` | `plat_tm_dashboard`, `plat_pm_dashboard`, `plat_dashboard_pmo`, `plat_project_dashboard` | Same page, 4 different sidebar entries across Personal/Universal/Exec/Project-Delivery tracks |
| `/platform/calendar` | `plat_pm_calendar`, `plat_tm_calendar`, `plat_tm_team_calendar`, `plat_pm_leave_cal` | Same calendar page under 4 different labels |
| `/platform/daily-log/my-entries` | `plat_tm_daily_log`, `plat_tl_daily_log`, `plat_pm_daily_log`, `plat_daily_log_pmo` | Same page, 4 tracks |
| `/pm/delivery/work-packages` | `plat_tl_work_packages`, `plat_tm_s_work_packages_ro`, `plat_tm_work_packages`, `plat_pm_s_work_packages` | Same page, 4 tracks (matches first audit's flag) |
| `/platform/story-map` | `plat_pm_a_story_map`, `plat_a_story_maps`, `plat_tm_story_map_ro`, `plat_story_map_pmo` | Same page, 4 tracks |
| `/pmo/authorisation/queue` | `plat_pm_pending_approval`, `plat_lc_auth_queue`, `plat_tm_pending_appr`, `plat_p_approvals` | Same page, 4 tracks |
| `/platform/projects` | `plat_pm_my_projects`, `plat_pm_all_projects`, `plat_my_projects`, `plat_all_projects` | Two pairs (My/All) duplicated across Universal and Project-Delivery tracks |
| `/platform/product-descriptions` | `plat_tl_prod_desc`, `plat_tm_prod_desc`, `plat_pm_s_prod_desc` | 3 tracks |
| `/platform/teams` | `plat_tm_team_members`, `plat_tl_all_members`, `plat_pm_all_teams` | 3 tracks |
| `/platform/releases` | `plat_pm_a_releases`, `plat_a_releases`, `plat_releases_pmo` | 3 tracks |
| ...and 55 more (see `granted_dupes.json`-style pattern — every methodology/governance strategy page under Structured (`plat_s_*` vs `plat_pm_s_*`) appears twice: `/pm/governance/risk-strategy`, `/pm/governance/quality-strategy`, `/pm/governance/configuration-strategy`, `/pm/governance/communication-strategy`, `/pmo/mandates`, `/platform/brief`, `/pmo/initiation/business-case`, `/pm/initiation/benefits-review-plan`, `/platform/itto/templates`, plus report-type pages `/pm/reporting/exception`, `/pm/reporting/end-stage`, `/platform/structured/end-project-report` | The `plat_grp_initiation`/`plat_grp_gov_standards` (Structured, role=12-13) vs `plat_grp_pm_pre_project`/`plat_grp_pm_gov_standards`/`plat_grp_pm_del_reporting` (Structured "pm_" variant, role=18-29) pairs are near-identical parallel copies within the *same* `plat_sec_structured` root — not even a different track, just two sibling groups under one root repeating the same leaves with `plat_s_*` vs `plat_pm_s_*` naming. |

Two non-Platform items surfaced by the same overlap check are worth flagging separately as **cross-app,
not cross-track** duplication (not really Platform-internal, but found via the same route-grouping
method): `/admin/settings` is granted via both `plat_sys_platform_settings` (Platform) and
`sim_sys_platform_settings` (Simulator) — same physical `/admin/settings` route reused across both
apps' sidebars (expected, since both apps run from the same Supabase project and same admin routes);
same pattern for `/admin/pwa-settings` and `/platform/organisation/branding` (3-way: Platform, Simulator,
and `pmo-admin-branding-identity`). These are not defects — they're the same admin page correctly
surfaced from three different sidebar contexts.

---

## 3. PMO layout

### 3.1 Root inventory

**62 roots.** Two generations, same live/dead split pattern as Platform but far more skewed toward dead:

| Generation | Prefix(es) | Roots | Total nodes | Granted nodes |
|---|---|---:|---:|---:|
| Flat admin/people/comms/email leaves (all genuinely live, single-page) | `pmo-admin-*`, `pmo-people-*`, `pmo-comms-*`, `pmo-email-*`, `pmo-notification-preferences` | 30 | 30 | **30 (100%)** — each granted 3-23 roles |
| `pmo-cat-*` "rewrite" (hyphenated, matches `PMO_CATEGORY_DEFS` live category ids) | `pmo-cat-*` | 16 | 367 | **~10** (only because `plat_sec_templates` — a *Platform*-family subtree — got orphan-bucketed under `pmo-cat-project-delivery` at runtime; see §0) |
| `pmo_section_*`/`pmo_calendar`/`pmo_planning`/`pmo_admin_local_registers` ("rewrite," underscore) | `pmo_section_*`, `pmo_calendar`, `pmo_planning`, `pmo_admin_local_registers` | 16 | 36 | **1** (`pmo_admin_local_registers` root itself, 3 roles) |

Root list:

```
pmo_admin_local_registers          Manage Local Registers     children=0  totalDesc=0   [granted, roles=3]
pmo_calendar                       Calendar                   children=0  totalDesc=0   [0 grants]
pmo_planning                       PMO Planning                children=4  totalDesc=4   [0 grants]
pmo_section_authorisation          Authorisation & Lifecycle   children=6  totalDesc=6   [0 grants]
pmo_section_collaboration          Collaboration               children=3  totalDesc=3   [0 grants]
pmo_section_dashboards_analytics   Dashboards & Analytics       children=7  totalDesc=7   [0 grants]
pmo_section_email                  Email & Notifications        children=5  totalDesc=13  [0 grants]
pmo_section_knowledge              Knowledge & Assets           children=10 totalDesc=12  [0 grants]
pmo_section_reporting              Reporting & Assurance        children=4  totalDesc=4   [0 grants]
pmo_section_strategy_okr           Strategy & OKRs              children=5  totalDesc=5   [0 grants]
pmo_section_system_admin           System Administration        children=2  totalDesc=2   [0 grants]
pmo_section_workflows              Workflows & Approvals        children=4  totalDesc=4   [0 grants]
pmo-admin-branding-identity        Branding & Identity          children=0  totalDesc=0   [roles=3]
pmo-admin-budget-categories        Budget Categories            children=0  totalDesc=0   [roles=3]
pmo-admin-form-templates           Form Templates               children=0  totalDesc=0   [roles=3]
pmo-admin-funding-sources          Funding Sources               children=0  totalDesc=0   [roles=3]
pmo-admin-integrations             Integrations                  children=0  totalDesc=0   [roles=3]
pmo-admin-local-data-extensions    Local Data Extensions          children=0  totalDesc=0   [roles=3]
pmo-admin-org-settings             Organisation Settings          children=0  totalDesc=0   [roles=3]
pmo-admin-project-statuses         Project Statuses               children=0  totalDesc=0   [roles=3]
pmo-admin-project-types            Project Types                  children=0  totalDesc=0   [roles=3]
pmo-admin-role-menu-access         Role Menu Access               children=0  totalDesc=0   [roles=3]
pmo-admin-users                    User Management                 children=0  totalDesc=0   [roles=3]
pmo-cat-admin                      PMO Administration              children=29 totalDesc=40  [0 grants]
pmo-cat-agile-lean                 Agile & Lean Tools              children=0  totalDesc=0   [EMPTY STUB, 0 grants]
pmo-cat-audit-compliance           Audit Trail & Compliance        children=0  totalDesc=0   [EMPTY STUB, 0 grants]
pmo-cat-email-notifications        Email & Notifications           children=1  totalDesc=1   [0 grants]
pmo-cat-exec                       Executive Overview              children=5  totalDesc=23  [0 grants]
pmo-cat-governance-standards       Governance & Standards          children=19 totalDesc=30  [0 grants]
pmo-cat-help                       Help                            children=0  totalDesc=0   [EMPTY STUB, 0 grants]
pmo-cat-initiation                 Pre-Project Docs                children=11 totalDesc=11  [0 grants]
pmo-cat-knowledge-assets           Knowledge & Assets              children=4  totalDesc=27  [0 grants]
pmo-cat-process-templates          Process Templates               children=22 totalDesc=36  [0 grants]
pmo-cat-project-delivery           Project Delivery                children=11 totalDesc=61  [granted: only the nested plat_sec_templates subtree, ~37 nodes]
pmo-cat-reporting-intelligence      Reporting & Intelligence        children=3  totalDesc=21  [0 grants]
pmo-cat-stakeholders                Stakeholders                    children=3  totalDesc=8   [0 grants]
pmo-cat-standards_based             Process Group Forms             children=2  totalDesc=16  [0 grants]
pmo-cat-support                     Support                         children=0  totalDesc=0   [EMPTY STUB, 0 grants]
pmo-cat-system-admin                System Administration           children=1  totalDesc=1   [0 grants]
pmo-cat-teams                       People & Resources              children=4  totalDesc=27  [0 grants]
pmo-cat-workflows-approvals         Workflows & Approvals           children=3  totalDesc=9   [0 grants except 1 leaf]
pmo-comms-direct                    Direct Messages                 children=0  totalDesc=0   [roles=3]
pmo-comms-meetings                  Meetings                        children=0  totalDesc=0   [roles=3]
pmo-comms-messages                  Messages                        children=0  totalDesc=0   [roles=3]
pmo-comms-pending-ai                Pending AI Reviews              children=0  totalDesc=0   [roles=3]
pmo-email-invitation-expiry         Invitation Expiry               children=0  totalDesc=0   [roles=3]
pmo-email-invitation-templates      Invitation Templates            children=0  totalDesc=0   [roles=3]
pmo-email-sender-profiles           Sender Profiles                  children=0  totalDesc=0   [roles=3]
pmo-email-settings                  Email Settings                   children=0  totalDesc=0   [roles=3]
pmo-notification-preferences        Notification Preferences         children=0  totalDesc=0   [roles=3]
pmo-people-add-users                 Add Users                        children=0  totalDesc=0   [roles=3]
pmo-people-appointment-tracker       Appointment Tracker              children=0  totalDesc=0   [roles=3]
pmo-people-assign-roles              Assign Roles                     children=0  totalDesc=0   [roles=3]
pmo-people-assignment-settings       Assignment Settings              children=0  totalDesc=0   [roles=3]
pmo-people-invitation-tracker        Invitation Tracker               children=0  totalDesc=0   [roles=3]
pmo-people-manage-menu-bundles       Manage Menu Bundles              children=0  totalDesc=0   [roles=7]
pmo-people-manage-roles              Manage Roles                     children=0  totalDesc=0   [roles=23]
pmo-people-manager-assignments       Manager Assignments              children=0  totalDesc=0   [roles=3]
pmo-people-organisation-industries   Industries & Capabilities         children=0  totalDesc=0   [roles=7]
pmo-people-resource-directory        Resource Directory                children=0  totalDesc=0   [roles=3]
pmo-people-send-invites              Send Invitations                  children=0  totalDesc=0   [roles=3]
pmo-people-team-capacity             Team Capacity                     children=0  totalDesc=0   [roles=3]
```

### 3.2 Full tree dump

```
- pmo_admin_local_registers — Manage Local Registers | route=/platform/pmo-admin/local-registers | roles=3

- pmo_calendar — Calendar | route=/pmo/calendar | roles=0

- pmo_planning — PMO Planning | route=— | roles=0
  - pmo_planning_hub — Planning Hub | route=/pmo/planning | roles=0
  - pmo_portfolio_collisions — Portfolio Collisions | route=/pmo/planning/collisions | roles=0
  - pmo_intel_rules — Intelligence Rules | route=/pmo/planning/intelligence | roles=0
  - pmo_governance_config — Governance Rules Config | route=/pmo/planning/governance-config | roles=0

- pmo_section_authorisation — Authorisation & Lifecycle | route=— | roles=0
  - pmo_auth_queue — Authorisation Queue | route=/pmo/authorisation/queue | roles=0
  - pmo_auth_dashboard — Lifecycle Dashboard | route=/pmo/authorisation/dashboard | roles=0
  - pmo_auth_configure — Configure Lifecycle Rules | route=/pmo/authorisation/configure | roles=0
  - pmo_auth_chains — Approval Chains | route=/pmo/authorisation/chains | roles=0
  - pmo_auth_archive_retention — Archive Retention Rules | route=/pmo/authorisation/archive-retention | roles=0
  - pmo_auth_archive_vault — Archive Vault | route=/pmo/authorisation/archive | roles=0

- pmo_section_collaboration — Collaboration | route=— | roles=0
  - pmo_planning_poker — Planning Poker Sessions | route=/pmo/planning/planning-poker | roles=0
  - pmo_whiteboards — Whiteboards | route=/pmo/collaboration/whiteboard | roles=0
  - pmo_whiteboard_new — New Whiteboard | route=/pmo/collaboration/whiteboards/new | roles=0

- pmo_section_dashboards_analytics — Dashboards & Analytics | route=— | roles=0
  - pmo_s_curve — S-Curve Analysis | route=/pmo/planning/s-curve | roles=0
  - pmo_baseline_compare — Baseline Comparison | route=/pmo/reporting/baseline | roles=0
  - pmo_planning_s_curve — S-Curve & Baselines | route=/pmo/planning/s-curve | roles=0
  - pmo_my_dashboards — My Dashboards | route=/pmo/dashboards | roles=0
  - pmo_dashboard_builder — Dashboard Builder | route=/pmo/dashboards/builder | roles=0
  - pmo_scheduled_reports — Scheduled Reports | route=/pmo/reporting/scheduled | roles=0
  - pmo_whiteboard — Whiteboard | route=/pmo/collaboration/whiteboard | roles=0

- pmo_section_email — Email & Notifications | route=— | roles=0
  - pmo_email_settings — Email Settings | route=/platform/admin/email-settings | roles=0
  - pmo_email_sender_profiles — Sender Profiles | route=/platform/admin/email-sender-profiles | roles=0
  - pmo_email_invitation_templates — Invitation Templates | route=/app/settings/invitation-templates | roles=0
  - pmo_email_invitation_expiry — Invitation Expiry | route=/platform/admin/invitation-settings | roles=0
  - pmo_comms_section — Communications | route=— | roles=0
    - comms_messages — Messages | route=/platform/comms/messages | roles=0
    - pmo_comms_messages — Messages | route=/platform/comms/messages | roles=0        [exact dupe pair]
    - comms_direct — Direct Messages | route=/platform/comms/direct | roles=0
    - pmo_comms_direct — Direct Messages | route=/platform/comms/direct | roles=0      [exact dupe pair]
    - comms_meetings — Meetings | route=/platform/comms/meetings | roles=0
    - pmo_comms_meetings — Meetings | route=/platform/comms/meetings | roles=0         [exact dupe pair]
    - pmo_notification_preferences — Notification Preferences | route=/pmo/settings/notifications | roles=0
    - pmo_notification_prefs — Notification Preferences | route=/pmo/settings/notifications | roles=0  [exact dupe pair]

- pmo_section_knowledge — Knowledge & Assets | route=— | roles=0
  - pmo_knowledge_hub — Org Knowledge Hub | route=/platform/org-knowledge | roles=0
  - pmo_knowledge_opa — Process Assets | route=/platform/opa | roles=0
  - pmo_knowledge_opa_new — Add OPA | route=/platform/opa/new | roles=0
  - pmo_knowledge_opa_drafts — OPA Drafts | route=/platform/opa/on-hold | roles=0
  - org_knowledge_opa — Process Assets | route=/platform/opa | roles=0                  [dupe of pmo_knowledge_opa]
  - pmo_knowledge_opa_bulk — OPA Bulk upload | route=/platform/opa/bulk-upload | roles=0
  - org_knowledge_opa_new — Add OPA | route=/platform/opa/new | roles=0                 [dupe]
  - org_knowledge_opa_drafts — OPA Drafts | route=/platform/opa/on-hold | roles=0       [dupe]
  - org_knowledge_opa_bulk — OPA Bulk upload | route=/platform/opa/bulk-upload | roles=0 [dupe]
  - org_knowledge — Org Knowledge | route=/platform/org-knowledge | roles=0             [dupe of pmo_knowledge_hub]
    - pm_opa_templates_browse — Browse OPA Templates | route=/platform/opa?type=template | roles=0
    - pm_project_opa_templates — My Project Templates | route=/platform/projects/:id/opa-templates | roles=0

- pmo_section_reporting — Reporting & Assurance | route=— | roles=0
  - agile_sprint_metrics — Sprint Metrics | route=/projects/:projectId/scrum/metrics | roles=0
  - pm_closure_lessons_report — Lessons Report | route=/pm/closure/lessons-report | roles=0
  - pmo_report_lessons — Lessons Report | route=/pm/closure/lessons-report | roles=0     [dupe]
  - pmo_report_sprint_metrics — Sprint Metrics | route=/platform/projects/:projectId/scrum/metrics | roles=0

- pmo_section_strategy_okr — Strategy & OKRs | route=— | roles=0
  - pmo_okr_dashboard — OKR Dashboard | route=/pmo/okr | roles=0
  - pmo_okr_objectives — Objectives & KRs | route=/pmo/okr/objectives | roles=0
  - pmo_okr_alignment — Alignment Map | route=/pmo/okr/alignment | roles=0
  - pmo_okr_checkins — OKR Check-ins | route=/pmo/okr/checkins | roles=0
  - pmo_portfolio_map — Strategic Portfolio Map | route=/pmo/strategy/portfolio-map | roles=0

- pmo_section_system_admin — System Administration | route=— | roles=0
  - pmo_sys_platform_settings — Platform Settings | route=/platform/settings | roles=0
  - pmo_sys_pwa_settings — PWA Settings | route=/platform/pwa-settings | roles=0

- pmo_section_workflows — Workflows & Approvals | route=— | roles=0
  - pmo_workflows_mandate_pending — Mandate Pending Approvals | route=/platform/mandates/approvals | roles=0
  - pmo_admin_briefs_pending_approvals — Pending Approvals | route=/platform/briefs/approvals | roles=0
  - pmo_workflows_brief_pending — Brief Pending Approvals | route=/platform/briefs/approvals | roles=0  [dupe of above]
  - pmo_admin_mandates_pending_approvals — Pending Approvals | route=/platform/mandates/approvals | roles=0  [dupe of mandate_pending]

- pmo-admin-branding-identity — Branding & Identity | route=/platform/organisation/branding | roles=3
- pmo-admin-budget-categories — Budget Categories | route=/platform/pmo-admin/budget-categories | roles=3
- pmo-admin-form-templates — Form Templates | route=/platform/admin/form-templates | roles=3
- pmo-admin-funding-sources — Funding Sources | route=/platform/pmo-admin/funding-sources | roles=3
- pmo-admin-integrations — Integrations | route=/pmo/admin/integrations | roles=3
- pmo-admin-local-data-extensions — Local Data Extensions | route=/app/local-data-extensions | roles=3
- pmo-admin-org-settings — Organisation Settings | route=/platform/pmo-admin/settings | roles=3
- pmo-admin-project-statuses — Project Statuses | route=/platform/pmo-admin/project-statuses | roles=3
- pmo-admin-project-types — Project Types | route=/platform/pmo-admin/project-types | roles=3
- pmo-admin-role-menu-access — Role Menu Access | route=/platform/pmo/role-menu-access | roles=3
- pmo-admin-users — User Management | route=/platform/pmo-admin/users | roles=3

- pmo-cat-admin — PMO Administration | route=— | roles=0
  - local_data_extensions — Local Data Extensions | route=/app/local-data-extensions | roles=0
    - lde_field_definitions — Field Definitions | route=/app/local-data-extensions/field-definitions | roles=0
    - lde_field_groups — Field Groups | route=/app/local-data-extensions/field-groups | roles=0
    - lde_screen_mapping — Screen Mapping | route=/app/local-data-extensions/screen-mapping | roles=0
    - lde_validation_rules — Validation Rules | route=/app/local-data-extensions/validation-rules | roles=0
    - lde_field_permissions — Field Permissions | route=/app/local-data-extensions/field-permissions | roles=0
    - lde_audit_history — Audit History | route=/app/local-data-extensions/audit-history | roles=0
  - pmo_admin_form_templates — Form Templates | route=/platform/admin/form-templates | roles=0
  - pmo_automations_rules — Automation Rules | route=/pmo/admin/automations | roles=0
  - pmo_admin_add_project_users — Add users to project | route=/app/project-users | roles=0
  - pmo_admin_org_settings — Organisation Settings | route=/platform/pmo-admin/settings | roles=0
  - pmo_automations_templates — Automation Templates | route=/pmo/admin/automations/templates | roles=0
  - pmo_admin_users — User Management | route=/platform/pmo-admin/users | roles=0
  - pmo_custom_fields — Custom Fields | route=/pmo/admin/custom-fields | roles=0
  - pmo_admin_project_statuses — Project Statuses | route=/platform/pmo-admin/project-statuses | roles=0
  - pmo_intake_forms — Public Intake Forms | route=/pmo/admin/intake-forms | roles=0
  - pmo_role_menu_access — Role Menu Access | route=/platform/pmo/role-menu-access | roles=0
  - pmo_admin_project_types — Project Types | route=/platform/pmo-admin/project-types | roles=0
  - pmo_client_portals — Client Portals | route=/pmo/admin/client-portals | roles=0
  - pmo_guest_access — Guest Access | route=/pmo/admin/guest-access | roles=0
  - pmo_admin_funding_sources — Funding Sources | route=/platform/pmo-admin/funding-sources | roles=0
  - pmo_project_clone — Project Cloning | route=/pmo/admin/project-clone | roles=0
  - pmo_admin_ppd_section — Project Product Descriptions | route=— | roles=0
    - pmo_admin_ppd_all — All PPDs | route=/app/ppd/list | roles=0
  - pmo_admin_subscription — Subscription | route=/platform/pmo-admin/subscription | roles=0
  - pmo_admin_branding — Branding | route=/platform/pmo-admin/branding | roles=0
  - pmo_admin_branding_identity — Branding & Identity | route=/platform/organisation/branding | roles=0
  - pmo_admin_branding_history — Branding History | route=/platform/organisation/branding-history | roles=0
  - pmo_admin_integrations — Integrations Hub | route=/pmo/admin/integrations | roles=0
  - pmo_integrations_hub — Integrations Hub | route=/pmo/admin/integrations | roles=0   [dupe of above]
  - pmo_admin_invitation_tracker — Invitation Tracker | route=/platform/admin/invitation-tracker | roles=0
  - pmo_admin_appointment_tracker — Appointment Tracker | route=/platform/pmo-admin/appointments | roles=0
  - pmo_manager_assignments — Manager Assignments | route=— | roles=0
    - pmo_assign_managers — Assign Managers | route=/platform/pmo-admin/manager-assignments | roles=0
    - pmo_assignment_settings — Assignment Settings | route=/platform/pmo-admin/manager-assignment-settings | roles=0
  - pmo_admin_budget_categories — Budget Categories | route=/platform/pmo-admin/budget-categories | roles=0
  - pmo_admin_lifecycle_templates — Lifecycle Templates | route=/platform/pmo-admin/lifecycle-templates | roles=0
  - pm_section_integrations — Integrations | route=— | roles=0
    - pm_integrations_marketplace — Integration Marketplace | route=/pm/integrations | roles=0
    - pm_integrations_connections — My Connections | route=/pm/integrations/connections | roles=0

- pmo-cat-agile-lean — Agile & Lean Tools | route=— | roles=0
- pmo-cat-audit-compliance — Audit Trail & Compliance | route=— | roles=0

- pmo-cat-email-notifications — Email & Notifications | route=— | roles=0
  - pm_notification_preferences — Notification Preferences | route=/pm/settings/notifications | roles=0

- pmo-cat-exec — Executive Overview | route=— | roles=0
  - dashboard — Dashboard | route=/platform/dashboard | roles=0    [dead twin of plat_dashboard_pmo/plat_pm_dashboard, which ARE granted]
  - portfolio — Portfolio | route=/platform/portfolio | roles=0
    - portfolio_all / portfolio_dashboard / portfolio_projects / portfolio_resources / portfolio_financial / portfolio_reports / portfolio_governance — all roles=0
  - programme — Programme | route=/platform/programme | roles=0
    - programme_all / programme_dashboard / programme_projects / programme_dependencies / programme_benefits / programme_timeline / programme_reports — all roles=0
  - tm_section_dashboard — Dashboard | route=/platform/dashboard | roles=0   [another dead twin]
  - benefits — Benefits | route=/platform/benefits | roles=0
    - benefits_all / benefits_register / benefits_measurements / benefits_realization — all roles=0

- pmo-cat-governance-standards — Governance & Standards | route=— | roles=0
  - org_knowledge_eef, pmo_admin_mandates_create, org_knowledge_eef_new, pmo_admin_mandates_all,
    pmo_gov_mandate_approval, org_knowledge_eef_drafts, pmo_admin_mandates_unlinked,
    pmo_gov_communication_strategy, pmo_gov_configuration_strategy, pmo_admin_mandates_section,
    pmo_gov_quality_strategy, pmo_gov_risk_strategy, pmo_gov_itto_templates, pmo_gov_itto_drafts,
    pmo_gov_eef_list, pmo_gov_eef_new, pmo_gov_eef_drafts — all roles=0
  - pm_governance — Governance Reference | route=— | roles=0
    - pm_gov_mandate, pm_gov_communication_strategy, pm_gov_configuration_strategy,
      pm_gov_quality_strategy, pm_gov_risk_strategy — all roles=0
  - pm_section_governance_baselines — Governance Baselines | route=— | roles=0
    - pm_gov_baseline_comms_strategy, pm_gov_baseline_config_strategy, pm_gov_baseline_quality_strategy,
      pm_gov_baseline_risk_strategy, pm_gov_baseline_itto_templates, pm_gov_baseline_mandate — all roles=0
      [this entire subtree duplicates pm_governance immediately above, which duplicates the
       already-granted plat_grp_gov_standards/plat_grp_pm_gov_standards under Platform's
       plat_sec_structured/plat_sec_universal — i.e. a THIRD copy of the same 5 strategy pages]

- pmo-cat-help — Help | route=— | roles=0

- pmo-cat-initiation — Pre-Project Docs | route=— | roles=0
  - pmo_gov_mandate, pmo_init_project_mandate — [dupe pair] both /platform/mandates/list
  - pm_init_business_case — /pm/initiation/business-case
  - pmo_admin_briefs_all — /platform/briefs/list
  - pmo_init_business_case — /pmo/initiation/business-case          [dupe concept of pm_init_business_case, different route]
  - pm_init_project_brief — /pm/initiation/project-brief
  - pmo_init_project_brief — /pmo/initiation/project-brief           [dupe concept, different route]
  - pm_init_pid — /pm/initiation/pid
  - pmo_init_benefits_review_plan / pm_init_benefits_review_plan     [dupe pair, both benefits review plan]
  - pmo_admin_briefs_section — Project Briefs | route=— | roles=0
  (all roles=0)

- pmo-cat-knowledge-assets — Knowledge & Assets | route=— | roles=0
  - platform_section_procurement — Procurement | route=— | roles=0
    - platform_procurement — Procurement | route=/platform/procurement | roles=0
  - pmo_section_procurement_mgmt — Procurement Management | route=— | roles=0
    - pmo_procurement_vendors / pmo_vendor_register           [exact dupe pair — /pmo/procurement/vendors]
    - pmo_procurement_requests / pmo_purchase_requests         [exact dupe pair — /pmo/procurement/requests]
    - pmo_procurement_orders / pmo_purchase_orders              [exact dupe pair — /pmo/procurement/orders]
    - pmo_contracts / pmo_procurement_contracts                 [exact dupe pair — /pmo/procurement/contracts]
    - pmo_invoice_tracking / pmo_procurement_invoices            [exact dupe pair — /pmo/procurement/invoices]
  - pm_section_procurement — Procurement & Contracts | route=— | roles=0
    - pm_procurement_plan, pm_vendor_register, pm_purchase_requests, pm_purchase_orders, pm_contracts,
      pm_invoice_tracking — a THIRD full copy of the same procurement register set, on /pm/procurement/*
  - pm_section_knowledge_resources — Knowledge & Resources | route=— | roles=0
    - pm_template_library, pm_resource_directory, pm_skill_matrix, pm_ai_assistant,
      pm_industry_templates_browse, pm_industry_plan — all roles=0

- pmo-cat-process-templates — Process Templates | route=— | roles=0
  - pm_pt_hub / pmo_pt_hub                    [dupe pair]
  - pm_pt_pre / pmo_pt_pre                     [dupe pair]
  - pm_pt_init / pmo_pt_init                    [dupe pair]
  - pm_pt_plan / pmo_pt_plan                     [dupe pair]
  - pm_pt_exec / pmo_pt_exec                      [dupe pair]
  - pm_pt_mon / pmo_pt_mon                         [dupe pair]
  - pm_pt_close / pmo_pt_close                      [dupe pair]
  - pmo_pt_browse, pmo_pt_manage, pmo_pt_new — all roles=0
  - pmo_pt_agile_section — Agile | route=— | roles=0
    - pmo_pt_product_backlog, pmo_pt_sprint_planning, pmo_pt_agile, pmo_pt_story_map,
      pmo_pt_sprint_metrics, pmo_pt_releases, pmo_pt_roadmap — all roles=0
  - pmo_industry_templates, pmo_industry_templates_new, pmo_industry_templates_on_hold — all roles=0
  - tm_section_process_templates — Process Templates | route=— | roles=0
    - tm_pt_all, tm_pt_pre, tm_pt_init, tm_pt_plan, tm_pt_exec, tm_pt_mon, tm_pt_close
      [THIRD copy of the same 7 process-group stages, /pm/process-templates/*]

- pmo-cat-project-delivery — Project Delivery | route=— | roles=0
  - projects — Projects | route=/platform/projects | roles=0
    - projects_all, projects_my, projects_new, projects_archived, projects_templates,
      projects_manage_members, projects_stakeholders, projects_invitation_templates — all roles=0
  - pmo_delivery_story_map — roles=0
  - pmo_oversight — Project Oversight | route=— | roles=0
    - pmo_oversight_risk, pmo_oversight_issue, pmo_oversight_quality, pmo_oversight_lessons — roles=0
  - tm_section_my_projects — My Projects | route=— | roles=0
    - tm_projects_list, tm_project_members — roles=0
  - plat_sec_templates — Templates | route=— | roles=22   [GRANTED — orphan-bucketed from Platform family; see §0/§3.1]
    - plat_tpl_library (22) → Template Library, plat_tpl_organisational (12) → Organisational Templates
      + full portfolio/programme/project × structured/standards_based/agile matrix (9 leaves, roles=12 each)
    - plat_tpl_signatory_requirements (22), plat_pmo_document_oversight (3), plat_pmo_field_templates (22)
  - pmo_section_oversight — Project Oversight | route=— | roles=0   [DUPLICATE of pmo_oversight above, different codes, same 9 concepts incl. Delay/Scope/Schedule/Change]
    - pmo_oversight_risk_register, pmo_oversight_issue_register, pmo_oversight_quality_register,
      pmo_oversight_lessons_log, pmo_oversight_delays, pmo_oversight_delay_templates,
      pmo_oversight_scope, pmo_oversight_schedules, pmo_oversight_changes — all roles=0
  - platform_forms — Forms & Documents | roles=0
  - platform_section_projects — Projects | route=— | roles=0
    - platform_clone_project — roles=0
  - pm_section_dashboard — Project Dashboard | route=— | roles=0
    - pm_project_dashboard — roles=0
  - pm_section_my_projects — My Projects | route=— | roles=0    [THIRD copy of "My Projects/Create/On Hold/Archived"]
    - pm_my_projects, pm_create_project, pm_on_hold_projects, pm_archived_projects — roles=0
  - platform_my_work_drafts — roles=0

- pmo-cat-reporting-intelligence — Reporting & Intelligence | route=— | roles=0
  - reports — Reports & Analytics | route=/platform/reports | roles=0
    - reports_builder, reports_dashboard, reports_analytics, reports_projects, reports_kpis,
      reports_resources, reports_project_health, reports_scheduled, reports_time, reports_budget,
      reports_portfolio_analytics, reports_templates, reports_custom, reports_trends,
      report_highlight_pmo, report_exception_pmo, report_end_stage_pmo, report_end_project_pmo — roles=0
  - pmo_expense_thresholds — roles=0
  - platform_reporting — roles=0

- pmo-cat-stakeholders — Stakeholders | route=— | roles=0
  - stakeholders — /platform/stakeholders — roles=0
  - tm_section_stakeholders — Stakeholders | route=— | roles=0
    - tm_stakeholder_register, tm_stakeholder_analysis — roles=0
  - pm_section_stakeholders — Stakeholders | route=— | roles=0    [dupe of tm_section_stakeholders]
    - pm_stakeholders_register, pm_stakeholders_engagement, pm_stakeholders_comms_plans — roles=0

- pmo-cat-standards_based — Process Group Forms | route=— | roles=0
  - tm_section_forms — Process Group Forms | route=— | roles=0
    - tm_form_initiating, tm_form_planning, tm_form_executing, tm_form_monitoring, tm_form_closing,
      tm_draft_forms — roles=0
  - pm_section_process_forms — Process Group Forms | route=— | roles=0   [dupe of tm_section_forms]
    - pm_forms_initiating, pm_forms_planning, pm_forms_executing, pm_forms_monitoring, pm_forms_closing,
      pm_forms_agile, pm_forms_drafts, pm_forms_pending_approvals — roles=0

- pmo-cat-support — Support | route=— | roles=0

- pmo-cat-system-admin — System Administration | route=— | roles=0
  - tm_section_settings — Profile / Settings | route=/platform/settings | roles=0

- pmo-cat-teams — People & Resources | route=— | roles=0
  - pmo_admin_assign_roles — roles=0
  - teams — Teams | route=/platform/teams | roles=0
    - teams_all, teams_my, teams_directory, teams_workload, teams_my_team — roles=0
  - pm_platform_teams_section — Teams | route=— | roles=0    [dupe of "teams" above]
    - pm_teams_manage_members, pm_teams_send_role_invitations, pm_send_role_invitation,
      pm_invitation_tracker, pm_teams_my_appointments, pm_teams_my_team — roles=0
  - platform_teams — Teams | route=— | roles=0    [THIRD copy — near-complete superset of both above]
    - platform_teams_manager_assignments, platform_teams_assignment_settings, platform_teams_assign_roles,
      platform_teams_add_users, platform_teams_send_invites, platform_teams_invitation_tracker,
      platform_teams_appointment_tracker, platform_teams_all, platform_teams_my, platform_teams_directory,
      platform_teams_workload, platform_teams_my_team — roles=0

- pmo-cat-workflows-approvals — Workflows & Approvals | route=— | roles=0
  - platform_work_authorisation, platform_work_authorisation_drafts — roles=0
  - pmo_section_resources_capacity — Resources & Capacity | route=— | roles=0
    - pmo_workload_heatmap, pmo_raci_all_projects, pmo_skills_matrix, pmo_timesheet_approvals,
      pmo_training_certifications — roles=0
    - pmo_timesheet_approval_settings — roles=5 (the ONE granted leaf in this entire subtree)

- pmo-comms-direct — Direct Messages | route=/platform/comms/direct | roles=3
- pmo-comms-meetings — Meetings | route=/platform/comms/meetings | roles=3
- pmo-comms-messages — Messages | route=/platform/comms/messages | roles=3
- pmo-comms-pending-ai — Pending AI Reviews | route=/platform/comms/pending-review | roles=3
- pmo-email-invitation-expiry — Invitation Expiry | route=/platform/admin/invitation-settings | roles=3
- pmo-email-invitation-templates — Invitation Templates | route=/app/settings/invitation-templates | roles=3
- pmo-email-sender-profiles — Sender Profiles | route=/platform/admin/email-sender-profiles | roles=3
- pmo-email-settings — Email Settings | route=/platform/admin/email-settings | roles=3
- pmo-notification-preferences — Notification Preferences | route=/platform/settings/notifications | roles=3
- pmo-people-add-users — Add Users | route=/platform/project-members | roles=3
- pmo-people-appointment-tracker — Appointment Tracker | route=/platform/pmo-admin/appointments | roles=3
- pmo-people-assign-roles — Assign Roles | route=/platform/admin/assign-roles-to-projects | roles=3
- pmo-people-assignment-settings — Assignment Settings | route=/platform/pmo-admin/manager-assignment-settings | roles=3
- pmo-people-invitation-tracker — Invitation Tracker | route=/platform/admin/invitation-tracker | roles=3
- pmo-people-manage-menu-bundles — Manage Menu Bundles | route=/platform/admin/manage-menu-bundles | roles=7
- pmo-people-manage-roles — Manage Roles | route=/platform/admin/manage-roles | roles=23
- pmo-people-manager-assignments — Manager Assignments | route=/platform/pmo-admin/manager-assignments | roles=3
- pmo-people-organisation-industries — Industries & Capabilities | route=/platform/admin/organisation-industries | roles=7
- pmo-people-resource-directory — Resource Directory | route=/platform/teams/directory | roles=3
- pmo-people-send-invites — Send Invitations | route=/platform/admin/send-role-invites | roles=3
- pmo-people-team-capacity — Team Capacity | route=/platform/teams/capacity | roles=3
```

### 3.3 Cross-reference against taxonomy §3

The first audit did not examine any `pmo_section_*`/`pmo-cat-*` row at all. Reading the tree above
against taxonomy §3:

- **Almost every taxonomy leaf the `pmo-cat-*` tree "covers" is a dead (0-grant) triplicate of a leaf
  already granted elsewhere** — Risk/Issue/Quality/Lessons/Delay/Scope/Schedule/Change Registers appear
  granted via `plat_oversight_*` (Platform §2, 3 roles) and again, un-granted, via BOTH `pmo_oversight`
  and `pmo_section_oversight` here (two dead copies of the same 4-9 registers). Procurement appears
  granted nowhere in this family (it's dead in all three of `platform_section_procurement`,
  `pmo_section_procurement_mgmt`, `pm_section_procurement` — matching the first audit's finding that
  Procurement/GAP-12 has "zero actual route wiring," now confirmed at the menu layer too: even if the
  pages existed, no menu row currently grants access to them).
- **The one genuinely useful discovery for taxonomy coverage**: `plat_sec_templates` (Template Library /
  Organisational Templates, portfolio/programme/project × 3-methodology matrix, granted 12-22 roles) —
  this is a *real, live, well-built* Documents > Templates implementation that the first audit's
  `plat_sec_*`-only view never saw, because it's parented under `pmo-cat-project-delivery`, not under
  any `plat_sec_*` root. This closes the first audit's "Templates: Reuse" row with a much richer
  concrete answer (methodology-aware template tiers) than what was visible before.
- **Governance & Standards / Process Templates / Stakeholders / People & Resources leaves are each
  triplicated 2-3× within this one family alone** (see the inline `[dupe]`/`[THIRD copy]` annotations
  in §3.2) — none of taxonomy §3's "Governance" or "Project Team" leaves are actually *missing* here;
  they are massively over-represented by dead rows.

### 3.4 Duplication findings (PMO)

Because 87% of this family's nodes carry zero grants, the "same roles vs different roles" test the
brief asks for is trivial for most pairs (both sides are the empty set — no role sees either copy, so
there's no *live* conflict to resolve; the fix is deletion, not role reconciliation). The useful
distinctions here are:

1. **Exact same-parent duplicate rows** (identical route, identical/near-identical label, sitting as
   *siblings under the same parent*) — the clearest "just delete one" candidates, no design judgement
   needed: the 4 pairs under `pmo_section_email` → `pmo_comms_section` (Messages/Direct/Meetings/
   Notification Prefs each appearing twice), the 5 pairs under `pmo_section_knowledge` (OPA
   hub/new/drafts/bulk each appearing twice, `pmo-`-prefixed vs `org_knowledge_`-prefixed), the 5
   pairs under `pmo_section_procurement_mgmt` (Vendors/Requests/Orders/Contracts/Invoices each
   appearing twice), the 7 pairs under `pmo-cat-process-templates` (`pm_pt_*` vs `pmo_pt_*` for each
   of the 7 process-group stages), and the mandate/brief approval pairs under `pmo_section_workflows`.
2. **Cross-subtree triplicates** (same concept, 2-3 different *parent groups* within this one PMO
   family, all still 0-granted) — Project Oversight registers (`pmo_oversight` vs
   `pmo_section_oversight`), Teams (`teams` vs `pm_platform_teams_section` vs `platform_teams`, the
   third being a near-complete superset of the first two), My Projects (`projects` vs
   `pm_section_my_projects`), Process Group Forms (`tm_section_forms` vs `pm_section_process_forms`),
   Stakeholders (`tm_section_stakeholders` vs `pm_section_stakeholders`), Governance strategy pages
   (`pmo-cat-governance-standards`'s own flat list vs its nested `pm_governance` vs its nested
   `pm_section_governance_baselines` — three copies of the same 5 strategy pages within one root).
3. **The single cross-generation case where a duplicate DOES have a live counterpart** — `dashboard`
   and `tm_section_dashboard` (both 0-granted, both `/platform/dashboard`) sitting inside
   `pmo-cat-exec` are dead duplicates of the genuinely-granted `plat_dashboard_pmo` (Platform
   `plat_sec_exec_overview`, 12 roles) and `plat_pm_dashboard` (Platform `plat_sec_universal`, 33
   roles) — i.e. the live Dashboard entry already exists in the Platform family; these two PMO-family
   rows are pure dead weight, not a role-scoping question.

No case was found in this family where two differently-coded PMO rows for the same concept both carry
**non-empty, non-identical** role grants (the pattern that would signal a genuine, deliberate
role-scoping split worth preserving) — every live/dead pair here resolves to "one side is real, the
other is abandoned," not "both sides serve different audiences." That's a materially different
situation from Platform's §2.4 Pattern A, where the split IS real and does need a design decision
rather than a straight deletion.

---

## 4. PM layout

### 4.1 Root inventory

**24 roots, 144 total nodes.** This is the most extreme case: **only 2 of 144 nodes carry any role
grant** (`pm_project_calendar` and `pm_project_calendar_exceptions`, both under `pm_planning_section` →
`pm_schedule_group`, each granted 4 roles — the same 4 as `plat_sec_delivery`'s Team Management track:
`account_owner`, `pm_team_manager`, `pmo_admin`, `system_admin`). Every other row across all 24 roots —
Dashboard, Controls & Registers (Risk/Issue/Quality/Configuration/Lessons), Delays, Delivery
Management, Financial Management, ITTO, the entire Planning section (Plans/Scope/Schedule/Resource/
Advanced Planning groups), Reporting, Automation, Collaboration, Dashboards & Analytics, Delivery
Controls, Initiation Documents, Planning Tools, Project Settings, Quality & Testing, Reporting,
Resources Hub, Strategy & OKRs, Tasks — is **completely unreachable by any role in the system**.

```
pm_calendar                    Calendar                       children=0  totalDesc=0    [0 grants]
pm_closure                     Project Closure                children=1  totalDesc=1    [0 grants]
pm_comms_section                Communications & Meetings      children=7  totalDesc=7    [0 grants]
pm_controls                     Controls & Registers           children=5  totalDesc=5    [0 grants]
pm_dashboard                    Dashboard                      children=0  totalDesc=0    [0 grants]
pm_delays                       Delays                         children=2  totalDesc=2    [0 grants]
pm_delivery                     Delivery Management            children=1  totalDesc=1    [0 grants]
pm_financial                    Financial Management            children=4  totalDesc=4    [0 grants]
pm_initiation                   Business Justification          children=0  totalDesc=0    [EMPTY STUB, 0 grants]
pm_itto                         ITTO Management                  children=3  totalDesc=3    [0 grants]
pm_planning_section              Project Planning                 children=5  totalDesc=33   [2 grants, both calendar leaves]
pm_reporting                     Reporting                        children=5  totalDesc=5    [0 grants]
pm_section_automations           Automation                       children=3  totalDesc=3    [0 grants]
pm_section_collaboration         Collaboration                    children=2  totalDesc=2    [0 grants]
pm_section_dashboards_analytics  Dashboards & Analytics            children=4  totalDesc=4    [0 grants]
pm_section_delivery_controls     Delivery Controls                 children=11 totalDesc=11   [0 grants]
pm_section_initiation_docs       Initiation Documents              children=3  totalDesc=3    [0 grants]
pm_section_planning_tools        Planning Tools                     children=3  totalDesc=3    [0 grants]
pm_section_project_settings      Project Settings                   children=7  totalDesc=7    [0 grants]
pm_section_quality_testing       Quality & Testing                   children=7  totalDesc=7    [0 grants]
pm_section_reporting             Reporting                           children=7  totalDesc=7    [0 grants]
pm_section_resources_hub         Resources Hub                       children=5  totalDesc=5    [0 grants]
pm_section_strategy_okr          Strategy & OKRs                     children=4  totalDesc=4    [0 grants]
pm_section_tasks                 Tasks                                children=3  totalDesc=3    [0 grants]
```

### 4.2 Full tree dump

```
- pm_calendar — Calendar | route=/pm/calendar | roles=0

- pm_closure — Project Closure | route=— | roles=0
  - pm_closure_end_project_report — End Project Report | route=/pm/closure/end-project-report | roles=0

- pm_comms_section — Communications & Meetings | route=— | roles=0
  - pm_comms_hub — Comms Hub | route=/platform/comms | roles=0
  - pm_comms_schedule_meeting — Schedule Meeting | route=/platform/comms/meetings/new | roles=0
  - pm_comms_meetings — My Meetings | route=/platform/comms/meetings | roles=0
  - pm_comms_summaries — Meeting Summaries | route=/platform/comms/meetings/summaries | roles=0
  - pm_comms_direct — Direct Messages | route=/platform/comms/direct | roles=0
  - pm_comms_channels — Channel Messages | route=/platform/comms/messages | roles=0
  - pm_comms_pending_review — Pending AI Reviews | route=/platform/comms/pending-review | roles=0

- pm_controls — Controls & Registers | route=— | roles=0
  - pm_controls_risk_register — Risk Register | route=/pm/controls/risk-register | roles=0
  - pm_controls_issue_register — Issue Register | route=/pm/controls/issue-register | roles=0
  - pm_controls_quality_register — Quality Register | route=/pm/controls/quality-register | roles=0
  - pm_controls_configuration_items — Configuration Item Records | route=/pm/controls/configuration-items | roles=0
  - pm_controls_lessons_log — Lessons Log | route=/pm/controls/lessons-log | roles=0

- pm_dashboard — Dashboard | route=/pm/dashboard | roles=0

- pm_delays — Delays | route=— | roles=0
  - pm_delay_register — Delay Register | route=/pm/delays | roles=0
  - pm_delay_drafts — Delay Drafts | route=/pm/delays/drafts | roles=0

- pm_delivery — Delivery Management | route=— | roles=0
  - pm_delivery_daily_log — Daily Log | route=/pm/delivery/daily-log | roles=0

- pm_financial — Financial Management | route=— | roles=0
  - pm_fin_my_expenses — My Expenses | route=/platform/expenses/my | roles=0
  - pm_fin_exp_approvals — Expense Approvals | route=/platform/expenses/approvals | roles=0
  - pm_fin_reports — Financial Reports | route=/platform/financial-reports | roles=0
  - pm_fin_portfolio_evm — Portfolio EVM | route=/platform/portfolio/evm | roles=0

- pm_initiation — Business Justification | route=— | roles=0

- pm_itto — ITTO Management | route=— | roles=0
  - pm_itto_templates — ITTO Templates | route=/pm/itto/templates | roles=0
  - pm_itto_project — Project ITTOs | route=/pm/itto/project | roles=0
  - pm_itto_drafts — ITTO Drafts | route=/pm/itto/drafts | roles=0

- pm_planning_section — Project Planning | route=— | roles=0
  - pm_plans_group — Plans & Documents | route=— | roles=0
    - pm_plans_dashboard — Plans Dashboard | route=/platform/projects/:id/plans | roles=0
    - pm_project_plan — Project Plan | route=/platform/projects/:id/plans/project-plan | roles=0
    - pm_stage_plan_create — Create Stage Plan | route=/platform/projects/:id/plans/stage-plan/create | roles=0
  - pm_scope_group — Scope Management | route=— | roles=0
    - pm_scope_statement — Scope Statement | route=/platform/projects/:id/scope/statement | roles=0
    - pm_scope_management_plan — Scope Management Plan | route=/platform/projects/:id/scope/management-plan | roles=0
    - pm_wbs_builder — WBS Builder | route=/platform/projects/:id/scope/wbs | roles=0
    - pm_requirements_register — Requirements Register | route=/platform/projects/:id/scope/requirements | roles=0
    - pm_traceability_matrix — Traceability Matrix | route=/platform/projects/:id/scope/traceability | roles=0
  - pm_schedule_group — Schedule & Activities | route=— | roles=0
    - pm_schedule_management_plan — Schedule Management Plan | route=/platform/projects/:id/schedule/management-plan | roles=0
    - pm_activity_list — Activity List | route=/platform/projects/:id/schedule/activities | roles=0
    - pm_activity_sequencing — Activity Sequencing | route=/platform/projects/:id/schedule/dependencies | roles=0
    - pm_gantt_chart — Gantt Chart | route=/platform/projects/:id/schedule/gantt | roles=0
    - pm_project_calendar — Project Calendar | route=/platform/projects/:id/schedule/calendar | roles=4  [GRANTED]
    - pm_project_calendar_exceptions — Calendar Exceptions | route=/platform/projects/:id/schedule/calendar/exceptions | roles=4  [GRANTED]
  - pm_resource_group — Resource Planning | route=— | roles=0
    - pm_resource_list — Resource List | route=/platform/resources | roles=0
    - pm_resource_capacity — Capacity Planning | route=/platform/resources/capacity | roles=0
    - pm_resource_conflicts — Resource Conflicts | route=/platform/resources/conflicts | roles=0
  - pm_advanced_planning_group — Advanced Planning Tools | route=— | roles=0
    - pm_planning_hub, pm_planning_ai, pm_planning_scenarios, pm_planning_pbs, pm_planning_health,
      pm_planning_confidence, pm_planning_recovery, pm_planning_governance, pm_planning_intelligence,
      pm_microplans, pm_microplans_drafts — all roles=0

- pm_reporting — Reporting | route=— | roles=0
  - pm_report_checkpoint, pm_report_highlight, pm_report_issue_reports, pm_report_exception,
    pm_report_end_stage — all roles=0

- pm_section_automations — Automation | route=— | roles=0
  - pm_automations_rules, pm_automations_templates, pm_automations_log — all roles=0

- pm_section_collaboration — Collaboration | route=— | roles=0
  - pm_whiteboards, pm_whiteboard_new — roles=0

- pm_section_dashboards_analytics — Dashboards & Analytics | route=— | roles=0
  - pm_my_dashboards, pm_dashboard_builder, pm_scheduled_reports, pm_report_archive — roles=0

- pm_section_delivery_controls — Delivery Controls | route=— | roles=0
  - pm_raid_risk_register (/app/risks), pm_raid_issue_log (/app/issues),
    pm_raid_change_requests (/app/change-requests), pm_raid_delay_register (/platform/delays),
    pm_raid_daily_log (/app/daily-log/my-entries), pm_raid_lessons_log (/app/lessons/my-actions),
    pm_delivery_work_packages (/pm/delivery/work-packages),
    pm_delivery_checkpoint_reports (/pm/reporting/checkpoint-reports),
    pm_delivery_product_description, pm_delivery_project_product_description,
    pm_delivery_product_status_account — all roles=0

- pm_section_initiation_docs — Initiation Documents | route=— | roles=0
  - pm_init_docs_business_case (/pmo/initiation/business-case),
    pm_init_docs_project_brief (/pmo/initiation/project-brief),
    pm_init_docs_work_authorisations (/platform/work-authorisations) — roles=0

- pm_section_planning_tools — Planning Tools | route=— | roles=0
  - pm_s_curve, pm_baseline_compare, pm_planning_poker — roles=0

- pm_section_project_settings — Project Settings | route=— | roles=0
  - pm_custom_fields, pm_intake_forms, pm_intake_submissions, pm_client_portal, pm_recurring_tasks,
    pm_guest_access, pm_clone_project — roles=0

- pm_section_quality_testing — Quality & Testing | route=— | roles=0
  - pm_testing_dashboard, pm_testing_cases, pm_testing_suites, pm_testing_runs, pm_testing_evidence,
    pm_testing_defects, pm_quality_register — roles=0

- pm_section_reporting — Reporting | route=— | roles=0
  - pm_reports_library, pm_reports_builder, pm_reports_analytics, pm_reports_highlight,
    pm_reports_exception, pm_reports_end_stage, pm_reports_end_project — roles=0

- pm_section_resources_hub — Resources Hub | route=— | roles=0
  - pm_workload_heatmap, pm_raci_matrix, pm_skills_matrix, pm_timesheet_approvals,
    pm_training_certifications — roles=0

- pm_section_strategy_okr — Strategy & OKRs | route=— | roles=0
  - pm_okr_dashboard, pm_okr_objectives, pm_okr_alignment, pm_okr_checkins — roles=0

- pm_section_tasks — Tasks | route=— | roles=0
  - pm_tasks_my, pm_tasks_board, pm_tasks_calendar — roles=0
```

### 4.3 Cross-reference against taxonomy §3

Nearly every taxonomy §3 leaf the first audit already resolved for Platform (Risk/Issue/Quality/
Configuration/Lessons registers, Delays, Financial, ITTO, Plans, Scope/WBS, Schedule, Resources,
Reporting, Automation, Collaboration, Dashboards, Delivery Controls, Initiation Documents, Process
Group Forms, Testing, Resources Hub, OKRs, Tasks) is **re-represented here, unreachable, using
`/pm/*`-namespaced routes that in several cases don't match the granted Platform equivalent's route at
all** — e.g. `pm_raid_risk_register` uses `/app/risks` (not `/pm/controls/risk-register`, not
`/platform/risks`, not `/pmo/oversight/risk-register` — a **fourth** distinct route spelling for "Risk
Register" found in this audit, on top of the three already known from §2.4). This suggests the
`pm_*` tree was built against a still-different notion of the PM route surface than either the granted
`plat_sec_universal` tree or the live `platformRoutes.jsx` registrations — worth checking whether
`/app/risks`, `/app/issues`, `/app/change-requests` even resolve to real pages before assuming this
tree is "just needs grants" (as opposed to "was built against routes that were later renamed/removed").
**This audit did not verify route registration for the `pm_*`/`pmo_section_*` families against
`platformRoutes.jsx`** — that cross-check (matching the first audit's method for `plat_sec_*`) is
listed as unfinished work in §7.

**One thing this tree gets that Platform's granted tree does not**: `pm_scope_group` includes
`pm_scope_management_plan` (Schedule Management Plan — no, Scope Management Plan) and
`pm_traceability_matrix` (Requirements Traceability Matrix) as distinct entries, and
`pm_schedule_group` includes `pm_schedule_management_plan` and `pm_activity_sequencing` as separate
from Gantt — genuinely finer-grained coverage of Planning > Schedule/Scope than exists anywhere in the
granted Platform tree today (the first audit flagged `ScheduleManagementPlanPage` as "route exists but
no menu entry" — this `pm_*` tree is that menu entry, just not granted to anyone).

### 4.4 Duplication findings (PM)

With only 2 of 144 nodes granted, there is effectively **no live duplication to analyse within this
family** — every internal "duplicate" (e.g. `pm_reporting`'s Highlight/Exception/End-Stage reports vs
`pm_section_reporting`'s near-identical set with different routes: `/pm/reporting/highlight-reports`
vs `/pmo/reporting/highlight-reports`) is a dead-vs-dead comparison. The one live pair
(`pm_project_calendar`/`pm_project_calendar_exceptions`, 4 roles: `account_owner`, `pm_team_manager`,
`pmo_admin`, `system_admin`) has **no duplicate anywhere else in the system with an identical route**
(`/platform/projects/:id/schedule/calendar` is unique to this pair) — it is the one clean, non-
duplicated, genuinely-wired leaf in the entire `pm_*` family.

---

## 5. Per-layout summary

| Metric | Platform | PMO | PM |
|---|---:|---:|---:|
| Root-level (`parent_menu_id IS NULL`) rows | 57 | 62 | 24 |
| Total nodes (roots + all descendants) | 419 | 433 | 144 |
| Nodes with ≥1 active role grant | 332 (79%) | 56 (13%) | 2 (1.4%) |
| Nodes with 0 grants (unreachable) | 87 (21%) | 377 (87%) | 142 (98.6%) |
| Empty-container roots (0 children) | 19 | 38 (mostly legitimate single-page leaves; ~10 true dead stubs) | 3 |
| Distinct generations found | 4 (`plat_sec_*` 1st-gen; `plat_*` singleton 1st-gen; `platform_section_*` 2nd-gen dead; `tm_section_*` 3rd-gen dead) | 3 (`pmo-admin/people/comms/email-*` flat live leaves; `pmo-cat-*` rewrite mostly dead; `pmo_section_*` rewrite fully dead) | 1 (`pm_section_*`/`pm_*`, 98.6% dead) |
| Live/canonical tree for this UI shell | `plat_sec_universal`'s children (= `PM_CATEGORY_DEFS`) serve the live **PM** sidebar; most of the rest of `plat_sec_*` (Structured/Agile/Standards-Based/Cross-Framework/Personal/Team/Delivery/Project-Delivery/Exec-Overview/Reporting/System-Admin/Account) serves the live **PMO** sidebar via orphan-bucketing into `pmo-cat-*` | The 30 flat `pmo-admin-*`/`pmo-people-*`/`pmo-comms-*`/`pmo-email-*` leaves + the `plat_sec_templates` subtree orphan-bucketed in from Platform | None — `pm_project_calendar`/`pm_project_calendar_exceptions` only |
| Taxonomy §3 leaves genuinely still missing (not just un-granted) | Same as first audit's findings (Milestones, unified Actions Register, Escalation Path, Org Structure, Change Assessment dimensions, etc.) — unchanged by this audit | None found missing that isn't also missing from Platform — this family is redundant with Platform, not additive | None found missing that isn't also missing from Platform |

**Reading these numbers together**: Platform's `plat_sec_*` generation is the one doing essentially all
the real work in this system today (79% grant rate). PMO's and PM's own-named families
(`pmo-cat-*`/`pmo_section_*`/`pm_section_*`) are overwhelmingly (87-99%) inert — they read as a
genuine, well-intentioned, route-complete rewrite attempt that got the DB rows created but never got
the `role_menu_items` grants (or the parent-nesting into the `plat_sec_universal`/`pmo-cat-*` structure
that actually renders) finished.

---

## 6. Cross-layout question: are PMO and PM internally split the same way as Platform?

**No — they are structured differently from Platform and from each other, and neither mirrors
Platform's live "role-track × methodology-track" cross precisely:**

- **Platform's live structure** genuinely crosses two axes: *role track* (Personal/`tm_`,
  Universal/`pm_`(no prefix under `plat_sec_universal`), Team-Management/`tl_`, Exec/`plat_` bare) ×
  *methodology track* (Structured/`s_`, Agile/`a_`, Standards-Based/`p_`, Cross-Framework/`xf_`). This
  is real and load-bearing — `plat_sec_universal`'s children literally populate live category anchors
  used by both the PM and (via orphan-bucketing) PMO sidebars.
- **PMO's structure has no live methodology-track split at all.** The `pmo-cat-*` family's only
  methodology-flavoured content is `pmo-cat-standards_based` (Process Group Forms) and
  `pmo-cat-agile-lean` (empty stub) — both dead. What IS live in PMO (the 30 flat `pmo-admin-*`/
  `pmo-people-*`/`pmo-comms-*`/`pmo-email-*` leaves) has **no track structure whatsoever** — they're
  just individual admin pages, one menu row each, no grouping axis at all. PMO's dead `pmo_section_*`/
  `pmo-cat-*` generation *attempted* a role split (there are `pm_*`-prefixed items nested inside PMO
  categories, e.g. `pm_governance`, `pm_section_my_projects`, `pm_platform_teams_section` sitting
  under `pmo-cat-*` roots) but it's a much shallower, less consistent cross than Platform's — mostly
  "one PMO version + one PM-flavoured cross-reference version" pairs, not a 4-way role split.
- **PM's structure (`pm_section_*`/`pm_*`) has no internal track split either** — it's a single flat
  hierarchy with no role or methodology dimension, organised purely by functional domain (Controls,
  Financial, ITTO, Planning, Reporting, etc.), closer in shape to a conventional single-persona app
  sidebar than to Platform's multi-track design.

So the honest answer is: **Platform is the only layout with a real, live, multi-axis structure. PMO
and PM's own-named trees are single-axis (or no-axis) rewrites that don't yet replicate Platform's
role/methodology crossing** — which itself raises the question in §7 of whether they were ever meant
to (a simpler single-track PM/PMO sidebar might be the *intended* end state that Platform's tangle
should also converge toward, rather than PMO/PM needing to catch up to Platform's complexity).

**Additional cross-layout finding**: the Simulator app (`sim_sec_*`, `sim-pmo-*`, `sim_unified_*` — 22
roots, out of this audit's defined scope but visible in the raw data) reproduces Platform's exact
multi-track structure almost 1:1 — `sim_sec_personal`/`sim_sec_universal`/`sim_sec_structured`/
`sim_sec_agile`/`sim_sec_cross_fw`/etc. mirror `plat_sec_*` naming closely, and the granted-duplicate
route analysis (§2.4) found the identical duplication pattern inside Simulator too (e.g.
`/simulator/dashboard` has 4 differently-coded granted duplicates, exactly matching
`/platform/dashboard`'s 4). This means whatever consolidation decision is made for Platform's
`plat_sec_*` tracks should very likely be mirrored into Simulator's `sim_sec_*` tracks per CLAUDE.md
rule 34.1 (Platform-Simulator parity) — but that is a full second audit's worth of work and is
explicitly flagged, not performed, here.

---

## 7. Needs user decision

1. **What should happen to the two fully-dead generations in Platform** (`platform_section_*`, 10
   roots/21 nodes, 0 grants; `tm_section_*`, 10 roots/29 nodes, 0 grants)? Every route they cover is
   already served by a granted row elsewhere in `plat_sec_*`. Candidates: delete outright, or treat as
   a partially-finished "simplify Platform's sidebar" rewrite that should be *finished* (grants added,
   old `plat_sec_*` rows retired) instead of abandoned. This is a strict superset of the first audit's
   "8 empty stub roots" question — now scoped to entire dead trees, not just empty headings.

2. **What should happen to the almost-entirely-dead PMO (`pmo_section_*`/most of `pmo-cat-*`, 87%
   ungranted) and PM (`pm_section_*`/`pm_*`, 98.6% ungranted) families?** Three explanations are
   equally plausible from the data alone and only the user can say which is true: (a) an abandoned
   rewrite attempt that should be deleted; (b) a finished-but-never-launched rewrite that should be
   *turned on* (grants added) as the new canonical PMO/PM sidebar, retiring the current
   `plat_sec_universal`/orphan-bucketed-`pmo-cat-*` mechanism; (c) legitimate scaffolding for a future
   phase that isn't ready yet and should be left alone (though it currently costs nothing to leave
   alone since nothing renders it). Given how *route-complete* and *better-organised* the `pm_*`
   family in particular looks (single flat hierarchy, no cross-track duplication, finer Planning/Scope
   granularity than the live tree — see §4.3), option (b) deserves serious consideration rather than
   automatic deletion.

3. **If option (b) above is chosen for PM**: several `pm_*` routes don't match any registered route
   this audit could confirm from the granted Platform tree (e.g. `pm_raid_risk_register` →
   `/app/risks`, not the granted `/pm/controls/risk-register` or `/platform/risks`). Before granting
   any role access to this tree, its routes need to be verified against `platformRoutes.jsx` — this
   audit did not do that cross-check for the `pm_*`/`pmo_section_*` families (only for the already-known
   `plat_sec_*` tree, inherited from the first audit). Flagging as required follow-up work, not
   performed here.

4. **Platform's live role-track × methodology-track cross (Pattern A in §2.4)** — same question the
   first audit raised (its "Needs user decision #2"), now with concrete role-grant evidence: Risk
   Register is granted to 23 roles via the PM track, 4 via Team-Management, 3 via PMO-Oversight — real,
   distinct, overlapping-but-different audiences. Confirm whether this three-tier split by audience is
   *wanted* (keep three sidebar entries, three routes) or should collapse to one route with
   permission-based content filtering (one sidebar entry, same page, role determines what's visible
   inside it).

5. **The ~15 same-parent exact-duplicate pairs found within the dead PMO family** (§3.4 point 1) — e.g.
   `pmo_comms_messages` sitting right next to `comms_messages` under the very same
   `pmo_section_email` → `pmo_comms_section` parent, both pointing at `/platform/comms/messages` — look
   like accidental double-inserts during that tree's construction rather than any deliberate pattern.
   Since the whole family is ungranted, deleting the exact duplicates is zero-risk from a user-visibility
   standpoint; confirm there's no reason (e.g. a pending migration script keyed to specific ids) to keep
   both.

6. **Marketing (`mkt_cat_*`, 16 roots), HR (`hrm_cat_*`, 4 roots), and Legal/Compliance (`lco_cat_*`,
   5 roots) industry packs exist in the live DB with real granted content** (several appeared in the
   §2.4 duplicate-route table via legitimate `*_reuse_*` rows pointing at generic Platform pages) **but
   have no corresponding section in `Documentation/Core_PM_and_Industry_Menu_Taxonomy.md`** (which
   covers FIN/CON/ICT/HLT/GOV/TEL/ENR/MFG/EDU/NGO/RET/GEN only, §4-15). Confirm whether the taxonomy
   document should be extended with Marketing/HR/Legal sections to match what's actually been built, or
   whether these packs were built ahead of/outside the taxonomy process and need their own retrofit
   audit.

7. **Simulator's `sim_*` family (22 roots) reproduces Platform's exact duplication pattern** (§6). Confirm
   whether Simulator should be audited and rationalised in lockstep with whatever decision is made for
   Platform (per CLAUDE.md rule 34.1 parity), as a follow-on to this document, or whether it's
   deliberately out of scope for now.

8. **`local_register_*` (29 roots)** sit as orphaned root-level rows (parent_menu_id NULL) even though
   there is a dedicated `pmo_admin_local_registers` ("Manage Local Registers") menu entry that reads
   like their intended parent. Confirm whether these should be re-parented under it, or whether their
   current orphan-root status is intentional (e.g. rendered via a different mechanism entirely, such as
   a dedicated `/platform/local-registers` index page rather than sidebar nesting — `local_registers_index`
   does have a real route, `/platform/local-registers`, suggesting the flat list may be by design).

9. **30 rows found with a non-null `parent_menu_id` pointing at a row that is not itself
   active+visible** (e.g. `security`, `admin_users`, `settings_security`, `pm_manage_members` — see
   raw dump note in this session; not reproduced in full here as it's outside the "root-level" scope
   the brief defined). These are a second, smaller category of orphan beyond the `parent_menu_id IS
   NULL` roots this audit focused on. Worth a follow-up data-integrity pass, not analysed further here.

10. **All nine "Needs user decision" items from the first audit** (`projectplan/v966_core_pm_menu_rationalisation_mapping_audit.md`
    §4) remain open and are not restated here — they concern taxonomy-leaf-level product decisions
    (Milestones, unified Actions Register, Calendar consolidation, Charter vs Brief vs PID, Procurement
    prioritisation, etc.) that this broader structural audit doesn't change or resolve.
