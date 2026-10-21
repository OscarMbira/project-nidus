-- ============================================================================
-- v1293: fix "Save as report" — report_templates.created_by default (Platform)
-- ============================================================================
-- Bug (found live 2026-10-20): saving an Ask Nidus answer as a report failed with
--   insert or update on table "report_templates" violates foreign key constraint
--   "report_templates_created_by_fkey"   (HTTP 409 in the browser console)
--
-- Cause: v1278 set public.report_templates.created_by DEFAULT auth.uid() (the sign-in id), but on
-- the Platform table created_by REFERENCES public.users(id) (v33), which is a different id.
-- Every insert that did not set created_by (Ask Nidus "Save as report", Report Builder "Save")
-- therefore failed.
--
-- Fix: default to the caller's public.users id via public.current_internal_user_id() (v1119).
-- sim.report_templates is unchanged: its created_by has no foreign key and auth.uid() is correct
-- there. Ownership checks (report_template_is_mine, v1278) accept either id form, so nothing else
-- changes. No rows need repair: the failed inserts were never written.
-- Prerequisites: v1119, v1278. Idempotent.
-- ============================================================================

ALTER TABLE public.report_templates ALTER COLUMN created_by SET DEFAULT public.current_internal_user_id();

NOTIFY pgrst, 'reload schema';

-- Check (read-only): expect public → current_internal_user_id(), sim → auth.uid().
SELECT table_schema, column_default
FROM information_schema.columns
WHERE table_name = 'report_templates' AND column_name = 'created_by' AND table_schema IN ('public', 'sim')
ORDER BY table_schema;
