# Testing & Diagnostics Centre — User Guide

**Audience:** Project managers, QA, PMO, Simulator users.  
**Routes:** Platform `/platform/testing-centre`, PM `/pm/testing-centre`, PMO `/pmo/testing-centre`, Simulator variants under `/simulator/.../testing-centre`.

## What you can do

- Browse the **test case library** and **suites** seeded from the PMIS module map.
- **Start test runs** (when `testing_centre.run` is granted) and open **defects** created from failed automation.
- Use the **diagnostic centre** to record user-raised issues and link them to existing defects.
- **Export** lists and records (CSV, JSON, office formats) from list and detail pages.

## Permissions

The application checks `testing_centre.*` permission codes. Ask your admin if a menu or action is hidden.

## Evidence & AI prompts

Failure screenshots and optional **AI fix prompt** files are stored in the `testing-centre-evidence` bucket (see Runbook for bucket setup).
