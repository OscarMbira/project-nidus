# v1095 — Governance Structure structured fields Plan

## Status

Implemented.

## Changes

- SQL columns on `public.project_governance_structure`
- Service save/load includes new fields
- Governance Structure tab: Overview + Bodies + Reporting lines + Decision flow lists
- PMO Oversight tab: multi-line arrangements list
- Escalation Path tab: multi-line escalation steps list
- Guide: `Documentation/Governance_Structure_Bodies_Reporting_Decision_v1095_Guide.md`

## Review

Apply `SQL/v1095_governance_structure_bodies_reporting_decision.sql` before saving new fields.
