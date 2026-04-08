# v209 – Mandate Pre-fill & Named Contacts on Project Create

## Requirements (from screenshots v2 & v3)

### Image v2 – Governance & Justification tab
| Circle | Field | Requirement |
|---|---|---|
| Yellow | Project Executive / Sponsor | Pre-fill from `mandate.proposed_executive_id`; if only a name is known, show hint + allow adding |
| Green | Project Board Required | Default to **Yes** when arriving from mandate |
| Red | Funding Authority + Approving Authority | Allow adding named (non-user) persons; persist to table for future dropdowns |

### Image v3 – Business Justification section
| Circle | Field | Requirement |
|---|---|---|
| Red | Business Objective / Problem Statement | Pre-fill from `mandate.purpose` |
| Red | Expected Benefits (High Level) | Pre-fill from `mandate.outline_business_case` |
| Green | Benefit Owner | Allow adding named persons; persist for future dropdowns |

---

## Architecture Decision

`funding_authority_user_id`, `approving_authority_user_id`, `benefit_owner_user_id` all have FK `REFERENCES users(id)`. Named contacts must NOT be stored in these UUID fields.

**Two-tier storage:**
- UUID column (existing) → registered system users only
- New TEXT column → named (non-system) persons

**Named contact persistence:** new `project_named_contacts` table stores name + email per org. Loaded alongside system users in dropdowns so they appear again next time.

---

## Files

| # | File | Change |
|---|---|---|
| 1 | `SQL/v264_project_named_contacts.sql` | New table + 3 text cols on projects |
| 2 | `src/components/ui/UserSelectWithAdd.jsx` | New reusable dropdown + inline Add Person form |
| 3 | `src/services/organisationRoleService.js` | `addNamedContact()` + include named contacts in `getOrganisationUsers` |
| 4 | `src/pages/mandate/ProjectMandateView.jsx` | Pass more fromMandate fields (purpose, objectives, outline_bc, exec_name) |
| 5 | `src/pages/ProjectsCreate.jsx` | Pre-fill more fields; load org users eagerly; wire onAddUser; pass fromMandate to sections |
| 6 | `src/components/project/GovernanceSection.jsx` | Accept fromMandate; use UserSelectWithAdd for 3 authority fields; exec name hint |
| 7 | `src/components/project/BusinessJustificationSection.jsx` | Accept fromMandate; use UserSelectWithAdd for Benefit Owner |

---

## Todo List

- [x] 1. Create `SQL/v264_project_named_contacts.sql`
- [x] 2. Create `src/components/ui/UserSelectWithAdd.jsx`
- [x] 3. Update `organisationRoleService.js` – add `addNamedContact` + merge named contacts into `getOrganisationUsers`
- [x] 4. Update `ProjectMandateView.jsx` – expand fromMandate state
- [x] 5. Update `ProjectsCreate.jsx` – fix pre-fills, eager org user load, pass fromMandate + onAddUser
- [x] 6. Update `GovernanceSection.jsx` – use UserSelectWithAdd, exec name hint, accept fromMandate
- [x] 7. Update `BusinessJustificationSection.jsx` – use UserSelectWithAdd, accept fromMandate

---

## Review

**Audit completed.** All items were already implemented; one small enhancement applied.

### Verification

| # | Item | Status |
|---|------|--------|
| 1 | `SQL/v264_project_named_contacts.sql` | Present: table `project_named_contacts`, 4 text columns on `projects`, RLS, registry |
| 2 | `UserSelectWithAdd.jsx` | Present: dropdown + “Add person” inline form, mandateSuggestion hint |
| 3 | `organisationRoleService.js` | Has `addNamedContact()` and `getOrganisationUsers()` merges named contacts (`nc_` id prefix) |
| 4 | `ProjectMandateView.jsx` | Passes full fromMandate: purpose → business_objective, outline_business_case → expected_benefits_summary, proposed_executive_id/name, strategic_alignment from objectives |
| 5 | `ProjectsCreate.jsx` | Pre-fills from fromMandate; eager load of org users in initializePageData; passes fromMandate, handleAuthorityUserChange, handleAddNamedContact; executive_name pre-filled when only proposed_executive_name from mandate |
| 6 | `GovernanceSection.jsx` | Uses UserSelectWithAdd for Executive, Funding Authority, Approving Authority; mandateSuggestion for exec; board_required default Yes when fromMandate; accepts fromMandate, onAddNamedContact |
| 7 | `BusinessJustificationSection.jsx` | Uses UserSelectWithAdd for Benefit Owner; business_objective and expected_benefits_summary pre-filled via formData from fromMandate; accepts fromMandate, onAddNamedContact |

### Change made in this audit

- **ProjectsCreate.jsx:** Initial `executive_name` is now set from `fromMandate.proposed_executive_name` when there is no `executive_user_id`, so the Create Project form shows the mandate’s proposed executive name when only a name is known.
