# v853 — Record View Document Preview — Implementation Plan

**PRD:** `projectprd/v853_record_view_document_preview_PRD.md` — read that first for the "why" behind every decision below.
**Repo:** `E:\project-nidus` only (Platform + Simulator via shared packages). No Admin repo involvement.
**Status:** ⚙️ Implemented (automated phases 1–4 + 5.6/5.7 complete); manual browser/theme/mobile verification (5.1–5.5) and push (5.8) still pending — see Review section.

---

## Guiding constraints (from CLAUDE.md + PRD)

- Reuse `exportUtils.js`'s existing field-mapping helpers (`getNumberedSectionInfo`, `parseFieldValue`, `guidedCellValue`) — no parallel/duplicated logic (rule 38.7).
- Build once in `packages/ui/src/` and `packages/shared/src/` — Platform + Simulator get it automatically (rule 34.1/34.3).
- No new dependencies (PRD D1).
- Theme-aware (rule 28.1), PWA/mobile-responsive (rule 29/39).
- Zero behavior change to existing export call sites (PRD D2 — `exportRecordToPDF` stays a thin wrapper).

---

## Phase 1 — PDF blob generation (no breaking changes)

- [x] **1.1** `packages/shared/src/utils/exportUtils.js` — extracted the section/field-drawing body of `exportRecordToPDF` into internal `_buildRecordPdfDocument(sections, record, title, branding, blankPlaceholder)`, returning the unsaved `jsPDF` instance.
- [x] **1.2** `exportRecordToPDF` is now a thin wrapper: `_buildRecordPdfDocument(...).save(filename)` — filename/behavior unchanged (covered by regression test).
- [x] **1.3** Added exported `generateRecordPdfBlob(sections, record, baseFilename, branding, blankPlaceholder)` — `_buildRecordPdfDocument(...).output('blob')`.
- [x] **1.4** Unit tests in `packages/shared/src/utils/__tests__/exportUtils.test.js` (mocked `jspdf`): `generateRecordPdfBlob` returns the blob and never calls `save`; `exportRecordToPDF` still calls `save` with the expected filename pattern and never calls `output`.

## Phase 2 — Shared field-mapping extraction for preview components

- [x] **2.1** Exported `getNumberedSectionInfo`, `parseFieldValue`, `fieldGuidanceLines`, `guidedCellValue`, `resolveBranding`, `BULLET` from `exportUtils.js` (were module-private; export added, no behavior change — same functions the export functions already called internally).
- [x] **2.2** Covered by `exportUtils.test.js`'s "exported field-mapping helpers" suite (numbering, list-vs-scalar, guidance-line prefixing, branding defaults) — same functions consumed by both the real exporters and the three new preview components, so there is nothing to drift.

## Phase 3 — Styled-HTML preview components (new, `packages/ui/src/`)

- [x] **3.1** `WordStylePreview.jsx` — document-styled page; numbered section (H1-style) / field (H2-style) headings, bulleted rendering for multi-value fields, blank-placeholder fallback. Theme-aware.
- [x] **3.2** `PPTStylePreview.jsx` — slide carousel; title slide + one slide per section (branded header bar), prev/next + position-dot navigation. Theme-aware.
- [x] **3.3** `ExcelStylePreview.jsx` — HTML table; branded header row (numbered field labels), one data row, multi-value fields rendered one line per item within the cell (rule 38.5). Horizontally scrollable container.
- [x] **3.4** Component tests (Vitest + RTL): `WordStylePreview.test.jsx`, `PPTStylePreview.test.jsx`, `ExcelStylePreview.test.jsx` — numbering, scalar/list rendering, slide navigation, blank-placeholder fallback all covered.

## Phase 4 — Preview modal + View button wiring

- [x] **4.1** `RecordPreviewModal.jsx` (new) — format tabs (PDF default, Word, PPT, Excel). PDF tab: `generateRecordPdfBlob` → `URL.createObjectURL` → `<iframe>`, revoked on unmount/close. Word/PPT/Excel tabs render the Phase 3 components directly. Each tab has an "Export this format" button calling the matching existing `exportRecordTo*` function.
- [x] **4.2** Modal chrome reuses the existing shared `Modal.jsx` component (`packages/ui/src/Modal.jsx`) rather than hand-rolling `DocumentPreview.jsx`-style backdrop/panel markup — **deviation from plan, in the direction of more reuse**: same theme classes, plus gets focus-trap/escape-key/body-scroll-lock accessibility for free (rule 38.7 favors reusing an existing shared component over copying a pattern).
- [x] **4.3** `ExportRecordMenu.jsx` — added "View" button next to the Export dropdown trigger, gated by `!record || sections.length === 0` (same condition already used for the PDF export option). Wired to `RecordPreviewModal`.
- [x] **4.4** `ExportRecordButtons.jsx` — **no direct change needed, deviation from plan**: it already delegates entirely to `ExportRecordMenu` whenever the declarative `sections`+`record` API is used (`if (sections && record) return <ExportRecordMenu .../>`), so the View button is inherited automatically. Legacy callback-based call sites (no `sections`/`record`) render the untouched legacy dropdown and correctly get no View button, satisfying the PRD's "Further notes" caveat without extra gating code.
- [x] **4.5** Component tests: `ExportRecordMenu.test.jsx` (View button disabled with no record/empty sections, opens `RecordPreviewModal` when clicked) and `RecordPreviewModal.test.jsx` (defaults to PDF tab and renders the iframe once the blob resolves, tab switching renders the correct sub-component, "Export this format" calls the correct mocked export function per active tab, renders nothing when closed).

