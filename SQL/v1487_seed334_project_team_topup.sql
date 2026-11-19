-- ============================================================================
-- v1487: Project Team top-up for SEED334 demo projects (v1344, slice 7 seed)
-- ============================================================================
-- PRD projectprd/v1344_project_setup_forms_fields_audit_seed_PRD.md, plan slice 7.
-- PRJ-08 already has 10 contacts (v1436), 2 teams (v1079) and 10 RACI rows (v1089).
-- This file adds, on SEED334-PRJ-01 (banking) and SEED334-PRJ-03 (energy):
--   * 10 contacts on PRJ-01 (internal / client / vendor / other mix);
--   * one team on PRJ-01 and one on PRJ-03 (4 teams across the ten in total), members taken
--     from each project's existing memberships only: no new memberships, no role changes,
--     so the v1472 invite rules are not touched;
--   * one complete RACI matrix on PRJ-01 (6 rows, R/A/C/I on every row).
-- Team codes are left blank so the Admin display-ID trigger assigns them (rule 16.2).
-- Fixed ids (prefix c1344f…). Idempotent: ON CONFLICT on ids / natural keys. Safe to re-run.
-- Prerequisites: v04, v390, v644, v1020, v1079, v1089, v334.
-- ============================================================================

-- ── 1. Contacts on PRJ-01 ───────────────────────────────────────────────────
INSERT INTO public.project_contacts (id, project_id, contact_name, role_title, organisation, contact_type, email, phone, primary_email, primary_phone, notes, created_by, updated_by)
SELECT v.id::uuid, p.id, v.name, v.role, v.org, v.kind, v.email, v.phone, v.email, v.phone, v.notes, p.owner_user_id, p.owner_user_id
FROM (VALUES
  ('c1344f01-0000-4000-8000-000000000001', 'Rutendo Chikwanha', 'Head of Retail Banking (sponsor)', 'Client bank', 'client', 'rutendo.chikwanha@clientbank.example', '+263 77 310 0001', 'Chairs the project board and signs off each stage.'),
  ('c1344f01-0000-4000-8000-000000000002', 'Farai Mutasa', 'Chief Information Security Officer', 'Client bank', 'client', 'farai.mutasa@clientbank.example', '+263 77 310 0002', 'Approves security design and penetration test results.'),
  ('c1344f01-0000-4000-8000-000000000003', 'Nyasha Dube', 'Branch Operations Manager', 'Client bank', 'client', 'nyasha.dube@clientbank.example', '+263 77 310 0003', 'Senior user for branch processes.'),
  ('c1344f01-0000-4000-8000-000000000004', 'Tatenda Sibanda', 'Compliance Officer', 'Client bank', 'client', 'tatenda.sibanda@clientbank.example', '+263 77 310 0004', 'Reviews regulatory reporting changes.'),
  ('c1344f01-0000-4000-8000-000000000005', 'Kudzai Marufu', 'Solution Architect', 'Delivery team', 'internal', 'kudzai.marufu@delivery.example', '+263 77 310 0005', 'Owns the target architecture and design decisions.'),
  ('c1344f01-0000-4000-8000-000000000006', 'Chipo Nyathi', 'Test Manager', 'Delivery team', 'internal', 'chipo.nyathi@delivery.example', '+263 77 310 0006', 'Leads system and user acceptance testing.'),
  ('c1344f01-0000-4000-8000-000000000007', 'Blessing Moyo', 'Account Manager', 'Core banking software vendor', 'vendor', 'blessing.moyo@corevendor.example', '+263 77 310 0007', 'Vendor escalation point for licence and support issues.'),
  ('c1344f01-0000-4000-8000-000000000008', 'Simba Gumbo', 'Implementation Lead', 'Core banking software vendor', 'vendor', 'simba.gumbo@corevendor.example', '+263 77 310 0008', 'Runs vendor configuration and data load support.'),
  ('c1344f01-0000-4000-8000-000000000009', 'Precious Zhou', 'Relationship Manager', 'Payments switch provider', 'vendor', 'precious.zhou@paymentsswitch.example', '+263 77 310 0009', 'Coordinates card and mobile payment interface testing.'),
  ('c1344f01-0000-4000-8000-000000000010', 'Tinashe Mhlanga', 'Supervision Liaison', 'Banking regulator', 'other', 'tinashe.mhlanga@regulator.example', '+263 77 310 0010', 'Receives notice of go-live and major incidents.')
) AS v(id, name, role, org, kind, email, phone, notes)
CROSS JOIN LATERAL (
  SELECT pr.id, pr.owner_user_id FROM public.projects pr
  WHERE pr.project_code = 'SEED334-PRJ-01' AND COALESCE(pr.is_deleted, FALSE) = FALSE
  LIMIT 1) p
