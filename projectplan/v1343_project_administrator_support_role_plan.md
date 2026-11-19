# v1343 — Project Administrator (Support menu pack) — Implementation plan

**PRD:** `projectprd/v1343_project_administrator_support_role_PRD.md` (D1–D14 confirmed 2026-11-14)
**Status:** Implemented 2026-11-15 — SQL not yet run (owner). Slices 1–7 coded (SQL v1471–v1476; Admin plan v218).
**Apps:**
- Platform and Simulator (practice projects) — rule 34.1.
- Admin: the Menu Placements label for the new key (Admin repo, own plan file).

**SQL:** next free numbers at creation (rule 18.0). Expected v1470+ (monorepo) and Admin v250+. The owner runs all SQL.

---

## 1. PRD audit — gaps found (facts from the codebase)

| # | Severity | Gap | Evidence | Recommended resolution |
|---|---|---|---|---|
| G1 | **Critical** | **(V) / (E) markers cannot be enforced as written.** `role_menu_items.can_use = false` only shows a "View only" eye icon in the sidebar. Pages do not read it, and most project tables allow any project member to write (RLS on project membership). A PA would be able to edit Governance Setup, Budget, PID and so on wherever a page has edit buttons. | `Sidebar.jsx` (`canUse === false` → eye icon only); `useMenu.js` sets `canUse`; no page reads it. | **G-D1.** Treat (V) as "view-only intent shown in the menu" for v1343. Enforce server-side only the authority exclusions that matter (D7 / D9). Most are already role-gated (see G3, G6). Full page-level read-only is a separate PRD. |
| G2 | **Critical** | **A PA would land on the PMO sidebar.** `menuLayoutUtils` picks the PM shell only for roles in `PM_LAYOUT_ROLES`; any other role defaults to `pmo`. This applies to every organisation, consolidated menus on or off. The PRD only describes the consolidated (Support) menu, but most organisations still run with the switch **off**. | `packages/shared/src/utils/menuLayoutUtils.js` (`PM_LAYOUT_ROLES`, `primaryScope = 'pmo'` default). | Add `project_administrator` to `PM_LAYOUT_ROLES`. With the switch off, the PA sees the PM-layout sidebar trimmed by their grants (same grants as the Support pack). State this in the PRD. |
| G3 | **High** | **Timesheet "chase / update / flag" is not possible today.** `timesheet_entries` SELECT / UPDATE and `timesheet_entry_reviews` are limited to the owner or `project_manager` / `team_lead` / `team_manager`, so a PA cannot even see the team's timesheets. There is no "flag" feature. Formal Approve is already blocked for PA (D7 holds automatically). | `SQL/v1172` (policies with `role_name IN ('project_manager','team_lead','team_manager')`). | **G-D2.** Add `project_administrator` to the timesheet **read** policy for its project. Leave update and review-insert unchanged. "Chase" = the existing reminder / notification path if one exists, else out of scope. "Flag" is a new feature → drop from v1343 or define it. |
| G4 | **High** | **The invite cap (D8) is UI-only, and removal has no cap at all.** `invite_user_to_project` does not check the invited role's level against the inviter's. `removeMemberFromProject` is a direct `project_memberships` update gated by RLS `user_projects.access_level IN ('owner','admin')`. A PA (access level `member`) would therefore be **unable to remove anyone**, and nothing stops removal of a PM by an owner / admin-level user. | `SQL/v597` (invite permission check only); `projectMembershipService.removeMemberFromProject`; `SQL/v179` membership policies. | New SECURITY DEFINER checks: the invite RPC refuses a role above the inviter's cap. A new `remove_project_member(membership_id)` RPC applies the same cap (≤ 7 for PA; Team Manager / PM untouchable). The UI calls it. |
| G5 | **High** | **"Level ≤ 7" includes governance roles.** Project Assurance is 7, Quality Assurance 6, Change Authority below that, and industry compliance roles sit at 7 (Release Manager, H&S Officer, Risk & Compliance Manager…). A PA could appoint the people meant to check the PM. | `SQL/v91`, `SQL/v907` levels; `get_assignable_project_roles` already returns `is_governance_only`. | **G-D3.** A PA may assign level ≤ 7 **excluding governance-only roles** (and excluding project_assurance / quality_assurance / change_authority). Org admins are unchanged. |
| G6 | Medium | **PM invite picker has a hard-coded allow-list** (`team_manager`, `team_member`, `project_assurance`, `quality_assurance`, `change_authority`), so PA would not appear even after the SQL. | `projectRoleAssignmentService.js` `PROJECT_MANAGER_INVITE_ROLE_NAMES`. | Add `project_administrator`. Same check on the PMO picker and the Simulator copies. |
| G7 | Medium | **Several pages in the Support tree don't exist:** My Approvals (timesheet checks / document reviews), Meeting follow-ups, Approvals History, timesheet checks / flags. The "tabs" on My Dashboard / My Work / Messages imply new tabbed pages. D13 says "no new menu items expected" — these contradict it. | No such `menu_items` labels in `SQL/`. | **G-D4.** v1343 places **existing** pages only. Missing pages are listed as follow-ups and left out of the Support tree for now. |
| G8 | Medium | **Simulator practice parity (D12) is not automatic.** The consolidated menu loader reads Platform `user_roles` only. Practice memberships store a free-text `sim.practice_project_memberships.role_name`, so a practice PA would not get the Support menu. | `consolidatedMenuData.loadUserMenuRoles`; `SQL/v227`. | Loader: for the Simulator with a practice project open, add the practice membership's `role_name` to the roles used by `resolvePlacementKey`. Add PA to the practice invite / role choices. |
| G9 | Medium | **Engine and constraint wiring the PRD doesn't list:** `menu_item_placements.placement_key` CHECK (v1449) and `menu_layout_key` CHECK (v1456) must accept `support`. Also needed: `PLACEMENT_KEY_ORDER` position, `PROJECT_PLACEMENT_KEYS` (Home-only with no project open), compact or not (`useDefaults`), `MENU_LAYOUT_OPTIONS`, the v1452 audit's role → key list, and the Admin Menu Placements label map. | `SQL/v1449` L59, `SQL/v1456`, `packages/config/src/consolidatedMenu.js`, Admin `packages/shared/src/menuPlacementServices.js`. | **G-D5** (order + compact). Rest: mechanical, in Slice 1 / 5. |
| G10 | Medium | **Conflict:** PRD D13 and rule 75 say to update `Documentation/Consolidated_Role_Menus_Proposal.md` (§5 catalogue, new §6.x). On 2026-11-13 the owner said not to update the proposal. | Session record. | **G-D6.** Either the owner lifts the instruction for this PRD, or the Support placement is documented in a new guide plus the v1341 plan / taxonomy notes only. |
| G11 | Low | **D11 (functional catalogue):** `project_functional_roles` is **per project**. "Seed on every project" would need a backfill plus a create-project hook. The "Add from Built-in Roles" library (v1105) already reads built-in `project_roles.role_skills`, which v1110 makes mandatory. | `SQL/v1084`, `SQL/v1110`. | Seed the PA `project_roles` row **with** `role_skills`. It then appears in the library for any project. No per-project rows. **G-D7** confirms. |
| G12 | Low | **Hard-coded role lists in UI** (role colour maps, Team Structure chart, Role Descriptions, resource-form hierarchy comments) don't know PA. Cosmetic: default style. | `RoleCard.jsx`, `TeamStructureChart.jsx`, `RoleDescriptionsSection.jsx`. | Add PA where the list is a role catalogue shown to users. Ignore colour-only maps. |
| G13 | Low | **Typo in testing decisions:** "TM level 4 cannot assign PA" — Team **Member** is 4, Team Manager is 8. | PRD §e. | Fix the wording in the PRD. |
| G14 | Low | **Existing weakness found:** the invite RPC lets **anyone with any `user_roles` row on the project** send invitations, so a Team Member can invite today, against story 9. | `SQL/v597` first `OR EXISTS`. | **G-D8.** Tighten in this change (invite needs `user.invite` permission or PM / PMO), or record as a separate security fix. |
| G15 | Low | **Org-tier level (D5)** is not chosen. The `roles` table uses its own scale: `project_manager` 9 · `team_manager` 8 · `project_assurance` 7 in v91 (an older 5–100 scale exists for admin tiers). | `SQL/v91`, `SQL/v908` comment. | Use 7 in both `roles` and `project_roles` (matches the v91 built-in scale). |
| G16 | Info | **D9 exclusions that already hold:** governed Approve / Reject (approval chains name the approvers), Industry Modules switch-off (PM / PMO only), timesheet Approve (G3). **Not role-gated:** Governance Setup edit, budget / procurement data entry, Project Settings sub-pages → covered by G-D1. | Industry Modules page message; v1169 policies. | Verify each in the smoke test; list the ones that remain UI-only. |

