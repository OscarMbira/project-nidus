# v191 — Industry Plan WBS Outline Level (Platform / Simulator)

Parity with Admin **v186**: MS Project–style Collapse all / Expand all / Outline level on the industry-plan WBS grid.

## Changes

- `@nidus/shared` `industryPlanGridUtils.js` — outline helpers
- `@nidus/ui` `IndustryPlanWizardGrids.jsx` — `WbsOutlineToolbar` on `IndustryPlanWbsGrid`

## Review

Platform and Simulator industry template wizards inherit the same outline controls automatically via the shared UI package.
