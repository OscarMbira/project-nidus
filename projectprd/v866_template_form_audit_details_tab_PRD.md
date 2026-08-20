# v866 — Template / Form Audit Details Tab — PRD

**Repos:** `E:\project-nidus` (Platform + Simulator) and `E:\project-nidus-admin` (Admin).  
**Companion plan:** `projectplan/v866_template_form_audit_details_tab_plan.md`  
**Status:** Implemented (see plan review).

---

## a) Problem statement

Users need a consistent **Audit details** view for templates and forms: who created/changed the record, how it is classified, and (where applicable) content-row history — without dumping technical UUIDs/table names into the UI.

Today only **Organisational / Project document templates** (`OrganisationalTemplateDetailPage`) expose a card-style Audit tab. **Field templates**, **form templates (builder)**, **form instances**, and **Admin global templates** either lack this pattern or use a different surface (e.g. FormAuditTimeline only). Scope reference often shows a raw UUID. There is no CLAUDE.md rule to keep future Template/Form detail pages consistent.

---

## b) Solution

1. Extract shared Audit UI into **`@nidus/ui`** (`AuditField`, `AuditCard`, `AuditDetailsPanel`) and a mirrored Admin UI package copy.
2. Wire **Details | Audit details** tabs on every in-scope template/form detail surface (Platform, Simulator, Admin).
3. Show **friendly scope labels** (e.g. project code); never show a **Technical reference** card.
4. On form instances: Audit tab = classification cards **+** existing FormAuditTimeline underneath.
5. Add a **CLAUDE.md rule (monorepo + Admin)** so new Template/Form detail pages include this pattern by default.

---

## c) User stories

1. As a PM opening a process/document template, I see Document/Details | Audit details (already largely true; refactored onto shared panel).
2. As a PMO user on a field template detail page, I get the same Audit tab pattern.
3. As a form author in Form Template Builder (view **or** edit), I can switch to Audit details without leaving the builder.
4. As a form user on Form View, I use Form details | Audit details; Audit shows cards plus the activity timeline.
5. As an Admin on Global Template Library **Detail**, I see Template details | Audit details.
6. As an Admin on Global Template Library **Form** (view and edit), I can open Audit details the same way.
7. As any user, Scope reference shows a friendly project/org label when resolvable, not a UUID-first dump.
8. As any user, I never see Internal ID / Content row ID / Storage table on Audit details.
9. As a new contributor, CLAUDE.md tells me every new Template/Form detail page must ship this Audit tab pattern (Platform + Simulator; Admin when applicable).
10. As a Simulator user, parity matches Platform for all applicable surfaces.

---

## d) Implementation decisions (locked in interview)

| # | Decision |
|---|----------|
| D1 | Scope: extract shared Audit UI, then apply to **all remaining** template detail pages + form templates + form instances + Admin. |
| D2 | Form instances: **cards + keep FormAuditTimeline** (timeline under Audit cards). |
| D3 | Form templates: Audit tab on builder in **view and edit**. |
| D4 | **Never** show Technical reference card on user-facing Audit details. |
| D5 | FormView tabs: **Form details \| Audit details**; timeline lives on Audit tab. |
| D6 | Scope reference: **friendly label** (e.g. `project_code`); UUID fallback only if unresolved. |
| D7 | Shared components live in **`packages/ui` (`@nidus/ui`)**; Admin replicates locally. |
| D8 | **Include Admin**: `GlobalTemplateLibraryDetail` + `GlobalTemplateLibraryForm` (view + edit). |
| D9 | Default tab: **Details** (content). No required `?tab=audit` deep-link in v1. |
| D10 | Platform ↔ Simulator parity for all monorepo surfaces. |
| D11 | CLAUDE.md rule added in monorepo; equivalent rule in Admin `CLAUDE.md`. |

**Standard Audit cards (omit empty optional cards):**

- **Identity** — display ID, status, version, current version, origin (when applicable)
- **Classification** — tier/domain/methodology/scope (entity-appropriate; forms may map status/account/project differently)
- **Record history** — created by (resolved name), created at, last updated (+ updated by when available)
- **Document / content history** — only when a linked content row exists (process docs); forms may omit or show template-version metadata instead

---

## e) Testing decisions

- Unit tests for `AuditDetailsPanel` rendering (cards, empty values as em dash, no technical fields).
- Unit/helper tests for scope-label resolution (project code vs UUID fallback).
- Component/page tests: tab switch defaults to Details; FormView Audit tab includes timeline; builder shows Audit in edit mode.
- Admin: smoke/unit that Detail and Form expose Audit tab.
- Manual UAT: Cost Baseline–style process doc, field template, form builder, form view, Admin global template; light/dark theme.

---

## f) Out of scope

- `?tab=audit` URL deep-linking (optional follow-up).
- Changing FormAuditTimeline event schema or approval workflow.
- Showing Technical IDs behind a toggle.
- New DB tables / SQL migrations (audit data already on existing rows).
- Batch-retrofitting unrelated non-template record pages (Risk/Issue/etc.).

---

## g) Further notes

- Refactor existing inline Audit markup in `OrganisationalTemplateDetailPage` (pmo + sim-pmo) onto `@nidus/ui` to avoid drift.
- Resolve blank **Created by** where user IDs exist (reuse existing user-label lookup patterns).
- Federation: if shells need local copies of new `@nidus/ui` exports, follow existing ExportRecordMenu / SuccessConfirmationModal shadow-copy pattern.
- Version id **v866** aligns plan/PRD; no SQL version required unless a helper RPC is later deemed necessary (not expected).
