# v1095 — Governance Structure: Bodies, Reporting Lines, Decision Flow

**Status:** Implemented (approved 2026-09-20).

## Problem

Governance Structure used one free-text field; users need structured capture of
bodies, reporting lines, and how decisions flow.

## Solution

On the **Governance Structure** tab: three `MultiLineListInput` lists plus optional overview.
PMO Oversight and Escalation Path remain their own tabs.

## Schema

`project_governance_structure`: `governance_bodies`, `reporting_lines`, `decision_flow` (TEXT, newline-joined).
`structure_notes` kept as optional overview.

SQL: `SQL/v1095_governance_structure_bodies_reporting_decision.sql`