## Phase 5 — Verification & rollout

- [ ] **5.1** Manual browser test (Platform): open View on a form instance (`FormView.jsx`) — **not performed this session**: no browser-automation tool or authenticated test credentials were available (established earlier in this conversation). Dev server was confirmed running and serving the app shell; the feature itself has not been exercised in a live browser.
- [ ] **5.2** Manual browser test (Platform, non-form record page) — same blocker, not performed.
- [ ] **5.3** Manual browser test (Simulator) — same blocker, not performed.
- [ ] **5.4** Dark/light theme toggle check — not performed live; all new components were written with paired `dark:` classes throughout (rule 28.1) and reviewed for completeness, but not visually confirmed in a running browser.
- [ ] **5.5** Mobile/responsive check — not performed live; `ExcelStylePreview` has an `overflow-x-auto` wrapper and `PPTStylePreview`'s slide uses `aspect-video` with a `max-w-3xl` cap, but not confirmed on an actual small viewport.
- [x] **5.6** Full retest suite: `packages/ui` — 14 test files, 80 tests, all passing (9 pre-existing files unaffected + 5 new). `packages/shared` — 39 test files, 308 tests, all passing (pre-existing suite unaffected + 8 new in `exportUtils.test.js`). No regressions.
- [x] **5.7** `Documentation/Record_View_Document_Preview_v853_Guide.md` written.
- [ ] **5.8** Push to GitHub — not done; deferred until explicitly requested, per this session's established practice for this repo.

## Review section

### Summary
Added a "View" button beside the existing Export dropdown on every record-view page. It opens a tabbed modal (PDF/Word/PPT/Excel) that previews the record in each format without downloading anything — PDF via a real generated file in an iframe, Word/PPT/Excel via styled HTML that reuses the exact same field-mapping helpers the real exporters use. Built once in the shared `packages/ui`/`packages/shared` layer, so it rolled out to all 82+ existing record-view pages (Platform + Simulator) with zero page-specific changes.

### Files touched
- **Refactored:** `packages/shared/src/utils/exportUtils.js` (+ `apps/platform/src/utils/exportUtils.js`, `apps/simulator/src/utils/exportUtils.js` shadow copies) — `_buildRecordPdfDocument` extraction, `generateRecordPdfBlob`, new helper exports.
- **New components** (`packages/ui/src/`, + `apps/platform/src/components/ui/`, `apps/simulator/src/components/ui/` shadow copies): `RecordPreviewModal.jsx`, `WordStylePreview.jsx`, `PPTStylePreview.jsx`, `ExcelStylePreview.jsx`.
- **Modified:** `packages/ui/src/ExportRecordMenu.jsx` (+ its two shadow copies) — View button + modal wiring.
- **New tests:** `packages/shared/src/utils/__tests__/exportUtils.test.js` (registered in `packages/shared/vitest.config.js`'s explicit include list); `packages/ui/src/__tests__/{WordStylePreview,PPTStylePreview,ExcelStylePreview,RecordPreviewModal,ExportRecordMenu}.test.jsx` (auto-discovered via glob, no config change needed).
- **New docs:** `Documentation/Record_View_Document_Preview_v853_Guide.md`.
- **Unchanged, confirmed by inspection:** `ExportRecordButtons.jsx` (all three copies) — needed no edit, see 4.4.

### Deviations from plan
- **4.2:** reused the shared `Modal.jsx` component instead of hand-rolling `DocumentPreview.jsx`-style modal markup — more reuse, same visual conventions, plus built-in accessibility (focus trap, escape key, body-scroll lock) at no extra cost.
- **4.4:** `ExportRecordButtons.jsx` required no code change — it already delegates to `ExportRecordMenu` for the declarative API, so the View button is inherited automatically.
- **Testing:** `packages/shared`'s `vitest.config.js` uses an explicit file-by-file `include` list (not a glob) — `exportUtils.test.js` had to be registered there explicitly; `packages/ui`'s config uses a glob so its five new test files needed no config change.

### Not done — needs your input
- **5.1–5.5 (manual browser/theme/mobile verification):** not performed. This session has no browser-automation tool and no authenticated test credentials (Project Manager / PMO Admin / project-member logins) for this repo — the same limitation already surfaced earlier in this conversation for the v852 plan. All 80+308 automated tests pass and the dev server serves the app shell correctly, but the feature itself has not been exercised in a live browser. Please either verify manually using the guide's steps, or provide credentials/enable a browser tool so this can be driven directly.
- **5.8 (push):** left uncommitted/unpushed pending your explicit request, consistent with how the v852 work was handled earlier in this session.

### Follow-ups
- PRD O1: list/table export preview (`ExportListMenu`) as a natural extension of this same tab/modal pattern.
- PRD O2: true native-format rendering, if the styled-HTML look-alike ever proves insufficient in practice.
