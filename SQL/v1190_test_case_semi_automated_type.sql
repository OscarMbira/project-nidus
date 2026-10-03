-- Allow Semi-Automated as a test case type.
-- Run in the Supabase SQL editor.

ALTER TABLE public.test_cases DROP CONSTRAINT IF EXISTS test_cases_test_type_check;
ALTER TABLE public.test_cases
  ADD CONSTRAINT test_cases_test_type_check
  CHECK (test_type IN ('manual', 'automated', 'semi-automated', 'exploratory'));

ALTER TABLE sim.practice_test_cases DROP CONSTRAINT IF EXISTS practice_test_cases_test_type_check;
ALTER TABLE sim.practice_test_cases
  ADD CONSTRAINT practice_test_cases_test_type_check
  CHECK (test_type IN ('manual', 'automated', 'semi-automated', 'exploratory'));
