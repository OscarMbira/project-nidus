-- v505_missing_normalized_registers_sim.sql

create schema if not exists sim;

create table if not exists sim.milestones_register (like public.milestones_register including all);
create table if not exists sim.quality_metrics_register (like public.quality_metrics_register including all);
create table if not exists sim.cost_estimates_register (like public.cost_estimates_register including all);
create table if not exists sim.procurements_register (like public.procurements_register including all);
create table if not exists sim.contracts_register (like public.contracts_register including all);
create table if not exists sim.status_reports_register (like public.status_reports_register including all);
create table if not exists sim.decisions_register (like public.decisions_register including all);
create table if not exists sim.lessons_learned_register (like public.lessons_learned_register including all);
create table if not exists sim.deliverables_register (like public.deliverables_register including all);
create table if not exists sim.agile_backlog_items (like public.agile_backlog_items including all);

alter table sim.milestones_register enable row level security;
alter table sim.quality_metrics_register enable row level security;
alter table sim.cost_estimates_register enable row level security;
alter table sim.procurements_register enable row level security;
alter table sim.contracts_register enable row level security;
alter table sim.status_reports_register enable row level security;
alter table sim.decisions_register enable row level security;
alter table sim.lessons_learned_register enable row level security;
alter table sim.deliverables_register enable row level security;
alter table sim.agile_backlog_items enable row level security;
