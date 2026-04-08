## v210 Project Description Defaulting From Mandate Purpose Plan

### Objective
Align the `Project Description` field on the `Create Project` page so that, when a project is created from an approved mandate, it **defaults from the Mandate Purpose text**, not from the Background text, regardless of how the user navigated to the page.

### Scope
- Platform Project Creation flow only.
- Mandate-driven project creation (from Project Mandate view and from short URL with `projectCode=PRJ-{mandateRef}`).
- No schema changes and no simulator changes required.

### Assumptions
- Mandate `purpose` and `background` are both persisted on the mandate record.
- Business rule: `Project Description` should be a concise statement of *purpose*, while `Background` remains available on the mandate and in future project artefacts if needed.

### High-Level Approach
1. Identify all mapping points where mandate fields are applied to project fields during defaulting.
2. Update the mapping so `project_description` is populated from `purpose` instead of `background` in all mandate-driven paths.
3. Keep other existing mappings (Business Objective, Strategic Alignment, Expected Benefits, etc.) unchanged.
4. Manually verify in the UI using an existing mandate that the description now mirrors the Purpose block.

### Todo List
- [x] **Locate mappings**: Confirm all places where mandate data is mapped to `project_description` (both `fromMandate` state and mandate fetched via `getMandateByIdOrReference`).
- [x] **Update navigation mapping**: In `ProjectMandateView`, change the `fromMandate` payload so `project_description` is derived from `purpose`.
- [x] **Update URL-based prefill mapping**: In `ProjectsCreate`, update the mandate prefill effect so `project_description` is set from `purpose`.
- [x] **Retain existing defaults**: Ensure `business_objective`, `strategic_alignment`, and `expected_benefits_summary` mappings remain as-is.
- [ ] **Manual verification**: Create a project from a known mandate and confirm that Project Description equals the Purpose text (not Background) in both navigation and URL-based flows.

### Review Notes (completed after implementation)
- **Code changes**
  - **`src/pages/mandate/ProjectMandateView.jsx`**: In `handleCreateProject`, `fromMandate.project_description` now uses `mandate.purpose` instead of `mandate.background`, so when navigating from the mandate view to Create Project, the Project Description field is pre-filled from the Purpose section.
  - **`src/pages/ProjectsCreate.jsx`**: In the effect that fetches mandate by `mandateParamToFetch` (URL `projectCode=PRJ-{ref}` or legacy `fromMandate`/`fromMandateId`), `project_description` is now set from `m.purpose` instead of `m.background`, so direct or refresh-to-URL flows also get Purpose in the description.
- **Other mappings**: No changes to `business_objective`, `strategic_alignment`, or `expected_benefits_summary`; they continue to use `purpose`, parsed `project_objectives`, and `outline_business_case` respectively.
- **Edge cases**: If mandate has no `purpose`, the description remains the previous value (or empty). Manual verification recommended for both “Create project” from mandate view and opening Create Project with `?projectCode=PRJ-MAN-2026-001` (or similar).

