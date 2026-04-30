-- v502_form_engine_tables.sql
-- Dynamic Form Engine (Platform - public schema)

create table if not exists public.form_templates (
  id uuid primary key default gen_random_uuid(),
  template_code text not null unique,
  name text not null,
  process_group text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.form_template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.form_templates(id) on delete cascade,
  version_number int not null,
  schema jsonb not null default '{}'::jsonb,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  unique(template_id, version_number)
);

create table if not exists public.form_instances (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  template_id uuid not null references public.form_templates(id),
  template_version_id uuid not null references public.form_template_versions(id),
  owner_id uuid null,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.form_instance_values (
  id uuid primary key default gen_random_uuid(),
  form_instance_id uuid not null references public.form_instances(id) on delete cascade,
  field_key text not null,
  field_value jsonb not null default 'null'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(form_instance_id, field_key)
);

create table if not exists public.form_instance_rows (
  id uuid primary key default gen_random_uuid(),
  form_instance_id uuid not null references public.form_instances(id) on delete cascade,
  section_key text not null,
  row_index int not null default 0,
  row_value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.form_comments (
  id uuid primary key default gen_random_uuid(),
  form_instance_id uuid not null references public.form_instances(id) on delete cascade,
  user_id uuid null,
  parent_comment_id uuid null references public.form_comments(id) on delete cascade,
  comment_text text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.form_attachments (
  id uuid primary key default gen_random_uuid(),
  form_instance_id uuid not null references public.form_instances(id) on delete cascade,
  storage_bucket text not null,
  storage_path text not null,
  file_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.form_approvals (
  id uuid primary key default gen_random_uuid(),
  form_instance_id uuid not null references public.form_instances(id) on delete cascade,
  approver_id uuid null,
  decision text not null,
  comments text null,
  created_at timestamptz not null default now()
);

create table if not exists public.form_audit_log (
  id uuid primary key default gen_random_uuid(),
  form_instance_id uuid not null references public.form_instances(id) on delete cascade,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.form_version_history (
  id uuid primary key default gen_random_uuid(),
  form_instance_id uuid not null references public.form_instances(id) on delete cascade,
  version_number int not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  unique(form_instance_id, version_number)
);

create table if not exists public.record_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  source_type text not null,
  source_id uuid not null,
  target_type text not null,
  target_id uuid not null,
  relationship_type text not null,
  created_at timestamptz not null default now()
);

alter table public.form_templates enable row level security;
alter table public.form_template_versions enable row level security;
alter table public.form_instances enable row level security;
alter table public.form_instance_values enable row level security;
alter table public.form_instance_rows enable row level security;
alter table public.form_comments enable row level security;
alter table public.form_attachments enable row level security;
alter table public.form_approvals enable row level security;
alter table public.form_audit_log enable row level security;
alter table public.form_version_history enable row level security;
alter table public.record_links enable row level security;

insert into database_tables (table_name, table_description, is_system_table, is_active) values
('form_templates', 'Dynamic form templates', false, true),
('form_template_versions', 'Versioned JSON schemas for form templates', false, true),
('form_instances', 'Project form instances', false, true),
('form_instance_values', 'Flat key value store for form instances', false, true),
('form_instance_rows', 'Repeating row sections for form instances', false, true),
('form_comments', 'Threaded comments for form instances', false, true),
('form_attachments', 'Attachments linked to form instances', false, true),
('form_approvals', 'Approval decisions for forms', false, true),
('form_audit_log', 'Immutable audit trail for forms', true, true),
('form_version_history', 'Version snapshots for forms', true, true),
('record_links', 'Generic link table between records', false, true)
on conflict (table_name) do update set
  table_description = excluded.table_description,
  is_system_table = excluded.is_system_table,
  updated_at = now();
