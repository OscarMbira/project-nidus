# Stakeholder Register — search

## Behaviour
On **Platform → Stakeholder Register**, a **Search register** field filters the list by **stakeholder name**, **reference**, and **organization** (same semantics as `get_stakeholders_list` / `getStakeholders` `search`).

- Input is **debounced (~350ms)** to limit API calls.
- Search applies with **no project selected** (first 50 cap) and **with a project selected** (combined with project filter).
- **Export** uses the currently loaded (filtered) rows.

## Code
- `src/pages/platform-app/StakeholderRegisterPage.jsx`

## Plan
- `projectplan/v231_Stakeholder_Register_Search_Plan.md`
