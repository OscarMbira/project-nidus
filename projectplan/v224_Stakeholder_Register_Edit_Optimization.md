# v224 – Stakeholder Register Edit Page Optimization

## Summary
Optimizations for `/platform/stakeholders/register/edit/:stakeholderId`: handle invalid URL, improve error handling, and reduce unnecessary data loading in edit mode.

## Changes

### 1. StakeholderFormPage.jsx
- **Redirect when ID missing:** If the user lands on `/edit` or `/edit/` (no stakeholderId), redirect to `/platform/stakeholders/register` with current projectId preserved.
- **Error state:** When `getStakeholder(stakeholderId)` fails, show an error message instead of failing silently. UI includes "Back to Register" and "Retry" buttons (theme-aware).
- **Accessibility:** Loading spinner now has `aria-hidden` for screen readers.

### 2. StakeholderForm.jsx
- **Edit-mode data loading:** When editing an existing stakeholder, the form no longer fetches the full projects list (300 rows). It only fetches:
  - **Roles** (for Stakeholder Role and Project Role dropdowns)
  - **Stakeholders** for the current project (for "Reports To" dropdown)
- **Result:** One fewer heavy query on every edit load; projects list is only needed for the "Assign to project(s)" step when creating a new stakeholder.

## Files Modified
- `src/pages/platform-app/StakeholderFormPage.jsx`
- `src/components/stakeholders/StakeholderForm.jsx`

## Review
- Edit URL without ID now redirects to the register list.
- Load failures show a clear error with retry and back navigation.
- Edit page loads faster by skipping the projects query when not needed.
