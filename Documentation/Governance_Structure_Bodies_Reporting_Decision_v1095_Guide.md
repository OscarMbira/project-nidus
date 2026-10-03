# Governance Structure — Bodies, Reporting, Decision, Charts (v1095–v1098)

## Purpose

Capture governance model pieces as scannable lists, structured tables, and chart files.

## Governance Structure tab

| Field | Type | Notes |
|-------|------|--------|
| Overview | Optional textarea | Narrative only |
| Governance charts | **Gallery** (v1098) | Up to 10 images/PDF; browse, drag, paste; optional caption; Delete removes storage + row |
| Governance bodies | Multi-line list | Feeds Escalation / Reporting / Decision party dropdowns |
| Reporting lines | **Table** (v1096) | From · To · Cadence · Notes |
| Decision flow | **Table** (v1097) | Decision · Decided by · Method · Notes |

## PMO Oversight tab

Multi-line list of arrangements (`pmo_oversight_notes`).

## Escalation Path tab

**Table** (v1096): Level · Escalate to (whom) · Timeframe · Notes.

## SQL

1. `SQL/v1095_governance_structure_bodies_reporting_decision.sql`
2. `SQL/v1096_governance_escalation_reporting_structured.sql`
3. `SQL/v1097_governance_decision_entries_structured.sql`
4. `SQL/v1098_governance_charts_storage.sql` — bucket `governance-charts` + `project_governance_charts`
