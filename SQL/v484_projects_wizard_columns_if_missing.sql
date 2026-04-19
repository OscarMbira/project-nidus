-- v484: Ensure projects columns used by Platform project edit / wizard exist (PostgREST schema cache).
-- Safe to run repeatedly (IF NOT EXISTS). Aligns with v264 (named contacts) and v266 (extra tolerances).
-- Error fixed: "Could not find the 'executive_name' column of 'projects' in the schema cache"

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS executive_name TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS funding_authority_name TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS approving_authority_name TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS benefit_owner_name TEXT;

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS tolerance_quality_description TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS tolerance_risk_description TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS tolerance_benefits_description TEXT;

COMMENT ON COLUMN public.projects.executive_name IS 'Display name when executive_user_id is null (non-system contact)';
COMMENT ON COLUMN public.projects.funding_authority_name IS 'Display name when funding_authority_user_id is null';
COMMENT ON COLUMN public.projects.approving_authority_name IS 'Display name when approving_authority_user_id is null';
COMMENT ON COLUMN public.projects.benefit_owner_name IS 'Display name when benefit_owner_user_id is null';
