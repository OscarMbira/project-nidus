-- ============================================================================
-- v1489: Restore sim.practice_business_cases.case_reference (fixes every Simulator business case save)
-- ============================================================================
-- Found while running v1488 (v1344 slice 9). v756c attached the Admin display-ID trigger
-- trg_sim_practice_business_cases_admin_display_id to the column case_reference, but that column
-- (meant to come from v262) does not exist in this database. The trigger then fails with
-- "column case_reference not found in data type practice_business_cases", so every save of a
-- Simulator practice business case fails: the app's create page as well as seeds.
--
-- 1. Add the column (same definition as v262). v262's own legacy reference trigger is NOT
--    recreated: v756c retired it in favour of Admin ID Generation (rule 16.2).
-- 2. Fill references on existing rows when the Admin rule for sim.practice_business_cases exists.
-- 3. Check query: every Admin display-ID trigger in public and sim whose target column is
--    missing. Expected result: no rows. Any row listed is the same fault on another table.
-- Idempotent. Safe to re-run. Then re-run v1488.
-- ============================================================================

-- ── 1. Column ───────────────────────────────────────────────────────────────
ALTER TABLE sim.practice_business_cases
  ADD COLUMN IF NOT EXISTS case_reference VARCHAR(30);

-- ── 2. References on existing rows ──────────────────────────────────────────
UPDATE sim.practice_business_cases c
   SET case_reference = admin.generate_display_id('sim.practice_business_cases', c.id)
 WHERE COALESCE(btrim(c.case_reference), '') = ''
   AND EXISTS (SELECT 1 FROM admin.id_generation_rules r WHERE r.target_table = 'sim.practice_business_cases');

-- ── 3. Check: display-ID triggers pointing at a column that does not exist ──
-- tgargs holds the trigger's arguments (target table, column) separated by a zero byte.
SELECT n.nspname AS schema_name,
       c.relname AS table_name,
       t.tgname  AS trigger_name,
       split_part(encode(t.tgargs, 'escape'), '\000', 2) AS missing_column
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_proc f ON f.oid = t.tgfoid
WHERE f.proname = 'trg_apply_admin_display_id'
  AND n.nspname IN ('public', 'sim')
  AND NOT t.tgisinternal
  AND NOT EXISTS (
    SELECT 1 FROM pg_attribute a
    WHERE a.attrelid = t.tgrelid
      AND a.attname = split_part(encode(t.tgargs, 'escape'), '\000', 2)
      AND NOT a.attisdropped)
ORDER BY 1, 2;