## 2. Decisions (interview 2026-11-14)

- **G-D1** — (V) enforcement scope for v1343: menu intent only, plus server-side enforcement of D7 / D9 where already role-based? **Confirmed 2026-11-14: yes.** Page-level read-only is a separate PRD. The guide lists the pages a PA can still edit.
- **G-D2** — Timesheets for PA. **Confirmed 2026-11-14: read + reminders + flag.**
  - The PA sees the project team's timesheets, read-only, with no Approve / Reject.
  - A new **Send reminder** action notifies members with missing or draft timesheets for a period.
  - A new **flag** on an entry (reason + note) is shown to the Team Manager / PM before they decide.
  - **G-D2a reminders — confirmed:**
    - The PA, Team Manager or PM picks a period on Team Timesheets and clicks **Send reminder**.
    - Members with missing or draft entries get an in-app notification and an email (the existing timesheet notification path).
    - Every send is logged: who, when, to whom.
    - Manual only, no schedule.
  - **G-D2b flag — confirmed:**
    - The PA picks one or more reasons from a managed catalogue (like the v1169 reason catalogues) and adds a note.
    - The approver sees a flag badge. The flag is **advisory**: it never blocks Approve / Reject.
    - It resolves when the entry is decided, or the PA withdraws it. Full history is kept.
