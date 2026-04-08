# Highlight Report User Guide

**Version**: 1.0  
**Date**: 2026-01-20  
**Module**: Structured Project Management - Controlling a Stage

## Overview

Highlight Reports are periodic status reports prepared by the Project Manager for the Project Board. They provide a concise update on stage and project status, aligned with PRINCE2. Reports cover the six performance variables (Time, Cost, Quality, Scope, Benefits, Risk), tolerance status, progress, key risks and issues, change requests, and decisions required.

## Accessing Highlight Reports

### From Controlling a Stage
1. Navigate to your project → **Controlling a Stage** (or Stage Boundaries)
2. Open the **Reports** tab
3. View the **Highlight Reports** list, or click **Highlight Report** to create one

### Direct URLs
- **List** (via Reports tab): `/app/projects/{projectId}/...` (Reports tab)
- **Create**: `/app/projects/{projectId}/highlight-reports/create`
- **View**: `/app/projects/{projectId}/highlight-reports/{reportId}`
- **Edit**: `/app/projects/{projectId}/highlight-reports/{reportId}/edit`

## Creating a Highlight Report

1. **Open Create**
   - From Reports tab, click **Highlight Report**
   - Or go to **Create** and optionally add `?stage={stageBoundaryId}` to link a stage

2. **Multi-step form**
   - Use the step tabs (Document Info, Summary & Status, Six Variables, Tolerance, Progress, Products, Risks, Issues, Changes, Decisions, Lessons, Distribution).
   - Complete each section and use **Next** / **Previous** to move.

3. **Document Info**
   - **Report Title**: e.g. "Highlight Report" (required)
   - **Report Date**, **Reporting Period Start/End** (required)
   - **Version**: e.g. 1.0
   - **Report Reference**: Auto-generated (e.g. HLR-PROJ001-STAGE1-001) or enter manually
   - **Frequency**: Weekly, Bi-weekly, Monthly, Ad-hoc
   - **Next Report Due**: Optional

4. **Summary & Status**
   - **Executive Summary**: At least 50 characters (required)
   - **Stage Status**: On track, At risk, Off track, Exception (required)
   - **Overall Status Summary**: Free text

5. **Six Variables**
   - For each of Time, Cost, Quality, Scope, Benefits, Risk:
     - **Status**: On track, At risk, Off track, Exception
     - **Summary** and **Forecast** (optional)

6. **Tolerance**
   - Use **Sync from stage** to pull tolerance data from stage tolerances.
   - Optionally add **Tolerance breaches summary**, **Tolerance warnings summary**.
   - **Escalation required**: Yes/No and **Escalation reason** if yes.

7. **Progress**
   - **Progress Summary**, **Completed this period**, **Planned next period**.

8. **Products**
   - Save the report first, then add products.
   - **Add product**: Name, **Period** (Completed this period, Planned next period, Carried forward), **Completion status**.
   - Edit or remove products as needed.

9. **Risks & Issues**
   - **Risks summary** / **Issues summary** (free text).
   - Add **Key risks** and **Key issues** via **Add risk** / **Add issue** (after report is saved).

10. **Changes & Decisions**
    - **Changes summary** (optional).
    - **Add change request**: Title, status (Approved, Pending, Rejected, Withdrawn).
    - **Decisions required** and **Recommendations** (optional).
    - **Add decision**: Title, priority, status.

11. **Lessons**
    - Add **Lessons learned** (after save): Title, type (What went well, What could improve, Recommendation).

12. **Distribution**
    - Add distribution recipients (after save) when ready to distribute.
    - Manage list and distribution status from the Distribution section.

13. **Save**
    - **Create Report** (new) or **Save Changes** (edit).
    - You can save from any step; complete as much as you can and update later.

## Auto-populate from stage

- In **Edit** mode, use **Auto-populate from stage**.
- This fills progress (work packages completed/total), stage tolerances, and related data from the linked stage.
- Review and adjust after auto-populate.

## Completeness indicator

- When editing, a **Report Completeness** block shows:
  - Overall completion %
  - Per-section completion (e.g. document_info, executive_summary, stage_status, six_variables, progress, risks, issues, decisions).
- Aim for **≥ 90%** before distribution.

## Viewing a report

- Open a report from the list (e.g. Reports tab).
- **Overview** tab: Executive summary, overall status, progress, risks, issues, decisions, products, completeness, revision history.
- **Print & Export** tab:
  - **Print**: Browser print.
  - **Export PDF**: Opens print dialog for PDF.
  - **Export Word**: Downloads a .doc version.

## Editing a report

- Only **Draft** or **Submitted** reports can be edited.
- Open the report → **Edit**.
- **Auto-save**: Edits are saved automatically every 30 seconds.
- Use **Save Changes** to save immediately.

## Filter and search

- On the **Reports** tab, use the **Filter** field above the Highlight Reports list.
- Filter by **title**, **reference**, or **executive summary**.
- List updates as you type.

## Distribution workflow

- **Draft**: Report being prepared.
- **Submitted**: Submitted for review.
- **Distributed**: Sent to distribution list.
- **Acknowledged**: Recipients have acknowledged.

Add recipients in the **Distribution** section when ready, then use your organisation’s process to send (e.g. email, meetings). Distribution status can be tracked per recipient.

## Revision history

- **Revision History** on the view page shows version timeline.
- Each entry: version number, date, summary of changes, optional “changes marked” note.

## Export

- **Print**: Use **Print** in the Print & Export tab.
- **PDF**: Use **Export PDF** (opens print dialog; choose “Save as PDF”).
- **Word**: Use **Export Word** to download a .doc of the report.

## Tips

- Create reports regularly (e.g. weekly) as per your Communication Management Approach.
- Use **Auto-populate from stage** to reduce re-entry.
- Complete **Document Info** and **Summary & Status** first; then **Six Variables** and **Tolerance**.
- Add **Key risks** and **Key issues** for board attention.
- Use **Decisions required** and **Recommendations** when escalation is needed.

## Troubleshooting

| Issue | Action |
|-------|--------|
| "Save the report first to add products" | Create the report with minimal required fields, then add products in Edit. |
| "User not found" on save | Ensure you are logged in and your user exists in the system. |
| Completeness stays low | Complete required sections (e.g. executive summary ≥ 50 chars, stage status, six variables). |
| Sync from stage does nothing | Ensure the stage has tolerances and work packages; check project/stage selection. |

---

**Related documentation**: Highlight Report Technical Documentation, Checkpoint Report User Guide, End Stage Report User Guide.
