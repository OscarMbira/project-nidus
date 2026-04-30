-- v503_form_engine_sim.sql
-- Dynamic Form Engine (Simulator - sim schema)

create schema if not exists sim;

create table if not exists sim.form_templates (like public.form_templates including all);
create table if not exists sim.form_template_versions (like public.form_template_versions including all);
create table if not exists sim.form_instances (like public.form_instances including all);
create table if not exists sim.form_instance_values (like public.form_instance_values including all);
create table if not exists sim.form_instance_rows (like public.form_instance_rows including all);
create table if not exists sim.form_comments (like public.form_comments including all);
create table if not exists sim.form_attachments (like public.form_attachments including all);
create table if not exists sim.form_approvals (like public.form_approvals including all);
create table if not exists sim.form_audit_log (like public.form_audit_log including all);
create table if not exists sim.form_version_history (like public.form_version_history including all);
create table if not exists sim.record_links (like public.record_links including all);

alter table sim.form_templates enable row level security;
alter table sim.form_template_versions enable row level security;
alter table sim.form_instances enable row level security;
alter table sim.form_instance_values enable row level security;
alter table sim.form_instance_rows enable row level security;
alter table sim.form_comments enable row level security;
alter table sim.form_attachments enable row level security;
alter table sim.form_approvals enable row level security;
alter table sim.form_audit_log enable row level security;
alter table sim.form_version_history enable row level security;
alter table sim.record_links enable row level security;
