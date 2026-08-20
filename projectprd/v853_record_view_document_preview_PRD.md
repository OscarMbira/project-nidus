# v853 — Record View Document Preview (View PDF/Word/PPT/Excel without Exporting) — PRD

**Repo:** `E:\project-nidus` (Platform + Simulator monorepo). No Admin repo involvement.
**Companion plan:** `projectplan/v853_record_view_document_preview_plan.md`
**Status:** ⚙️ Implemented (see `projectplan/v853_record_view_document_preview_plan.md`) — automated build, tests, and docs complete; manual browser/theme/mobile verification (plan 5.1–5.5) still outstanding.

---

## a) Problem statement

Every record-view page (form instances via `FormView.jsx`, and 82+ other record-detail pages — Risk, Issue, PID, Business Case, testing Defect/TestCase/TestRun, etc., Platform and Simulator) already has a full export system (`ExportRecordMenu`/`ExportRecordButtons` → `exportRecordToPDF/Word/PPT/Excel/CSV/XML/JSON/Print` in `packages/shared/src/utils/exportUtils.js`, per CLAUDE.md rule 38). Every one of those four document-format generators currently **auto-triggers a file download** the instant a user clicks it (`XLSX.writeFile`, `doc.save`, `pptx.writeFile`, manual `a.click()`) — there is no way to just look at what the PDF/Word/PPT/Excel rendition of a record would look like without a file landing in the user's Downloads folder.

