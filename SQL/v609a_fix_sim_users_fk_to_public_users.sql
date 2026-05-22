-- =============================================================================
-- v609a_fix_sim_users_fk_to_public_users.sql
-- Simulator tables must reference public.users (sim.users does not exist).
-- sim.get_current_user_id() returns public.users.id (v242).
-- Run if v594 / v609 / v613 failed or were created with invalid sim.users FKs.
-- =============================================================================

-- v594: entity_invitations (only if table exists without valid FK — recreate if needed)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'sim' AND table_name = 'entity_invitations'
  ) THEN
    ALTER TABLE sim.entity_invitations
      DROP CONSTRAINT IF EXISTS entity_invitations_invited_by_user_id_fkey;
    ALTER TABLE sim.entity_invitations
      ADD CONSTRAINT entity_invitations_invited_by_user_id_fkey
      FOREIGN KEY (invited_by_user_id) REFERENCES public.users(id);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'v609a: entity_invitations FK skip — %', SQLERRM;
END $$;

-- v609: sim_manager_appointment_records
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'sim' AND table_name = 'sim_manager_appointment_records'
  ) THEN
    ALTER TABLE sim.sim_manager_appointment_records
      DROP CONSTRAINT IF EXISTS sim_manager_appointment_records_appointee_user_id_fkey,
      DROP CONSTRAINT IF EXISTS sim_manager_appointment_records_appointed_by_user_id_fkey,
      DROP CONSTRAINT IF EXISTS sim_manager_appointment_records_reporting_to_user_id_fkey;

    ALTER TABLE sim.sim_manager_appointment_records
      ADD CONSTRAINT sim_manager_appointment_records_appointee_user_id_fkey
        FOREIGN KEY (appointee_user_id) REFERENCES public.users(id),
      ADD CONSTRAINT sim_manager_appointment_records_appointed_by_user_id_fkey
        FOREIGN KEY (appointed_by_user_id) REFERENCES public.users(id),
      ADD CONSTRAINT sim_manager_appointment_records_reporting_to_user_id_fkey
        FOREIGN KEY (reporting_to_user_id) REFERENCES public.users(id);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'v609a: sim_manager_appointment_records FK skip — %', SQLERRM;
END $$;

-- v613: sim_team_member_appointment_records
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'sim' AND table_name = 'sim_team_member_appointment_records'
  ) THEN
    ALTER TABLE sim.sim_team_member_appointment_records
      DROP CONSTRAINT IF EXISTS sim_team_member_appointment_records_appointee_user_id_fkey,
      DROP CONSTRAINT IF EXISTS sim_team_member_appointment_records_appointed_by_user_id_fkey,
      DROP CONSTRAINT IF EXISTS sim_team_member_appointment_records_reporting_to_user_id_fkey;

    ALTER TABLE sim.sim_team_member_appointment_records
      ADD CONSTRAINT sim_team_member_appointment_records_appointee_user_id_fkey
        FOREIGN KEY (appointee_user_id) REFERENCES public.users(id),
      ADD CONSTRAINT sim_team_member_appointment_records_appointed_by_user_id_fkey
        FOREIGN KEY (appointed_by_user_id) REFERENCES public.users(id),
      ADD CONSTRAINT sim_team_member_appointment_records_reporting_to_user_id_fkey
        FOREIGN KEY (reporting_to_user_id) REFERENCES public.users(id);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'v609a: sim_team_member_appointment_records FK skip — %', SQLERRM;
END $$;

DO $$ BEGIN RAISE NOTICE 'v609a_fix_sim_users_fk_to_public_users.sql applied'; END $$;
