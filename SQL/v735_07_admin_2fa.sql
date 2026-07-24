-- ============================================================================
-- v735_07: Admin System — 2FA (TOTP secrets + backup codes)
-- PostgreSQL 15+ / Supabase
-- Prerequisites: v735_01
-- ============================================================================

ALTER TABLE admin.admin_users
    ADD COLUMN IF NOT EXISTS totp_secret TEXT,
    ADD COLUMN IF NOT EXISTS backup_codes JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN admin.admin_users.totp_secret IS 'Base32 TOTP secret for authenticator app (admin-only access via RLS)';
COMMENT ON COLUMN admin.admin_users.backup_codes IS 'Array of {hash, used_at} one-time recovery codes';

-- totp_secret / backup_codes access is covered by admin_users_select policy in v735_01

INSERT INTO public.database_tables (table_name, table_description, schema_name, is_system_table, is_active, table_category)
VALUES ('admin_users', 'Admin user accounts with 2FA secrets', 'admin', false, true, 'security')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    updated_at = NOW();
