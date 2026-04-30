# PMIS Forms & Attributes Coverage - Operations Runbook

## Purpose

This runbook defines operational procedures for deploying, validating, and supporting the PMIS Forms & Attributes module delivered in SQL versions `v502` to `v507`.

## Deployment Order

Apply migrations in this sequence:

1. `SQL/v502_form_engine_tables.sql`
2. `SQL/v503_form_engine_sim.sql`
3. `SQL/v504_missing_normalized_registers.sql`
4. `SQL/v505_missing_normalized_registers_sim.sql`
5. `SQL/v506_form_template_seeds.sql`
6. `SQL/v507_form_permissions.sql`

## Pre-Deployment Checks

- Confirm `public` and `sim` schemas are reachable.
- Confirm RBAC base tables exist (`permissions`, `role_permissions`, `roles`).
- Confirm `database_tables` registry table exists.
- Confirm RLS is enabled and baseline policies are in place.

## Post-Deployment Validation

### Database

- Verify table creation for form engine entities in both schemas.
- Verify template seed count and current version rows.
- Verify permission rows were upserted by `permission_code`.
- Verify RLS remains enabled on new tables.

### Application

- Platform routes resolve under `/platform/projects/:projectId/forms`.
- Simulator routes resolve under `/simulator/pm/projects/:projectId/forms`.
- Form template admin resolves under `/platform/admin/form-templates`.
- PM/PMO and simulator menu trees show domain-correct entries only.

### Functional Smoke Tests

1. Create form draft.
2. Edit values and repeating rows.
3. Submit for approval.
4. Approve or reject.
5. Attach file and add comment.
6. Export form in at least one format.

## Test Verification

Run targeted tests:

`npm run test -- src/services/__tests__/formEngineService.test.js src/services/__tests__/formCalculations.test.js src/services/__tests__/formValidation.test.js`

Expected result: all tests pass.

## Known Operational Risks and Controls

- **Risk:** Cross-domain menu leakage (Platform showing Simulator entries).  
  **Control:** Context-aware recursive menu pruning in sidebar render flow.

- **Risk:** Permission seed mismatch due to column naming.  
  **Control:** Use canonical columns (`permission_code`, `permission_name`, `permission_description`, etc.).

- **Risk:** Route mismatch across PM and Simulator PM.  
  **Control:** Normalize to `/platform/...` and `/simulator/pm/...` patterns.

## Incident Triage Guide

### Symptom: Form pages not visible

- Check role permissions for `form.view`.
- Confirm menu item path is in correct domain.
- Confirm route exists in app router.

### Symptom: Submit/approve action unavailable

- Check form status (`draft`, `in_review`, etc.).
- Check `form.approve` permission.
- Check table RLS policies and role mapping.

### Symptom: SQL migration failure

- Capture exact SQL error and line.
- Compare target table schema with migration assumptions.
- Patch migration to canonical schema and re-run.

## Rollback Approach

- Preferred rollback is forward-fix migration.
- If emergency rollback is required:
  - Disable menu entries via menu config deployment.
  - Revert route exposure in app build.
  - Keep data tables unless explicit data rollback is approved.

## Ownership

- Product owner: PMO / Platform governance team
- Technical owner: Application engineering team
- DB owner: Supabase/PostgreSQL admin team
