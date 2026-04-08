-- v326: AI Assistant Diagnostic Queries
-- Run these one by one in Supabase SQL Editor to find the exact problem

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Check if the AI tables exist
-- ─────────────────────────────────────────────────────────────────────────────
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('ai_conversations', 'ai_messages', 'ai_feedback', 'ai_settings', 'ai_insights_cache')
ORDER BY table_name;
-- Expected: 5 rows. If fewer, the tables were not created — re-run v321 and v323.

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Check GRANTs on ai_conversations for the authenticated role
-- ─────────────────────────────────────────────────────────────────────────────
SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'ai_conversations'
  AND grantee = 'authenticated'
ORDER BY privilege_type;
-- Expected: 4 rows (DELETE, INSERT, SELECT, UPDATE).
-- If 0 rows, re-run v325_ai_tables_grants.sql.

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Check RLS policies on ai_conversations
-- ─────────────────────────────────────────────────────────────────────────────
SELECT policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'ai_conversations';
-- Expected: 1 row with cmd = 'ALL'.

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Check the ai_conversations table columns
-- ─────────────────────────────────────────────────────────────────────────────
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'ai_conversations'
ORDER BY ordinal_position;
-- Expected: id, user_id, organisation_id, project_id, title, domain, is_active, created_at, updated_at

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Check the accounts table exists (FK dependency)
-- ─────────────────────────────────────────────────────────────────────────────
SELECT COUNT(*) AS accounts_count FROM accounts;
-- Expected: a number >= 0. If error "relation accounts does not exist", the FK will fail.

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Try a manual INSERT as a superuser to check if the table accepts data
-- (Replace the UUID with any valid auth user id from auth.users)
-- ─────────────────────────────────────────────────────────────────────────────
-- SELECT id FROM auth.users LIMIT 1;  -- first get a real user id
-- INSERT INTO ai_conversations (user_id, domain, is_active)
-- VALUES ('<paste-user-id-here>', 'platform', true)
-- RETURNING id;
-- Expected: returns a new UUID. If error, note the exact message.

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Check sequence grants (needed for INSERT with DEFAULT gen_random_uuid())
-- ─────────────────────────────────────────────────────────────────────────────
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
-- Run this regardless — it's safe and fixes a common silent failure.

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Re-apply all AI table grants (safe to run multiple times)
-- ─────────────────────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_conversations  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_messages       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_feedback       TO authenticated;
GRANT SELECT, INSERT, UPDATE          ON ai_settings       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_insights_cache TO authenticated;
