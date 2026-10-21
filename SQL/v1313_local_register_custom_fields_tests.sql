-- ============================================================================
-- v1313 tests: organisation custom fields on Local Registers (v1311 + v1312).
-- Impersonates real users through request.jwt.claims. Every write happens inside a sub-block
-- that is deliberately rolled back at the end, so the test leaves NO data behind; only the
-- results table below survives.
--
--   T1  functions exist (public + sim)
--   T2  a member creates a text field on a system register → created, published, attached
--   T3  same name with different case/spacing/punctuation → duplicate (existing returned)
--   T4  list + library show the field (attached, used count)
--   T5  attaching an already-attached field → already_attached (no second map row)
--   T6  per-organisation override at the current count → next add refused (limit)
--   T7  a dropdown needs options; options are stored de-duplicated
--   T8  a user from another organisation cannot add to this organisation
--   T9  Simulator: same flow in sim.* is isolated from public.*
-- ============================================================================

CREATE TEMP TABLE IF NOT EXISTS v1313_results (test TEXT PRIMARY KEY, passed BOOLEAN, detail TEXT);
TRUNCATE v1313_results;

DO $$
DECLARE
  v_register  UUID := '00000000-0000-4000-9001-000000000007';   -- Product Configuration (system-defined)
  v_owner     UUID;
  v_account   UUID;
  v_other     UUID;
  v_res       JSONB;
  v_list      JSONB;
  v_field     UUID;
  v_err       TEXT;
  v_results   TEXT[] := ARRAY[]::TEXT[];   -- 'name|passed|detail', kept across the rollback
  v_line      TEXT;
