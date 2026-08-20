# Record View Document Preview (v853)

Lets a user "View" a record as PDF / Word / PPT / Excel in the browser without triggering a download. Companion to the existing Export system (CLAUDE.md rule 38).

## What it is

A **"View"** button next to the existing **Export** dropdown on every record-view page. Clicking it opens a modal with format tabs (PDF default, then Word, PowerPoint, Excel). Each tab renders the same `sections`/`record` data the Export dropdown already uses — no separate data-fetching, no forked field-mapping logic.

- **PDF tab** — the real generated PDF (`jsPDF`, already a dependency) shown inline via `<iframe>`.
- **Word / PPT / Excel tabs** — a styled-HTML look-alike (document page / slide carousel / spreadsheet table) built from the same section/field data, not a byte-level render of the actual `.docx`/`.pptx`/`.xlsx` file.

Each tab has its own "Export this format" button, calling the same `exportRecordTo*` function the Export dropdown already uses for that format.

## Where it lives

Built once into the shared `ExportRecordMenu.jsx` (`packages/ui/src/`, plus its `apps/platform/src/components/ui/` and `apps/simulator/src/components/ui/` shadow copies), so it's available everywhere that menu is mounted with the declarative `sections`+`record` API.

Pages that never mounted Export (e.g. **Project Documents** / organisational template detail) do **not** get View automatically — they must wire `ExportRecordMenu`. That is now done on `OrganisationalTemplateDetailPage` in `@nidus/pmo-module` and `@nidus/sim-pmo-module` (header next to Retire).

The legacy callback-based `ExportRecordButtons` API (`onExportPDF`, etc., no `sections`/`record`) does not get a View button, since the preview modal needs the raw section/field shape.

## Key files

| File | Role |
|---|---|
| `packages/shared/src/utils/exportUtils.js` | `_buildRecordPdfDocument` (internal) builds the jsPDF doc once; `exportRecordToPDF` calls `.save()`, new `generateRecordPdfBlob` calls `.output('blob')` for preview. Also exports `getNumberedSectionInfo`, `parseFieldValue`, `fieldGuidanceLines`, `guidedCellValue`, `resolveBranding`, `BULLET` for reuse by the preview components. |
| `packages/ui/src/RecordPreviewModal.jsx` | The modal — tab state, PDF blob → object URL → iframe (revoked on tab switch/close), renders the three styled preview components for the other tabs. |
| `packages/ui/src/WordStylePreview.jsx` | Document-styled page (H1 section / H2 field), mirrors `exportRecordToWord`'s layout. |
| `packages/ui/src/PPTStylePreview.jsx` | Slide carousel (one slide per section, prev/next + dots), mirrors `exportRecordToPPT`'s layout. |
| `packages/ui/src/ExcelStylePreview.jsx` | Spreadsheet-styled table (field labels as headers, one data row), mirrors `exportRecordToExcel`'s layout — multi-value fields render one item per line per cell (Alt+Enter convention, rule 38.5). |
| `packages/ui/src/ExportRecordMenu.jsx` | Adds the "View" button, gated the same way the PDF export option already is (`!record \|\| sections.length === 0`). |

All of the above have byte-identical shadow copies in `apps/platform/src/{utils,components/ui}/` and `apps/simulator/src/{utils,components/ui}/` — this repo's established convention for shared-package code — keep them in sync on any future edit.

## Why no new dependencies

Word/PPT/Excel previews reuse the exact section/field/list-vs-scalar computation the real exporters already do (`getNumberedSectionInfo`, `parseFieldValue`, `guidedCellValue`), rendered as themed HTML instead of a generated file. This keeps preview and export from ever drifting apart, and avoids adding a docx/pptx/xlsx-rendering library just for a look-alike preview. Only the PDF tab uses a real generated file, because `jsPDF` was already a dependency and its output is trivially `<iframe>`-viewable.

## Out of scope (see PRD `projectprd/v853_record_view_document_preview_PRD.md`)

- List/table export preview (`ExportListMenu`) — a natural follow-up, not built here.
- True native-format (`.docx`/`.pptx`/`.xlsx`) byte-level rendering.
- Preview of uploaded/attached binary files — that's the separate, already-existing `DocumentPreview.jsx` system.
