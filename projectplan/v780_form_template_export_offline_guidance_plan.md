# v780 — Form Template Export: Offline Field Guidelines (Platform + Simulator)

**Repo:** `E:\project-nidus`  
**Companion (Admin):** `E:\project-nidus-admin\projectplans\v178_form_template_export_offline_guidance_plan.md`  
**Related:** `v770` (Guidance + Sample defaults — editable by PMO/PM), `v777` Part B (form export parity), Admin `v174` (export menu)  
**Status:** ✅ 100% complete (Platform + Simulator Part B)

## Goal

When exporting a form template (especially **Plain Template**) for offline completion, each field shows a **brief description** and, where useful, an **Example** line — not just the label and a blank.

Guidelines remain editable by:

- **Admin (System)** — Global Template `help` / `sample` (**shipped** in Admin v178).
- **PMO/PM (Platform & Simulator)** — existing **Default Content → Guidance** (`guidance_text`) and Sample default (`default_value`).

## Merge rule for description text

```
description = org.guidance_text (if non-empty) OR schema.field.help OR ''
example (Plain only) = org.sample default OR schema.field.sample (truncated for export)
```

## Todos

- [x] Shared export rendering: show description under label; Plain mode may add `Example: …` (match Admin v178 A.2).
- [x] Form/template export callers merge org guidance over schema help.
- [x] Default Content helper copy: Guidance feeds on-screen help **and** offline exports.
- [x] Parity Platform + Simulator.
- [x] Unit tests for merge helper + export shaping.
- [x] Docs: update `Form_Template_Guidance_And_Sample_Defaults.md`; link Admin `Global_Template_Export_Guide.md`.

## Review

### What shipped
1. **`packages/shared/src/utils/exportUtils.js`** — `help` / `example` guidance lines on Word, PPT, Print, Excel/CSV/XML/JSON (guided cells), plus `exportRecordToPDF` (dynamic `jspdf`). Synced to app/legacy `exportUtils` copies.
2. **`packages/shared/src/utils/formTemplateExportUtils.js`** — merge org `guidance_text` / `default_value` over schema `help` / `sample`; Plain Example truncation; blank/sample records.
3. **`packages/ui/src/FormTemplateExportMenu.jsx`** — Plain / Sample → PDF|Word|Excel|PPT|CSV|XML|JSON|Print (no Admin “Real submission” picker).
4. **Form Template Builder** (Platform + Simulator) — Export control in header; Default Content copy/labels mention offline export.
5. **Tests** — `packages/shared/src/utils/__tests__/formTemplateExportUtils.test.js`.
6. **Docs** — `Documentation/Form_Template_Guidance_And_Sample_Defaults.md`.

### Notes
- Real completed-submission export remains Admin-only (v174/v177 + monorepo v779 RPCs).
- Disabled org fields are omitted from builder export via `enabledDefaultSchema`.
