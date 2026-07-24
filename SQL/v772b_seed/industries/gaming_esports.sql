-- v772b expansion: Gaming & Esports
BEGIN;

-- Industry: Gaming & Esports (gaming_esports)
DELETE FROM public.pmo_industry_template_activities WHERE template_id IN (SELECT id FROM public.pmo_industry_templates WHERE industry_code = 'gaming_esports');
DELETE FROM public.pmo_industry_template_deliverables WHERE template_id IN (SELECT id FROM public.pmo_industry_templates WHERE industry_code = 'gaming_esports');
DELETE FROM public.pmo_industry_template_risks WHERE template_id IN (SELECT id FROM public.pmo_industry_templates WHERE industry_code = 'gaming_esports');
DELETE FROM public.pmo_industry_template_milestones WHERE template_id IN (SELECT id FROM public.pmo_industry_templates WHERE industry_code = 'gaming_esports');
DELETE FROM public.pmo_industry_template_roles WHERE template_id IN (SELECT id FROM public.pmo_industry_templates WHERE industry_code = 'gaming_esports');
DELETE FROM public.pmo_industry_template_phases WHERE template_id IN (SELECT id FROM public.pmo_industry_templates WHERE industry_code = 'gaming_esports');

INSERT INTO public.pmo_industry_templates (
  industry_code, industry_name, description, typical_duration, icon, tags, version, status, is_active, is_deleted
) VALUES (
  'gaming_esports',
  'Gaming & Esports',
  'PMO blueprint for Gaming & Esports projects — phases, activities, deliverables, risks, milestones, and roles.',
  '1–4 years',
  'gamepad-2',
  ARRAY['Gaming','industry-plan','v772b'],
  '1.0',
  'published',
  TRUE,
  FALSE
)
ON CONFLICT (industry_code) DO UPDATE SET
  industry_name = EXCLUDED.industry_name,
  description = EXCLUDED.description,
  typical_duration = EXCLUDED.typical_duration,
  icon = EXCLUDED.icon,
  status = 'published',
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 1, 'Concept & Greenlight', 'Concept & Greenlight phase for Gaming & Esports.', '2–4w', 1
FROM public.pmo_industry_templates WHERE industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 2, 'Pre-Production', 'Pre-Production phase for Gaming & Esports.', '4–8w', 2
FROM public.pmo_industry_templates WHERE industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 3, 'Production', 'Production phase for Gaming & Esports.', '12–40w', 3
FROM public.pmo_industry_templates WHERE industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 4, 'Alpha', 'Alpha phase for Gaming & Esports.', '4–8w', 4
FROM public.pmo_industry_templates WHERE industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 5, 'Beta', 'Beta phase for Gaming & Esports.', '4–8w', 5
FROM public.pmo_industry_templates WHERE industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 6, 'Certification & Store Submission', 'Certification & Store Submission phase for Gaming & Esports.', '2–6w', 6
FROM public.pmo_industry_templates WHERE industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 7, 'Launch', 'Launch phase for Gaming & Esports.', '1–2w', 7
FROM public.pmo_industry_templates WHERE industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 8, 'Live Ops / Post-Launch', 'Live Ops / Post-Launch phase for Gaming & Esports.', 'ongoing', 8
FROM public.pmo_industry_templates WHERE industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Game design document (GDD) drafting', 'Game design document (GDD) drafting', 'task',
  '5–8d', '32h', 'Game Designer',
  '', '', 0
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 1
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Market & competitor analysis', 'Market & competitor analysis', 'task',
  '3–5d', '20h', 'Product Manager',
  '', '', 1
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 1
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Greenlight pitch', 'Greenlight pitch', 'approval',
  '1d', '4h', 'Studio Head',
  '', '', 2
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 1
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Vertical slice planning', 'Vertical slice planning', 'task',
  '5–10d', '40h', 'Producer',
  '', '', 3
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 2
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Tech prototype', 'Tech prototype', 'task',
  '10–15d', '60h', 'Tech Lead',
  '', '', 4
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 2
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Pre-production review', 'Pre-production review', 'review',
  '2d', '8h', 'Creative Director',
  '', '', 5
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 2
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Sprint planning & backlog grooming', 'Sprint planning & backlog grooming', 'meeting',
  '1d/sprint', '4h', 'Producer',
  '', '', 6
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 3
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Feature implementation', 'Feature implementation', 'task',
  'ongoing', 'varies', 'Dev Team',
  '', '', 7
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 3
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Art/audio production', 'Art/audio production', 'task',
  'ongoing', 'varies', 'Art/Audio Leads',
  '', '', 8
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 3
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Feature-complete alpha build', 'Feature-complete alpha build', 'deliverable',
  '5–10d', '40h', 'Build Eng',
  '', '', 9
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 4
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Internal playtest', 'Internal playtest', 'task',
  '5–10d', '40h', 'QA',
  '', '', 10
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 4
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Alpha go/no-go', 'Alpha go/no-go', 'approval',
  '1d', '4h', 'Producer',
  '', '', 11
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 4
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'External beta programme', 'External beta programme', 'task',
  '10–20d', 'ongoing', 'Community Manager',
  '', '', 12
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 5
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Bug triage & polish', 'Bug triage & polish', 'task',
  'ongoing', '8h/d', 'QA+Dev',
  '', '', 13
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 5
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Beta review', 'Beta review', 'review',
  '2d', '8h', 'Producer',
  '', '', 14
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 5
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Platform certification prep (console/PC/mobile)', 'Platform certification prep (console/PC/mobile)', 'task',
  '5–15d', '60h', 'Release Mgr',
  '', '', 15
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 6
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Store page & age rating submission', 'Store page & age rating submission', 'deliverable',
  '3–5d', '16h', 'Release Mgr',
  '', '', 16
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 6
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Certification pass', 'Certification pass', 'approval',
  'ongoing', 'varies', 'Platform Holder',
  '', '', 17
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 6
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Launch day ops & monitoring', 'Launch day ops & monitoring', 'task',
  '1–3d', '24h', 'Live Ops',
  '', '', 18
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 7
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Marketing launch coordination', 'Marketing launch coordination', 'task',
  '3–5d', '20h', 'Marketing',
  '', '', 19
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 7
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Launch retrospective', 'Launch retrospective', 'meeting',
  '1d', '4h', 'Producer',
  '', '', 20
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 7
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Patch/hotfix cadence', 'Patch/hotfix cadence', 'task',
  'ongoing', 'varies', 'Live Ops',
  '', '', 21
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 8
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Community & telemetry review', 'Community & telemetry review', 'meeting',
  '1d/week', '4h', 'Product Manager',
  '', '', 22
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 8
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Season/content roadmap', 'Season/content roadmap', 'deliverable',
  'ongoing', '8h/sprint', 'Game Designer',
  '', '', 23
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 8
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Game Design Document', 'document', true, 0
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 1
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Vertical Slice', 'document', true, 1
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 2
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Alpha Build', 'document', true, 2
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 3
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Beta Build', 'document', false, 3
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 4
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Certification Submission Pack', 'document', false, 4
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 5
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Store Page Assets', 'document', false, 5
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 6
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Launch Checklist', 'document', false, 6
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 7
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Live Ops Runbook', 'document', false, 7
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 8
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_risks (template_id, risk_title, risk_description, risk_category, likelihood, impact, sort_order)
SELECT id, 'Scope creep / feature cut late', 'Scope creep / feature cut late', 'General', 'high', 'medium', 0
FROM public.pmo_industry_templates WHERE industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_risks (template_id, risk_title, risk_description, risk_category, likelihood, impact, sort_order)
SELECT id, 'Certification failure', 'Certification failure', 'General', 'medium', 'high', 1
FROM public.pmo_industry_templates WHERE industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_risks (template_id, risk_title, risk_description, risk_category, likelihood, impact, sort_order)
SELECT id, 'Key talent attrition', 'Key talent attrition', 'General', 'medium', 'high', 2
FROM public.pmo_industry_templates WHERE industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_risks (template_id, risk_title, risk_description, risk_category, likelihood, impact, sort_order)
SELECT id, 'Platform SDK change', 'Platform SDK change', 'General', 'medium', 'medium', 3
FROM public.pmo_industry_templates WHERE industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_risks (template_id, risk_title, risk_description, risk_category, likelihood, impact, sort_order)
SELECT id, 'Soft launch performance issues', 'Soft launch performance issues', 'General', 'medium', 'high', 4
FROM public.pmo_industry_templates WHERE industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_milestones (template_id, phase_id, milestone_name, milestone_description, sort_order)
SELECT t.id, p.id, 'Greenlight', 'Greenlight', 0
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 1
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_milestones (template_id, phase_id, milestone_name, milestone_description, sort_order)
SELECT t.id, p.id, 'Vertical Slice Approved', 'Vertical Slice Approved', 1
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 2
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_milestones (template_id, phase_id, milestone_name, milestone_description, sort_order)
SELECT t.id, p.id, 'Alpha', 'Alpha', 2
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 3
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_milestones (template_id, phase_id, milestone_name, milestone_description, sort_order)
SELECT t.id, p.id, 'Beta', 'Beta', 3
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 4
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_milestones (template_id, phase_id, milestone_name, milestone_description, sort_order)
SELECT t.id, p.id, 'Certification Pass', 'Certification Pass', 4
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 5
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_milestones (template_id, phase_id, milestone_name, milestone_description, sort_order)
SELECT t.id, p.id, 'Launch', 'Launch', 5
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 6
WHERE t.industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Producer', 'Producer', true, 0
FROM public.pmo_industry_templates WHERE industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Creative Director', 'Creative Director', true, 1
FROM public.pmo_industry_templates WHERE industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Tech Lead', 'Tech Lead', true, 2
FROM public.pmo_industry_templates WHERE industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Game Designer', 'Game Designer', false, 3
FROM public.pmo_industry_templates WHERE industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Art Director', 'Art Director', false, 4
FROM public.pmo_industry_templates WHERE industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'QA Lead', 'QA Lead', false, 5
FROM public.pmo_industry_templates WHERE industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Release Manager', 'Release Manager', false, 6
FROM public.pmo_industry_templates WHERE industry_code = 'gaming_esports';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Live Ops Lead', 'Live Ops Lead', false, 7
FROM public.pmo_industry_templates WHERE industry_code = 'gaming_esports';

COMMIT;
