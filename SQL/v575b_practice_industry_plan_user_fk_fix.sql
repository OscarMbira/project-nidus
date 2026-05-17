-- ============================================================================
-- v575b: Fix sim.practice_industry_plan if v575 failed on sim.users FK
-- Use when v575 partially applied or an older draft referenced sim.users.
-- Safe to run: no-op if table does not exist yet (run full v575 instead).
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'sim' AND table_name = 'practice_industry_plan'
  ) THEN
    RAISE NOTICE 'v575b: sim.practice_industry_plan does not exist — run SQL/v575_industry_template_tables.sql first';
    RETURN;
  END IF;

  -- Drop broken FK if it pointed at sim.users
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'sim' AND t.relname = 'practice_industry_plan'
      AND c.conname LIKE '%user_id%'
      AND c.contype = 'f'
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE sim.practice_industry_plan DROP CONSTRAINT ' || quote_ident(c.conname)
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'sim' AND t.relname = 'practice_industry_plan'
        AND c.contype = 'f'
        AND pg_get_constraintdef(c.oid) LIKE '%sim.users%'
      LIMIT 1
    );
  END IF;

  ALTER TABLE sim.practice_industry_plan
    DROP CONSTRAINT IF EXISTS practice_industry_plan_user_id_fkey;

  ALTER TABLE sim.practice_industry_plan
    ADD CONSTRAINT practice_industry_plan_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

  DROP POLICY IF EXISTS "spip_select_own" ON sim.practice_industry_plan;
  DROP POLICY IF EXISTS "spip_insert_own" ON sim.practice_industry_plan;
  DROP POLICY IF EXISTS "spip_update_own" ON sim.practice_industry_plan;
  DROP POLICY IF EXISTS "spip_delete_own" ON sim.practice_industry_plan;

  CREATE POLICY "spip_select_own" ON sim.practice_industry_plan
    FOR SELECT USING (user_id = auth.uid());
  CREATE POLICY "spip_insert_own" ON sim.practice_industry_plan
    FOR INSERT WITH CHECK (user_id = auth.uid());
  CREATE POLICY "spip_update_own" ON sim.practice_industry_plan
    FOR UPDATE USING (user_id = auth.uid());
  CREATE POLICY "spip_delete_own" ON sim.practice_industry_plan
    FOR DELETE USING (user_id = auth.uid());

  RAISE NOTICE 'v575b applied — practice_industry_plan.user_id → auth.users';
END $$;
