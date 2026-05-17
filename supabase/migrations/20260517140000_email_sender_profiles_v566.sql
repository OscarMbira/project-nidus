-- v566: Email sender profiles (same as SQL/v566_email_sender_profiles.sql)

CREATE TABLE IF NOT EXISTS public.email_sender_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_config_id UUID NOT NULL REFERENCES public.email_configurations(id) ON DELETE CASCADE,
    project_type_id UUID REFERENCES public.project_types(id) ON DELETE SET NULL,
    profile_name VARCHAR(255) NOT NULL,
    from_email VARCHAR(255) NOT NULL,
    from_name VARCHAR(255) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES public.users(id)
);

COMMENT ON TABLE public.email_sender_profiles IS
  'Maps project types (or system default) to From Email/Name; provider credentials stay in email_configurations.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_sender_profiles_config_project_type
    ON public.email_sender_profiles (email_config_id, project_type_id)
    WHERE is_deleted = false AND project_type_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_sender_profiles_one_default
    ON public.email_sender_profiles (email_config_id)
    WHERE is_deleted = false AND is_default = true;

CREATE INDEX IF NOT EXISTS idx_email_sender_profiles_lookup
    ON public.email_sender_profiles (email_config_id, project_type_id, is_active)
    WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_email_sender_profiles_default
    ON public.email_sender_profiles (email_config_id)
    WHERE is_deleted = false AND is_default = true AND is_active = true;

ALTER TABLE public.email_sender_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS policy_email_sender_profiles_authenticated ON public.email_sender_profiles;
DROP POLICY IF EXISTS policy_email_sender_profiles_service_role ON public.email_sender_profiles;

CREATE POLICY policy_email_sender_profiles_authenticated
    ON public.email_sender_profiles
    FOR ALL
    TO authenticated
    USING      (public.can_manage_email_configurations(auth.uid()))
    WITH CHECK (public.can_manage_email_configurations(auth.uid()));

CREATE POLICY policy_email_sender_profiles_service_role
    ON public.email_sender_profiles
    FOR ALL
    TO service_role
    USING      (true)
    WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_sender_profiles TO authenticated;
GRANT ALL ON public.email_sender_profiles TO service_role;

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES (
    'email_sender_profiles',
    'Per project-type sender identity (from email/name) for transactional email',
    false,
    true,
    'integration'
)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = now();
