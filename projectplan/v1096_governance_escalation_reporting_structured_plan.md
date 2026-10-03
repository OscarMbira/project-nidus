# v1096 — Structured Escalation & Reporting (Whom dropdown)

## Status

Implemented.

## Decisions

- Escalation: Level, Escalate to (whom), Timeframe, Notes — JSONB `escalation_steps`
- Reporting: From, To, Cadence, Notes — JSONB `reporting_entries`
- Whom / From / To options: governance bodies + SC/Board members + project functional roles; allowCustom
- Legacy TEXT columns kept in sync for simple export/compat

## Files

- `SQL/v1096_governance_escalation_reporting_structured.sql`
- `apps/platform/src/services/governancePartyOptions.js`
- `apps/platform/src/services/projectGovernanceStructureService.js`
- `apps/platform/src/pages/governanceHub/GovernanceStructurePage.jsx`

## Apply

Run v1095 then v1096 on Supabase before using the new tables.
