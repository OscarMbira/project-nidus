-- v576 seed: too large for one Editor run — apply SQL/v576_seed/batches/batch_01_of_10.sql
-- through batch_10_of_10.sql in order (see SQL/v576_seed/README.md).
-- Regenerate: node scripts/generate-v576-industry-seed.mjs

DO $$ BEGIN
  RAISE NOTICE 'v576: run SQL/v576_seed/batches/batch_01_of_10.sql … batch_10_of_10.sql in Supabase SQL Editor';
END $$;
