-- v507_form_permissions.sql
-- Add form engine permission keys using canonical permissions schema

insert into public.permissions (
  permission_code,
  permission_name,
  permission_description,
  permission_category,
  permission_module,
  permission_type,
  is_system_permission,
  is_active
)
values
  ('form.view', 'View Forms', 'View form instances and templates', 'governance', 'forms', 'read', true, true),
  ('form.create', 'Create Forms', 'Create form instances', 'governance', 'forms', 'create', true, true),
  ('form.edit', 'Edit Forms', 'Edit owned form instances', 'governance', 'forms', 'update', true, true),
  ('form.approve', 'Approve Forms', 'Approve or reject form instances', 'governance', 'forms', 'execute', true, true),
  ('form.view_all', 'View All Forms', 'View all forms across projects', 'governance', 'forms', 'read', true, true),
  ('form_template.manage', 'Manage Form Templates', 'Manage form templates', 'governance', 'forms', 'update', true, true),
  ('form_template.create', 'Create Form Templates', 'Create form templates', 'governance', 'forms', 'create', true, true),
  ('form_template.approve', 'Approve Form Templates', 'Approve form templates', 'governance', 'forms', 'execute', true, true),
  ('form.quality', 'Quality Forms Access', 'Access quality-related forms', 'quality', 'forms', 'read', true, true),
  ('form.procurement', 'Procurement Forms Access', 'Access procurement-related forms', 'procurement', 'forms', 'read', true, true),
  ('form.cost', 'Cost Forms Access', 'Access cost and EVM forms', 'finance', 'forms', 'read', true, true)
on conflict (permission_code) do update set
  permission_name = excluded.permission_name,
  permission_description = excluded.permission_description,
  permission_category = excluded.permission_category,
  permission_module = excluded.permission_module,
  permission_type = excluded.permission_type,
  is_system_permission = excluded.is_system_permission,
  is_active = excluded.is_active,
  updated_at = now();

-- Placeholder policy statements (adapt to existing auth model)
-- Keep explicit to avoid bypassing current RLS model.
alter table public.form_instances enable row level security;
alter table public.form_approvals enable row level security;
