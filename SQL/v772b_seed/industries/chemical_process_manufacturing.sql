-- v772b expansion: Chemical & Process Manufacturing
BEGIN;

-- Industry: Chemical & Process Manufacturing (chemical_process_manufacturing)
DELETE FROM public.pmo_industry_template_activities WHERE template_id IN (SELECT id FROM public.pmo_industry_templates WHERE industry_code = 'chemical_process_manufacturing');
DELETE FROM public.pmo_industry_template_deliverables WHERE template_id IN (SELECT id FROM public.pmo_industry_templates WHERE industry_code = 'chemical_process_manufacturing');
DELETE FROM public.pmo_industry_template_risks WHERE template_id IN (SELECT id FROM public.pmo_industry_templates WHERE industry_code = 'chemical_process_manufacturing');
DELETE FROM public.pmo_industry_template_milestones WHERE template_id IN (SELECT id FROM public.pmo_industry_templates WHERE industry_code = 'chemical_process_manufacturing');
DELETE FROM public.pmo_industry_template_roles WHERE template_id IN (SELECT id FROM public.pmo_industry_templates WHERE industry_code = 'chemical_process_manufacturing');
DELETE FROM public.pmo_industry_template_phases WHERE template_id IN (SELECT id FROM public.pmo_industry_templates WHERE industry_code = 'chemical_process_manufacturing');

