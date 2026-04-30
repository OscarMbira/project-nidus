-- v504_missing_normalized_registers.sql

create table if not exists public.milestones_register (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null, name text not null, type text, due_date date, owner text, related_deliverable text, status text, source_form_instance_id uuid, created_at timestamptz default now()
);
create table if not exists public.quality_metrics_register (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null, name text not null, measurement_method text, target_value numeric, tolerance numeric, frequency text, owner text, created_at timestamptz default now()
);
create table if not exists public.cost_estimates_register (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null, wbs_id uuid, activity_id uuid, cost_category text, resource_name text, unit_cost numeric, total_cost numeric, created_at timestamptz default now()
);
create table if not exists public.procurements_register (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null, item text, strategy text, contract_type text, make_or_buy text, supplier text, status text, created_at timestamptz default now()
);
create table if not exists public.contracts_register (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null, contractor_name text, description text, start_date date, end_date date, final_cost numeric, status text, created_at timestamptz default now()
);
create table if not exists public.status_reports_register (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null, reporting_period text, overall_status text, scope_status text, schedule_status text, cost_status text, created_at timestamptz default now()
);
create table if not exists public.decisions_register (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null, description text, decision_maker text, decision_date date, rationale text, impact text, status text, created_at timestamptz default now()
);
create table if not exists public.lessons_learned_register (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null, category text, situation text, impact text, recommendation text, phase text, status text, created_at timestamptz default now()
);
create table if not exists public.deliverables_register (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null, name text, description text, wbs_id uuid, acceptance_criteria text, status text, created_at timestamptz default now()
);
create table if not exists public.agile_backlog_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null, epic text, user_story text, priority text, effort_estimate numeric, sprint text, status text, created_at timestamptz default now()
);

alter table public.milestones_register enable row level security;
alter table public.quality_metrics_register enable row level security;
alter table public.cost_estimates_register enable row level security;
alter table public.procurements_register enable row level security;
alter table public.contracts_register enable row level security;
alter table public.status_reports_register enable row level security;
alter table public.decisions_register enable row level security;
alter table public.lessons_learned_register enable row level security;
alter table public.deliverables_register enable row level security;
alter table public.agile_backlog_items enable row level security;