BEGIN
  v_results := v_results || format('T1 functions exist|%s|',
    to_regprocedure('public.local_register_add_custom_field(uuid, uuid, text, text, jsonb, boolean)') IS NOT NULL
    AND to_regprocedure('public.local_register_attach_custom_field(uuid, uuid, uuid)') IS NOT NULL
    AND to_regprocedure('public.local_register_custom_fields(uuid, uuid)') IS NOT NULL
    AND to_regprocedure('sim.local_register_add_custom_field(uuid, uuid, text, text, jsonb, boolean)') IS NOT NULL
    AND to_regprocedure('sim.local_register_custom_fields(uuid, uuid)') IS NOT NULL);

  SELECT u.auth_user_id, a.id INTO v_owner, v_account
    FROM public.accounts a JOIN public.users u ON u.id = a.owner_user_id
   WHERE u.auth_user_id IS NOT NULL AND COALESCE(a.is_deleted, FALSE) = FALSE
   ORDER BY a.created_at LIMIT 1;

  IF v_owner IS NULL OR NOT EXISTS (SELECT 1 FROM public.local_registers WHERE id = v_register) THEN
    v_results := v_results || 'T2-T9 skipped|true|no account owner or Product Configuration register';
  ELSE
    BEGIN
      PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner, 'role', 'authenticated')::text, TRUE);

      -- T2
      v_res := public.local_register_add_custom_field(v_register, v_account, 'ZZ v1313 Test Vendor Ref', 'text', '[]'::jsonb, FALSE);
      v_field := (v_res -> 'field' ->> 'id')::uuid;
      v_results := v_results || format('T2 create text field|%s|%s',
        v_res ->> 'status' = 'created'
        AND EXISTS (SELECT 1 FROM public.custom_field_definitions WHERE id = v_field AND workflow_status = 'published'),
        v_res::text);

      -- T3
      v_res := public.local_register_add_custom_field(v_register, v_account, '  zz V1313 test-vendor   ref ', 'number', '[]'::jsonb, FALSE);
      v_results := v_results || format('T3 duplicate name blocked|%s|%s',
        v_res ->> 'status' = 'duplicate' AND (v_res -> 'existing' ->> 'id')::uuid = v_field, v_res::text);

      -- T4
      v_list := public.local_register_custom_fields(v_register, v_account);
      v_res := public.local_register_custom_field_library(v_register, v_account);
      v_results := v_results || format('T4 list + library|%s|used=%s',
        EXISTS (SELECT 1 FROM jsonb_array_elements(v_list -> 'fields') f WHERE (f ->> 'id')::uuid = v_field)
        AND EXISTS (SELECT 1 FROM jsonb_array_elements(v_res) f WHERE (f ->> 'id')::uuid = v_field AND (f ->> 'attached')::boolean),
        v_list ->> 'used');

      -- T5
      v_res := public.local_register_attach_custom_field(v_register, v_account, v_field);
      v_results := v_results || format('T5 attach again → already_attached|%s|%s',
        v_res ->> 'status' = 'already_attached'
        AND (SELECT COUNT(*) FROM public.custom_field_screen_map WHERE field_definition_id = v_field) = 1,
        v_res ->> 'status');

      -- T7 (before the limit test)
      BEGIN
        PERFORM public.local_register_add_custom_field(v_register, v_account, 'ZZ v1313 No Options', 'dropdown', '[]'::jsonb, FALSE);
        v_err := NULL;
      EXCEPTION WHEN OTHERS THEN v_err := SQLERRM;
      END;
      v_res := public.local_register_add_custom_field(v_register, v_account, 'ZZ v1313 Priority', 'dropdown',
                                                      '["High", "high", "Medium", "Low", ""]'::jsonb, TRUE);
      v_results := v_results || format('T7 dropdown options|%s|err=%s options=%s',
        v_err LIKE '%at least one option%'
        AND jsonb_array_length(v_res -> 'field' -> 'options') = 3
        AND (v_res -> 'field' ->> 'required')::boolean,
        v_err, v_res -> 'field' -> 'options');

      -- T6
      v_list := public.local_register_custom_fields(v_register, v_account);
      INSERT INTO public.local_register_custom_field_limit_overrides (account_id, field_limit, reason)
      VALUES (v_account, GREATEST((v_list ->> 'used')::int, 1), 'v1313 test')
      ON CONFLICT (account_id) DO UPDATE SET field_limit = EXCLUDED.field_limit;
      BEGIN
        PERFORM public.local_register_add_custom_field(v_register, v_account, 'ZZ v1313 Over Limit', 'text', '[]'::jsonb, FALSE);
        v_err := NULL;
      EXCEPTION WHEN OTHERS THEN v_err := SQLERRM;
      END;
      v_results := v_results || format('T6 limit enforced (override)|%s|%s',
        v_err LIKE 'CUSTOM_FIELD_LIMIT_REACHED%', v_err);

      -- T8: a user who does not belong to this account
      SELECT u.auth_user_id INTO v_other
        FROM public.users u
       WHERE u.auth_user_id IS NOT NULL AND u.auth_user_id <> v_owner
         AND NOT EXISTS (SELECT 1 FROM public.accounts a WHERE a.id = v_account AND a.owner_user_id = u.id)
       ORDER BY u.created_at LIMIT 1;
      IF v_other IS NOT NULL THEN
        PERFORM set_config('request.jwt.claims', json_build_object('sub', v_other, 'role', 'authenticated')::text, TRUE);
        IF public.user_has_access_to_account(v_account) THEN
          v_results := v_results || 'T8 skipped|true|first other user also belongs to the account';
        ELSE
          BEGIN
            PERFORM public.local_register_add_custom_field(v_register, v_account, 'ZZ v1313 Intruder', 'text', '[]'::jsonb, FALSE);
            v_err := NULL;
          EXCEPTION WHEN OTHERS THEN v_err := SQLERRM;
          END;
          v_list := public.local_register_custom_fields(v_register, v_account);
          v_results := v_results || format('T8 other organisation refused|%s|%s',
            v_err LIKE '%do not belong%' AND jsonb_array_length(v_list -> 'fields') = 0, v_err);
        END IF;
        PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner, 'role', 'authenticated')::text, TRUE);
      ELSE
        v_results := v_results || 'T8 skipped|true|no second user';
      END IF;

      -- T9 Simulator isolation
      DELETE FROM public.local_register_custom_field_limit_overrides WHERE account_id = v_account;
      v_res := sim.local_register_add_custom_field(v_register, v_account, 'ZZ v1313 Sim Only', 'multi_line', '[]'::jsonb, FALSE);
      v_list := sim.local_register_custom_fields(v_register, v_account);
      v_results := v_results || format('T9 Simulator isolated|%s|%s',
        v_res ->> 'status' = 'created'
        AND EXISTS (SELECT 1 FROM jsonb_array_elements(v_list -> 'fields') f WHERE f ->> 'label' = 'ZZ v1313 Sim Only')
        AND NOT EXISTS (SELECT 1 FROM public.custom_field_definitions WHERE label = 'ZZ v1313 Sim Only'),
        v_res ->> 'status');

      RAISE EXCEPTION 'v1313_rollback';   -- undo every test write
    EXCEPTION
      WHEN OTHERS THEN
        IF SQLERRM <> 'v1313_rollback' THEN
          v_results := v_results || format('Unexpected error|false|%s', SQLERRM);
        END IF;
    END;
  END IF;

  FOREACH v_line IN ARRAY v_results LOOP
    INSERT INTO v1313_results VALUES (split_part(v_line, '|', 1), split_part(v_line, '|', 2)::boolean, split_part(v_line, '|', 3))
    ON CONFLICT (test) DO NOTHING;
  END LOOP;
END $$;

SELECT test, passed, detail FROM v1313_results ORDER BY test;
