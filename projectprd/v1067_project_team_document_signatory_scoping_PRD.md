# v1067 — Project & Team-Scoped Document Signatory Configuration (PM + Team Manager)

**Status:** Draft — pending user approval before implementation plan is enacted.
**Requested by:** Oscar Mbira (PMO Admin), 2026-09-18.
**Related:** `SQL/v868_process_template_signatories_tables.sql`, `v873_signatory_slot_is_mandatory.sql`,
`v880_scoped_signatory_requirements.sql` (+ `v880b`, `v880c`), `v893`, `v898`.
`packages/shared/src/services/processTemplateSignatoryService.js`.
`packages/modules/pmo-module/src/pages/SignatoryRequirementsPage.jsx` (existing PMO page — not modified by this PRD).

---

## a) Problem statement

PMO Admin already has a working "Document Signatory" configuration screen
(`/app/pmo/signatory-requirements`) that lets them define, per document type (Project Charter,
Cost Baselines, Activity Duration Estimates, etc.), an ordered list of role-slots that must sign
a document before it locks. The underlying schema and RLS (v880) already support overriding that
Organisation default at Portfolio, Programme, or Project level — a Project Manager's account can
already legally write a Project-scope override today, and a menu grant for the `project_manager`
role already exists (`v880b_scoped_signatory_menu_grants.sql`). But there is no menu entry for
this in the PM sidebar, and even if there were, the existing page is a generic PMO-admin tool: it
shows an Organisation/Portfolio/Programme/Project scope switcher and a free picker across every
project in the account — not something appropriate to hand a Project Manager, who should only ever
be looking at their own project.

Separately, a **Team Manager/Lead** (a project role tracked per-project, not a single owning column
like `projects.project_manager_user_id`) has no way to influence signatory requirements at all
today — not even for the specific team members on the team(s) they lead within a project. The
concept of "my team" for signatory purposes did not exist as a resolvable scope level before this
PRD, though the underlying data already does: the existing `teams` table already has a
`team_lead_user_id` column — a direct FK exactly analogous to `projects.project_manager_user_id` —
plus a `team_members` roster (`team_id`, `user_id`), both live and in use elsewhere in the app
(`teamService.js`). (An earlier draft of this PRD proposed inferring "team" from
`team_member_appointment_records.reporting_to_user_id` instead; that was corrected once the
purpose-built `teams`/`team_members` tables were found — see Implementation decision #3.)

This PRD closes both gaps: a project-scoped, simplified page for Project Managers, and a new
team-scoped configuration layer for Team Managers/Leads — both reachable from the PM sidebar
instead of the PMO admin tree.

## b) Solution

1. **New scope level: `team`.** Extend the existing scope hierarchy
   (`organisation → portfolio → programme → project`) with a narrower `team` level, sitting
   between `project` and the document's effective/default requirements. Resolution order for a
   document becomes: **team → project → programme → portfolio → organisation** (first policy found
   wins, same "first policy wins" mechanics `pickEffectiveSignatoryLevels()` already implements —
   just one more level prepended).

2. **What "team" means.** Reuses the *already-existing* `teams` / `team_members` tables (Platform)
   and their Simulator equivalents. A "team" = one row in `teams` (per project, with its own
   `id` and a `team_lead_user_id`); its roster is the matching `team_members` rows. `teams.id` is
   used directly as the signatory scope's `scope_id` — since it already uniquely identifies "this
   team on this project," no extra project-disambiguation column is needed (a person leading teams
   on two different projects simply leads two different `teams` rows with two different ids). A
   team member who isn't on any team simply isn't covered by a team-scope override at all — their
   documents resolve starting at project scope, same as if no team level existed. No new
   team-roster table is introduced; `teams`/`team_members` already are the roster.

