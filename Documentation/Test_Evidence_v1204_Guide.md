# Test Evidence for Passed Tests (v1204)

Source: `projectprd/v1204_test_evidence_revamp_PRD.md`. Plan: `projectplan/v1205_test_evidence_revamp_plan.md`.

## What testers do

1. Open a test run and choose **Execute** (Testing → Test Runs → run → Execute).
2. On a test row, click **Attach file** to add one or more files of any type (screenshots, PDFs, documents).
3. Mark the test **passed**. If the project requires evidence, Passed is refused until at least one file is attached, and the row shows: *"Attach evidence before marking this test as passed."*
4. To remove a file, click the bin icon on the file. You can remove your own files while the test run is open. Once the run is completed, cancelled or aborted, you can no longer remove them.

Removed files are kept in the audit history. They are hidden from the list and from the test result.

## Where evidence is reviewed

**Testing → Evidence** lists every live evidence file for the project, one row per file.

- The filter defaults to **Passed**. Switch to **Failed** or **All** with the buttons above the list.
- Search matches file name, test case, run and defect reference.
- Column headers sort. The `#` column is not sortable.
- Failed rows link to their defect. Defect attachments are not listed on this page; they stay on the defect.
- **Export** downloads the rows currently shown.

## Test case View

On a test case, the **View** icon opens a preview of the record. Use the PDF, Word, PowerPoint or Excel tab, then **Export this format** to download it. **Edit** is next to it.

## Settings

Whether evidence is optional or required is set at two levels:

| Level | Where | Who can change it |
|---|---|---|
| Organisation default | Account / organisation Regional & Format Settings page (card: *Passed-test evidence*) | PMO Admin / Account Owner |
| Project override | Project Setup → Regional & Format Settings (card: *Passed-test evidence*) | Project Manager (per the project's write roles) |

A project override replaces the organisation default for that project. *Use organisation default* on a project removes the override.

The default is **optional**. A project with no override follows the organisation default.

## Data

| Object | Purpose |
|---|---|
| `public.test_case_execution_evidence` | One row per evidence file, linked to the manual execution row. Soft delete via `deleted_at` and `deleted_by`. |
| `public.accounts.test_evidence_default` | Organisation default (`optional` or `required`). |
| `public.projects.test_evidence_requirement` | Project override (`optional`, `required`, or NULL to inherit). |
| `sim.practice_test_case_execution_evidence` | Simulator equivalent of the evidence table (`SQL/v1202`). |
| `sim.practice_projects.test_evidence_requirement` | Simulator project override. |

Migrations: `SQL/v1200_test_evidence_requirement_and_soft_delete.sql`, `SQL/v1201_test_case_execution_evidence.sql`, `SQL/v1202_sim_practice_execution_evidence.sql`.

Files are stored in the existing `testing-centre-evidence` bucket.

## Known limits (this release)

- The Simulator has no Evidence page and no settings card yet. Its execute page does capture evidence.
- The Simulator has no organisation default: practice projects are owned by a user, not an account.
- Project Manager removal in Platform uses the project's write roles, but the database allows only the Project Manager role. See the plan's open item before relying on it.
- Failed-result evidence, step-level evidence and a per-test-case requirement flag are out of scope.
