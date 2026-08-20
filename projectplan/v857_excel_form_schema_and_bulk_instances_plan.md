# v857 — Excel → Form Schema + Bulk Draft Instances — Implementation Plan

**PRD:** `projectprd/v857_excel_form_schema_and_bulk_instances_PRD.md`  
**Repos:** `E:\project-nidus` (Platform + Simulator). No Admin SQL expected.  
**Status:** COMPLETE — implemented after user Approve.

---

## Guiding constraints

- Smallest diff: reuse SheetJS/`parseTabularFile`, RFP column-mapper patterns, existing `saveFormTemplate` + draft instance create paths.
- Theme-aware modals/wizards (rule 28.1); Platform + Simulator parity (rule 34.1).
- No new tables unless a concrete blocker appears (PRD D11 / O5).
- Do not broaden form RLS beyond existing builder / draft-create gates.

---

## Phase 1 — Shared parse + inference utilities

- [x] **1.1** Add `packages/shared/src/utils/formExcelImportUtils.js`
- [x] **1.2** Vitest fixtures for Environment Resources–style sheets
- [x] **1.3** App-layer parse: `formExcelFileParseService.js` (Platform + Simulator)

## Phase 2 — Schema import UI (Form Template Builder)

- [x] **2.1** Platform FormTemplateBuilder — **Import from Excel**
- [x] **2.2** `FormExcelSchemaImportModal` upload → map → apply merge
- [x] **2.3** Merge rules + toast summary
- [x] **2.4** Simulator FormTemplateBuilder parity
- [x] **2.5** Theme-aware UI; merge helper covered by shared tests

## Phase 3 — Bulk draft instances (Project Forms)

- [x] **3.1** Platform FormsGallery — **Bulk upload rows**
- [x] **3.2** `FormExcelBulkInstancesModal` map → create drafts
- [x] **3.3** Status `draft`; insert-only; 500-row soft cap
- [x] **3.4** Success toast + refresh list
- [x] **3.5** Simulator FormsGallery parity
- [x] **3.6** Mapping / cap behaviour in shared utils tests

## Phase 4 — Docs, verification, rollout

- [x] **4.1** `Documentation/Excel_Form_Schema_And_Bulk_Instances_Guide_v857.md`
- [ ] **4.2** Manual UAT (user): Environment Resources sheet → schema merge → Save → bulk drafts
- [ ] **4.3** Dark/light check on both wizards (user)
- [x] **4.4** Retest shared utils suite
- [ ] **4.5** Push only when user requests

---

## Review section

### Summary
Delivered Excel/CSV → form field catalog merge in Form Template Builder, and Excel/CSV → draft form instances on Project Forms, for Platform and Simulator. No new DB tables. Soft cap 500 rows; Category select from banner rows; merge-only schema apply; insert-only drafts.

### Files touched (high level)
- `packages/shared/src/utils/formExcelImportUtils.js` + tests
- `apps/platform|simulator/src/services/formExcelFileParseService.js`
- `apps/platform|simulator/src/components/forms/FormExcelSchemaImportModal.jsx`
- `apps/platform|simulator/src/components/forms/FormExcelBulkInstancesModal.jsx`
- `apps/platform|simulator/src/pages/forms/FormTemplateBuilder.jsx`
- `apps/platform|simulator/src/pages/forms/FormsGallery.jsx`
- `Documentation/Excel_Form_Schema_And_Bulk_Instances_Guide_v857.md`

### Deviations
- File matrix parsing stays in each app (shared has no `xlsx` dependency); inference/merge lives in `@nidus/shared`.

### Follow-ups
- Optional dedupe by natural key; multi-sheet parallel import; higher caps with background jobs.
