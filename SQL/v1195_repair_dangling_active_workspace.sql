-- ============================================================================
-- v1195: Repair dangling users.last_active_account_id (industry sections missing)
-- ============================================================================
-- The sidebar resolves the account from users.last_active_account_id first. When that id
-- points at an account that no longer exists, the industry sections (Banking & Financial
-- Services, Information Technology, ...) resolve against an account with no industries and
-- disappear. Found live for SEED334-PRJ-08's PM user: the stored id matched no account, while
-- the project belongs to Hifo Solutions (d3a32e49-1be8-45ed-9e09-db1aa73e8c8e), which has
-- Banking & Financial Services and Information Technology enabled.
--
-- 1) Repoint the PM user to the Hifo workspace that owns the project.
-- 2) Clear any other dangling active-workspace id so resolution falls back to the normal
--    owner / invitation / project waterfall. Safe to re-run.
-- ============================================================================

UPDATE public.users
SET last_active_account_id = 'd3a32e49-1be8-45ed-9e09-db1aa73e8c8e',
    updated_at = NOW()
WHERE email = 'oscarmbirablogging@gmail.com'
  AND EXISTS (SELECT 1 FROM public.accounts a
              WHERE a.id = 'd3a32e49-1be8-45ed-9e09-db1aa73e8c8e' AND COALESCE(a.is_deleted, FALSE) = FALSE);

UPDATE public.users u
SET last_active_account_id = NULL,
    updated_at = NOW()
WHERE u.last_active_account_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.accounts a
                  WHERE a.id = u.last_active_account_id AND COALESCE(a.is_deleted, FALSE) = FALSE);

-- Verify: the PM user should now point at Hifo Solutions.
-- SELECT email, last_active_account_id FROM public.users WHERE email = 'oscarmbirablogging@gmail.com';
