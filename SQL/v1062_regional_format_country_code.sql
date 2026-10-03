-- ============================================================================
-- v1062: Regional & Format Settings — country_code (ISO 3166-1 alpha-2)
-- ============================================================================
-- First setting on Regional & Format Settings; options from public.countries
-- (is_active = true). Stores country code; UI shows "CODE — Country name".
-- ============================================================================

ALTER TABLE public.organisation_regional_format_settings
  ADD COLUMN IF NOT EXISTS country_code VARCHAR(2) NOT NULL DEFAULT '';

ALTER TABLE public.project_regional_format_settings
  ADD COLUMN IF NOT EXISTS country_code VARCHAR(2);

COMMENT ON COLUMN public.organisation_regional_format_settings.country_code IS
  'ISO 3166-1 alpha-2 country code (from public.countries.code); empty = unset.';

COMMENT ON COLUMN public.project_regional_format_settings.country_code IS
  'Project override ISO country code; NULL = inherit organisation default.';
