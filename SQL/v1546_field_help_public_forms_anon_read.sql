-- ============================================================================
-- v1546 — Field help on public forms: anonymous visitors may read public-form help only
-- ============================================================================
-- v1345 slice 4 wave 4o, owner decision 2026-11-22 ("Open only public-form help").
-- Sign in, sign up, password reset, accept invitation and request-a-demo pages are seen before anyone signs in.
-- Field help was readable by signed-in users only (v1490), so those pages showed no help.
--
-- This lets the anon role read field_help rows tagged module_code = 'public_forms' (seeded by v1547), and
-- nothing else. All other help stays signed-in only. Public pages use public.* keys in every app (Simulator's
-- public pages too), so no alias read is needed. Help-usage events stay signed-in only (an anonymous "open"
-- is simply not recorded).
--
-- Idempotent. Prerequisites: v1490.
-- ============================================================================

GRANT SELECT ON public.field_help TO anon;

DROP POLICY IF EXISTS field_help_select_public_forms ON public.field_help;
CREATE POLICY field_help_select_public_forms ON public.field_help
  FOR SELECT TO anon
  USING (is_active AND module_code = 'public_forms');

-- Check: what an anonymous visitor can read (run as a signed-in admin; shows the rows the policy exposes)
SELECT count(*) AS public_form_help_rows FROM public.field_help WHERE is_active AND module_code = 'public_forms';
