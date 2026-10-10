-- =============================================================================
-- v1210: Vendor code from Admin ID Generation when left blank
-- =============================================================================
-- Create Vendor leaves Vendor code empty → VEN-YYYY-### for that organisation
-- (VND-YYYY-### if VEN is already an active abbreviation). A code the user
-- typed is kept. Companion rule seed:
-- E:\project-nidus-admin\SQL\v224_vendors_id_generation_seed.sql
-- =============================================================================

DROP TRIGGER IF EXISTS trg_vendors_admin_display_id ON public.vendors;
CREATE TRIGGER trg_vendors_admin_display_id
  AFTER INSERT ON public.vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_apply_admin_display_id('public.vendors', 'vendor_code');

DO $$
DECLARE
  v_admin UUID;
  v_rule_id UUID;
  v_abbrev VARCHAR(4);
  v_ref TEXT;
  r RECORD;
BEGIN
  SELECT id INTO v_admin
  FROM admin.admin_users
  WHERE activation_status = 'active'
  ORDER BY CASE WHEN role = 'super_admin' THEN 0 ELSE 1 END, created_at
  LIMIT 1;

  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'No active admin user found. Activate an admin user, then re-run this script.';
  END IF;

  v_abbrev := 'VEN';
  IF EXISTS (
    SELECT 1
    FROM admin.id_generation_rules
    WHERE upper(table_abbreviation) = 'VEN'
      AND is_active = TRUE
      AND admin.normalize_id_generation_target_table(target_table)
          <> admin.normalize_id_generation_target_table('public.vendors')
  ) THEN
    v_abbrev := 'VND';
  END IF;

  SELECT id INTO v_rule_id
  FROM admin.id_generation_rules
  WHERE admin.normalize_id_generation_target_table(target_table)
      = admin.normalize_id_generation_target_table('public.vendors')
  LIMIT 1;

  IF v_rule_id IS NOT NULL THEN
    PERFORM admin.update_id_generation_rule(
      v_rule_id,
      'public.vendors',
      v_abbrev,
      'Vendor codes',
      '-', '', 'uppercase', 'numeric', 0, 3, '', 1, TRUE, v_admin,
      'sequential', TRUE, 'YYYY', 'account_id'
    );
  ELSE
    PERFORM admin.create_id_generation_rule(
      'public.vendors',
      v_abbrev,
      'Vendor codes',
      '-', '', 'uppercase', 'numeric', 0, 3, '', 1, TRUE, v_admin,
      'sequential', TRUE, 'YYYY', 'account_id'
    );
  END IF;

  FOR r IN
    SELECT id
    FROM public.vendors
    WHERE COALESCE(is_deleted, FALSE) = FALSE
      AND (vendor_code IS NULL OR btrim(vendor_code) = '')
    ORDER BY created_at NULLS LAST, id
  LOOP
    v_ref := admin.generate_display_id('public.vendors', r.id);
    IF v_ref IS NOT NULL AND btrim(v_ref) <> '' THEN
      UPDATE public.vendors
      SET vendor_code = v_ref
      WHERE id = r.id;
    END IF;
  END LOOP;
END $$;
