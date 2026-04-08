# v231 Stakeholder Register — table search

## Objective
Add a register-level search field (name, reference, organization via existing API) next to the project filter.

## Todo
- [x] Debounced search state on `StakeholderRegisterPage`
- [x] Pass `search` into `getStakeholders` for both “first 50” and project-filtered loads
- [x] Theme-aware input + helper copy; refresh/import/toast reloads respect search
- [x] Document in `Documentation/`

## Review
- **File:** `src/pages/platform-app/StakeholderRegisterPage.jsx`
- **API:** Existing `getStakeholders({ search })` / RPC `p_search` (no SQL change).
- **Docs:** `Documentation/Stakeholder_Register_Search.md`
