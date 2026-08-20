# v871 — System-Wide Audit Tab on Every Record Form — PRD

**Repos touched:** `E:\project-nidus` (Platform + Simulator) and `E:\project-nidus-admin` (Admin — separate plan, see that repo's `projectplans/v203_system_wide_audit_tab_plan.md`).
**Status:** Interview complete (9 decisions confirmed with user, one question at a time, per CLAUDE.md rules 56–60). Form census complete (Platform, Simulator, Admin). Implementation checklist follows in the plan file(s).

---

## a) Problem statement

Two things already exist in this codebase but only in isolated pockets:

1. A shared "Audit details" UI pattern (`AuditField`, `AuditCard`, `AuditDetailsPanel`, `DetailAuditTabList` — mirrored in `@nidus/ui` for Platform/Simulator and `@nidus-admin/ui` for Admin) showing who created/changed a record, when, and how it's classified.
2. CLAUDE.md rule 63 already **mandates** this pattern, but only for Template/Form *builder* surfaces (`OrganisationalTemplateDetailPage.jsx` and equivalents) — a narrow slice of the system. One ordinary business-record form, `IssueForm.jsx` (Platform + Simulator), independently grew its own Audit tab using a hand-rolled tab mechanism rather than the shared `DetailAuditTabList` component.

Everywhere else — an estimated 140+ record-CRUD forms in Platform, a matching ~140+ in Simulator, and Admin's page-based CRUD surfaces — there is no Audit tab at all. A user editing a Risk, an Issue, a Change Request, a resource record, or any of dozens of other record types has no way to see, from within that record's own form, who created it, who last changed it, or what its lifecycle/authorisation state is. That information often exists in the database (`created_by`/`created_at`/`updated_by`/`updated_at`, and for governed records `authorised_by`/`authorised_at`, `record_status`) — it's just never surfaced.

Separately, there's no standing rule that a **new** form must include this tab, so the gap keeps growing every time a new record type ships (confirmed: `TierFormPolicyPanel.jsx`, `SignatoriesPanel.jsx`, and other forms built earlier in this project's history don't have one).

## b) Solution

A single, uniform Audit tab added to every record-CRUD form across all three systems, in one coordinated rollout (not phased):

- **Same fixed 3-card structure everywhere**: Identity / Classification / Record history, with each card's individual fields adapted to whatever that record type actually has (mirrors the pattern already proven on `OrganisationalTemplateDetailPage.jsx` and `IssueForm.jsx`).
- **Same tab mechanism everywhere**: the shared `DetailAuditTabList` component (Platform/Simulator: `@nidus/ui/DetailAuditTabList`; Admin: `@nidus-admin/ui`'s equivalent) — including retrofitting `IssueForm.jsx`'s existing hand-rolled tab onto this shared component.
- **Metadata only** — record identity/classification/history, not a field-level change log (no old-value→new-value diffing; the codebase's existing audit-log tables — `audit_trails`, `pmo_audit_log`, `audit_log` — are fragmented and mostly unpopulated, and building a comprehensive change-log system is a separable, much larger effort deliberately kept out of scope here).
- **Every database-backed create/edit form** is in scope, including simple reference/lookup/config-data admin screens — not just substantive business records.
- **Visible in create mode too**, showing a "Audit details appear after this record is saved" placeholder until the record exists (matches `IssueForm.jsx`'s existing behaviour).
- A new CLAUDE.md rule (both repos) makes this mandatory for every new/amended record form going forward, enforced the same way every other rule in this codebase is enforced — by being written down and followed, not by new tooling.

## c) User stories

1. As a user editing an existing Risk/Issue/Change/Project/etc. record (or any other record-backed form, including admin reference-data screens), I see an "Audit" tab alongside the form's main content tab(s).
2. As a user creating a brand-new record, I still see the Audit tab, showing a placeholder message until I save.
3. As a user on the Audit tab, I see an Identity card (display ID, name/title, current status — whichever apply to this record type).
4. As a user on the Audit tab, I see a Classification card (type/category/tier/scope — whichever apply).
5. As a user on the Audit tab, I see a Record history card: who created this record and when, who last updated it and when, and — where the table has these columns — who deleted/authorised/rejected it and when.
6. As a user on the Audit tab of a governed record (rule 53 lifecycle), I can see its authorisation history (`authorised_by`/`authorised_at`) alongside the standard create/update history.
7. As a user, the Audit tab looks and behaves identically (same tab styling, same click behaviour) no matter which of the 300+ forms I'm looking at.
8. As a developer/AI agent building a brand-new record form after this rollout, CLAUDE.md tells me to include the Audit tab as a standard part of any new form, the same way it already tells me about dark-mode support, row numbers, and unsaved-changes guards.
9. As a developer/AI agent, `IssueForm.jsx`'s pre-existing Audit tab now uses the same shared `DetailAuditTabList` mechanism as every other form, rather than being a one-off implementation to remember as an exception.

## d) Implementation decisions

Decided through the mandatory one-at-a-time interview (CLAUDE.md rules 56–60):

| # | Decision | Chosen |
|---|----------|--------|
| 1 | Audit tab depth | **Metadata only** (Identity/Classification/Record history) — not a field-level change log. The unpopulated `audit_trails`/`pmo_audit_log`/`audit_log` tables are a separate, future concern. |
| 2 | Rollout strategy | **One big-bang implementation** across all three systems, not phased batches. |
| 3 | Form scope (kind) | **Only true record-CRUD forms** — components that create/edit/view a single persisted database record. Filter panels, export/print dialogs, confirm-only prompts, generic UI utility modals, in-form picker widgets, and multi-record bulk-action modals are excluded. |
| 4 | Form scope (breadth) | **Every database-backed create/edit form, no exceptions** — including simple reference/lookup/config-data admin screens, not just substantive business records. |
| 5 | Tab mechanism | **Standardise on the shared `DetailAuditTabList` component** everywhere, including retrofitting `IssueForm.jsx` off its own hand-rolled tab state. |
| 6 | Create-mode behaviour | **Tab always visible**, placeholder text ("Audit details appear after this record is saved") until the record has been saved once — matches `IssueForm.jsx` today. |
| 7 | Card structure | **Fixed 3-card structure everywhere** (Identity / Classification / Record history) with per-record-type field adaptation — not a variable structure per form type. |
| 8 | Enforcement | **Documented CLAUDE.md rule only** — no new automated coverage-checking script/CI gate. Same enforcement model as every other existing rule in this codebase. |
| 9 | Testing | **Component tests on a representative sample per system** (a handful of flagship forms in Platform, Simulator, and Admin) to prove the shared pattern works — not a dedicated Audit-tab test for all 300+ forms individually. |

## e) Testing decisions

- Full Audit-tab component tests for representative flagship forms: at minimum `IssueForm.jsx` (Platform + Simulator, since it's being retrofitted from a working hand-rolled implementation — highest regression risk), plus one governed-record form (to prove the authorisation-history fields render), plus one simple reference-data admin form (to prove the pattern scales down cleanly), plus one Admin-repo form.
- Regression: re-run `IssueForm`'s existing test suite after the retrofit to confirm no behavioural change to the main (non-audit) form content.
- No dedicated test per remaining form — those are covered by whatever tests already exist for that form's core functionality; the Audit tab itself is a thin, uniform wrapper around already-tested shared components.

## f) Out of scope (for this version)

- Field-level change history / before-after diffing (decision 1). A future PRD could consolidate the existing fragmented `audit_trails`/`pmo_audit_log`/`audit_log` tables into one coherent, comprehensively-triggered change-log system and surface it as a 4th card or expandable section — deliberately not attempted here.
- Any automated "coverage check" tooling verifying every form has the tab (decision 8).
- Per-form dedicated automated tests beyond the representative sample (decision 9).
- Changes to the underlying database schema — this feature only *displays* columns that already exist (`created_by`, `created_at`, `updated_by`, `updated_at`, and where present `deleted_by`/`deleted_at`, `authorised_by`/`authorised_at`, `record_status`). If a specific table is missing `updated_by`/`updated_at` entirely, adding those columns is out of scope for this pass (the Record history card simply omits fields that don't exist for that table) — noted as a per-table gap in the implementation checklist where found, not silently backfilled.

## g) Further notes

- This directly extends rule 63's existing pattern rather than inventing a new one — the same shared components, just applied far more broadly.
- The exact, complete list of in-scope forms across Platform, Simulator, and Admin is being generated via systematic codebase census (three parallel research passes) rather than estimated — the implementation plan's checklist is the authoritative, checkable list once that lands.
- Admin's rollout is documented as its own plan in that repo (per the standing repo-scoped SQL/plans convention) but follows the identical decisions 1–9 above — there is one shared PRD (this document) informing two plan files.
