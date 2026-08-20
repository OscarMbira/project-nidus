# v880 — Scoped Document Signatory Requirements — Implementation Plan

**PRD:** `projectprd/v880_scoped_document_signatory_requirements_PRD.md`  
**Status:** ✅ Implemented (awaiting SQL apply + manual checklist).  
**Repos:** `E:\project-nidus` (Platform + Simulator). No Admin ID Generation seed.  
**Extends:** v868 / v873 Document Signatory.

---

## Design recap

- **Inherit** nearest parent when scope has no override: Project → Programme → Portfolio → Organisation.
- **Override** = full replace **or** explicit **No signatories** (suppress).
- **Resolve once** at signing-round start from the document’s **Project** (else Org-only); **snapshot** as today.
- **One UI** (`SignatoryRequirementsPage`) + scope control + deep-link query params.
- **Editors:** PMO Admin + role-matched managers; higher roles may edit lower scopes they manage.
- **First custom:** default copy effective parent; optional start blank.
- **Source banner** on config page only.

---

## Todos

- [x] SQL: `SQL/v880_scoped_signatory_requirements.sql` (public only; deadlock-safe split)
- [x] SQL: `SQL/v880c_sim_scoped_signatory_requirements.sql` (sim only)
- [x] SQL: `SQL/v880b_scoped_signatory_menu_grants.sql`
- [x] Service: resolve + scoped CRUD + round init; Vitest (26 passing)
- [x] UI: `SignatoryRequirementsPage` (pmo-module + sim-pmo-module)
- [x] `SignatoriesPanel` + `OrganisationalTemplateDetailPage` use effective resolve + `projectId`
- [x] Documentation + review section
- [ ] Manual checklist (below)

---

## Manual checklist (post-SQL)

1. Run `v880` (public) → `v880c` (sim) → `v880b` (menu) on Supabase — **separate runs**. If `40P01 deadlock`, pause the app and re-run the same file (idempotent).
2. Org: configure Charter slots; project doc without overrides still gets Org chain.
3. Portfolio override custom → project under that portfolio uses Portfolio list.
4. Project “No signatories here” → Signatories tab absent for that type; sibling project without override still inherits.
5. Revert to parent → Project inherits again.
6. First custom → copy parent then edit; Start blank works.
7. Non-manager cannot save another portfolio’s override (RLS toast).
8. In-flight round unchanged after later override edit.
9. Simulator parity smoke.

---

## Review section

### Summary

Shipped scoped Document Signatory requirements (v880): schema + policies table + manager RLS helper; shared resolve/save APIs; config page Scope / mode / source banner / copy-parent; signing init and Signatories tab visibility use effective lists; menu grants for Portfolio/Programme/Project managers; Platform + Simulator parity.

### Files

- `SQL/v880_scoped_signatory_requirements.sql`
- `SQL/v880b_scoped_signatory_menu_grants.sql`
- `packages/shared/src/services/processTemplateSignatoryService.js` (+ tests)
- `packages/modules/pmo-module` / `sim-pmo-module` `SignatoryRequirementsPage.jsx`, `OrganisationalTemplateDetailPage.jsx`
- `apps/platform` / `apps/simulator` `SignatoriesPanel.jsx`
- `Documentation/Process_Template_Document_Signatories_v868_Guide.md`
- `projectprd/v880_scoped_document_signatory_requirements_PRD.md`
