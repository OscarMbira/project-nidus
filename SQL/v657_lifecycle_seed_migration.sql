-- v657: Migrate existing records to record_status = 'live' (no seed authoriser templates)
-- @see projectplan/v639_Record_Lifecycle_Management_Plan.md

DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'risks', 'issues', 'change_requests', 'tasks', 'defects',
    'projects', 'project_mandates', 'business_cases', 'work_packages', 'stage_plans',
    'project_decisions', 'configuration_items', 'benefits_review_plans',
    'highlight_reports', 'exception_reports', 'end_stage_reports', 'lessons_reports',
    'project_initiation_documents', 'product_descriptions'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF to_regclass('public.' || tbl) IS NOT NULL THEN
      EXECUTE format('UPDATE public.%I SET record_status = ''live'' WHERE record_status IS NULL', tbl);
      EXECUTE format('UPDATE public.%I SET root_record_id = id WHERE root_record_id IS NULL', tbl);
      RAISE NOTICE 'Migrated public.%', tbl;
    END IF;
  END LOOP;
END $$;

DO $$ BEGIN RAISE NOTICE 'v657_lifecycle_seed_migration.sql completed'; END $$;
