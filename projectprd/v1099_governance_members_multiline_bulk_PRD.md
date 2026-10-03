# v1099 — Governance members: multi-line contact + bulk upload

## Problem

Steering Committee / Project Board forms used single-line Email and Phone, Role placeholder said “Role / title”, and there was no bulk import.

## Solution

1. Email and Phone use `MultiLineListInput` (newline-joined TEXT).
2. Role placeholder is **Role**.
3. Bulk upload (Excel/CSV/JSON) for both bodies, same pattern as Contact Directory.

## Routes

- `/platform/governance/steering-committee/bulk-upload`
- `/platform/governance/project-board/bulk-upload`

## Files

- `apps/platform/src/components/governance/GovernanceMembersPanel.jsx`
- `apps/platform/src/services/projectGovernanceMembersBulkService.js`
- `apps/platform/src/pages/governanceHub/GovernanceMembersBulkUploadPage.jsx`
