-- v1005_fix_projects_delivery_methodology_check.sql
--
-- Root cause: chk_projects_delivery_methodology (added v153) only ever allowed
-- ('PRINCE2', 'Agile', 'Hybrid', 'Waterfall', 'Structured') — the app's methodology
-- vocabulary moved on to lowercase snake_case track ids (hybrid | structured |
-- standards_based | agile, matching accounts.default_methodology's enum and
-- delivery_methodology_track's own constraint from v672/v798) but this specific
-- constraint was never updated to match.
--
-- Confirmed live: LifecycleControlsSection.jsx's "Delivery Methodology" dropdown offers
-- the 4 current values (hybrid/structured/standards_based/agile) as the PRIMARY options,
-- with the 4 old TitleCase values kept only as "(legacy)" — meaning every NEW project
-- created via the primary, intended dropdown options was guaranteed to violate this CHECK.
--
-- Fix: widen the constraint to accept both vocabularies. Existing rows already holding
-- one of the old TitleCase values (or 'PRINCE2') are left untouched — this is additive,
-- not a rename/migration of existing data.

ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS chk_projects_delivery_methodology;
ALTER TABLE public.projects
  ADD CONSTRAINT chk_projects_delivery_methodology
  CHECK (
    delivery_methodology IS NULL
    OR delivery_methodology IN (
      -- Current vocabulary (matches accounts.default_methodology / delivery_methodology_track)
      'hybrid', 'structured', 'standards_based', 'agile',
      -- Legacy values — existing rows only; UI keeps these labeled "(legacy)", not removed
      -- from this constraint since dropping them would break rows already holding them.
      'PRINCE2', 'Agile', 'Hybrid', 'Waterfall', 'Structured'
    )
  );

COMMENT ON CONSTRAINT chk_projects_delivery_methodology ON public.projects IS
  'Accepts the current lowercase methodology-track vocabulary plus the legacy TitleCase '
  'values (incl. PRINCE2) for rows created before v1005 — additive widening, not a data '
  'migration.';

DO $$
BEGIN
  RAISE NOTICE 'v1005: chk_projects_delivery_methodology now accepts hybrid/structured/standards_based/agile alongside the legacy values.';
END $$;
