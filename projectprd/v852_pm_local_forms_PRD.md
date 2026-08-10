# v852 — PM Local Forms (Portfolio / Programme / Project-created Forms) — PRD

**Repo:** `E:\project-nidus` (Platform + Simulator monorepo). No Admin-app SQL required except the ID-generation rule seed noted in Implementation Decision D7 (`E:\project-nidus-admin\SQL\`).
**Companion plan:** `projectplan/v852_pm_local_forms_plan.md`
**Status:** Implemented (see `projectplan/v852_pm_local_forms_plan.md` — SQL versions v853/v853b/v854 + Admin v201).

---

## a) Problem statement

Today, only PMO Admins can author a form's schema from scratch (`FormTemplateBuilder.jsx`, gated by `is_user_pmo_admin` RLS on `form_templates`). A Portfolio, Programme, or Project Manager can only:

1. **Layer policy** on top of the one shared master template (`form_template_field_overrides`/`_additions`) — enable/require/relabel existing fields, or bolt on a handful of extra fields. They can never remove/reorder master fields or build an independent schema.
2. **Fork/copy** an entire existing Global or Organisational template into their own project-scoped duplicate (`pm_template_nodes` + `copyTemplateNodeForAccount`) — but always starting from something that already exists. There is no "blank canvas."

Neither path lets a PM stand up a genuinely new, purpose-built form for their own portfolio/programme/project — e.g. a lightweight weekly status form, a bespoke risk intake sheet for one programme, or a stakeholder feedback form nobody at PMO level has ever needed — without first finding something close enough to copy and hacking it down.

Separately, research for this PRD surfaced an existing usability gap: `FormsGallery.jsx` (the "start a new form" picker) lists every visible `form_templates` row with no tier/nearest-copy resolution, unlike the Organisational Templates page (v824). Left unfixed, local forms would make this picker actively worse — cluttered with every PM's local forms mixed in with masters and unrelated copies.

## b) Solution

Extend the existing node-fork copy mechanism (`pm_template_nodes` + `form_templates` + `form_template_versions`) — already used by Organisational Templates (v824) and Project Templates (v844) — with a **blank-origin option** alongside the existing "copy an existing template" option. A "local form" is not a new concept or new tables; it is simply a `form_templates` row created with `parent_node_id IS NULL` (no source to copy from) instead of pointing at a Global/Org source, owned by whichever Portfolio/Programme/Project Manager created it, and reachable through the exact same list/detail/builder UI already shipped for Organisational and Project Templates.

Concretely:
- Add a **"Create Blank Form"** action next to the existing **"Copy Template"** action on `OrganisationalTemplatesPage.jsx` (both the org-wide `/platform/templates/organisational` view and the project-scoped `/platform/templates/project` view, per v844's `listVariant`).
- Broaden the write-permission population from the single owner-column pattern to the formal RBAC role (`roles.role_name IN ('Project Manager','Portfolio Manager','Programme Manager')`) combined with entity membership — see Implementation Decision D2 for the tier-by-tier reality of this.
- Local forms are **visible to the whole project/entity team** (same visibility as every other tier-cascade row today), not private to their creator.
- Local forms **cascade down the hierarchy** using the same nearest-tier resolution (`resolveNearestTierPerFamily`) that Organisational/Project Templates already use — a Programme-level local form is visible/usable at that Programme and its descendant Projects, unless a Project has its own local form which takes precedence, exactly like today's Org Template cascade.
- Fix `FormsGallery.jsx`'s "start a new form" picker to apply the same nearest-tier resolution, so PMs see one deduped list instead of every copy anyone has ever made.
- Migrate `form_templates.template_code` generation off the ad-hoc `F`+number regex scan and onto `admin.generate_display_id` (CLAUDE.md rule 16.2), since local forms create rows through the exact same code path as existing copies.

## c) User stories

1. As a Project Manager, I can click "Create Blank Form" from my project's Project Templates page and get a new, empty form with zero sections/fields to build out myself.
2. As a Project Manager, I can add, remove, reorder, and configure sections and fields on my blank local form using the same builder UI PMO Admins use for master templates.
3. As a Project Manager, once I've built my local form, other members of my project team can see it and fill it out — I don't have to individually share it.
4. As a Project Manager, my local form gets its own `template_code`/display ID (via Admin ID Generation) and shows up in my project's "start a new form" picker (`FormsGallery.jsx`) alongside masters and other applicable templates, without duplicate/confusing entries.
5. As a Portfolio Manager, I can create a blank local form scoped to my portfolio (e.g. a portfolio-level reporting form), and it becomes visible/fillable at that portfolio.
6. As a Portfolio Manager, a local form I create cascades to the Programmes and Projects under my portfolio (unless a descendant tier has created its own local form of that same lineage, in which case the descendant's own copy wins — same precedence rule as Organisational Templates).
7. As a Programme Manager, I have the equivalent of stories 5–6 at my tier.
8. As a Project/Portfolio/Programme Manager, I can still use the existing "Copy Template" action to fork an existing Global/Org template instead of starting blank — both origins produce the same kind of form_templates row and are managed through the same UI afterward.
9. As a Project/Portfolio/Programme Manager, I can edit my local form's schema after it has instances filled out — new edits create a new `form_template_versions` row (existing versioning behavior), so already-submitted instances remain tied to the version they were filled under.
10. As a Project/Portfolio/Programme Manager, I can delete/archive a local form I created (existing tier-cascade deletion rules — I can only remove what my own tier added).
11. As a PMO Admin, I can see every local form created across the organisation (all tiers, all accounts I administer) via the existing unfiltered `/app/pmo/organisational-templates` view — no new oversight page is needed since these rows already surface there.
12. As a PMO Admin, I can distinguish a "blank-origin" local form from a "copied" template in the list/detail UI (e.g. an origin badge), so governance conversations ("did this PM start from our standard or build their own?") are answerable at a glance.
13. As a Project Manager without the "Project Manager" role on a given project, I cannot create a local form there (RLS-enforced, not just UI-hidden).
14. As a Simulator Project Manager, I have the equivalent of stories 1–4, 8–10, 13 at project tier only (Simulator has no Portfolio/Programme entities — PMO + Project tier only, matching existing Simulator scope limits).
15. As any user filling out a form via `FormsGallery.jsx`, I see one deduped, nearest-tier-resolved list of applicable templates for my project (masters + org templates + local forms), not a flat dump of every `form_templates` row I have access to.

## d) Implementation decisions

**D1 — Core mechanism:** Extend the node-fork copy system (`pm_template_nodes`/`form_templates`/`form_template_versions`, `copyTemplateNodeForAccount`), not the override-layering system, and not a new third system. A blank-origin local form is a `form_templates` row with `parent_node_id IS NULL` on its `pm_template_nodes` row (no new "origin" column needed — absence of a parent is the signal) and `form_template_versions.schema = { sections: [] }` at version 1.

**D2 — Ownership/write-permission model:** Formal RBAC role (`roles.role_name`), not the single owner-column pattern used elsewhere in the cascade. Tier-by-tier reality, discovered during research:
- **Project tier:** genuinely broadened. A new helper, `public.auth_user_has_project_manager_role(project_id)`, checks `role_name = 'Project Manager'` scoped via `project_memberships`/`user_roles` — the same join pattern already used in `v164`/`v185`/`v191`/`v193`/`v195` RLS policies. Any user with that role on that project can create a local form there, not just the single `projects.project_manager_user_id`.
- **Portfolio/Programme tier:** no dedicated membership table exists at these tiers today — only the single `portfolio_manager_user_id`/`programme_manager_user_id` columns (confirmed absent: no `portfolio_memberships`/`programme_memberships` table in the schema). For this PRD, Portfolio/Programme local-form creation is gated by **that same single owner-column match** (as `can_manage_pm_template_node` already does), with an additional `role_name` check as defense-in-depth. This means Portfolio/Programme local forms are **not** actually broadened beyond today's population — flagged transparently here since the "Formal RBAC role" answer's effect differs by tier. Building real portfolio/programme membership tables to broaden this further is out of scope (see Out-of-scope, O1).
- A **new** permission function, `public.can_create_local_form(account_id, tier, scope_entity_type, scope_entity_id)`, encapsulates this (PMO Admin OR the tier-specific check above). It is deliberately **not** a modification of `can_manage_pm_template_node` — that function is shared by the `fields`/`opa`/`process_template` domains too, and broadening it would silently expand permissions outside this feature's scope (CLAUDE.md rule 32, don't refactor unrelated modules).
- `form_templates` INSERT RLS currently only checks `created_by = auth.uid()` + account access (no tier/scope check at all — a real existing gap). For local-form inserts specifically, the app-level flow calls `can_create_local_form` before attempting the insert; the underlying `pm_template_nodes` insert (which does enforce tier/scope via its own RLS) remains the authoritative guard, matching today's existing two-step insert pattern in `copyTemplateNodeForAccount`.

**D3 — Visibility:** Visible to the whole project/entity team (existing account/project-scoped SELECT policies), not creator-private. No new visibility model needed.

**D4 — Cascade:** Local forms cascade down the hierarchy via the existing `resolveNearestTierPerFamily` nearest-tier resolution (v824) — same precedence as Organisational Templates (Org → Portfolio → Programme → Project, closest wins).

**D5 — UI integration:** No new page or menu entry. Add "Create Blank Form" to `OrganisationalTemplatesPage.jsx`/`OrganisationalTemplateDetailPage.jsx` (and Simulator's mirrors), reusing the existing list/detail/builder routing. For project-tier local forms, the existing "manage" route (`resolveFormTemplateManagePath`) currently sends project-tier copies to `TierFormPolicyPanel` (policy-only, assumes a pre-existing schema) rather than the full `FormTemplateBuilder` schema editor — this routing needs a branch so **blank-origin** project-tier forms route to the full builder (schema authoring), while **copied** project-tier forms keep routing to the policy panel as they do today.

**D6 — FormsGallery fix (in scope):** Apply `resolveNearestTierPerFamily`-equivalent resolution to `FormsGallery.jsx`'s template picker so it returns one deduped, nearest-tier list per project instead of every visible `form_templates` row.

**D7 — `template_code` generation (in scope):** Replace the ad-hoc `F${n}` full-table-scan-and-regex logic in `duplicateFormTemplateRow`/`pmTemplateCopyService.js` with `admin.generate_display_id`, mirroring the `pm_template_nodes.template_reference` pattern (`SQL/v811`): add a companion `admin.id_generation_rules` seed for `public.form_templates`/`sim.form_templates` in `E:\project-nidus-admin\SQL\` (new versioned file, e.g. `v198_form_templates_id_generation_seed.sql`, abbreviation `FRM`), wire `trg_apply_admin_display_id('public.form_templates','template_code')` (and `sim.` mirror) as an `AFTER INSERT` trigger, and update `pmTemplateCopyService.js`/the new blank-creation function to insert with `template_code = ''` and let the trigger assign it (per rule 18.2). This affects **all** future form_templates copies, not just local forms, since they share the same code path — existing `F0xx` rows are left untouched (no backfill/renumbering of already-issued codes).

**D8 — Origin distinction in UI:** Add a small "Blank" vs "Copied from: <name>" badge on the template detail page, derived from whether `pm_template_nodes.parent_node_id IS NULL` — no new column required.

**D9 — Simulator parity:** Applies at Project + PMO tier only (Simulator has no Portfolio/Programme entities — documented, pre-existing scope limit, not a parity gap). Mirror every Platform change in `packages/modules/sim-pmo-module/` and `sim.*` SQL.

## e) Testing decisions

- **RLS/permission unit coverage:** `can_create_local_form` (public + sim) — PMO Admin always allowed; Project Manager role-holder allowed on their project, denied on a project they don't hold that role on; Portfolio/Programme Manager allowed only via the existing owner-column match; system-synced nodes always denied.
- **Service-level tests:** new blank-creation function (parallel to `copyTemplateNodeForAccount`) — creates `pm_template_nodes` with `parent_node_id = NULL`, `form_templates` with empty schema, `form_template_versions` v1; duplicate-guard behavior (can a PM create two blank forms at the same scope? — see Out-of-scope O2 for whether this is limited).
- **Cascade resolution tests:** `resolveNearestTierPerFamily` extended test cases — a Portfolio-level local form resolves at a descendant Project when the Project has no local form of its own; a Project-level local form takes precedence over its ancestor Portfolio's local form.
- **FormsGallery picker tests:** dedup/nearest-tier behavior with a mix of master + org-copy + local-form rows in scope.
- **`template_code` generation tests:** concurrent-creation race no longer produces duplicate codes (the exact bug class the old regex-scan approach was exposed to); trigger fires correctly on both blank-creation and copy-creation paths.
- **UI/manual:** confirm "Create Blank Form" button appears only for RBAC-eligible users (Playwright/Vitest + manual verification per rule "UI or frontend changes... test in a browser"); confirm origin badge renders correctly; confirm project-tier blank forms route to the full builder while copies still route to the policy panel.
- **"Done" bar:** a Project Manager can create a blank form, build a 2-section/5-field schema, have a teammate fill out an instance via `FormsGallery.jsx`, and a PMO Admin can see the form (with a "Blank" origin badge) in the unfiltered Organisational Templates view — end to end, Platform and Simulator (project-tier).

## f) Out-of-scope items

- **O1 — Portfolio/Programme membership tables.** Building `portfolio_memberships`/`programme_memberships` to genuinely broaden local-form creation beyond the single owner-column at those tiers is a separate, larger effort (would also affect `can_manage_pm_template_node` and every other tier-cascade permission check) — not part of this plan.
- **O2 — Quotas/limits on number of local forms per PM/entity.** No cap is introduced; if this becomes a problem operationally, a follow-up can add one.
- **O3 — Private/creator-only visibility.** Explicitly decided against (D3) — not building any new visibility model.
- **O4 — Backfilling `template_code` for existing `F0xx` rows onto the new ID-generation scheme.** Existing codes are left as-is; only new rows (from this plan onward) use `admin.generate_display_id`.
- **O5 — GitHub issue / tracer-bullet breakdown of this PRD** (CLAUDE.md rule 17.2). Not produced in this pass — can be requested separately once the plan is confirmed.
- **O6 — Export/PWA/row-numbers/theme adoption for any genuinely new list surface.** Since D5 reuses existing pages (already theme-aware, exportable, PWA-ready, row-numbered per rules 28.1/38/39/44), no new surface-level work is anticipated here; if the implementation phase finds a net-new component is unavoidable, those rules apply to it at that time.

## g) Further notes

- This PRD deliberately does **not** touch `form_template_field_overrides`/`_additions` (the override-layering system) — a local form's own fields are edited directly in its own `form_template_versions.schema`, not layered on top of anything.
- The `form_templates` INSERT RLS gap noted in D2 (no tier/scope check at the `form_templates` table level, only at `pm_template_nodes`) pre-dates this feature and affects the existing copy flow too; this plan does not fix it broadly, only ensures the new blank-creation path is gated correctly at the application layer plus the `pm_template_nodes` insert.
- `RequireRole` (`packages/ui/src/RequireRole.jsx`) is a **UI-only** gate (checks role name client-side, no scope/entity awareness) — it can hide/show the "Create Blank Form" button but must never be treated as the security boundary; `can_create_local_form` (RLS) is the actual enforcement, consistent with how every other tier-cascade write is already gated in this codebase.