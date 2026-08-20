# Excel → Form Schema & Bulk Draft Instances (v857)

## Purpose

Turn inventory-style Excel/CSV sheets into:

1. **Form template fields** (Form Template Builder → **Import from Excel**)
2. **Draft form instances** (Project Forms / Process Group Forms → **Bulk upload rows**)

Platform and Simulator both support this flow.

## Schema import (Form Template Builder)

1. Open a form template in the Form Template Builder (Platform or Simulator).
2. On the **Field catalog** tab, click **Import from Excel**.
3. Upload `.xlsx` / `.xls` / `.csv`.
4. Review inferred columns (label, key, type). Skip columns you do not want.
5. Banner rows with a single label (e.g. APPLICATION SERVERS) become a **Category** select field; options are the banner labels.
6. Click **Apply to field catalog** — fields are **merged** (matched by key or label; nothing auto-deleted).
7. Click **Save template** to publish a new template version.

Type inference samples data cells under each header (`text`, `textarea`, `date`, `number`, `money`, `select`). Unclear columns stay **text**.

## Bulk draft instances (Project Forms)

1. Open a project’s Process Group Forms / Project Forms gallery.
2. Under **Bulk upload rows**, select a template that already has fields saved.
3. Click **Bulk upload rows** and upload the sheet.
4. Map Excel columns to template field keys (auto-mapped by label/key where possible).
5. Confirm the preview count (soft cap **500** data rows per upload).
6. Create — each data row becomes a **draft** form instance (insert-only; no dedupe). Category is filled from the nearest banner above the row when the template has a Category field.

## Limits & behaviour

| Rule | Behaviour |
|------|-----------|
| Soft cap | Max **500** data rows per bulk upload; over-cap uploads are blocked |
| Instance status | Always **draft** |
| Deduplication | None — re-upload creates more drafts |
| Schema apply | Merge only; Save template still required |
| Multi-sheet | User picks the sheet after upload |

## Key modules

| Area | Path |
|------|------|
| Shared parse/inference | `packages/shared/src/utils/formExcelImportUtils.js` |
| File parse (app) | `apps/*/src/services/formExcelFileParseService.js` |
| Schema modal | `apps/*/src/components/forms/FormExcelSchemaImportModal.jsx` |
| Bulk modal | `apps/*/src/components/forms/FormExcelBulkInstancesModal.jsx` |
| Builder wiring | `apps/*/src/pages/forms/FormTemplateBuilder.jsx` |
| Gallery wiring | `apps/*/src/pages/forms/FormsGallery.jsx` |

## Related

- Local blank forms: `Documentation/PM_Local_Forms_v852_Guide.md`
- PRD: `projectprd/v857_excel_form_schema_and_bulk_instances_PRD.md`
- Plan: `projectplan/v857_excel_form_schema_and_bulk_instances_plan.md`
