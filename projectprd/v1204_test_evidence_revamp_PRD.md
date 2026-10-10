# v1204 — Test Evidence revamp (passed-test evidence, Platform + Simulator)

Status: DRAFT — decision interview complete. Awaiting approval before the implementation plan is built on it.

## a) Problem statement

Testers record failed tests as defects, but nothing records **proof that a test passed**. The Testing → Evidence page
is meant to hold that proof, but it reads defect attachments and defect history, not test-run evidence. A tester who
passes a test has no place to attach a screenshot or file, and the Evidence page shows defect files that are already
on each defect. The page is confusing and the test-run evidence is never surfaced.

## b) Solution (high level)

1. **Capture:** on the test execution screen, a tester who marks a test case **Passed** can attach any file to that
   test result.
2. **Configure:** whether evidence is optional or required is set at two levels — an organisation default and a
   per-project override.
3. **Review:** the Evidence page lists test-result evidence only, in one list with an outcome filter.
4. **View and export:** test case records get a View action that previews and exports the record as PDF, Word,
   PowerPoint or Excel, using the shared preview modal.

## c) User stories

Capture
1. As a tester, when I mark a test case Passed, I can attach one or more files of any type to that result.
2. As a tester, I can see which files are already attached to a result and open them.
3. As a tester, I can remove a file I uploaded while the test run is still open.
4. As a tester, I cannot remove a file after the test run is closed.
5. As a tester, I can leave a passed result without evidence when evidence is optional.
6. As a tester, I am blocked from saving a Passed result without evidence when evidence is required.

Configuration
7. As a PMO Admin or Account Owner, I can set the organisation default for passed-test evidence: optional or required.
8. As a Project Manager, I can override that default for my project.
9. Where a project has no override, the organisation default applies.

Review
10. As a PM or tester, I open Testing → Evidence and see one list of test-result evidence, default filter Passed.
11. I can switch the outcome filter to Failed or All.
12. Each row shows: #, test case ref, test run, outcome, file name, uploaded by, uploaded date.
13. A failed result row links to its defect. Defect attachments are not listed on this page.
14. The list supports search, sortable headers and the Card/Table toggle (rules 40, 41, 44).
15. The list exports through the existing export menu (rule 38).

Removal and audit
16. A Project Manager can remove any evidence file while the run is open or closed.
17. Removal is a soft delete. The file row stays in the audit history with who removed it and when.
18. Deleted files no longer appear on the Evidence page or the test result.

View and export (test case records)
19. A test case record shows a View action (icon-only, rule 61) next to Edit.
20. View opens the shared record preview (PDF / Word / PowerPoint / Excel tabs), with the same export buttons used elsewhere (rule 38).

Parity
21. Every story above applies to the Simulator with its own `sim` schema tables and routes (rule 34.1).

## d) Implementation decisions (settled)

1. **Evidence is per test result,** not per step. Files attach to a manual execution row, `test_case_executions`
   (the table the execution screen writes to, `SQL/v339`). A new table `test_case_execution_evidence` holds them.
   Revised 2026-10: the earlier draft pointed at `tc_test_run_results` (Testing Centre model), which the execution
   screen does not write to. `tc_evidence_files` is not used by this feature.
2. **Any file type** is accepted. Storage uses the existing `testing-centre-evidence` bucket and the existing uploader.
3. **Optional by default.** The setting is `optional | required`, held at organisation level and overridable per project.
   No per-test-case flag in this release.
4. **Capture on the execution screen** when a result is set to Passed.
5. **Removal rule:** uploader can remove until the test run is closed; Project Manager can remove at any time; soft delete only.
6. **Evidence page = test-result evidence only.** Defect attachments and the History tab are removed from this page.
   Defect files stay on the defect.
7. **One list with an outcome filter** (Passed default, Failed, All). The four current tabs are removed.
8. **View on test case records** uses the shared `RecordPreviewModal` in `packages/ui`, not a new preview.
9. **Parity:** Platform and Simulator are built in the same change.

## e) Testing decisions

Seams:
- **Setting resolution (unit):** project override wins; otherwise organisation default; otherwise `optional`.
- **Requirement gate (unit):** Passed + required + no files → save blocked; Passed + optional + no files → save allowed.
- **Removal rule (unit):** uploader before run close → allowed; uploader after close → refused; PM at any time → allowed.
- **Database (integration):** a tester cannot read or write another project's evidence (RLS, rule 42); a soft-deleted file is excluded from reads but kept in the table.
- **Evidence page (unit):** outcome filter, default Passed, failed rows link to the defect, no defect-attachment rows.
- **View (unit):** View action renders the preview with the test case's sections and the four export tabs.

Done means:
- Stories 1–21 each have a passing automated test at one of the seams above.
- Retest suite passes in both apps after each slice (rule 43).
- Simulator equivalents pass the same tests against `sim.*`.

## f) Out of scope

- Step-level evidence.
- A per-test-case "evidence required" flag.
- Evidence on Failed results beyond the existing defect attachments.
- Evidence on Blocked or Skipped results.
- Changes to the Defects module.
- A field-level change log for evidence (rule 63.1 metadata only).

## g) Further notes

- New table `public.test_case_execution_evidence` with soft delete, registered in `database_tables` (`SQL/v1201`, applied).
  The Simulator execution screen and service use the same public tables, so no separate `sim` table is needed.
  The organisation default and project override are columns on `accounts` and `projects` (`SQL/v1200`, applied).
  The soft-delete columns added to `tc_evidence_files` in `SQL/v1200` are unused by this feature and can be removed later.
- The organisation and project settings should follow the Regional & Format Settings pattern (rule 68): org defaults with
  optional project overrides, editable by the roles named in d.3.
- Screenshot evidence already in `testing-centre-evidence` (step captures, `SQL/v497`) is not changed.
- Related: v494 (test runs), v497 (advanced testing), v853 (RecordPreviewModal), v1199 (testing children under Testing).
