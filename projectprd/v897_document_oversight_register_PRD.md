# v897 — Cross-Tier Read-Only Document Visibility (Document Oversight Register + Project Documents for team roles)

## a) Problem statement

Today, a project's signed/signatory-tracked documents (Project Charter, Business Case, etc. — anything with a Document Signatory chain configured, per the v868 Document Signatory feature) are only visible one project at a time, on that project's own "Project Documents" page — and even that page is only reachable by `project_manager`, `portfolio_manager`, `programme_manager`, `pmo_admin`, `system_admin`, `account_owner`, and `superuser` (confirmed via the menu grants in `SQL/v849_pm_project_documents_menu.sql`). That leaves two gaps:

1. Nobody above the Project Manager — a Portfolio Manager, a Programme Manager, or PMO Admin — has any page that rolls documents up across the projects they're responsible for. If a Portfolio Manager wants to know "which of my portfolio's projects have an unsigned Project Charter?" or "who signed the Business Case for Project X?", there is no menu item or page that answers that without opening each project individually.
2. Nobody below the Project Manager — a `team_lead` or `team_member` assigned to a project — has any access at all to that project's documents, even read-only, even for the project they're actually working on. They can't see what's been signed off (e.g. the Project Charter) for their own project.

## b) Solution

Add a new, read-only **Document Oversight** register page, added to the Portfolio, Programme, and PMO sidebar sections (Platform and Simulator). Each higher-tier role sees a table/card list of project documents (anything with a signatory requirement) scoped to their own branch of the hierarchy:

- **PMO Admin** — every project document, org-wide.
- **Portfolio Manager** — documents belonging to projects inside portfolios they manage (`portfolio_members.member_role = 'portfolio_manager'` → `portfolio_projects` → project set).
- **Programme Manager** — documents belonging to projects inside programmes they manage (`programme_members.member_role = 'programme_manager'` → `programme_projects` → project set).