- **G-D3** — Which roles a PA may assign. **Confirmed 2026-11-14:** level ≤ 7, **excluding** governance-only roles (`is_governance_only`) and Project Assurance / Quality Assurance / Change Authority. Also applies to removal. Org admins and PMs unchanged.
- **G-D4** — Missing Support pages. **Confirmed 2026-11-14: build all of them.** This replaces PRD D13's "no new menu items": new items go to the catalogue and the taxonomy (rules 70 / 75).
  - **G-D4a design — confirmed.** Three new project-scoped pages, Platform + Simulator. Each has Table-List default, search, sort, row numbers, export and is theme-aware.
    - **Home › My Approvals**, two tabs:
      - **Timesheet flags** — the user's own flags: entry, reasons, status open / resolved / withdrawn.
      - **Document reviews** — register sign-off steps assigned to the user: open / done.
    - **Home › My Work › Meeting follow-ups:** `comm_meeting_action_items` assigned to the user (item, meeting, due, status, link).
    - **Governance › Approvals History:** decided `record_authorisation_requests` on the project, read-only (record, type, requested / decided by, decision, date, justification).
  - **Tabs without new pages** (v1341 slot tab strip):
    - My Dashboard = existing dashboard pages
    - My Work = My Tasks · My Actions · Meeting follow-ups
    - Messages = Comms Hub · Channels · Direct · Meeting Summaries
    - Governance = Stage Gates · Meetings · Approvals History
  - The new pages are placed and granted for **every role that has the matching area**, not only Support.
- **G-D5** — Placement order and compact mode:
  - `support` sits after `pm` and before `team` in `PLACEMENT_KEY_ORDER`, so a person who is both TM and PA gets the TM menu? Or before `team`?
  - Is the Support menu compact (only placed pages, `useDefaults = false`)?
  - **Confirmed 2026-11-14:** order pm → team → support (Team Manager wins when someone holds both); Support is **compact**. The v1452 audit treats `support` as compact.
