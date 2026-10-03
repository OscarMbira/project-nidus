# v1097 — Structured Decision Flow

## Problem

Decision flow was still a free-text multi-line list while Reporting and Escalation use structured tables.

## Solution

Table: **Decision · Decided by · Method · Notes**, same party dropdown as Reporting/Escalation. Persist as JSONB `decision_entries`; keep `decision_flow` TEXT in sync.

## Schema

`decision_entries` JSONB array of `{ decision, decided_by, method, notes }`.

SQL: `SQL/v1097_governance_decision_entries_structured.sql`