Each row shows the document, its project, its current signing status (pending / partially signed / fully signed / declined), and who has signed so far — with a status filter. No new approval action is added; this is purely visibility into signing that already happened (or hasn't) at the project tier. "Approve" in the original request means *see that it was approved*, not add a new approval step.

**Second half — project-tier roles looking up, not down.** Extend read-only access to `team_lead` and `team_member` on the *existing* per-project "Project Documents" page (no new page needed here — a project contributor only ever needs their own project's documents, not a cross-project rollup). This means:
- Granting `team_lead`/`team_member` a menu grant on the existing `plat_pm_project_documents` / `sim_pm_project_documents` menu items (currently PM-tier and above only).
- Gating the page and its detail view so these two roles get View + Export only — no Capture/Add, no Edit, no Retire/Restore, no Signatories actions beyond viewing who signed.
- Scoping which project(s) they see to projects where they're an assigned member (`user_projects`, the same table `SignatoriesPanel.jsx` already uses to resolve a project's team) — not every project in the account.

Row-level SELECT access is not the blocker here: `pm_template_nodes_select` RLS (`SQL/v764b_pm_template_hierarchy_rls.sql`) already allows any authenticated user with account access to read any node, account-wide — access today is gated purely at the menu-grant layer. So this half of the feature is a menu grant + UI read-only/scope gating, not a new RLS policy.

## c) User stories

1. As a PMO Admin, I see a new "Document Oversight" menu item in my PMO sidebar section.
2. As a Portfolio Manager, I see a "Document Oversight" menu item in my Portfolio sidebar section, scoped to my portfolio(s).
3. As a Programme Manager, I see a "Document Oversight" menu item in my Programme sidebar section, scoped to my programme(s).
4. As any of the above, I see a list of project documents (one row per document instance) with: document title, document type, project name, signing status, and last-updated date.
5. As any of the above, I can filter the list by signing status (all / pending / partially signed / fully signed / declined).
6. As any of the above, I can search the list by document title or project name.
7. As any of the above, I can switch between Card and Table-List view (default Table-List, per rule 41), with sortable column headers (rule 40) and row numbers (rule 44).
8. As any of the above, clicking a row opens that document in read-only view (reusing the existing Project Documents detail page's "View" mode) — no edit access from this register.
9. As any of the above, I can see, for a fully or partially signed document, which signatory roles have signed, by whom, and when — without leaving the register (e.g. an expandable row or a "View signatories" action that opens the existing Signatories tab in read-only form).
10. As any of the above, I can export the list (Excel/Word/PowerPoint/CSV/XML/JSON/Print), per rule 38.
11. As a Portfolio Manager with no managed portfolios (not yet assigned), I see an empty state, not an error.
12. As a user without one of these three roles, the Document Oversight menu item does not appear (enforced via `role_menu_items`, same mechanism as every other role-gated menu item).
13. This same feature exists in Simulator, scoped to `sim` schema equivalents (`practice_portfolio_members`/`practice_programme_members` or whatever the Simulator-side tables are named — to be confirmed during exploration), for Portfolio, Programme, and PMO Simulator roles.
14. As a `team_lead` or `team_member` assigned to a project, I now see the "Project Documents" menu item (I couldn't before).
15. As a `team_lead` or `team_member`, opening Project Documents shows only the project(s) I'm an assigned member of (via `user_projects`), not every project in the account.
16. As a `team_lead` or `team_member`, I can View and Export documents, but I do not see Capture/Add, Edit, or Retire/Restore actions — the page is read-only for me.
17. As a `team_lead` or `team_member`, I can see a document's Signatories tab (who signed, when, their role) read-only, same as the higher-tier oversight register — no ability to sign, reorder, or reassign.
18. As a `team_lead` or `team_member` with no project assignments, I see an empty state on Project Documents, not an error.
19. This project-tier read-only access exists in Simulator too, for the Simulator-equivalent `team_lead`/`team_member` roles.

## d) Implementation decisions

- **No new approval/signature step.** Read-only oversight only — confirmed with the user; rejected both "escalation co-sign" and "override/re-approve" alternatives.
- **Own-branch scoping, not org-wide-for-everyone** — confirmed with the user. PMO Admin is the only org-wide role here (by virtue of sitting above all portfolios).
- **All statuses shown, with a filter** — confirmed with the user (not restricted to fully-signed only).
- **New dedicated page**, not a scope-switcher bolted onto the existing per-project "Project Documents" page — confirmed with the user.
- **Build Platform and Simulator together in this pass** — confirmed with the user (parity rule 34.1/34).
- Scoping data model (Platform, `public` schema — confirmed via existing table reads):
  - Portfolio Manager → `portfolio_members` (`user_id`, `member_role = 'portfolio_manager'`, `assignment_status = 'active'`) → `portfolio_id` set → `portfolio_projects` → `project_id` set.
  - Programme Manager → `programme_members` (`user_id`, `member_role = 'programme_manager'`, `assignment_status = 'active'`) → `programme_id` set → `programme_projects` → `project_id` set.
  - PMO Admin → all projects in the account (`account_id` scoping, same as other PMO-tier pages).
  - Simulator equivalents to be confirmed by exploration during planning (likely `practice_portfolio_members`/`practice_programme_members` + `practice_portfolio_projects`/`practice_programme_projects`, matching the `practice_` prefix pattern already seen in `processTemplateSignatoryService.js`).
- Document source: `pm_template_nodes` where `domain = 'process_template'`, `scope_entity_type = 'project'`, `is_current = true`, `scope_entity_id IN (<scoped project set>)`, joined to signatory status (reusing `getDocumentSignatories` / `isDocumentFullySigned` logic from `processTemplateSignatoryService.js` — no new signatory data model needed, this feature only adds a cross-project *view* over existing data).
- Menu items registered via `menu_items` + `role_menu_items` (existing mechanism — CLAUDE.md rule 25.1, no hardcoded nav), one entry per tier section (Portfolio/Programme/PMO), all pointing at the same underlying page component parameterised by tier.
- Reuses existing shared list/table components (`@nidus/ui` sortable table, `TableRowNumberHeader`/`Cell`, `useViewMode`, `ExportListMenu`) — no new table primitives.
- Row click opens the existing document detail page in its current read-only/"View" mode — no new detail page.
- **Project-tier read-only access (`team_lead`/`team_member`) reuses the existing "Project Documents" page — no new page.** Confirmed with the user: this is scoped to "documents for that project only where they have been assigned as a member," i.e. project-tier, not a cross-project rollup like the Portfolio/Programme/PMO half of this feature.
- Role targeting: `team_lead` and `team_member` specifically (the exact role names from `SQL/v12_seed_data_rbac.sql`) — not `stakeholder`/`viewer`, which weren't named in the request. Can be extended later the same way if needed.
- Menu grant: new `SQL/v897_*` insert into `role_menu_items` for `plat_pm_project_documents` / `sim_pm_project_documents`, granting `team_lead`/`team_member` (mirroring the pattern already in `v849_pm_project_documents_menu.sql`).
- Project scoping for these two roles: the page's project selector/context must filter to `user_projects` membership for the current user — reuse whatever existing hook already does this for other project-scoped pages (e.g. `usePlatformProjectId()` per rule 16.1) rather than a bespoke query; confirm during planning whether the project selector already does this filtering for all roles or needs a role-specific branch.
- Read-only gating: add a role check (via existing role-resolution hook/util, not a new one) that hides Capture/Add/Edit/Retire/Restore controls on both the Project Documents list and the document detail page for `team_lead`/`team_member` — same visual mechanism already used for `fullySigned` (`<fieldset disabled>` on the detail form), extended to also disable when the viewer's role is read-only-tier, not just when the document itself is fully signed.
- No RLS changes needed — `pm_template_nodes_select` is already account-wide read; this is a menu-grant + UI gating change only.

## e) Testing decisions

- Unit tests for the new scoping service function(s) (portfolio/programme/PMO project-set resolution) — mocked Supabase query builder, matching the existing `chainable()` test pattern used throughout `packages/shared/src/services/__tests__/`.
- Unit tests for the register's status-filter and search logic.
- No new E2E/browser test infra introduced; manual verification in-browser per role (PMO Admin, Portfolio Manager, Programme Manager, Team Lead, Team Member) is part of "done."
- Manual verification that a `team_lead`/`team_member` cannot reach Capture/Edit/Retire actions even via direct URL (not just that the buttons are hidden) — a quick check, not a new automated suite.

## f) Out-of-scope

- Any new approval/co-sign/override action — explicitly rejected in the interview.
- Editing documents from either the new register or Project Documents by these roles — view-only, links out to the existing document page.
- Changing the existing per-project "Project Documents" page's behaviour for `project_manager`+ roles — untouched; only new roles and their read-only gating are added.
- Executive/Sponsor/Stakeholder/Viewer role access — not requested; can be added later as a follow-up if needed, following the same pattern.
- Notifications/alerts for stuck-pending documents — not requested; oversight is pull (the user opens the page), not push.

## g) Further notes

- Exact Simulator table names for portfolio/programme membership need confirming during the planning/exploration pass (not yet verified in this PRD — flagged above).
- Menu placement wording ("Document Oversight" working title) and icon are implementation-plan details, not locked here.
- This PRD now covers both directions of cross-tier visibility: higher tiers looking down (new Document Oversight register, Portfolio/Programme/PMO) and lower tiers looking at their own project (extended read-only access on the existing Project Documents page, team_lead/team_member). Both are read-only, both reuse the existing signatory data model — the difference is only in scope (cross-project rollup vs. single project) and which page hosts it (new page vs. existing page).