Users often want to sanity-check the rendered layout — did all fields come through, does the section grouping read well, is a bulleted field showing on one line per item — before deciding whether to actually export/share it. Today that requires downloading, opening a local application (or the browser's native PDF viewer for downloaded files), checking, and deleting if it wasn't needed. This is friction for a simple "just let me see it" need.

## b) Solution

Add a **"View"** button next to the existing Export dropdown on every record-view page, opening a modal with format tabs (PDF / Word / PPT / Excel, defaulting to PDF). Each tab renders an in-browser preview of that format using the **exact same `sections`/`record` data** the export functions already consume — no new data-fetching, no duplicated field-mapping logic. The PDF tab shows the real generated PDF (jsPDF output, already a dependency) in an iframe, matching the existing `DocumentPreview.jsx` precedent for inline PDF viewing. Word/PPT/Excel tabs show a styled HTML rendering (document page / slide carousel / spreadsheet table respectively) that mirrors each format's actual export layout, since no Word/PPT/Excel in-browser renderer exists in this codebase and adding one would mean new heavyweight dependencies for a preview-only feature. Each tab includes its own "Export this format" button for users who, after previewing, decide they do want the download.

Built once into the shared `ExportRecordMenu.jsx`/`ExportRecordButtons.jsx` components (`packages/ui/src/`), so all 82+ existing record-view pages — Platform and Simulator — get it automatically, the same way export itself rolled out everywhere at once.

## c) User stories

1. As a user on any record-view page (e.g. a filled-out form instance, a Risk, an Issue), I can click "View" next to Export and see a PDF-style rendering of the record without any file being downloaded.
2. As a user in the View modal, I can switch between PDF / Word / PPT / Excel tabs to see how the record would look in each format.
3. As a user viewing the Word tab, I see the record laid out as a scrollable document with section headings (H1) and field headings (H2), matching what `exportRecordToWord` would actually produce.
4. As a user viewing the PPT tab, I see a slide carousel — one slide per section, with next/previous navigation and a slide-position indicator — matching what `exportRecordToPPT` would actually produce.
5. As a user viewing the Excel tab, I see a spreadsheet-styled table with field labels as column headers and the record's values as a single data row, matching what `exportRecordToExcel` would actually produce.
6. As a user viewing any tab, I see the same bulleted/numbered-list rendering rules as the real export (multi-value fields shown one item per line/bullet, not "utilise the existing exporting functionality" comma-joined).
7. As a user who likes what they see in a given tab, I can click "Export this format" right there in the modal to trigger the actual download, without closing the modal and hunting for the format in the Export dropdown again.
8. As a user on a mobile device (PWA), the View modal is usable — tabs are tappable, the PDF iframe and styled previews scroll/resize appropriately.
9. As a user in either light or dark theme, the View modal and all four tab renderings remain fully readable (rule 28.1).
10. As a Simulator user, I have the identical experience on every Simulator record-view page (rule 34.1 parity) — no separate implementation needed since this is built into the shared `packages/ui`/`packages/shared` components both apps already consume.
11. As a developer maintaining this later, the preview renderings and the real export functions share the same section/field-mapping helpers (no forked logic) — a field-formatting fix in one place fixes both.

## d) Implementation decisions

**D1 — Preview fidelity:** Unified styled-HTML preview for Word/PPT/Excel; real generated PDF (via jsPDF) for the PDF tab. No new dependencies. This is a look-alike rendering of the same `sections`/`record` data, not a byte-for-byte render of the actual `.docx`/`.pptx`/`.xlsx` file contents — acceptable since the goal is "let the user see the layout," not pixel-exact fidelity to Office's own renderer.

**D2 — PDF blob generation (refactor, no signature break):** `exportUtils.js`'s `exportRecordToPDF` currently builds a `jsPDF` doc and immediately calls `doc.save(filename)` (`exportUtils.js:892`). Extract the document-building logic (lines ~807–891, everything before the final `.save()`) into an internal `_buildRecordPdfDocument(sections, record, branding, blankPlaceholder)` that returns the `jsPDF` instance unsaved. `exportRecordToPDF` becomes a thin wrapper calling `_buildRecordPdfDocument(...).save(filename)` (unchanged external behavior, zero call-site impact across all 82+ existing usages). Add a new exported `generateRecordPdfBlob(sections, record, baseFilename, branding, blankPlaceholder)` that calls `_buildRecordPdfDocument(...).output('blob')` for the preview modal to consume via `URL.createObjectURL`.

**D3 — Word/PPT/Excel styled-HTML preview components (new, shared, presentational only):** Three new components in `packages/ui/src/`, each taking the same `sections`/`record`/`branding` props `ExportRecordMenu` already has:
- `WordStylePreview.jsx` — scrollable "page" div; section titles as H1-styled headings, field labels as H2-styled headings, values below (bulleted list rendering for multi-value fields), mirroring `exportRecordToWord`'s structure (`exportUtils.js:353-439`).
- `PPTStylePreview.jsx` — slide carousel; one slide per section with a title bar (branded header color) and key-value body, prev/next controls + position dots, mirroring `exportRecordToPPT`'s structure (`exportUtils.js:447-518`).
- `ExcelStylePreview.jsx` — HTML `<table>`; field labels as a styled header row (branded fill color, matching `exportRecordToExcel`'s header styling at `exportUtils.js:330-340`), one data row of values below.

To avoid forked field-mapping logic (PRD user story 11 / rule 38.7), extract the "which fields, in what order, with what numbered label, list-vs-scalar value" computation that all four export functions already duplicate via `getNumberedSectionInfo`/`parseFieldValue`/`guidedCellValue` (already shared helpers in `exportUtils.js`) into reusable exports these three preview components call directly — no new parallel field-mapping implementation.

**D4 — Trigger UI:** One new "View" button next to the existing Export dropdown trigger in `ExportRecordMenu.jsx`/`ExportRecordButtons.jsx`. Opens `RecordPreviewModal.jsx` (new, `packages/ui/src/`) with format tabs (PDF default, then Word, PPT, Excel). Each tab has an "Export this format" button that calls the same `exportRecordTo*` function the Export dropdown already uses for that format.

**D5 — Modal conventions:** Follow `DocumentPreview.jsx`'s established modal pattern (`apps/platform/src/components/app/dashboard/DocumentPreview.jsx`) — backdrop `fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50`, panel `bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full h-full max-w-7xl max-h-[90vh] flex flex-col m-4`, header row with title + close `X`, `border-b border-gray-200 dark:border-gray-700`. Theme-aware per rule 28.1.

**D6 — Rollout:** Built into the shared `ExportRecordMenu.jsx`/`ExportRecordButtons.jsx` in `packages/ui/src/` — automatically available on all 82+ existing record-view pages, Platform and Simulator, no per-page changes required (consistent with how export itself is consumed via `@nidus/ui` package imports, rule 34.3/49).

**D7 — Scope boundary:** Record-view only (`ExportRecordMenu`). List/table preview (`ExportListMenu`) is explicitly out of scope for this plan (see Out-of-scope O1) — it would need pagination/row-limit handling the record-view case doesn't, and can reuse this plan's `RecordPreviewModal`/tab pattern as a follow-up.

## e) Testing decisions

- **Unit tests** for `_buildRecordPdfDocument`/`generateRecordPdfBlob` — returns a Blob without triggering `doc.save`; existing `exportRecordToPDF` behavior (auto-download) unchanged (regression guard).
- **Unit tests** for the extracted field-mapping helper reused by the three new preview components — same section/field/list-vs-scalar output as the existing export functions produce, for a shared fixture record.
- **Component tests (Vitest + RTL)** for `WordStylePreview`/`PPTStylePreview`/`ExcelStylePreview` — renders expected headings/table/slide structure from a fixture `sections`/`record`; multi-value fields render as separate bullet/line items, not comma-joined.
- **Component test** for `RecordPreviewModal` — tab switching renders the correct sub-component; "Export this format" button inside each tab calls the correct `exportRecordTo*` function (mocked).
- **Component test** for `ExportRecordMenu`/`ExportRecordButtons` — "View" button appears whenever `sections`+`record` are provided (matching the same condition that currently enables the Export dropdown), opens the modal.
- **Manual browser check**: open View on a real form instance (`FormView.jsx`) and one other record type (e.g. Risk detail), confirm all four tabs render sensibly, PDF tab shows a real inline PDF, dark/light theme toggle keeps everything readable, mobile viewport width keeps tabs usable.
- **"Done" bar:** a user can click View on any of the 82+ record-view pages (spot-check 3: a form instance, a Risk, an Issue) and see all four format tabs render without opening a download, then click "Export this format" from inside a tab and get the real file — Platform and Simulator.

## f) Out-of-scope items

- **O1 — List/table export preview** (`ExportListMenu`). Left as a natural follow-up once this ships, per D7.
- **O2 — True native-format rendering** (real `.docx`/`.pptx`/`.xlsx` byte-level preview via new libraries like `docx-preview`/`mammoth`). Explicitly decided against (D1) in favor of the zero-new-dependency styled-HTML approach.
- **O3 — Per-format eye icon inside the Export dropdown.** Decided against in favor of a single separate "View" button (D4).
- **O4 — Preview of uploaded/attached binary files** (the existing `DocumentPreview.jsx` / Project Documents Register system). Out of scope — that's a different, already-existing feature for genuinely uploaded files; this plan is about previewing *generated* record exports.
- **O5 — Print preview.** The existing `exportRecordToPrint` (browser print dialog) is left untouched; not folded into the View modal's tab set.

## g) Further notes

- This plan deliberately avoids touching CSV/XML/JSON/Print export paths — those formats have no meaningful "visual layout" to preview beyond what the record-view page itself already shows on screen.
- Because `ExportRecordMenu.jsx`/`ExportRecordButtons.jsx` and `exportUtils.js` live in shared workspace packages (`@nidus/ui`, `@nidus/shared`) consumed identically by Platform and Simulator, Simulator parity (rule 34.1) is inherent to building this in the shared layer — no separate Simulator implementation phase is anticipated, only a verification pass.
- If any record-view page currently uses the "legacy" callback-based `ExportRecordButtons` API (per research: `onExportPDF`, `onExportWord`, etc., rather than the declarative `sections`+`record` props), the View button should be gated to the declarative API only, since the preview modal needs the raw `sections`/`record` shape — legacy callback-based pages simply won't show a View button until they're migrated to the declarative API (existing, pre-planned migration path, not new debt introduced by this plan).
