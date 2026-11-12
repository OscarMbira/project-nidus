# v1340 — Core PM waves 2–4: Audit & Custom Fields tabs, Policies → register engine, hidden fields — PRD

**Status:** Approved for implementation by the owner on 2026-11-12 ("continue to implement the plan until all waves have been completed 100%; I will run the SQL files at the end").
**Source:** `Documentation/Core_PM_Fields_and_Sample_Data_Audit.md` (waves 1 and 5 already done: SQL v1436–v1442). CLAUDE.md rule 74 (register engine vs hand-built pages).

## a) Problem statement

The Core PM audit flagged three remaining gaps on the hand-built Core PM pages:

1. **Missing tabs.** Some record forms still lack the Audit details tab (rule 63.1), and most hand-built records cannot take organisation-specific fields without a release — only Project, Risk, Issue and Change Request are wired to Local Data Extensions custom fields.
2. **Thin forms on the wrong engine.** Rule 74 says thin hand-built forms move to the register engine. Policies & Compliance is a thin form — and its table has no organisation column, so its read policy ("any authenticated user") lets every organisation see every other organisation's policies (cross-tenant data leak).
3. **Fields stored but never shown.** Several Core PM tables already hold best-practice columns that no screen shows (e.g. 24 on project closures, 24 on lessons learned, 24 on stakeholder communications), so users cannot capture them.

## b) Solution

- **Wave 2a — Audit tab** on the record forms confirmed missing it (verified file by file, not by list page): Contact Directory, Governance members (Steering Committee / Project Board), Control accounts (WBS builder), Project role create, OKR objective and OKR cycle forms, Custom metrics, Baselines. Platform + Simulator copies.
- **Wave 2b — Custom Fields** on the main project-scoped hand-built records, reusing Local Data Extensions as Risk/Issue/Change already do: register a `system_screens` row per record type (public + sim) and mount the existing `CustomFieldRenderer` on the record's detail page.
- **Wave 3 — Policies & Compliance → register engine:** a system PMO-scope local register with best-practice fields and tabs, existing rows copied to their organisation, menu repointed; old table kept read-only for rollback. Fixes the leak.
- **Wave 4 — expose stored-but-hidden fields** on the forms that own those tables (no migrations for those).

## c) User stories

1. As a project manager, I see an Audit details tab on the Contact Directory edit form showing who created and last changed a contact.
2. Same for a Steering Committee / Project Board member.
3. Same for a control account in the WBS builder.
4. Same for a project role created on the Project Roles create page.
5. Same for an OKR objective and an OKR cycle.
6. Same for a custom metric.
7. Same for a baseline.
8. For a brand-new unsaved record the Audit tab shows "Audit details appear after this record is saved".
9. As a PMO admin, I can define custom fields (Local Data Extensions → Field Definitions / Screen Mapping) for Assumptions, Constraints, Milestones, Deliverables, Decisions, Delays, Stakeholders, Benefits, Lessons and Stage Gates.
10. As a project member, those custom fields appear on the record's detail page and save per record.
11. In the Simulator, the same record types (where the Simulator has the same page) show the same custom fields from the `sim` screens.
12. As a PMO admin, Policies & Compliance opens as a register with tabs (Details, Scope & Applicability, Requirements & Controls, Review & Attestation, Notes) and my organisation's policies only.
13. Existing policies are still there after the move, under the organisation of the user who created them.
14. Another organisation can no longer see my policies.
15. As a project manager closing a project, I can record success rating, performance summary, benefits realised, final budget / actual cost / variance, financial and resource closure, documentation archive location and retention on the closure form.
16. On a lesson I can record what worked well, best practices, applicability, supporting evidence, follow-up action / owner / due date / status, and sharing with the organisation.
17. On a follow-on action I can record rationale, expected outcome, assigned team / role, recommended start, required resources, transition to operations and its operational owner, and latest update.
18. On a stakeholder communication I can record summary, content, date/time, recipients, response required / due / summary, effectiveness and confidentiality.
19. On stakeholder engagement I can record tactics, preferred meeting type, information needs, trust level, barriers, mitigation actions, engagement period and status.
20. On stakeholder analysis I can record power / interest descriptions, salience (power, legitimacy, urgency), influence strategy, engagement approach and potential objections.
21. On a change request I can record the date approval is required by.
22. On a mandate dependency I can mark impact during the project / after implementation.
23. On an assumption I can record the impact if invalid and who validated it.
24. On an issue I can record the estimated resolution date.

## d) Implementation decisions

- **D1 — Wave 2a list** is the verified one above; the earlier "74 pages" count was list pages, whose detail forms already have the tab (v871 retrofit is complete).
- **D2 — Wave 2b uses Local Data Extensions** (existing tables, hooks, renderer, admin pages) — no new custom-field system. Screen codes `<entity>_detail`, entity types matching the record table's singular name. Only project-scoped records (custom field values require `project_id`). Vendors (organisation-level) excluded.
- **D3 — Wave 3 scope is Policies & Compliance only.** The other 13 "thin" candidates are linked to other features (project wizard → constraints; test suites → environments; PBS / product descriptions → deliverables; governance approvals → stage gates and decisions; procurement → vendors / ratings / categories; release stories → releases; lessons and daily log have inbound foreign keys; analytics → custom metrics). Rule 74: they stay hand-built until the engine has stronger record links.
- **D4 — Policies register** is a system register (`account_id` NULL, `is_system_defined`), scope `organisation` (amended during build: scope `pmo` would have taken policies away from members who are not PMO admins, who can read them today; the new scope and the organisation isolation policy are added by SQL v1444), register key `core_policies_compliance`, statuses Draft / Active / Under Review / Retired (old `archived` → Retired). Rows are copied with `account_id` = the creator's owned account, else an organisation the creator accepted an invitation to, else the account of a project the creator has a role in; unplaceable rows stay in the old table and are counted. Old table is not dropped; its SELECT policy is tightened to creators only, so the leak closes immediately.
- **D5 — Wave 4 exposes existing columns only**; relation-id arrays (`related_*_ids`, `depends_on_action_ids`, …), URLs managed by uploads and AI/recording internals stay hidden. New fields use existing shared inputs (`MultiLineListInput` for one-per-line lists, `SelectField` for long lists, date/number inputs) and follow rules 28.1, 36, 67.
- **D6 — Parity.** Simulator copies get the same change where the Simulator renders the same component against the same table; where it uses practice tables / different components (closure, lessons, stakeholder analysis — not in `sim`), the gap is documented, not force-fitted (rule 64 precedent).
- **D7 — SQL** is written now and run by the owner at the end, in version order.

## e) Testing decisions

- Unit tests (Vitest + RTL) for: the Audit tab placeholder / cards on one wave 2a form; the custom-fields mount on one wave 2b page (renderer receives screen code, entity type, id); the policies migration helper text (none — SQL); one wave 4 form saving a newly exposed field.
- Existing suites for touched areas re-run (localRegisters, change, closing, stakeholders, assumptions).
- Parse check for every SQL file (libpg-query) and the "into" trap check.
- Done = every story above checkable in the browser after the SQL runs; plan review section written.

## f) Out of scope

- Field-level change history (rule 63.1 "metadata only").
- Moving any module other than Policies & Compliance to the register engine.
- New columns on rich tables (beyond exposing existing ones), and new pages.
- Simulator practice-module equivalents that use different tables (documented gaps).

## g) Further notes

- The Policies leak should be mentioned to the owner as a security fix in its own right.
- After the owner runs the SQL, an organisation must define custom fields before wave 2b shows anything — the renderer hides itself when no fields are mapped.
