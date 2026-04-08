-- =============================================================================
-- v262: Add case_reference to sim.practice_business_cases
-- Purpose: Auto-generated document reference for practice business cases
-- =============================================================================

-- Add case_reference column
ALTER TABLE sim.practice_business_cases
  ADD COLUMN IF NOT EXISTS case_reference VARCHAR(30);

-- Auto-reference function for practice business cases
CREATE OR REPLACE FUNCTION sim.generate_practice_business_case_reference()
RETURNS TRIGGER AS $$
DECLARE
  v_year TEXT;
  v_seq  INTEGER;
BEGIN
  IF NEW.case_reference IS NULL THEN
    v_year := TO_CHAR(NOW(), 'YYYY');
    SELECT COUNT(*) + 1
      INTO v_seq
      FROM sim.practice_business_cases
     WHERE is_deleted = FALSE
       AND TO_CHAR(created_at, 'YYYY') = v_year;
    NEW.case_reference := 'PBC-' || v_year || '-' || LPAD(v_seq::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sim_practice_bc_reference ON sim.practice_business_cases;
CREATE TRIGGER trg_sim_practice_bc_reference
  BEFORE INSERT ON sim.practice_business_cases
  FOR EACH ROW EXECUTE FUNCTION sim.generate_practice_business_case_reference();

-- Backfill existing rows
DO $$
DECLARE
  rec RECORD;
  v_year TEXT;
  v_seq  INTEGER := 0;
BEGIN
  FOR rec IN
    SELECT id, created_at FROM sim.practice_business_cases WHERE case_reference IS NULL AND is_deleted = FALSE ORDER BY created_at
  LOOP
    v_year := TO_CHAR(rec.created_at, 'YYYY');
    v_seq := v_seq + 1;
    UPDATE sim.practice_business_cases
       SET case_reference = 'PBC-' || v_year || '-' || LPAD(v_seq::TEXT, 3, '0')
     WHERE id = rec.id;
  END LOOP;
END $$;
