-- v772b expansion: Utilities — Water & Power
BEGIN;

-- Industry: Utilities — Water & Power (utilities_water_power)
DELETE FROM public.pmo_industry_template_activities WHERE template_id IN (SELECT id FROM public.pmo_industry_templates WHERE industry_code = 'utilities_water_power');
DELETE FROM public.pmo_industry_template_deliverables WHERE template_id IN (SELECT id FROM public.pmo_industry_templates WHERE industry_code = 'utilities_water_power');
DELETE FROM public.pmo_industry_template_risks WHERE template_id IN (SELECT id FROM public.pmo_industry_templates WHERE industry_code = 'utilities_water_power');
DELETE FROM public.pmo_industry_template_milestones WHERE template_id IN (SELECT id FROM public.pmo_industry_templates WHERE industry_code = 'utilities_water_power');
DELETE FROM public.pmo_industry_template_roles WHERE template_id IN (SELECT id FROM public.pmo_industry_templates WHERE industry_code = 'utilities_water_power');
DELETE FROM public.pmo_industry_template_phases WHERE template_id IN (SELECT id FROM public.pmo_industry_templates WHERE industry_code = 'utilities_water_power');

INSERT INTO public.pmo_industry_templates (
  industry_code, industry_name, description, typical_duration, icon, tags, version, status, is_active, is_deleted
) VALUES (
  'utilities_water_power',
  'Utilities — Water & Power',
  'PMO blueprint for Utilities — Water & Power projects — phases, activities, deliverables, risks, milestones, and roles.',
  '2–7 years',
  'zap',
  ARRAY['Utilities','industry-plan','v772b'],
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
SELECT id, 1, 'Planning & Feasibility', 'Planning & Feasibility phase for Utilities — Water & Power.', '4–8w', 1
FROM public.pmo_industry_templates WHERE industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 2, 'Regulatory Approval', 'Regulatory Approval phase for Utilities — Water & Power.', '8–16w', 2
FROM public.pmo_industry_templates WHERE industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 3, 'Engineering Design', 'Engineering Design phase for Utilities — Water & Power.', '8–16w', 3
FROM public.pmo_industry_templates WHERE industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 4, 'Procurement', 'Procurement phase for Utilities — Water & Power.', '4–8w', 4
FROM public.pmo_industry_templates WHERE industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 5, 'Construction & Installation', 'Construction & Installation phase for Utilities — Water & Power.', '16–40w', 5
FROM public.pmo_industry_templates WHERE industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 6, 'Commissioning', 'Commissioning phase for Utilities — Water & Power.', '4–8w', 6
FROM public.pmo_industry_templates WHERE industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 7, 'Energisation/Go-Live', 'Energisation/Go-Live phase for Utilities — Water & Power.', '1–2w', 7
FROM public.pmo_industry_templates WHERE industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 8, 'Handover & Close-Out', 'Handover & Close-Out phase for Utilities — Water & Power.', '2–4w', 8
FROM public.pmo_industry_templates WHERE industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Load/demand forecasting study', 'Load/demand forecasting study', 'task',
  '5–10d', '40h', 'Planning Eng',
  '', '', 0
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 1
WHERE t.industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Route/site feasibility survey', 'Route/site feasibility survey', 'task',
  '5–10d', '30h', 'Field Eng',
  '', '', 1
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 1
WHERE t.industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Feasibility sign-off', 'Feasibility sign-off', 'approval',
  '1d', '4h', 'Program Mgr',
  '', '', 2
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 1
WHERE t.industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Environmental impact assessment', 'Environmental impact assessment', 'deliverable',
  '15–25d', '80h', 'Environmental Eng',
  '', '', 3
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 2
WHERE t.industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Regulator submission & hearings', 'Regulator submission & hearings', 'task',
  'ongoing', 'varies', 'Regulatory Affairs',
  '', '', 4
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 2
WHERE t.industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Permit approval tracking', 'Permit approval tracking', 'task',
  'ongoing', '2h/week', 'Regulatory Affairs',
  '', '', 5
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 2
WHERE t.industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Detailed engineering design', 'Detailed engineering design', 'task',
  '15–25d', '100h', 'Design Eng',
  '', '', 6
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 3
WHERE t.industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Design review & clash detection', 'Design review & clash detection', 'review',
  '3d', '12h', 'Design Eng',
  '', '', 7
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 3
WHERE t.industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Design freeze', 'Design freeze', 'approval',
  '1d', '4h', 'Chief Engineer',
  '', '', 8
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 3
WHERE t.industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Long-lead equipment ordering', 'Long-lead equipment ordering', 'task',
  '5–10d', '20h', 'Procurement',
  '', '', 9
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 4
WHERE t.industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Contractor tendering', 'Contractor tendering', 'task',
  '10–15d', '40h', 'Procurement',
  '', '', 10
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 4
WHERE t.industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Contract award', 'Contract award', 'approval',
  '2d', '8h', 'Program Mgr',
  '', '', 11
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 4
WHERE t.industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Civil works & excavation', 'Civil works & excavation', 'task',
  '20–40d', 'ongoing', 'Contractor',
  '', '', 12
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 5
WHERE t.industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Equipment installation', 'Equipment installation', 'task',
  '20–40d', 'ongoing', 'Installation Team',
  '', '', 13
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 5
WHERE t.industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Progress inspections', 'Progress inspections', 'review',
  '1d/week', '4h', 'Site Eng',
  '', '', 14
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 5
WHERE t.industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'System testing (dry/wet)', 'System testing (dry/wet)', 'task',
  '5–10d', '40h', 'Commissioning Eng',
  '', '', 15
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 6
WHERE t.industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Protection & control testing', 'Protection & control testing', 'task',
  '5–8d', '32h', 'Protection Eng',
  '', '', 16
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 6
WHERE t.industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Commissioning sign-off', 'Commissioning sign-off', 'approval',
  '1d', '4h', 'Chief Engineer',
  '', '', 17
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 6
WHERE t.industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Switching & energisation', 'Switching & energisation', 'task',
  '1–2d', '8h', 'Ops Team',
  '', '', 18
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 7
WHERE t.industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Live monitoring', 'Live monitoring', 'task',
  'ongoing', '24h', 'Control Room',
  '', '', 19
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 7
WHERE t.industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Go-live confirmation', 'Go-live confirmation', 'approval',
  '1d', '2h', 'Ops Manager',
  '', '', 20
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 7
WHERE t.industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'As-built documentation', 'As-built documentation', 'deliverable',
  '5–8d', '24h', 'Design Eng',
  '', '', 21
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 8
WHERE t.industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'O&M manual handover', 'O&M manual handover', 'deliverable',
  '3–5d', '16h', 'Design Eng',
  '', '', 22
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 8
WHERE t.industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Close-out meeting', 'Close-out meeting', 'meeting',
  '1d', '4h', 'Program Mgr',
  '', '', 23
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 8
WHERE t.industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Feasibility Study', 'document', true, 0
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 1
WHERE t.industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Environmental Impact Assessment', 'document', true, 1
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 2
WHERE t.industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Detailed Design Package', 'document', true, 2
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 3
WHERE t.industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Permit/License Approvals', 'document', false, 3
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 4
WHERE t.industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Commissioning Test Reports', 'document', false, 4
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 5
WHERE t.industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'As-Built Drawings', 'document', false, 5
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 6
WHERE t.industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'O&M Manual', 'document', false, 6
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 7
WHERE t.industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Handover Certificate', 'document', false, 7
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 8
WHERE t.industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_risks (template_id, risk_title, risk_description, risk_category, likelihood, impact, sort_order)
SELECT id, 'Regulatory/permit delay', 'Regulatory/permit delay', 'General', 'high', 'high', 0
FROM public.pmo_industry_templates WHERE industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_risks (template_id, risk_title, risk_description, risk_category, likelihood, impact, sort_order)
SELECT id, 'Weather/access delays', 'Weather/access delays', 'General', 'medium', 'medium', 1
FROM public.pmo_industry_templates WHERE industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_risks (template_id, risk_title, risk_description, risk_category, likelihood, impact, sort_order)
SELECT id, 'Equipment supply delay', 'Equipment supply delay', 'General', 'medium', 'high', 2
FROM public.pmo_industry_templates WHERE industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_risks (template_id, risk_title, risk_description, risk_category, likelihood, impact, sort_order)
SELECT id, 'Public/community objection', 'Public/community objection', 'General', 'low', 'medium', 3
FROM public.pmo_industry_templates WHERE industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_risks (template_id, risk_title, risk_description, risk_category, likelihood, impact, sort_order)
SELECT id, 'Safety incident during construction', 'Safety incident during construction', 'General', 'low', 'high', 4
FROM public.pmo_industry_templates WHERE industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_milestones (template_id, phase_id, milestone_name, milestone_description, sort_order)
SELECT t.id, p.id, 'Feasibility Approved', 'Feasibility Approved', 0
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 1
WHERE t.industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_milestones (template_id, phase_id, milestone_name, milestone_description, sort_order)
SELECT t.id, p.id, 'Permits Granted', 'Permits Granted', 1
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 2
WHERE t.industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_milestones (template_id, phase_id, milestone_name, milestone_description, sort_order)
SELECT t.id, p.id, 'Design Freeze', 'Design Freeze', 2
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 3
WHERE t.industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_milestones (template_id, phase_id, milestone_name, milestone_description, sort_order)
SELECT t.id, p.id, 'Construction Complete', 'Construction Complete', 3
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 4
WHERE t.industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_milestones (template_id, phase_id, milestone_name, milestone_description, sort_order)
SELECT t.id, p.id, 'Energisation/Go-Live', 'Energisation/Go-Live', 4
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 5
WHERE t.industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Program Manager', 'Program Manager', true, 0
FROM public.pmo_industry_templates WHERE industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Chief Engineer', 'Chief Engineer', true, 1
FROM public.pmo_industry_templates WHERE industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Design Engineer', 'Design Engineer', false, 2
FROM public.pmo_industry_templates WHERE industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Regulatory Affairs Lead', 'Regulatory Affairs Lead', true, 3
FROM public.pmo_industry_templates WHERE industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Commissioning Engineer', 'Commissioning Engineer', false, 4
FROM public.pmo_industry_templates WHERE industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Site Engineer', 'Site Engineer', false, 5
FROM public.pmo_industry_templates WHERE industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Environmental Engineer', 'Environmental Engineer', false, 6
FROM public.pmo_industry_templates WHERE industry_code = 'utilities_water_power';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Procurement Lead', 'Procurement Lead', false, 7
FROM public.pmo_industry_templates WHERE industry_code = 'utilities_water_power';

COMMIT;