- **G-D6** — Proposal doc. **Confirmed 2026-11-14:** update `Consolidated_Role_Menus_Proposal.md` for v1343 only: §5 Support catalogue, a new §6.x Support menu, and placement rows for the new pages. The 2026-11-13 instruction is lifted for this PRD only.
- **G-D7** — Functional catalogue. **Confirmed 2026-11-14:** library entry only. The built-in role carries its default skills, and PMs add it from "Add from Built-in Roles". No per-project rows.
- **G-D8** — Invite RPC hole. **Confirmed 2026-11-14:** fix in v1343. Invites are allowed only for:
  - org admins / PMO;
  - the project's PM;
  - a project role with the `user.invite` permission (PM, Team Manager, PA, and the existing programme / board / sponsor list).

  This comes on top of the level cap (G4) and the governance exclusion (G-D3). Before release, a check query lists recent invitations sent through the loose clause.

**PRD amendments needed** (applied to the PRD on approval):
- D7 → G-D2 / a / b (read + reminders + advisory flag).
- D8 → G-D3 (≤ 7 minus governance; removal capped too).
- D13 → G-D4 (new pages + tabs) and G-D6 (proposal doc).
- D11 → G-D7.
- New: G-D1 ((V) = menu intent), G-D5 (order and compact), G-D8 (invite fix), G2 (PM shell when the switch is off).
- Testing typo (G13).

## 3. Slices (tracer bullets)

### Slice 1 — A PA can be invited and gets the right sidebar (Platform)
- [x] SQL:
  - `roles` + `project_roles` rows `project_administrator`: level 7 on both scales (G15), `is_system_default`, `is_template`, `menu_layout_key = 'support'`.
  - `role_skills`: meetings, actions, reporting, timesheet admin, document control, schedule / RAID maintenance (G-D7).
  - `permissions` aligned with Team Manager, including `user.invite`, without approve / budget flags.
- [x] SQL: `support` added to the placement-key CHECK (v1449) and the `menu_layout_key` CHECKs (v1456).
- [x] SQL: `role_menu_items` grants + `menu_item_placements` for `support`, mapping every **existing** page in the Support tree to its `menu_code`.
  - (E) → `can_use = true`, (V) → `can_use = false`. Menu intent only (G-D1).
  - Industry pages: a dedicated `support` group in the grant helper (D14).
- [x] Engine (`@nidus/config/consolidatedMenu`):
  - `ROLE_PLACEMENT_KEYS.project_administrator = 'support'`
  - `PLACEMENT_KEY_ORDER` pm → team → support (G-D5)
  - `PROJECT_PLACEMENT_KEYS` + `COMPACT_PLACEMENT_KEYS` (compact)
  - `MENU_LAYOUT_OPTIONS` (Support)
- [x] `menuLayoutUtils.PM_LAYOUT_ROLES` += `project_administrator` (G2: PM shell, also with consolidated menus off).
- [x] Invite pickers: PM allow-list + PMO picker (G6), both apps. Invitation default message.
- [x] `SQL/v1452` audit: `project_administrator → support`, compact.
- [x] Tests: key resolution and order, compact behaviour, layout scope, picker lists.

### Slice 2 — Invite / remove authority enforced server-side (G4, G-D3, G-D8)
- [x] Invite RPC (latest `invite_user_to_project`), all three checks:
  - an allowed inviter (G-D8);
  - the invited role's level ≤ the inviter's cap;
  - a PA cannot give governance-only roles or Project Assurance / QA / Change Authority.
- [x] `get_assignable_project_roles`: the same PA exclusion, so the picker matches the server.
- [x] New `remove_project_member(p_membership_id)` SECURITY DEFINER with the same rules (PA cannot remove TM / PM / governance roles). `removeMemberFromProject` / `removePlatformProjectMember` call it (both apps).
- [x] Pre-release check query: invitations in the last 90 days whose inviter would now be refused.
- [x] Tests (SQL check + service):
  - Allowed: PA invites a Team Member; PA removes a Team Member.
  - Refused: PA invites a PM; PA invites Project Assurance; PA removes a TM; a Team Member invites.

### Slice 3 — Timesheets: read, reminders, flags (G-D2 / a / b)
- [x] SQL: `timesheet_entries` SELECT adds `project_administrator` on the entry's project. Update and review policies unchanged (no Approve).
- [x] SQL: reminder log table `timesheet_reminders` (project, period, sent_by, recipients, sent_at).
  - RLS: PA / TM / PM of the project.
  - Registered in `database_tables`; planner wall re-run (rule 6).
