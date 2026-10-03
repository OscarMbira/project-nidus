# v1097 — Structured Decision Flow Plan

## Status

Implemented.

## Decisions

- Columns: Decision, Decided by (whom), Method, Notes
- JSONB `decision_entries`; legacy `decision_flow` text kept in sync
- Method options: Consensus, Majority vote, Unanimous, Chair/Sponsor decision, Delegated, Escalation required (+ allowCustom)
- Decided by uses same party options as Reporting From/To

## Files

- `SQL/v1097_governance_decision_entries_structured.sql`
- `apps/platform/src/services/governancePartyOptions.js`
- `apps/platform/src/services/projectGovernanceStructureService.js`
- `apps/platform/src/pages/governanceHub/GovernanceStructurePage.jsx`
- `apps/platform/src/services/__tests__/governancePartyOptions.test.js`

## Apply

Run `SQL/v1097_governance_decision_entries_structured.sql` on Supabase (after v1095).
