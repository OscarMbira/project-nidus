-- ============================================================================
-- v1388: Suggested signatory roles per register (+ Requirements Specification defaults)
-- ============================================================================
-- PRD / plan v1338, Slice 6 — decision D12.
-- local_registers.suggested_signatory_roles (public + sim): [{ "role_label", "is_mandatory" }].
-- The Sign-off tab uses them only when the organisation has set no Document Signatory roles for that
-- document type; the author can remove any before starting sign-off. An organisation's own
-- configuration always wins.
-- Requirements Specification (v1387): Business Owner, IT / Solution Lead, Project Manager.
-- Prerequisites: v1318, v1387. Idempotent.
-- ============================================================================

ALTER TABLE public.local_registers ADD COLUMN IF NOT EXISTS suggested_signatory_roles JSONB;
ALTER TABLE sim.local_registers ADD COLUMN IF NOT EXISTS suggested_signatory_roles JSONB;

COMMENT ON COLUMN public.local_registers.suggested_signatory_roles IS
  'v1388: suggested sign-off roles [{role_label, is_mandatory}] for document registers — used when the organisation has none configured on the Document Signatory page.';

UPDATE public.local_registers
SET suggested_signatory_roles = '[
  {"role_label":"Business Owner","is_mandatory":true},
  {"role_label":"IT / Solution Lead","is_mandatory":true},
  {"role_label":"Project Manager","is_mandatory":true}
]'::jsonb,
    updated_at = NOW()
WHERE register_key = 'ict_requirements_specification'
  AND is_system_defined = TRUE;

DO $$
DECLARE
  v_roles INT;
BEGIN
  SELECT jsonb_array_length(COALESCE(suggested_signatory_roles, '[]'::jsonb)) INTO v_roles
  FROM public.local_registers WHERE register_key = 'ict_requirements_specification' AND is_system_defined = TRUE;
  RAISE NOTICE 'v1388: Requirements Specification has % suggested signatory roles (expected 3)', COALESCE(v_roles, 0);
END $$;

NOTIFY pgrst, 'reload schema';
