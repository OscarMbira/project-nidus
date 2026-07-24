-- ============================================================================
-- v763: Seed starter languages (Platform + Simulator)
-- Companion seed to v762_multi_language_tables.sql (rule 18.2).
-- Reference data (not sample/demo data) — LTR languages only; RTL support is
-- out of scope for this phase (see projectplan/v762_multi_language_field_labels_plan.md).
-- Idempotent: ON CONFLICT DO NOTHING, fixed codes.
-- ============================================================================

INSERT INTO public.languages (code, name, native_name, is_active)
VALUES
    ('en-US', 'English (United States)', 'English', true),
    ('en-GB', 'English (United Kingdom)', 'English', true),
    ('fr-FR', 'French', 'Français', true),
    ('es-ES', 'Spanish', 'Español', true),
    ('de-DE', 'German', 'Deutsch', true),
    ('pt-BR', 'Portuguese (Brazil)', 'Português', true),
    ('it-IT', 'Italian', 'Italiano', true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO sim.languages (code, name, native_name, is_active)
VALUES
    ('en-US', 'English (United States)', 'English', true),
    ('en-GB', 'English (United Kingdom)', 'English', true),
    ('fr-FR', 'French', 'Français', true),
    ('es-ES', 'Spanish', 'Español', true),
    ('de-DE', 'German', 'Deutsch', true),
    ('pt-BR', 'Portuguese (Brazil)', 'Português', true),
    ('it-IT', 'Italian', 'Italiano', true)
ON CONFLICT (code) DO NOTHING;

DO $$
BEGIN
  RAISE NOTICE 'v763_multi_language_seed.sql applied';
END $$;
