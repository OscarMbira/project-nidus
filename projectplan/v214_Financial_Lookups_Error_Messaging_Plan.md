## v214 – Financial Lookups & Dropdown Messaging Plan

### Objective
Improve the financial controls budget category / funding source dropdown experience so that:
- Seeded data (v269, v272) is correctly surfaced for eligible users.
- The UI clearly distinguishes between “no data seeded”, “no organisation / access”, and “load error” states instead of a single generic message.

### Tasks
- [ ] Confirm how funding sources and budget categories are resolved for the current user on the create-project form.
- [ ] Propagate lookup load errors (and “no organisation” state) from services into `ProjectsCreate` state.
- [ ] Update `FinancialControlsSection` to show clearer, state-specific helper text instead of a single generic “run seed scripts” message.
- [ ] Regression check: ensure existing seeded data appears for an account owner and for a project member with access.
- [ ] Add a brief review note back into this plan after implementation.

### Review Notes
- To be completed after implementation and basic regression checks.

