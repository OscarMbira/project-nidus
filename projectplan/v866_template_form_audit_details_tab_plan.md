# v866 — Template / Form Audit Details Tab — Implementation Plan

**PRD:** `projectprd/v866_template_form_audit_details_tab_PRD.md`  
**Status:** ✅ Implemented  
**Repos:** `E:\project-nidus` + `E:\project-nidus-admin`

---

## Design recap

Consistent **Details | Audit details** tabs across template/form surfaces; shared `@nidus/ui` Audit panel; friendly scope labels; no Technical card; FormView Audit = cards + timeline; Admin Detail + Form; CLAUDE.md rule for future work.

---

## Proposed CLAUDE.md rule (monorepo) — added as rule **63**

*(See `CLAUDE.md` rule 63 and Admin `CLAUDE.md` rule 16.)*

---

## Todos

### A. Shared UI (monorepo)

- [x] `AuditField`, `AuditCard`, `AuditDetailsPanel`, `DetailAuditTabList` in `packages/ui`
- [x] Exports from `packages/ui` index
- [x] Unit tests (`AuditDetailsPanel.test.jsx` — 5 passed)
- [x] `auditDisplayUtils.js` + `resolveScopeReferenceLabel`
- [x] Unit tests (`auditDisplayUtils.test.js` — 7 passed; registered in vitest include)

### B. Process / org / project document templates

- [x] Refactor `OrganisationalTemplateDetailPage` (pmo + sim-pmo) onto shared panel; friendly scope; no Technical card

### C. Field templates

- [x] Details | Audit on `PmoFieldTemplateDetailPage` (pmo + sim-pmo)

### D. Form templates (builder)

- [x] Platform + Simulator `FormTemplateBuilder` — tabs in view/edit

### E. Form instances

- [x] Platform + Simulator `FormView` — Form details | Audit details; timeline under Audit cards

### F. Admin

- [x] Audit UI under `@nidus-admin/ui`
- [x] `GlobalTemplateLibraryDetail` + `GlobalTemplateLibraryForm` (view/edit)

### G. Rules & docs

- [x] Monorepo `CLAUDE.md` rule 63
- [x] Admin `CLAUDE.md` rule 16
- [x] `Documentation/Template_Form_Audit_Details_Tab_v866_Guide.md`

### H. Verify

- [x] Unit tests for shared UI + helpers
- [x] Shell shadow copies under `apps/platform|simulator/src/components/ui` + `utils/auditDisplayUtils.js` (pmo-module aliases `@nidus/ui` → shell UI)
- [ ] Manual UAT (refresh Cost Baseline Audit; field template; form builder; form view; Admin GTL)

---

## SQL

None.

---

## Review

**Summary:** Extracted shared Audit chrome into `@nidus/ui` (and Admin-local copies), wired Details|Audit tabs across process/org templates, field templates, form builder, form view (with timeline under Audit), and Admin Global Template Detail/Form. Scope references resolve to friendly project codes. Technical reference cards remain omitted. CLAUDE.md rules added so future Template/Form detail work keeps the pattern.

**High-level changes:**
1. New shared components + `auditDisplayUtils`
2. Refactored existing org/project template Audit tab onto shared panel + friendly scope
3. Added Audit tabs to remaining surfaces (field templates, form builder, form view, Admin)
4. Documentation + rules 63 / Admin 16

**Manual check:** Open a project document Audit tab and confirm Scope reference shows project code (e.g. `SEED334-PRJ-07`) not UUID.
