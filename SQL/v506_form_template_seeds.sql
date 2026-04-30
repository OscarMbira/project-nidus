-- v506_form_template_seeds.sql
-- Process Guide 68 templates seed

with templates(template_code, name, process_group) as (
  values
  ('F001','Project Charter','initiating'),('F002','Assumption Log','initiating'),('F003','Stakeholder Register','initiating'),('F004','Stakeholder Analysis','initiating'),
  ('F005','Project Management Plan','planning'),('F006','Change Management Plan','planning'),('F007','Project Roadmap','planning'),('F008','Scope Management Plan','planning'),
  ('F009','Requirements Management Plan','planning'),('F010','Requirements Documentation','planning'),('F011','Requirements Traceability Matrix','planning'),('F012','Inter-Requirements Traceability Matrix','planning'),
  ('F013','Project Scope Statement','planning'),('F014','Work Breakdown Structure','planning'),('F015','WBS Dictionary','planning'),('F016','Schedule Management Plan','planning'),
  ('F017','Activity List','planning'),('F018','Activity Attributes','planning'),('F019','Milestone List','planning'),('F020','Network Diagram','planning'),
  ('F021','Duration Estimates','planning'),('F022','Duration Estimating Worksheet','planning'),('F023','Project Schedule','planning'),('F024','Cost Management Plan','planning'),
  ('F025','Cost Estimates','planning'),('F026','Cost Estimating Worksheet','planning'),('F027','Bottom-Up Cost Estimating Worksheet','planning'),('F028','Cost Baseline','planning'),
  ('F029','Quality Management Plan','planning'),('F030','Quality Metrics','planning'),('F031','Responsibility Assignment Matrix','planning'),('F032','Resource Management Plan','planning'),
  ('F033','Team Charter','planning'),('F034','Resource Requirements','planning'),('F035','Resource Breakdown Structure','planning'),('F036','Communications Management Plan','planning'),
  ('F037','Risk Management Plan','planning'),('F038','Risk Register','planning'),('F039','Risk Report','planning'),('F040','Probability and Impact Assessment','planning'),
  ('F041','Probability and Impact Matrix','planning'),('F042','Risk Data Sheet','planning'),('F043','Procurement Management Plan','planning'),('F044','Procurement Strategy','planning'),
  ('F045','Source Selection Criteria','planning'),('F046','Stakeholder Engagement Plan','planning'),
  ('F047','Issue Log','executing'),('F048','Decision Log','executing'),('F049','Change Request','executing'),('F050','Change Log','executing'),
  ('F051','Lessons Learned Register','executing'),('F052','Quality Audit','executing'),('F053','Team Performance Assessment','executing'),
  ('F054','Team Member Status Report','monitoring_controlling'),('F055','Project Status Report','monitoring_controlling'),
  ('F056','Variance Analysis','monitoring_controlling'),('F057','Earned Value Analysis','monitoring_controlling'),('F058','Risk Audit','monitoring_controlling'),
  ('F059','Contractor Status Report','monitoring_controlling'),('F060','Procurement Audit','monitoring_controlling'),
  ('F061','Contract Closeout Report','monitoring_controlling'),('F062','Product Acceptance Form','monitoring_controlling'),
  ('F063','Lessons Learned Summary','closing'),('F064','Project or Phase Closeout','closing'),
  ('F065','Product Vision','agile'),('F066','Product Backlog','agile'),('F067','Release Plan','agile'),('F068','Retrospective','agile')
)
insert into public.form_templates (template_code, name, process_group)
select template_code, name, process_group from templates
on conflict (template_code) do update set
  name = excluded.name,
  process_group = excluded.process_group,
  updated_at = now();

insert into public.form_template_versions (template_id, version_number, schema, is_current)
select
  t.id,
  1,
  jsonb_build_object(
    'title', t.name,
    'sections', jsonb_build_array(
      jsonb_build_object(
        'key', 'general',
        'title', 'General',
        'fields', jsonb_build_array(
          jsonb_build_object('key', 'title', 'label', 'Title', 'type', 'text'),
          jsonb_build_object('key', 'description', 'label', 'Description', 'type', 'textarea'),
          jsonb_build_object('key', 'owner', 'label', 'Owner', 'type', 'text')
        )
      )
    )
  ),
  true
from public.form_templates t
where not exists (
  select 1 from public.form_template_versions v where v.template_id = t.id and v.version_number = 1
);