- [x] SQL: flags.
  - `timesheet_entry_flag_reasons` catalogue (managed like the v1169 reason catalogues; seed rows in a companion seed file).
  - `timesheet_entry_flags` (entry, reasons[], note, status open / resolved / withdrawn, raised_by, resolved_by / at), with full history.
  - A flag resolves when the entry is decided (trigger on the review insert).
  - RLS: the PA raises / withdraws their own; approvers read.
- [x] Team Timesheets page:
  - PA sees the team (read-only), with Approve / Reject hidden.
  - **Send reminder** for a period: in-app + email via the existing timesheet notification path; the send is logged; success modal (rule 16).
  - **Flag** action on an entry; flag badge + reasons shown to approvers (advisory).
- [x] Flag reason catalogue: a third tab **Flag reasons** on the existing Timesheet Review Reasons page (same CRUD, Audit tab); the catalogue service maps `flagged` → `timesheet_entry_flag_reasons`. Seed in v1474.
- [x] Simulator: its Team Timesheets copy reads the same public tables, so the same changes are applied to both copies.
- [x] Tests: policies (check query), services, flag lifecycle, reminder recipients (missing / draft only).

### Slice 4 — New pages and tabs (G-D4 / G-D4a)
- [x] **Home › My Approvals** (routed page, rule 65): tabs Timesheet flags (mine) · Document reviews (register sign-off steps assigned to me).
- [x] **Home › My Work › Meeting follow-ups:** my `comm_meeting_action_items`.
- [x] **Governance › Approvals History:** decided `record_authorisation_requests` for the project, read-only.
- [x] Each page:
  - Table-List default, search, sort, row numbers, export (rules 38 / 40 / 41 / 44), theme-aware, PWA.
  - Clickable rows to the source record. Back button where secondary (rule 73).
- [x] Catalogue rows (`menu_items`) + grants for every role with the matching area + placements (rule 75), Platform + Simulator.
- [x] Slot tabs via the v1341 tab strip:
  - My Dashboard (existing dashboard pages)
  - My Work = My Tasks · My Actions · Meeting follow-ups
  - Messages = Comms Hub · Channels · Direct · Meeting Summaries
  - Governance = Stage Gates · Meetings · Approvals History

  New `menu_slots` rows where needed. The engine already supports slots inside sub-menus (v1466 work).
- [ ] Taxonomy lines (rule 70) + proposal placement rows (G-D6) — done in slice 7.
- [x] Tests: each page's service / query and list behaviour.

- **Implementation notes (2026-11-15):**
  - SQL v1475 (approval history functions, Platform + Simulator) and v1476 (catalogue, grants, placements, slots).
  - Shared code: `@nidus/shared/services/projectAdminWorkService`, `@nidus/ui/SimpleRecordList` (search, sort, row numbers, Card / Table-List, export) and `@nidus/ui/projectAdmin/ProjectWorkPages`. Lazy-loaded from both apps' routes.
  - **My Work tabs = My Tasks · Meeting Follow-ups.** There is no separate "My Actions" page today. The project Actions register stays under Risks & Governance.
  - **My Dashboard:** only one dashboard page is placed in Home, so there is nothing to group.
  - **Simulator:** the three pages are consolidated-sidebar only and have no tab slots, because its Home / Governance menus differ from the Platform's. Simulator meetings belong to simulation runs, so Meeting Follow-ups lists all of the user's items there.
  - **Approvals History rows** are not clickable: requests span many record tables with different routes.

### Slice 5 — Simulator practice parity (D12, G8)
- [x] Consolidated loader: with a practice project open, the practice membership `role_name` joins the roles used by `resolvePlacementKey`.
- [x] Practice invite / role choices include Project Administrator. `support` placements and grants for the Simulator equivalents of every Support page.
- [ ] `scripts/check-sim-placement-routes.mjs` on the new placements — owner, with the v1452 result set E after running v1471 / v1476.
- [x] Learning path keeps "Project Coordinator".

