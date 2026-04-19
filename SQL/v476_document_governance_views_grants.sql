-- ============================================================================
-- v476 — GRANT SELECT on document governance views (public schema)
-- Database: PostgreSQL 15+ (Supabase)
-- ============================================================================
-- Problem: v149 creates pmo_document_compliance_view (and related views) but did
-- not grant SELECT to authenticated. PostgREST then returns:
--   "permission denied for view pmo_document_compliance_view"
-- Fix: GRANT SELECT on each view to authenticated (and service_role for jobs).
-- Idempotent: safe to re-run.
-- ============================================================================

GRANT SELECT ON pmo_document_compliance_view TO authenticated;
GRANT SELECT ON pmo_document_compliance_view TO service_role;

GRANT SELECT ON programme_document_rollup_view TO authenticated;
GRANT SELECT ON programme_document_rollup_view TO service_role;

GRANT SELECT ON overdue_document_approvals_view TO authenticated;
GRANT SELECT ON overdue_document_approvals_view TO service_role;

GRANT SELECT ON project_storage_usage_view TO authenticated;
GRANT SELECT ON project_storage_usage_view TO service_role;

GRANT SELECT ON document_audit_trail_view TO authenticated;
GRANT SELECT ON document_audit_trail_view TO service_role;

-- Storage helpers in v148 are SECURITY DEFINER; granting SELECT on the view is sufficient in most cases.
--
-- YOU MUST RUN THIS IN SUPABASE: Dashboard → SQL Editor → paste this file → Run.
-- Then reload Governance (and any screen using these views).