ON CONFLICT (id) DO NOTHING;

-- ── 2. Teams on PRJ-01 and PRJ-03 (members from existing memberships) ───────
DO $$
DECLARE
  r RECORD;
  v_team uuid;
  v_lead uuid;
  v_users uuid[];
  i integer;
BEGIN
  FOR r IN
    SELECT t.code, t.team_id::uuid AS team_id, t.team_name, t.team_desc, t.max_size, t.roles
    FROM (VALUES
      ('SEED334-PRJ-01', 'c1344f02-0000-4000-8000-000000000001', 'Core Banking Delivery',
       'Configures the core banking platform, builds interfaces and runs testing for the branch roll-out.', 8,
       ARRAY['Product Owner', 'Business Analyst', 'Integration Developer', 'Test Analyst']),
      ('SEED334-PRJ-03', 'c1344f02-0000-4000-8000-000000000002', 'Grid Upgrade Field Team',
       'Plans outages, installs smart meters and commissions upgraded substations.', 10,
       ARRAY['Field Supervisor', 'Electrical Engineer', 'Safety Officer', 'Scheduler'])
    ) AS t(code, team_id, team_name, team_desc, max_size, roles)
  LOOP
    CONTINUE WHEN NOT EXISTS (
      SELECT 1 FROM public.projects p WHERE p.project_code = r.code AND COALESCE(p.is_deleted, FALSE) = FALSE);

    v_lead := (SELECT COALESCE(p.project_manager_user_id, p.owner_user_id) FROM public.projects p
               WHERE p.project_code = r.code AND COALESCE(p.is_deleted, FALSE) = FALSE LIMIT 1);
    v_users := ARRAY(
      SELECT pm.user_id FROM public.project_memberships pm
      JOIN public.projects p ON p.id = pm.project_id
      WHERE p.project_code = r.code AND COALESCE(pm.is_active, TRUE) = TRUE AND pm.user_id IS NOT NULL
      ORDER BY pm.created_at NULLS LAST
      LIMIT 4);
    IF v_lead IS NULL THEN v_lead := v_users[1]; END IF;
    CONTINUE WHEN v_lead IS NULL;
    IF NOT (v_lead = ANY (v_users)) THEN v_users := array_prepend(v_lead, v_users); END IF;

    -- Reuse a team of the same name if someone already created it.
    v_team := (SELECT t.id FROM public.teams t JOIN public.projects p ON p.id = t.project_id
               WHERE p.project_code = r.code AND t.team_name = r.team_name
               ORDER BY t.created_at LIMIT 1);
    IF v_team IS NULL THEN
      v_team := r.team_id;
      INSERT INTO public.teams (id, project_id, team_name, team_description, team_type,
                                team_lead_user_id, max_team_size, team_code, is_active, is_deleted, created_by)
      SELECT v_team, p.id, r.team_name, r.team_desc, 'delivery', v_lead, r.max_size, '', TRUE, FALSE, v_lead
      FROM public.projects p WHERE p.project_code = r.code AND COALESCE(p.is_deleted, FALSE) = FALSE
      LIMIT 1
      ON CONFLICT (id) DO NOTHING;
    END IF;

    FOR i IN 1 .. cardinality(r.roles) LOOP
      INSERT INTO public.team_functional_roles (team_id, role_label, required_skills, sort_order, is_active)
      VALUES (v_team, r.roles[i], NULL, i * 10, TRUE)
      ON CONFLICT (team_id, role_label) DO NOTHING;
    END LOOP;

    FOR i IN 1 .. LEAST(cardinality(v_users), cardinality(r.roles)) LOOP
      INSERT INTO public.team_members (team_id, user_id, member_role, allocation_percentage,
                                       allocation_start_date, allocation_end_date, is_active, is_deleted, created_by)
      VALUES (v_team, v_users[i], r.roles[i], CASE i WHEN 1 THEN 50 WHEN 2 THEN 100 WHEN 3 THEN 80 ELSE 60 END,
              CURRENT_DATE - 30, CURRENT_DATE + 150, TRUE, FALSE, v_lead)
      ON CONFLICT (team_id, user_id) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- ── 3. RACI matrix on PRJ-01 (6 rows, every row has R, A, C and I) ──────────