### Slice 6 — Admin
- [x] Admin `menuPlacementServices.js` label: `support: 'Project Administrator (Support)'`.
- [x] Admin placement RPCs: accept `support` if they validate keys.
- [x] Admin plan file in `E:\project-nidus-admin\projectplans\`. Admin SQL only if needed.

### Slice 7 — Docs and review
- [x] PRD amended per §2 (amendments A1–A10).
- [x] Guide `Documentation/Project_Administrator_Support_Role_v1343_Guide.md`:
  - the three layers (professional / functional / access);
  - can / cannot;
  - which pages remain editable despite (V) (G-D1).
- [x] `Consolidated_Role_Menus_Proposal.md`: §5 row, §6.7a Support menu, §3 rows for the new pages, §7 matrix row (G-D6). Taxonomy lines for the new items and the Support key (rule 70).
- [x] Retest suite for touched areas (below). Review section here.
- [ ] Owner: run SQL v1471–v1476 and the v1251 planner wall; v1472's pre-release check; the v1452 audit; the route check on result set E; the smoke test.

## 4. Risks

- **G1 means PA's (V) pages are editable** wherever the page allows any member to edit. It must be communicated in the guide and the release note until page-level read-only exists.
- **Tightening the invite RPC (G-D8)** can block people who invite today through the loose clause. Check which roles currently send invitations before release.
- **Supabase editor rules:** no SELECT INTO / RETURNING INTO / temp tables, and no "into" in comments.

## Review

**Implemented 2026-11-15** (Platform + Simulator + Admin label). Nothing committed yet.

**SQL** (owner runs, in order):
- v1471: role and Support menu.
- v1472: invite / remove authority. Ends with the pre-release check.
- v1473: timesheet read, flags, reminders.
- v1474: flag reason seed.
- v1475: approval history functions.
- v1476: new pages' menus and tab slots.

Then `SQL/v1251_planner_table_wall.sql` (new tables) and the `SQL/v1452` audit (now knows `support`, compact).

**Code**
- Engine (`@nidus/config/consolidatedMenu`): `support` key, order pm → team → support, compact, Support layout option.
- `menuLayoutUtils`: PA uses the PM shell.
- Pickers: PM allow-list (both apps), practice project roles (both apps' sim membership service), invitation default message (JS + v1471).
- Membership removal through `remove_project_member` (both apps).
- Team Timesheets (both apps): Review only for deciders; Flag / Withdraw; Send reminder dialog; Weekly Grid decisions only for deciders.
- Shared:
  - `@nidus/shared/services/timesheetFlagService`, `projectAdminWorkService`;
  - `@nidus/ui`: `TimesheetFlagDialog`, `TimesheetReminderDialog`, `SimpleRecordList`, `projectAdmin/ProjectWorkPages` (My Approvals, Meeting Follow-ups, Approvals History) — routes in both apps;
  - the Simulator consolidated loader reads the practice membership role.
- Admin: `PLACEMENT_KEY_LABELS.support` (+ test), plan `E:project-nidus-adminprojectplans218_support_placement_key_label_plan.md`.

**Tests (all pass)**
- Config consolidatedMenu 37.
- Shared: menuLayoutUtils 18, consolidatedMenuData 14, timesheetFlagService 9, projectAdminWorkService 5.
- UI: dialogs 4, SimpleRecordList 3.
- Membership removal: Platform 3 + 2, Simulator 3.
- Admin menuPlacementServices 7.
- Regression: Platform timesheets / platform-app 102 of 103. The one failure is `DecisionLogPage.pendingActions`, an existing missing-provider error unrelated to this change.
- Invitation-template API tests: 3 already failing before this change.
- Lint: no new errors. Remaining errors in `TeamTimesheetsPage` (2) and `ProjectsEdit` were already there.

**Known limits** (also in the guide):
- (V) pages are a sidebar hint only (A1).
- Approvals History rows don't link to records.
- Simulator: no tab slots for the new pages, and Meeting Follow-ups is not filtered by practice project (Simulator meetings belong to runs).
- A PA cannot change a member's role (owner / admin access level only), which the PRD doesn't need.
