# v880 — Scoped Document Signatory Requirements (Org / Portfolio / Programme / Project) — PRD

**Extends:** `projectprd/v868_process_template_document_signatories_PRD.md`, `projectprd/v873_signatory_slot_mandatory_optional_PRD.md`  
**Repos:** `E:\project-nidus` (Platform + Simulator). Admin ID Generation unchanged (config tables; no new display-ID entity).  
**Status:** Interview complete; implementation shipped (see plan). Awaiting SQL apply + manual checklist.

---

## a) Problem statement

Document Signatory (v868/v873) lets **PMO Admin** define an ordered list of role-slots **per organisation and document type**. That circled document-type header (e.g. “PMBOK Project Charter templates”) is currently org-wide only.

In practice, **Portfolio, Programme, and Project** managers often need **different** signing chains for the same document type (or to suppress signing for a type in their scope) without rewriting the organisation default for everyone else. Today they cannot: there is one list per `(account, document_table)`, write-gated to PMO Admin only.

## b) Solution

Keep one Document Signatory product and **scope** the requirements configuration:

- **Organisation** (current behaviour) = default for the account.
- **Portfolio / Programme / Project** may define an **override** for a document type that **fully replaces** the parent effective list (no merge).
- If a scope has **no override**, it **inherits** the nearest parent: Project → Programme → Portfolio → Organisation.
- A scope may also set an explicit **“No signatories here”** override (suppress parent for that document type only).
- When a document **starts a signing round**, resolve the **effective** slot list once from the document’s **Project** upward (org-library documents with no project use Organisation only), then **snapshot** slots (including `is_mandatory`) as today — config edits do not rewrite in-flight rounds.
- One shared config UI + **deep links** from Portfolio / Programme / Project contexts; role-matched editors with higher roles able to edit lower scopes they manage.

## c) User stories

1. As a **PMO Admin**, I can still configure Organisation defaults per document type (unchanged UX for org scope).
2. As a **Portfolio Manager** (or PMO), I can open Document Signatory scoped to a Portfolio and set Use parent / No signatories / Custom list per document type.
3. As a **Programme Manager** (or PMO / Portfolio manager of the parent), I can do the same for a Programme.
4. As a **Project Manager** (or higher role with access), I can do the same for a Project.
5. As any allowed editor, when I choose **Custom list** the first time, the editor defaults to a **copy of the effective parent** list, with a **Start blank** option.
6. As any allowed editor, I can **revert to parent** (remove this scope’s override so inheritance resumes).
7. As any allowed editor, I can set **No signatories here** so documents under this scope do not get a Signatories tab / round for that type, even if a parent has slots.
8. As an editor on the config page, I see a clear **source status** (Inherited from … / Custom for this … / No signatories override) for the selected scope + document type.
9. As a project team member starting signing on a **project** document, the slots I get are the **effective** list for that project’s hierarchy at round start (snapshot).
10. As a user on an **org-library** document with **no project**, signing uses the **Organisation** list only.
11. As any user, in-progress/completed rounds keep their snapshotted slots when someone later changes an override.
12. As a Simulator user, I get the same scoped behaviour (rule 34).
13. As an organisation upgrading from v868/v873, existing requirement rows become **Organisation** scope with no behaviour change until overrides are added.
14. As a manager deep-linked from Portfolio / Programme / Project settings/menus, I land on the same Document Signatory screen pre-scoped to that entity.

## d) Implementation decisions

| # | Decision | Chosen | Covers |
|---|----------|--------|--------|
| 1 | Inheritance | Project → Programme → Portfolio → Organisation | Stories 9, 6 |
| 2 | Override semantics | Full replace (no merge) | Stories 2–4 |
| 3 | Who may edit | Role-matched; higher roles may edit lower scopes they manage | Stories 1–4 |
| 4 | Modes per (scope, document type) | Use parent (no override) · No signatories · Custom list | Stories 6–7 |
| 5 | Config UI home | One shared screen + deep links from Portfolio / Programme / Project | Stories 1, 14 |
| 6 | First custom seed | Default copy effective parent; optional Start blank | Story 5 |
| 7 | Resolve at signing | From document’s Project upward; no project → Org only | Stories 9–10 |
| 8 | Source label | Config page only (not on document Signatories tab) | Story 8 |
| 9 | Snapshot | Unchanged: round init copies effective slots + `is_mandatory` | Story 11 |
| 10 | Parity | Platform + Simulator | Story 12 |
| 11 | Migration | Existing rows → `scope_type = organisation`, `scope_id` null | Story 13 |
| 12 | Mandatory/optional | v873 rules unchanged on every scope’s custom lists | — |

**Consistency calls (settled for plan, not re-interviewed):**

- Extend requirements with `scope_type` + `scope_id`; uniqueness includes scope.
- Represent “no signatories” / “custom vs inherit” via an explicit **scope policy** row (or equivalent) so “zero slot rows” still means inherit, not suppress.
- Write RLS: PMO Admin always (within account); otherwise portfolio/programme/project manager (or equivalent existing role helpers) for that `scope_id`.
- Resolve programme/portfolio for a project via existing project↔programme↔portfolio assignment data already used elsewhere in Platform.
- Theme-aware UI (rule 28.1) on any amended config surfaces.
- No new Admin `id_generation_rules` (config / policy tables).

## e) Testing decisions

- Service unit tests: resolve effective list (inherit / custom replace / none); org-only when no project; snapshot uses resolved list; save policy modes; copy-parent seed helper.
- Config page behaviour covered lightly where module test infra allows; otherwise manual checklist for scope picker + deep links.
- Manual: Org Charter slots → Portfolio override → Project inherits Portfolio → Project “No signatories” → start round on project doc confirms; revert to parent restores Portfolio; org-library doc without project still uses Org.

## f) Out of scope

- Rewriting or migrating already-started / completed signing rounds when overrides change.
- Merge / partial slot overlays from parent.
- Auto-assigning people from role labels to users.
- Admin-app Document Signatory UI.
- DB-level lock on the 24 content tables (still UI lock as v868).
- Changing v873 mandatory/optional semantics.

## g) Further notes

- Version: **v880** (v879 used by Controls & Registers menu consolidation).
- Docs: extend `Documentation/Process_Template_Document_Signatories_v868_Guide.md` (or add a short v880 section + cross-link).
- Plan: `projectplan/v880_scoped_document_signatory_requirements_plan.md`.