INSERT INTO public.pmo_industry_templates (
  industry_code, industry_name, description, typical_duration, icon, tags, version, status, is_active, is_deleted
) VALUES (
  'chemical_process_manufacturing',
  'Chemical & Process Manufacturing',
  'PMO blueprint for Chemical & Process Manufacturing projects — phases, activities, deliverables, risks, milestones, and roles.',
  '2–5 years',
  'flask-conical',
  ARRAY['Chemical','industry-plan','v772b'],
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
SELECT id, 1, 'Process Concept', 'Process Concept phase for Chemical & Process Manufacturing.', '3–6w', 1
FROM public.pmo_industry_templates WHERE industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 2, 'Lab/Pilot Development', 'Lab/Pilot Development phase for Chemical & Process Manufacturing.', '6–12w', 2
FROM public.pmo_industry_templates WHERE industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 3, 'Process Design Package', 'Process Design Package phase for Chemical & Process Manufacturing.', '6–12w', 3
FROM public.pmo_industry_templates WHERE industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 4, 'HAZOP & Safety', 'HAZOP & Safety phase for Chemical & Process Manufacturing.', '4–8w', 4
FROM public.pmo_industry_templates WHERE industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 5, 'Detailed Engineering', 'Detailed Engineering phase for Chemical & Process Manufacturing.', '8–16w', 5
FROM public.pmo_industry_templates WHERE industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 6, 'Construction & Install', 'Construction & Install phase for Chemical & Process Manufacturing.', '16–40w', 6
FROM public.pmo_industry_templates WHERE industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 7, 'Commissioning', 'Commissioning phase for Chemical & Process Manufacturing.', '4–8w', 7
FROM public.pmo_industry_templates WHERE industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_phases (template_id, phase_number, phase_name, phase_description, estimated_duration, sort_order)
SELECT id, 8, 'Performance Test & Handover', 'Performance Test & Handover phase for Chemical & Process Manufacturing.', '2–4w', 8
FROM public.pmo_industry_templates WHERE industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Process options study', 'Process options study', 'task',
  '5–10d', '40h', 'Process Eng',
  '', '', 0
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 1
WHERE t.industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Mass/energy balance draft', 'Mass/energy balance draft', 'task',
  '5–8d', '32h', 'Process Eng',
  '', '', 1
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 1
WHERE t.industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Concept gate', 'Concept gate', 'approval',
  '1d', '4h', 'Program Mgr',
  '', '', 2
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 1
WHERE t.industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Lab trials', 'Lab trials', 'task',
  '10–20d', 'ongoing', 'Chemist',
  '', '', 3
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 2
WHERE t.industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Pilot plant runs', 'Pilot plant runs', 'task',
  '10–20d', 'ongoing', 'Pilot Eng',
  '', '', 4
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 2
WHERE t.industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Pilot data review', 'Pilot data review', 'review',
  '2d', '8h', 'Process Eng',
  '', '', 5
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 2
WHERE t.industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'PFD/P&ID development', 'PFD/P&ID development', 'task',
  '15–25d', '100h', 'Process Eng',
  '', '', 6
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 3
WHERE t.industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Equipment datasheets', 'Equipment datasheets', 'task',
  '10–15d', '60h', 'Mech Eng',
  '', '', 7
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 3
WHERE t.industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'PDP review', 'PDP review', 'review',
  '3d', '12h', 'Chief Engineer',
  '', '', 8
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 3
WHERE t.industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'HAZOP workshops', 'HAZOP workshops', 'meeting',
  '5–10d', '40h', 'Process Safety',
  '', '', 9
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 4
WHERE t.industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'SIL/LOPA studies', 'SIL/LOPA studies', 'task',
  '5–10d', '40h', 'Process Safety',
  '', '', 10
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 4
WHERE t.industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Safety case sign-off', 'Safety case sign-off', 'approval',
  '2d', '8h', 'HSE Manager',
  '', '', 11
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 4
WHERE t.industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Detailed design packages', 'Detailed design packages', 'task',
  '20–30d', 'ongoing', 'Design Team',
  '', '', 12
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 5
WHERE t.industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, '3D model reviews', '3D model reviews', 'review',
  '2d/month', '8h', 'Design Lead',
  '', '', 13
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 5
WHERE t.industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Design freeze', 'Design freeze', 'approval',
  '1d', '4h', 'Chief Engineer',
  '', '', 14
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 5
WHERE t.industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Site construction', 'Site construction', 'task',
  '30–60d', 'ongoing', 'Contractor',
  '', '', 15
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 6
WHERE t.industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Equipment installation', 'Equipment installation', 'task',
  '20–40d', 'ongoing', 'Installation',
  '', '', 16
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 6
WHERE t.industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Progress inspections', 'Progress inspections', 'review',
  '1d/week', '4h', 'Site Eng',
  '', '', 17
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 6
WHERE t.industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Pre-commissioning & loop checks', 'Pre-commissioning & loop checks', 'task',
  '10–15d', '60h', 'Commissioning Eng',
  '', '', 18
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 7
WHERE t.industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Start-up sequence', 'Start-up sequence', 'task',
  '5–10d', '40h', 'Ops',
  '', '', 19
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 7
WHERE t.industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Commissioning sign-off', 'Commissioning sign-off', 'approval',
  '1d', '4h', 'Plant Manager',
  '', '', 20
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 7
WHERE t.industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Performance guarantee test', 'Performance guarantee test', 'task',
  '5–10d', '40h', 'Process Eng',
  '', '', 21
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 8
WHERE t.industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Punch-list close-out', 'Punch-list close-out', 'task',
  '5–8d', '24h', 'Site Eng',
  '', '', 22
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 8
WHERE t.industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, 'Handover certificate', 'Handover certificate', 'approval',
  '1d', '2h', 'Plant Manager',
  '', '', 23
FROM public.pmo_industry_templates t
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 8
WHERE t.industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Process Concept Report', 'document', true, 0
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 1
WHERE t.industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Pilot Report', 'document', true, 1
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 2
WHERE t.industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Process Design Package', 'document', true, 2
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 3
WHERE t.industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'HAZOP Report', 'document', false, 3
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 4
WHERE t.industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Detailed Design', 'document', false, 4
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 5
WHERE t.industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Commissioning Dossiers', 'document', false, 5
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 6
WHERE t.industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Performance Test Report', 'document', false, 6
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 7
WHERE t.industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_deliverables (template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order)
SELECT t.id, p.id, 'Handover Certificate', 'document', false, 7
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 8
WHERE t.industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_risks (template_id, risk_title, risk_description, risk_category, likelihood, impact, sort_order)
SELECT id, 'HAZOP major findings late', 'HAZOP major findings late', 'General', 'medium', 'high', 0
FROM public.pmo_industry_templates WHERE industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_risks (template_id, risk_title, risk_description, risk_category, likelihood, impact, sort_order)
SELECT id, 'Pilot scale-up failure', 'Pilot scale-up failure', 'General', 'medium', 'high', 1
FROM public.pmo_industry_templates WHERE industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_risks (template_id, risk_title, risk_description, risk_category, likelihood, impact, sort_order)
SELECT id, 'Long-lead equipment delay', 'Long-lead equipment delay', 'General', 'medium', 'high', 2
FROM public.pmo_industry_templates WHERE industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_risks (template_id, risk_title, risk_description, risk_category, likelihood, impact, sort_order)
SELECT id, 'Construction HSE incident', 'Construction HSE incident', 'General', 'low', 'high', 3
FROM public.pmo_industry_templates WHERE industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_risks (template_id, risk_title, risk_description, risk_category, likelihood, impact, sort_order)
SELECT id, 'Performance test fail', 'Performance test fail', 'General', 'medium', 'high', 4
FROM public.pmo_industry_templates WHERE industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_milestones (template_id, phase_id, milestone_name, milestone_description, sort_order)
SELECT t.id, p.id, 'Concept Approved', 'Concept Approved', 0
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 1
WHERE t.industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_milestones (template_id, phase_id, milestone_name, milestone_description, sort_order)
SELECT t.id, p.id, 'PDP Approved', 'PDP Approved', 1
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 2
WHERE t.industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_milestones (template_id, phase_id, milestone_name, milestone_description, sort_order)
SELECT t.id, p.id, 'HAZOP Complete', 'HAZOP Complete', 2
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 3
WHERE t.industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_milestones (template_id, phase_id, milestone_name, milestone_description, sort_order)
SELECT t.id, p.id, 'Design Freeze', 'Design Freeze', 3
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 4
WHERE t.industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_milestones (template_id, phase_id, milestone_name, milestone_description, sort_order)
SELECT t.id, p.id, 'Performance Test Pass', 'Performance Test Pass', 4
FROM public.pmo_industry_templates t
LEFT JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = 5
WHERE t.industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Program Manager', 'Program Manager', true, 0
FROM public.pmo_industry_templates WHERE industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Process Engineer', 'Process Engineer', true, 1
FROM public.pmo_industry_templates WHERE industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Process Safety Lead', 'Process Safety Lead', true, 2
FROM public.pmo_industry_templates WHERE industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Chief Engineer', 'Chief Engineer', false, 3
FROM public.pmo_industry_templates WHERE industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Commissioning Engineer', 'Commissioning Engineer', false, 4
FROM public.pmo_industry_templates WHERE industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'HSE Manager', 'HSE Manager', false, 5
FROM public.pmo_industry_templates WHERE industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Site Engineer', 'Site Engineer', false, 6
FROM public.pmo_industry_templates WHERE industry_code = 'chemical_process_manufacturing';
INSERT INTO public.pmo_industry_template_roles (template_id, role_title, role_description, is_key_role, sort_order)
SELECT id, 'Plant Manager', 'Plant Manager', false, 7
FROM public.pmo_industry_templates WHERE industry_code = 'chemical_process_manufacturing';

COMMIT;
