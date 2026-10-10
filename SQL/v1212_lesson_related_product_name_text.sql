-- Related product on a lesson can now hold several names (one per line).
-- VARCHAR(200) is too short for that list.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT table_schema, table_name
    FROM information_schema.columns
    WHERE column_name = 'related_product_name'
      AND data_type = 'character varying'
      AND table_schema IN ('public', 'sim')
      AND table_name IN ('lessons', 'lessons_learned')
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I ALTER COLUMN related_product_name TYPE TEXT',
      r.table_schema,
      r.table_name
    );
  END LOOP;
END $$;