-- raci_assignments.member_user_id references auth.users(id), as in v1089.
DO $$
DECLARE
  v_project uuid;
  v_auth uuid[];
  v_matrix uuid := 'c1344f03-0000-4000-8000-000000000001';
  i integer;
  v_rows text[] := ARRAY[
    'Confirm branch process requirements',
    'Approve core banking configuration design',
    'Build payments switch interface',
    'Migrate customer and account data',
    'Run user acceptance testing',
    'Go / no-go decision for branch roll-out'];
BEGIN
  v_project := (SELECT p.id FROM public.projects p
                WHERE p.project_code = 'SEED334-PRJ-01' AND COALESCE(p.is_deleted, FALSE) = FALSE LIMIT 1);
  IF v_project IS NULL THEN
    RAISE NOTICE 'v1487: SEED334-PRJ-01 not found, RACI skipped';
    RETURN;
  END IF;

  v_auth := ARRAY(
    SELECT DISTINCT u.auth_user_id FROM public.project_memberships pm
    JOIN public.users u ON u.id = pm.user_id
    WHERE pm.project_id = v_project AND COALESCE(pm.is_active, TRUE) = TRUE
      AND u.auth_user_id IS NOT NULL AND COALESCE(u.is_deleted, FALSE) = FALSE
    ORDER BY u.auth_user_id
    LIMIT 4);
  IF cardinality(v_auth) = 0 THEN
    RAISE NOTICE 'v1487: no auth-linked members on SEED334-PRJ-01, RACI skipped';
    RETURN;
  END IF;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_auth[1]::text)::text, true);

  INSERT INTO public.raci_matrices (id, project_id, matrix_name, matrix_version, status, created_by, created_at, updated_at)
  VALUES (v_matrix, v_project, 'Core Banking Roll-out RACI', 1, 'active', v_auth[1], NOW() - INTERVAL '30 days', NOW() - INTERVAL '2 days')
  ON CONFLICT (id) DO NOTHING;

  FOR i IN 1 .. cardinality(v_rows) LOOP
    INSERT INTO public.raci_rows (id, matrix_id, deliverable_name, sort_order, created_at, updated_at)
    VALUES (('c1344f04-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid, v_matrix, v_rows[i], i * 10,
            NOW() - INTERVAL '29 days', NOW() - INTERVAL '29 days')
    ON CONFLICT (id) DO NOTHING;

    -- Rotate members across the roles; with fewer than 4 members some people hold two letters.
    INSERT INTO public.raci_assignments (id, row_id, member_user_id, raci_role)
    SELECT DISTINCT ON (x.member, x.letter)
      ('c1344f05-0000-4000-8000-' || lpad((i * 10 + x.n)::text, 12, '0'))::uuid,
      ('c1344f04-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid, x.member, x.letter
    FROM (VALUES
      (1, v_auth[1 + ((i) % cardinality(v_auth))], 'R'),
      (2, v_auth[1], 'A'),
      (3, v_auth[1 + ((i + 1) % cardinality(v_auth))], 'C'),
      (4, v_auth[1 + ((i + 2) % cardinality(v_auth))], 'I')
    ) AS x(n, member, letter)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- Check
SELECT p.project_code,
       (SELECT count(*) FROM public.project_contacts c WHERE c.project_id = p.id) AS contacts,
       (SELECT count(*) FROM public.teams t WHERE t.project_id = p.id AND COALESCE(t.is_deleted, FALSE) = FALSE) AS teams,
       (SELECT count(*) FROM public.team_members m JOIN public.teams t ON t.id = m.team_id
         WHERE t.project_id = p.id AND COALESCE(m.is_deleted, FALSE) = FALSE) AS team_members,
       (SELECT count(*) FROM public.raci_rows rr JOIN public.raci_matrices rm ON rm.id = rr.matrix_id
         WHERE rm.project_id = p.id) AS raci_rows
FROM public.projects p
WHERE p.project_code IN ('SEED334-PRJ-01', 'SEED334-PRJ-03', 'SEED334-PRJ-08')
ORDER BY p.project_code;