3. **One new, adaptive page** (not the existing generic PMO page, and not two separate pages).
   Reached from the PM sidebar's **Project Setup** section (new sibling item next to Project
   Charter / Business Case / Project Brief / PIDs / Benefits Review Plans), scoped to the PM area's
   *current project* (via `usePlatformProjectId()`/`readCurrentPmProjectId()`, matching every other
   Project Setup page) — no free org-wide project picker, no Organisation/Portfolio/Programme scope
   switcher.
   - If the viewer is the **Project Manager** of the current project: sees and can edit the
     **project-scope** override (inherit / none / custom) for whichever document types they pick —
     functionally the same mechanics as today's PMO page's Project scope, just pre-locked to this
     project.
   - If the viewer **leads a team** on the current project (`teams.team_lead_user_id` = them, for
     one or more active teams on this project): sees a **read-only** summary of the project-level
     (PM-defined or inherited) requirements, plus a full **team-scope** editor (inherit / none /
     custom) per team they lead, that only affects documents/signing chains for that team's
     members.
   - A person who is both (e.g. a PM who is also directly leading a sub-team) sees both sections.
   - Nobody else (a plain Team Member, Project Assurance, etc.) sees this menu item at all.

4. **RLS.** Extend `public.can_manage_signatory_requirements()` (and the Simulator equivalent) to
   also grant `scope_type = 'team'` writes when the caller is that team's active
   `team_lead_user_id` (`scope_id` = `teams.id`, so the check is a direct existence lookup — "is
   there an active, non-deleted `teams` row with this id whose `team_lead_user_id` maps to the
   calling auth user"). Existing `organisation`/`portfolio`/`programme`/`project` behaviour is
   unchanged.

5. **Platform + Simulator together**, since Simulator already carries equivalent team/team-lead
   tables and the `sim`-schema signatory tables already exist (`v880c`). Both are covered by the
   same implementation plan; the plan will confirm Simulator's exact table names before writing SQL.

## c) User stories

1. As a Project Manager, when I open my project in the PM area, I can find "Document Signatory"
   under Project Setup, next to Project Charter and Business Case.
2. As a Project Manager, opening that page shows document types for **my current project only** —
   I never see an Organisation-wide editor or a picker for other people's projects.
3. As a Project Manager, for a document type I pick, I can choose **Use parent** (inherit
   Programme/Portfolio/Organisation default), **No signatories**, or **Custom list**, and edit an
   ordered list of role-slots — identical mechanics to today's PMO "Project" scope option, just
   without the extra scope-type switcher.
4. As a Project Manager, if I try to reach this page for a project I do not manage, I am blocked
   (RLS already enforces this; the page itself should not offer navigation to projects I don't
   manage in the first place, since it never shows a project picker).
5. As a Team Manager/Lead of one or more teams on a project, I can find and open the same "Document
   Signatory" page from the PM sidebar for that project.
6. As a Team Manager/Lead, I see the current effective project-level requirement (what the PM
   configured, or "inherits from Programme/Portfolio/Organisation") **read-only** — I cannot change
   it.
7. As a Team Manager/Lead, I can configure a **team-scope** override (inherit / none / custom) for
   document types, per team I lead, and this override applies **only** to documents associated with
   that team's members (`team_members` roster for that `teams.id`).
8. As a Team Manager/Lead who leads more than one team on the same project, I see a separate
   team-scope editor per team I lead (each with its own `teams.id` as scope), not one combined
   editor.
9. As a team member who isn't on any team, my documents resolve starting at project scope directly
   — no team-scope override ever applies to me.
10. As someone who leads no team on any project, I do not see the team-scope editor section at all
    — only the read-only project summary, if I even have access to the page (I would not, unless
    `teams.team_lead_user_id` names me on that project).
11. As anyone starting a document's signing round, the effective signatory list is resolved in
    order team → project → programme → portfolio → organisation, exactly mirroring the existing
    `resolveEffectiveSignatoryRequirements()` algorithm with one more level prepended.
12. As a PMO Admin, nothing about the existing `/app/pmo/signatory-requirements` page, its
    Organisation-scope behaviour, or its Portfolio/Programme scope options changes.
13. As a Simulator user in the equivalent Project Manager / Team Manager role on a practice
    project, I get the same page and behaviour, scoped to `sim.*` tables.

## d) Implementation decisions (settled during interview)

1. **New page, not the reused generic PMO page** — project-locked, no scope-type switcher exposed
   to PM/Team Manager, no free org-wide project picker.
2. **Team Manager gets full edit rights at a new `team` scope level**, not just read-only, and not
   "edit document instances" — this is a requirements-configuration feature, matching how
   Project/Programme/Portfolio scope already work.
3. **"Team" = the existing `teams` / `team_members` tables** (Platform) and their Simulator
   equivalents — *not* `team_member_appointment_records.reporting_to_user_id` (corrected mid-build,
   see Problem statement). `teams.id` is used directly as the signatory scope's `scope_id`, which
   also resolves decision #8 below without any extra column. No new roster table. A team member not
   on any team simply has no team-scope override apply to them.
4. **One adaptive page**, single menu entry, sections shown based on the viewer's actual role(s) on
   the current project. A user leading more than one team on the same project sees one team-scope
   editor per team led.
5. **Both Platform and Simulator** covered by the same plan (data-layer parity already exists).
6. **Menu placement:** PM sidebar → Project Setup section, sibling to Project Charter / Business
   Case / Project Brief / PIDs / Benefits Review Plans.
7. **Resolution order:** team → project → programme → portfolio → organisation (extends
   `pickEffectiveSignatoryLevels()` / `resolveEffectiveSignatoryRequirements()`).
8. **Scope identity for `team` rows:** solved by using `teams.id` as `scope_id` — it already
   uniquely identifies one team on one project, so no companion disambiguation column is needed
   (superseding the `team_project_id` idea from the original draft of this PRD).
9. **RLS:** extend `can_manage_signatory_requirements()` (`public` and `sim`) to recognize
   `scope_type = 'team'` writes when the caller is that team's active `team_lead_user_id`, leaving
   all other branches untouched.
10. **No changes to the existing PMO admin page or its menu item** (`plat_tpl_signatory_requirements`
    / `sim_tpl_signatory_requirements`) — this is a net-new page and menu entry, not a modification
    of the PMO one.

## e) Testing decisions

- Unit tests for the extended `pickEffectiveSignatoryLevels()` / `resolveEffectiveSignatoryRequirements()`
  covering: team override present → wins; team inherits, project custom → project wins; team member
  not on any team → team scope never considered, resolution starts at project.
- RLS test coverage (or a documented manual verification checklist, matching how v880's RLS was
  verified) for: PM can write project scope on their own project only; a team lead can write team
  scope only for a team they actually lead; a team lead cannot write another team's scope, or
  project/programme/portfolio/organisation scope; a plain team member cannot write anything.
- Component-level test for the new page's role-aware rendering: PM-only view, Team-Manager-only
  view, both-roles view, neither-role (page/menu not reachable).
- Platform–Simulator parity check: same test matrix run against `sim.*` equivalents.

## f) Out of scope

- Any change to the existing PMO Organisation/Portfolio/Programme admin page or its menu placement.
- Document-instance-level access control (a Team Manager reassigning who signs a specific
  in-progress document) — this PRD is about requirement *configuration*, not live signing-round
  management. (Team Managers already have no such capability today; this PRD does not add one.)
- Any new "team" entity/roster table — deliberately reusing the existing `teams`/`team_members`.
- Building any UI to create teams or assign a team lead — `teamService.js` / existing team
  management UI already covers that; this PRD only consumes `teams.team_lead_user_id` and
  `team_members`, it doesn't add ways to set them.
- Simulator-specific UI differences beyond what's needed for schema parity (e.g. if Simulator's PM/
  Team Manager sidebar structure differs materially from Platform's, the plan will note and adapt,
  not force an identical layout).

## g) Further notes

- The existing menu grant in `v880b_scoped_signatory_menu_grants.sql` (which grants
  `project_manager`/`portfolio_manager`/`programme_manager` roles view/use on the *existing* PMO
  menu item) is unrelated to this PRD's new menu item and is left as-is; it is not undone or reused.
- `can_manage_signatory_requirements()`'s existing portfolio/programme/project branches are proven,
  working code (six months of production RLS) — the team-scope extension will follow the same shape
  (a `SECURITY DEFINER` boolean function checked from `USING`/`WITH CHECK`) rather than inventing a
  different pattern.
